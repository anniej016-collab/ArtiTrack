import { setSectionState } from "@/lib/actions";
import type { SectionKey, SectionState } from "@/lib/view-mode";

/** Smallest two-row capacity across breakpoints (3 columns × 2). Below this, no
 *  breakpoint hides anything, so there is nothing to show. */
export const PREVIEW_MIN = 6;
/** How many rows a list-mode preview shows. */
export const LIST_PREVIEW = 6;
/** Below this many artists, scrolling is quicker than typing a filter. */
export const FILTER_MIN = 5;

function StateButton({
  section,
  next,
  label,
  className,
  children,
}: {
  section: SectionKey;
  next: SectionState;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={setSectionState.bind(null, section, next)}>
      <button type="submit" aria-label={label} title={label} className={className}>
        {children}
      </button>
    </form>
  );
}

export function CollapsibleSection({
  section,
  id,
  title,
  count,
  state,
  controls,
  /** Whether anything is actually hidden in preview, so "Show all" isn't offered pointlessly. */
  canShowAll,
  note,
  children,
}: {
  section: SectionKey;
  id: string;
  title: string;
  count?: number;
  state: SectionState;
  controls?: React.ReactNode;
  canShowAll?: boolean;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  const collapsed = state === "collapsed";

  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <StateButton
            section={section}
            next={collapsed ? "preview" : "collapsed"}
            label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            className="-ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted transition hover:text-text"
          >
            <span
              aria-hidden="true"
              className={`text-sm transition-transform ${collapsed ? "" : "rotate-90"}`}
            >
              ›
            </span>
          </StateButton>
          <h2 className="section-title">
            {title}
            {count !== undefined && count > 0 && (
              <span className="text-sm font-medium text-faint">{count}</span>
            )}
          </h2>
        </div>
        {!collapsed && <div className="flex items-center gap-2">{controls}</div>}
      </div>

      {!collapsed && (
        <>
          {note}
          {children}

          {state === "preview" && canShowAll && (
            <div className="mt-3">
              <StateButton
                section={section}
                next="expanded"
                label={`Show all ${title}`}
                className="btn-ghost px-3 py-1.5 text-xs font-medium"
              >
                Show all{count !== undefined ? ` ${count}` : ""}
              </StateButton>
            </div>
          )}

          {state === "expanded" && (
            <div className="mt-3">
              <StateButton
                section={section}
                next="preview"
                label={`Show less of ${title}`}
                className="btn-ghost px-3 py-1.5 text-xs font-medium"
              >
                Show less
              </StateButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
