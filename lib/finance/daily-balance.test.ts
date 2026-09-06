import { describe, expect, it } from "vitest";

import { createLedger } from "./calculations";
import {
  getDailyBalance,
  getSafeToSpend,
  getStartOfDayAvailable,
  getTodayAvailable,
} from "./daily-balance";
import { getMonthlySummary } from "./monthly-balance";
import { toDecimalString } from "./money";
import { adjustment, budget, expense, income, ledgerInput, planned } from "./test-support";

/**
 * The worked example from the product brief: ₹9,000 across September's 30 days
 * gives a ₹300 daily allowance, unused allowance rolls forward, and overspending
 * is recovered out of later days rather than reset.
 */
const walkthrough = ledgerInput({
  transactions: [
    expense("2026-09-01", 150),
    expense("2026-09-02", 100),
    expense("2026-09-03", 1000),
  ],
});

describe("the product brief walkthrough", () => {
  it("Test 1: day 1 spends ₹150 of a ₹300 allowance and ends at ₹150", () => {
    const day = getDailyBalance(walkthrough, "2026-09-01");
    expect(toDecimalString(day.startingBalance)).toBe("0.00");
    expect(toDecimalString(day.dailyAllowance)).toBe("300.00");
    expect(toDecimalString(day.expenses)).toBe("150.00");
    expect(toDecimalString(day.endingBalance)).toBe("150.00");
  });

  it("Test 2: day 2 carries ₹150 forward and ends at ₹350", () => {
    const day = getDailyBalance(walkthrough, "2026-09-02");
    expect(toDecimalString(day.startingBalance)).toBe("150.00");
    expect(toDecimalString(getStartOfDayAvailable(walkthrough, "2026-09-02"))).toBe("450.00");
    expect(toDecimalString(day.endingBalance)).toBe("350.00");
  });

  it("Test 3: day 3 overspends ₹650 of availability and ends at −₹350", () => {
    const day = getDailyBalance(walkthrough, "2026-09-03");
    expect(toDecimalString(getStartOfDayAvailable(walkthrough, "2026-09-03"))).toBe("650.00");
    expect(toDecimalString(day.endingBalance)).toBe("-350.00");
  });

  it("Test 4: later allowances recover the deficit without any manual correction", () => {
    expect(toDecimalString(getTodayAvailable(walkthrough, "2026-09-04"))).toBe("-50.00");
    expect(toDecimalString(getTodayAvailable(walkthrough, "2026-09-05"))).toBe("250.00");
  });

  it("never fabricates a balance the transactions do not support", () => {
    const ledger = createLedger(walkthrough);
    const days = ledger.dailyBalancesForMonth("2026-09-01");

    // Each day's opening balance is exactly the previous day's close.
    days.slice(1).forEach((day, index) => {
      expect(day.startingBalance).toBe(days[index].endingBalance);
    });
  });
});

describe("transaction semantics", () => {
  it("adds income and credit adjustments, subtracts expenses and debit adjustments", () => {
    const input = ledgerInput({
      transactions: [
        income("2026-09-01", 500),
        adjustment("2026-09-01", 200, "credit"),
        expense("2026-09-01", 120),
        adjustment("2026-09-01", 80, "debit"),
      ],
    });

    const day = getDailyBalance(input, "2026-09-01");
    expect(toDecimalString(day.income)).toBe("500.00");
    expect(toDecimalString(day.creditAdjustments)).toBe("200.00");
    expect(toDecimalString(day.expenses)).toBe("120.00");
    expect(toDecimalString(day.debitAdjustments)).toBe("80.00");
    // 0 + 300 + 500 + 200 - 120 - 80
    expect(toDecimalString(day.endingBalance)).toBe("800.00");
  });

  it("counts only expenses as spending, so adjustments never inflate the total", () => {
    const input = ledgerInput({
      transactions: [expense("2026-09-01", 120), adjustment("2026-09-01", 80, "debit")],
    });

    const day = getDailyBalance(input, "2026-09-01");
    expect(toDecimalString(day.totalSpent)).toBe("120.00");
    expect(day.transactionCount).toBe(2);
  });
});

describe("Test 10: future transactions", () => {
  const input = ledgerInput({
    transactions: [expense("2026-09-05", 200), expense("2026-09-25", 5000)],
  });

  it("leaves today's balance untouched by a transaction dated later", () => {
    // Through the 5th: 5 x 300 - 200.
    expect(toDecimalString(getTodayAvailable(input, "2026-09-05"))).toBe("1300.00");
  });

  it("applies the future transaction on the day it is dated", () => {
    expect(toDecimalString(getTodayAvailable(input, "2026-09-24"))).toBe("7000.00");
    expect(toDecimalString(getTodayAvailable(input, "2026-09-25"))).toBe("2300.00");
  });

  it("reports the month-end projection including the future transaction", () => {
    const summary = getMonthlySummary(input, "2026-09-01", "2026-09-05");
    expect(toDecimalString(summary.currentBalance)).toBe("1300.00");
    expect(toDecimalString(summary.projectedEndBalance)).toBe("3800.00");
  });
});

describe("Test 11 and 12: planned expenses are reservations, not spending", () => {
  const input = ledgerInput({
    transactions: [expense("2026-09-01", 150)],
    plannedExpenses: [planned("2026-09-15", 500), planned("2026-09-20", 300)],
  });

  it("Test 11: a planned expense does not move the actual balance", () => {
    const withoutPlans = ledgerInput({ transactions: [expense("2026-09-01", 150)] });
    expect(getTodayAvailable(input, "2026-09-01")).toBe(getTodayAvailable(withoutPlans, "2026-09-01"));

    const summary = getMonthlySummary(input, "2026-09-01", "2026-09-01");
    expect(toDecimalString(summary.totalSpent)).toBe("150.00");
  });

  it("Test 12: safe-to-spend reserves upcoming plans but the balance stays whole", () => {
    const safe = getSafeToSpend(input, "2026-09-01");
    expect(toDecimalString(safe.availableBalance)).toBe("150.00");
    expect(toDecimalString(safe.reservedForPlanned)).toBe("800.00");
    expect(toDecimalString(safe.safeToSpend)).toBe("-650.00");
    expect(safe.plannedExpenseCount).toBe(2);
  });

  it("stops reserving a plan once it is completed or cancelled", () => {
    const settled = ledgerInput({
      transactions: [expense("2026-09-01", 150)],
      plannedExpenses: [
        planned("2026-09-15", 500, { status: "completed" }),
        planned("2026-09-20", 300, { status: "cancelled" }),
      ],
    });

    const safe = getSafeToSpend(settled, "2026-09-01");
    expect(toDecimalString(safe.reservedForPlanned)).toBe("0.00");
    expect(safe.safeToSpend).toBe(safe.availableBalance);
  });

  it("ignores plans that fall outside the horizon", () => {
    const spillover = ledgerInput({
      plannedExpenses: [planned("2026-09-05", 400), planned("2026-10-05", 900)],
    });

    const safe = getSafeToSpend(spillover, "2026-09-01");
    expect(safe.horizonEnd).toBe("2026-09-30");
    expect(toDecimalString(safe.reservedForPlanned)).toBe("400.00");
  });

  it("no longer reserves a plan whose date has passed", () => {
    const past = ledgerInput({ plannedExpenses: [planned("2026-09-05", 400)] });
    expect(toDecimalString(getSafeToSpend(past, "2026-09-06").reservedForPlanned)).toBe("0.00");
    expect(toDecimalString(getSafeToSpend(past, "2026-09-05").reservedForPlanned)).toBe("400.00");
  });
});

describe("months with an explicit daily allowance", () => {
  it("honours the override instead of deriving from the budget", () => {
    const input = ledgerInput({ budgets: [budget("2026-09-01", 9000, 250)] });
    const day = getDailyBalance(input, "2026-09-01");
    expect(toDecimalString(day.dailyAllowance)).toBe("250.00");
  });

  it("surfaces the gap between the override and the monthly budget", () => {
    const input = ledgerInput({ budgets: [budget("2026-09-01", 9000, 250)] });
    const summary = getMonthlySummary(input, "2026-09-01", "2026-09-30");

    expect(toDecimalString(summary.allowanceTotal)).toBe("7500.00");
    expect(toDecimalString(summary.monthlyBudget)).toBe("9000.00");
    // 30 x 250 is 1,500 short of the stated budget; the difference is reported.
    expect(toDecimalString(summary.allowanceVariance)).toBe("-1500.00");
  });
});
