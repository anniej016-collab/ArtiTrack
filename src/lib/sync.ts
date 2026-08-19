import { prisma } from "@/lib/prisma";
import { alignSongsWithRelease } from "@/lib/listening";
import { songKey } from "@/lib/song-identity";
import { releaseMatchKey } from "@/lib/release-match";
import {
  SYNCABLE_SOURCES,
  TRACK_SOURCES,
  getProvider,
  type ProviderRelease,
} from "@/lib/providers";

export type SyncResult = {
  added: number;
  updated: number;
};

/**
 * Writes a provider's release list into the database for one artist.
 *
 * `markListened` is used for an artist's back catalogue on first import: someone
 * who has followed a band for years has already heard those records, and putting
 * the whole discography in the To listen queue would bury genuinely new releases.
 * Later syncs pass false, so anything newly discovered surfaces as unlistened.
 *
 * Note that this marks them listened without a date. The import happened today;
 * the listening did not, and inventing a date would be wrong.
 */
export async function persistReleases(
  artistId: string,
  releases: ProviderRelease[],
  {
    markListened,
    /**
     * Whether anything found here is turning up *after* you started following,
     * as opposed to arriving with the artist.
     *
     * Only the caller knows: a first import and a later sync create rows the
     * same way, and nothing about a row says which it was afterwards.
     */
    newArrival = false,
  }: { markListened: boolean; newArrival?: boolean },
): Promise<SyncResult> {
  const existing = await prisma.release.findMany({
    where: { artistId },
    select: {
      id: true,
      externalId: true,
      title: true,
      releaseDate: true,
      coverUrl: true,
    },
  });
  const known = new Set(
    existing.flatMap((release) => (release.externalId ? [release.externalId] : [])),
  );

  /*
   * Releases this artist already has that the provider has never claimed —
   * imported from a file or logged by hand. A record can reach the tracker by
   * both routes, and without matching them the same album would appear twice:
   * once from the file with its tracklist, once from Deezer.
   */
  const unclaimed = new Map<string, string>();
  for (const release of existing) {
    if (release.externalId) continue;
    const key = releaseMatchKey(release.title, release.releaseDate);
    // Only where it is unambiguous; two records that normalise alike are left
    // alone rather than guessed at.
    unclaimed.set(key, unclaimed.has(key) ? "" : release.id);
  }

  let added = 0;
  let updated = 0;

  for (const release of releases) {
    if (known.has(release.externalId)) {
      await prisma.release.update({
        where: { artistId_externalId: { artistId, externalId: release.externalId } },
        // Refresh metadata that can change upstream, but never touch the
        // listened fields: those are the user's own record, not the provider's.
        data: {
          title: release.title,
          type: release.type,
          releaseDate: release.releaseDate,
          coverUrl: release.coverUrl,
        },
      });
      updated += 1;
      continue;
    }

    const match = unclaimed.get(releaseMatchKey(release.title, release.releaseDate));
    if (match) {
      // Adopt it: the row keeps its tracklist, notes and listened state, and
      // gains the provider id so later syncs recognise it outright.
      await prisma.release.update({
        where: { id: match },
        data: {
          externalId: release.externalId,
          // An imported cover is chosen; a provider's is whatever it has. Only
          // fill a gap.
          coverUrl: existing.find((row) => row.id === match)?.coverUrl ?? release.coverUrl,
        },
      });
      unclaimed.delete(releaseMatchKey(release.title, release.releaseDate));
      updated += 1;
      continue;
    }

    await prisma.release.create({
      data: {
        artistId,
        externalId: release.externalId,
        title: release.title,
        type: release.type,
        releaseDate: release.releaseDate,
        coverUrl: release.coverUrl,
        listened: markListened,
        listenedAt: null,
        arrivedAt: newArrival ? new Date() : null,
      },
    });
    added += 1;
  }

  return { added, updated };
}

/**
 * Pulls the latest releases for one artist.
 *
 * Paused artists are skipped. Not fetching new releases for them is the entire
 * point of pausing, so this is enforced here rather than left to callers.
 */
export async function syncArtist(
  artistId: string,
  {
    refreshImage = false,
    /**
     * Whether releases this finds count as having arrived while you were
     * following. False for the very first check after pointing an artist at a
     * service: what it turns up then is their back catalogue catching up, not
     * news, however new it is to this app.
     */
    newArrival = true,
  }: { refreshImage?: boolean; newArrival?: boolean } = {},
): Promise<SyncResult | null> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      status: true,
      syncSource: true,
      syncExternalId: true,
      imageUrl: true,
      imageUrlByHand: true,
    },
  });

  if (!artist) return null;
  if (artist.status === "PAUSED") return null;
  if (!artist.syncSource || !artist.syncExternalId) return null;

  const provider = getProvider(artist.syncSource);
  if (!provider) return null;

  const releases = await provider.fetchArtistReleases(artist.syncExternalId);
  const result = await persistReleases(artist.id, releases, {
    markListened: false,
    newArrival,
  });

  await prisma.artist.update({
    where: { id: artist.id },
    data: {
      lastSyncedAt: new Date(),
      ...(await freshImage(artist, provider, refreshImage)),
    },
  });

  return result;
}

/**
 * The artist's current picture from the service, when it is worth asking for.
 *
 * Only when *you* pressed check, never on the nightly run: a photo quietly
 * changing overnight across a whole follow list is a library that looks
 * different every morning for no reason you asked for. It also costs a second
 * request per artist, which the scheduled sweep can least afford.
 *
 * A picture typed in by hand is never replaced, and a failure here is
 * swallowed — the releases are what the sync is for, and losing them over a
 * photograph would be the wrong trade.
 */
async function freshImage(
  artist: {
    syncExternalId: string | null;
    imageUrl: string | null;
    imageUrlByHand: boolean;
  },
  provider: NonNullable<ReturnType<typeof getProvider>>,
  refreshImage: boolean,
): Promise<{ imageUrl?: string }> {
  if (!refreshImage) return {};
  if (artist.imageUrlByHand) return {};
  if (!provider.fetchArtist || !artist.syncExternalId) return {};

  try {
    const fetched = await provider.fetchArtist(artist.syncExternalId);
    // Absence is not a new picture: a service that returns nothing has no
    // opinion, and taking that as "delete the one you have" is how covers were
    // lost to re-imports before.
    if (!fetched?.imageUrl) return {};
    if (fetched.imageUrl === artist.imageUrl) return {};
    return { imageUrl: fetched.imageUrl };
  } catch {
    return {};
  }
}

/** Runs a few requests at a time so a large follow list stays within a request budget. */
async function inBatches<T>(
  items: T[],
  size: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(worker));
  }
}

export type SyncAllResult = {
  added: number;
  artistsSynced: number;
  failed: number;
};

/**
 * How many artists one run will check.
 *
 * Each artist is a separate request, so an unbounded sweep of a large follow
 * list would outlast a serverless request. Runs take the least-recently-checked
 * first, so successive runs work through everyone rather than repeating the
 * same few.
 */
export const SYNC_BATCH_SIZE = 25;

export async function syncAllActive(
  limit: number = SYNC_BATCH_SIZE,
): Promise<SyncAllResult> {
  const artists = await prisma.artist.findMany({
    where: {
      status: "ACTIVE",
      syncSource: { in: SYNCABLE_SOURCES },
      syncExternalId: { not: null },
    },
    // Nulls first: an artist never checked is the most overdue there is.
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: { id: true },
  });

  let added = 0;
  let artistsSynced = 0;
  let failed = 0;

  await inBatches(artists, 5, async (artist) => {
    try {
      const result = await syncArtist(artist.id);
      if (result) {
        added += result.added;
        artistsSynced += 1;
      }
    } catch {
      // One unreachable artist shouldn't abandon the rest of the sync.
      failed += 1;
    }
  });

  return { added, artistsSynced, failed };
}

/** Active, provider-backed artists still waiting to be checked. */
export async function countSyncableArtists(): Promise<number> {
  return prisma.artist.count({
    where: {
      status: "ACTIVE",
      syncSource: { in: SYNCABLE_SOURCES },
      syncExternalId: { not: null },
    },
  });
}

/**
 * Fetches and stores the tracklist for one release.
 *
 * Existing rows are updated rather than replaced, so listening marks survive a
 * refetch. Returns null when the release has no provider to fetch from.
 */
export async function syncReleaseTracks(releaseId: string): Promise<number | null> {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: {
      id: true,
      artistId: true,
      externalId: true,
      artist: { select: { syncSource: true } },
    },
  });

  if (!release?.externalId || !release.artist.syncSource) return null;

  // Some sources carry releases but no affordable way to reach a tracklist.
  const fetchReleaseTracks = getProvider(release.artist.syncSource)?.fetchReleaseTracks;
  if (!fetchReleaseTracks) return null;

  const tracks = await fetchReleaseTracks(release.externalId);

  for (const track of tracks) {
    const song = await resolveSong(release.artistId, track.title);

    await prisma.track.upsert({
      where: {
        releaseId_externalId: { releaseId: release.id, externalId: track.externalId },
      },
      create: {
        releaseId: release.id,
        externalId: track.externalId,
        title: track.title,
        position: track.position,
        duration: track.duration,
        isrc: track.isrc,
        songId: song.id,
      },
      // Listening state lives on the song, so nothing here can overwrite it.
      update: {
        title: track.title,
        position: track.position,
        duration: track.duration,
        isrc: track.isrc,
        songId: song.id,
      },
    });
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { tracksSyncedAt: new Date() },
  });

  // Cleaning up is the caller's job, once, rather than this function's every
  // time: run per release it was doing the same sweep of a whole artist's songs
  // once for each of them, and doing it while its neighbours were still writing
  // is what made the sweep dangerous in the first place.
  //
  // An already-heard release means its songs have been heard, whenever they
  // happen to arrive.
  await alignSongsWithRelease(release.id);

  return tracks.length;
}

/**
 * Finds the song a title belongs to, creating it if this is its first
 * appearance.
 *
 * The database migration folded existing tracks together with a weaker rule
 * than this one, so a title may still be sitting under its own unfolded song.
 * When that happens the two are merged here, keeping the listening state if
 * either side had it — going through this path is what repairs the backfill.
 */
async function resolveSong(artistId: string, title: string) {
  const key = songKey(title);

  const existing = await prisma.song.findUnique({
    where: { artistId_key: { artistId, key } },
  });
  if (existing) return existing;

  // A song left behind by the migration, keyed on the raw title.
  const legacyKey = title.toLowerCase().replace(/[^a-z0-9]+/gi, " ").trim();
  const legacy =
    legacyKey && legacyKey !== key
      ? await prisma.song.findUnique({
          where: { artistId_key: { artistId, key: legacyKey } },
        })
      : null;

  if (legacy) {
    return prisma.song.update({
      where: { id: legacy.id },
      data: { key, title },
    });
  }

  return prisma.song.create({ data: { artistId, key, title } });
}

/**
 * Removes songs nothing points at any more, which re-folding can leave behind.
 * Songs are derived from tracks, so an empty one carries no information.
 */
/**
 * How long a song is left alone after being created, however orphaned it looks.
 *
 * Tracklists are fetched several releases at a time, and a song is created a
 * moment before the track that points at it. Without a grace period one
 * release's cleanup deletes a song another release is midway through attaching
 * itself to — leaving a track with no song, which reads as "1 of 2 songs heard"
 * for ever, on a song that can no longer be ticked. A minute is far longer than
 * that window and far shorter than anything that matters: a genuine orphan is
 * swept by the next fetch.
 */
const SONG_GRACE_MS = 60_000;

export async function discardSongsWithoutTracks(artistId: string) {
  await prisma.song.deleteMany({
    where: {
      artistId,
      tracks: { none: {} },
      createdAt: { lt: new Date(Date.now() - SONG_GRACE_MS) },
    },
  });
}

/** How many releases one "load songs" press will fetch. */
export const TRACK_BATCH_SIZE = 12;

export type TrackBatchResult = {
  fetched: number;
  remaining: number;
  failed: number;
};

/**
 * Fills in tracklists for an artist's releases a batch at a time.
 *
 * Each release is a separate request, so a large discography can't be done in
 * one go inside a serverless request budget. The caller reports what's left and
 * the user can press again.
 */
export async function syncArtistTracks(artistId: string): Promise<TrackBatchResult> {
  const pending = await prisma.release.findMany({
    where: {
      artistId,
      externalId: { not: null },
      tracksSyncedAt: null,
      artist: { syncSource: { in: TRACK_SOURCES } },
    },
    orderBy: { releaseDate: "desc" },
    select: { id: true },
  });

  const batch = pending.slice(0, TRACK_BATCH_SIZE);
  let fetched = 0;
  let failed = 0;

  await inBatches(batch, 4, async (release) => {
    try {
      const count = await syncReleaseTracks(release.id);
      if (count !== null) fetched += 1;
    } catch {
      // One bad album shouldn't abandon the batch.
      failed += 1;
    }
  });

  // Once the batch has finished writing, never while it still is.
  await discardSongsWithoutTracks(artistId);

  return { fetched, remaining: Math.max(0, pending.length - batch.length), failed };
}
