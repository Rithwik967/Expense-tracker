"use client";

import { Camera, Loader2 } from "lucide-react";
import * as React from "react";

import { profileInitials } from "@/lib/profile";
import { cn } from "@/lib/utils/cn";

export function AvatarButton({
  name,
  src,
  size = "lg",
  busy = false,
  onPick,
}: {
  name: string;
  src: string | null;
  size?: "sm" | "lg";
  busy?: boolean;
  onPick?: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dimension = size === "lg" ? "size-24" : "size-8";

  return (
    <span className={cn("relative inline-flex shrink-0", dimension)}>
      <span
        className={cn(
          "overflow-hidden rounded-full bg-surface-high text-ink-muted",
          dimension,
          size === "lg" && "shadow-sm",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          <span
            className={cn(
              "flex size-full items-center justify-center font-semibold",
              size === "lg" ? "text-xl" : "text-[10px]",
            )}
          >
            {profileInitials(name)}
          </span>
        )}
      </span>
      {onPick ? (
        <>
          <button
            type="button"
            aria-label="Change photo"
            aria-busy={busy}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-brand text-ink-inverse shadow-md disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onPick(file);
            }}
          />
        </>
      ) : null}
    </span>
  );
}
