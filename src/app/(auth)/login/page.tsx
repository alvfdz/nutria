import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser, hasAnyUser } from "@/lib/auth/session";
import { CARD_CLASS, CARD_TITLE_CLASS } from "@/lib/design-system";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Login screen. A fresh install with no account yet goes to `/setup`
 * instead, and an already signed-in visitor goes straight to `next`. Nutria
 * sends no email, so the screen points a locked-out owner at the server command
 * that resets the password.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  if (!(await hasAnyUser())) redirect("/setup");
  if (await getCurrentUser()) redirect(next);

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className={CARD_TITLE_CLASS}>
          <h1>Sign in</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <LoginForm next={next} />
        <p className="text-muted-foreground type-caption text-balance">
          Locked out? Run{" "}
          <code className="font-mono whitespace-nowrap">reset-password</code> on
          your server.
        </p>
      </CardContent>
    </Card>
  );
}
