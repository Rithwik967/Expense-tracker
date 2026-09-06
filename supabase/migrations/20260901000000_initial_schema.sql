-- Personal spending tracker: core schema.
--
-- Design rule that governs this whole file: transactions and budget
-- configuration are the only sources of truth. There is deliberately no
-- `daily_balance`, `monthly_balance` or `available_balance` column anywhere,
-- because a persisted balance would go stale the moment a historical
-- transaction is edited. Every balance is derived at read time by
-- lib/finance.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps `updated_at` honest without the application having to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger function: stamps updated_at on every UPDATE. Attached to all mutable tables.';

-- True when `d` is the first day of its month.
create or replace function public.is_month_start(d date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select d = date_trunc('month', d)::date;
$$;

comment on function public.is_month_start(date) is
  'Constraint helper: month boundaries are stored as the first day of the month.';

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  currency text not null default 'INR',
  default_monthly_budget numeric(12, 2) not null default 9000,
  default_daily_allowance numeric(12, 2),
  month_start_day integer not null default 1,
  -- Reserved for a future authenticated deployment; see 20260901000002_rls.sql.
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint app_settings_currency_not_empty check (btrim(currency) <> ''),
  constraint app_settings_budget_non_negative check (default_monthly_budget >= 0),
  constraint app_settings_allowance_non_negative
    check (default_daily_allowance is null or default_daily_allowance >= 0),
  constraint app_settings_month_start_day_range check (month_start_day between 1 and 28)
);

comment on table public.app_settings is
  'Application-wide configuration. Exactly one row exists for this single-user app.';
comment on column public.app_settings.default_daily_allowance is
  'Optional global override. When null, each month derives monthly_budget / days_in_month.';
comment on column public.app_settings.month_start_day is
  'Capped at 28 so every month has the day; 1 means budget months align with calendar months.';

-- Single-user app: a second settings row would make "the" configuration ambiguous.
create unique index app_settings_singleton_idx on public.app_settings ((true));

comment on index public.app_settings_singleton_idx is
  'Enforces exactly one settings row.';

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_name_not_empty check (btrim(name) <> '')
);

comment on table public.categories is
  'Expense categories. Retired via is_active = false rather than deleted, so historical transactions keep their category.';
comment on column public.categories.is_active is
  'Soft delete. Inactive categories are hidden from pickers but still resolve on past transactions.';

-- Case- and whitespace-insensitive, so "Groceries" and "groceries " collide.
create unique index categories_name_unique_idx on public.categories (lower(btrim(name)));
create index categories_sort_order_idx on public.categories (sort_order, name);
create index categories_is_active_idx on public.categories (is_active);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- monthly_budgets
-- ---------------------------------------------------------------------------

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  month_start date not null,
  monthly_budget numeric(12, 2) not null,
  daily_allowance numeric(12, 2),
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint monthly_budgets_month_start_is_first_of_month
    check (public.is_month_start(month_start)),
  constraint monthly_budgets_budget_non_negative check (monthly_budget >= 0),
  constraint monthly_budgets_allowance_non_negative
    check (daily_allowance is null or daily_allowance >= 0),
  constraint monthly_budgets_month_start_unique unique (month_start)
);

comment on table public.monthly_budgets is
  'Budget configuration per calendar month. Months without a row fall back to app_settings.default_monthly_budget.';
comment on column public.monthly_budgets.daily_allowance is
  'Explicit override. When null the allowance is monthly_budget / days_in_month, with the remainder spread across days so the month accrues the budget exactly.';

create index monthly_budgets_month_start_idx on public.monthly_budgets (month_start);

create trigger monthly_budgets_set_updated_at
  before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null,
  type text not null,
  amount numeric(12, 2) not null,
  -- Only meaningful for adjustments, which may move money either way.
  adjustment_direction text,
  category_id uuid references public.categories (id) on delete restrict,
  description text,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Amount is always a magnitude; direction comes from `type` plus
  -- `adjustment_direction`. This keeps "₹500" unambiguous in every context.
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_type_valid check (type in ('expense', 'income', 'adjustment')),
  -- Written as CASE rather than as two OR-ed branches on purpose. The obvious
  -- form, `(type = 'adjustment' and adjustment_direction in (...)) or (...)`,
  -- evaluates to NULL when the direction is NULL, and a CHECK that returns NULL
  -- is treated as satisfied — so an adjustment with no direction would slip
  -- through. CASE forces a true/false answer.
  constraint transactions_adjustment_direction_valid check (
    case
      when type = 'adjustment'
        then adjustment_direction is not null
             and adjustment_direction in ('credit', 'debit')
      else adjustment_direction is null
    end
  ),
  -- Expenses always report against a category so the breakdown can never have
  -- an unexplained bucket. Income and adjustments are category-free.
  constraint transactions_expense_requires_category
    check (type <> 'expense' or category_id is not null)
);

comment on table public.transactions is
  'The source of truth for all money movement. Balances are derived from these rows and are never stored.';
comment on column public.transactions.amount is
  'Always positive. Direction is expressed by type and adjustment_direction.';
comment on column public.transactions.transaction_date is
  'Plain calendar date. Future dates are allowed and are applied on the day they fall.';
comment on column public.transactions.category_id is
  'ON DELETE RESTRICT: a category with history cannot be removed, only deactivated.';

create index transactions_transaction_date_idx on public.transactions (transaction_date);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_type_idx on public.transactions (type);
-- Serves the "transactions for month X, newest first" query the app runs most.
create index transactions_date_created_idx
  on public.transactions (transaction_date desc, created_at desc);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- planned_expenses
-- ---------------------------------------------------------------------------

create table public.planned_expenses (
  id uuid primary key default gen_random_uuid(),
  planned_date date not null,
  amount numeric(12, 2) not null,
  category_id uuid references public.categories (id) on delete restrict,
  description text,
  status text not null default 'planned',
  -- Set when a plan is converted into real spending. Guards against the same
  -- plan being marked as spent twice.
  converted_transaction_id uuid references public.transactions (id) on delete set null,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint planned_expenses_amount_positive check (amount > 0),
  constraint planned_expenses_status_valid
    check (status in ('planned', 'completed', 'cancelled')),
  constraint planned_expenses_completed_requires_link
    check (status = 'completed' or converted_transaction_id is null)
);

comment on table public.planned_expenses is
  'Intentions, not spending. These never affect a balance; they only reduce safe-to-spend until converted into a transaction.';
comment on column public.planned_expenses.converted_transaction_id is
  'The expense created when this plan was marked as spent. Unique, so a plan cannot be converted twice.';

create index planned_expenses_planned_date_idx on public.planned_expenses (planned_date);
create index planned_expenses_category_id_idx on public.planned_expenses (category_id);
create index planned_expenses_status_idx on public.planned_expenses (status);

create unique index planned_expenses_converted_transaction_unique_idx
  on public.planned_expenses (converted_transaction_id)
  where converted_transaction_id is not null;

create trigger planned_expenses_set_updated_at
  before update on public.planned_expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- monthly_carry_forwards
-- ---------------------------------------------------------------------------

create table public.monthly_carry_forwards (
  id uuid primary key default gen_random_uuid(),
  source_month date not null,
  destination_month date not null,
  amount numeric(12, 2) not null,
  note text,
  owner_id uuid,
  created_at timestamptz not null default now(),

  constraint monthly_carry_forwards_source_is_first_of_month
    check (public.is_month_start(source_month)),
  constraint monthly_carry_forwards_destination_is_first_of_month
    check (public.is_month_start(destination_month)),
  constraint monthly_carry_forwards_destination_after_source
    check (destination_month > source_month),
  constraint monthly_carry_forwards_unique_pair unique (source_month, destination_month)
);

-- Read this comment before using this table for anything.
comment on table public.monthly_carry_forwards is
  'AUDIT LOG ONLY — never read by the calculation engine. Carry-forward is always derived as the previous month''s closing balance. Treating this table as an input would double count the same rupees, which is why lib/finance ignores it entirely. Use it to record a snapshot for history, not to drive state.';

create index monthly_carry_forwards_destination_month_idx
  on public.monthly_carry_forwards (destination_month);
