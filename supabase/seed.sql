-- Seed data.
--
-- On Supabase, a new account is seeded by private.handle_new_user() — this file
-- must not insert owner-less rows. On a plain local Postgres (no `auth` schema)
-- it creates one dummy profile so `npm run db:verify` still has a row to check.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth') then
    return;
  end if;

  insert into public.profiles (id, display_name)
  values ('00000000-0000-0000-0000-000000000001', 'Local')
  on conflict (id) do nothing;

  insert into public.app_settings (owner_id, currency, default_monthly_budget, default_daily_allowance, month_start_day)
  select '00000000-0000-0000-0000-000000000001', 'INR', 9000, null, 1
  where not exists (select 1 from public.app_settings);

  insert into public.categories (owner_id, name, icon, description, sort_order)
  values
    ('00000000-0000-0000-0000-000000000001', 'Chicken',         'drumstick',     'Butcher and poultry runs',            10),
    ('00000000-0000-0000-0000-000000000001', 'Groceries',       'shopping-cart', 'Kitchen and household supplies',      20),
    ('00000000-0000-0000-0000-000000000001', 'Lunch',           'sandwich',      'Midday meals away from home',         30),
    ('00000000-0000-0000-0000-000000000001', 'Food & Drinks',   'utensils',      'Eating out, cafes and deliveries',    40),
    ('00000000-0000-0000-0000-000000000001', 'Entertainment',   'clapperboard',  'Films, games and going out',          50),
    ('00000000-0000-0000-0000-000000000001', 'Shopping',        'shopping-bag',  'Clothes, gadgets and general retail', 60),
    ('00000000-0000-0000-0000-000000000001', 'Travel',          'bus-front',     'Fares, fuel and trips',               70),
    ('00000000-0000-0000-0000-000000000001', 'Gym',             'dumbbell',      'Fitness and sport',                   80),
    ('00000000-0000-0000-0000-000000000001', 'Personal',        'user-round',    'Grooming, health and personal care',  90),
    ('00000000-0000-0000-0000-000000000001', 'Other',           'circle-ellipsis', 'Anything that fits nowhere else',  100)
  on conflict do nothing;

  insert into public.monthly_budgets (owner_id, month_start, monthly_budget, daily_allowance)
  values ('00000000-0000-0000-0000-000000000001', '2026-09-01', 9000, null)
  on conflict do nothing;
end;
$$;
