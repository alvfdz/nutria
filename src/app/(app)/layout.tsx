import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";

/**
 * Layout of every signed-in page: sends signed-out visitors to the login
 * screen and frames the page with the site header.
 *
 * Layouts do not re-render on client-side navigation, so this check is not
 * what protects the data: each page and server action under the group calls
 * `requireUser()` itself.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <>
      <SiteHeader user={user} />
      {children}
    </>
  );
}
