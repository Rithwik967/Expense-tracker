"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Transient confirmations, including Undo.
 *
 * Announced through an `aria-live` region so a screen reader hears "Expense
 * deleted" without focus moving. A toast carrying an Undo action is given a
 * longer life, because the point of Undo is that it is still there when the
 * user realises the mistake.
 */

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: "success" | "error" | "info";
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id">) => void;
  success: (message: string, action?: Toast["action"]) => void;
  error: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4_000;
const UNDO_DURATION_MS = 8_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = React.useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = (nextId.current += 1);
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(
        () => dismiss(id),
        toast.action ? UNDO_DURATION_MS : DEFAULT_DURATION_MS,
      );
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, action) => show({ message, tone: "success", action }),
      error: (message) => show({ message, tone: "error" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-24 sm:pb-6"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info;

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-control px-4 py-3 shadow-raised",
        "border bg-surface",
        toast.tone === "error" ? "border-negative/40" : "border-border",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-5 shrink-0",
          toast.tone === "success" && "text-positive",
          toast.tone === "error" && "text-negative",
          toast.tone === "info" && "text-info",
        )}
      />
      <p className="min-w-0 flex-1 text-sm text-ink">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          {toast.action.label}
        </button>
      ) : null}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside a ToastProvider.");
  return context;
}
