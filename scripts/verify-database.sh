#!/usr/bin/env bash
#
# Verify a migrated database: constraints reject bad data, and the checked-in
# TypeScript types still match the real schema.
#
# Usage:
#   scripts/verify-database.sh [DATABASE_URL]

set -euo pipefail

DB_URL="${1:-${SUPABASE_DB_URL:-postgresql:///spending_tracker}}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Constraint and trigger checks =="
psql "$DB_URL" --no-psqlrc --quiet -f "$ROOT/scripts/verify-schema.sql"

echo
echo "== TypeScript type check =="
node "$ROOT/scripts/verify-database-types.mjs" "$DB_URL"
