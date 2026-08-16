"use client";

import { useActionState } from "react";
import {
  importArtistAction,
  searchArtistsAction,
  type ImportState,
  type SearchState,
} from "@/lib/actions";
import { CheckIcon, VinylIcon } from "@/components/icons";

const emptySearch: SearchState = {
  query: "",
  results: [],
  usedFallback: false,
  error: null,
};
const emptyImport: ImportState = { message: null, error: null };

function ImportButton({
  artist,
}: {
  artist: {
    source: string;
    externalId: string;
    name: string;
    imageUrl: string | null;
  };
}) {
  const [state, action, pending] = useActionState(importArtistAction, emptyImport);

  if (state.message) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-success">
        <CheckIcon className="size-3.5" /> Added
      </span>
    );
  }

  return (
    <form action={action} className="flex shrink-0 items-center gap-2.5">
      <input type="hidden" name="source" value={artist.source} />
      <input type="hidden" name="externalId" value={artist.externalId} />
      <input type="hidden" name="name" value={artist.name} />
      <input type="hidden" name="imageUrl" value={artist.imageUrl ?? ""} />
      {/* Checked by default: an artist you're adding now is usually one you've
          already been listening to, so their back catalogue shouldn't flood the
          queue. Visible on every screen size — hiding it on small ones left no
          way to import a catalogue as unheard from a phone. */}
      <label
        className="flex cursor-pointer items-center gap-1.5 text-xs text-faint transition-colors hover:text-muted"
        title="Mark their existing releases as already heard"
      >
        <input
          type="checkbox"
          name="markListened"
          defaultChecked
          className="size-3.5 shrink-0 cursor-pointer accent-violet-500"
        />
        <span className="sm:hidden">Heard</span>
        <span className="hidden sm:inline">Heard already</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-3.5 py-1.5 text-xs"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && (
        <span className="max-w-36 text-xs text-red-400">{state.error}</span>
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
          className="field w-full px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary shrink-0 px-5 py-2.5 text-sm"
        >
          {pending ? "…" : "Search"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      {state.query && !pending && state.results.length === 0 && !state.error && (
        <p className="text-sm text-faint">No artists found for “{state.query}”.</p>
      )}

      {state.usedFallback && state.results.length > 0 && (
        <p className="text-xs text-faint">
          Not on Deezer, so these come from MusicBrainz instead — releases only, no
          artwork or song lists.
        </p>
      )}

      {state.results.length > 0 && (
        <ul className="panel divide-y divide-line overflow-hidden">
          {state.results.map((artist) => (
            <li
              key={`${artist.source}:${artist.externalId}`}
              className="row-hover flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {artist.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
                  <img
                    src={artist.imageUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/5">
                    <VinylIcon className="size-5 text-white/25" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{artist.name}</p>
                  {artist.albumCount !== null && (
                    <p className="text-xs text-faint">
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
