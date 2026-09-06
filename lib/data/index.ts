import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createLocalRepository } from "./local-repository";
import { createSupabaseRepository } from "./supabase-repository";
import type { DataRepository } from "./types";

/**
 * Pick the persistence backend.
 *
 * Supabase when it is configured; otherwise an on-disk development store so the
 * app is runnable before credentials exist. Nothing above this line knows which
 * one it is talking to.
 *
 * `server-only` makes it a build error to import this from a Client Component,
 * which is what keeps the database credentials out of the browser bundle.
 */
export async function getRepository(): Promise<DataRepository> {
  if (isSupabaseConfigured()) {
    return createSupabaseRepository(await createSupabaseServerClient());
  }
  return createLocalRepository();
}

export { DataError } from "./errors";
export type * from "./types";
