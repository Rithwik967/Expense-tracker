import type {
  CategoryRecord,
  PlannedExpenseRecord,
  TransactionRecord,
} from "@/lib/data/types";
import type { Money } from "@/lib/finance/money";
import type { MonthProjection } from "@/lib/finance/projections";
import type {
  CarryForwardRecord,
  CategoryTotal,
  DailyBalance,
  DateKey,
  MonthKey,
  MonthlySummary,
  SafeToSpend,
  WeeklyBreakdown,
} from "@/lib/finance/types";

/**
 * View models exchanged between the server and the screens.
 *
 * Every figure here is produced by lib/finance on the server. Components render
 * these values; they never recompute them. That is what keeps Home, Calendar,
 * Insights and the transaction list from ever disagreeing about a total.
 */

export interface AppSettingsView {
  readonly currency: string;
  readonly defaultMonthlyBudget: Money;
  readonly defaultDailyAllowance: Money | null;
  readonly monthStartDay: number;
}

export interface BootstrapView {
  readonly settings: AppSettingsView;
  readonly categories: readonly CategoryRecord[];
  /** Which persistence backend answered, so the UI can flag the dev fallback. */
  readonly backend: "supabase" | "local";
  /** Earliest month with a budget or a transaction; `null` before any data. */
  readonly startMonth: MonthKey | null;
}

export interface DayView {
  readonly balance: DailyBalance;
  readonly transactions: readonly TransactionRecord[];
  readonly plannedExpenses: readonly PlannedExpenseRecord[];
}

export interface MonthView {
  readonly month: MonthKey;
  readonly today: DateKey;
  /** True when `today` falls inside `month`. */
  readonly isCurrentMonth: boolean;
  readonly summary: MonthlySummary;
  readonly days: readonly DailyBalance[];
  readonly weeks: readonly WeeklyBreakdown[];
  readonly categoryTotals: readonly CategoryTotal[];
  readonly projection: MonthProjection;
  readonly transactions: readonly TransactionRecord[];
  readonly plannedExpenses: readonly PlannedExpenseRecord[];
  /** Populated only for the current month, where "today" is meaningful. */
  readonly todayBalance: DailyBalance | null;
  readonly startOfDayAvailable: Money | null;
  readonly safeToSpend: SafeToSpend | null;
  /**
   * Accumulated surplus carried in from earlier months. A presentation of
   * carry-forward, already contained in the balance — never added to it.
   */
  readonly funFund: Money;
  readonly averageDailySpend: Money;
  readonly highestSpendingDay: { date: DateKey; amount: Money } | null;
  readonly largestCategory: CategoryTotal | null;
  readonly carryForwardHistory: readonly CarryForwardRecord[];
}

export interface TransactionListView {
  readonly transactions: readonly TransactionRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}
