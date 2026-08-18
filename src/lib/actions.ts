"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GROUP_MODE_COOKIE,
  QUEUE_FILTER_COOKIE,
  SECTION_STATE_COOKIE,
  VIEW_MODE_COOKIE,
  parseHiddenCategories,
  parseSectionStates,
  parseViewModes,
  serialiseHiddenCategories,
  serialiseSectionStates,
  serialiseViewModes,
  toggleHiddenCategory,
  type SectionKey,
  type SectionState,
  type ViewMode,
} from "@/lib/view-mode";
import type { GroupMode } from "@/lib/grouping";
import { prisma } from "@/lib/prisma";
import type { ReleaseType } from "@/generated/prisma/enums";
import {
  getProvider,
  searchArtistsEverywhere,
  type ProviderArtist,
} from "@/lib/providers";
import {
  persistReleases,
  syncAllActive,
  syncArtist,
  syncArtistTracks,
  syncReleaseTracks,
} from "@/lib/sync";
import {
  alignSongsWithRelease,
  setReleaseListenedDeep,
  setSongListenedDeep,
  type Touched,
} from "@/lib/listening";
import { parseTracklist } from "@/lib/tracklist";
import { parseDiscoveryLines } from "@/lib/discovery";
import { parseDiscography } from "@/lib/import/discography";
import { applyImport } from "@/lib/import/apply";
import { matchDiscovery } from "@/lib/discovery-match";
import { loadLibraryIndex } from "@/lib/library-index";
import { songKey } from "@/lib/song-identity";
import { MAX_FAVOURITE_SONGS } from "@/lib/favourites";
import type { ReleaseCategory } from "@/lib/release-category";

export async function createArtist(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.artist.create({
    // Typed in, so a service attached later never overwrites it.
    data: { name, imageUrl, imageUrlByHand: imageUrl !== null, notes },
  });

  revalidatePath("/");
}

export async function setArtistStatus(artistId: string, status: "ACTIVE" | "PAUSED") {
  await prisma.artist.update({
    where: { id: artistId },
    data: {
      status,
      pausedAt: status === "PAUSED" ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

/**
 * Artwork is taken as a link rather than an upload: the app stores no files, and
 * every cover already lives at a public URL somewhere. Blank clears it.
 */
function imageField(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : null;
}

export async function addRelease(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const releaseDateRaw = String(formData.get("releaseDate") ?? "");
  const type = String(formData.get("type") ?? "OTHER") as ReleaseType;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const coverUrl = imageField(formData, "coverUrl");

  if (!artistId || !title || !releaseDateRaw) return;

  const release = await prisma.release.create({
    data: {
      artistId,
      title,
      type,
      releaseDate: new Date(releaseDateRaw),
      notes,
      coverUrl,
    },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
  // Straight to the release: nothing can fetch a hand-logged tracklist, so
  // typing the songs in is the next step, and its page is where that happens.
  redirect(`/releases/${release.id}`);
}

/**
 * Adds or replaces a tracklist typed in by hand.
 *
 * Songs are resolved through the same identity rules as a fetched tracklist, so
 * a hand-entered song still counts as heard wherever else it appears.
 */
export async function addManualTracks(releaseId: string, formData: FormData) {
  const parsed = parseTracklist(String(formData.get("tracks") ?? ""));
  if (parsed.length === 0) return;

  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { id: true, artistId: true },
  });
  if (!release) return;

  // Replacing rather than appending: the box shows the current list, so what's
  // in it when you press save is what you meant to end up with.
  await prisma.track.deleteMany({ where: { releaseId: release.id, externalId: null } });

  for (const track of parsed) {
    const song = await resolveManualSong(release.artistId, track.title);
    await prisma.track.create({
      data: {
        releaseId: release.id,
        title: track.title,
        position: track.position,
        duration: track.duration,
        songId: song.id,
      },
    });
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { tracksSyncedAt: new Date() },
  });

  // A hand-entered list under an already-heard release is heard too.
  await alignSongsWithRelease(release.id);
  await prisma.song.deleteMany({
    where: { artistId: release.artistId, tracks: { none: {} } },
  });

  revalidatePath("/", "layout");
}

async function resolveManualSong(artistId: string, title: string) {
  const key = songKey(title);
  const existing = await prisma.song.findUnique({
    where: { artistId_key: { artistId, key } },
  });
  return existing ?? prisma.song.create({ data: { artistId, key, title } });
}

export async function updateArtist(artistId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const imageUrl = imageField(formData, "imageUrl");
  const before = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { imageUrl: true },
  });

  await prisma.artist.update({
    where: { id: artistId },
    data: {
      name,
      imageUrl,
      // Only when the picture itself changed. Marking every edit as by-hand
      // would mean correcting a spelling quietly froze the photo for good.
      ...(imageUrl !== before?.imageUrl ? { imageUrlByHand: imageUrl !== null } : {}),
      discographyUrl: imageField(formData, "discographyUrl"),
    },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

/**
 * Points an artist at a service to be checked for new releases.
 *
 * Separate from how they got here: an artist imported from a file, or added by
 * hand, is still the same artist once a service is attached, and everything
 * already recorded against them stays put. The first sync recognises releases
 * the file already brought in rather than listing them twice.
 */
export async function linkArtistForSync(
  artistId: string,
  source: string,
  externalId: string,
  imageUrl: string | null,
) {
  if (!getProvider(source) || !externalId) return;

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { imageUrl: true },
  });

  await prisma.artist.update({
    where: { id: artistId },
    data: {
      syncSource: source,
      syncExternalId: externalId,
      // Only fill a gap — a picture chosen by hand outranks the service's.
      imageUrl: artist?.imageUrl ?? imageUrl,
    },
  });

  await syncArtist(artistId);

  revalidatePath("/", "layout");
}

export async function unlinkArtistFromSync(artistId: string) {
  await prisma.artist.update({
    where: { id: artistId },
    data: { syncSource: null, syncExternalId: null },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

/** Refreshes exactly the pages a listening change reached, and no more. */
function revalidateTouched({ artistId, releaseIds }: Touched) {
  revalidatePath("/");
  if (artistId) revalidatePath(`/artists/${artistId}`);
  for (const id of releaseIds) revalidatePath(`/releases/${id}`);
}

/**
 * Takes a release out of the queue without claiming to have heard it.
 *
 * The two states the tracker had both misrepresent a record you've decided to
 * skip: unheard leaves it in the queue for good, heard is untrue. This is
 * always reversible — the songs and everything else are untouched, so putting
 * it back leaves no trace of having set it aside.
 */
export async function setReleaseAside(releaseId: string, aside: boolean) {
  const release = await prisma.release.update({
    where: { id: releaseId },
    data: { setAside: aside, setAsideAt: aside ? new Date() : null },
    select: { artistId: true },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${release.artistId}`);
  revalidatePath(`/releases/${releaseId}`);
}

export async function setReleaseListened(releaseId: string, listened: boolean) {
  revalidateTouched(await setReleaseListenedDeep(releaseId, listened));
}

export type SearchState = {
  query: string;
  results: ProviderArtist[];
  /** Set when the results came from the fallback source, which is worth saying. */
  usedFallback: boolean;
  error: string | null;
};

export async function searchArtistsAction(
  _previous: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const query = String(formData.get("query") ?? "").trim();
  if (!query) return { query, results: [], usedFallback: false, error: null };

  try {
    const { results, usedFallback } = await searchArtistsEverywhere(query);
    return { query, results, usedFallback, error: null };
  } catch (error) {
    return {
      query,
      results: [],
      usedFallback: false,
      error: error instanceof Error ? error.message : "Search failed.",
    };
  }
}

export type ImportState = {
  message: string | null;
  error: string | null;
};

export async function importArtistAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const externalId = String(formData.get("externalId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  // Which catalogue this result came from; ids are only meaningful to their own.
  const source = String(formData.get("source") ?? "").trim();
  // Unchecked boxes are absent from FormData entirely.
  const markListened = formData.get("markListened") !== null;

  if (!externalId || !name) {
    return { message: null, error: "Missing artist details." };
  }

  const provider = getProvider(source);
  if (!provider) {
    return { message: null, error: "That result came from an unknown source." };
  }

  const existing = await prisma.artist.findUnique({
    where: { source_externalId: { source, externalId } },
    select: { name: true },
  });
  if (existing) {
    return { message: null, error: `${existing.name} is already in your tracker.` };
  }

  try {
    const releases = await provider.fetchArtistReleases(externalId);

    const artist = await prisma.artist.create({
      data: {
        name,
        imageUrl,
        source,
        externalId,
        // Added from a service, so that is also where new releases come from.
        syncSource: source,
        syncExternalId: externalId,
        lastSyncedAt: new Date(),
      },
    });

    const { added } = await persistReleases(artist.id, releases, { markListened });

    revalidatePath("/");
    return {
      message:
        added > 0
          ? `Added ${name} with ${added} release${added === 1 ? "" : "s"}.`
          : `Added ${name}. No releases found.`,
      error: null,
    };
  } catch (error) {
    return {
      message: null,
      error: error instanceof Error ? error.message : "Import failed.",
    };
  }
}

export async function syncArtistAction(artistId: string) {
  // Pressed on one artist's own page, which is the one moment a new photo is
  // wanted and expected. The nightly sweep leaves pictures alone.
  await syncArtist(artistId, { refreshImage: true });
  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

export async function syncAllAction() {
  await syncAllActive();
  revalidatePath("/");
}

export async function setSectionViewMode(section: SectionKey, mode: ViewMode) {
  const store = await cookies();
  const current = parseViewModes(store.get(VIEW_MODE_COOKIE)?.value);

  store.set(VIEW_MODE_COOKIE, serialiseViewModes({ ...current, [section]: mode }), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
}

export async function setSectionState(section: SectionKey, state: SectionState) {
  const store = await cookies();
  const current = parseSectionStates(store.get(SECTION_STATE_COOKIE)?.value);

  store.set(
    SECTION_STATE_COOKIE,
    serialiseSectionStates({ ...current, [section]: state }),
    { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
  );
  revalidatePath("/");
}

/**
 * Marks a song heard, everywhere it appears. The state lives on the song rather
 * than on one track, so the single, the album and the remaster all move
 * together — hearing something once shouldn't have to be recorded four times.
 */
export async function setSongListened(songId: string, listened: boolean) {
  revalidateTouched(await setSongListenedDeep(songId, listened));
}

/*
 * Both of these revalidate everything rather than the page they were pressed
 * on. A fetched tracklist can mark songs heard, which changes release pages
 * that were already prefetched from the artist's grid — leaving those to expire
 * on their own meant opening an album straight afterwards and being told it had
 * no songs.
 */
export async function loadReleaseTracksAction(releaseId: string) {
  await syncReleaseTracks(releaseId);
  revalidatePath("/", "layout");
}

export async function loadArtistTracksAction(artistId: string) {
  await syncArtistTracks(artistId);
  revalidatePath("/", "layout");
}

export async function setGroupMode(mode: GroupMode) {
  const store = await cookies();
  store.set(GROUP_MODE_COOKIE, mode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
}

async function writeHiddenCategories(hidden: string) {
  const store = await cookies();
  store.set(QUEUE_FILTER_COOKIE, hidden, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
}

export async function toggleQueueCategory(category: ReleaseCategory) {
  const store = await cookies();
  const current = parseHiddenCategories(store.get(QUEUE_FILTER_COOKIE)?.value);
  await writeHiddenCategories(
    serialiseHiddenCategories(toggleHiddenCategory(current, category)),
  );
}

export async function clearQueueFilter() {
  await writeHiddenCategories("");
}

export async function updateRelease(formData: FormData) {
  const releaseId = String(formData.get("releaseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const releaseDateRaw = String(formData.get("releaseDate") ?? "");
  const type = String(formData.get("type") ?? "OTHER") as ReleaseType;

  if (!releaseId || !title || !releaseDateRaw) return;

  const release = await prisma.release.update({
    where: { id: releaseId },
    data: {
      title,
      type,
      releaseDate: new Date(releaseDateRaw),
      coverUrl: imageField(formData, "coverUrl"),
      // Notes are edited beside the cover, not here, so a form that doesn't
      // carry the field must leave what's stored alone rather than clear it.
      ...(formData.has("notes")
        ? { notes: String(formData.get("notes")).trim() || null }
        : {}),
    },
    select: { artistId: true },
  });

  revalidatePath("/");
  revalidatePath(`/releases/${releaseId}`);
  revalidatePath(`/artists/${release.artistId}`);
}

/**
 * Shortlists a release, or takes it off the shortlist.
 *
 * Separate from the rating rather than derived from it: a rating says how good
 * the record is, a favourite says it is one of the ones you would name. Those
 * come apart often enough — a five-star record you rarely reach for, a rough
 * early EP you love — that collapsing them would lose the answer to both.
 */
export async function setReleaseFavourite(releaseId: string, favourite: boolean) {
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { artistId: true },
  });
  if (!release) return;

  await prisma.release.update({ where: { id: releaseId }, data: { favourite } });

  revalidatePath(`/releases/${releaseId}`);
  revalidatePath(`/artists/${release.artistId}`);
}

/**
 * Picks a song out as a favourite of the release it is on, or unpicks it.
 *
 * The limit is enforced here as well as in the UI: the buttons past three are
 * disabled, but a disabled button is a courtesy, not a rule.
 */
export async function setTrackFavourite(trackId: string, favourite: boolean) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { releaseId: true, release: { select: { artistId: true } } },
  });
  if (!track) return;

  if (favourite) {
    const picked = await prisma.track.count({
      where: { releaseId: track.releaseId, favourite: true },
    });
    if (picked >= MAX_FAVOURITE_SONGS) return;
  }

  await prisma.track.update({ where: { id: trackId }, data: { favourite } });

  revalidatePath(`/releases/${track.releaseId}`);
  revalidatePath(`/artists/${track.release.artistId}`);
}

/** Sends the same rating twice to clear it, so one control both sets and unsets. */
export async function setReleaseRating(releaseId: string, rating: number) {
  const current = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { rating: true, artistId: true },
  });
  if (!current) return;

  await prisma.release.update({
    where: { id: releaseId },
    data: { rating: current.rating === rating ? null : rating },
  });

  revalidatePath(`/releases/${releaseId}`);
  revalidatePath(`/artists/${current.artistId}`);
}

export async function deleteRelease(releaseId: string) {
  const release = await prisma.release.delete({
    where: { id: releaseId },
    select: { artistId: true },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${release.artistId}`);
  redirect(`/artists/${release.artistId}`);
}

export async function updateArtistNotes(artistId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.artist.update({ where: { id: artistId }, data: { notes } });
  revalidatePath(`/artists/${artistId}`);
}

export async function updateReleaseNotes(releaseId: string, formData: FormData) {
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.release.update({ where: { id: releaseId }, data: { notes } });
  revalidatePath(`/releases/${releaseId}`);
}

/*
 * The check-out list: artists and records you don't follow but mean to hear.
 * Kept apart from the library on purpose — nothing here is a commitment, and
 * putting it in the To listen queue would drown what's genuinely new from
 * someone you follow.
 */

export async function addDiscovery(formData: FormData) {
  const artistName = String(formData.get("artistName") ?? "").trim();
  if (!artistName) return;

  await prisma.discovery.create({
    data: {
      artistName,
      title: String(formData.get("title") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
    },
  });

  revalidatePath("/check-out");
}

export async function addDiscoveryBatch(formData: FormData) {
  const parsed = parseDiscoveryLines(String(formData.get("lines") ?? ""));
  if (parsed.length === 0) return;

  // Skipping duplicates rather than erroring: pasting an updated playlist over
  // an old one should add what's new and leave the rest alone.
  const existing = await prisma.discovery.findMany({
    select: { artistName: true, title: true },
  });
  const known = new Set(
    existing.map((item) => `${item.artistName.toLowerCase()}|${(item.title ?? "").toLowerCase()}`),
  );

  const fresh = parsed.filter(
    (item) => !known.has(`${item.artistName.toLowerCase()}|${(item.title ?? "").toLowerCase()}`),
  );
  if (fresh.length > 0) await prisma.discovery.createMany({ data: fresh });

  revalidatePath("/check-out");
}

export async function setDiscoveryHeard(id: string, heard: boolean) {
  await prisma.discovery.update({
    where: { id },
    data: { heard, heardAt: heard ? new Date() : null },
  });

  revalidatePath("/check-out");
}

export async function deleteDiscovery(id: string) {
  await prisma.discovery.delete({ where: { id } });
  revalidatePath("/check-out");
}

/** Clears out everything already heard, which is the point of ticking it off. */
export async function clearHeardDiscoveries() {
  await prisma.discovery.deleteMany({ where: { heard: true } });
  revalidatePath("/check-out");
}

/**
 * Drops the leads the tracker says you have already heard.
 *
 * Offered as a deliberate press rather than done during a paste: the match is
 * by name, which is sound enough to point at something but not to delete it
 * behind your back.
 */
export async function clearAlreadyHeardDiscoveries() {
  const [items, index] = await Promise.all([
    prisma.discovery.findMany({
      where: { heard: false },
      select: { id: true, artistName: true, title: true },
    }),
    loadLibraryIndex(),
  ]);

  const stale = items.filter((item) => matchDiscovery(item, index).heard);
  if (stale.length > 0) {
    await prisma.discovery.deleteMany({
      where: { id: { in: stale.map((item) => item.id) } },
    });
  }

  revalidatePath("/check-out");
}

export type ImportDiscographyState = {
  message: string | null;
  error: string | null;
  skipped: string[];
};

/**
 * Reads a pasted discography file and writes it into the library.
 *
 * Safe to run again: releases are matched on a stable key from the file, so an
 * updated copy corrects what changed and adds what's new without duplicating
 * anything or disturbing what you've marked as heard.
 */
export async function importDiscographyAction(
  _previous: ImportDiscographyState,
  formData: FormData,
): Promise<ImportDiscographyState> {
  const source = String(formData.get("source") ?? "");
  if (!source.trim()) {
    return { message: null, error: "Paste the file's contents first.", skipped: [] };
  }

  try {
    const { releases, skipped } = parseDiscography(source);
    if (releases.length === 0) {
      return { message: null, error: "No releases found in that file.", skipped };
    }

    const result = await applyImport(releases, {
      markListened: formData.get("markListened") !== null,
      discographyUrl: imageField(formData, "discographyUrl"),
    });

    revalidatePath("/", "layout");

    const parts = [
      `${result.releasesAdded} added`,
      ...(result.releasesUpdated > 0 ? [`${result.releasesUpdated} updated`] : []),
      ...(result.artistsAdded > 0 ? [`${result.artistsAdded} new artists`] : []),
      ...(result.tracksWritten > 0 ? [`${result.tracksWritten} songs`] : []),
    ];

    return {
      message:
        result.releasesAdded === 0 && result.releasesUpdated === 0
          ? `Already up to date — all ${releases.length} releases were already in.`
          : `Imported ${releases.length} releases: ${parts.join(", ")}.`,
      error: null,
      skipped,
    };
  } catch (error) {
    return {
      message: null,
      error: error instanceof Error ? error.message : "That file couldn't be read.",
      skipped: [],
    };
  }
}

export async function deleteArtist(artistId: string) {
  await prisma.artist.delete({ where: { id: artistId } });
  revalidatePath("/");
  redirect("/");
}
