import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";

/** Sticky app bar with the home link, the section nav and the theme toggle. */
export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-10 border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-heading text-sm font-medium">
          Nutria
        </Link>
        <AppNav />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
