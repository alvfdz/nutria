import Link from "next/link";
import { LeafyGreen } from "lucide-react";

/**
 * Logo and wordmark shown above the signed-out forms, linking to the login
 * screen. The logo is a placeholder icon: swap the contents of the logo box
 * for the real image once it exists.
 */
export function AuthBrand() {
  return (
    <Link
      href="/login"
      className="flex flex-col items-center gap-4"
      aria-label="Nutria"
    >
      <span
        data-testid="auth-logo"
        className="bg-muted text-muted-foreground flex size-32 items-center justify-center rounded-3xl"
      >
        <LeafyGreen className="size-16" aria-hidden />
      </span>
      <span className="font-heading text-3xl font-semibold" aria-hidden>
        Nutria
      </span>
    </Link>
  );
}
