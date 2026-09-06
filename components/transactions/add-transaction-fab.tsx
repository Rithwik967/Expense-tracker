"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { cn } from "@/lib/utils/cn";
import type { DateKey, TransactionType } from "@/lib/finance/types";
import { TRANSACTION_TYPES } from "@/lib/finance/types";

/**
 * One add-transaction controller for the whole shell.
 *
 * The phone bar and the laptop corner button both open the same sheet. Mounting
 * the sheet twice would trap focus in two places at once.
 */

const AddTransactionContext = React.createContext<{
  openExpense: () => void;
} | null>(null);

export function AddTransactionProvider({
  children,
  initialDate,
}: {
  children: React.ReactNode;
  initialDate?: DateKey;
}) {
  const [type, setType] = React.useState<TransactionType | null>(null);

  const value = React.useMemo(
    () => ({ openExpense: () => setType("expense") }),
    [],
  );

  return (
    <AddTransactionContext.Provider value={value}>
      {children}

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
    </AddTransactionContext.Provider>
  );
}

export function useAddTransaction() {
  const context = React.useContext(AddTransactionContext);
  if (!context) {
    throw new Error("useAddTransaction must be used inside AddTransactionProvider.");
  }
  return context;
}

export function AddNavButton() {
  const { openExpense } = useAddTransaction();

  return (
    <div className="flex w-14 flex-col items-center -mt-10">
      <button
        type="button"
        onClick={openExpense}
        aria-label="Add a transaction"
        className="flex size-14 items-center justify-center rounded-full bg-brand text-ink-inverse shadow-raised transition-transform active:scale-95"
      >
        <Plus className="size-7" aria-hidden />
      </button>
      <span className="label-caps mt-2 text-ink-subtle">Add</span>
    </div>
  );
}

export function AddCornerButton() {
  const { openExpense } = useAddTransaction();

  return (
    <button
      type="button"
      onClick={openExpense}
      aria-label="Add a transaction"
      className={cn(
        "fixed bottom-8 right-8 z-40 hidden size-14 items-center justify-center rounded-full",
        "bg-brand text-ink-inverse shadow-raised transition-colors hover:bg-brand-strong lg:flex",
      )}
    >
      <Plus className="size-6" aria-hidden />
    </button>
  );
}

/** @deprecated Use AddTransactionProvider + AddNavButton instead. */
export function AddTransactionFab({ initialDate }: { initialDate?: DateKey }) {
  return (
    <AddTransactionProvider initialDate={initialDate}>
      <AddCornerButton />
    </AddTransactionProvider>
  );
}

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
