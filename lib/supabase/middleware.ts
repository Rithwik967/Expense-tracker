import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import { AUTH_COOKIE_OPTIONS, persistAuthCookies, setAuthCookie } from "./auth-cookies";
import { readSupabaseCredentials } from "./env";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return pathname.startsWith("/auth/");
}

/**
 * Refresh the Auth cookies and send unauthenticated visitors to sign in.
 *
 * Called from `proxy.ts` on every non-static request. Page protection here is
 * optimistic; route handlers still call `getClaims()` before reading data.
 *
 * Auth cookies are always written with a long Max-Age so closing a tab or
 * window does not sign the user out. Logging out still clears them.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const credentials = readSupabaseCredentials();
  if (!credentials) return response;

  const supabase = createServerClient<Database>(credentials.url, credentials.anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          setAuthCookie(response.cookies, name, value, options);
        }
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (signedIn) {
    const alreadyWritten = new Set(response.cookies.getAll().map((cookie) => cookie.name));
    persistAuthCookies(
      response.cookies,
      request.cookies.getAll().filter((cookie) => !alreadyWritten.has(cookie.name)),
    );
  }

  if (!signedIn && !isPublicPath(pathname) && !isApi) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (pathname !== "/home") {
      login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    const redirect = NextResponse.redirect(login);
    copyResponseCookies(response, redirect);
    return redirect;
  }

  if (signedIn && (pathname === "/login" || pathname === "/signup")) {
    const home = request.nextUrl.clone();
    home.pathname = "/home";
    home.search = "";
    const redirect = NextResponse.redirect(home);
    copyResponseCookies(response, redirect);
    persistAuthCookies(redirect.cookies, request.cookies.getAll());
    return redirect;
  }

  return response;
}

function copyResponseCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  persistAuthCookies(to.cookies, from.cookies.getAll());
}
