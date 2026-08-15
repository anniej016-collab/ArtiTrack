"use client";

import { useActionState } from "react";
import {
  importArtistAction,
  searchArtistsAction,
  type ImportState,
  type SearchState,
} from "@/lib/actions";

const emptySearch: SearchState = { query: "", results: [], error: null };
const emptyImport: ImportState = { message: null, error: null };

function ImportButton({
  artist,
}: {
  artist: { externalId: string; name: string; imageUrl: string | null };
}) {
  const [state, action, pending] = useActionState(importArtistAction, emptyImport);

  if (state.message) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">Added</span>;
  }

  return (
    <form action={action} className="flex shrink-0 items-center gap-2">
      <input type="hidden" name="externalId" value={artist.externalId} />
      <input type="hidden" name="name" value={artist.name} />
      <input type="hidden" name="imageUrl" value={artist.imageUrl ?? ""} />
      {/* Checked by default: an artist you're adding now is usually one you've
          already been listening to, so their back catalogue shouldn't flood the queue. */}
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
        <input
          type="checkbox"
          name="markListened"
          defaultChecked
          className="size-3.5 cursor-pointer"
        />
        Heard already
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && (
        <span className="max-w-40 text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}

export function ArtistSearch() {
  const [state, action, pending] = useActionState(searchArtistsAction, emptySearch);

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex gap-2">
        <input
          name="query"
          defaultValue={state.query}
          required
          placeholder="Search for an artist…"
          aria-label="Search for an artist"
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.query && !pending && state.results.length === 0 && !state.error && (
        <p className="text-sm text-zinc-500">
          No artists found for “{state.query}”.
        </p>
      )}

      {state.results.length > 0 && (
        <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {state.results.map((artist) => (
            <li
              key={artist.externalId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {artist.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time
                  <img
                    src={artist.imageUrl}
                    alt=""
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-9 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{artist.name}</p>
                  {artist.albumCount !== null && (
                    <p className="text-xs text-zinc-500">
                      {artist.albumCount} release{artist.albumCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
              <ImportButton artist={artist} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
