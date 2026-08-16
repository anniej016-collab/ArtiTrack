import { setQueueFilter } from "@/lib/actions";
import type { QueueFilter } from "@/lib/view-mode";

const OPTIONS: { value: QueueFilter; label: string; title: string }[] = [
  { value: "all", label: "All", title: "Every release type" },
  { value: "no-singles", label: "No singles", title: "Albums and EPs only" },
  { value: "albums-only", label: "Albums", title: "Albums only" },
];

/**
 * Compilations and reissues arrive as ordinary releases, so a queue fills with
 * records already heard in another form. This narrows it by type.
 */
export function QueueFilterToggle({ current }: { current: QueueFilter }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5">
      {OPTIONS.map(({ value, label, title }) => {
        const active = value === current;
        return (
          <form key={value} action={setQueueFilter.bind(null, value)}>
            <button
              type="submit"
              aria-pressed={active}
              title={title}
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition ${
                active ? "bg-white/90 text-black" : "text-faint hover:text-text"
              }`}
            >
              {label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
