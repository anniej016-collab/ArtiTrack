"use client";

import { useState } from "react";

/**
 * Filters an artist list in place.
 *
 * Deliberately client-side: the whole list is already on the page, so filtering
 * here is instant where a round trip per keystroke would not be. That the whole
 * list is present is load-bearing rather than incidental — see the artist grid,
 * which is sent complete for exactly this reason while the release grids are
 * not.
 */
export function ArtistFilter({ targetId }: { targetId: string }) {
  const [query, setQuery] = useState("");

  return (
    <input
      type="search"
      value={query}
      placeholder="Filter…"
      aria-label="Filter artists by name"
      className="field w-28 px-2.5 py-1 text-xs sm:w-36"
      onChange={(event) => {
        const value = event.target.value;
        setQuery(value);

        const list = document.getElementById(targetId);
        if (!list) return;

        // Remember which preview clamp was on before interfering: cards are cut
        // to two rows, lists to six, and the list can be in either mode.
        if (list.dataset.clamp === undefined) {
          list.dataset.clamp = list.classList.contains("clamp-rows")
            ? "clamp-rows"
            : list.classList.contains("clamp-list")
              ? "clamp-list"
              : "";
        }

        const needle = value.trim().toLowerCase();

        // While filtering, the clamp has to come off: otherwise a match sitting
        // past the preview stays hidden and the filter looks broken.
        if (list.dataset.clamp) {
          list.classList.toggle(list.dataset.clamp, needle === "");
        }

        for (const item of list.querySelectorAll<HTMLElement>("li")) {
          const name = item.textContent?.toLowerCase() ?? "";
          item.hidden = needle !== "" && !name.includes(needle);
        }
      }}
    />
  );
}
