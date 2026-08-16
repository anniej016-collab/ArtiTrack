import { setGroupMode } from "@/lib/actions";
import type { GroupMode } from "@/lib/grouping";

const OPTIONS: { mode: GroupMode; label: string; title: string }[] = [
  { mode: "none", label: "All", title: "No grouping" },
  { mode: "artist", label: "By artist", title: "Group by artist" },
  { mode: "date", label: "By date", title: "Group by release month" },
];

export function GroupToggle({ current }: { current: GroupMode }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5">
      {OPTIONS.map(({ mode, label, title }) => {
        const active = mode === current;
        return (
          <form key={mode} action={setGroupMode.bind(null, mode)}>
            <button
              type="submit"
              aria-pressed={active}
              title={title}
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium transition ${
                active ? "chip-on" : "text-muted hover:text-text"
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
