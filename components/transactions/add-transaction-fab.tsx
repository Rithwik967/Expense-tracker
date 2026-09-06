"use client";

import { Plus } from "lucide-react";
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
 *
 * `?add=expense` opens it on load, which is what the installed app's
 * home-screen shortcut points at. The parameter is stripped afterwards so a
 * refresh does not reopen the sheet.
 */
export function AddTransactionFab({ initialDate }: { initialDate?: DateKey }) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<TransactionType>("expense");

  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("add");
    if (!requested) return;

    if ((TRANSACTION_TYPES as readonly string[]).includes(requested)) {
      setType(requested as TransactionType);
      setOpen(true);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url.toString());
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setType("expense");
          setOpen(true);
        }}
        aria-label="Add a transaction"
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-raised transition-colors hover:bg-brand-strong active:bg-brand-strong lg:bottom-8 lg:right-8"
      >
        <Plus className="size-6" aria-hidden />
      </button>

      <TransactionFormSheet
        open={open}
        onClose={() => setOpen(false)}
        initialType={type}
        initialDate={initialDate}
      />
    </>
  );
}
