"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "askdb.theme";

/**
 * Runs before first paint, inlined in <head>.
 *
 * Without this the page renders light and then flips, which is worse than
 * having no dark mode at all. Kept as a string so it can be injected verbatim.
 */
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||"system";
var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
document.documentElement.style.colorScheme=d?"dark":"light";
}catch(e){}})();`;

export function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

const NEXT: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<Theme, string> = {
  system: "Theme: follows your system",
  light: "Theme: light",
  dark: "Theme: dark",
};

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    setTheme(stored);
    setReady(true);

    // Keep following the OS while set to "system".
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = localStorage.getItem(THEME_KEY) as Theme | null;
      if (current !== "dark" && current !== "light") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // Render the system icon until hydrated, so the markup matches the server.
  const Icon = ICONS[ready ? theme : "system"];

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      className={`rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-fg ${className}`}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
