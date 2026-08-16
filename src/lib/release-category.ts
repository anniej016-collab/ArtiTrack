import type { ReleaseType } from "@/generated/prisma/enums";

/**
 * What kind of release something is, for narrowing the To listen queue.
 *
 * The provider's own type is only four values — album, EP, single, other —
 * which isn't enough to be useful: filtering "no singles" mostly just left
 * albums, because everything interesting was lumped into "other". The
 * distinctions that actually matter when deciding what to play next are things
 * like a deluxe reissue of a record already heard, or a soundtrack, and those
 * live in the title rather than the type.
 */
export const RELEASE_CATEGORIES = [
  "album",
  "ep",
  "single",
  "deluxe",
  "remaster",
  "compilation",
  "soundtrack",
  "live",
] as const;

export type ReleaseCategory = (typeof RELEASE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ReleaseCategory, string> = {
  album: "Albums",
  ep: "EPs",
  single: "Singles",
  deluxe: "Deluxe",
  remaster: "Remasters",
  compilation: "Compilations",
  soundtrack: "Soundtracks",
  live: "Live",
};

/**
 * Title signals, in priority order — the first match wins.
 *
 * Live and soundtrack come first because they describe what the record *is*,
 * where the rest describe how it was packaged. Compilation beats deluxe and
 * remaster so "Greatest Hits (Remastered)" reads as the compilation it is.
 */
const TITLE_PATTERNS: [ReleaseCategory, RegExp][] = [
  ["live", /\blive\b/],
  [
    "soundtrack",
    /\bsoundtrack\b|\bost\b|original score|motion picture|music from the/,
  ],
  [
    "compilation",
    /greatest hits|\bbest of\b|\banthology\b|\bcollection\b|\bessentials?\b|\bcompilation\b|\bsingles\b|\bhits\b/,
  ],
  ["deluxe", /\bdeluxe\b|\bexpanded\b|\banniversary\b|special edition|\bbonus\b/],
  ["remaster", /\bre-?master(ed)?\b|\breissue\b|\b\d{4} (mix|version)\b/],
];

export function releaseCategory(
  title: string,
  type: ReleaseType | string,
): ReleaseCategory {
  const haystack = title.toLowerCase();

  for (const [category, pattern] of TITLE_PATTERNS) {
    if (pattern.test(haystack)) return category;
  }

  switch (type) {
    case "SINGLE":
      return "single";
    case "EP":
      return "ep";
    case "ALBUM":
      return "album";
    default:
      // Deezer's own "compilation" record type arrives as OTHER, so that is
      // overwhelmingly what an unlabelled OTHER turns out to be.
      return "compilation";
  }
}

/** Counts per category, for showing how much each filter chip would hide. */
export function countByCategory(
  releases: { title: string; type: ReleaseType | string }[],
): Map<ReleaseCategory, number> {
  const counts = new Map<ReleaseCategory, number>();
  for (const release of releases) {
    const category = releaseCategory(release.title, release.type);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}
