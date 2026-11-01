import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, test, vi } from "vitest";

import LoginPage from "@/app/(auth)/login/page";
import { getCurrentUser, hasAnyUser } from "@/lib/auth/session";
import { testUser } from "@test/factories";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
  hasAnyUser: vi.fn(),
}));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasAnyUser).mockResolvedValue(true);
  vi.mocked(getCurrentUser).mockResolvedValue(null);
});

/** Resolves the page for the given query, the way Next.js would. */
function page(searchParams: Record<string, string | string[]> = {}) {
  return LoginPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(searchParams),
  } as never);
}

describe("LoginPage", () => {
  test("renders the sign-in form", async () => {
    render(await page());

    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  test("uses the design-system card", async () => {
    render(await page());

    expect(
      screen
        .getByRole("heading", { level: 1, name: "Sign in" })
        .closest("[data-slot=card]"),
    ).toHaveClass("rounded-card!");
  });

  test("sends a fresh install to the setup screen", async () => {
    vi.mocked(hasAnyUser).mockResolvedValue(false);

    await expect(page()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/setup");
  });

  test("sends a signed-in visitor on to `next`", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);

    await expect(page({ next: "/calendar" })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/calendar");
  });

  test("never redirects off-site, whatever `next` says", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);

    await expect(page({ next: "//evil.example" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith("/");
  });

  test("uses the first `next` when the query repeats it", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);

    await expect(page({ next: ["/meals", "/goals"] })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith("/meals");
  });

  test("points a locked-out owner at the reset command", async () => {
    render(await page());

    expect(screen.getByText("reset-password")).toBeInTheDocument();
  });
});
