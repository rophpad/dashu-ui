import { redirect } from "next/navigation";
import Providers from "@/components/state";
import Shell from "@/components/Shell";
import { currentUser, listUsers } from "@/lib/auth";

/**
 * Server-side gate for the application. The middleware only checks that a
 * cookie exists; this verifies the signature and resolves a real user before
 * any of the app renders.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  if (!user) {
    // Nothing to sign in to yet: the first visitor creates the account.
    const users = await listUsers();
    redirect(users.length === 0 ? "/signup" : "/signin");
  }

  return (
    <Providers user={user}>
      <Shell>{children}</Shell>
    </Providers>
  );
}
