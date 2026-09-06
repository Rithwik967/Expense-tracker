import type { CookieOptions } from "@supabase/ssr";

/**
 * Keep the signed-in session in the browser until the user logs out.
 *
 * Chrome (and the cookie spec) cap Max-Age at 400 days. Refresh tokens still
 * control whether the session is actually valid — this only stops the browser
 * from throwing the cookies away when a tab or window closes.
 */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};

export type NextCookieWriteOptions = {
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  httpOnly?: boolean;
  secure?: boolean;
  domain?: string;
  maxAge?: number;
  expires?: Date;
};

export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token") && !name.includes("code-verifier");
}

/** Options Next.js will actually write onto Set-Cookie (no extra serialize fields). */
export function toNextCookieOptions(options: CookieOptions = {}): NextCookieWriteOptions {
  const deleting = options.maxAge === 0;
  if (deleting) {
    return {
      path: options.path ?? "/",
      sameSite: normalizeSameSite(options.sameSite),
      httpOnly: options.httpOnly,
      secure: options.secure,
      domain: options.domain,
      maxAge: 0,
      expires: new Date(0),
    };
  }

  const maxAge = AUTH_COOKIE_MAX_AGE_SECONDS;
  return {
    path: options.path ?? "/",
    sameSite: normalizeSameSite(options.sameSite) ?? "lax",
    httpOnly: options.httpOnly ?? false,
    secure: options.secure,
    domain: options.domain,
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

type CookieWriter = {
  set(name: string, value: string, options?: NextCookieWriteOptions): unknown;
};

export function setAuthCookie(
  store: CookieWriter,
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  store.set(name, value, toNextCookieOptions(options));
}

/** Re-apply a long Max-Age so existing session cookies survive a browser restart. */
export function persistAuthCookies(
  store: CookieWriter,
  cookies: readonly { name: string; value: string }[],
): void {
  for (const cookie of cookies) {
    if (!isSupabaseAuthCookie(cookie.name) || cookie.value.length === 0) continue;
    setAuthCookie(store, cookie.name, cookie.value);
  }
}

function normalizeSameSite(
  value: CookieOptions["sameSite"],
): NextCookieWriteOptions["sameSite"] | undefined {
  if (value === "lax" || value === "strict" || value === "none") return value;
  if (value === true) return "strict";
  if (value === false) return "none";
  return undefined;
}
