"use client";

import { useState, type ReactNode } from "react";
import { MAX_FAVOURITE_SONGS } from "@/lib/favourites";

/**
 * The songs section of a release, with picking favourites folded into it.
 *
 * The rule this exists for: a heart shows only where one has been given. An
 * empty control on every row of every tracklist is a permanent nag to rate
 * things, on a page whose job is to list songs — so the empty ones appear only
 * while you are actually choosing, and go away again when you finish.
 *
 * Hover can't do that job here. Half the use of this app is on a touchscreen,
 * where there is no hover at all and a reveal-on-hover control simply never
 * appears. An explicit mode works the same way on both.
 */
export function FavouriteSongs({
  count,
  picked,
  children,
}: {
  /** How many songs the release has, for the heading. */
  count: number;
  /** How many are already favourites. */
  picked: number;
  children: ReactNode;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <section className={picking ? "picking-favourites" : undefined}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="eyebrow">Songs {count > 0 && `· ${count}`}</h2>

        {count > 0 && (
          <div className="flex items-center gap-2">
            {picking && (
              <span className="text-xs text-faint">
                {picked === MAX_FAVOURITE_SONGS
                  ? `${MAX_FAVOURITE_SONGS} picked — that's the limit`
                  : `${picked} of ${MAX_FAVOURITE_SONGS} picked`}
              </span>
            )}
            <button
              type="button"
              onClick={() => setPicking((on) => !on)}
              aria-pressed={picking}
              className="btn-ghost px-2.5 py-1 text-xs"
            >
              {picking ? "Done" : picked > 0 ? "Edit favourites" : "Pick favourites"}
            </button>
          </div>
        )}
      </div>

      {children}
    </section>
  );
}
