/**
 * Sorting names the way a person reads them.
 *
 * Postgres orders by byte value under the C collation, where every capital
 * comes before every lowercase letter: Z sorts before a, so a follow list of
 * mostly capitalised names dumps every lowercase one — aespa, twice — in a
 * clump at the end, nowhere near the letter they start with. Databases differ
 * on this, which is worse than being wrong consistently.
 *
 * So ordering by name happens here rather than in SQL. The lists this applies
 * to are whole lists rather than pages of one, so nothing is lost by sorting
 * after reading. A collator is built once: constructing one per comparison is
 * the slow way to do this by a wide margin.
 */
const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  // "Album 2" before "Album 10", which digit-by-digit ordering gets backwards.
  numeric: true,
});

export function compareNames(a: string, b: string): number {
  const compared = collator.compare(a, b);
  if (compared !== 0) return compared;

  // Base sensitivity calls "aespa" and "AESPA" equal, which leaves their order
  // down to whatever the database happened to return. Fall back to an exact
  // comparison so the same library always renders the same way.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function byName<T>(items: readonly T[], name: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareNames(name(a), name(b)));
}
