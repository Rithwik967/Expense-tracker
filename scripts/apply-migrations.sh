#!/usr/bin/env bash
#
# Apply every migration, in order, to a Postgres database, then load the seed.
#
# Used to prove the repository is reproducible from migrations alone. The same
# files are what `supabase db push` sends to a hosted project.
#
# Usage:
#   scripts/apply-migrations.sh [DATABASE_URL]
#
# DATABASE_URL defaults to $SUPABASE_DB_URL, then to a local database named
# `spending_tracker`.
#
# The default deliberately names no user or host: psql then connects over the
# Unix socket as the invoking account, which is how a stock local Postgres
# install is actually reachable. Hard-coding `postgres@localhost` would send it
# over TCP and demand a password nobody has set.

set -euo pipefail

DB_URL="${1:-${SUPABASE_DB_URL:-spending_tracker}}"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations"
SEED_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/seed.sql"

echo "Applying migrations to ${DB_URL%%\?*}"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  echo "  -> $(basename "$migration")"
  psql "$DB_URL" --quiet --set ON_ERROR_STOP=1 --file "$migration" >/dev/null
done

if [[ -f "$SEED_FILE" ]]; then
  echo "  -> seed.sql"
  psql "$DB_URL" --quiet --set ON_ERROR_STOP=1 --file "$SEED_FILE" >/dev/null
fi

echo "Done."
