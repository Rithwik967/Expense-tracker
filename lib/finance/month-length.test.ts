import { describe, expect, it } from "vitest";

import { createLedger } from "./calculations";
import { getDailyBalance } from "./daily-balance";
import { getMonthlySummary, getWeeklyBreakdown } from "./monthly-balance";
import { sum, toDecimalString } from "./money";
import { budget, ledgerInput } from "./test-support";

const summaryFor = (month: string) =>
  getMonthlySummary(ledgerInput({ budgets: [budget(month)] }), month, month);

const allowancesFor = (month: string) =>
  createLedger(ledgerInput({ budgets: [budget(month)] }))
    .dailyBalancesForMonth(month)
    .map((day) => day.dailyAllowance);

describe("Test 13: a 31 day month", () => {
  it("derives ₹290.32 a day from a ₹9,000 October budget", () => {
    const october = summaryFor("2026-10-01");
    expect(october.daysInMonth).toBe(31);
    expect(toDecimalString(october.dailyAllowance)).toBe("290.32");
  });

  it("still accrues exactly ₹9,000 over the month", () => {
    const allowances = allowancesFor("2026-10-01");
    expect(allowances).toHaveLength(31);
    expect(toDecimalString(sum(allowances))).toBe("9000.00");
    expect(toDecimalString(summaryFor("2026-10-01").allowanceTotal)).toBe("9000.00");
  });

  it("closes an untouched October at the full budget", () => {
    const input = ledgerInput({ budgets: [budget("2026-10-01")] });
    expect(toDecimalString(getDailyBalance(input, "2026-10-31").endingBalance)).toBe("9000.00");
  });
});

describe("Test 14: February", () => {
  it("derives ₹321.43 a day in a 28 day February", () => {
    const february = summaryFor("2027-02-01");
    expect(february.daysInMonth).toBe(28);
    expect(toDecimalString(february.dailyAllowance)).toBe("321.43");
    expect(toDecimalString(sum(allowancesFor("2027-02-01")))).toBe("9000.00");
  });

  it("uses 29 days in a leap February", () => {
    const february = summaryFor("2028-02-01");
    expect(february.daysInMonth).toBe(29);
    expect(toDecimalString(february.dailyAllowance)).toBe("310.34");
    expect(toDecimalString(sum(allowancesFor("2028-02-01")))).toBe("9000.00");
  });

  it("treats 2100 as a common year, not a leap year", () => {
    expect(summaryFor("2100-02-01").daysInMonth).toBe(28);
  });
});

describe("month lengths across a full year", () => {
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0");
    return `2026-${month}-01`;
  });

  it("accrues exactly the monthly budget in every month", () => {
    for (const month of months) {
      expect(toDecimalString(sum(allowancesFor(month)))).toBe("9000.00");
    }
  });

  it("reports the expected number of days in each month", () => {
    expect(months.map((month) => summaryFor(month).daysInMonth)).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
  });
});

describe("weekly breakdown", () => {
  it("splits the month into whole weeks plus a short final chunk", () => {
    const input = ledgerInput({ budgets: [budget("2026-10-01")] });
    const weeks = getWeeklyBreakdown(input, "2026-10-01");

    expect(weeks.map((week) => week.days)).toEqual([7, 7, 7, 7, 3]);
    expect(weeks[0].start).toBe("2026-10-01");
    expect(weeks[4].end).toBe("2026-10-31");
  });

  it("adds the weekly allowances back up to the monthly total", () => {
    const input = ledgerInput({ budgets: [budget("2026-10-01")] });
    const weeks = getWeeklyBreakdown(input, "2026-10-01");
    expect(toDecimalString(sum(weeks.map((week) => week.allowanceGenerated)))).toBe("9000.00");
  });
});
