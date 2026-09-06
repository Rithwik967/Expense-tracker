import { handleRoute, jsonOk } from "@/lib/api/response";
import { DataError } from "@/lib/data/errors";
import { toProfileView } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS =
  "id, display_name, avatar_url, phone, mindset_note, start_of_day, notify_morning, notify_evening, notify_overspend, created_at, updated_at";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const EXTENSION_BY_SUFFIX = new Map([
  [".jpg", "jpg"],
  [".jpeg", "jpg"],
  [".png", "png"],
  [".webp", "webp"],
  [".gif", "gif"],
]);

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    if (!isSupabaseConfigured()) {
      throw DataError.unavailable("Photo upload needs Supabase.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw DataError.validation("Choose a photo to upload.");
    }

    const extension = extensionFor(file);
    if (!extension) {
      throw DataError.validation("Use a JPEG, PNG, WebP or GIF photo.");
    }
    if (file.size > MAX_BYTES) {
      throw DataError.validation("Keep the photo under 2 MB.");
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw DataError.unauthorized();

    const path = `${user.id}/avatar.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await supabase.storage.from("avatars").upload(path, buffer, {
      upsert: true,
      contentType: file.type || `image/${extension === "jpg" ? "jpeg" : extension}`,
    });

    if (upload.error) {
      throw DataError.unavailable("Could not upload that photo.", upload.error);
    }

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

    const updated = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id)
      .select(PROFILE_COLUMNS)
      .single();

    if (updated.error) {
      throw DataError.unavailable("The photo uploaded, but the profile could not be saved.", updated.error);
    }

    return jsonOk(toProfileView(updated.data, user.email ?? null));
  });
}

function extensionFor(file: File): string | undefined {
  const fromType = ALLOWED_TYPES.get(file.type.toLowerCase());
  if (fromType) return fromType;

  const name = file.name.toLowerCase();
  for (const [suffix, extension] of EXTENSION_BY_SUFFIX) {
    if (name.endsWith(suffix)) return extension;
  }
  return undefined;
}

