/**
 * How a provider's release is recognised as one the tracker already holds.
 *
 * Title and year, with case, punctuation and accents folded away. The year
 * rather than the exact date because a hand-kept file often records only the
 * year, and services disagree by a day or two over territories; the qualifiers
 * are kept, so a deluxe edition stays distinct from the album it expands.
 */
export function releaseMatchKey(title: string, date: Date): string {
  const normalised = title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  return `${normalised}|${date.getUTCFullYear()}`;
}
