import type { ProfileRow } from "@/types/database";

/** Identity and notification preferences stored in `public.profiles`. */
export interface ProfileView {
  readonly id: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly avatarUrl: string | null;
  readonly phone: string | null;
  readonly mindsetNote: string | null;
  /** `HH:MM` 24-hour clock. Display preference only. */
  readonly startOfDay: string;
  readonly notifyMorning: boolean;
  readonly notifyEvening: boolean;
  readonly notifyOverspend: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toHHmm(value: string): string {
  return value.slice(0, 5);
}

export function toProfileView(row: ProfileRow, email: string | null): ProfileView {
  return {
    id: row.id,
    displayName: row.display_name,
    email,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    mindsetNote: row.mindset_note,
    startOfDay: toHHmm(row.start_of_day),
    notifyMorning: row.notify_morning,
    notifyEvening: row.notify_evening,
    notifyOverspend: row.notify_overspend,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
