import Link from "next/link";

import { NutriaLogo } from "@/components/brand-logo";

/**
 * Logo with the wordmark below it, shown above the signed-out forms and linking
 * to the login screen. The logo's acorn is the signed-out screens' only colour,
 * one of the few uses the design system allows `brand`.
 *
 * @returns The linked logo and wordmark; never throws.
 */
export function AuthBrand() {
  return (
    <Link
      href="/login"
      className="focus-visible:ring-ring/50 flex flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-3"
      aria-label="Nutria"
    >
      <NutriaLogo data-testid="auth-logo" className="h-40 w-auto sm:h-48" />
      <span
        className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl"
        aria-hidden
      >
        Nutria
      </span>
    </Link>
  );
}
