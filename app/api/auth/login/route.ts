import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { DataError } from "@/lib/data/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const body = loginSchema.parse(await readJsonBody(request));
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      throw DataError.unauthorized("Email or password is not right.");
    }

    return jsonOk({ ok: true });
  });
}
