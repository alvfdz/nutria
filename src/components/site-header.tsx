import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { PageContainer } from "@/components/page-container";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Sticky app bar with the home link, the section nav and the theme toggle.
 *
 * The bar is the frame around every page, so it takes the canvas width tier
 * rather than the content tier: it spans the app's widest surface, lines up
 * with the calendar board, and keeps the same width as you move between
 * sections while content pages centre inside it.
 */
export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <PageContainer width="wide" className="flex h-14 items-center gap-6">
        <Link href="/" className="font-heading text-sm font-medium">
          Nutria
        </Link>
        <AppNav />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </PageContainer>
    </header>
  );
}
