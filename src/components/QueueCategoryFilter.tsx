import { clearQueueFilter, toggleQueueCategory } from "@/lib/actions";
import {
  CATEGORY_LABELS,
  RELEASE_CATEGORIES,
  type ReleaseCategory,
} from "@/lib/release-category";
import type { SelectedCategories } from "@/lib/view-mode";

/**
 * One chip per kind of release actually in the queue, each carrying its count.
 *
 * Only categories present are offered, so the row stays short and never asks
 * about something that would do nothing — a library with no soundtracks in it
 * never sees a soundtrack chip.
 *
 * Pressing a chip narrows the queue to that kind. It used to do the opposite —
 * press "Albums" and everything but the albums remained — which is backwards
 * from how a filter reads: you press the thing you want in order to be left
 * with it. Several can be on at once, and none on means everything, so there is
 * no separate "all" state to get stuck in.
 */
export function QueueCategoryFilter({
  counts,
  selected,
}: {
  counts: Map<ReleaseCategory, number>;
  selected: SelectedCategories;
}) {
  /*
   * Every kind in the queue, plus any that is selected but no longer in it.
   *
   * Ticking off the last album while filtered to albums would otherwise take
   * the Albums chip away with it, leaving a filter switched on and nothing on
   * screen to switch it off — the queue reads empty for a reason you can no
   * longer see.
   */
  const present = RELEASE_CATEGORIES.filter(
    (category) => counts.has(category) || selected.includes(category),
  );

  // Nothing to choose between when everything is the same kind.
  if (present.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {present.map((category) => {
        const on = selected.includes(category);
        const label = CATEGORY_LABELS[category];
        const lower = label.toLowerCase();

        return (
          <form key={category} action={toggleQueueCategory.bind(null, category)}>
            <button
              type="submit"
              aria-pressed={on}
              title={
                on
                  ? `Stop showing ${lower}`
                  : selected.length === 0
                    ? `Show only ${lower}`
                    : `Show ${lower} as well`
              }
              /* Filled means chosen. With nothing chosen the whole row sits
                 quiet, which is honest: no filter is on. */
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition ${
                on
                  ? "border-transparent bg-accent text-on-accent"
                  : "border-line text-text hover:border-accent/50"
              }`}
            >
              {label}
              <span className={on ? "text-on-accent/70" : "text-faint"}>
                {counts.get(category) ?? 0}
              </span>
            </button>
          </form>
        );
      })}

      {selected.length > 0 && (
        <form action={clearQueueFilter}>
          <button
            type="submit"
            className="rounded-full px-2 py-1 text-[0.7rem] font-medium text-faint transition hover:text-text"
          >
            Show all
          </button>
        </form>
      )}
    </div>
  );
}
