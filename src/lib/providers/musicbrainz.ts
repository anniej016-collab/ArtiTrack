import type { ProviderArtist, ProviderRelease } from "@/lib/providers/deezer";
import type { ReleaseType } from "@/generated/prisma/enums";

/**
 * Fallback for artists Deezer doesn't carry.
 *
 * Deezer is a commercial streaming catalogue, so it is thin on independent,
 * regional and older material. MusicBrainz is community-maintained with no
 * licensing constraints, which is exactly where that gap is filled — at the
 * cost of patchier data and no artwork of its own.
 *
 * Only reached when Deezer returns nothing, so its one-request-per-second
 * etiquette is never a bottleneck.
 */
const API_BASE = process.env.MUSICBRAINZ_API_BASE ?? "https://musicbrainz.org/ws/2";
const COVER_ART_BASE =
  process.env.COVER_ART_API_BASE ?? "https://coverartarchive.org";

export const PROVIDER_KEY = "musicbrainz";

/** MusicBrainz asks that clients identify themselves and will block those that don't. */
const USER_AGENT =
  process.env.MUSICBRAINZ_USER_AGENT ??
  "ArtiTrack/1.0 (https://github.com/anniej016-collab/ArtiTrack)";

class MusicBrainzError extends Error {}

async function getJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });
  } catch (cause) {
    throw new MusicBrainzError("Could not reach MusicBrainz.", { cause });
  }

  if (!response.ok) {
    throw new MusicBrainzError(`MusicBrainz returned ${response.status}.`);
  }

  return response.json().catch(() => null);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function list(body: unknown, key: string): Record<string, unknown>[] {
  const value = asRecord(body)?.[key];
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * MusicBrainz splits type across primary ("Album") and secondary ("Compilation",
 * "Live") types, so a live album is an Album with a secondary type.
 */
function toReleaseType(item: Record<string, unknown>): ReleaseType {
  const secondary = Array.isArray(item["secondary-types"])
    ? item["secondary-types"].map((value) => String(value).toLowerCase())
    : [];
  if (secondary.length > 0) return "OTHER";

  switch (str(item["primary-type"])?.toLowerCase()) {
    case "album":
      return "ALBUM";
    case "ep":
      return "EP";
    case "single":
      return "SINGLE";
    default:
      return "OTHER";
  }
}

/** Dates may be just a year, or a year and month, so missing parts default to the 1st. */
function toReleaseDate(value: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;

  const [year, month = "01", day = "01"] = raw.split("-");
  if (!/^\d{4}$/.test(year)) return null;

  const parsed = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function searchArtists(query: string): Promise<ProviderArtist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const body = await getJson(
    `/artist?fmt=json&limit=8&query=${encodeURIComponent(trimmed)}`,
  );

  return list(body, "artists").flatMap((item) => {
    const externalId = str(item["id"]);
    const name = str(item["name"]);
    if (!externalId || !name) return [];

    // MusicBrainz has no artist images of its own.
    return [
      { source: PROVIDER_KEY, externalId, name, imageUrl: null, albumCount: null },
    ];
  });
}

export async function fetchArtistReleases(
  externalArtistId: string,
): Promise<ProviderRelease[]> {
  const body = await getJson(
    `/release-group?fmt=json&limit=100&artist=${encodeURIComponent(externalArtistId)}`,
  );

  const releases = list(body, "release-groups").flatMap((item) => {
    const externalId = str(item["id"]);
    const title = str(item["title"]);
    const releaseDate = toReleaseDate(item["first-release-date"]);
    if (!externalId || !title || !releaseDate) return [];

    return [
      {
        externalId,
        title,
        type: toReleaseType(item),
        releaseDate,
        // Cover Art Archive is keyed by release-group id; it 404s when absent,
        // which the browser handles by simply showing the placeholder.
        coverUrl: `${COVER_ART_BASE}/release-group/${externalId}/front-250`,
      },
    ];
  });

  const seen = new Set<string>();
  return releases.filter((release) => {
    if (seen.has(release.externalId)) return false;
    seen.add(release.externalId);
    return true;
  });
}
