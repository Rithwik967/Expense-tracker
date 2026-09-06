import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/home";
  const destination = new URL(next.startsWith("/") ? next : "/home", url.origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(destination);
  }

  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(destination);
}
