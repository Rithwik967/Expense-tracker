-- Seed data.
--
-- Configuration only. No expenses, no income, no adjustments — the app must
-- open on a genuine empty state rather than on invented spending.
--
-- Safe to run more than once.

insert into public.app_settings (currency, default_monthly_budget, default_daily_allowance, month_start_day)
select 'INR', 9000, null, 1
where not exists (select 1 from public.app_settings);

insert into public.categories (name, icon, description, sort_order)
values
  ('Chicken',         'drumstick',     'Butcher and poultry runs',            10),
  ('Groceries',       'shopping-cart', 'Kitchen and household supplies',      20),
  ('Lunch',           'sandwich',      'Midday meals away from home',         30),
  ('Food & Drinks',   'utensils',      'Eating out, cafes and deliveries',    40),
  ('Entertainment',   'clapperboard',  'Films, games and going out',          50),
  ('Shopping',        'shopping-bag',  'Clothes, gadgets and general retail', 60),
  ('Travel',          'bus-front',     'Fares, fuel and trips',               70),
  ('Gym',             'dumbbell',      'Fitness and sport',                   80),
  ('Personal',        'user-round',    'Grooming, health and personal care',  90),
  ('Other',           'circle-ellipsis', 'Anything that fits nowhere else',  100)
on conflict do nothing;

-- September 2026 with a null daily allowance, so the app derives
-- ₹9,000 / 30 days = ₹300 a day rather than relying on a hardcoded figure.
insert into public.monthly_budgets (month_start, monthly_budget, daily_allowance)
values ('2026-09-01', 9000, null)
on conflict (month_start) do nothing;
