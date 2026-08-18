/**
 * When ticking something off counts as a new listen, and when it is a mistap
 * being corrected.
 *
 * Pure so the rule can be tested without a database, because the rule is the
 * whole feature: the dates themselves are trivial, and every past bug here has
 * been about which of them to write.
 */

/**
 * How long after un-ticking a re-tick still counts as undoing it.
 *
 * An hour is far longer than noticing a mistap takes and far shorter than
 * deciding you had not really heard a record, playing it, and coming back —
 * which is the case that must keep getting a real date. Anything inside the
 * window is treated as though the un-tick never happened.
 */
export const UNDO_WINDOW_MS = 60 * 60 * 1000;

export type ListenState = {
  /** The date currently stored, which may be null for a heard-but-undated record. */
  listenedAt: Date | null;
  /** When it was last un-ticked, or null if it hasn't been. */
  unheardAt: Date | null;
};

export function isUndoingUnheard(
  { unheardAt }: Pick<ListenState, "unheardAt">,
  now: Date,
): boolean {
  if (unheardAt === null) return false;
  const since = now.getTime() - unheardAt.getTime();
  // A negative gap means the clock moved backwards; treat it as recent rather
  // than as an eternity ago.
  return since <= UNDO_WINDOW_MS;
}

/**
 * The date to store when a release is ticked off.
 *
 * Undoing restores exactly what was there before, null included — an imported
 * back catalogue is heard with no date on purpose, and inventing one on a
 * mistap is what put decade-old records under "Recently listened". A genuine
 * listen is a real event and takes the current date, even over an older one:
 * having un-ticked it and played it again, now is when you heard it.
 */
export function listenedAtOnMarking(state: ListenState, now: Date): Date | null {
  return isUndoingUnheard(state, now) ? state.listenedAt : now;
}
