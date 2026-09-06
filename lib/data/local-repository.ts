import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseMoney, toDecimalString, type Money } from "@/lib/finance/money";
import type { MonthKey } from "@/lib/finance/types";
import { toMonthKey } from "@/lib/utils/dates";

import { DataError } from "./errors";
import type {
  AppSettingsRecord,
  BackupPayload,
  CategoryRecord,
  CategoryWriteInput,
  DataRepository,
  MonthlyBudgetRecord,
  MonthlyBudgetWriteInput,
  MonthlyTotalsRecord,
  PlannedExpenseFilter,
  PlannedExpenseRecord,
  PlannedExpenseWriteInput,
  SettingsWriteInput,
  TransactionFilter,
  TransactionRecord,
  TransactionWriteInput,
} from "./types";

/**
 * On-disk development store.
 *
 * Used only when no Supabase project is configured, so the app can be run and
 * explored before credentials exist. It mirrors the Supabase repository's
 * behaviour, including its constraints, and it starts from the same seed as
 * `supabase/seed.sql`: categories and a September 2026 budget, and no
 * transactions. There is no invented spending anywhere in this file.
 *
 * Not intended for production. Writes are serialised through a promise chain
 * and committed with an atomic rename, which is enough for one person on one
 * machine but is not a substitute for a real database.
 */

const STORE_DIRECTORY = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(STORE_DIRECTORY, "store.json");
const STORE_VERSION = 1;

/** Amounts are held as decimal strings on disk so the file stays exact and readable. */
interface StoredSettings {
  id: string;
  currency: string;
  default_monthly_budget: string;
  default_daily_allowance: string | null;
  month_start_day: number;
  created_at: string;
  updated_at: string;
}

interface StoredCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface StoredBudget {
  id: string;
  month_start: string;
  monthly_budget: string;
  daily_allowance: string | null;
  created_at: string;
  updated_at: string;
}

interface StoredTransaction {
  id: string;
  transaction_date: string;
  type: string;
  amount: string;
  adjustment_direction: string | null;
  category_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface StoredPlannedExpense {
  id: string;
  planned_date: string;
  amount: string;
  category_id: string | null;
  description: string | null;
  status: string;
  converted_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

interface StoreShape {
  version: number;
  settings: StoredSettings;
  categories: StoredCategory[];
  monthly_budgets: StoredBudget[];
  transactions: StoredTransaction[];
  planned_expenses: StoredPlannedExpense[];
}

/** Mirrors supabase/seed.sql exactly. Configuration only, never spending. */
const SEED_CATEGORIES: ReadonlyArray<[name: string, icon: string, description: string]> = [
  ["Chicken", "drumstick", "Butcher and poultry runs"],
  ["Groceries", "shopping-cart", "Kitchen and household supplies"],
  ["Lunch", "sandwich", "Midday meals away from home"],
  ["Food & Drinks", "utensils", "Eating out, cafes and deliveries"],
  ["Entertainment", "clapperboard", "Films, games and going out"],
  ["Shopping", "shopping-bag", "Clothes, gadgets and general retail"],
  ["Travel", "bus-front", "Fares, fuel and trips"],
  ["Gym", "dumbbell", "Fitness and sport"],
  ["Personal", "user-round", "Grooming, health and personal care"],
  ["Other", "circle-ellipsis", "Anything that fits nowhere else"],
];

const SEED_BUDGET_MONTH = "2026-09-01";
const SEED_MONTHLY_BUDGET = "9000.00";

function createSeedStore(): StoreShape {
  const now = new Date().toISOString();
  return {
    version: STORE_VERSION,
    settings: {
      id: randomUUID(),
      currency: "INR",
      default_monthly_budget: SEED_MONTHLY_BUDGET,
      default_daily_allowance: null,
      month_start_day: 1,
      created_at: now,
      updated_at: now,
    },
    categories: SEED_CATEGORIES.map(([name, icon, description], index) => ({
      id: randomUUID(),
      name,
      icon,
      description,
      is_active: true,
      sort_order: (index + 1) * 10,
      created_at: now,
      updated_at: now,
    })),
    monthly_budgets: [
      {
        id: randomUUID(),
        month_start: SEED_BUDGET_MONTH,
        monthly_budget: SEED_MONTHLY_BUDGET,
        // Null on purpose: the allowance is derived as 9000 / 30 = 300.
        daily_allowance: null,
        created_at: now,
        updated_at: now,
      },
    ],
    transactions: [],
    planned_expenses: [],
  };
}

let cache: StoreShape | null = null;
/** Serialises writes so two concurrent requests cannot clobber the file. */
let writeChain: Promise<unknown> = Promise.resolve();

/**
 * In-flight first read.
 *
 * The first request to arrive typically asks for several things at once, and
 * without this every one of them would seed and write the file concurrently.
 */
let loadInFlight: Promise<StoreShape> | null = null;

async function loadStore(): Promise<StoreShape> {
  if (cache) return cache;

  if (!loadInFlight) {
    loadInFlight = readOrSeedStore().finally(() => {
      loadInFlight = null;
    });
  }

  return loadInFlight;
}

async function readOrSeedStore(): Promise<StoreShape> {
  try {
    const contents = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(contents) as StoreShape;
    if (parsed.version !== STORE_VERSION) {
      throw DataError.unavailable(
        `The local development store at ${STORE_PATH} was written by a different version. Delete it to start again.`,
      );
    }
    cache = parsed;
  } catch (error) {
    if (error instanceof DataError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw DataError.unavailable(`Could not read the local development store at ${STORE_PATH}.`, error);
    }
    cache = createSeedStore();
    await persist(cache);
  }

  return cache;
}

async function persist(store: StoreShape): Promise<void> {
  await mkdir(STORE_DIRECTORY, { recursive: true });
  // Write then rename so a crash mid-write cannot leave a truncated file. The
  // name is unique per write: two writes sharing one would have the first
  // rename pull the file out from under the second.
  const temporary = `${STORE_PATH}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporary, STORE_PATH);
}

async function mutate<T>(operation: (store: StoreShape) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const store = await loadStore();
    const result = await operation(store);
    store.version = STORE_VERSION;
    await persist(store);
    cache = store;
    return result;
  };

  const queued = writeChain.then(run, run);
  // Keep the chain alive even when this operation rejects.
  writeChain = queued.catch(() => undefined);
  return queued;
}

const money = (value: string): Money => parseMoney(value);
const optionalMoney = (value: string | null): Money | null =>
  value === null ? null : parseMoney(value);
const column = (value: Money): string => toDecimalString(value);
const optionalColumn = (value: Money | null): string | null =>
  value === null ? null : toDecimalString(value);

const toSettings = (row: StoredSettings): AppSettingsRecord => ({
  id: row.id,
  currency: row.currency,
  defaultMonthlyBudget: money(row.default_monthly_budget),
  defaultDailyAllowance: optionalMoney(row.default_daily_allowance),
  monthStartDay: row.month_start_day,
  updatedAt: row.updated_at,
});

const toCategoryRecord = (row: StoredCategory): CategoryRecord => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  description: row.description,
  isActive: row.is_active,
  sortOrder: row.sort_order,
});

const toBudgetRecord = (row: StoredBudget): MonthlyBudgetRecord => ({
  id: row.id,
  monthStart: row.month_start as MonthKey,
  monthlyBudget: money(row.monthly_budget),
  dailyAllowance: optionalMoney(row.daily_allowance),
});

const toTransactionRecord = (row: StoredTransaction): TransactionRecord => ({
  id: row.id,
  date: row.transaction_date,
  type: row.type as TransactionRecord["type"],
  amount: money(row.amount),
  adjustmentDirection: row.adjustment_direction as TransactionRecord["adjustmentDirection"],
  categoryId: row.category_id,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPlannedRecord = (row: StoredPlannedExpense): PlannedExpenseRecord => ({
  id: row.id,
  plannedDate: row.planned_date,
  amount: money(row.amount),
  categoryId: row.category_id,
  description: row.description,
  status: row.status as PlannedExpenseRecord["status"],
  convertedTransactionId: row.converted_transaction_id,
  createdAt: row.created_at,
});

/** The database's CHECK constraints, restated so both backends behave alike. */
function assertTransactionIsValid(input: TransactionWriteInput, store: StoreShape): void {
  if (input.amount <= 0) throw DataError.validation("The amount must be greater than zero.");
  if (input.type === "expense" && !input.categoryId) {
    throw DataError.validation("Expenses need a category.");
  }
  if (input.type === "adjustment" && input.adjustmentDirection === null) {
    throw DataError.validation("An adjustment must be either a credit or a debit.");
  }
  if (input.type !== "adjustment" && input.adjustmentDirection !== null) {
    throw DataError.validation("Only adjustments have a direction.");
  }
  if (input.categoryId && !store.categories.some((c) => c.id === input.categoryId)) {
    throw DataError.validation("That category does not exist.");
  }
}

function matchesTransactionFilter(row: StoredTransaction, filter: TransactionFilter): boolean {
  if (filter.from && row.transaction_date < filter.from) return false;
  if (filter.to && row.transaction_date > filter.to) return false;
  if (filter.types?.length && !filter.types.includes(row.type as TransactionRecord["type"])) {
    return false;
  }
  if (filter.categoryIds?.length && (!row.category_id || !filter.categoryIds.includes(row.category_id))) {
    return false;
  }
  if (filter.search?.trim()) {
    const term = filter.search.trim().toLowerCase();
    if (!(row.description ?? "").toLowerCase().includes(term)) return false;
  }
  return true;
}

function sortTransactions(rows: StoredTransaction[], sort: TransactionFilter["sort"]): StoredTransaction[] {
  const compare = (a: StoredTransaction, b: StoredTransaction): number => {
    switch (sort) {
      case "amount-desc":
        return money(b.amount) - money(a.amount);
      case "amount-asc":
        return money(a.amount) - money(b.amount);
      case "date-asc":
        return (
          a.transaction_date.localeCompare(b.transaction_date) ||
          a.created_at.localeCompare(b.created_at)
        );
      default:
        return (
          b.transaction_date.localeCompare(a.transaction_date) ||
          b.created_at.localeCompare(a.created_at)
        );
    }
  };
  return [...rows].sort(compare);
}

export function createLocalRepository(): DataRepository {
  async function listTransactions(filter: TransactionFilter = {}): Promise<TransactionRecord[]> {
    const store = await loadStore();
    const matching = sortTransactions(
      store.transactions.filter((row) => matchesTransactionFilter(row, filter)),
      filter.sort,
    );

    const offset = filter.offset ?? 0;
    const limited =
      filter.limit === undefined ? matching.slice(offset) : matching.slice(offset, offset + filter.limit);

    return limited.map(toTransactionRecord);
  }

  async function listCategories(): Promise<CategoryRecord[]> {
    const store = await loadStore();
    return [...store.categories]
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .map(toCategoryRecord);
  }

  async function listMonthlyBudgets(): Promise<MonthlyBudgetRecord[]> {
    const store = await loadStore();
    return [...store.monthly_budgets]
      .sort((a, b) => a.month_start.localeCompare(b.month_start))
      .map(toBudgetRecord);
  }

  async function listPlannedExpenses(
    filter: PlannedExpenseFilter = {},
  ): Promise<PlannedExpenseRecord[]> {
    const store = await loadStore();
    return store.planned_expenses
      .filter((row) => {
        if (filter.from && row.planned_date < filter.from) return false;
        if (filter.to && row.planned_date > filter.to) return false;
        if (
          filter.statuses?.length &&
          !filter.statuses.includes(row.status as PlannedExpenseRecord["status"])
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          a.planned_date.localeCompare(b.planned_date) || a.created_at.localeCompare(b.created_at),
      )
      .map(toPlannedRecord);
  }

  async function getSettings(): Promise<AppSettingsRecord> {
    const store = await loadStore();
    return toSettings(store.settings);
  }

  return {
    backend: "local",

    getSettings,
    listCategories,
    listMonthlyBudgets,
    listTransactions,
    listPlannedExpenses,

    updateSettings: (patch: SettingsWriteInput) =>
      mutate((store) => {
        if (patch.currency !== undefined) {
          if (patch.currency.trim() === "") throw DataError.validation("A currency is required.");
          store.settings.currency = patch.currency;
        }
        if (patch.defaultMonthlyBudget !== undefined) {
          if (patch.defaultMonthlyBudget < 0) {
            throw DataError.validation("A monthly budget cannot be negative.");
          }
          store.settings.default_monthly_budget = column(patch.defaultMonthlyBudget);
        }
        if (patch.defaultDailyAllowance !== undefined) {
          if (patch.defaultDailyAllowance !== null && patch.defaultDailyAllowance < 0) {
            throw DataError.validation("A daily allowance cannot be negative.");
          }
          store.settings.default_daily_allowance = optionalColumn(patch.defaultDailyAllowance);
        }
        if (patch.monthStartDay !== undefined) {
          if (patch.monthStartDay < 1 || patch.monthStartDay > 28) {
            throw DataError.validation("The month start day must be between 1 and 28.");
          }
          store.settings.month_start_day = patch.monthStartDay;
        }
        store.settings.updated_at = new Date().toISOString();
        return toSettings(store.settings);
      }),

    createCategory: (input: CategoryWriteInput) =>
      mutate((store) => {
        const normalised = input.name.trim().toLowerCase();
        if (normalised === "") throw DataError.validation("A category needs a name.");
        if (store.categories.some((c) => c.name.trim().toLowerCase() === normalised)) {
          throw DataError.conflict("A category with that name already exists.");
        }

        const now = new Date().toISOString();
        const row: StoredCategory = {
          id: randomUUID(),
          name: input.name.trim(),
          icon: input.icon,
          description: input.description,
          is_active: input.isActive,
          sort_order: input.sortOrder,
          created_at: now,
          updated_at: now,
        };
        store.categories.push(row);
        return toCategoryRecord(row);
      }),

    updateCategory: (id: string, patch: Partial<CategoryWriteInput>) =>
      mutate((store) => {
        const row = store.categories.find((c) => c.id === id);
        if (!row) throw DataError.notFound("That category");

        if (patch.name !== undefined) {
          const normalised = patch.name.trim().toLowerCase();
          if (normalised === "") throw DataError.validation("A category needs a name.");
          if (
            store.categories.some((c) => c.id !== id && c.name.trim().toLowerCase() === normalised)
          ) {
            throw DataError.conflict("A category with that name already exists.");
          }
          row.name = patch.name.trim();
        }
        if (patch.icon !== undefined) row.icon = patch.icon;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.isActive !== undefined) row.is_active = patch.isActive;
        if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
        row.updated_at = new Date().toISOString();
        return toCategoryRecord(row);
      }),

    reorderCategories: (orderedIds: readonly string[]) =>
      mutate((store) => {
        orderedIds.forEach((id, index) => {
          const row = store.categories.find((c) => c.id === id);
          if (row) {
            row.sort_order = (index + 1) * 10;
            row.updated_at = new Date().toISOString();
          }
        });
        return [...store.categories]
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
          .map(toCategoryRecord);
      }),

    upsertMonthlyBudget: (input: MonthlyBudgetWriteInput) =>
      mutate((store) => {
        if (input.monthlyBudget < 0) throw DataError.validation("A monthly budget cannot be negative.");
        if (input.dailyAllowance !== null && input.dailyAllowance < 0) {
          throw DataError.validation("A daily allowance cannot be negative.");
        }
        if (!input.monthStart.endsWith("-01")) {
          throw DataError.validation("A budget must start on the first day of its month.");
        }

        const now = new Date().toISOString();
        const existing = store.monthly_budgets.find((b) => b.month_start === input.monthStart);

        if (existing) {
          existing.monthly_budget = column(input.monthlyBudget);
          existing.daily_allowance = optionalColumn(input.dailyAllowance);
          existing.updated_at = now;
          return toBudgetRecord(existing);
        }

        const row: StoredBudget = {
          id: randomUUID(),
          month_start: input.monthStart,
          monthly_budget: column(input.monthlyBudget),
          daily_allowance: optionalColumn(input.dailyAllowance),
          created_at: now,
          updated_at: now,
        };
        store.monthly_budgets.push(row);
        return toBudgetRecord(row);
      }),

    async countTransactions(filter: TransactionFilter = {}) {
      const store = await loadStore();
      return store.transactions.filter((row) => matchesTransactionFilter(row, filter)).length;
    },

    async getTransaction(id: string) {
      const store = await loadStore();
      const row = store.transactions.find((t) => t.id === id);
      return row ? toTransactionRecord(row) : null;
    },

    createTransaction: (input: TransactionWriteInput) =>
      mutate((store) => {
        assertTransactionIsValid(input, store);
        const now = new Date().toISOString();
        const row: StoredTransaction = {
          id: randomUUID(),
          transaction_date: input.date,
          type: input.type,
          amount: column(input.amount),
          adjustment_direction: input.adjustmentDirection,
          category_id: input.categoryId,
          description: input.description,
          created_at: now,
          updated_at: now,
        };
        store.transactions.push(row);
        return toTransactionRecord(row);
      }),

    updateTransaction: (id: string, patch: TransactionWriteInput) =>
      mutate((store) => {
        const row = store.transactions.find((t) => t.id === id);
        if (!row) throw DataError.notFound("That transaction");
        assertTransactionIsValid(patch, store);

        row.transaction_date = patch.date;
        row.type = patch.type;
        row.amount = column(patch.amount);
        row.adjustment_direction = patch.adjustmentDirection;
        row.category_id = patch.categoryId;
        row.description = patch.description;
        row.updated_at = new Date().toISOString();
        return toTransactionRecord(row);
      }),

    deleteTransaction: (id: string) =>
      mutate((store) => {
        const index = store.transactions.findIndex((t) => t.id === id);
        if (index === -1) throw DataError.notFound("That transaction");
        store.transactions.splice(index, 1);
        // Mirrors ON DELETE SET NULL on planned_expenses.converted_transaction_id.
        for (const planned of store.planned_expenses) {
          if (planned.converted_transaction_id === id) planned.converted_transaction_id = null;
        }
      }),

    async getPlannedExpense(id: string) {
      const store = await loadStore();
      const row = store.planned_expenses.find((p) => p.id === id);
      return row ? toPlannedRecord(row) : null;
    },

    createPlannedExpense: (input: PlannedExpenseWriteInput) =>
      mutate((store) => {
        if (input.amount <= 0) throw DataError.validation("The amount must be greater than zero.");
        const now = new Date().toISOString();
        const row: StoredPlannedExpense = {
          id: randomUUID(),
          planned_date: input.plannedDate,
          amount: column(input.amount),
          category_id: input.categoryId,
          description: input.description,
          status: input.status,
          converted_transaction_id: null,
          created_at: now,
          updated_at: now,
        };
        store.planned_expenses.push(row);
        return toPlannedRecord(row);
      }),

    updatePlannedExpense: (id, patch) =>
      mutate((store) => {
        const row = store.planned_expenses.find((p) => p.id === id);
        if (!row) throw DataError.notFound("That planned expense");

        if (patch.amount !== undefined) {
          if (patch.amount <= 0) throw DataError.validation("The amount must be greater than zero.");
          row.amount = column(patch.amount);
        }
        if (patch.plannedDate !== undefined) row.planned_date = patch.plannedDate;
        if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.convertedTransactionId !== undefined) {
          const linked = patch.convertedTransactionId;
          if (
            linked !== null &&
            store.planned_expenses.some((p) => p.id !== id && p.converted_transaction_id === linked)
          ) {
            throw DataError.conflict("That plan has already been marked as spent.");
          }
          row.converted_transaction_id = linked;
        }
        row.updated_at = new Date().toISOString();
        return toPlannedRecord(row);
      }),

    deletePlannedExpense: (id: string) =>
      mutate((store) => {
        const index = store.planned_expenses.findIndex((p) => p.id === id);
        if (index === -1) throw DataError.notFound("That planned expense");
        store.planned_expenses.splice(index, 1);
      }),

    async listMonthlyTotalsBefore(beforeMonth: MonthKey): Promise<MonthlyTotalsRecord[]> {
      const store = await loadStore();
      const byMonth = new Map<MonthKey, { i: number; e: number; c: number; d: number; n: number }>();

      for (const row of store.transactions) {
        const month = toMonthKey(row.transaction_date);
        if (month >= beforeMonth) continue;

        const bucket = byMonth.get(month) ?? { i: 0, e: 0, c: 0, d: 0, n: 0 };
        const amount = money(row.amount);
        if (row.type === "income") bucket.i += amount;
        else if (row.type === "expense") bucket.e += amount;
        else if (row.adjustment_direction === "debit") bucket.d += amount;
        else bucket.c += amount;
        bucket.n += 1;
        byMonth.set(month, bucket);
      }

      return [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthStart, bucket]) => ({
          monthStart,
          income: bucket.i as Money,
          expenses: bucket.e as Money,
          creditAdjustments: bucket.c as Money,
          debitAdjustments: bucket.d as Money,
          transactionCount: bucket.n,
        }));
    },

    async getEarliestActivityMonth() {
      const store = await loadStore();
      const candidates: MonthKey[] = [
        ...store.monthly_budgets.map((b) => b.month_start as MonthKey),
        ...store.transactions.map((t) => toMonthKey(t.transaction_date)),
      ];
      if (candidates.length === 0) return null;
      return candidates.reduce((earliest, month) => (month < earliest ? month : earliest));
    },

    async exportAll(): Promise<BackupPayload> {
      const store = await loadStore();
      return {
        settings: toSettings(store.settings),
        categories: await listCategories(),
        monthlyBudgets: await listMonthlyBudgets(),
        transactions: await listTransactions({ sort: "date-asc" }),
        plannedExpenses: await listPlannedExpenses(),
      };
    },

    replaceAll: (payload: BackupPayload) =>
      mutate((store) => {
        const now = new Date().toISOString();

        store.settings = {
          id: store.settings.id,
          currency: payload.settings.currency,
          default_monthly_budget: column(payload.settings.defaultMonthlyBudget),
          default_daily_allowance: optionalColumn(payload.settings.defaultDailyAllowance),
          month_start_day: payload.settings.monthStartDay,
          created_at: store.settings.created_at,
          updated_at: now,
        };

        store.categories = payload.categories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          description: category.description,
          is_active: category.isActive,
          sort_order: category.sortOrder,
          created_at: now,
          updated_at: now,
        }));

        store.monthly_budgets = payload.monthlyBudgets.map((budget) => ({
          id: budget.id,
          month_start: budget.monthStart,
          monthly_budget: column(budget.monthlyBudget),
          daily_allowance: optionalColumn(budget.dailyAllowance),
          created_at: now,
          updated_at: now,
        }));

        store.transactions = payload.transactions.map((transaction) => ({
          id: transaction.id,
          transaction_date: transaction.date,
          type: transaction.type,
          amount: column(transaction.amount),
          adjustment_direction: transaction.adjustmentDirection,
          category_id: transaction.categoryId,
          description: transaction.description,
          created_at: transaction.createdAt,
          updated_at: now,
        }));

        store.planned_expenses = payload.plannedExpenses.map((planned) => ({
          id: planned.id,
          planned_date: planned.plannedDate,
          amount: column(planned.amount),
          category_id: planned.categoryId,
          description: planned.description,
          status: planned.status,
          converted_transaction_id: planned.convertedTransactionId,
          created_at: planned.createdAt,
          updated_at: now,
        }));
      }),

    resetAll: () =>
      mutate((store) => {
        const seeded = createSeedStore();
        store.categories = seeded.categories;
        store.monthly_budgets = seeded.monthly_budgets;
        store.transactions = [];
        store.planned_expenses = [];
        store.settings = { ...seeded.settings, id: store.settings.id };
      }),
  };
}
