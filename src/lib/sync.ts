import { prisma } from "@/lib/prisma";
import { songKey } from "@/lib/song-identity";
import {
  PROVIDER_KEY,
  fetchArtistReleases,
  fetchReleaseTracks,
  type ProviderRelease,
} from "@/lib/providers/deezer";

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
  { markListened }: { markListened: boolean },
): Promise<SyncResult> {
  const existing = await prisma.release.findMany({
    where: { artistId, externalId: { not: null } },
    select: { externalId: true },
  });
  const known = new Set(existing.map((release) => release.externalId));

  let added = 0;
  let updated = 0;

  for (const release of releases) {
    const isNew = !known.has(release.externalId);

    await prisma.release.upsert({
      where: {
        artistId_externalId: { artistId, externalId: release.externalId },
      },
      create: {
        artistId,
        externalId: release.externalId,
        title: release.title,
        type: release.type,
        releaseDate: release.releaseDate,
        coverUrl: release.coverUrl,
        listened: markListened,
        listenedAt: null,
      },
      // Refresh metadata that can change upstream, but never touch the listened
      // fields: those are the user's own record, not the provider's.
      update: {
        title: release.title,
        type: release.type,
        releaseDate: release.releaseDate,
        coverUrl: release.coverUrl,
      },
    });

    if (isNew) added += 1;
    else updated += 1;
  }

  return { added, updated };
}

/**
 * Pulls the latest releases for one artist.
 *
 * Paused artists are skipped. Not fetching new releases for them is the entire
 * point of pausing, so this is enforced here rather than left to callers.
 */
export async function syncArtist(artistId: string): Promise<SyncResult | null> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, status: true, source: true, externalId: true },
  });

  if (!artist) return null;
  if (artist.status === "PAUSED") return null;
  if (artist.source !== PROVIDER_KEY || !artist.externalId) return null;

  const releases = await fetchArtistReleases(artist.externalId);
  const result = await persistReleases(artist.id, releases, {
    markListened: false,
  });

  await prisma.artist.update({
    where: { id: artist.id },
    data: { lastSyncedAt: new Date() },
  });

  return result;
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

export async function syncAllActive(): Promise<SyncAllResult> {
  const artists = await prisma.artist.findMany({
    where: { status: "ACTIVE", source: PROVIDER_KEY, externalId: { not: null } },
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

/**
 * Fetches and stores the tracklist for one release.
 *
 * Existing rows are updated rather than replaced, so listening marks survive a
 * refetch. Returns null when the release has no provider to fetch from.
 */
export async function syncReleaseTracks(releaseId: string): Promise<number | null> {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { id: true, artistId: true, externalId: true, artist: { select: { source: true } } },
  });

  if (!release?.externalId || release.artist.source !== PROVIDER_KEY) return null;

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

  await discardSongsWithoutTracks(release.artistId);

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
async function discardSongsWithoutTracks(artistId: string) {
  await prisma.song.deleteMany({ where: { artistId, tracks: { none: {} } } });
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
      artist: { source: PROVIDER_KEY },
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

  return { fetched, remaining: Math.max(0, pending.length - batch.length), failed };
}
