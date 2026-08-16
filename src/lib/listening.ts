import { prisma } from "@/lib/prisma";

/**
 * Keeps "heard the release" and "heard its songs" agreeing with each other.
 *
 * They are two views of one fact. Hearing an album means hearing everything on
 * it, and ticking off the last song on an album means the album is done — so
 * either edge, changed on its own, leaves the other lying. This module moves
 * the change across.
 *
 * Because a song belongs to the artist rather than to one release, the effect
 * reaches sideways too: hearing the deluxe edition marks the songs it shares
 * with the standard album, which completes the standard album as well. That is
 * the point — the same music shouldn't need ticking off once per package.
 */

/**
 * What a change reached, so the caller can refresh exactly those pages.
 *
 * Revalidating the whole tree instead would be simpler, but every tick of a
 * checkbox would then re-render the entire app, and the UI visibly lagged
 * behind the click.
 */
export type Touched = {
  artistId: string | null;
  releaseIds: string[];
};

/** Releases whose completeness could have changed when these songs changed. */
async function releasesCarrying(songIds: string[]): Promise<string[]> {
  if (songIds.length === 0) return [];

  const tracks = await prisma.track.findMany({
    where: { songId: { in: songIds } },
    select: { releaseId: true },
    distinct: ["releaseId"],
  });

  return tracks.map((track) => track.releaseId);
}

/**
 * Re-derives each release's heard flag from the songs on it.
 *
 * A release with no tracks is left alone: "every song is heard" is vacuously
 * true of an empty tracklist, and applying that would mark a whole unfetched
 * back catalogue as heard.
 */
async function deriveReleasesFromSongs(releaseIds: string[]): Promise<void> {
  if (releaseIds.length === 0) return;

  const releases = await prisma.release.findMany({
    where: { id: { in: releaseIds } },
    select: {
      id: true,
      listened: true,
      listenedAt: true,
      tracks: { select: { song: { select: { listened: true } } } },
    },
  });

  for (const release of releases) {
    if (release.tracks.length === 0) continue;

    const complete = release.tracks.every((track) => track.song?.listened === true);
    if (complete === release.listened) continue;

    await prisma.release.update({
      where: { id: release.id },
      data: {
        listened: complete,
        // An existing date is kept: it records when it was first heard, and
        // completing the last song doesn't rewrite that history.
        listenedAt: complete ? (release.listenedAt ?? new Date()) : null,
      },
    });
  }
}

/**
 * Marks a release heard or not, carrying the change down to its songs.
 *
 * Un-marking only releases songs that aren't heard by way of some other
 * release. Saying you haven't heard a compilation shouldn't un-hear the album
 * tracks it borrowed.
 */
export async function setReleaseListenedDeep(
  releaseId: string,
  listened: boolean,
): Promise<Touched> {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: {
      id: true,
      artistId: true,
      listenedAt: true,
      tracks: { select: { songId: true } },
    },
  });
  if (!release) return { artistId: null, releaseIds: [] };

  await prisma.release.update({
    where: { id: release.id },
    data: {
      listened,
      // Marking something now is a real, dated event, unlike an imported back
      // catalogue. Un-marking clears the date along with the flag.
      listenedAt: listened ? (release.listenedAt ?? new Date()) : null,
    },
  });

  const songIds = [
    ...new Set(
      release.tracks.flatMap((track) => (track.songId ? [track.songId] : [])),
    ),
  ];
  if (songIds.length === 0) {
    return { artistId: release.artistId, releaseIds: [release.id] };
  }

  if (listened) {
    await prisma.song.updateMany({
      where: { id: { in: songIds }, listened: false },
      data: { listened: true, listenedAt: new Date() },
    });
  } else {
    // Songs still carried by another release that is itself marked heard.
    const heldElsewhere = await prisma.track.findMany({
      where: {
        songId: { in: songIds },
        releaseId: { not: release.id },
        release: { listened: true },
      },
      select: { songId: true },
      distinct: ["songId"],
    });
    const keep = new Set(heldElsewhere.map((track) => track.songId));

    await prisma.song.updateMany({
      where: { id: { in: songIds.filter((id) => !keep.has(id)) } },
      data: { listened: false, listenedAt: null },
    });
  }

  // Other releases sharing those songs may now be complete, or no longer be.
  const affected = (await releasesCarrying(songIds)).filter(
    (id) => id !== release.id,
  );
  await deriveReleasesFromSongs(affected);

  return { artistId: release.artistId, releaseIds: [release.id, ...affected] };
}

/**
 * Marks one song heard or not, then re-derives every release carrying it.
 *
 * This is the "one song, everywhere" rule: a song is the same song whether it
 * arrived as a single, an album track or a remaster.
 */
export async function setSongListenedDeep(
  songId: string,
  listened: boolean,
): Promise<Touched> {
  const song = await prisma.song.update({
    where: { id: songId },
    data: { listened, listenedAt: listened ? new Date() : null },
    select: { artistId: true },
  });

  const releaseIds = await releasesCarrying([songId]);
  await deriveReleasesFromSongs(releaseIds);

  return { artistId: song.artistId, releaseIds };
}

/**
 * Brings a freshly fetched tracklist into line with the release it belongs to.
 *
 * Tracklists arrive long after the release does. An imported back catalogue is
 * already marked heard, so the songs that turn up under it have been heard too
 * — without this, loading songs for an old favourite would report nought out of
 * twelve and drag the release back into the queue.
 */
export async function alignSongsWithRelease(releaseId: string): Promise<void> {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { listened: true, tracks: { select: { songId: true } } },
  });
  if (!release?.listened) return;

  const songIds = [
    ...new Set(
      release.tracks.flatMap((track) => (track.songId ? [track.songId] : [])),
    ),
  ];
  if (songIds.length === 0) return;

  await prisma.song.updateMany({
    where: { id: { in: songIds }, listened: false },
    // No date: the release itself may have been heard years before the import,
    // and inventing today's date would be a lie in the same way.
    data: { listened: true },
  });

  const affected = (await releasesCarrying(songIds)).filter((id) => id !== releaseId);
  await deriveReleasesFromSongs(affected);
}
