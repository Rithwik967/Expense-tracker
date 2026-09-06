"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";

/**
 * Confirmation before something irreversible.
 *
 * `requirePhrase` adds a typed confirmation for the genuinely destructive
 * actions. Reserved for wiping all data — using it for routine deletes would
 * train the user to type past it without reading.
 */
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  requirePhrase?: string;
  busy?: boolean;
}

/**
 * Nothing is rendered while the dialog is closed, so the typed phrase resets by
 * being mounted afresh each time rather than by an effect clearing it — a
 * half-typed DELETE cannot survive a cancel.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null;
  return <ConfirmDialogPanel {...props} />;
}

function ConfirmDialogPanel({
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  requirePhrase,
  busy = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");

  const phraseSatisfied = !requirePhrase || typed === requirePhrase;

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" block onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            block
            onClick={onConfirm}
            disabled={busy || !phraseSatisfied}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-ink-muted">
        {typeof description === "string" ? <p>{description}</p> : description}

        {requirePhrase ? (
          <Field>
            <FieldLabel>
              Type <span className="font-mono font-semibold text-ink">{requirePhrase}</span> to
              confirm
            </FieldLabel>
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <FieldHint>This cannot be undone.</FieldHint>
          </Field>
        ) : null}
      </div>
    </Sheet>
  );
}
