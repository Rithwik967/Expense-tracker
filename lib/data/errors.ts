/**
 * Errors the data layer raises.
 *
 * Every failure is classified so the UI can tell the difference between "there
 * is nothing to show" and "we could not find out". Showing ₹0 because a request
 * failed would be a lie about the user's money, so a failed load must always
 * surface as an error with a retry, never as an empty result.
 */

export type DataErrorCode =
  | "not_found"
  | "validation"
  | "conflict"
  | "constraint"
  | "unavailable"
  | "unknown";

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: DataErrorCode, message: string, options?: { details?: unknown; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "DataError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options?.details;
  }

  static notFound(what: string): DataError {
    return new DataError("not_found", `${what} could not be found.`);
  }

  static validation(message: string, details?: unknown): DataError {
    return new DataError("validation", message, { details });
  }

  static conflict(message: string): DataError {
    return new DataError("conflict", message);
  }

  static unavailable(message: string, cause?: unknown): DataError {
    return new DataError("unavailable", message, { cause });
  }
}

const STATUS_BY_CODE: Record<DataErrorCode, number> = {
  not_found: 404,
  validation: 422,
  conflict: 409,
  constraint: 409,
  unavailable: 503,
  unknown: 500,
};

/** Postgres error codes that deserve a specific, human-readable message. */
const POSTGRES_MESSAGES: Record<string, { code: DataErrorCode; message: string }> = {
  "23505": { code: "conflict", message: "That already exists." },
  "23503": {
    code: "constraint",
    message:
      "That category still has transactions recorded against it. Deactivate it instead of deleting it.",
  },
  "23514": { code: "validation", message: "The database rejected those values." },
  "23502": { code: "validation", message: "A required value was missing." },
  "22P02": { code: "validation", message: "One of the values was not in the expected format." },
};

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Turn a PostgREST error into a `DataError`.
 *
 * Constraint violations are mapped to their own messages so the user sees why
 * an action was refused rather than a raw driver string.
 */
export function fromPostgrestError(error: PostgrestLikeError, context: string): DataError {
  const known = error.code ? POSTGRES_MESSAGES[error.code] : undefined;

  if (known) {
    // Constraint names are written to be self-describing; prefer them.
    const constraint = describeConstraint(error.message ?? "", error.details ?? "");
    return new DataError(known.code, constraint ?? known.message, { cause: error });
  }

  return DataError.unavailable(
    `${context} failed. ${error.message ?? "The database did not respond as expected."}`,
    error,
  );
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  transactions_amount_positive: "The amount must be greater than zero.",
  transactions_expense_requires_category: "Expenses need a category.",
  transactions_adjustment_direction_valid:
    "An adjustment must be either a credit or a debit.",
  transactions_type_valid: "That is not a valid transaction type.",
  categories_name_unique_idx: "A category with that name already exists.",
  categories_name_not_empty: "A category needs a name.",
  monthly_budgets_month_start_unique: "A budget already exists for that month.",
  monthly_budgets_budget_non_negative: "A monthly budget cannot be negative.",
  monthly_budgets_allowance_non_negative: "A daily allowance cannot be negative.",
  monthly_budgets_month_start_is_first_of_month:
    "A budget must start on the first day of its month.",
  planned_expenses_amount_positive: "A planned amount must be greater than zero.",
  planned_expenses_converted_transaction_unique_idx:
    "That plan has already been marked as spent.",
  app_settings_singleton_idx: "Settings already exist.",
  app_settings_month_start_day_range: "The month start day must be between 1 and 28.",
};

function describeConstraint(...haystacks: string[]): string | null {
  const text = haystacks.join(" ");
  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (text.includes(constraint)) return message;
  }
  return null;
}
