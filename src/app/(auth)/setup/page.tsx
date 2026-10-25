import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SetupForm } from "@/components/auth/setup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasAnyUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set up Nutria" };

/**
 * First-run setup: creates the owner account of a fresh install. Closed once
 * an account exists; later visits go to the login screen.
 */
export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Welcome to Nutria</h1>
        </CardTitle>
        <CardDescription>
          Create the account that owns this instance. Sign-up closes once it
          exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetupForm />
      </CardContent>
    </Card>
  );
}
