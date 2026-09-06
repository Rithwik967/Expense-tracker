import "server-only";

import { ZodError } from "zod";

import { DataError } from "@/lib/data/errors";
import type { ApiErrorBody } from "@/types/app";

/**
 * Route handler plumbing.
 *
 * Every failure leaves as a structured error with a real status code. Nothing
 * here ever swallows an exception and returns an empty result: a screen showing
 * ₹0 because a request failed would misrepresent the user's money, so the UI
 * must always be able to tell "nothing spent" apart from "could not load".
 */

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: { "cache-control": "no-store", ...init?.headers },
  });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): Response {
  const body: ApiErrorBody = { error: { code, message, ...(details ? { details } : {}) } };
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Run a handler and translate anything it throws.
 *
 * Unexpected errors are logged server-side with their real detail and reported
 * to the client as a generic message, so a stack trace or a driver string never
 * reaches the browser.
 */
export async function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("validation", firstMessage(error), 422, flattenIssues(error));
    }

    if (error instanceof DataError) {
      return jsonError(error.code, error.message, error.status, error.details);
    }

    console.error("Unhandled error in route handler:", error);
    return jsonError(
      "unknown",
      "Something went wrong on our side. Please try again.",
      500,
    );
  }
}

function firstMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Some of those values were not valid.";
}

function flattenIssues(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/** Parse a JSON body, turning malformed input into a 422 rather than a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw DataError.validation("The request body was not valid JSON.");
  }
}
