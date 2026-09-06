import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { DataError } from "@/lib/data/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const body = signupSchema.parse(await readJsonBody(request));
    const supabase = await createSupabaseServerClient();
    const origin = new URL(request.url).origin;

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: { display_name: body.displayName },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      throw DataError.validation(error.message);
    }

    return jsonOk({
      ok: true,
      needsEmailConfirmation: !data.session,
    });
  });
}
