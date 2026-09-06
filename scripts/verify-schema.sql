-- Negative tests for the schema.
--
-- Every statement below MUST be rejected. Run against a database that has had
-- the migrations and seed applied:
--
--   psql "$DATABASE_URL" -f scripts/verify-schema.sql
--
-- Each block catches its own error and reports PASS/FAIL, so the script always
-- runs to completion and never leaves data behind.

\set ON_ERROR_STOP on
\pset pager off

create temporary table verification_results (
  ordinal serial,
  scenario text,
  outcome text
);

do $$
declare
  category uuid;
  txn uuid;

  -- (scenario, statement) pairs that must all raise.
  cases text[][] := array[
    ['app_settings: rejects a second row',
     'insert into public.app_settings (currency) values (''USD'')'],
    ['app_settings: rejects an empty currency',
     'update public.app_settings set currency = ''   '''],
    ['app_settings: rejects a negative budget',
     'update public.app_settings set default_monthly_budget = -1'],
    ['app_settings: rejects a negative daily allowance',
     'update public.app_settings set default_daily_allowance = -0.01'],
    ['app_settings: rejects month_start_day = 0',
     'update public.app_settings set month_start_day = 0'],
    ['app_settings: rejects month_start_day = 29',
     'update public.app_settings set month_start_day = 29'],

    ['categories: rejects a duplicate name',
     'insert into public.categories (name) values (''Groceries'')'],
    ['categories: rejects a case-insensitive duplicate',
     'insert into public.categories (name) values (''groceries'')'],
    ['categories: rejects a whitespace-padded duplicate',
     'insert into public.categories (name) values (''  Groceries  '')'],
    ['categories: rejects a blank name',
     'insert into public.categories (name) values ('' '')'],

    ['monthly_budgets: rejects a mid-month month_start',
     'insert into public.monthly_budgets (month_start, monthly_budget) values (''2026-10-15'', 9000)'],
    ['monthly_budgets: rejects a duplicate month',
     'insert into public.monthly_budgets (month_start, monthly_budget) values (''2026-09-01'', 5000)'],
    ['monthly_budgets: rejects a negative budget',
     'insert into public.monthly_budgets (month_start, monthly_budget) values (''2026-11-01'', -1)'],
    ['monthly_budgets: rejects a negative daily allowance',
     'insert into public.monthly_budgets (month_start, monthly_budget, daily_allowance) values (''2026-11-01'', 9000, -5)'],

    ['transactions: rejects a zero amount',
     'insert into public.transactions (transaction_date, type, amount, category_id) select ''2026-09-01'', ''expense'', 0, id from public.categories limit 1'],
    ['transactions: rejects a negative amount',
     'insert into public.transactions (transaction_date, type, amount, category_id) select ''2026-09-01'', ''expense'', -50, id from public.categories limit 1'],
    ['transactions: rejects an unknown type',
     'insert into public.transactions (transaction_date, type, amount) values (''2026-09-01'', ''refund'', 50)'],
    ['transactions: rejects an expense without a category',
     'insert into public.transactions (transaction_date, type, amount) values (''2026-09-01'', ''expense'', 50)'],
    ['transactions: rejects an adjustment without a direction',
     'insert into public.transactions (transaction_date, type, amount) values (''2026-09-01'', ''adjustment'', 50)'],
    ['transactions: rejects an invalid adjustment direction',
     'insert into public.transactions (transaction_date, type, amount, adjustment_direction) values (''2026-09-01'', ''adjustment'', 50, ''refund'')'],
    ['transactions: rejects a direction on an income row',
     'insert into public.transactions (transaction_date, type, amount, adjustment_direction) values (''2026-09-01'', ''income'', 50, ''credit'')'],
    ['transactions: rejects an unknown category',
     'insert into public.transactions (transaction_date, type, amount, category_id) values (''2026-09-01'', ''expense'', 50, ''00000000-0000-0000-0000-000000000000'')'],

    ['planned_expenses: rejects a zero amount',
     'insert into public.planned_expenses (planned_date, amount) values (''2026-09-15'', 0)'],
    ['planned_expenses: rejects an unknown status',
     'insert into public.planned_expenses (planned_date, amount, status) values (''2026-09-15'', 100, ''maybe'')'],

    ['monthly_carry_forwards: rejects a mid-month source',
     'insert into public.monthly_carry_forwards (source_month, destination_month, amount) values (''2026-09-15'', ''2026-10-01'', 800)'],
    ['monthly_carry_forwards: rejects a destination before its source',
     'insert into public.monthly_carry_forwards (source_month, destination_month, amount) values (''2026-10-01'', ''2026-09-01'', 800)']
  ];
  entry text[];

  -- Positive-check outcomes are collected here rather than inserted directly.
  -- Those checks write real rows and are undone with a deliberate `raise`, and
  -- that rollback would take any result rows with it. PL/pgSQL variables are not
  -- transactional, so the array survives.
  positive text[] := array[]::text[];
  note text;
begin
  foreach entry slice 1 in array cases loop
    begin
      execute entry[2];
      insert into verification_results (scenario, outcome)
      values (entry[1], 'FAIL - statement was accepted');
    exception
      when others then
        insert into verification_results (scenario, outcome) values (entry[1], 'PASS');
    end;
  end loop;

  select id into category from public.categories where name = 'Groceries';

  begin
    insert into public.transactions (transaction_date, type, amount, category_id)
    values ('2026-09-01', 'expense', 150, category)
    returning id into txn;

    positive := array_append(positive, 'transactions: accepts a valid expense=PASS');

    -- A category with history must not be removable.
    begin
      delete from public.categories where id = category;
      note := 'FAIL - delete was accepted';
    exception
      when others then
        note := 'PASS';
    end;
    positive := array_append(positive, 'categories: referenced category cannot be deleted=' || note);

    -- Soft delete must still be available.
    update public.categories set is_active = false where id = category;
    positive := array_append(positive, 'categories: referenced category can be deactivated=PASS');

    -- updated_at must move on its own.
    if (select updated_at > created_at from public.categories where id = category) then
      note := 'PASS';
    else
      note := 'FAIL - updated_at did not move';
    end if;
    positive := array_append(positive, 'categories: updated_at trigger fires=' || note);

    -- One plan cannot be converted into two expenses.
    insert into public.planned_expenses (planned_date, amount, status, converted_transaction_id)
    values ('2026-09-15', 500, 'completed', txn);
    begin
      insert into public.planned_expenses (planned_date, amount, status, converted_transaction_id)
      values ('2026-09-16', 500, 'completed', txn);
      note := 'FAIL - duplicate link was accepted';
    exception
      when others then
        note := 'PASS';
    end;
    positive := array_append(positive, 'planned_expenses: a transaction cannot back two plans=' || note);

    -- The aggregate view must reflect the row we just inserted.
    if (select expenses = 150 from public.monthly_transaction_totals
        where month_start = '2026-09-01') then
      note := 'PASS';
    else
      note := 'FAIL - view did not reflect the insert';
    end if;
    positive := array_append(positive, 'monthly_transaction_totals: aggregates the new expense=' || note);

    raise exception 'rollback probe data';
  exception
    when others then
      if sqlerrm <> 'rollback probe data' then
        positive := array_append(positive, 'positive checks=FAIL - ' || sqlerrm);
      end if;
  end;

  foreach note in array positive loop
    insert into verification_results (scenario, outcome)
    values (split_part(note, '=', 1), split_part(note, '=', 2));
  end loop;
end;
$$;

select
  lpad(ordinal::text, 2) as "#",
  scenario,
  outcome
from verification_results
order by ordinal;

select
  count(*) filter (where outcome = 'PASS') as passed,
  count(*) filter (where outcome <> 'PASS') as failed
from verification_results;
