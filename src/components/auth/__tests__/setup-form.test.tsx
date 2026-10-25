import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SetupForm } from "@/components/auth/setup-form";
import { authClient } from "@/lib/auth/client";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({
  authClient: { signUp: { email: vi.fn() } },
}));

const router = { replace: vi.fn(), refresh: vi.fn() };
const signUp = vi.mocked(authClient.signUp.email);
const password = "a long enough passphrase";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue(router as never);
});

/** Fills every field and submits. */
async function submit({
  name = "Owner",
  email = "owner@example.com",
  confirm = password,
} = {}) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SetupForm", () => {
  test("creates the owner account and opens the app", async () => {
    signUp.mockResolvedValue({ data: {}, error: null } as never);
    render(<SetupForm />);

    await submit();

    expect(signUp).toHaveBeenCalledWith({
      name: "Owner",
      email: "owner@example.com",
      password,
    });
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(router.refresh).toHaveBeenCalled();
  });

  test("names the minimum password length in the label", () => {
    render(<SetupForm />);

    expect(
      screen.getByLabelText("Password (at least 12 characters)"),
    ).toBeInTheDocument();
  });

  test("catches a mismatched confirmation before sending anything", async () => {
    render(<SetupForm />);

    await submit({ confirm: "something else entirely" });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  test("recovers when the request never gets an answer", async () => {
    signUp.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SetupForm />);

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not create the account. Please try again.",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  test("tells the visitor to sign in when an owner already exists", async () => {
    signUp.mockResolvedValue({ data: null, error: { status: 403 } } as never);
    render(<SetupForm />);

    await submit();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This Nutria instance already has an owner. Sign in instead.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});
