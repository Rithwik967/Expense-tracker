"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Flame,
  Leaf,
  LogOut,
  Pencil,
  PlaneTakeoff,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AvatarButton } from "@/components/profile/avatar-button";
import { ProfileEditSheet } from "@/components/profile/profile-edit-sheet";
import { useAppData } from "@/components/providers/app-data-provider";
import { useProfile } from "@/components/providers/profile-provider";
import { Amount } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { APP_NAME } from "@/lib/constants";
import { ZERO } from "@/lib/finance/money";
import type { DailyBalance, DateKey } from "@/lib/finance/types";

export default function ProfilePage() {
  const { profile, isLoading, isUploadingAvatar, error, reload, save, uploadAvatar, logout } = useProfile();
  const { settings, monthView, today, currency } = useAppData();
  const [editing, setEditing] = React.useState(false);

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (isLoading || !profile) {
    return <ProfileSkeleton />;
  }

  const summary = monthView.data?.summary;
  const days = monthView.data?.days ?? [];
  const funFund = monthView.data?.funFund ?? ZERO;
  const streak = today ? onBudgetStreak(days, today) : 0;
  const memberSince = format(new Date(profile.createdAt), "MMM yyyy");
  const budget = summary?.monthlyBudget ?? settings?.defaultMonthlyBudget ?? ZERO;
  const daily = summary?.dailyAllowance ?? settings?.defaultDailyAllowance ?? null;
  const daysInMonth = summary?.daysInMonth;
  const surplusRatio = budget > 0 ? Math.min(100, Math.round((funFund / budget) * 100)) : 0;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="flex size-10 items-center justify-center rounded-full bg-surface-low text-ink"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold text-ink">User Profile</h1>
        <button
          type="button"
          aria-label="Edit profile"
          onClick={() => setEditing(true)}
          className="flex size-10 items-center justify-center rounded-full bg-surface-low text-ink"
        >
          <Pencil className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <section className="relative overflow-hidden rounded-xl bg-surface-raised p-6 text-center shadow-card">
          <div className="pointer-events-none absolute inset-x-0 -top-16 h-36 bg-gradient-to-b from-positive-soft/20 to-transparent" />
          <div className="relative mb-4 flex justify-center">
            <AvatarButton
              name={profile.displayName}
              src={profile.avatarUrl}
              busy={isUploadingAvatar}
              onPick={(file) => {
                void uploadAvatar(file);
              }}
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">{profile.displayName}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {APP_NAME} member since {memberSince}
          </p>
          {streak > 0 ? (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-positive-soft/50 px-3 py-1.5 text-positive">
              <Leaf className="size-4" aria-hidden />
              <span className="text-xs font-semibold tracking-wide uppercase">
                On budget ({streak}-day streak)
              </span>
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-xl bg-surface-raised p-3 shadow-card">
          <StatCell
            icon={<Flame className="size-4 text-positive" />}
            value={`${streak}d`}
            label="Current streak"
          />
          <StatCell value={<Amount value={funFund} currency={currency} />} label="Extra saved" />
          <StatCell value={<Amount value={budget} currency={currency} />} label="Monthly budget" />
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-ink">Discretionary mindset</p>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold tracking-wide text-brand-ink uppercase">
              Personal
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            {profile.mindsetNote ?? "Add a note about how you want to spend this month."}
          </p>
          <div className="flex flex-col gap-2 rounded-lg bg-surface-low p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                <PlaneTakeoff className="size-4 text-positive" aria-hidden />
                Fun fund
              </span>
              <span className="text-xs font-semibold tracking-wide text-positive uppercase">{surplusRatio}%</span>
            </div>
            <Progress value={funFund} max={budget > 0 ? budget : 1} label="Fun fund against this month's budget" />
          </div>
        </section>

        <InfoCard title="Personal information">
          <InfoRow label="Full name" value={profile.displayName} />
          <InfoRow label="Email address" value={profile.email ?? "—"} />
          <InfoRow label="Phone" value={profile.phone ?? "—"} />
          <InfoRow label="Currency & locale" value={`${currency} (India)`} />
          <InfoRow label="Start of day" value={formatClock(profile.startOfDay)} />
        </InfoCard>

        <section className="flex flex-col gap-2 rounded-xl bg-surface-raised p-4 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-semibold text-ink">Budget preferences</h3>
            <Link href="/settings" className="text-xs font-semibold tracking-wide text-brand-ink uppercase">
              Modify
            </Link>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-low p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Daily allowance</p>
              {daysInMonth && budget ? (
                <p className="text-xs text-ink-muted">
                  <Amount value={budget} currency={currency} /> ÷ {daysInMonth} days
                </p>
              ) : null}
            </div>
            <p className="text-lg font-semibold text-positive">
              {daily !== null ? (
                <>
                  <Amount value={daily} currency={currency} />
                  /day
                </>
              ) : (
                "Derived"
              )}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-low p-3">
            <span className="text-sm text-ink-muted">Month reset day</span>
            <span className="text-sm font-semibold text-ink">
              {ordinal(settings?.monthStartDay ?? 1)} of month
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-low p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Carry-forward surplus</p>
              <p className="text-xs text-ink-muted">Leftover daily balance always rolls over</p>
            </div>
            <span className="rounded-full bg-positive-soft/50 px-2 py-0.5 text-xs font-semibold tracking-wide text-positive uppercase">
              Enabled
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-brand" aria-hidden />
            <h3 className="text-base font-semibold text-ink">Notification habits</h3>
          </div>
          <p className="text-xs text-ink-muted">
            Saved on your account so every device agrees. {APP_NAME} does not send push alerts yet.
          </p>
          <div className="rounded-lg bg-surface-low p-3">
            <Switch
              checked={profile.notifyMorning}
              onCheckedChange={(checked) => {
                void save({ notifyMorning: checked });
              }}
              label="Morning allowance ping"
              description="8:00 AM • Sets your daily mindset"
            />
          </div>
          <div className="rounded-lg bg-surface-low p-3">
            <Switch
              checked={profile.notifyEvening}
              onCheckedChange={(checked) => {
                void save({ notifyEvening: checked });
              }}
              label="Evening check-in"
              description="9:30 PM • Quick 30-second review"
            />
          </div>
          <div className="rounded-lg bg-surface-low p-3">
            <Switch
              checked={profile.notifyOverspend}
              onCheckedChange={(checked) => {
                void save({ notifyOverspend: checked });
              }}
              label="Overspend soft alert"
              description="Gentle prompt, never stressful"
            />
          </div>
        </section>

        <div className="mb-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-high font-semibold text-ink"
          >
            <Pencil className="size-4" />
            Edit profile details
          </button>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="flex h-11 items-center justify-center gap-1 rounded-xl font-semibold text-negative"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </div>

      <ProfileEditSheet
        open={editing}
        onClose={() => setEditing(false)}
        profile={profile}
        onSave={async (patch) => {
          await save(patch);
        }}
      />
    </>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl bg-surface-raised p-4 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <BadgeCheck className="size-5 text-brand" aria-hidden />
        <h3 className="text-base font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-surface-low p-3">
      <span className="shrink-0 text-sm text-ink-muted">{label}</span>
      <span className="truncate text-right text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function StatCell({
  value,
  label,
  icon,
}: {
  value: React.ReactNode;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-surface-low p-2 text-center">
      <div className="mb-1 flex items-center gap-1 text-lg font-semibold text-ink">
        {icon}
        {value}
      </div>
      <span className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{label}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function onBudgetStreak(days: readonly DailyBalance[], today: DateKey): number {
  const past = [...days].filter((day) => day.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const day of past) {
    if (day.endingBalance >= 0) count += 1;
    else break;
  }
  return count;
}

function ordinal(n: number): string {
  const remainder = n % 100;
  if (remainder >= 11 && remainder <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatClock(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return `${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} (IST)`;
}
