import { songKey } from "@/lib/song-identity";

/**
 * Works out what the check-out list already knows about from the tracker.
 *
 * A pasted playlist is unfiltered by definition — it will contain artists
 * already followed and songs already ticked off. Adding those as fresh leads
 * would rebuild, by hand, the very backlog the tracker exists to clear. So
 * every row is checked against the library and says what it finds.
 *
 * Nothing is dropped on the strength of a match. Matching is by name, which is
 * good enough to point at but not good enough to delete on: two artists share a
 * name often enough, and a playlist entry can be a different recording.
 */

export type LibraryIndex = {
  artistsByName: Map<string, { id: string; name: string; paused: boolean }>;
  /** `artistId|titleKey` for every song already marked heard. */
  heardTitles: Set<string>;
};

export type DiscoveryMatch = {
  /** Set when the artist is in the library, whether followed or paused. */
  artistId: string | null;
  paused: boolean;
  /** The named song or record is already marked heard under that artist. */
  heard: boolean;
};

export const NO_MATCH: DiscoveryMatch = { artistId: null, paused: false, heard: false };

/**
 * Artist names are compared with the punctuation and case removed, so
 * "Sault" and "SAULT", or "Tyler, The Creator" and "Tyler the Creator", meet.
 */
export function nameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function buildLibraryIndex({
  artists,
  heard,
}: {
  artists: { id: string; name: string; status: string }[];
  /** Titles already marked heard, as song titles or release titles. */
  heard: { artistId: string; title: string }[];
}): LibraryIndex {
  const artistsByName = new Map<string, { id: string; name: string; paused: boolean }>();
  for (const artist of artists) {
    // First one wins: two artists sharing a name is rare, and either is as good
    // a thing to point at as the other.
    const key = nameKey(artist.name);
    if (!artistsByName.has(key)) {
      artistsByName.set(key, {
        id: artist.id,
        name: artist.name,
        paused: artist.status === "PAUSED",
      });
    }
  }

  return {
    artistsByName,
    // songKey is a title normaliser: it folds "(Deluxe)" and "2011 Remaster"
    // away, which is exactly what a playlist entry needs to meet a release by.
    heardTitles: new Set(heard.map((item) => `${item.artistId}|${songKey(item.title)}`)),
  };
}

export function matchDiscovery(
  item: { artistName: string; title: string | null },
  index: LibraryIndex,
): DiscoveryMatch {
  const artist = index.artistsByName.get(nameKey(item.artistName));
  if (!artist) return NO_MATCH;

  return {
    artistId: artist.id,
    paused: artist.paused,
    // Only a named song or record can be already heard; an artist on their own
    // is a lead to explore, not one thing to tick off.
    heard: item.title
      ? index.heardTitles.has(`${artist.id}|${songKey(item.title)}`)
      : false,
  };
}
