"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/limits";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/redirect";
import {
  authFieldErrors,
  setupSchema,
  type AuthFieldErrors,
} from "@/lib/auth/schema";

type SetupField = "name" | "email" | "password" | "confirmPassword";

/**
 * First-run form that creates the owner account. Better Auth signs the new
 * account in on success, so the browser goes straight into the app; the
 * server refuses the request if an owner already exists.
 */
export function SetupForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors<SetupField>>(
    {},
  );
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = setupSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!result.success) {
      setFieldErrors(authFieldErrors<SetupField>(result.error));
      setFormError(undefined);
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    setPending(true);

    const { name, email, password } = result.data;
    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        setFormError(authErrorMessage(error, "setup"));
        setPending(false);
        return;
      }
    } catch {
      // The request never got an answer (offline, server down); the client
      // throws instead of returning `{ error }`.
      setFormError(authErrorMessage({ status: 0 }, "setup"));
      setPending(false);
      return;
    }

    router.replace(DEFAULT_SIGNED_IN_PATH);
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
        id="setup-name"
        name="name"
        label="Name"
        autoComplete="name"
        autoFocus
        errors={fieldErrors.name}
      />
      <AuthField
        id="setup-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        errors={fieldErrors.email}
      />
      <AuthField
        id="setup-password"
        name="password"
        type="password"
        label={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
        autoComplete="new-password"
        errors={fieldErrors.password}
      />
      <AuthField
        id="setup-confirm-password"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        errors={fieldErrors.confirmPassword}
      />
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        Create account
      </Button>
    </form>
  );
}
