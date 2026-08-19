"use client";

import { useOptimistic } from "react";
import { setGroupMode } from "@/lib/actions";
import type { GroupMode } from "@/lib/grouping";

const OPTIONS: { mode: GroupMode; label: string; title: string }[] = [
  { mode: "none", label: "All", title: "No grouping" },
  { mode: "artist", label: "By artist", title: "Group by artist" },
  { mode: "date", label: "By date", title: "Group by release month" },
];

/**
 * Regrouping redraws the whole queue, so the answer takes a moment to arrive.
 * The chosen option moves immediately regardless — a segmented control that
 * doesn't move on press reads as one that didn't hear the press.
 */
export function GroupToggle({ current }: { current: GroupMode }) {
  const [shown, setShown] = useOptimistic(current);

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5">
      {OPTIONS.map(({ mode, label, title }) => {
        const active = mode === shown;
        return (
          <form
            key={mode}
            action={async () => {
              setShown(mode);
              await setGroupMode(mode);
            }}
          >
            <button
              type="submit"
              aria-pressed={active}
              title={title}
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition ${
                active ? "chip-on" : "text-muted hover:text-text"
              }`}
            >
              {label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
