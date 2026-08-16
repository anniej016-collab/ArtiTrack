import { prisma } from "@/lib/prisma";
import { songKey } from "@/lib/song-identity";
import type { ImportedRelease } from "@/lib/import/discography";

/**
 * Writes an imported discography into the tracker.
 *
 * Written in bulk rather than a record at a time. A couple of hundred releases
 * carrying a thousand songs would be several thousand round trips one by one,
 * which no serverless request budget survives; this is a fixed handful of
 * queries however large the file is.
 *
 * Re-importing an updated file corrects what changed and leaves everything else
 * alone — including what you have marked as heard, which is yours and never the
 * file's to overwrite.
 */

/** Marks these artists as belonging to a file rather than a music service. */
export const IMPORT_SOURCE = "import";

export type ApplyResult = {
  artistsAdded: number;
  releasesAdded: number;
  releasesUpdated: number;
  tracksWritten: number;
};

export async function applyImport(
  releases: ImportedRelease[],
  { markListened }: { markListened: boolean },
): Promise<ApplyResult> {
  const names = [...new Set(releases.map((release) => release.artistName))];

  const before = await prisma.artist.findMany({
    where: { source: IMPORT_SOURCE, externalId: { in: names } },
    select: { id: true, externalId: true },
  });
  const known = new Set(before.map((artist) => artist.externalId));

  await prisma.artist.createMany({
    data: names
      .filter((name) => !known.has(name))
      .map((name) => ({ name, source: IMPORT_SOURCE, externalId: name })),
    skipDuplicates: true,
  });

  const artists = await prisma.artist.findMany({
    where: { source: IMPORT_SOURCE, externalId: { in: names } },
    select: { id: true, externalId: true },
  });
  const artistIdByName = new Map(
    artists.flatMap((artist) => (artist.externalId ? [[artist.externalId, artist.id]] : [])),
  );

  // Everything these artists already hold, not just the keys in this file: a
  // release whose title was corrected upstream no longer matches its old key
  // and has to be recognised some other way.
  const existing = await prisma.release.findMany({
    where: { artistId: { in: [...artistIdByName.values()] }, importKey: { not: null } },
    select: {
      id: true,
      artistId: true,
      importKey: true,
      title: true,
      releaseDate: true,
      coverUrl: true,
      notes: true,
      _count: { select: { tracks: true } },
    },
  });
  const existingByKey = new Map(
    existing.map((release) => [`${release.artistId}|${release.importKey}`, release]),
  );

  const fresh: ImportedRelease[] = [];
  const changed: { id: string; release: ImportedRelease }[] = [];
  /** Releases whose songs still need writing, by the key they are found under. */
  const needTracks = new Set<string>();
  /** Rows already accounted for, so a rename can't steal one twice. */
  const claimed = new Set<string>();
  const fileKeys = new Set(
    releases.flatMap((release) => {
      const artistId = artistIdByName.get(release.artistName);
      return artistId ? [`${artistId}|${release.externalId}`] : [];
    }),
  );

  const pending: { key: string; artistId: string; release: ImportedRelease }[] = [];

  for (const release of releases) {
    const artistId = artistIdByName.get(release.artistName);
    if (!artistId) continue;

    const key = `${artistId}|${release.externalId}`;
    const already = existingByKey.get(key);

    if (!already) {
      pending.push({ key, artistId, release });
      continue;
    }
    claimed.add(already.id);

    if (hasChanged(already, release)) changed.push({ id: already.id, release });

    // Only rewrite a tracklist that isn't there or has changed length; an
    // unchanged re-import should touch nothing.
    if (release.tracks.length > 0 && already._count.tracks !== release.tracks.length) {
      needTracks.add(key);
    }
  }

  /*
   * A record with no matching key is usually new, but it may be one already
   * held under its old title. Same artist and same release date, with exactly
   * one unclaimed candidate, is specific enough to be a rename rather than a
   * coincidence — and only rows this importer wrote are eligible, so nothing
   * logged by hand is ever hijacked.
   */
  for (const { key, artistId, release } of pending) {
    const candidates = existing.filter(
      (row) =>
        row.artistId === artistId &&
        !claimed.has(row.id) &&
        !fileKeys.has(`${row.artistId}|${row.importKey}`) &&
        row.releaseDate.getTime() === release.releaseDate.getTime(),
    );

    if (candidates.length === 1) {
      const renamed = candidates[0];
      claimed.add(renamed.id);
      changed.push({ id: renamed.id, release });
      if (release.tracks.length > 0 && renamed._count.tracks !== release.tracks.length) {
        needTracks.add(key);
      }
      continue;
    }

    fresh.push(release);
    if (release.tracks.length > 0) needTracks.add(key);
  }

  if (fresh.length > 0) {
    await prisma.release.createMany({
      data: fresh.map((release) => ({
        artistId: artistIdByName.get(release.artistName)!,
        importKey: release.externalId,
        title: release.title,
        type: release.type,
        releaseDate: release.releaseDate,
        coverUrl: release.coverUrl,
        notes: release.notes,
        listened: markListened,
        // No date, for the same reason an imported back catalogue carries none:
        // the file says when it came out, not when you heard it.
        listenedAt: null,
        tracksSyncedAt: release.tracks.length > 0 ? new Date() : null,
      })),
      skipDuplicates: true,
    });
  }

  // Bounded by how much the file actually changed, which is nothing on a
  // re-import of the same copy.
  for (const { id, release } of changed) {
    await prisma.release.update({
      where: { id },
      data: {
        title: release.title,
        type: release.type,
        releaseDate: release.releaseDate,
        // Only where the file has something to say. A release the file gives no
        // cover for may have picked one up from a service since, and silence in
        // the file is not an instruction to throw that away.
        ...(release.coverUrl ? { coverUrl: release.coverUrl } : {}),
        ...(release.notes ? { notes: release.notes } : {}),
        // Carries the new key too, so the next import matches it outright.
        importKey: release.externalId,
      },
    });
  }

  const tracksWritten = await writeTracks(releases, artistIdByName, needTracks, {
    markListened,
  });

  return {
    artistsAdded: names.length - known.size,
    releasesAdded: fresh.length,
    releasesUpdated: changed.length,
    tracksWritten,
  };
}

/**
 * Whether the file actually says something different from what is stored.
 *
 * Absence in the file counts as no opinion rather than as a deletion, so a
 * cover or note picked up elsewhere survives a re-import — otherwise every
 * import would undo what a sync had just filled in, and each would report the
 * other's work as a change.
 */
function hasChanged(
  current: { title: string; releaseDate: Date; coverUrl: string | null; notes: string | null },
  incoming: ImportedRelease,
): boolean {
  if (current.title !== incoming.title) return true;
  if (current.releaseDate.getTime() !== incoming.releaseDate.getTime()) return true;
  if (incoming.coverUrl && incoming.coverUrl !== current.coverUrl) return true;
  if (incoming.notes && incoming.notes !== current.notes) return true;
  return false;
}

async function writeTracks(
  releases: ImportedRelease[],
  artistIdByName: Map<string, string>,
  needTracks: Set<string>,
  { markListened }: { markListened: boolean },
): Promise<number> {
  const wanted = releases.filter((release) => {
    const artistId = artistIdByName.get(release.artistName);
    return artistId && needTracks.has(`${artistId}|${release.externalId}`);
  });
  if (wanted.length === 0) return 0;

  // Songs first: a track has to point at one, and the same song turns up
  // across a unit's singles, albums and repackages.
  const songRows = new Map<string, { artistId: string; key: string; title: string }>();
  for (const release of wanted) {
    const artistId = artistIdByName.get(release.artistName)!;
    for (const track of release.tracks) {
      const key = songKey(track.title);
      const id = `${artistId}|${key}`;
      if (!songRows.has(id)) songRows.set(id, { artistId, key, title: track.title });
    }
  }

  await prisma.song.createMany({ data: [...songRows.values()], skipDuplicates: true });

  const artistIds = [...new Set(wanted.map((r) => artistIdByName.get(r.artistName)!))];
  const songs = await prisma.song.findMany({
    where: { artistId: { in: artistIds } },
    select: { id: true, artistId: true, key: true },
  });
  const songIdByKey = new Map(songs.map((song) => [`${song.artistId}|${song.key}`, song.id]));

  const ids = await prisma.release.findMany({
    where: {
      artistId: { in: artistIds },
      importKey: { in: wanted.map((release) => release.externalId) },
    },
    select: { id: true, artistId: true, importKey: true },
  });
  const releaseIdByKey = new Map(
    ids.map((release) => [`${release.artistId}|${release.importKey}`, release.id]),
  );

  // Replaced wholesale: the file is the authority on what is on a record, and
  // listening state lives on the song, so nothing of yours is lost.
  const releaseIds = [...releaseIdByKey.values()];
  await prisma.track.deleteMany({ where: { releaseId: { in: releaseIds } } });

  const rows = wanted.flatMap((release) => {
    const artistId = artistIdByName.get(release.artistName)!;
    const releaseId = releaseIdByKey.get(`${artistId}|${release.externalId}`);
    if (!releaseId) return [];

    return release.tracks.map((track) => ({
      releaseId,
      title: track.title,
      position: track.position,
      songId: songIdByKey.get(`${artistId}|${songKey(track.title)}`) ?? null,
    }));
  });

  await prisma.track.createMany({ data: rows });

  if (markListened) {
    // Everything imported counts as heard, so its songs do too — again with no
    // date invented for them.
    await prisma.song.updateMany({
      where: { artistId: { in: artistIds }, listened: false },
      data: { listened: true },
    });
  }

  await prisma.release.updateMany({
    where: { id: { in: releaseIds } },
    data: { tracksSyncedAt: new Date() },
  });

  return rows.length;
}
