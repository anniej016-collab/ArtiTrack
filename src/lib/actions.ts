"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GROUP_MODE_COOKIE,
  SECTION_STATE_COOKIE,
  VIEW_MODE_COOKIE,
  parseSectionStates,
  parseViewModes,
  serialiseSectionStates,
  serialiseViewModes,
  type SectionKey,
  type SectionState,
  type ViewMode,
} from "@/lib/view-mode";
import type { GroupMode } from "@/lib/grouping";
import { prisma } from "@/lib/prisma";
import type { ReleaseType } from "@/generated/prisma/enums";
import {
  PROVIDER_KEY,
  fetchArtistReleases,
  searchArtists,
  type ProviderArtist,
} from "@/lib/providers/deezer";
import {
  persistReleases,
  syncAllActive,
  syncArtist,
  syncArtistTracks,
  syncReleaseTracks,
} from "@/lib/sync";

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

export async function addRelease(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const releaseDateRaw = String(formData.get("releaseDate") ?? "");
  const type = String(formData.get("type") ?? "OTHER") as ReleaseType;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!artistId || !title || !releaseDateRaw) return;

  await prisma.release.create({
    data: {
      artistId,
      title,
      type,
      releaseDate: new Date(releaseDateRaw),
      notes,
    },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

export async function setReleaseListened(releaseId: string, listened: boolean) {
  const release = await prisma.release.update({
    where: { id: releaseId },
    // Marking something now is a real, dated event, unlike an imported back
    // catalogue. Un-marking clears the date along with the flag.
    data: { listened, listenedAt: listened ? new Date() : null },
    select: { artistId: true },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${release.artistId}`);
}

export type SearchState = {
  query: string;
  results: ProviderArtist[];
  error: string | null;
};

export async function searchArtistsAction(
  _previous: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const query = String(formData.get("query") ?? "").trim();
  if (!query) return { query, results: [], error: null };

  try {
    return { query, results: await searchArtists(query), error: null };
  } catch (error) {
    return {
      query,
      results: [],
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
  // Unchecked boxes are absent from FormData entirely.
  const markListened = formData.get("markListened") !== null;

  if (!externalId || !name) {
    return { message: null, error: "Missing artist details." };
  }

  const existing = await prisma.artist.findUnique({
    where: { source_externalId: { source: PROVIDER_KEY, externalId } },
    select: { name: true },
  });
  if (existing) {
    return { message: null, error: `${existing.name} is already in your tracker.` };
  }

  try {
    const releases = await fetchArtistReleases(externalId);

    const artist = await prisma.artist.create({
      data: { name, imageUrl, source: PROVIDER_KEY, externalId, lastSyncedAt: new Date() },
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
  const song = await prisma.song.update({
    where: { id: songId },
    data: { listened, listenedAt: listened ? new Date() : null },
    select: { artistId: true },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${song.artistId}`);
  // Any release carrying this song shows a changed count.
  for (const release of await prisma.release.findMany({
    where: { tracks: { some: { songId } } },
    select: { id: true },
  })) {
    revalidatePath(`/releases/${release.id}`);
  }
}

export async function loadReleaseTracksAction(releaseId: string) {
  await syncReleaseTracks(releaseId);
  revalidatePath(`/releases/${releaseId}`);
}

export async function loadArtistTracksAction(artistId: string) {
  await syncArtistTracks(artistId);
  revalidatePath(`/artists/${artistId}`);
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

export async function deleteArtist(artistId: string) {
  await prisma.artist.delete({ where: { id: artistId } });
  revalidatePath("/");
  redirect("/");
}
