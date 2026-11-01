import { AuthBrand } from "@/components/auth/auth-brand";
import { PageContainer } from "@/components/page-container";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Layout of the signed-out screens (login and first-run setup): no app nav,
 * just the logo and wordmark above a centred form column. It opts both screens
 * into the design-system palette through `nutria-theme`, and narrows the shared
 * container to the 1200px content width (plus its 24px gutters); the width is
 * forced because the container's own `lg:`/`xl:` steps would otherwise win.
 *
 * @param props.children The signed-out screen to frame.
 * @returns The framed screen; never throws.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="nutria-theme bg-background text-foreground flex flex-1 flex-col tabular-nums">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <PageContainer className="flex max-w-[1248px]! flex-1 flex-col items-center justify-center gap-8 py-12">
        <AuthBrand />
        <div className="w-full max-w-sm">{children}</div>
      </PageContainer>
    </main>
  );
}
