import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { authClient } from "@/lib/auth/client";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));
vi.mock("@/lib/auth/client", () => ({ authClient: { signOut: vi.fn() } }));

const router = { replace: vi.fn(), refresh: vi.fn() };
const signOut = vi.mocked(authClient.signOut);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue(router as never);
});

describe("SignOutButton", () => {
  test("names the signed-in user in its tooltip", () => {
    render(<SignOutButton name="Owner" />);

    expect(screen.getByRole("button", { name: "Sign out" })).toHaveAttribute(
      "title",
      "Signed in as Owner",
    );
  });

  test("ends the session and returns to the login screen", async () => {
    signOut.mockResolvedValue({
      data: { success: true },
      error: null,
    } as never);
    render(<SignOutButton name="Owner" />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(router.refresh).toHaveBeenCalled();
  });

  test("recovers when the request never gets an answer", async () => {
    signOut.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<SignOutButton name="Owner" />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(toast.add).toHaveBeenCalledWith({
      type: "error",
      title: "Could not sign out. Please try again.",
    });
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("reports a failed sign-out and stays signed in", async () => {
    signOut.mockResolvedValue({ data: null, error: { status: 500 } } as never);
    render(<SignOutButton name="Owner" />);

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(toast.add).toHaveBeenCalledWith({
      type: "error",
      title: "Could not sign out. Please try again.",
    });
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  test("disables itself and says so while the request runs", async () => {
    signOut.mockReturnValue(new Promise(() => {}) as never);

    render(<SignOutButton name="Owner" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
  });
});
