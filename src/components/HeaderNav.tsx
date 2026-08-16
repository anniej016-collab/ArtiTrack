"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Library and Check out as a pair, with the current one filled in.
 *
 * A lone "Check out" button stayed lit while you were already reading that
 * page, which reads as a button that does nothing. Two halves with the current
 * one marked says where you are instead, and gives the way back.
 */
const TABS = [
  { href: "/", label: "Library" },
  { href: "/check-out", label: "Check out" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="ml-auto flex items-center gap-0.5 rounded-full border border-line p-0.5">
      {TABS.map((tab) => {
        // Every other route belongs to the library side of the app.
        const current =
          tab.href === "/check-out"
            ? pathname.startsWith("/check-out")
            : !pathname.startsWith("/check-out");

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              current ? "chip-on" : "text-muted hover:bg-panel-hover hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
