import Link from "next/link";
import { LeafyGreen } from "lucide-react";

import { ICON_STROKE } from "@/lib/design-system";

/**
 * Logo and wordmark shown above the signed-out forms, linking to the login
 * screen. The mark is the signed-out screens' only colour, one of the few uses
 * the design system allows `brand`. It is a placeholder icon: swap the contents
 * of the logo element for the real image once it exists.
 *
 * @returns The linked logo and wordmark; never throws.
 */
export function AuthBrand() {
  return (
    <Link
      href="/login"
      className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg outline-none focus-visible:ring-3"
      aria-label="Nutria"
    >
      <span data-testid="auth-logo" className="text-brand">
        <LeafyGreen className="size-8" strokeWidth={ICON_STROKE} aria-hidden />
      </span>
      <span
        className="font-heading text-3xl font-semibold tracking-tight"
        aria-hidden
      >
        Nutria
      </span>
    </Link>
  );
}
