import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { AUTH_COOKIE_OPTIONS, setAuthCookie } from "./auth-cookies";
import { requireSupabaseCredentials } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * This is the client the application actually uses. All reads and writes go
 * through server-side route handlers, which keeps the anon key out of the
 * browser bundle and keeps the calculation engine on one side of the wire.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = requireSupabaseCredentials();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        // Route Handlers can write the session cookies. Server Components cannot;
        // those writes are handled by `proxy.ts`.
        try {
          for (const { name, value, options } of cookiesToSet) {
            setAuthCookie(cookieStore, name, value, options);
          }
        } catch {
          // Ignored when this client is created during a Server Component render.
        }
      },
    },
  });
}
