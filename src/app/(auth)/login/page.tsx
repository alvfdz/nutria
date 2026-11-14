import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser, hasAnyUser } from "@/lib/auth/session";
import {
  CARD_CLASS,
  CARD_TITLE_CLASS,
  INLINE_LINK_CLASS,
} from "@/lib/design-system";

export const metadata: Metadata = { title: "Sign in" };

/** How to reset a forgotten password, for a server and for the desktop app. */
const PASSWORD_RESET_DOCS =
  "https://alvfdz.github.io/nutria/deployment/password-reset/";

/**
 * Login screen. A fresh install with no account yet goes to `/setup`
 * instead, and an already signed-in visitor goes straight to `next`. Nutria
 * sends no email, so the screen points a locked-out owner at the guide to
 * resetting the password, which covers both a server and the desktop app.
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
          Forgot your password?{" "}
          <a
            href={PASSWORD_RESET_DOCS}
            target="_blank"
            rel="noreferrer"
            className={INLINE_LINK_CLASS}
          >
            See how to reset it
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
