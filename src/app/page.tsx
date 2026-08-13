import { Check } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  "Published Dashu database and AI adapters",
  "Read-only PostgreSQL query execution",
  "Managed AI with server-side cloud credentials",
  "Persisted users, conversations, dashboards, and settings",
];

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-6 w-auto" />
            <span className="text-[15px] font-semibold tracking-tight">Dashu</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href={user ? "/chat" : "/signin"}
              className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {user ? "Open Dashu" : "Sign in"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Self-hosted conversational analytics
          </span>
          <h1 className="mt-6 max-w-3xl text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[56px]">
            Ask questions. Get SQL, tables, and charts.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-muted">
            Dashu runs on your infrastructure and uses the published Dashu packages for
            PostgreSQL, managed AI, OpenRouter, and local OpenAI-compatible models.
            Database credentials and result rows remain on your server.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={user ? "/chat" : "/signup"}
              className="rounded-lg bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              {user ? "Start querying" : "Create the first account"}
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-surface"
            >
              View configuration
            </Link>
          </div>
        </section>

        <section className="border-y bg-surface">
          <div className="mx-auto grid max-w-5xl gap-3 px-6 py-16 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-xl border bg-panel p-5">
                <Check className="mt-0.5 shrink-0 text-accent" size={16} aria-hidden="true" />
                <p className="text-[14px] leading-relaxed text-muted">{feature}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-faint">
        <span>Dashu UI</span>
        <span>Your data stays on your infrastructure.</span>
      </footer>
    </div>
  );
}
