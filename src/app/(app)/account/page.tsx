import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageContainer } from "@/components/page-container";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Account",
};

/**
 * Account route. Requires a signed-in user, names the account and hosts the
 * change-password form. There is no email-based recovery, so a forgotten
 * password is fixed with the `auth:reset-password` command instead (see the
 * README).
 */
export default async function AccountPage() {
  const user = await requireUser();

  return (
    <main className="flex-1">
      <PageContainer className="py-10">
        <div className="grid max-w-sm gap-8">
          <header className="grid gap-1">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Account
            </h1>
            <p className="text-muted-foreground text-sm">
              Signed in as {user.name} ({user.email}).
            </p>
          </header>

          <section className="grid gap-4" aria-labelledby="password-heading">
            <h2
              id="password-heading"
              className="font-heading text-lg font-medium"
            >
              Change password
            </h2>
            <ChangePasswordForm />
          </section>
        </div>
      </PageContainer>
    </main>
  );
}
