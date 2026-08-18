/**
 * Ratings, in half-stars.
 *
 * Stored as a whole number of halves — 1 to 10, where 7 is three and a half —
 * rather than as a decimal. The scale has exactly ten positions and an integer
 * cannot land between two of them, which a float quietly can.
 */

/** The most a release can be rated, in halves. */
export const MAX_RATING = 10;

/** Whole stars shown, which is what the halves are halves of. */
export const STAR_COUNT = 5;

export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_RATING;
}

/** "4", or "4.5" — never "4.0", which reads as false precision. */
export function formatRating(halves: number): string {
  const stars = halves / 2;
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1);
}

export type StarFill = "empty" | "half" | "full";

/** How the nth star (1-based) should be drawn for a given rating. */
export function starFill(star: number, halves: number | null): StarFill {
  if (halves === null) return "empty";
  if (halves >= star * 2) return "full";
  if (halves === star * 2 - 1) return "half";
  return "empty";
}
