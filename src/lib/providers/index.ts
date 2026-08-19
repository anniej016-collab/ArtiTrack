import * as deezer from "@/lib/providers/deezer";
import * as spotify from "@/lib/providers/spotify";
import * as musicbrainz from "@/lib/providers/musicbrainz";
import type {
  ProviderArtist,
  ProviderRelease,
  ProviderTrack,
} from "@/lib/providers/deezer";

export type { ProviderArtist, ProviderRelease, ProviderTrack };

export type ProviderKey = "spotify" | "deezer" | "musicbrainz";

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
  spotify: {
    key: "spotify",
    label: "Spotify",
    searchArtists: spotify.searchArtists,
    fetchArtistReleases: spotify.fetchArtistReleases,
    fetchArtist: spotify.fetchArtist,
    fetchReleaseTracks: spotify.fetchReleaseTracks,
  },
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
 * Searches Spotify, then Deezer, then MusicBrainz, stopping at the first that
 * answers.
 *
 * Spotify leads because its catalogue is the fullest of the three, which is why
 * it was added: Deezer was quietly missing releases that plainly exist. Deezer
 * stays behind it — it needs no credentials, so it still works when Spotify is
 * unconfigured or refusing, and it carries some things Spotify does not.
 * MusicBrainz is last and covers what no streaming service does: independent,
 * regional and older material, with no artwork and no song lists.
 *
 * Each is tried in turn rather than merged. Two services describing the same
 * artist differently gives you two rows for one person and a choice nobody
 * should have to make.
 */
export async function searchArtistsEverywhere(
  query: string,
): Promise<{ results: ProviderArtist[]; usedFallback: boolean }> {
  if (spotify.isConfigured()) {
    try {
      const results = await PROVIDERS.spotify.searchArtists(query);
      if (results.length > 0) return { results, usedFallback: false };
    } catch {
      // Bad credentials or a service having a moment shouldn't take the search
      // down with it — there are two more to ask.
    }
  }

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
