import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { Toaster } from "@/components/ui/toast";
import { NONCE_HEADER } from "@/lib/security/csp";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nutria",
    template: "%s · Nutria",
  },
  description:
    "Open-source nutrition planner: build an ingredient library, compose meal templates, and design your days against a macro budget.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

/**
 * Root layout: wires the font variables, injects the pre-paint theme script,
 * and mounts the toast container that success feedback (e.g. saving the
 * goals) pops up in. The site header lives one level down, in the `(app)`
 * group layout, so the login and setup screens render without it.
 *
 * The theme script is inline, so it carries the request's CSP nonce, which
 * `src/proxy.ts` passes in the `x-nonce` header. Reading it makes every page
 * render per request, which the auth gate already requires.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Browsers hide a parsed nonce from the DOM (it reads back as ""),
            so the attribute never matches on hydration. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
