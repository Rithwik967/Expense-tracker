import { describe, expect, it } from "vitest";

import { getDailyBalance } from "./daily-balance";
import { getMonthlySummary } from "./monthly-balance";
import { toDecimalString } from "./money";
import { expense, ledgerInput } from "./test-support";
import type { FinanceTransaction } from "./types";

/**
 * Historical corrections are the reason no balance is ever persisted. These
 * tests edit, remove and insert a transaction in the past and assert that every
 * later day moves on its own.
 */

const baseline: FinanceTransaction[] = [
  expense("2026-09-01", 100, { id: "t1" }),
  expense("2026-09-02", 200, { id: "t2" }),
  expense("2026-09-03", 1000, { id: "t3" }),
  expense("2026-09-04", 100, { id: "t4" }),
];

const balancesFor = (transactions: FinanceTransaction[]) => {
  const input = ledgerInput({ transactions });
  return (date: string) => toDecimalString(getDailyBalance(input, date).endingBalance);
};

describe("Test 7: editing an old expense", () => {
  const before = balancesFor(baseline);

  it("establishes the starting position", () => {
    expect(before("2026-09-01")).toBe("200.00");
    expect(before("2026-09-02")).toBe("300.00");
    expect(before("2026-09-03")).toBe("-400.00");
    expect(before("2026-09-04")).toBe("-200.00");
  });

  it("moves the edited day and every later day when ₹1,000 becomes ₹700", () => {
    const edited = baseline.map((transaction) =>
      transaction.id === "t3" ? expense("2026-09-03", 700, { id: "t3" }) : transaction,
    );
    const after = balancesFor(edited);

    // Days before the edit are untouched.
    expect(after("2026-09-01")).toBe("200.00");
    expect(after("2026-09-02")).toBe("300.00");

    // The edited day and everything after it shift by exactly ₹300.
    expect(after("2026-09-03")).toBe("-100.00");
    expect(after("2026-09-04")).toBe("100.00");
    expect(after("2026-09-30")).toBe("7900.00");
  });

  it("moves the transaction when only its date changes", () => {
    const moved = baseline.map((transaction) =>
      transaction.id === "t3" ? expense("2026-09-20", 1000, { id: "t3" }) : transaction,
    );
    const after = balancesFor(moved);

    // The 3rd is no longer in deficit; the 20th absorbs the ₹1,000 instead.
    expect(after("2026-09-03")).toBe("600.00");
    expect(after("2026-09-19")).toBe("5300.00");
    expect(after("2026-09-20")).toBe("4600.00");
    // The month closes in the same place either way.
    expect(after("2026-09-30")).toBe("7600.00");
  });
});

describe("Test 8: deleting an old expense", () => {
  it("raises every balance from the deleted day onward", () => {
    const remaining = baseline.filter((transaction) => transaction.id !== "t3");
    const after = balancesFor(remaining);

    expect(after("2026-09-02")).toBe("300.00");
    expect(after("2026-09-03")).toBe("600.00");
    expect(after("2026-09-04")).toBe("800.00");
    expect(after("2026-09-30")).toBe("8600.00");
  });

  it("returns the month to a clean slate when every transaction is removed", () => {
    const after = balancesFor([]);
    expect(after("2026-09-30")).toBe("9000.00");
  });
});

describe("Test 9: inserting a historical transaction", () => {
  it("lowers every balance from the inserted day onward", () => {
    const withInsert = [...baseline, expense("2026-09-02", 250, { id: "t5" })];
    const after = balancesFor(withInsert);

    // The 1st predates the insert and does not move.
    expect(after("2026-09-01")).toBe("200.00");
    expect(after("2026-09-02")).toBe("50.00");
    expect(after("2026-09-03")).toBe("-650.00");
    expect(after("2026-09-30")).toBe("7350.00");
  });

  it("keeps the monthly total in step with the daily chain", () => {
    const withInsert = [...baseline, expense("2026-09-02", 250, { id: "t5" })];
    const input = ledgerInput({ transactions: withInsert });
    const summary = getMonthlySummary(input, "2026-09-01", "2026-09-30");

    expect(toDecimalString(summary.totalSpent)).toBe("1650.00");
    expect(summary.transactionCount).toBe(5);
    expect(toDecimalString(summary.projectedEndBalance)).toBe("7350.00");
    expect(summary.projectedEndBalance).toBe(
      getDailyBalance(input, "2026-09-30").endingBalance,
    );
  });
});

describe("a correction never leaves a stale balance behind", () => {
  it("recomputes identically no matter which order the edits arrive in", () => {
    const editedThenInserted = balancesFor([
      ...baseline.map((t) => (t.id === "t3" ? expense("2026-09-03", 700, { id: "t3" }) : t)),
      expense("2026-09-02", 250, { id: "t5" }),
    ]);

    const insertedThenEdited = balancesFor(
      [...baseline, expense("2026-09-02", 250, { id: "t5" })].map((t) =>
        t.id === "t3" ? expense("2026-09-03", 700, { id: "t3" }) : t,
      ),
    );

    for (const date of ["2026-09-02", "2026-09-03", "2026-09-15", "2026-09-30"]) {
      expect(editedThenInserted(date)).toBe(insertedThenEdited(date));
    }
  });
});
