import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser, hasAnyUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Login screen. A fresh install with no account yet goes to `/setup`
 * instead, and an already signed-in visitor goes straight to `next`.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  if (!(await hasAnyUser())) redirect("/setup");
  if (await getCurrentUser()) redirect(next);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Sign in</h1>
        </CardTitle>
        <CardDescription>Sign in to plan your meals.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
    </Card>
  );
}
