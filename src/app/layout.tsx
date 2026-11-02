import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
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
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
