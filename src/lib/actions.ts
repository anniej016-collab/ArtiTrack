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
import { songKey } from "@/lib/song-identity";
import type { ReleaseCategory } from "@/lib/release-category";

export async function createArtist(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.artist.create({
    data: { name, imageUrl, notes },
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

  await prisma.artist.update({
    where: { id: artistId },
    data: { name, imageUrl: imageField(formData, "imageUrl") },
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
      data: { name, imageUrl, source, externalId, lastSyncedAt: new Date() },
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
  await syncArtist(artistId);
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

export async function deleteArtist(artistId: string) {
  await prisma.artist.delete({ where: { id: artistId } });
  revalidatePath("/");
  redirect("/");
}
