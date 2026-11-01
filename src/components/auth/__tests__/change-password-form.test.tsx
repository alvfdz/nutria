import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { authClient } from "@/lib/auth/client";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/lib/auth/client", () => ({
  authClient: { changePassword: vi.fn() },
}));

const changePassword = vi.mocked(authClient.changePassword);
const current = "old password here";
const next = "a long enough passphrase";

beforeEach(() => {
  vi.clearAllMocks();
});

/** Fills every field and submits. */
async function submit({ confirm = next, newPassword = next } = {}) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText(/^New password/), newPassword);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: "Change password" }));
}

describe("ChangePasswordForm", () => {
  test("changes the password, ends other sessions and clears the form", async () => {
    changePassword.mockResolvedValue({ data: {}, error: null } as never);
    render(<ChangePasswordForm />);

    await submit();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Password changed. Other devices were signed out.",
    );
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText(/^New password/)).toHaveValue("");
  });

  test("catches a mismatched confirmation before sending anything", async () => {
    render(<ChangePasswordForm />);

    await submit({ confirm: "something else entirely" });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  test("catches a too-short new password", async () => {
    render(<ChangePasswordForm />);

    await submit({ newPassword: "short", confirm: "short" });

    expect(
      screen.getByText("Password must be at least 12 characters"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  test("reports a wrong current password and keeps the form usable", async () => {
    changePassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: "INVALID_PASSWORD" },
    } as never);
    render(<ChangePasswordForm />);

    await submit();

    const field = screen.getByLabelText("Current password");
    expect(field).toHaveAccessibleDescription("Current password is incorrect.");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeEnabled();
  });

  test("recovers when the request never gets an answer", async () => {
    changePassword.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<ChangePasswordForm />);

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not change the password. Please try again.",
    );
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeEnabled();
  });

  test("states the minimum password length as a helper line", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText("New password")).toHaveAccessibleDescription(
      "At least 12 characters.",
    );
  });

  test("relabels and disables the button while changing", async () => {
    changePassword.mockReturnValue(new Promise(() => {}) as never);
    render(<ChangePasswordForm />);

    await submit();

    expect(
      screen.getByRole("button", { name: "Changing password…" }),
    ).toBeDisabled();
  });

  test("shows a request error just above the action", async () => {
    changePassword.mockResolvedValue({
      data: null,
      error: { status: 500 },
    } as never);
    render(<ChangePasswordForm />);

    await submit();

    expect(screen.getByRole("alert").nextElementSibling).toBe(
      screen.getByRole("button", { name: "Change password" }),
    );
  });

  test("hides a revealed password again after a change", async () => {
    changePassword.mockResolvedValue({ data: {}, error: null } as never);
    render(<ChangePasswordForm />);
    const [reveal] = screen.getAllByRole("button", { name: "Show password" });

    await userEvent.setup().click(reveal);
    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "text",
    );

    await submit();

    expect(toast.success).toHaveBeenCalled();
    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  test("moves focus to the first invalid field", async () => {
    render(<ChangePasswordForm />);

    await submit({ newPassword: "short", confirm: "short" });

    expect(screen.getByLabelText("New password")).toHaveFocus();
  });
});
