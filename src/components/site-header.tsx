import Link from "next/link";

import { AccountLink, AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AcornMark } from "@/components/brand-logo";
import { PageContainer } from "@/components/page-container";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Sticky app bar with the home link, the section nav, the theme toggle, the
 * account link and the sign-out control.
 *
 * The bar is the frame around every page, so it takes the canvas width tier
 * rather than the content tier: it spans the app's widest surface, lines up
 * with the calendar board, and keeps the same width as you move between
 * sections while content pages centre inside it. On the narrowest phones the
 * wordmark folds away, leaving the logo mark, so the bar never overflows.
 *
 * @param props.user The signed-in user, named by the sign-out control.
 * @returns The app bar; never throws.
 */
export function SiteHeader({ user }: { user: AuthUser }) {
  return (
    <header className="nutria-theme bg-background text-foreground sticky top-0 z-10 border-b">
      <PageContainer
        width="wide"
        className="flex h-14 items-center gap-2 sm:gap-6"
      >
        <Link
          href="/"
          className="focus-visible:ring-ring/50 flex shrink-0 items-center gap-1.5 rounded-lg text-sm font-semibold outline-none focus-visible:ring-3"
        >
          <AcornMark
            data-testid="header-logo"
            className="text-brand h-6 w-auto"
          />
          <span className="max-[359px]:sr-only">Nutria</span>
        </Link>
        <AppNav />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <AccountLink />
          <SignOutButton name={user.name} />
        </div>
      </PageContainer>
    </header>
  );
}
