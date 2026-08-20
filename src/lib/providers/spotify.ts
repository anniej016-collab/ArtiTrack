import type { ReleaseType } from "@/generated/prisma/enums";
import type { ProviderArtist, ProviderRelease, ProviderTrack } from "@/lib/providers/deezer";
import { releaseMatchKey } from "@/lib/release-match";

/*
 * Spotify needs credentials, which is the whole reason it wasn't here first.
 * Deezer's catalogue endpoints are open; Spotify's are not, so this only works
 * once SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set. Both are app
 * credentials rather than anyone's login: nothing here reads a user's account,
 * only the public catalogue.
 */
const API_BASE = process.env.SPOTIFY_API_BASE ?? "https://api.spotify.com/v1";
const ACCOUNTS_BASE = process.env.SPOTIFY_ACCOUNTS_BASE ?? "https://accounts.spotify.com";

export const PROVIDER_KEY = "spotify";

export class SpotifyError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SpotifyError";
  }
}

/** Whether this provider can be used at all. */
export function isConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/**
 * The app's access token, kept until it expires.
 *
 * Spotify issues one good for about an hour, and asking for a fresh one per
 * request would double every call and hit the rate limit on a large
 * discography. Module scope is the right lifetime here: a serverless instance
 * handles many requests and is thrown away long before a token would go stale
 * in a way that matters.
 */
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new SpotifyError(
      "Spotify isn't set up: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are missing.",
    );
  }

  // A minute's grace, so a token doesn't expire between being checked and used.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  let response: Response;
  try {
    response = await fetch(`${ACCOUNTS_BASE}/api/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
  } catch (cause) {
    throw new SpotifyError("Could not reach Spotify. Check your connection.", { cause });
  }

  if (!response.ok) {
    // The overwhelmingly likely cause, and the one worth naming: a mistyped or
    // stale key reads as "no results" otherwise, with nothing to explain it.
    throw new SpotifyError(
      response.status === 400 || response.status === 401
        ? "Spotify rejected the credentials. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET."
        : `Spotify returned ${response.status} asking for a token.`,
    );
  }

  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;

  if (!body?.access_token) throw new SpotifyError("Spotify returned no token.");

  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

/** Only for tests, which need each case to start without a token in hand. */
export function forgetToken() {
  cached = null;
}

/** Spotify's own words for why it refused, when it offers any. */
async function errorMessage(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: unknown };
  } | null;
  const message = body?.error?.message;
  return typeof message === "string" && message.trim() !== "" ? message : null;
}

async function getJson(path: string): Promise<unknown> {
  const token = await accessToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    throw new SpotifyError("Could not reach Spotify. Check your connection.", { cause });
  }

  const detail = response.ok ? null : await errorMessage(response);

  if (response.status === 401) {
    // The token went stale early. Drop it so the next call fetches another
    // rather than repeating a request that can only fail again.
    cached = null;
    throw new SpotifyError("Spotify rejected the token. Try again.");
  }
  if (response.status === 429) {
    throw new SpotifyError("Spotify is rate limiting. Try again in a moment.");
  }
  if (!response.ok) {
    /*
     * Spotify explains its own refusals, and the explanation is the whole
     * diagnosis: "invalid id" and "offset must be less than 1000" are the same
     * bare 400 otherwise, with nothing to tell them apart from the outside.
     * Reporting only the number cost a deploy and a round trip to learn what
     * the response had said all along.
     */
    throw new SpotifyError(
      `Spotify returned ${response.status}${detail ? `: ${detail}` : ""}.`,
    );
  }

  return response.json().catch(() => null);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function items(body: unknown, key?: string): Record<string, unknown>[] {
  const record = asRecord(body);
  const container = key ? asRecord(record?.[key]) : record;
  const list = container?.["items"];
  if (!Array.isArray(list)) return [];
  return list.map(asRecord).filter((item): item is Record<string, unknown> => item !== null);
}

/** The largest image Spotify offers, which is the first it lists. */
function firstImage(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    const url = str(asRecord(entry)?.["url"]);
    if (url) return url;
  }
  return null;
}

/**
 * Spotify dates carry their own precision: "2019", "2019-06" and "2019-06-01"
 * are all valid and mean different things. Filling the gaps with January the
 * first is the convention this app already uses for a year-only import — it
 * orders correctly and shows the year, which is all a year-only date knows.
 */
function toReleaseDate(value: unknown, precision: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;

  const [year, month = "01", day = "01"] =
    precision === "year" ? [raw.slice(0, 4)] : raw.split("-");
  if (!/^\d{4}$/.test(year ?? "")) return null;

  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Spotify has three album types and no EP among them: an EP arrives as either
 * a "single" or a "album" depending on how it was delivered. That is fine here
 * — the app derives categories from the title as well as the stored type, and
 * the title is where "EP" is actually written.
 */
function toReleaseType(albumType: unknown): ReleaseType {
  switch (str(albumType)?.toLowerCase()) {
    case "album":
      return "ALBUM";
    case "single":
      return "SINGLE";
    case "compilation":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export async function searchArtists(query: string): Promise<ProviderArtist[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const body = await getJson(
    `/search?type=artist&limit=8&q=${encodeURIComponent(trimmed)}`,
  );

  return items(body, "artists").flatMap((item) => {
    const externalId = str(item["id"]);
    const name = str(item["name"]);
    if (!externalId || !name) return [];

    return [
      {
        source: PROVIDER_KEY,
        externalId,
        name,
        imageUrl: firstImage(item["images"]),
        // Spotify doesn't count albums in search results, and asking per artist
        // would be a request each to fill in a number nobody chooses on.
        albumCount: null,
      },
    ];
  });
}

export async function fetchArtist(externalId: string): Promise<ProviderArtist | null> {
  const item = asRecord(await getJson(`/artists/${encodeURIComponent(externalId)}`));
  const name = str(item?.["name"]);
  const id = str(item?.["id"]);
  if (!item || !name || !id) return null;

  return {
    source: PROVIDER_KEY,
    externalId: id,
    name,
    imageUrl: firstImage(item["images"]),
    albumCount: null,
  };
}

/**
 * Spotify refuses to look further into a list than this, answering a bare 400
 * rather than an empty page. Asking anyway is how a long catalogue turned into
 * "Spotify returned 400" and no releases at all.
 */
const MAX_OFFSET = 1000;

/**
 * Follows Spotify's paging until it runs out.
 *
 * Fifty per page is the maximum, and a large discography is well past that —
 * stopping at the first page would quietly lose most of a catalogue, which is
 * the exact complaint that brought Spotify in.
 */
async function allPages(firstPath: string): Promise<Record<string, unknown>[]> {
  const collected: Record<string, unknown>[] = [];
  let path: string | null = firstPath;

  // A ceiling rather than a while(true): a paging bug upstream should cost a
  // slow request, not an endless one.
  for (let page = 0; page < 40 && path; page += 1) {
    let body: unknown;
    try {
      body = await getJson(path);
    } catch (cause) {
      /*
       * The first page failing means the request itself was wrong — a bad id,
       * a refused key — and there is nothing to show, so it is reported.
       *
       * A later page failing is a different thing entirely: most of the
       * catalogue is already in hand, and throwing it away to report the
       * shortfall serves nobody. Spotify's own paging is what asked for the
       * page that failed, so this is upstream's edge to run into, not the
       * user's mistake to be told about.
       */
      if (page === 0) throw cause;
      break;
    }

    collected.push(...items(body));

    const next = str(asRecord(body)?.["next"]);
    // Spotify returns an absolute URL; everything here speaks in paths.
    path = next ? next.replace(API_BASE, "") : null;

    // Stop before asking for a page Spotify will refuse outright.
    if (path && offsetOf(path) >= MAX_OFFSET) break;
  }

  return collected;
}

/** The offset a paging URL is asking for, or 0 when it doesn't say. */
function offsetOf(path: string): number {
  const found = /[?&]offset=(\d+)/.exec(path);
  return found ? Number(found[1]) : 0;
}

/**
 * Which country's catalogue to ask for.
 *
 * Not a filter anyone asked for — it is the only way to stop Spotify listing
 * the same record once per country it was sold in, each copy under a different
 * id. Left off, a forty-record discography comes back as a few thousand rows,
 * and paging through them runs past the depth Spotify will serve and is
 * refused outright, so the artist ends up with no releases at all.
 *
 * The largest catalogue of the lot, and a worldwide release is in it. Anything
 * that does slip through still gets folded together below.
 */
const MARKET = process.env.SPOTIFY_MARKET ?? "US";

export async function fetchArtistReleases(
  externalArtistId: string,
): Promise<ProviderRelease[]> {
  const albums = await allPages(
    `/artists/${encodeURIComponent(externalArtistId)}/albums` +
      // Everything they released, but not records they merely guest on: an
      // "appears_on" credit is somebody else's album.
      `?include_groups=album,single,compilation&limit=50` +
      `&market=${encodeURIComponent(MARKET)}`,
  );

  const releases = albums.flatMap((item) => {
    const externalId = str(item["id"]);
    const title = str(item["name"]);
    const releaseDate = toReleaseDate(item["release_date"], item["release_date_precision"]);

    // A release with no usable date can't be ordered or displayed sensibly.
    if (!externalId || !title || !releaseDate) return [];

    return [
      {
        externalId,
        title,
        type: toReleaseType(item["album_type"]),
        releaseDate,
        coverUrl: firstImage(item["images"]),
      },
    ];
  });

  /*
   * Fold the duplicates together.
   *
   * Keying this on the id was the bug: every market's copy of a record carries
   * a *different* id, which is exactly what makes them duplicates worth
   * removing, so matching on it removed nothing at all. Title and year is what
   * the rest of the app already uses to decide two records are the same one.
   */
  const byRecord = new Map<string, ProviderRelease>();
  for (const release of releases) {
    const key = releaseMatchKey(release.title, release.releaseDate);
    const kept = byRecord.get(key);
    // Prefer a copy that has artwork; otherwise the first one wins.
    if (!kept) byRecord.set(key, release);
    else if (!kept.coverUrl && release.coverUrl) byRecord.set(key, release);
  }

  return [...byRecord.values()];
}

export async function fetchReleaseTracks(
  externalReleaseId: string,
): Promise<ProviderTrack[]> {
  const rows = await allPages(
    `/albums/${encodeURIComponent(externalReleaseId)}/tracks?limit=50`,
  );

  const tracks = rows.flatMap((item, index) => {
    const externalId = str(item["id"]);
    const title = str(item["name"]);
    if (!externalId || !title) return [];

    return [
      {
        externalId,
        title,
        position:
          typeof item["track_number"] === "number" ? item["track_number"] : index + 1,
        // Spotify counts in milliseconds; everything here counts in seconds.
        duration:
          typeof item["duration_ms"] === "number"
            ? Math.round(item["duration_ms"] / 1000)
            : null,
        // Only on the full track object, which a listing doesn't include.
        isrc: str(asRecord(item["external_ids"])?.["isrc"]),
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
