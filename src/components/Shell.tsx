"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Sidebar from "./Sidebar";

type SidebarValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  toggle: () => void;
};

/**
 * Below `md` the sidebar is a drawer, so its open state has to be shared with
 * the page header that opens it. Defaults to a no-op so PageHeader still works
 * if it is ever rendered outside the shell.
 */
const SidebarContext = createContext<SidebarValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function useSidebar(): SidebarValue {
  return useContext(SidebarContext);
}

/** Matches the `md` breakpoint the layout switches at. */
const DESKTOP = "(min-width: 768px)";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Navigating is the end of the drawer's job.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);

    // Growing past the breakpoint turns the drawer back into a fixed column;
    // leaving `open` set would strand the scroll lock.
    const desktop = window.matchMedia(DESKTOP);
    const onBreakpoint = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", onBreakpoint);

    // Stop the page behind the drawer from scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onBreakpoint);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle }}>
      <div className="flex min-h-screen">
        {/* Scrim, mobile only — the drawer is a fixed column on desktop. */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarContext.Provider>
  );
}
