import { CATEGORY_LABELS, releaseCategory } from "@/lib/release-category";

/**
 * What kind of record this is, in the same words the queue filter uses.
 *
 * It used to show the provider's raw type, which called a greatest-hits a
 * "Release" while the filter called it a Compilation. Same wording either way
 * now, so switching a chip off visibly hides the badges that match it.
 */
const styles: Record<string, string> = {
  album: "bg-violet-500/18 text-violet-200 ring-violet-400/30",
  ep: "bg-teal-400/15 text-teal-200 ring-teal-300/25",
  single: "bg-sky-400/15 text-sky-200 ring-sky-300/25",
  deluxe: "bg-indigo-400/15 text-indigo-200 ring-indigo-300/25",
  remaster: "bg-indigo-400/15 text-indigo-200 ring-indigo-300/25",
  compilation: "bg-slate-400/15 text-slate-300 ring-slate-300/25",
  soundtrack: "bg-lime-400/15 text-lime-200 ring-lime-300/25",
  live: "bg-rose-400/15 text-rose-200 ring-rose-300/25",
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

export function ReleaseTypeBadge({
  type,
  title,
  category: stated,
}: {
  type: string;
  title?: string;
  /** What a source said outright, which beats reading the title. */
  category?: string | null;
}) {
  // Without a title only the provider's type is available, which is the most
  // the badge can honestly say.
  const category = releaseCategory(title ?? "", type, stated);

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
