import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import AppLayout from "@/app/(app)/layout";
import { requireUser } from "@/lib/auth/session";
import { testUser } from "@test/factories";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AppLayout", () => {
  test("frames the page with the header of the signed-in user", async () => {
    vi.mocked(requireUser).mockResolvedValue(testUser);

    render(
      await AppLayout({
        children: <p>Page body</p>,
        params: Promise.resolve({}),
      } as never),
    );

    expect(screen.getByText("Page body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAttribute(
      "title",
      `Signed in as ${testUser.name}`,
    );
  });

  test("renders nothing when the visitor is sent to the login screen", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirect);

    await expect(
      AppLayout({
        children: <p>Page body</p>,
        params: Promise.resolve({}),
      } as never),
    ).rejects.toBe(redirect);
  });
});
