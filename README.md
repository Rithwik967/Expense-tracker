# Daily Budget

A private, single-user spending tracker for a monthly discretionary budget. Built as a
mobile-first, installable web app.

The idea is one sentence long: a monthly budget is spread evenly across the days of the
month, whatever you do not spend today is still yours tomorrow, and whatever you overspend
is recovered out of the days that follow.

```
Day 1   allowance ₹300   spent ₹150     balance   ₹150
Day 2   ₹150 + ₹300      spent ₹100     balance   ₹350
Day 3   ₹350 + ₹300      spent ₹1,000   balance  −₹350
Day 4   −₹350 + ₹300     spent ₹0       balance   −₹50
Day 5   −₹50 + ₹300      spent ₹0       balance   ₹250
```

There is no "close the month" button and nothing to reconcile. A month rolls into the next
one because the arithmetic says so.

## The one rule that shapes everything

**Transactions are the source of truth. No balance is ever stored.**

There is no `daily_balance` column, and there is no cache of one. Every balance you see —
today's available amount, a day in the calendar, a chart point, the carry-forward into next
month — is recomputed from your transactions and your budget configuration when it is read.

That is what makes a correction safe. Change a three-week-old expense from ₹1,000 to ₹700
and every day after it moves by ₹300, on every screen, with nothing to invalidate and no
chance of a stale figure surviving somewhere.

The same rule explains two things that might otherwise look like omissions:

- **Extra Money and the Fun Fund are presentations, not balances.** Last month's unused
  allowance is already inside this month's opening balance. It is shown separately because
  it is worth knowing, not because it is added a second time.
- **A planned expense never moves a balance.** It is a reservation. It reduces
  *safe-to-spend* and nothing else, until you mark it as spent, at which point it becomes an
  ordinary expense transaction like any other.

## Running it

Requires Node 20 or newer.

```bash
npm install
npm run dev
```

The app comes up on <http://localhost:3000>.

### Without Supabase

It runs with no configuration at all. With no Supabase credentials present, the data layer
falls back to a JSON file at `.data/store.json`, seeded with the same categories and the
same September 2026 budget as the real migrations. A banner across the top of the app says
so, so you always know where your money is being recorded.

This is a development convenience, not a deployment target — the file is git-ignored and
there is nothing backing it up.

### With Supabase

```bash
cp .env.local.example .env.local     # then fill in the two values
```

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, from Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon / publishable key |

Never add a service-role key. `NEXT_PUBLIC_*` variables are inlined into the browser bundle,
and nothing here needs elevated privileges.

Apply the schema with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase db execute --file supabase/seed.sql
```

Restart the dev server. The banner disappears once Supabase is answering.

## Security, honestly stated

Sign-in is required. RLS on money tables is `(select auth.uid()) = owner_id`; a profile
row is keyed by the user's id. The anon / publishable key identifies the project — it does
not let one person read another person's ledger.

Never add a service-role key. `NEXT_PUBLIC_*` variables are inlined into the browser bundle.

On Vercel, set the same two variables as `.env.local`:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / publishable key |

In the Supabase dashboard, add the deployed origin to Auth → URL configuration:

- Site URL: `https://<your-app>.vercel.app`
- Redirect URLs: `https://<your-app>.vercel.app/auth/callback` (keep `http://localhost:3000/auth/callback` for local)

Two structural decisions support that:

- Ledger reads and writes happen on the server, in route handlers under `app/api`, so the
  finance engine runs in exactly one place and every screen reads the same computed numbers.
  Auth cookies and profile realtime are the exceptions that talk to Supabase from the browser.
- Imported backup files are treated as untrusted input: validated structurally, then checked
  for referential problems a single row cannot reveal (an expense pointing at a category
  that is not in the file, two plans linked to the same transaction), and written only if
  the whole file passes.

## Layout

```
app/
  (auth)/           login and signup
  (app)/            home, calendar, insights, transactions, planned, settings, profile
  api/              ledger reads and writes; auth and profile routes
  auth/callback     email confirmation / OAuth return

components/
  ui/               primitives — button, card, field, sheet, toast, money, states
  dashboard/ …      one folder per feature area
lib/
  finance/          the calculation engine. No React, no I/O, fully unit tested
  data/             repository interface with Supabase and local-file implementations
  services/         finance-service builds the view models; backup handles export and import
  validations/      Zod schemas mirroring the database constraints
supabase/
  migrations/       the schema, reproducible from scratch
  seed.sql          categories and the September 2026 budget
```

The data flow is one direction only:

```
screen → hook → /api route → repository → Supabase
                     ↓
              lib/finance  →  view model  →  screen
```

Components render figures. They never compute them. That is the reason Home, Calendar,
Insights and the history can never disagree about a total: there is one evaluation of the
ledger per request, and all four read its result.

### Money

Money is stored and calculated as an integer number of paise, behind a branded `Money` type,
so no financial value is ever a JavaScript float. Rupees exist in two places only: the input
a person types, and the string they read. `NUMERIC(12,2)` in Postgres, integer minor units
in TypeScript, formatted at the very last step.

Rounding of a derived daily allowance is handled by distributing the remainder rather than
rounding each day independently — ₹9,000 over 31 days allocates to exactly ₹9,000, not
₹9,000.01 or ₹8,999.92.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest — the finance engine's unit tests |
| `npm run db:migrate:local` | Apply migrations and seed to a local Postgres |
| `npm run db:verify` | Assert the live schema's constraints and the generated types |

`db:migrate:local` and `db:verify` need a Postgres to talk to; set `SUPABASE_DB_URL` or let
them default to `postgresql://postgres:postgres@127.0.0.1:5432/spending_tracker`.

## Your data

Settings → Data has a JSON export that restores everything and a CSV export of transactions
for a spreadsheet. Import shows you what a file contains and what it will replace before it
touches anything. Reset asks you to type `DELETE`.

## Known limitations

- **`month_start_day` is stored but not used.** Months run from the 1st to the last calendar
  day. The column exists so a salary-aligned month can be added later; the control in
  Settings is deliberately disabled rather than offering a choice the engine would ignore.
- **The planning horizon for safe-to-spend is fixed** at "the rest of the current month".
- **No offline support.** There is a manifest and the app installs to a home screen, but
  there is no service worker, so it needs a connection.
