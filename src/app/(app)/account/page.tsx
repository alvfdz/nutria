import type { Metadata } from "next";
import Link from "next/link";

import { cn } from "cn";

import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageContainer } from "@/components/page-container";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { CARD_CLASS, CARD_TITLE_CLASS } from "@/lib/design-system";

export const metadata: Metadata = {
  title: "Account",
};

/**
 * Account route. Requires a signed-in user, names the account, hosts the
 * change-password form and offers the welcome tutorial again. There is no email-based recovery, so a forgotten
 * password is fixed with the `auth:reset-password` command instead (see the
 * CONTRIBUTING.md). The page opts into the design-system palette through `nutria-theme`,
 * and narrows the shared container to the 1200px content width (plus its 24px
 * gutters); the width is forced because the container's own `lg:`/`xl:` steps
 * would otherwise win.
 */
export default async function AccountPage() {
  const user = await requireUser();
  const details = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
  ];

  return (
    <main className="nutria-theme bg-background text-foreground flex-1 tabular-nums">
      <PageContainer className="max-w-[1248px]! py-12">
        <div className="max-w-sm">
          <header className="grid gap-1">
            <h1 className="font-heading type-page-title">Account</h1>
            <p className="text-muted-foreground text-sm">
              Who you&apos;re signed in as, your password and the tutorial.
            </p>
          </header>

          <div className="mt-8 grid gap-6">
            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className={CARD_TITLE_CLASS}>
                  <h2>Profile</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-border-subtle divide-y text-sm">
                  {details.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <dt className="text-muted-foreground shrink-0">
                        {label}
                      </dt>
                      <dd className="min-w-0 truncate" title={value}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className={CARD_TITLE_CLASS}>
                  <h2>Change password</h2>
                </CardTitle>
                <CardDescription>
                  This signs out your other devices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
              <CardHeader>
                <CardTitle className={CARD_TITLE_CLASS}>
                  <h2>Tutorial</h2>
                </CardTitle>
                <CardDescription>
                  A short reminder of how Nutria works.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/?tutorial=replay"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Replay the tutorial
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
