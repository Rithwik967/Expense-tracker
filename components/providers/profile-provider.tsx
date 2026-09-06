"use client";

import * as React from "react";

import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { toProfileView, type ProfileView } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { compressAvatar } from "@/lib/utils/compress-avatar";
import type { ProfileRow } from "@/types/database";

interface ProfileContextValue {
  readonly profile: ProfileView | null;
  readonly isLoading: boolean;
  readonly isUploadingAvatar: boolean;
  readonly error: string | null;
  reload: () => void;
  save: (patch: Record<string, unknown>) => Promise<ProfileView>;
  uploadAvatar: (file: File) => Promise<void>;
  logout: () => Promise<void>;
}

const ProfileContext = React.createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<ProfileView | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toast = useToast();

  const reload = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile");
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        throw new Error("Could not load your profile.");
      }
      setProfile((await response.json()) as ProfileView);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!isSupabaseConfigured() || !profile || profile.id === "local") return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`profile:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${profile.id}` },
        (payload) => {
          const row = payload.new as ProfileRow | undefined;
          if (!row?.id) return;
          setProfile((current) => toProfileView(row, current?.email ?? null));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const value = React.useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      isUploadingAvatar,
      error,
      reload: () => {
        void reload();
      },
      save: async (patch) => {
        const next = await patchProfile(patch);
        setProfile(next);
        toast.success("Profile saved.");
        return next;
      },
      uploadAvatar: async (file) => {
        setIsUploadingAvatar(true);
        try {
          const prepared = await compressAvatar(file);
          const next = await postAvatar(prepared);
          setProfile(next);
          toast.success("Photo updated.");
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : "Could not save that photo.");
        } finally {
          setIsUploadingAvatar(false);
        }
      },
      logout: async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      },
    }),
    [profile, isLoading, isUploadingAvatar, error, reload, toast],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = React.useContext(ProfileContext);
  if (!value) {
    throw new Error("useProfile must be used within ProfileProvider.");
  }
  return value;
}

async function readError(response: Response): Promise<never> {
  let message = `The server responded with ${response.status}.`;
  try {
    const body = (await response.json()) as { error?: { message?: string; code?: string } };
    message = body.error?.message ?? message;
    throw new ApiError(body.error?.code ?? "unknown", message, response.status);
  } catch (caught) {
    if (caught instanceof ApiError) throw caught;
    throw new ApiError("unknown", message, response.status);
  }
}

async function patchProfile(patch: Record<string, unknown>): Promise<ProfileView> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) await readError(response);
  return (await response.json()) as ProfileView;
}

async function postAvatar(file: File): Promise<ProfileView> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/profile/avatar", { method: "POST", body });
  if (!response.ok) await readError(response);
  return (await response.json()) as ProfileView;
}
