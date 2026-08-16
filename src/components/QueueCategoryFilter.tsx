import { clearQueueFilter, toggleQueueCategory } from "@/lib/actions";
import {
  CATEGORY_LABELS,
  RELEASE_CATEGORIES,
  type ReleaseCategory,
} from "@/lib/release-category";
import type { HiddenCategories } from "@/lib/view-mode";

/**
 * One chip per kind of release actually in the queue, each carrying its count.
 *
 * Only categories present are offered, so the row stays short and never asks
 * about something that would do nothing — a library with no soundtracks in it
 * never sees a soundtrack chip.
 */
export function QueueCategoryFilter({
  counts,
  hidden,
}: {
  counts: Map<ReleaseCategory, number>;
  hidden: HiddenCategories;
}) {
  const present = RELEASE_CATEGORIES.filter((category) => counts.has(category));

  // Nothing to choose between when everything is the same kind.
  if (present.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {present.map((category) => {
        const showing = !hidden.includes(category);
        const label = CATEGORY_LABELS[category];

        return (
          <form key={category} action={toggleQueueCategory.bind(null, category)}>
            <button
              type="submit"
              aria-pressed={showing}
              title={showing ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition ${
                showing
                  ? "border-transparent bg-white/90 text-black"
                  : "border-line text-faint hover:text-text"
              }`}
            >
              {label}
              <span className={showing ? "text-black/45" : "text-faint/70"}>
                {counts.get(category)}
              </span>
            </button>
          </form>
        );
      })}

      {hidden.length > 0 && (
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
