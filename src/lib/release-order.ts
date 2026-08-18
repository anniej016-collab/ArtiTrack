/**
 * Ordering an artist's releases by what you thought of them.
 *
 * Pure and separate from the page so it can be tested without a database. The
 * rules are less obvious than "sort by rating" suggests: unrated is not zero
 * stars, it is no opinion, so those sit at the end rather than at the bottom of
 * the scale. Within one rating the newest comes first, matching every other
 * list in the app.
 */
export type Rankable = {
  rating: number | null;
  releaseDate: Date;
};

export function byRating<T extends Rankable>(releases: T[]): T[] {
  return [...releases].sort((a, b) => {
    if (a.rating !== b.rating) {
      // Nulls last, whichever side they fall on.
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return b.rating - a.rating;
    }
    return b.releaseDate.getTime() - a.releaseDate.getTime();
  });
}
