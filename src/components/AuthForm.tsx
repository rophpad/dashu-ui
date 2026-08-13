"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

type Mode = "signin" | "signup";

type SessionInfo = {
  user?: unknown;
  canSignIn: boolean;
  /** No account exists yet — the first visitor creates it. */
  needsSetup: boolean;
  allowSignup: boolean;
};

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/chat";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<SessionInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data: SessionInfo) => {
        setInfo(data);
        if (data.user) {
          router.replace(next);
          return;
        }
        // A brand-new instance has nothing to sign in to. Send the first
        // visitor to setup rather than showing a form that cannot succeed.
        if (mode === "signin" && data.needsSetup) router.replace("/signup");
      })
      .catch(() => {});
  }, [router, next, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      // No reset on success: router.replace only *starts* the navigation, and
      // a re-enabled button would accept a second submit while it completes.
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  const firstRun = mode === "signup" && info?.needsSetup;
  const field =
    "mt-1.5 w-full rounded-lg border bg-panel px-3.5 py-2.5 text-[14px] outline-none transition-all duration-150 placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/10";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo className="h-7 w-auto" />
        <span className="text-[17px] font-semibold tracking-tight">Dashu</span>
      </Link>

      <div className="w-full max-w-95 rounded-xl border bg-panel p-6 shadow-card">
        <h1 className="text-[19px] font-semibold tracking-[-0.01em]">
          {mode === "signin"
            ? "Sign in"
            : firstRun
              ? "Create your admin account"
              : "Create an account"}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {mode === "signin"
            ? "Sign in to query your database."
            : firstRun
              ? "This instance is new. The first account created owns it."
              : "Set up your access to this Dashu instance."}
        </p>

        {mode === "signup" && info && !info.allowSignup && (
          <p className="mt-4 rounded-lg border border-dashed px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
            Sign-ups are closed on this instance. Ask whoever runs it for an account,
            or sign in below.
          </p>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3.5">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-[13px] font-medium">
                Name
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                autoComplete="name"
                placeholder="Ada Lovelace"
                className={field}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[13px] font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
              placeholder="you@example.com"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "At least 10 characters" : "••••••••••"}
              className={field}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-accent-line bg-accent-soft px-3.5 py-2.5 text-[13px] leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || (mode === "signup" && info !== null && !info.allowSignup)}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover disabled:opacity-40"
          >
            {busy
              ? "Working…"
              : mode === "signin"
                ? "Sign in"
                : firstRun
                  ? "Create account"
                  : "Sign up"}
          </button>
        </form>

        {/* Each form always offers the other, so neither is a dead end. */}
        {mode === "signin" ? (
          <p className="mt-4 text-center text-[13px] text-muted">
            Don&rsquo;t have an account?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Create one
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-center text-[13px] text-muted">
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-accent hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>

      <p className="mt-6 max-w-95 text-center text-xs leading-relaxed text-faint">
        Self-hosted. Your credentials and your data never leave this server.
      </p>
    </main>
  );
}
