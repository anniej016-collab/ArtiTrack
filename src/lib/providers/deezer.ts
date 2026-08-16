import type { ReleaseType } from "@/generated/prisma/enums";

// Deezer's public API needs no key or account, which is why it's used here.
// Base URL is overridable so tests can point at a local stand-in.
const API_BASE = process.env.DEEZER_API_BASE ?? "https://api.deezer.com";

export const PROVIDER_KEY = "deezer";

export type ProviderArtist = {
  /** Which provider this came from, so an import knows where to fetch from later. */
  source: string;
  externalId: string;
  name: string;
  imageUrl: string | null;
  albumCount: number | null;
};

export type ProviderRelease = {
  externalId: string;
  title: string;
  type: ReleaseType;
  releaseDate: Date;
  coverUrl: string | null;
};

export type ProviderTrack = {
  externalId: string;
  title: string;
  position: number;
  duration: number | null;
  /** Not always present in a bulk tracklist; stored when it is. */
  isrc: string | null;
};

class DeezerError extends Error {}

async function getJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    throw new DeezerError("Could not reach Deezer. Check your connection and try again.", {
      cause,
    });
  }

  if (!response.ok) {
    throw new DeezerError(`Deezer returned ${response.status}. Try again in a moment.`);
  }

  const body = await response.json().catch(() => null);

  // Deezer signals problems in the body with HTTP 200, including rate limiting.
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error: unknown }).error;
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Deezer rejected the request.";
    throw new DeezerError(message);
  }

  return body;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function dataArray(body: unknown): Record<string, unknown>[] {
  const record = asRecord(body);
  const data = record?.["data"];
  if (!Array.isArray(data)) return [];
  return data.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Deezer's record_type maps almost directly onto our ReleaseType. */
function toReleaseType(recordType: unknown): ReleaseType {
  switch (str(recordType)?.toLowerCase()) {
    case "album":
      return "ALBUM";
    case "ep":
      return "EP";
    case "single":
      return "SINGLE";
    default:
      // Compilations and anything unrecognised.
      return "OTHER";
  }
}

/** Deezer sends "YYYY-MM-DD", and occasionally "0000-00-00" for unknown dates. */
function toReleaseDate(value: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function searchArtists(query: string): Promise<ProviderArtist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const body = await getJson(
    `/search/artist?limit=8&q=${encodeURIComponent(trimmed)}`,
  );

  return dataArray(body).flatMap((item) => {
    const externalId = item["id"] === undefined ? null : String(item["id"]);
    const name = str(item["name"]);
    if (!externalId || !name) return [];

    return [
      {
        source: PROVIDER_KEY,
        externalId,
        name,
        imageUrl: str(item["picture_medium"]) ?? str(item["picture"]),
        albumCount: typeof item["nb_album"] === "number" ? item["nb_album"] : null,
      },
    ];
  });
}

export async function fetchArtistReleases(
  externalArtistId: string,
): Promise<ProviderRelease[]> {
  const body = await getJson(
    `/artist/${encodeURIComponent(externalArtistId)}/albums?limit=300`,
  );

  const releases = dataArray(body).flatMap((item) => {
    const externalId = item["id"] === undefined ? null : String(item["id"]);
    const title = str(item["title"]);
    const releaseDate = toReleaseDate(item["release_date"]);

    // A release with no usable date can't be ordered or displayed sensibly.
    if (!externalId || !title || !releaseDate) return [];

    return [
      {
        externalId,
        title,
        type: toReleaseType(item["record_type"]),
        releaseDate,
        coverUrl: str(item["cover_medium"]) ?? str(item["cover"]),
      },
    ];
  });

  // Deezer can list the same album id twice across markets.
  const seen = new Set<string>();
  return releases.filter((release) => {
    if (seen.has(release.externalId)) return false;
    seen.add(release.externalId);
    return true;
  });
}

export async function fetchReleaseTracks(
  externalReleaseId: string,
): Promise<ProviderTrack[]> {
  const body = await getJson(
    `/album/${encodeURIComponent(externalReleaseId)}/tracks?limit=200`,
  );

  const tracks = dataArray(body).flatMap((item, index) => {
    const externalId = item["id"] === undefined ? null : String(item["id"]);
    const title = str(item["title"]);
    if (!externalId || !title) return [];

    const position =
      typeof item["track_position"] === "number" ? item["track_position"] : index + 1;

    return [
      {
        externalId,
        title,
        position,
        duration: typeof item["duration"] === "number" ? item["duration"] : null,
        isrc: str(item["isrc"]),
      },
    ];
  });

  const seen = new Set<string>();
  return tracks
    .filter((track) => {
      if (seen.has(track.externalId)) return false;
      seen.add(track.externalId);
      return true;
    })
    .sort((a, b) => a.position - b.position);
}
