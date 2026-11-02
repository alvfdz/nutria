"use client";

import { ChevronDownIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ICON_STROKE, OVERLAY_THEME_CLASS } from "@/lib/design-system";

/** The top-level sections of the app, in the order they appear in the nav. */
const sections = [
  { href: "/goals", label: "Goals" },
  { href: "/ingredients", label: "Ingredients" },
  { href: "/meals", label: "Meals" },
  { href: "/calendar", label: "Calendar" },
] as const;

/**
 * Whether a link points at the page the user is on, or at a parent of it.
 *
 * @param pathname The current pathname.
 * @param href The link's target.
 * @returns True when the link's page is the current one.
 */
function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Classes of a link in the header. It is a ghost button, muted until hovered;
 * the current page stays `muted` + `foreground`, hovered or not.
 *
 * @param isCurrent Whether the link points at the current page.
 * @param className Extra classes for the link.
 * @returns The merged class names.
 */
function navLinkClass(isCurrent: boolean, className?: string): string {
  return cn(
    buttonVariants({ variant: "ghost" }),
    "text-muted-foreground",
    isCurrent && "bg-muted text-foreground dark:hover:bg-muted",
    className,
  );
}

/**
 * Primary navigation between the app's top-level sections: a row of links, or
 * on phones, where the row doesn't fit, a menu named after the current section.
 * The link matching the current pathname is marked with `aria-current="page"`,
 * which tells assistive technology where the user is.
 *
 * @returns The labelled navigation landmark; never throws.
 */
export function AppNav() {
  const pathname = usePathname();
  const current = sections.find((section) =>
    isCurrentPath(pathname, section.href),
  );

  return (
    <nav aria-label="Main" className="min-w-0">
      <ul className="flex items-center gap-1 max-sm:hidden">
        {sections.map((section) => {
          const isCurrent = current?.href === section.href;

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={isCurrent ? "page" : undefined}
                className={navLinkClass(isCurrent)}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="sm:hidden" />}
          aria-label={current ? `Section: ${current.label}` : "Sections"}
        >
          {current?.label ?? "Sections"}
          <ChevronDownIcon
            data-icon="inline-end"
            strokeWidth={ICON_STROKE}
            className="text-muted-foreground"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className={cn(OVERLAY_THEME_CLASS, "w-40")}>
          <DropdownMenuGroup>
            {sections.map((section) => {
              const isCurrent = current?.href === section.href;

              return (
                <DropdownMenuItem
                  key={section.href}
                  render={
                    <Link
                      href={section.href}
                      aria-current={isCurrent ? "page" : undefined}
                    />
                  }
                  className={cn(
                    "text-muted-foreground",
                    isCurrent && "bg-muted text-foreground",
                  )}
                >
                  {section.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

/**
 * Header link to the account screen, marked as the current page like the
 * section links. Below `md` it folds to its icon, keeping its name for
 * assistive technology.
 *
 * @returns The account link; never throws.
 */
export function AccountLink() {
  const isCurrent = isCurrentPath(usePathname(), "/account");

  return (
    <Link
      href="/account"
      aria-current={isCurrent ? "page" : undefined}
      className={navLinkClass(isCurrent, "max-md:w-8 max-md:px-0")}
    >
      <UserIcon strokeWidth={ICON_STROKE} aria-hidden />
      <span className="max-md:sr-only">Account</span>
    </Link>
  );
}
