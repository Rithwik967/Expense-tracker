import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import { readSupabaseCredentials } from "./env";

/**
 * Session refresh helper for request interception.
 *
 * Nothing calls this yet: the app is single-user and unauthenticated, so there
 * is no session to keep alive and adding a request-level hook would cost every
 * navigation for no benefit.
 *
 * It exists as the wiring point for when authentication is added. At that
 * point, create `proxy.ts` at the project root and delegate to it:
 *
 * ```ts
 * // proxy.ts
 * import { updateSupabaseSession } from '@/lib/supabase/middleware'
 *
 * export async function proxy(request: NextRequest) {
 *   return updateSupabaseSession(request)
 * }
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * }
 * ```
 *
 * Note for Next.js 16: the convention is `proxy.ts` with an exported `proxy`
 * function. The old `middleware.ts` filename is deprecated.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const credentials = readSupabaseCredentials();
  if (!credentials) return response;

  const supabase = createServerClient<Database>(credentials.url, credentials.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touching the user refreshes an expiring token and writes the new cookies.
  await supabase.auth.getUser();

  return response;
}
