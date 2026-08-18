import * as deezer from "@/lib/providers/deezer";
import * as musicbrainz from "@/lib/providers/musicbrainz";
import type {
  ProviderArtist,
  ProviderRelease,
  ProviderTrack,
} from "@/lib/providers/deezer";

export type { ProviderArtist, ProviderRelease, ProviderTrack };

export type ProviderKey = "deezer" | "musicbrainz";

type Provider = {
  key: ProviderKey;
  label: string;
  searchArtists: (query: string) => Promise<ProviderArtist[]>;
  fetchArtistReleases: (externalId: string) => Promise<ProviderRelease[]>;
  /** One artist's own record, for a picture that may have changed since. */
  fetchArtist?: (externalId: string) => Promise<ProviderArtist | null>;
  /** Not every source exposes tracklists cheaply enough to be worth fetching. */
  fetchReleaseTracks?: (externalId: string) => Promise<ProviderTrack[]>;
};

const PROVIDERS: Record<ProviderKey, Provider> = {
  deezer: {
    key: "deezer",
    label: "Deezer",
    searchArtists: deezer.searchArtists,
    fetchArtistReleases: deezer.fetchArtistReleases,
    fetchArtist: deezer.fetchArtist,
    fetchReleaseTracks: deezer.fetchReleaseTracks,
  },
  musicbrainz: {
    key: "musicbrainz",
    label: "MusicBrainz",
    searchArtists: musicbrainz.searchArtists,
    fetchArtistReleases: musicbrainz.fetchArtistReleases,
    // No fetchArtist either: MusicBrainz carries no artwork at all, so there is
    // never a newer picture to go and get.
    // Reaching a tracklist here means a request per release and then per
    // recording, which is far too many to be worth it.
  },
};

export function getProvider(source: string): Provider | null {
  return PROVIDERS[source as ProviderKey] ?? null;
}

/** Every source a release list can be re-fetched from, for database filters. */
export const SYNCABLE_SOURCES = Object.keys(PROVIDERS) as ProviderKey[];

/** The subset of those that can also produce song lists. */
export const TRACK_SOURCES = SYNCABLE_SOURCES.filter(
  (key) => PROVIDERS[key].fetchReleaseTracks !== undefined,
);

export function providerLabel(source: string): string {
  return getProvider(source)?.label ?? source;
}

/** Whether releases can be re-checked for this artist at all. */
export function isSyncableSource(source: string): boolean {
  return getProvider(source) !== null;
}

/** Whether song lists can be fetched for this artist. */
export function supportsTracks(source: string): boolean {
  return getProvider(source)?.fetchReleaseTracks !== undefined;
}

/**
 * Searches Deezer, falling back to MusicBrainz when it finds nothing.
 *
 * Deezer is the better source when it has the artist — real artwork, clean
 * types — but it only carries what it licenses. MusicBrainz is
 * community-maintained and covers independent, regional and older material that
 * never reaches a streaming catalogue.
 */
export async function searchArtistsEverywhere(
  query: string,
): Promise<{ results: ProviderArtist[]; usedFallback: boolean }> {
  const primary = await PROVIDERS.deezer.searchArtists(query);
  if (primary.length > 0) return { results: primary, usedFallback: false };

  try {
    return {
      results: await PROVIDERS.musicbrainz.searchArtists(query),
      usedFallback: true,
    };
  } catch {
    // A failing fallback should read as "nothing found", not as an error for a
    // search that already succeeded.
    return { results: [], usedFallback: false };
  }
}
