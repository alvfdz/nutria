import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import AccountPage from "@/app/(app)/account/page";
import { requireUser } from "@/lib/auth/session";

vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountPage", () => {
  test("names the account and offers the password form", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    });

    render(await AccountPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeInTheDocument();
  });

  test("opts into the design-system palette", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: "user-1",
      name: "Owner",
      email: "owner@example.com",
    });

    render(await AccountPage());

    expect(screen.getByRole("main")).toHaveClass(
      "nutria-theme",
      "tabular-nums",
    );
  });

  test("truncates a long name and email, keeping the full text in `title`", async () => {
    const name = "N".repeat(80);
    const email = `${"e".repeat(120)}@example.com`;
    vi.mocked(requireUser).mockResolvedValue({ id: "user-1", name, email });

    render(await AccountPage());

    for (const value of [name, email]) {
      const element = screen.getByText(value);
      expect(element).toHaveClass("min-w-0", "truncate");
      expect(element).toHaveAttribute("title", value);
    }
  });

  test("sends a signed-out visitor to the login screen", async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AccountPage()).rejects.toThrow("NEXT_REDIRECT");
  });
});
