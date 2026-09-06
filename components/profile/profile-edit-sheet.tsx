"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import type { ProfileView } from "@/lib/profile";

export function ProfileEditSheet({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileView;
  onSave: (patch: {
    displayName: string;
    phone: string;
    mindsetNote: string;
    startOfDay: string;
  }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = React.useState(profile.displayName);
  const [phone, setPhone] = React.useState(profile.phone ?? "");
  const [mindsetNote, setMindsetNote] = React.useState(profile.mindsetNote ?? "");
  const [startOfDay, setStartOfDay] = React.useState(profile.startOfDay);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName);
    setPhone(profile.phone ?? "");
    setMindsetNote(profile.mindsetNote ?? "");
    setStartOfDay(profile.startOfDay);
  }, [open, profile]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await onSave({ displayName, phone, mindsetNote, startOfDay });
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="Your name and photo are what other sessions of this app will show. Spending is still calculated only from your transactions."
      footer={
        <Button type="submit" form="profile-edit" block disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      }
    >
      <form id="profile-edit" onSubmit={onSubmit} className="space-y-4">
        <Field>
          <FieldLabel>Full name</FieldLabel>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={80} />
        </Field>
        <Field>
          <FieldLabel optional>Phone</FieldLabel>
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={20} />
        </Field>
        <Field>
          <FieldLabel>Start of day</FieldLabel>
          <Input type="time" value={startOfDay} onChange={(event) => setStartOfDay(event.target.value)} required />
        </Field>
        <Field>
          <FieldLabel optional>Discretionary mindset</FieldLabel>
          <Textarea
            value={mindsetNote}
            onChange={(event) => setMindsetNote(event.target.value)}
            maxLength={280}
            rows={3}
          />
        </Field>
      </form>
    </Sheet>
  );
}
