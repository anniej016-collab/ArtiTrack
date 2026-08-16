"use client";

import { useState } from "react";

/**
 * Filters an artist list in place.
 *
 * Deliberately client-side: the whole list is already on the page, so filtering
 * here is instant where a round trip per keystroke would not be.
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

        // Remember whether the list was clamped to two rows before interfering.
        if (list.dataset.clamped === undefined) {
          list.dataset.clamped = list.classList.contains("clamp-rows") ? "1" : "0";
        }

        const needle = value.trim().toLowerCase();

        // While filtering, the two-row clamp has to come off: otherwise a match
        // sitting in the third row stays hidden and the filter looks broken.
        if (list.dataset.clamped === "1") {
          list.classList.toggle("clamp-rows", needle === "");
        }

        for (const item of list.querySelectorAll<HTMLElement>("li")) {
          const name = item.textContent?.toLowerCase() ?? "";
          item.hidden = needle !== "" && !name.includes(needle);
        }
      }}
    />
  );
}
