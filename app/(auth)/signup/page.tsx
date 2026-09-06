"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input } from "@/components/ui/field";
import { InlineError } from "@/components/ui/states";
import { APP_NAME } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [checkEmail, setCheckEmail] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
        needsEmailConfirmation?: boolean;
      } | null;
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Could not create the account.");
      }
      if (body?.needsEmailConfirmation) {
        setCheckEmail(true);
        return;
      }
      router.replace("/home");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the account.");
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Check your email</h1>
        <p className="text-sm text-ink-muted">
          We sent a confirmation link to {email}. Open it to finish creating your {APP_NAME} account.
        </p>
        <Link href="/login" className="text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your name, photo and spending stay on this account. Nothing is shared with anyone else.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            maxLength={80}
          />
        </Field>
        <Field>
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </Field>
        {error ? <InlineError message={error} /> : null}
        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
