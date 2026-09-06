import { describe, expect, it } from "vitest";

import { createLedger } from "./calculations";
import {
  computeOpeningBalance,
  getCarryForward,
  getCarryForwardHistory,
  getExtraMoney,
  getFunFund,
} from "./carry-forward";
import { getDailyBalance } from "./daily-balance";
import { getMonthlySummary } from "./monthly-balance";
import { toDecimalString } from "./money";
import { TEST_SETTINGS, adjustment, budget, expense, income, ledgerInput, rupees } from "./test-support";

const SEPTEMBER = "2026-09-01";
const OCTOBER = "2026-10-01";

/** September accrues ₹9,000; spending ₹8,200 leaves it closing at ₹800. */
const surplusMonth = ledgerInput({
  budgets: [budget(SEPTEMBER), budget(OCTOBER)],
  transactions: [expense("2026-09-10", 8200)],
});

/** Spending ₹9,350 leaves September closing at −₹350. */
const deficitMonth = ledgerInput({
  budgets: [budget(SEPTEMBER), budget(OCTOBER)],
  transactions: [expense("2026-09-10", 9350)],
});

describe("Test 5: a positive month end carries forward", () => {
  it("closes September at ₹800", () => {
    const september = getMonthlySummary(surplusMonth, SEPTEMBER, "2026-09-30");
    expect(toDecimalString(september.projectedEndBalance)).toBe("800.00");
  });

  it("opens October with the ₹800 as carry-forward", () => {
    expect(toDecimalString(getCarryForward(surplusMonth, OCTOBER))).toBe("800.00");
    expect(toDecimalString(getExtraMoney(surplusMonth, OCTOBER))).toBe("800.00");
  });

  it("gives October ₹9,000 of budget on top of the ₹800", () => {
    const october = getMonthlySummary(surplusMonth, OCTOBER, "2026-10-01");
    expect(toDecimalString(october.monthlyBudget)).toBe("9000.00");
    expect(toDecimalString(october.carryForward)).toBe("800.00");
    expect(toDecimalString(october.projectedEndBalance)).toBe("9800.00");
  });

  it("does not create a transaction for the carried amount", () => {
    const ledger = createLedger(surplusMonth);
    expect(ledger.transactionsInMonth(OCTOBER)).toHaveLength(0);

    // The ₹800 shows up exactly once: inside October 1st's starting balance.
    const octoberFirst = getDailyBalance(surplusMonth, "2026-10-01");
    expect(toDecimalString(octoberFirst.startingBalance)).toBe("800.00");
    expect(toDecimalString(octoberFirst.income)).toBe("0.00");
    expect(toDecimalString(octoberFirst.creditAdjustments)).toBe("0.00");
  });
});

describe("Test 6: a negative month end carries forward as a debt", () => {
  it("closes September at −₹350", () => {
    const september = getMonthlySummary(deficitMonth, SEPTEMBER, "2026-09-30");
    expect(toDecimalString(september.projectedEndBalance)).toBe("-350.00");
  });

  it("opens October at −₹350 rather than at zero", () => {
    expect(toDecimalString(getCarryForward(deficitMonth, OCTOBER))).toBe("-350.00");
    expect(toDecimalString(getDailyBalance(deficitMonth, "2026-10-01").startingBalance)).toBe(
      "-350.00",
    );
  });

  it("never turns a deficit into Extra Money", () => {
    expect(toDecimalString(getExtraMoney(deficitMonth, OCTOBER))).toBe("0.00");
    expect(toDecimalString(getFunFund(deficitMonth, "2026-10-15"))).toBe("0.00");
  });

  it("recovers the deficit out of October's allowance", () => {
    // 9,000 / 31 = 290.32 a day; the first two days clear the ₹350.
    expect(toDecimalString(getDailyBalance(deficitMonth, "2026-10-01").endingBalance)).toBe(
      "-59.68",
    );
    expect(toDecimalString(getDailyBalance(deficitMonth, "2026-10-02").endingBalance)).toBe(
      "230.64",
    );
  });
});

describe("Extra Money and the Fun Fund", () => {
  it("treats the Fun Fund as a view of carry-forward, not a second wallet", () => {
    const funFund = getFunFund(surplusMonth, "2026-10-15");
    const carried = getCarryForward(surplusMonth, OCTOBER);
    expect(funFund).toBe(carried);

    // The surplus is already inside the running balance, so it must not be
    // added on top of the month's own availability.
    const october = getMonthlySummary(surplusMonth, OCTOBER, "2026-10-31");
    expect(toDecimalString(october.projectedEndBalance)).toBe("9800.00");
  });

  it("reports history as a chain of closing balances rather than a sum", () => {
    const history = getCarryForwardHistory(surplusMonth, OCTOBER);
    expect(history.map((record) => record.month)).toEqual([SEPTEMBER, OCTOBER]);
    expect(toDecimalString(history[0].closingBalance)).toBe("800.00");
    // October's closing balance already contains September's ₹800.
    expect(toDecimalString(history[1].closingBalance)).toBe("9800.00");
  });

  it("distinguishes carried-in Extra Money from the current balance", () => {
    const october = getMonthlySummary(surplusMonth, OCTOBER, "2026-10-02");
    expect(toDecimalString(october.extraMoney)).toBe("800.00");
    // Two days of October allowance on top of the carried ₹800.
    expect(toDecimalString(october.currentBalance)).toBe("1380.64");
  });
});

describe("multi-month chains", () => {
  it("threads a surplus through several months without re-adding it", () => {
    const input = ledgerInput({
      budgets: [budget(SEPTEMBER), budget(OCTOBER), budget("2026-11-01")],
      transactions: [expense("2026-09-10", 8200), expense("2026-10-10", 9000)],
    });

    expect(toDecimalString(getCarryForward(input, OCTOBER))).toBe("800.00");
    expect(toDecimalString(getCarryForward(input, "2026-11-01"))).toBe("800.00");
  });

  it("derives the same opening balance from month totals as from the raw rows", () => {
    const transactions = [
      expense("2026-09-03", 1200),
      expense("2026-09-18", 400),
      income("2026-10-02", 2500),
      expense("2026-10-11", 9600),
      adjustment("2026-11-04", 150, "debit"),
      expense("2026-11-20", 300),
    ];

    const budgets = [budget(SEPTEMBER), budget(OCTOBER), budget("2026-11-01")];
    const full = createLedger(ledgerInput({ budgets, transactions }));

    // What the data layer actually sends: one aggregate row per month.
    const totals = ["2026-09", "2026-10", "2026-11"].map((prefix) => {
      const rows = transactions.filter((t) => t.date.startsWith(prefix));
      const totalOf = (predicate: (t: (typeof rows)[number]) => boolean) =>
        rupees(
          rows
            .filter(predicate)
            .reduce((sum, t) => sum + t.amount, 0) / 100,
        );

      return {
        monthStart: `${prefix}-01`,
        income: totalOf((t) => t.type === "income"),
        expenses: totalOf((t) => t.type === "expense"),
        creditAdjustments: totalOf(
          (t) => t.type === "adjustment" && t.adjustmentDirection === "credit",
        ),
        debitAdjustments: totalOf(
          (t) => t.type === "adjustment" && t.adjustmentDirection === "debit",
        ),
      };
    });

    for (const month of [OCTOBER, "2026-11-01", "2026-12-01"]) {
      expect(computeOpeningBalance(TEST_SETTINGS, budgets, totals, SEPTEMBER, month)).toBe(
        full.openingBalance(month),
      );
    }
  });

  it("matches a pre-aggregated opening balance to a full replay of history", () => {
    const full = ledgerInput({
      budgets: [budget(SEPTEMBER), budget(OCTOBER)],
      transactions: [expense("2026-09-10", 8200), expense("2026-10-05", 400)],
    });

    // The data layer may replace September entirely with its closing balance.
    const aggregated = ledgerInput({
      budgets: [budget(OCTOBER)],
      transactions: [expense("2026-10-05", 400)],
      anchorMonth: OCTOBER,
      openingBalance: createLedger(full).closingBalance(SEPTEMBER),
    });

    const fullOctober = getMonthlySummary(full, OCTOBER, "2026-10-31");
    const aggregatedOctober = getMonthlySummary(aggregated, OCTOBER, "2026-10-31");
    expect(aggregatedOctober).toEqual(fullOctober);
  });
});
