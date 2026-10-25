"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "@/lib/auth/errors";
import {
  authFieldErrors,
  loginSchema,
  type AuthFieldErrors,
} from "@/lib/auth/schema";

type LoginField = "email" | "password";

/**
 * Email and password form of the login screen. Validates locally, then signs
 * in through the Better Auth client (so the attempt is rate limited) and sends
 * the browser on to `next`.
 *
 * @param props.next Already-validated path to open after signing in.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors<LoginField>>(
    {},
  );
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!result.success) {
      setFieldErrors(authFieldErrors<LoginField>(result.error));
      setFormError(undefined);
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    setPending(true);

    try {
      const { error } = await authClient.signIn.email(result.data);

      if (error) {
        setFormError(authErrorMessage(error, "login"));
        setPending(false);
        return;
      }
    } catch {
      // The request never got an answer (offline, server down); the client
      // throws instead of returning `{ error }`.
      setFormError(authErrorMessage({ status: 0 }, "login"));
      setPending(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-4">
      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}
      <AuthField
        id="login-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
        errors={fieldErrors.email}
      />
      <AuthField
        id="login-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        errors={fieldErrors.password}
      />
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        Sign in
      </Button>
    </form>
  );
}
