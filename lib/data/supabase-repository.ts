import type { SupabaseClient } from "@supabase/supabase-js";

import type { MonthKey } from "@/lib/finance/types";
import { toMonthKey } from "@/lib/utils/dates";
import type { Database } from "@/types/database";

import { DataError, fromPostgrestError } from "./errors";
import {
  moneyToColumn,
  optionalMoneyToColumn,
  toAppSettings,
  toCategory,
  toMonthlyBudget,
  toMonthlyTotals,
  toPlannedExpense,
  toTransaction,
} from "./mappers";
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

type Client = SupabaseClient<Database>;

const TRANSACTION_COLUMNS =
  "id, transaction_date, type, amount, adjustment_direction, category_id, description, created_at, updated_at";
const PLANNED_COLUMNS =
  "id, planned_date, amount, category_id, description, status, converted_transaction_id, created_at";
const CATEGORY_COLUMNS = "id, name, icon, description, is_active, sort_order";
const SETTINGS_COLUMNS =
  "id, currency, default_monthly_budget, default_daily_allowance, month_start_day, updated_at";
const BUDGET_COLUMNS = "id, month_start, monthly_budget, daily_allowance";
const TOTALS_COLUMNS =
  "month_start, income, expenses, credit_adjustments, debit_adjustments, transaction_count";

/**
 * The subset of the PostgREST builder this module needs, so the same filter
 * logic can be applied to a row query and to a count query.
 */
interface FilterableQuery<Self> {
  gte(column: string, value: string): Self;
  lte(column: string, value: string): Self;
  in(column: string, values: string[]): Self;
  ilike(column: string, pattern: string): Self;
}

function applyTransactionFilter<Q extends FilterableQuery<Q>>(query: Q, filter: TransactionFilter): Q {
  let next = query;
  if (filter.from) next = next.gte("transaction_date", filter.from);
  if (filter.to) next = next.lte("transaction_date", filter.to);
  if (filter.types?.length) next = next.in("type", [...filter.types]);
  if (filter.categoryIds?.length) next = next.in("category_id", [...filter.categoryIds]);

  if (filter.search?.trim()) {
    // The term is sent as a bound value by the client library, never
    // interpolated into SQL. The characters stripped here are the ones that
    // carry meaning inside a PostgREST filter expression or a LIKE pattern, so
    // a search for "%" cannot widen the match or escape the filter.
    const term = filter.search.trim().replace(/[%_,()\\]/g, "");
    if (term) next = next.ilike("description", `%${term}%`);
  }

  return next;
}

/**
 * Supabase-backed persistence.
 *
 * Selects only the columns it needs and always constrains transaction reads by
 * date, so viewing one month does not download a lifetime of history.
 */
export function createSupabaseRepository(client: Client): DataRepository {
  async function getSettings(): Promise<AppSettingsRecord> {
    const { data, error } = await client
      .from("app_settings")
      .select(SETTINGS_COLUMNS)
      .limit(1)
      .maybeSingle();

    if (error) throw fromPostgrestError(error, "Loading settings");
    if (data) return toAppSettings(data);

    // The seed creates this row. Recreate it by inserting an empty row so the
    // column defaults remain the single definition of the defaults, rather than
    // duplicating them in application code.
    const inserted = await client.from("app_settings").insert({}).select(SETTINGS_COLUMNS).single();
    if (inserted.error) throw fromPostgrestError(inserted.error, "Creating settings");
    return toAppSettings(inserted.data);
  }

  async function updateSettings(patch: SettingsWriteInput): Promise<AppSettingsRecord> {
    const current = await getSettings();
    const { data, error } = await client
      .from("app_settings")
      .update({
        ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
        ...(patch.defaultMonthlyBudget !== undefined
          ? { default_monthly_budget: moneyToColumn(patch.defaultMonthlyBudget) }
          : {}),
        ...(patch.defaultDailyAllowance !== undefined
          ? { default_daily_allowance: optionalMoneyToColumn(patch.defaultDailyAllowance) }
          : {}),
        ...(patch.monthStartDay !== undefined ? { month_start_day: patch.monthStartDay } : {}),
      })
      .eq("id", current.id)
      .select(SETTINGS_COLUMNS)
      .single();

    if (error) throw fromPostgrestError(error, "Saving settings");
    return toAppSettings(data);
  }

  async function listCategories(): Promise<CategoryRecord[]> {
    const { data, error } = await client
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw fromPostgrestError(error, "Loading categories");
    return data.map(toCategory);
  }

  async function listMonthlyBudgets(): Promise<MonthlyBudgetRecord[]> {
    const { data, error } = await client
      .from("monthly_budgets")
      .select(BUDGET_COLUMNS)
      .order("month_start", { ascending: true });

    if (error) throw fromPostgrestError(error, "Loading budgets");
    return data.map(toMonthlyBudget);
  }

  async function listTransactions(filter: TransactionFilter = {}): Promise<TransactionRecord[]> {
    let query = applyTransactionFilter(client.from("transactions").select(TRANSACTION_COLUMNS), filter);

    switch (filter.sort) {
      case "amount-desc":
        query = query.order("amount", { ascending: false });
        break;
      case "amount-asc":
        query = query.order("amount", { ascending: true });
        break;
      case "date-asc":
        query = query
          .order("transaction_date", { ascending: true })
          .order("created_at", { ascending: true });
        break;
      default:
        query = query
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false });
    }

    if (filter.limit !== undefined) {
      const offset = filter.offset ?? 0;
      query = query.range(offset, offset + filter.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw fromPostgrestError(error, "Loading transactions");
    return data.map(toTransaction);
  }

  async function listPlannedExpenses(
    filter: PlannedExpenseFilter = {},
  ): Promise<PlannedExpenseRecord[]> {
    let query = client.from("planned_expenses").select(PLANNED_COLUMNS);
    if (filter.from) query = query.gte("planned_date", filter.from);
    if (filter.to) query = query.lte("planned_date", filter.to);
    if (filter.statuses?.length) query = query.in("status", [...filter.statuses]);

    const { data, error } = await query
      .order("planned_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw fromPostgrestError(error, "Loading planned expenses");
    return data.map(toPlannedExpense);
  }

  async function resetAll(): Promise<void> {
    // Children first: planned expenses reference transactions, and both
    // reference categories.
    const tables = [
      "planned_expenses",
      "transactions",
      "monthly_carry_forwards",
      "monthly_budgets",
      "categories",
    ] as const;

    for (const table of tables) {
      const { error } = await client.from(table).delete().not("id", "is", null);
      if (error) throw fromPostgrestError(error, `Clearing ${table}`);
    }
  }

  return {
    backend: "supabase",

    getSettings,
    updateSettings,
    listCategories,
    listMonthlyBudgets,
    listTransactions,
    listPlannedExpenses,
    resetAll,

    async createCategory(input: CategoryWriteInput) {
      const { data, error } = await client
        .from("categories")
        .insert({
          name: input.name,
          icon: input.icon,
          description: input.description,
          is_active: input.isActive,
          sort_order: input.sortOrder,
        })
        .select(CATEGORY_COLUMNS)
        .single();

      if (error) throw fromPostgrestError(error, "Creating the category");
      return toCategory(data);
    },

    async updateCategory(id: string, patch: Partial<CategoryWriteInput>) {
      const { data, error } = await client
        .from("categories")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
          ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
        })
        .eq("id", id)
        .select(CATEGORY_COLUMNS)
        .maybeSingle();

      if (error) throw fromPostgrestError(error, "Saving the category");
      if (!data) throw DataError.notFound("That category");
      return toCategory(data);
    },

    async reorderCategories(orderedIds: readonly string[]) {
      // One statement per row: PostgREST cannot express a multi-row UPDATE with
      // different values per row, and this list is a handful of entries.
      for (const [index, id] of orderedIds.entries()) {
        const { error } = await client
          .from("categories")
          .update({ sort_order: (index + 1) * 10 })
          .eq("id", id);
        if (error) throw fromPostgrestError(error, "Reordering categories");
      }
      return listCategories();
    },

    async upsertMonthlyBudget(input: MonthlyBudgetWriteInput) {
      const { data, error } = await client
        .from("monthly_budgets")
        .upsert(
          {
            month_start: input.monthStart,
            monthly_budget: moneyToColumn(input.monthlyBudget),
            daily_allowance: optionalMoneyToColumn(input.dailyAllowance),
          },
          { onConflict: "month_start" },
        )
        .select(BUDGET_COLUMNS)
        .single();

      if (error) throw fromPostgrestError(error, "Saving the budget");
      return toMonthlyBudget(data);
    },

    async countTransactions(filter: TransactionFilter = {}) {
      const { count, error } = await applyTransactionFilter(
        client.from("transactions").select("id", { count: "exact", head: true }),
        filter,
      );
      if (error) throw fromPostgrestError(error, "Counting transactions");
      return count ?? 0;
    },

    async getTransaction(id: string) {
      const { data, error } = await client
        .from("transactions")
        .select(TRANSACTION_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error) throw fromPostgrestError(error, "Loading the transaction");
      return data ? toTransaction(data) : null;
    },

    async createTransaction(input: TransactionWriteInput) {
      const { data, error } = await client
        .from("transactions")
        .insert({
          transaction_date: input.date,
          type: input.type,
          amount: moneyToColumn(input.amount),
          adjustment_direction: input.adjustmentDirection,
          category_id: input.categoryId,
          description: input.description,
        })
        .select(TRANSACTION_COLUMNS)
        .single();

      if (error) throw fromPostgrestError(error, "Saving the transaction");
      return toTransaction(data);
    },

    async updateTransaction(id: string, patch: TransactionWriteInput) {
      const { data, error } = await client
        .from("transactions")
        .update({
          transaction_date: patch.date,
          type: patch.type,
          amount: moneyToColumn(patch.amount),
          adjustment_direction: patch.adjustmentDirection,
          category_id: patch.categoryId,
          description: patch.description,
        })
        .eq("id", id)
        .select(TRANSACTION_COLUMNS)
        .maybeSingle();

      if (error) throw fromPostgrestError(error, "Saving the transaction");
      if (!data) throw DataError.notFound("That transaction");
      return toTransaction(data);
    },

    async deleteTransaction(id: string) {
      const { error, count } = await client
        .from("transactions")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) throw fromPostgrestError(error, "Deleting the transaction");
      if (count === 0) throw DataError.notFound("That transaction");
    },

    async getPlannedExpense(id: string) {
      const { data, error } = await client
        .from("planned_expenses")
        .select(PLANNED_COLUMNS)
        .eq("id", id)
        .maybeSingle();

      if (error) throw fromPostgrestError(error, "Loading the planned expense");
      return data ? toPlannedExpense(data) : null;
    },

    async createPlannedExpense(input: PlannedExpenseWriteInput) {
      const { data, error } = await client
        .from("planned_expenses")
        .insert({
          planned_date: input.plannedDate,
          amount: moneyToColumn(input.amount),
          category_id: input.categoryId,
          description: input.description,
          status: input.status,
        })
        .select(PLANNED_COLUMNS)
        .single();

      if (error) throw fromPostgrestError(error, "Saving the planned expense");
      return toPlannedExpense(data);
    },

    async updatePlannedExpense(id, patch) {
      const { data, error } = await client
        .from("planned_expenses")
        .update({
          ...(patch.plannedDate !== undefined ? { planned_date: patch.plannedDate } : {}),
          ...(patch.amount !== undefined ? { amount: moneyToColumn(patch.amount) } : {}),
          ...(patch.categoryId !== undefined ? { category_id: patch.categoryId } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.convertedTransactionId !== undefined
            ? { converted_transaction_id: patch.convertedTransactionId }
            : {}),
        })
        .eq("id", id)
        .select(PLANNED_COLUMNS)
        .maybeSingle();

      if (error) throw fromPostgrestError(error, "Saving the planned expense");
      if (!data) throw DataError.notFound("That planned expense");
      return toPlannedExpense(data);
    },

    async deletePlannedExpense(id: string) {
      const { error, count } = await client
        .from("planned_expenses")
        .delete({ count: "exact" })
        .eq("id", id);

      if (error) throw fromPostgrestError(error, "Deleting the planned expense");
      if (count === 0) throw DataError.notFound("That planned expense");
    },

    async listMonthlyTotalsBefore(beforeMonth: MonthKey): Promise<MonthlyTotalsRecord[]> {
      const { data, error } = await client
        .from("monthly_transaction_totals")
        .select(TOTALS_COLUMNS)
        .lt("month_start", beforeMonth)
        .order("month_start", { ascending: true });

      if (error) throw fromPostgrestError(error, "Loading monthly totals");
      return data.map(toMonthlyTotals);
    },

    async getEarliestActivityMonth() {
      const [budget, transaction] = await Promise.all([
        client
          .from("monthly_budgets")
          .select("month_start")
          .order("month_start", { ascending: true })
          .limit(1)
          .maybeSingle(),
        client
          .from("transactions")
          .select("transaction_date")
          .order("transaction_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (budget.error) throw fromPostgrestError(budget.error, "Loading budgets");
      if (transaction.error) throw fromPostgrestError(transaction.error, "Loading transactions");

      const candidates: MonthKey[] = [];
      if (budget.data) candidates.push(toMonthKey(budget.data.month_start.slice(0, 10)));
      if (transaction.data) {
        candidates.push(toMonthKey(transaction.data.transaction_date.slice(0, 10)));
      }

      if (candidates.length === 0) return null;
      return candidates.reduce((earliest, month) => (month < earliest ? month : earliest));
    },

    async exportAll(): Promise<BackupPayload> {
      const [settings, categories, monthlyBudgets, transactions, plannedExpenses] =
        await Promise.all([
          getSettings(),
          listCategories(),
          listMonthlyBudgets(),
          listTransactions({ sort: "date-asc" }),
          listPlannedExpenses(),
        ]);

      return { settings, categories, monthlyBudgets, transactions, plannedExpenses };
    },

    async replaceAll(payload: BackupPayload) {
      await resetAll();

      const settings = await getSettings();
      const settingsUpdate = await client
        .from("app_settings")
        .update({
          currency: payload.settings.currency,
          default_monthly_budget: moneyToColumn(payload.settings.defaultMonthlyBudget),
          default_daily_allowance: optionalMoneyToColumn(payload.settings.defaultDailyAllowance),
          month_start_day: payload.settings.monthStartDay,
        })
        .eq("id", settings.id);
      if (settingsUpdate.error) throw fromPostgrestError(settingsUpdate.error, "Importing settings");

      // Parents before children, mirroring the reset order in reverse.
      if (payload.categories.length > 0) {
        const { error } = await client.from("categories").insert(
          payload.categories.map((category) => ({
            id: category.id,
            name: category.name,
            icon: category.icon,
            description: category.description,
            is_active: category.isActive,
            sort_order: category.sortOrder,
          })),
        );
        if (error) throw fromPostgrestError(error, "Importing categories");
      }

      if (payload.monthlyBudgets.length > 0) {
        const { error } = await client.from("monthly_budgets").insert(
          payload.monthlyBudgets.map((budget) => ({
            id: budget.id,
            month_start: budget.monthStart,
            monthly_budget: moneyToColumn(budget.monthlyBudget),
            daily_allowance: optionalMoneyToColumn(budget.dailyAllowance),
          })),
        );
        if (error) throw fromPostgrestError(error, "Importing budgets");
      }

      if (payload.transactions.length > 0) {
        const { error } = await client.from("transactions").insert(
          payload.transactions.map((transaction) => ({
            id: transaction.id,
            transaction_date: transaction.date,
            type: transaction.type,
            amount: moneyToColumn(transaction.amount),
            adjustment_direction: transaction.adjustmentDirection,
            category_id: transaction.categoryId,
            description: transaction.description,
          })),
        );
        if (error) throw fromPostgrestError(error, "Importing transactions");
      }

      if (payload.plannedExpenses.length > 0) {
        const { error } = await client.from("planned_expenses").insert(
          payload.plannedExpenses.map((planned) => ({
            id: planned.id,
            planned_date: planned.plannedDate,
            amount: moneyToColumn(planned.amount),
            category_id: planned.categoryId,
            description: planned.description,
            status: planned.status,
            converted_transaction_id: planned.convertedTransactionId,
          })),
        );
        if (error) throw fromPostgrestError(error, "Importing planned expenses");
      }
    },
  };
}
