/**
 * Supabase connection settings.
 *
 * The credentials are read here and nowhere else, so there is exactly one place
 * to audit. Only the URL and the anon (publishable) key are ever read — this
 * project has no code path that uses a service-role key, and it must stay that
 * way, because `NEXT_PUBLIC_*` values are inlined into whichever bundle
 * references them.
 */

export interface SupabaseCredentials {
  readonly url: string;
  readonly anonKey: string;
}

/**
 * Credentials, or `null` when the project has not been configured yet.
 *
 * Returning `null` rather than throwing is deliberate: the app falls back to an
 * on-disk development store so it can be run and explored before a Supabase
 * project exists. See `lib/data/local-repository.ts`.
 */
export function readSupabaseCredentials(): SupabaseCredentials | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseCredentials() !== null;
}

/** Credentials or a diagnosable error. Use where a fallback makes no sense. */
export function requireSupabaseCredentials(): SupabaseCredentials {
  const credentials = readSupabaseCredentials();
  if (!credentials) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "in .env.local (see .env.local.example).",
    );
  }
  return credentials;
}
