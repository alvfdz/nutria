import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Layout of the signed-out screens (login and first-run setup): no app nav,
 * just the wordmark and a centred card column.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex w-full max-w-sm items-center justify-between">
        <Link href="/login" className="font-heading text-sm font-medium">
          Nutria
        </Link>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
