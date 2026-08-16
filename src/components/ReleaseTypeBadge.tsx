import { CATEGORY_LABELS, releaseCategory } from "@/lib/release-category";

/**
 * What kind of record this is, in the same words the queue filter uses.
 *
 * It used to show the provider's raw type, which called a greatest-hits a
 * "Release" while the filter called it a Compilation. Same wording either way
 * now, so switching a chip off visibly hides the badges that match it.
 */
const styles: Record<string, string> = {
  album: "bg-amber-400/12 text-amber-200/90 ring-amber-300/20",
  ep: "bg-teal-400/12 text-teal-200/90 ring-teal-300/20",
  single: "bg-rose-400/12 text-rose-200/90 ring-rose-300/20",
  deluxe: "bg-orange-400/12 text-orange-200/90 ring-orange-300/20",
  remaster: "bg-orange-400/12 text-orange-200/90 ring-orange-300/20",
  compilation: "bg-stone-400/12 text-stone-300 ring-stone-300/20",
  soundtrack: "bg-lime-400/12 text-lime-200/90 ring-lime-300/20",
  live: "bg-sky-400/12 text-sky-200/90 ring-sky-300/20",
};

/** Plural reads oddly on a single item: "Albums" on one record. */
const SINGULAR: Record<string, string> = {
  album: "Album",
  ep: "EP",
  single: "Single",
  deluxe: "Deluxe",
  remaster: "Remaster",
  compilation: "Compilation",
  soundtrack: "Soundtrack",
  live: "Live",
};

export function ReleaseTypeBadge({ type, title }: { type: string; title?: string }) {
  // Without a title only the provider's type is available, which is the most
  // the badge can honestly say.
  const category = releaseCategory(title ?? "", type);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        styles[category] ?? styles.compilation
      }`}
    >
      {SINGULAR[category] ?? CATEGORY_LABELS[category]}
    </span>
  );
}
