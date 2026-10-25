"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/limits";
import {
  authFieldErrors,
  changePasswordSchema,
  type AuthFieldErrors,
} from "@/lib/auth/schema";

type ChangePasswordField =
  "currentPassword" | "newPassword" | "confirmPassword";

/**
 * Form on the account screen that changes the signed-in user's password. The
 * current password is required, and on success every other session is ended
 * so a forgotten or stolen sign-in elsewhere stops working; this browser
 * stays signed in.
 */
export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<
    AuthFieldErrors<ChangePasswordField>
  >({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!result.success) {
      setFieldErrors(authFieldErrors<ChangePasswordField>(result.error));
      setFormError(undefined);
      return;
    }

    setFieldErrors({});
    setFormError(undefined);
    setPending(true);

    const { currentPassword, newPassword } = result.data;
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        setFormError(authErrorMessage(error, "account"));
        setPending(false);
        return;
      }
    } catch {
      // The request never got an answer (offline, server down); the client
      // throws instead of returning `{ error }`.
      setFormError(authErrorMessage({ status: 0 }, "account"));
      setPending(false);
      return;
    }

    formRef.current?.reset();
    setPending(false);
    toast.success("Password changed. Other devices were signed out.");
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}
      <AuthField
        id="account-current-password"
        name="currentPassword"
        type="password"
        label="Current password"
        autoComplete="current-password"
        errors={fieldErrors.currentPassword}
      />
      <AuthField
        id="account-new-password"
        name="newPassword"
        type="password"
        label={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
        autoComplete="new-password"
        errors={fieldErrors.newPassword}
      />
      <AuthField
        id="account-confirm-password"
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        errors={fieldErrors.confirmPassword}
      />
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        Change password
      </Button>
    </form>
  );
}
