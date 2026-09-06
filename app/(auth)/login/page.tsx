"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/field";
import { InlineError } from "@/components/ui/states";
import { ApiError } from "@/lib/api/client";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new ApiError("unauthorized", body?.error?.message ?? "Could not sign in.", response.status);
      }
      router.replace(next.startsWith("/") ? next : "/home");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to {APP_NAME}. Your budget stays on your account.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field error={undefined}>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-ink underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
