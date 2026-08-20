"use client";

import { useActionState, useEffect, useState } from "react";
import {
  importArtistAction,
  searchArtistsAction,
  type ImportState,
  type SearchState,
} from "@/lib/actions";
import { CheckIcon, VinylIcon } from "@/components/icons";
import { SourceBadge } from "@/components/SearchSourceNote";

const emptySearch: SearchState = {
  query: "",
  results: [],
  usedFallback: false,
  spotifyConfigured: true,
  error: null,
};
const emptyImport: ImportState = { message: null, error: null };

function ImportButton({
  artist,
  onImported,
}: {
  artist: {
    source: string;
    externalId: string;
    name: string;
    imageUrl: string | null;
  };
  onImported: (name: string) => void;
}) {
  const [state, action, pending] = useActionState(importArtistAction, emptyImport);

  // Reported upward rather than shown here: once an artist is in, the whole
  // search is finished with, and the confirmation replaces it.
  useEffect(() => {
    if (state.message) onImported(artist.name);
  }, [state.message, artist.name, onImported]);

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

export function ArtistSearch({
  /** Filled in when arriving from the check-out list, ready to search. */
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [state, action, pending] = useActionState(searchArtistsAction, emptySearch);
  /*
   * The search is a means to an end: once the artist you were after is added,
   * leaving the box filled and the list hanging open means clearing it out by
   * hand before anything else can be done. Adding one closes the whole thing
   * and says so instead.
   */
  const [added, setAdded] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const finished = added !== null;

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex gap-2">
        <input
          name="query"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setAdded(null);
          }}
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

      {finished && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckIcon className="size-4" /> Added {added}.
        </p>
      )}

      {!finished && state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      {!finished &&
        state.query &&
        !pending &&
        state.results.length === 0 &&
        !state.error && (
          <p className="text-sm text-faint">No artists found for “{state.query}”.</p>
        )}

      {!finished && state.usedFallback && state.results.length > 0 && (
        <p className="text-xs text-faint">
          Not on Deezer, so these come from MusicBrainz instead — releases only, no
          artwork or song lists.
        </p>
      )}

      {!finished && state.results.length > 0 && (
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
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{artist.name}</p>
                    <SourceBadge source={artist.source} />
                  </div>
                  {artist.albumCount !== null && (
                    <p className="text-xs text-faint">
                      {artist.albumCount} release{artist.albumCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
              <ImportButton
                artist={artist}
                onImported={(name) => {
                  setAdded(name);
                  setQuery("");
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
