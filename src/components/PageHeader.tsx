"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./Shell";

/** Shared page chrome so the three routes line up to the same 56px header. */
export default function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-20 border-b bg-bg/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
        {/* The only way into navigation below `md`, where the sidebar is a drawer. */}
        <button
          type="button"
          onClick={toggle}
          aria-label="Open menu"
          className="-ml-1 rounded-md p-2 text-muted transition-colors hover:bg-surface hover:text-fg md:hidden"
        >
          <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
