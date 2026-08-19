"use client";

import { useActionState, useState, useTransition } from "react";
import {
  linkArtistForSync,
  searchArtistsAction,
  type SearchState,
} from "@/lib/actions";
import { VinylIcon } from "@/components/icons";
import { providerLabel } from "@/lib/providers";

const empty: SearchState = { query: "", results: [], usedFallback: false, error: null };

/**
 * Attaches an artist already in the library to a music service, or moves them
 * to a different one.
 *
 * Two jobs that are the same operation. One is a catalogue kept as a file or
 * added by hand, where the releases are here but nothing was watching for new
 * ones. The other is an artist already being watched by a service that turns
 * out to be missing records — which had no way out at all until now, because
 * this control only appeared when nothing was attached. Being told to move an
 * artist and finding no way to do it is worse than not offering it.
 *
 * Matching is a choice rather than a guess, because a name alone is not enough
 * to be sure which act is meant — particularly for a group whose units all
 * share a prefix.
 */
export function LinkForSync({
  artistId,
  artistName,
  /** The service watching them now, if any. */
  currentSource,
}: {
  artistId: string;
  artistName: string;
  currentSource?: string | null;
}) {
  const [state, action, searching] = useActionState(searchArtistsAction, empty);
  const [linking, startLinking] = useTransition();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost px-3 py-1.5 text-xs font-medium"
      >
        {currentSource
          ? "Check a different service for their releases"
          : "Check for new releases automatically"}
      </button>
    );
  }

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-medium">Which one are they?</p>
        <p className="mt-1 text-xs text-faint">
          {currentSource
            ? `Pick the match and their releases will come from there instead of
               ${providerLabel(currentSource)}. Everything already here stays — records
               both services list are recognised rather than added twice, and what you
               have marked heard is untouched.`
            : `Pick the match and new releases will arrive with the nightly check.
               What's already here stays, and anything the service also lists is
               recognised rather than added twice.`}
        </p>
      </div>

      <form action={action} className="flex gap-2">
        <input
          name="query"
          defaultValue={artistName}
          required
          aria-label="Search for the matching artist"
          className="field w-full px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="btn-primary shrink-0 px-4 py-2 text-sm"
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {state.query && !searching && state.results.length === 0 && !state.error && (
        <p className="text-sm text-faint">Nothing found for “{state.query}”.</p>
      )}

      {state.results.length > 0 && (
        <ul className="divide-y divide-line">
          {state.results.map((result) => (
            <li
              key={`${result.source}:${result.externalId}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {result.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
                  <img
                    src={result.imageUrl}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5">
                    <VinylIcon className="size-4 text-white/25" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm">{result.name}</p>
                  {result.albumCount !== null && (
                    <p className="text-xs text-faint">{result.albumCount} releases</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={linking}
                onClick={() =>
                  startLinking(async () => {
                    await linkArtistForSync(
                      artistId,
                      result.source,
                      result.externalId,
                      result.imageUrl,
                    );
                  })
                }
                className="btn-primary shrink-0 px-3 py-1.5 text-xs"
              >
                {linking ? "Linking…" : "This one"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="w-fit text-xs text-faint transition-colors hover:text-text"
      >
        Cancel
      </button>
    </div>
  );
}
