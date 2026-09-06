import { handleRoute, jsonOk } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(): Promise<Response> {
  return handleRoute(async () => {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    }
    return jsonOk({ ok: true });
  });
}
