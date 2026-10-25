import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, test, vi } from "vitest";

import SetupPage from "@/app/(auth)/setup/page";
import { hasAnyUser } from "@/lib/auth/session";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ hasAnyUser: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SetupPage", () => {
  test("renders the owner account form on a fresh install", async () => {
    vi.mocked(hasAnyUser).mockResolvedValue(false);

    render(await SetupPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Nutria" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  test("closes once an owner exists", async () => {
    vi.mocked(hasAnyUser).mockResolvedValue(true);

    await expect(SetupPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
