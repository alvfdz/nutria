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
    expect(
      screen.getByText("Signed in as Owner (owner@example.com)."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change password" }),
    ).toBeInTheDocument();
  });

  test("sends a signed-out visitor to the login screen", async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(AccountPage()).rejects.toThrow("NEXT_REDIRECT");
  });
});
