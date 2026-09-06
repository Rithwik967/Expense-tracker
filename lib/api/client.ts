import type {
  AppSettingsRecord,
  CategoryRecord,
  MonthlyBudgetRecord,
  PlannedExpenseRecord,
  TransactionRecord,
} from "@/lib/data/types";
import type { DateKey, MonthKey } from "@/lib/finance/types";
import type {
  ApiErrorBody,
  BootstrapView,
  DayView,
  MonthView,
  TransactionListView,
} from "@/types/app";

/**
 * Browser-side API access.
 *
 * The only place the app talks to the network. Screens call hooks, hooks call
 * these functions, and these functions call route handlers — which is what
 * keeps the calculation engine on the server with a single evaluation per
 * request.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: string, message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Normalise anything thrown by a fetch or a handler into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof Error) return new ApiError("unknown", error.message, 0);
  return new ApiError("unknown", "Something went wrong. Please try again.", 0);
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    // Offline, DNS failure, request aborted by a navigation, and so on.
    throw new ApiError(
      "network",
      "We could not reach the server. Check your connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    throw new ApiError(
      body?.error.code ?? "unknown",
      body?.error.message ?? `The server responded with ${response.status}.`,
      response.status,
      body?.error.details as Record<string, string> | undefined,
    );
  }

  if (response.status === 204) return undefined as T;

  /*
   * Amounts travel as integer paise, which JSON.parse gives back as plain
   * numbers. `Money` is a branded number whose brand exists only at compile
   * time, so this cast restores the type without changing a single value. This
   * is the one place the brand is reapplied.
   */
  return (await response.json()) as T;
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export const api = {
  bootstrap: () => request<BootstrapView>("/api/bootstrap"),

  month: (month: MonthKey, today: DateKey) =>
    request<MonthView>(`/api/months/${month}?today=${today}`),

  day: (date: DateKey) => request<DayView>(`/api/days/${date}`),

  transactions: (query: Record<string, string | number | undefined>) =>
    request<TransactionListView>(`/api/transactions?${toQueryString(query)}`),

  createTransaction: (body: unknown) =>
    request<TransactionRecord>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTransaction: (id: string, body: unknown) =>
    request<TransactionRecord>(`/api/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTransaction: (id: string) =>
    request<{ deleted: TransactionRecord }>(`/api/transactions/${id}`, { method: "DELETE" }),

  plannedExpenses: (query: Record<string, string | undefined> = {}) =>
    request<{ plannedExpenses: PlannedExpenseRecord[] }>(
      `/api/planned-expenses?${toQueryString(query)}`,
    ),

  createPlannedExpense: (body: unknown) =>
    request<PlannedExpenseRecord>("/api/planned-expenses", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updatePlannedExpense: (id: string, body: unknown) =>
    request<PlannedExpenseRecord>(`/api/planned-expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deletePlannedExpense: (id: string) =>
    request<{ deleted: PlannedExpenseRecord }>(`/api/planned-expenses/${id}`, {
      method: "DELETE",
    }),

  completePlannedExpense: (id: string, date?: DateKey) =>
    request<{ plannedExpense: PlannedExpenseRecord; transaction: TransactionRecord }>(
      `/api/planned-expenses/${id}/complete`,
      { method: "POST", body: JSON.stringify(date ? { date } : {}) },
    ),

  categories: () => request<{ categories: CategoryRecord[] }>("/api/categories"),

  createCategory: (body: unknown) =>
    request<CategoryRecord>("/api/categories", { method: "POST", body: JSON.stringify(body) }),

  updateCategory: (id: string, body: unknown) =>
    request<CategoryRecord>(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  reorderCategories: (orderedIds: readonly string[]) =>
    request<{ categories: CategoryRecord[] }>("/api/categories", {
      method: "PUT",
      body: JSON.stringify({ orderedIds }),
    }),

  updateSettings: (body: unknown) =>
    request<AppSettingsRecord>("/api/settings", { method: "PATCH", body: JSON.stringify(body) }),

  budgets: () => request<{ budgets: MonthlyBudgetRecord[] }>("/api/budgets"),

  saveBudget: (body: unknown) =>
    request<MonthlyBudgetRecord>("/api/budgets", { method: "PUT", body: JSON.stringify(body) }),

  previewImport: (backup: unknown) =>
    request<{ applied: boolean; summary: ImportSummary }>("/api/data", {
      method: "PUT",
      body: JSON.stringify({ backup, confirm: false }),
    }),

  applyImport: (backup: unknown) =>
    request<{ applied: boolean; summary: ImportSummary }>("/api/data", {
      method: "PUT",
      body: JSON.stringify({ backup, confirm: true }),
    }),

  resetAll: () =>
    request<{ reset: boolean }>("/api/data", {
      method: "DELETE",
      body: JSON.stringify({ confirmation: "DELETE" }),
    }),
};

/** Download URLs for the export links. Not fetched — handed to an anchor. */
export const exportUrls = {
  json: "/api/data?format=json",
  csv: "/api/data?format=csv",
} as const;

export interface ImportSummary {
  readonly categories: number;
  readonly monthlyBudgets: number;
  readonly transactions: number;
  readonly plannedExpenses: number;
  readonly earliestTransaction: string | null;
  readonly latestTransaction: string | null;
  readonly currency: string;
  readonly monthsCovered: readonly string[];
}
