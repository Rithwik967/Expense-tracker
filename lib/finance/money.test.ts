import { describe, expect, it } from "vitest";

import {
  add,
  allocate,
  allocationShare,
  divideForDisplay,
  fromMinor,
  parseMoney,
  percentageOf,
  subtract,
  sum,
  toDecimalString,
  toMajorNumber,
} from "./money";

describe("parseMoney", () => {
  it("parses the decimal strings Postgres returns for NUMERIC columns", () => {
    expect(parseMoney("9000.00")).toBe(900_000);
    expect(parseMoney("290.32")).toBe(29_032);
    expect(parseMoney("0.01")).toBe(1);
    expect(parseMoney("-350.50")).toBe(-35_050);
  });

  it("accepts shorthand and signed forms", () => {
    expect(parseMoney("300")).toBe(30_000);
    expect(parseMoney(".5")).toBe(50);
    expect(parseMoney("+12.3")).toBe(1_230);
  });

  it("rounds a third decimal place half away from zero", () => {
    expect(parseMoney("290.325")).toBe(29_033);
    expect(parseMoney("290.324")).toBe(29_032);
    expect(parseMoney("-290.325")).toBe(-29_033);
  });

  it("rejects values that are not amounts", () => {
    expect(() => parseMoney("")).toThrow();
    expect(() => parseMoney("abc")).toThrow();
    expect(() => parseMoney("1,000")).toThrow();
    expect(() => parseMoney(Number.NaN)).toThrow();
  });
});

describe("decimal safety", () => {
  it("adds amounts that would drift as floating point numbers", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point.
    const result = add(parseMoney("0.10"), parseMoney("0.20"));
    expect(toDecimalString(result)).toBe("0.30");
    expect(result).toBe(parseMoney("0.30"));
  });

  it("keeps a long chain of thirds exact", () => {
    const third = parseMoney("0.33");
    const total = sum(Array.from({ length: 300 }, () => third));
    expect(toDecimalString(total)).toBe("99.00");
  });

  it("round-trips through the database string representation", () => {
    for (const value of ["0.00", "1.05", "-1.05", "9000.00", "290.32"]) {
      expect(toDecimalString(parseMoney(value))).toBe(value);
    }
  });
});

describe("allocate", () => {
  it("splits a budget that divides evenly", () => {
    const shares = allocate(parseMoney("9000"), 30);
    expect(shares).toHaveLength(30);
    expect(new Set(shares)).toEqual(new Set([parseMoney("300")]));
    expect(sum(shares)).toBe(parseMoney("9000"));
  });

  it("spreads the remainder so no money disappears in a 31 day month", () => {
    const total = parseMoney("9000");
    const shares = allocate(total, 31);

    // A naive round-per-day would accrue 31 x 290.32 = 8,999.92 and lose 8 paise.
    expect(sum(shares)).toBe(total);
    expect(Math.min(...shares)).toBe(parseMoney("290.32"));
    expect(Math.max(...shares)).toBe(parseMoney("290.33"));
  });

  it("agrees with allocationShare for every index", () => {
    const total = parseMoney("9000");
    const shares = allocate(total, 28);
    shares.forEach((share, index) => {
      expect(allocationShare(total, 28, index)).toBe(share);
    });
  });

  it("rejects nonsensical splits", () => {
    expect(() => allocate(parseMoney("100"), 0)).toThrow();
    expect(() => allocate(parseMoney("100"), 1.5)).toThrow();
  });
});

describe("display helpers", () => {
  it("rounds the headline per-day allowance half up", () => {
    expect(divideForDisplay(parseMoney("9000"), 31)).toBe(parseMoney("290.32"));
    expect(divideForDisplay(parseMoney("9000"), 28)).toBe(parseMoney("321.43"));
    expect(divideForDisplay(parseMoney("9000"), 30)).toBe(parseMoney("300"));
  });

  it("converts to major units only at the presentation boundary", () => {
    expect(toMajorNumber(parseMoney("290.32"))).toBeCloseTo(290.32, 10);
  });

  it("computes percentages against a zero total without dividing by zero", () => {
    expect(percentageOf(parseMoney("10"), fromMinor(0))).toBe(0);
    expect(percentageOf(parseMoney("25"), parseMoney("100"))).toBe(25);
  });

  it("subtracts into negative territory exactly", () => {
    expect(subtract(parseMoney("650"), parseMoney("1000"))).toBe(parseMoney("-350"));
  });
});
