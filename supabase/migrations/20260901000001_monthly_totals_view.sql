-- Pre-aggregated month totals.
--
-- The order of transactions inside a month cannot change that month's closing
-- balance, so months that precede the one being viewed can be folded into a
-- single opening figure instead of being fetched row by row. This view is what
-- makes that cheap: viewing December does not download January's rows.
--
-- This is an aggregate over `transactions`, not a cache. It cannot go stale and
-- it is not an independent source of truth.

create view public.monthly_transaction_totals
with (security_invoker = true) as
select
  date_trunc('month', t.transaction_date)::date as month_start,
  coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric(12, 2) as income,
  coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric(12, 2) as expenses,
  coalesce(
    sum(t.amount) filter (where t.type = 'adjustment' and t.adjustment_direction = 'credit'),
    0
  )::numeric(12, 2) as credit_adjustments,
  coalesce(
    sum(t.amount) filter (where t.type = 'adjustment' and t.adjustment_direction = 'debit'),
    0
  )::numeric(12, 2) as debit_adjustments,
  count(*)::integer as transaction_count
from public.transactions as t
group by date_trunc('month', t.transaction_date)::date;

comment on view public.monthly_transaction_totals is
  'Per-month sums of transactions, used to compute an opening balance without fetching historical rows. security_invoker means the caller''s RLS applies.';
