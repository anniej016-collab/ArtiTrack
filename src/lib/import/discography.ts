import type { ReleaseType } from "@/generated/prisma/enums";
import { extractArrayLiteral, objectLiteralToJson } from "@/lib/import/js-literal";

/**
 * Reads a hand-maintained discography page into releases the tracker can hold.
 *
 * The format is one record per release, as written in the page's own source:
 * a date, a unit, a title, a type, and optionally a cover, a note and a
 * tracklist. Nothing here is fetched — the file is the authority, and
 * re-importing an updated copy is how it stays current.
 */

export type ImportedTrack = {
  title: string;
  position: number;
};

export type ImportedRelease = {
  /** The unit, or the member's own name for a solo release. */
  artistName: string;
  title: string;
  releaseDate: Date;
  type: ReleaseType;
  coverUrl: string | null;
  notes: string | null;
  /** What the file says this is, where the tracker can show it. */
  category: string | null;
  tracks: ImportedTrack[];
  /** Stable across re-imports, so an updated file corrects rather than duplicates. */
  externalId: string;
};

export type ImportSummary = {
  releases: ImportedRelease[];
  /** Rows that could not be read, with the reason, so nothing fails silently. */
  skipped: string[];
};

type RawRecord = {
  d?: unknown;
  u?: unknown;
  t?: unknown;
  ty?: unknown;
  n?: unknown;
  cv?: unknown;
  m?: unknown;
  tl?: unknown;
};

/**
 * Types as the file names them, mapped onto the four the tracker stores.
 *
 * The finer distinctions are not lost: the queue's categories read the title
 * too, and the file's own wording is kept in the note.
 */
const TYPES: Record<string, ReleaseType> = {
  "studio album": "ALBUM",
  repackage: "ALBUM",
  "live album": "ALBUM",
  ep: "EP",
  single: "SINGLE",
  "single album": "SINGLE",
  "promo single": "SINGLE",
};

/**
 * The file's wording for kinds the four stored types cannot express.
 *
 * Only where it lands on a category the queue already offers — a soundtrack
 * with an ordinary title would otherwise be read as a compilation, since
 * nothing in "Spectre Test" says what it is.
 */
const CATEGORIES: Record<string, string> = {
  ost: "soundtrack",
  soundtrack: "soundtrack",
  "concert film": "live",
  "live album": "live",
  repackage: "deluxe",
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Dates may be a full day, a month, or just a year when only that is known. */
function toDate(value: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;

  const [year, month = "01", day = "01"] = raw.split("-");
  if (!/^\d{4}$/.test(year)) return null;

  const parsed = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Tracklists come either as plain titles or as objects carrying a lyrics link.
 * A leading star marks the title track, which is presentation rather than part
 * of the name.
 */
function toTracks(value: unknown): ImportedTrack[] {
  if (!Array.isArray(value)) return [];

  const tracks: ImportedTrack[] = [];
  for (const entry of value) {
    const title =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object"
          ? str((entry as { t?: unknown }).t)
          : null;
    if (!title) continue;

    const cleaned = title.replace(/^[★☆*]\s*/, "").trim();
    if (cleaned) tracks.push({ title: cleaned, position: tracks.length + 1 });
  }

  return tracks;
}

export function parseDiscography(source: string): ImportSummary {
  const literal = extractArrayLiteral(source, "DATA");
  if (!literal) {
    throw new Error(
      "Couldn't find the release data in that file. Paste the whole page, not just part of it.",
    );
  }

  let records: RawRecord[];
  try {
    records = JSON.parse(objectLiteralToJson(literal)) as RawRecord[];
  } catch {
    throw new Error("The release data in that file couldn't be read.");
  }

  const releases: ImportedRelease[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const unit = str(record.u);
    const title = str(record.t);
    const releaseDate = toDate(record.d);

    if (!unit || !title) {
      skipped.push(`${title ?? unit ?? "a row"} — missing a title or a unit`);
      continue;
    }
    if (!releaseDate) {
      skipped.push(`${title} — no usable date`);
      continue;
    }

    // A solo release belongs to the member, not to a unit called "Solo".
    const members = Array.isArray(record.m) ? record.m.filter((n) => typeof n === "string") : [];
    const artistName = unit.toLowerCase() === "solo" ? str(members[0]) : unit;
    if (!artistName) {
      skipped.push(`${title} — a solo release with nobody credited`);
      continue;
    }

    const externalId = `${unit}|${str(record.d)}|${title}`;
    if (seen.has(externalId)) {
      skipped.push(`${title} — listed twice`);
      continue;
    }
    seen.add(externalId);

    const kind = str(record.ty);
    const note = str(record.n);

    releases.push({
      artistName,
      title,
      releaseDate,
      type: TYPES[kind?.toLowerCase() ?? ""] ?? "OTHER",
      category: CATEGORIES[kind?.toLowerCase() ?? ""] ?? null,
      coverUrl: str(record.cv),
      // The file's own wording for the type is worth keeping — "OST" and
      // "Concert Film" say more than the four types the tracker stores.
      notes: [kind, note].filter(Boolean).join(" · ") || null,
      tracks: toTracks(record.tl),
      externalId,
    });
  }

  return { releases, skipped };
}
