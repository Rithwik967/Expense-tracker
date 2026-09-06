import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { requireSupabaseCredentials } from "./env";

/**
 * Supabase client for the browser.
 *
 * Not used by the current screens on purpose. Every read and write goes through
 * this app's own `/api` route handlers so that:
 *
 *  - balances are computed in exactly one place (lib/finance, server side),
 *  - the anon key is not inlined into the client bundle, which matters while
 *    RLS still grants that key full access (see supabase/migrations/*_rls.sql).
 *
 * Kept here for the cases that genuinely need a direct connection later, such
 * as Realtime subscriptions or Storage uploads.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseCredentials();
  return createBrowserClient<Database>(url, anonKey);
}
