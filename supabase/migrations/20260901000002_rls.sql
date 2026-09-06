-- Row Level Security.
--
-- READ THIS BEFORE DEPLOYING.
--
-- This application currently has no authentication: it is a private, single-user
-- tracker. RLS is enabled on every table (so nothing is reachable by default),
-- and a single explicitly-named policy per table grants access to the `anon` and
-- `authenticated` roles.
--
-- What that means in practice, stated plainly: **the anon key is the only thing
-- protecting this data.** Anyone holding it has full read/write access. This is
-- not user-level security and must not be mistaken for it. It is acceptable only
-- because the deployment is private and single-user.
--
-- Mitigations that are in place:
--   * RLS is enabled, so adding a table without a policy fails closed.
--   * The service-role key is never referenced by this project. The client and
--     the server both use the anon key only.
--   * Every table carries a nullable `owner_id` so authentication can be added
--     later by backfilling one column and swapping the policies below, without
--     touching the financial model.
--
-- To harden this once auth exists:
--   1. Set `owner_id` default to `auth.uid()` (the DO block below already does
--      this when the Supabase `auth` schema is present).
--   2. Backfill `owner_id` on existing rows.
--   3. Make `owner_id` NOT NULL.
--   4. Replace each `*_single_user_access` policy with
--      `using (owner_id = auth.uid()) with check (owner_id = auth.uid())`
--      and drop `anon` from the role list.

-- Supabase provides these roles; a plain Postgres instance (used for local
-- migration verification) does not. Create them only when missing so the same
-- migration runs in both places.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated;

alter table public.app_settings enable row level security;
alter table public.categories enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.planned_expenses enable row level security;
alter table public.monthly_carry_forwards enable row level security;

-- Named `single_user_access` rather than something like `allow_all` so that the
-- reason for its breadth is visible at every call site and in every audit.
create policy app_settings_single_user_access on public.app_settings
  for all to anon, authenticated using (true) with check (true);

create policy categories_single_user_access on public.categories
  for all to anon, authenticated using (true) with check (true);

create policy monthly_budgets_single_user_access on public.monthly_budgets
  for all to anon, authenticated using (true) with check (true);

create policy transactions_single_user_access on public.transactions
  for all to anon, authenticated using (true) with check (true);

create policy planned_expenses_single_user_access on public.planned_expenses
  for all to anon, authenticated using (true) with check (true);

create policy monthly_carry_forwards_single_user_access on public.monthly_carry_forwards
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.app_settings to anon, authenticated;
grant select, insert, update, delete on public.categories to anon, authenticated;
grant select, insert, update, delete on public.monthly_budgets to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;
grant select, insert, update, delete on public.planned_expenses to anon, authenticated;
grant select, insert, update, delete on public.monthly_carry_forwards to anon, authenticated;

grant select on public.monthly_transaction_totals to anon, authenticated;

-- Forward compatibility with authentication: default `owner_id` to the signed-in
-- user where Supabase's `auth` schema exists. Today `auth.uid()` returns null for
-- anon requests, so rows are simply unowned and the policies above still apply.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'alter table public.app_settings alter column owner_id set default auth.uid()';
    execute 'alter table public.categories alter column owner_id set default auth.uid()';
    execute 'alter table public.monthly_budgets alter column owner_id set default auth.uid()';
    execute 'alter table public.transactions alter column owner_id set default auth.uid()';
    execute 'alter table public.planned_expenses alter column owner_id set default auth.uid()';
    execute 'alter table public.monthly_carry_forwards alter column owner_id set default auth.uid()';
  end if;
end;
$$;

create index app_settings_owner_id_idx on public.app_settings (owner_id);
create index categories_owner_id_idx on public.categories (owner_id);
create index monthly_budgets_owner_id_idx on public.monthly_budgets (owner_id);
create index transactions_owner_id_idx on public.transactions (owner_id);
create index planned_expenses_owner_id_idx on public.planned_expenses (owner_id);
create index monthly_carry_forwards_owner_id_idx on public.monthly_carry_forwards (owner_id);
