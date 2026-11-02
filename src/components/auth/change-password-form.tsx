"use client";

import { Fragment, useState, type FormEvent } from "react";

import { AuthField } from "@/components/auth/auth-field";
import { useFocusFirstInvalid } from "@/components/auth/use-focus-first-invalid";
import { StatusLine } from "@/components/status-line";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
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
 * stays signed in. A wrong current password is reported on its own field.
 */
export function ChangePasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<
    AuthFieldErrors<ChangePasswordField>
  >({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  // Bumped after a change to remount the inputs, which clears both their values
  // and any password left revealed.
  const [fieldsKey, setFieldsKey] = useState(0);
  const formRef = useFocusFirstInvalid(fieldErrors);

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
        const message = authErrorMessage(error, "account");
        if (error.code === "INVALID_PASSWORD") {
          setFieldErrors({ currentPassword: [message] });
        } else {
          setFormError(message);
        }
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

    setFieldsKey((key) => key + 1);
    setPending(false);
    toast.add({
      type: "success",
      title: "Password changed. Other devices were signed out.",
    });
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Fragment key={fieldsKey}>
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
            label="New password"
            description={`At least ${MIN_PASSWORD_LENGTH} characters.`}
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
        </Fragment>
        {formError ? (
          <StatusLine valid={false} role="alert">
            {formError}
          </StatusLine>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Changing password…" : "Change password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
