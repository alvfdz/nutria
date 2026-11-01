import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { LoginForm } from "@/components/auth/login-form";
import { authClient } from "@/lib/auth/client";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({
  authClient: { signIn: { email: vi.fn() } },
}));

const router = { replace: vi.fn(), refresh: vi.fn() };
const signIn = vi.mocked(authClient.signIn.email);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue(router as never);
});

/** Fills and submits the form. */
async function submit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  test("signs in and opens the requested page", async () => {
    signIn.mockResolvedValue({ data: {}, error: null } as never);
    render(<LoginForm next="/calendar" />);

    await submit("Owner@Example.com", "correct horse");

    expect(signIn).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "correct horse",
    });
    expect(router.replace).toHaveBeenCalledWith("/calendar");
    expect(router.refresh).toHaveBeenCalled();
  });

  test("shows field errors without contacting the server", async () => {
    render(<LoginForm next="/" />);

    await submit("", "");

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  test("shows a generic message for wrong credentials and stays put", async () => {
    signIn.mockResolvedValue({
      data: null,
      error: { status: 401, code: "INVALID_EMAIL_OR_PASSWORD" },
    } as never);
    render(<LoginForm next="/" />);

    await submit("owner@example.com", "wrong");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid email or password.",
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("recovers when the request never gets an answer", async () => {
    signIn.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<LoginForm next="/" />);

    await submit("owner@example.com", "correct horse");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not sign in. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("explains a rate-limited attempt", async () => {
    signIn.mockResolvedValue({ data: null, error: { status: 429 } } as never);
    render(<LoginForm next="/" />);

    await submit("owner@example.com", "guess");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Too many attempts. Wait a few seconds and try again.",
    );
  });

  test("relabels and disables the button while signing in", async () => {
    signIn.mockReturnValue(new Promise(() => {}) as never);
    render(<LoginForm next="/" />);

    await submit("owner@example.com", "correct horse");

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  test("shows a request error just above the action", async () => {
    signIn.mockResolvedValue({ data: null, error: { status: 429 } } as never);
    render(<LoginForm next="/" />);

    await submit("owner@example.com", "guess");

    expect(screen.getByRole("alert").nextElementSibling).toBe(
      screen.getByRole("button", { name: "Sign in" }),
    );
  });

  test("moves focus to the first invalid field", async () => {
    render(<LoginForm next="/" />);

    await submit("", "");

    expect(screen.getByLabelText("Email")).toHaveFocus();
  });
});
