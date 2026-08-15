import { prisma } from "@/lib/prisma";
import {
  PROVIDER_KEY,
  fetchArtistReleases,
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
        listenedAt: markListened ? new Date() : null,
      },
      // Refresh metadata that can change upstream, but never touch listenedAt:
      // that is the user's own record, not the provider's.
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
