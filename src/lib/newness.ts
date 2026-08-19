/**
 * How long a release counts as new, and from when.
 *
 * Pure, so the rule can be tested without a database or a clock — it is the
 * whole feature, and its awkward cases are all about time.
 */

/** A fortnight, from the first time you saw it rather than from its arrival. */
export const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type Arrival = {
  /** Set only for releases that turned up while you were already following. */
  arrivedAt: Date | null;
  /** Null until it has been on screen once. */
  firstSeenAt: Date | null;
};

/**
 * Whether a release still counts as new.
 *
 * Counting from first sight rather than from arrival is what makes this
 * survive being away: nothing ages out while nobody is looking, so three
 * months of releases are all still new on the day you come back, and each then
 * gets its own fortnight. Seen and then ignored, it ages out on schedule —
 * a glance does not burn it, and neither does it stay new forever.
 *
 * A release that arrived with its artist is never new. Following someone with
 * a twenty-year back catalogue is not twenty years of news.
 */
export function isNewRelease(release: Arrival, now: Date): boolean {
  if (release.arrivedAt === null) return false;
  if (release.firstSeenAt === null) return true;
  return now.getTime() - release.firstSeenAt.getTime() < NEW_WINDOW_MS;
}
