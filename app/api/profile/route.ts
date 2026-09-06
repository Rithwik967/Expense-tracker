import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { DataError } from "@/lib/data/errors";
import { toProfileView, type ProfileView } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profilePatchSchema } from "@/lib/validations/profile";
import type { ProfileRow } from "@/types/database";

const PROFILE_COLUMNS =
  "id, display_name, avatar_url, phone, mindset_note, start_of_day, notify_morning, notify_evening, notify_overspend, created_at, updated_at";

const LOCAL_PROFILE: ProfileView = {
  id: "local",
  displayName: "Local user",
  email: null,
  avatarUrl: null,
  phone: null,
  mindsetNote: null,
  startOfDay: "06:00",
  notifyMorning: true,
  notifyEvening: true,
  notifyOverspend: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export async function GET(): Promise<Response> {
  return handleRoute(async () => jsonOk(await loadProfile()));
}

export async function PATCH(request: Request): Promise<Response> {
  return handleRoute(async () => {
    if (!isSupabaseConfigured()) {
      throw DataError.unavailable("Sign in is only available when Supabase is configured.");
    }

    const patch = profilePatchSchema.parse(await readJsonBody(request));
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) throw DataError.unauthorized();

    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.mindsetNote !== undefined ? { mindset_note: patch.mindsetNote } : {}),
        ...(patch.startOfDay !== undefined ? { start_of_day: patch.startOfDay } : {}),
        ...(patch.notifyMorning !== undefined ? { notify_morning: patch.notifyMorning } : {}),
        ...(patch.notifyEvening !== undefined ? { notify_evening: patch.notifyEvening } : {}),
        ...(patch.notifyOverspend !== undefined ? { notify_overspend: patch.notifyOverspend } : {}),
      })
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw DataError.unavailable("Could not save your profile.", error);
    return jsonOk(toProfileView(data, user.email ?? null));
  });
}

async function loadProfile(): Promise<ProfileView> {
  if (!isSupabaseConfigured()) return LOCAL_PROFILE;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw DataError.unauthorized();

  const existing = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  if (existing.error) throw DataError.unavailable("Could not load your profile.", existing.error);

  if (existing.data) {
    return toProfileView(existing.data, user.email ?? null);
  }

  const fallbackName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
    user.email?.split("@")[0] ||
    "there";

  const inserted = await supabase
    .from("profiles")
    .insert({ id: user.id, display_name: fallbackName.slice(0, 80) })
    .select(PROFILE_COLUMNS)
    .single();

  if (inserted.error) throw DataError.unavailable("Could not create your profile.", inserted.error);
  return toProfileView(inserted.data as ProfileRow, user.email ?? null);
}
