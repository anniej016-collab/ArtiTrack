import { prisma } from "@/lib/prisma";
import { buildLibraryIndex, type LibraryIndex } from "@/lib/discovery-match";

/**
 * Reads the library into the shape the check-out list matches against.
 *
 * Kept apart from the matching rules themselves so those stay testable without
 * a database. Only heard titles are fetched — an unheard one tells the
 * check-out list nothing it doesn't already assume.
 */
export async function loadLibraryIndex(): Promise<LibraryIndex> {
  const [artists, songs, releases] = await Promise.all([
    prisma.artist.findMany({ select: { id: true, name: true, status: true } }),
    prisma.song.findMany({
      where: { listened: true },
      select: { artistId: true, title: true },
    }),
    // Releases as well as songs: a lead can name a record rather than a track,
    // and a release is often heard before its tracklist has been fetched.
    prisma.release.findMany({
      where: { listened: true },
      select: { artistId: true, title: true },
    }),
  ]);

  return buildLibraryIndex({ artists, heard: [...songs, ...releases] });
}
