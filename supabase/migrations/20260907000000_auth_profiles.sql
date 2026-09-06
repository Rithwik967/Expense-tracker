-- Multi-user accounts: each signed-in person owns their own rows.
--
-- The previous RLS policies granted the anon key full access because this was a
-- private single-user tracker. Login changes that: the anon key is now only a
-- client identifier, and every row is scoped to auth.uid() via owner_id.
--
-- Design rules that still hold:
--   * transactions remain the source of truth; no stored balances
--   * never authorize from user_metadata (it is user-editable)
--   * wrap auth.uid() in (select ...) so RLS evaluates it once per query

-- ---------------------------------------------------------------------------
-- Clear the single-user seed. Those rows have no owner and would be invisible
-- (or collide) once owner_id is required.
-- ---------------------------------------------------------------------------

delete from public.planned_expenses;
delete from public.transactions;
delete from public.monthly_budgets;
delete from public.categories;
delete from public.app_settings;
delete from public.monthly_carry_forwards;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key,
  display_name text not null,
  avatar_url text,
  phone text,
  mindset_note text,
  start_of_day time not null default '06:00',
  notify_morning boolean not null default true,
  notify_evening boolean not null default true,
  notify_overspend boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_not_empty check (btrim(display_name) <> ''),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) <= 80),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 20),
  constraint profiles_mindset_length check (mindset_note is null or char_length(mindset_note) <= 280),
  constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048)
);

comment on table public.profiles is
  'One row per signed-in user. Identity lives here; money lives in the existing tables keyed by owner_id.';
comment on column public.profiles.avatar_url is
  'Public Storage URL for the display picture. Null means the UI shows initials.';
comment on column public.profiles.start_of_day is
  'Display preference only. Ledger days are calendar dates; this does not shift balances.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    if not exists (
      select 1 from pg_constraint
      where conname = 'profiles_id_fkey'
        and conrelid = 'public.profiles'::regclass
    ) then
      alter table public.profiles
        add constraint profiles_id_fkey
        foreign key (id) references auth.users (id) on delete cascade;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-user uniqueness (was global when there was one owner)
-- ---------------------------------------------------------------------------

drop index if exists public.app_settings_singleton_idx;
drop index if exists public.categories_name_unique_idx;

alter table public.monthly_budgets
  drop constraint if exists monthly_budgets_month_start_unique;

alter table public.monthly_carry_forwards
  drop constraint if exists monthly_carry_forwards_unique_pair;

alter table public.app_settings
  alter column owner_id set not null;
alter table public.categories
  alter column owner_id set not null;
alter table public.monthly_budgets
  alter column owner_id set not null;
alter table public.transactions
  alter column owner_id set not null;
alter table public.planned_expenses
  alter column owner_id set not null;
alter table public.monthly_carry_forwards
  alter column owner_id set not null;

create unique index app_settings_owner_unique_idx
  on public.app_settings (owner_id);

create unique index categories_owner_name_unique_idx
  on public.categories (owner_id, lower(btrim(name)));

alter table public.monthly_budgets
  add constraint monthly_budgets_owner_month_unique unique (owner_id, month_start);

alter table public.monthly_carry_forwards
  add constraint monthly_carry_forwards_owner_pair_unique unique (owner_id, source_month, destination_month);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'app_settings_owner_id_fkey'
      and conrelid = 'public.app_settings'::regclass
  ) then
    alter table public.app_settings
      add constraint app_settings_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_owner_id_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'monthly_budgets_owner_id_fkey'
      and conrelid = 'public.monthly_budgets'::regclass
  ) then
    alter table public.monthly_budgets
      add constraint monthly_budgets_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_owner_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'planned_expenses_owner_id_fkey'
      and conrelid = 'public.planned_expenses'::regclass
  ) then
    alter table public.planned_expenses
      add constraint planned_expenses_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'monthly_carry_forwards_owner_id_fkey'
      and conrelid = 'public.monthly_carry_forwards'::regclass
  ) then
    alter table public.monthly_carry_forwards
      add constraint monthly_carry_forwards_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete cascade;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: authenticated owners only. Anon keeps no table grants.
-- ---------------------------------------------------------------------------

drop policy if exists app_settings_single_user_access on public.app_settings;
drop policy if exists categories_single_user_access on public.categories;
drop policy if exists monthly_budgets_single_user_access on public.monthly_budgets;
drop policy if exists transactions_single_user_access on public.transactions;
drop policy if exists planned_expenses_single_user_access on public.planned_expenses;
drop policy if exists monthly_carry_forwards_single_user_access on public.monthly_carry_forwards;

alter table public.profiles enable row level security;

create policy profiles_owner_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_owner_insert on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_owner_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy app_settings_owner_all on public.app_settings
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy categories_owner_all on public.categories
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy monthly_budgets_owner_all on public.monthly_budgets
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy transactions_owner_all on public.transactions
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy planned_expenses_owner_all on public.planned_expenses
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy monthly_carry_forwards_owner_all on public.monthly_carry_forwards
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.monthly_budgets to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.planned_expenses to authenticated;
grant select, insert, update, delete on public.monthly_carry_forwards to authenticated;
grant select on public.monthly_transaction_totals to authenticated;

revoke all on public.profiles from anon;
revoke all on public.app_settings from anon;
revoke all on public.categories from anon;
revoke all on public.monthly_budgets from anon;
revoke all on public.transactions from anon;
revoke all on public.planned_expenses from anon;
revoke all on public.monthly_carry_forwards from anon;
revoke all on public.monthly_transaction_totals from anon;

-- ---------------------------------------------------------------------------
-- Signup: create the profile and the default budget/categories in one shot.
-- SECURITY DEFINER is required because the new user has no JWT yet.
-- Kept in `private` and EXECUTE revoked from API roles so it is not an RPC.
-- ---------------------------------------------------------------------------

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
  month_start date;
begin
  chosen_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  if chosen_name is null then
    chosen_name := split_part(coalesce(new.email, 'there'), '@', 1);
  end if;
  if char_length(chosen_name) > 80 then
    chosen_name := left(chosen_name, 80);
  end if;

  month_start := date_trunc('month', timezone('Asia/Kolkata', now()))::date;

  insert into public.profiles (id, display_name)
  values (new.id, chosen_name);

  insert into public.app_settings (owner_id, currency, default_monthly_budget, default_daily_allowance, month_start_day)
  values (new.id, 'INR', 9000, null, 1);

  insert into public.categories (owner_id, name, icon, description, sort_order)
  values
    (new.id, 'Chicken',       'drumstick',       'Butcher and poultry runs',            10),
    (new.id, 'Groceries',     'shopping-cart',   'Kitchen and household supplies',      20),
    (new.id, 'Lunch',         'sandwich',        'Midday meals away from home',         30),
    (new.id, 'Food & Drinks', 'utensils',        'Eating out, cafes and deliveries',    40),
    (new.id, 'Entertainment', 'clapperboard',    'Films, games and going out',          50),
    (new.id, 'Shopping',      'shopping-bag',    'Clothes, gadgets and general retail', 60),
    (new.id, 'Travel',        'bus-front',       'Fares, fuel and trips',               70),
    (new.id, 'Gym',           'dumbbell',        'Fitness and sport',                   80),
    (new.id, 'Personal',      'user-round',      'Grooming, health and personal care',  90),
    (new.id, 'Other',         'circle-ellipsis', 'Anything that fits nowhere else',    100);

  insert into public.monthly_budgets (owner_id, month_start, monthly_budget, daily_allowance)
  values (new.id, month_start, 9000, null);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function private.handle_new_user() to supabase_auth_admin;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'on_auth_user_created'
      and n.nspname = 'auth'
      and c.relname = 'users'
  ) then
    execute 'drop trigger on_auth_user_created on auth.users';
  end if;

  if exists (select 1 from pg_namespace where nspname = 'auth') then
    execute $trig$
      create trigger on_auth_user_created
        after insert on auth.users
        for each row execute function private.handle_new_user()
    $trig$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: display pictures. Path convention: {user_id}/avatar.{ext}
-- Upsert needs INSERT + SELECT + UPDATE.
-- Skipped on a plain local Postgres that has no `storage` schema.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists avatars_select_own on storage.objects';
  execute 'drop policy if exists avatars_insert_own on storage.objects';
  execute 'drop policy if exists avatars_update_own on storage.objects';
  execute 'drop policy if exists avatars_delete_own on storage.objects';

  execute $p$
    create policy avatars_select_own on storage.objects
      for select to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      )
  $p$;

  execute $p$
    create policy avatars_insert_own on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      )
  $p$;

  execute $p$
    create policy avatars_update_own on storage.objects
      for update to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      )
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      )
  $p$;

  execute $p$
    create policy avatars_delete_own on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
      )
  $p$;
end;
$$;

-- ---------------------------------------------------------------------------
-- Realtime: profile edits (name, photo, prefs) arrive on every open session.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end;
$$;
