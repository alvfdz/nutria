"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/**
 * Ends the session and returns to the login screen. Its tooltip names who is
 * signed in, which is all the account UI a single-account instance needs.
 *
 * @param props.name Display name of the signed-in user.
 */
export function SignOutButton({ name }: { name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);

    // A thrown request (offline, server down) fails the same way as an
    // `{ error }` answer: the session may still be alive, so stay put.
    const failed = await authClient.signOut().then(
      ({ error }) => Boolean(error),
      () => true,
    );

    if (failed) {
      toast.error("Could not sign out. Please try again.");
      setPending(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleClick}
      title={`Signed in as ${name}`}
    >
      <LogOutIcon />
      <span className="max-sm:sr-only">Sign out</span>
    </Button>
  );
}
