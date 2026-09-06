/**
 * Supabase schema types.
 *
 * Shape matches the output of `supabase gen types typescript`, so it can be
 * regenerated in place once the CLI is pointed at a project:
 *
 *   supabase gen types typescript --linked > types/database.ts
 *
 * Until then it is maintained by hand alongside supabase/migrations. Run
 * `scripts/verify-database-types.mjs` to confirm every table, column, nullability
 * and default here still matches the database.
 *
 * A note on `numeric` columns: PostgREST serialises them as JSON numbers, so
 * they arrive as JavaScript `number`. They are never used for arithmetic in that
 * form — the mapping layer in `lib/data` converts each one to decimal-safe
 * `Money` immediately on the way in. See lib/finance/money.ts.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string;
          currency: string;
          default_monthly_budget: number;
          default_daily_allowance: number | null;
          month_start_day: number;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          currency?: string;
          default_monthly_budget?: number;
          default_daily_allowance?: number | null;
          month_start_day?: number;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          currency?: string;
          default_monthly_budget?: number;
          default_daily_allowance?: number | null;
          month_start_day?: number;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string | null;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_budgets: {
        Row: {
          id: string;
          month_start: string;
          monthly_budget: number;
          daily_allowance: number | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          month_start: string;
          monthly_budget: number;
          daily_allowance?: number | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          month_start?: string;
          monthly_budget?: number;
          daily_allowance?: number | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          transaction_date: string;
          type: string;
          amount: number;
          adjustment_direction: string | null;
          category_id: string | null;
          description: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          transaction_date: string;
          type: string;
          amount: number;
          adjustment_direction?: string | null;
          category_id?: string | null;
          description?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          transaction_date?: string;
          type?: string;
          amount?: number;
          adjustment_direction?: string | null;
          category_id?: string | null;
          description?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      planned_expenses: {
        Row: {
          id: string;
          planned_date: string;
          amount: number;
          category_id: string | null;
          description: string | null;
          status: string;
          converted_transaction_id: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          planned_date: string;
          amount: number;
          category_id?: string | null;
          description?: string | null;
          status?: string;
          converted_transaction_id?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          planned_date?: string;
          amount?: number;
          category_id?: string | null;
          description?: string | null;
          status?: string;
          converted_transaction_id?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_expenses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planned_expenses_converted_transaction_id_fkey";
            columns: ["converted_transaction_id"];
            isOneToOne: true;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_carry_forwards: {
        Row: {
          id: string;
          source_month: string;
          destination_month: string;
          amount: number;
          note: string | null;
          owner_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_month: string;
          destination_month: string;
          amount: number;
          note?: string | null;
          owner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_month?: string;
          destination_month?: string;
          amount?: number;
          note?: string | null;
          owner_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      monthly_transaction_totals: {
        Row: {
          month_start: string | null;
          income: number | null;
          expenses: number | null;
          credit_adjustments: number | null;
          debit_adjustments: number | null;
          transaction_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_month_start: {
        Args: { d: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends { Update: infer U } ? U : never;

export type AppSettingsRow = Tables<"app_settings">;
export type CategoryRow = Tables<"categories">;
export type MonthlyBudgetRow = Tables<"monthly_budgets">;
export type TransactionRow = Tables<"transactions">;
export type PlannedExpenseRow = Tables<"planned_expenses">;
export type MonthlyCarryForwardRow = Tables<"monthly_carry_forwards">;
export type MonthlyTransactionTotalsRow = Tables<"monthly_transaction_totals">;
