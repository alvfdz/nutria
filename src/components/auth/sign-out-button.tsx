"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/client";
import { ICON_STROKE } from "@/lib/design-system";

/**
 * Ends the session and returns to the login screen. Its tooltip names who is
 * signed in, which is all the account UI a single-account instance needs.
 * While the request runs the label reads "Signing out…" and a spinner takes the
 * icon's place, which is what shows below `md`, where the label is hidden.
 *
 * @param props.name Display name of the signed-in user.
 * @returns The sign-out button; failures surface as a toast, never a throw.
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
      toast.add({
        type: "error",
        title: "Could not sign out. Please try again.",
      });
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
      className="text-muted-foreground max-md:w-8 max-md:px-0"
      disabled={pending}
      onClick={handleClick}
      title={`Signed in as ${name}`}
    >
      {pending ? <Spinner /> : <LogOutIcon strokeWidth={ICON_STROKE} />}
      <span className="max-md:sr-only">
        {pending ? "Signing out…" : "Sign out"}
      </span>
    </Button>
  );
}
