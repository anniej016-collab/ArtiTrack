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

/**
 * Every service's matches at once, each labelled with where it came from.
 *
 * For moving an artist between services, where stopping at the first that
 * answers is exactly wrong: an artist already on Spotify would only ever be
 * offered Spotify again, so there is no way back to Deezer. Adding an artist
 * still takes the first answer — there, one good match is the point and three
 * lists of the same person is a choice nobody wants.
 *
 * A service that fails is left out rather than taking the others with it.
 */
export async function searchEveryService(query: string): Promise<ProviderArtist[]> {
  // Deezer first here too, so the top match is from the service that actually
  // delivers a catalogue. Spotify is still on the list — reaching it is the
  // point of this panel — just not the default anyone lands on by pressing the
  // first row.
  const sources: ProviderKey[] = spotify.isConfigured()
    ? ["deezer", "spotify", "musicbrainz"]
    : ["deezer", "musicbrainz"];

  const found = await Promise.all(
    sources.map(async (key) => {
      try {
        return await PROVIDERS[key].searchArtists(query);
      } catch {
        return [];
      }
    }),
  );

  return found.flat();
}

/** Whether Spotify has credentials. Without them the search skips it silently. */
export function isSpotifyConfigured(): boolean {
  return spotify.isConfigured();
}

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
 * Searches Deezer, then MusicBrainz, stopping at the first that answers.
 *
 * Spotify is deliberately not in this chain, though it is registered and
 * reachable. It was put in front of Deezer because its catalogue is fuller —
 * Deezer is quietly missing releases that plainly exist — and it has not yet
 * been made to work: pointing an artist at it fetched no releases. Leading with
 * a service that cannot deliver a catalogue means every newly added artist
 * arrives empty, which is worse than an incomplete one.
 *
 * So Deezer leads again until that is fixed. Spotify is still offered by name
 * in the move-an-artist flow, where it is a deliberate choice rather than a
 * silent default, and where an artist's existing releases stay put if it fails.
 *
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
