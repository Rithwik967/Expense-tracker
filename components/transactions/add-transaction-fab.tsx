"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import type { DateKey, TransactionType } from "@/lib/finance/types";
import { TRANSACTION_TYPES } from "@/lib/finance/types";

/**
 * The one control that is always within reach.
 *
 * Sits above the bottom navigation on a phone and stays in the corner on a
 * laptop. It opens straight onto an expense — the thing recorded several times
 * a day — with the type switchable inside the sheet rather than behind an extra
 * menu.
 */
export function AddTransactionFab({ initialDate }: { initialDate?: DateKey }) {
  const [type, setType] = React.useState<TransactionType | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setType("expense")}
        aria-label="Add a transaction"
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-raised transition-colors hover:bg-brand-strong active:bg-brand-strong lg:bottom-8 lg:right-8"
      >
        <Plus className="size-6" aria-hidden />
      </button>

      {type ? (
        <TransactionFormSheet
          open
          onClose={() => setType(null)}
          initialType={type}
          initialDate={initialDate}
        />
      ) : null}

      <React.Suspense fallback={null}>
        <ShortcutSheet initialDate={initialDate} />
      </React.Suspense>
    </>
  );
}

/**
 * `?add=expense` opens the form on load, which is what the installed app's
 * home-screen shortcuts point at.
 *
 * The parameter is read from the router rather than from `window.location` in
 * an effect, so the sheet is already open in the first client render instead of
 * appearing a beat later. Closing it replaces the URL, which is also what stops
 * a refresh from reopening the sheet.
 */
function ShortcutSheet({ initialDate }: { initialDate?: DateKey }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const requested = searchParams.get("add") ?? "";
  if (!(TRANSACTION_TYPES as readonly string[]).includes(requested)) return null;

  return (
    <TransactionFormSheet
      open
      onClose={() => router.replace(pathname)}
      initialType={requested as TransactionType}
      initialDate={initialDate}
    />
  );
}
