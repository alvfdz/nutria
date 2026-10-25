import { AuthBrand } from "@/components/auth/auth-brand";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Layout of the signed-out screens (login and first-run setup): no app nav,
 * just the logo and wordmark above a centred card column.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AuthBrand />
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
