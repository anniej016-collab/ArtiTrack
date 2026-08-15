import { setViewMode } from "@/lib/actions";
import { GridIcon, ListIcon } from "@/components/icons";
import type { ViewMode } from "@/lib/view-mode";

function Option({
  mode,
  current,
  label,
  children,
}: {
  mode: ViewMode;
  current: ViewMode;
  label: string;
  children: React.ReactNode;
}) {
  const active = mode === current;

  return (
    <form action={setViewMode.bind(null, mode)}>
      <button
        type="submit"
        aria-label={label}
        aria-pressed={active}
        title={label}
        className={`flex size-7 items-center justify-center rounded-full transition ${
          active ? "bg-white/90 text-black" : "text-faint hover:text-text"
        }`}
      >
        {children}
      </button>
    </form>
  );
}

export function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5">
      <Option mode="cards" current={current} label="Card view">
        <GridIcon className="size-3.5" />
      </Option>
      <Option mode="list" current={current} label="List view">
        <ListIcon className="size-3.5" />
      </Option>
    </div>
  );
}
