import { UserIcon } from "lucide-react";
import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageContainer } from "@/components/page-container";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Sticky app bar with the home link, the section nav, the theme toggle, the
 * account link and the sign-out control.
 *
 * The bar is the frame around every page, so it takes the canvas width tier
 * rather than the content tier: it spans the app's widest surface, lines up
 * with the calendar board, and keeps the same width as you move between
 * sections while content pages centre inside it.
 *
 * @param props.user The signed-in user, named by the sign-out control.
 */
export function SiteHeader({ user }: { user: AuthUser }) {
  return (
    <header className="nutria-theme bg-background sticky top-0 z-10 border-b">
      <PageContainer width="wide" className="flex h-14 items-center gap-6">
        <Link href="/" className="font-heading text-sm font-medium">
          Nutria
        </Link>
        <AppNav />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/account"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <UserIcon />
            <span className="max-sm:sr-only">Account</span>
          </Link>
          <SignOutButton name={user.name} />
        </div>
      </PageContainer>
    </header>
  );
}
