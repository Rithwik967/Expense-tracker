import { cn } from "@/lib/utils/cn";

/**
 * Temporary brand mark: a mint wallet on navy, used in the header and auth
 * screens until a designed logo lands.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#091426" />
      <rect x="9" y="6.5" width="14" height="6.5" rx="1.4" fill="#fbf8fa" />
      <rect x="6.5" y="11.5" width="19" height="14" rx="3.2" fill="#6cf8bb" />
      <path d="M6.5 15.6h19" stroke="#006c49" strokeWidth="0.7" opacity="0.28" />
      <circle cx="21.6" cy="18.6" r="2.35" fill="#091426" />
      <circle cx="21.6" cy="18.6" r="1.05" fill="#c88000" />
    </svg>
  );
}
