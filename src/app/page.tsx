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

        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">
              Project resources
            </p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[38px]">
              Deploy, extend, and connect Dashu UI.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              The interface is open source, built on the standalone Dashu SDK, and connects to
              Dashu Cloud only when you choose managed AI or licensed features.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="flex flex-col rounded-2xl border bg-panel p-6 shadow-card">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-accent">Source code</p>
              <h3 className="mt-3 text-[18px] font-semibold">Dashu UI on GitHub</h3>
              <p className="mt-2 grow text-[14px] leading-relaxed text-muted">
                Review the code, clone the application, report issues, or contribute improvements.
              </p>
              <a
                href="https://github.com/rophpad/dashu-ui"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-surface"
              >
                View repository ↗
              </a>
            </article>
            <article className="flex flex-col rounded-2xl border bg-panel p-6 shadow-card">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-accent">Developer SDK</p>
              <h3 className="mt-3 text-[18px] font-semibold">Dashu Packages</h3>
              <p className="mt-2 grow text-[14px] leading-relaxed text-muted">
                Explore the npm packages that power queries, PostgreSQL access, Next.js routes, and
                AI providers.
              </p>
              <a
                href="https://github.com/rophpad/dashu-packages"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-surface"
              >
                View packages ↗
              </a>
            </article>
            <article className="flex flex-col rounded-2xl border bg-panel p-6 shadow-card">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-accent">Managed features</p>
              <h3 className="mt-3 text-[18px] font-semibold">Get a licence key</h3>
              <p className="mt-2 grow text-[14px] leading-relaxed text-muted">
                Create a Dashu Cloud account, choose a plan, and generate the server-side installation
                credential used for managed AI and Pro features.
              </p>
              <a
                href="https://dashu.vercel.app/signup"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Get a licence key ↗
              </a>
            </article>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-faint">
        <span>Dashu UI · Your data stays on your infrastructure.</span>
        <div className="flex flex-wrap gap-4">
          <a href="https://github.com/rophpad/dashu-ui" target="_blank" rel="noreferrer" className="hover:text-fg">GitHub</a>
          <a href="https://github.com/rophpad/dashu-packages" target="_blank" rel="noreferrer" className="hover:text-fg">Packages</a>
          <a href="https://dashu.vercel.app" target="_blank" rel="noreferrer" className="hover:text-fg">Dashu Cloud</a>
        </div>
      </footer>
    </div>
  );
}
