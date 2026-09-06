import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

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
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Route Handlers and Server Components may be rendering in a context
        // where cookies are already sent. There is no session to persist while
        // the app is unauthenticated, so failing to write is harmless.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignored: see above.
        }
      },
    },
  });
}
