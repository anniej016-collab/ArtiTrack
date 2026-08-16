import { setSectionViewMode } from "@/lib/actions";
import { GridIcon, ListIcon } from "@/components/icons";
import type { SectionKey, ViewMode } from "@/lib/view-mode";

function Option({
  section,
  mode,
  current,
  label,
  children,
}: {
  section: SectionKey;
  mode: ViewMode;
  current: ViewMode;
  label: string;
  children: React.ReactNode;
}) {
  const active = mode === current;

  return (
    <form action={setSectionViewMode.bind(null, section, mode)}>
      <button
        type="submit"
        aria-label={label}
        aria-pressed={active}
        title={label}
        className={`flex size-6 items-center justify-center rounded-full transition ${
          active ? "chip-on" : "text-muted hover:text-text"
        }`}
      >
        {children}
      </button>
    </form>
  );
}

/** One per section: the queue can be a list while artists stay as cards. */
export function ViewToggle({
  section,
  current,
}: {
  section: SectionKey;
  current: ViewMode;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-line p-0.5">
      <Option section={section} mode="cards" current={current} label="Card view">
        <GridIcon className="size-3" />
      </Option>
      <Option section={section} mode="list" current={current} label="List view">
        <ListIcon className="size-3" />
      </Option>
    </div>
  );
}
