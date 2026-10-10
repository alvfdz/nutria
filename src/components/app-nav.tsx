"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

/** The top-level sections of the app, in the order they appear in the nav. */
const sections = [
  { href: "/goals", label: "Goals" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/meals", label: "Meals" },
] as const;

/**
 * Primary navigation between the app's top-level sections. The link matching
 * the current pathname is marked with `aria-current="page"`, which both styles
 * it and tells assistive technology where the user is.
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex items-center gap-1">
        {sections.map((section) => {
          const isCurrent = pathname === section.href;

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium transition-colors",
                  isCurrent && "bg-muted text-foreground",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
