import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { PageContainer } from "@/components/page-container";
import { ThemeToggle } from "@/components/theme-toggle";

/** Sticky app bar with the home link, the section nav and the theme toggle. */
export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <PageContainer className="flex h-14 items-center gap-6">
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
