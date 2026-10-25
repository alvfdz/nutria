import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SiteHeader } from "@/components/site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/goals",
  useRouter: vi.fn(),
}));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));

describe("SiteHeader", () => {
  test("links to the account screen next to sign out", () => {
    render(
      <SiteHeader
        user={{ id: "user-1", name: "Owner", email: "owner@example.com" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });
});
