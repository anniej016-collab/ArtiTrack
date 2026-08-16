/**
 * Works out when two tracks are the same song.
 *
 * The same recording turns up repeatedly: as a single, on the album, on the
 * deluxe edition, on a remaster, on a greatest-hits. Tracking each copy
 * separately would mean marking one song heard four times, so copies are folded
 * into a single song per artist and the listening state lives there.
 *
 * Matching is by title rather than by ISRC. ISRC identifies one *recording*, so
 * it correctly links an album track to its appearance on a compilation, but a
 * remaster is a new recording with a new ISRC — and remasters are exactly what
 * needs folding here. ISRC is still stored for future use.
 *
 * The cost of matching on title is that two genuinely different songs sharing a
 * name — "Intro" on three albums — fold together. That is the accepted
 * trade-off: over-folding occasionally is closer to what's wanted than making
 * someone tick the same song off four times.
 */

/** Suffixes that mark a repackaging of the same performance. */
const REPACKAGE_PATTERNS = [
  /\bremaster(ed)?\b/,
  /\bre-?master(ed)?\b/,
  /\bdeluxe\b/,
  /\bexpanded\b/,
  /\banniversary\b/,
  /\bbonus track\b/,
  /\breissue\b/,
  /\bremastered version\b/,
  /\balbum version\b/,
  /\boriginal mix\b/,
  /^\d{4}$/,
  /^\d{4} (mix|version|remaster(ed)?)$/,
];

/**
 * Suffixes that mark a genuinely different performance. Kept, so a live or
 * acoustic take stays its own song.
 */
const DISTINCT_PATTERNS = [
  /\blive\b/,
  /\bacoustic\b/,
  /\bdemo\b/,
  /\bremix\b/,
  /\binstrumental\b/,
  /\bkaraoke\b/,
  /\bedit\b/,
  /\bradio\b/,
  /\breprise\b/,
  /\bcover\b/,
  /\bsession\b/,
];

/** Featured-artist credits vary between a single and its album; the song doesn't. */
const FEATURING = /\b(feat|ft|featuring|with)\b\.?\s.*/;

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function shouldDropParenthetical(inner: string): boolean {
  const cleaned = inner.trim();
  if (!cleaned) return true;
  if (DISTINCT_PATTERNS.some((pattern) => pattern.test(cleaned))) return false;
  if (FEATURING.test(cleaned)) return true;
  return REPACKAGE_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Reduces a track title to the identity it shares with its other appearances.
 * Returns a stable string; callers should not depend on its exact shape.
 */
export function normaliseSongTitle(title: string): string {
  let working = stripAccents(title.toLowerCase());

  // Drop bracketed and dash-appended qualifiers that only describe packaging.
  working = working.replace(/[([{]([^)\]}]*)[)\]}]/g, (_match, inner: string) =>
    shouldDropParenthetical(inner) ? " " : ` (${inner.trim()}) `,
  );

  working = working.replace(/\s[-–—]\s([^-–—]+)$/, (match, inner: string) =>
    shouldDropParenthetical(inner) ? " " : match,
  );

  // A trailing "feat. X" with no brackets at all.
  working = working.replace(new RegExp(`\\s${FEATURING.source}`), " ");

  return working
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Identity of a song within one artist. Two tracks sharing this are treated as
 * the same song, and marking either one heard marks both.
 */
export function songKey(title: string): string {
  const normalised = normaliseSongTitle(title);
  // An all-punctuation title would otherwise collapse to an empty key and fold
  // every such track together.
  return normalised || title.trim().toLowerCase();
}
