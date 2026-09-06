import {
  addDaysToKey,
  addMonthsToKey,
  compareDateKeys,
  dayIndexInMonth,
  daysInMonth as daysInMonthOf,
  eachDayOfMonth,
  lastDayOfMonth,
  toMonthKey,
} from "@/lib/utils/dates";

import {
  ZERO,
  add,
  allocate,
  allocationShare,
  atLeastZero,
  divideForDisplay,
  fromMinor,
  multiply,
  subtract,
  sum,
  type Money,
} from "./money";
import type {
  DailyBalance,
  DateKey,
  FinancePlannedExpense,
  FinanceSettings,
  FinanceTransaction,
  LedgerInput,
  MonthAllowance,
  MonthKey,
  MonthlyBudgetConfig,
} from "./types";

/**
 * The ledger is the single source of every balance in the application.
 *
 * Nothing here is persisted. A balance is always recomputed from budget
 * configuration plus transactions, which is what allows an edit to a
 * three-week-old expense to correctly move every later day's balance.
 *
 * The model is one continuous chain of days:
 *
 *   ending(day) = ending(previous day)
 *               + allowance(day)
 *               + income(day) + creditAdjustments(day)
 *               - expenses(day) - debitAdjustments(day)
 *
 * A month boundary is not a reset. It only changes the allowance rate, which is
 * why carry-forward — positive or negative — needs no special handling and can
 * never be double counted: there is only ever one running total.
 */

/** Signed money movements recorded on a single day. */
export interface DayMovements {
  readonly income: Money;
  readonly expenses: Money;
  readonly creditAdjustments: Money;
  readonly debitAdjustments: Money;
  readonly transactionCount: number;
}

/** Net effect of a day's transactions on the running balance. */
export function netMovement(movements: DayMovements): Money {
  return fromMinor(
    movements.income + movements.creditAdjustments - movements.expenses - movements.debitAdjustments,
  );
}

export function accumulateMovements(transactions: readonly FinanceTransaction[]): DayMovements {
  let income = 0;
  let expenses = 0;
  let creditAdjustments = 0;
  let debitAdjustments = 0;

  for (const transaction of transactions) {
    switch (transaction.type) {
      case "income":
        income += transaction.amount;
        break;
      case "expense":
        expenses += transaction.amount;
        break;
      case "adjustment":
        if (transaction.adjustmentDirection === "debit") {
          debitAdjustments += transaction.amount;
        } else {
          creditAdjustments += transaction.amount;
        }
        break;
    }
  }

  return {
    income: fromMinor(income),
    expenses: fromMinor(expenses),
    creditAdjustments: fromMinor(creditAdjustments),
    debitAdjustments: fromMinor(debitAdjustments),
    transactionCount: transactions.length,
  };
}

/**
 * Resolve how much allowance a month generates.
 *
 * Precedence: the month's own `daily_allowance`, then the global default, then
 * `monthlyBudget / daysInMonth`.
 *
 * When the allowance is derived, the remainder is spread across days so the
 * month accrues the budget exactly (₹9,000 over 31 days accrues ₹9,000, not
 * 31 × ₹290.32 = ₹8,999.92).
 *
 * When the allowance is an explicit override, it is honoured verbatim and any
 * gap against the monthly budget is surfaced as `variance` rather than hidden.
 */
export function resolveMonthAllowance(
  month: MonthKey,
  budget: MonthlyBudgetConfig | undefined,
  settings: FinanceSettings,
): MonthAllowance {
  const days = daysInMonthOf(month);
  const monthlyBudget = budget?.monthlyBudget ?? settings.defaultMonthlyBudget;
  const explicit = budget ? budget.dailyAllowance : settings.defaultDailyAllowance;

  if (explicit !== null && explicit !== undefined) {
    const allocatedTotal = multiply(explicit, days);
    return {
      month,
      monthlyBudget,
      daysInMonth: days,
      perDay: explicit,
      allocatedTotal,
      variance: subtract(allocatedTotal, monthlyBudget),
      isExplicitOverride: true,
    };
  }

  return {
    month,
    monthlyBudget,
    daysInMonth: days,
    perDay: divideForDisplay(monthlyBudget, days),
    allocatedTotal: monthlyBudget,
    variance: ZERO,
    isExplicitOverride: false,
  };
}

/** Allowance accrued on one specific day under `allowance`. */
export function allowanceForDay(allowance: MonthAllowance, date: DateKey): Money {
  if (allowance.isExplicitOverride) return allowance.perDay;
  return allocationShare(allowance.monthlyBudget, allowance.daysInMonth, dayIndexInMonth(date));
}

/** Allowance accrued from the first of the month through `date` inclusive. */
export function allowanceAccruedThrough(allowance: MonthAllowance, date: DateKey): Money {
  const dayCount = dayIndexInMonth(date) + 1;
  if (dayCount >= allowance.daysInMonth) return allowance.allocatedTotal;
  if (allowance.isExplicitOverride) return multiply(allowance.perDay, dayCount);
  return sum(allocate(allowance.monthlyBudget, allowance.daysInMonth).slice(0, dayCount));
}

export interface Ledger {
  readonly settings: FinanceSettings;
  /** First month the ledger simulates; earlier months hold no money. */
  readonly startMonth: MonthKey;
  readonly hasData: boolean;
  allowanceFor(month: MonthKey): MonthAllowance;
  budgetFor(month: MonthKey): Money;
  /** Balance carried into `month` — the previous month's closing balance. */
  openingBalance(month: MonthKey): Money;
  closingBalance(month: MonthKey): Money;
  dailyBalance(date: DateKey): DailyBalance;
  dailyBalancesForMonth(month: MonthKey): readonly DailyBalance[];
  /** Running balance at the end of `date`, for any date. */
  balanceAsOf(date: DateKey): Money;
  transactionsOn(date: DateKey): readonly FinanceTransaction[];
  transactionsInMonth(month: MonthKey): readonly FinanceTransaction[];
  plannedExpensesInRange(from: DateKey, to: DateKey): readonly FinancePlannedExpense[];
  readonly allTransactions: readonly FinanceTransaction[];
  readonly allPlannedExpenses: readonly FinancePlannedExpense[];
}

export function createLedger(input: LedgerInput): Ledger {
  const { settings } = input;
  const openingAtAnchor = input.openingBalance ?? ZERO;

  const budgetsByMonth = new Map<MonthKey, MonthlyBudgetConfig>();
  for (const budget of input.budgets) {
    budgetsByMonth.set(budget.monthStart, budget);
  }

  const transactions = [...input.transactions].sort(
    (a, b) => compareDateKeys(a.date, b.date) || a.id.localeCompare(b.id),
  );
  const plannedExpenses = [...(input.plannedExpenses ?? [])].sort(
    (a, b) => compareDateKeys(a.plannedDate, b.plannedDate) || a.id.localeCompare(b.id),
  );

  const transactionsByDate = new Map<DateKey, FinanceTransaction[]>();
  for (const transaction of transactions) {
    const bucket = transactionsByDate.get(transaction.date);
    if (bucket) bucket.push(transaction);
    else transactionsByDate.set(transaction.date, [transaction]);
  }

  const startMonth = input.anchorMonth ?? deriveAnchorMonth(input.budgets, transactions);
  const hasData = input.budgets.length > 0 || transactions.length > 0;

  const allowanceCache = new Map<MonthKey, MonthAllowance>();
  const closingCache = new Map<MonthKey, Money>();
  const dailyCache = new Map<MonthKey, readonly DailyBalance[]>();

  function allowanceFor(month: MonthKey): MonthAllowance {
    const cached = allowanceCache.get(month);
    if (cached) return cached;
    const resolved =
      month < startMonth
        ? emptyAllowance(month)
        : resolveMonthAllowance(month, budgetsByMonth.get(month), settings);
    allowanceCache.set(month, resolved);
    return resolved;
  }

  /**
   * Closing balance of a whole month.
   *
   * Order of transactions within a month cannot change the month's closing
   * total, so months before the one being viewed are folded with a single
   * aggregate step instead of a day-by-day walk.
   */
  function closingBalance(month: MonthKey): Money {
    const cached = closingCache.get(month);
    if (cached !== undefined) return cached;

    if (month < startMonth) {
      closingCache.set(month, ZERO);
      return ZERO;
    }

    // Walk forward from the anchor so a distant month cannot blow the stack.
    let cursor = startMonth;
    let balance = openingAtAnchor;
    while (true) {
      const known = closingCache.get(cursor);
      if (known !== undefined) {
        balance = known;
      } else {
        const allowance = allowanceFor(cursor);
        const movements = accumulateMovements(transactionsInMonth(cursor));
        balance = add(add(balance, allowance.allocatedTotal), netMovement(movements));
        closingCache.set(cursor, balance);
      }
      if (cursor === month) return balance;
      cursor = addMonthsToKey(cursor, 1);
    }
  }

  function openingBalance(month: MonthKey): Money {
    if (month <= startMonth) return month === startMonth ? openingAtAnchor : ZERO;
    return closingBalance(addMonthsToKey(month, -1));
  }

  function transactionsOn(date: DateKey): readonly FinanceTransaction[] {
    return transactionsByDate.get(date) ?? [];
  }

  function transactionsInMonth(month: MonthKey): readonly FinanceTransaction[] {
    const prefix = month.slice(0, 7);
    return transactions.filter((transaction) => transaction.date.slice(0, 7) === prefix);
  }

  function dailyBalancesForMonth(month: MonthKey): readonly DailyBalance[] {
    const cached = dailyCache.get(month);
    if (cached) return cached;

    const allowance = allowanceFor(month);
    let running = openingBalance(month);

    const balances = eachDayOfMonth(month).map((date) => {
      const movements = accumulateMovements(transactionsOn(date));
      const dailyAllowance = allowanceForDay(allowance, date);
      const startingBalance = running;
      const endingBalance = add(add(startingBalance, dailyAllowance), netMovement(movements));
      running = endingBalance;

      return {
        date,
        startingBalance,
        dailyAllowance,
        income: movements.income,
        expenses: movements.expenses,
        creditAdjustments: movements.creditAdjustments,
        debitAdjustments: movements.debitAdjustments,
        endingBalance,
        totalSpent: movements.expenses,
        transactionCount: movements.transactionCount,
      } satisfies DailyBalance;
    });

    dailyCache.set(month, balances);
    return balances;
  }

  function dailyBalance(date: DateKey): DailyBalance {
    const month = toMonthKey(date);
    const balances = dailyBalancesForMonth(month);
    const found = balances[dayIndexInMonth(date)];
    if (!found) {
      throw new Error(`No balance computed for ${date}.`);
    }
    return found;
  }

  return {
    settings,
    startMonth,
    hasData,
    allowanceFor,
    budgetFor: (month) => allowanceFor(month).monthlyBudget,
    openingBalance,
    closingBalance,
    dailyBalance,
    dailyBalancesForMonth,
    balanceAsOf: (date) => dailyBalance(date).endingBalance,
    transactionsOn,
    transactionsInMonth,
    plannedExpensesInRange: (from, to) =>
      plannedExpenses.filter((planned) => planned.plannedDate >= from && planned.plannedDate <= to),
    allTransactions: transactions,
    allPlannedExpenses: plannedExpenses,
  };
}

function emptyAllowance(month: MonthKey): MonthAllowance {
  return {
    month,
    monthlyBudget: ZERO,
    daysInMonth: daysInMonthOf(month),
    perDay: ZERO,
    allocatedTotal: ZERO,
    variance: ZERO,
    isExplicitOverride: false,
  };
}

function deriveAnchorMonth(
  budgets: readonly MonthlyBudgetConfig[],
  transactions: readonly FinanceTransaction[],
): MonthKey {
  let earliest: MonthKey | null = null;
  for (const budget of budgets) {
    if (earliest === null || budget.monthStart < earliest) earliest = budget.monthStart;
  }
  for (const transaction of transactions) {
    const month = toMonthKey(transaction.date);
    if (earliest === null || month < earliest) earliest = month;
  }
  return earliest ?? toMonthKey(new Date().toISOString().slice(0, 10) as DateKey);
}

/** Total expenses recorded between two dates, inclusive. */
export function totalExpensesBetween(
  transactions: readonly FinanceTransaction[],
  from: DateKey,
  to: DateKey,
): Money {
  return sum(
    transactions
      .filter((t) => t.type === "expense" && t.date >= from && t.date <= to)
      .map((t) => t.amount),
  );
}

/** Money still unspent, floored at zero. Used for surplus-style figures. */
export function surplusOf(balance: Money): Money {
  return atLeastZero(balance);
}

/** Inclusive list of days between two dates. */
export function daysBetweenInclusive(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }
  return days;
}

export { lastDayOfMonth };
