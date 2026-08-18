import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Everything in the tracker as one JSON file.
 *
 * Which releases and songs have been heard is hand-entered and cannot be
 * re-fetched from anywhere, so it is the one part of this app that is genuinely
 * irreplaceable. Hosted databases on free tiers get paused and deleted; this is
 * the escape hatch.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const artists = await prisma.artist.findMany({
    orderBy: { name: "asc" },
    include: {
      releases: {
        orderBy: { releaseDate: "desc" },
        include: { tracks: { orderBy: { position: "asc" } } },
      },
      songs: { orderBy: { title: "asc" } },
    },
  });

  // Hand-entered too, and nowhere else to get it back from.
  const discoveries = await prisma.discovery.findMany({
    orderBy: { createdAt: "desc" },
  });

  const body = {
    exportedAt: new Date().toISOString(),
    format: "artitrack-export-v1",
    artistCount: artists.length,
    checkOut: discoveries.map((item) => ({
      artistName: item.artistName,
      title: item.title,
      note: item.note,
      heard: item.heard,
      heardAt: item.heardAt,
      addedAt: item.createdAt,
    })),
    artists: artists.map((artist) => ({
      name: artist.name,
      status: artist.status,
      pausedAt: artist.pausedAt,
      notes: artist.notes,
      source: artist.source,
      externalId: artist.externalId,
      addedAt: artist.createdAt,
      lastSyncedAt: artist.lastSyncedAt,
      songs: artist.songs.map((song) => ({
        title: song.title,
        listened: song.listened,
        listenedAt: song.listenedAt,
      })),
      releases: artist.releases.map((release) => ({
        title: release.title,
        type: release.type,
        releaseDate: release.releaseDate,
        listened: release.listened,
        listenedAt: release.listenedAt,
        setAside: release.setAside,
        // Out of five, halves included — the scale as it reads on screen. The
        // doubled integer behind it is a storage detail and would be read as a
        // rating out of ten by anyone opening this file.
        rating: release.rating === null ? null : release.rating / 2,
        notes: release.notes,
        externalId: release.externalId,
        tracks: release.tracks.map((track) => ({
          position: track.position,
          title: track.title,
          duration: track.duration,
          isrc: track.isrc,
        })),
      })),
    })),
  };

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="artitrack-${stamp}.json"`,
      // A backup should never be served from a cache.
      "cache-control": "no-store",
    },
  });
}
