import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { AUTH_COOKIE_OPTIONS } from "./auth-cookies";
import { requireSupabaseCredentials } from "./env";

/**
 * Supabase client for the browser.
 *
 * Used for Realtime subscriptions (profile name and photo). Ledger reads and
 * writes still go through `/api` so balances are computed in one place.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabaseCredentials();
  return createBrowserClient<Database>(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
