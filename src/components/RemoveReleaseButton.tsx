"use client";

import { setReleaseRemoved } from "@/lib/actions";
import { useToggleState } from "@/components/pending";

/**
 * Takes a release off an artist, or puts it back.
 *
 * Sits beside Set aside, because both are ways of saying "not this" — but they
 * mean different things and must not be confused. Set aside is about listening:
 * it is theirs, you are not planning to play it. This is about ownership: it
 * isn't really theirs at all, and should stop appearing on their page.
 *
 * Never destructive. The row and everything on it survives, which is both why
 * putting it back loses nothing and why the next sync doesn't bring it straight
 * back — the row is what tells the sync it already knows this release.
 */
function Toggle({ removed, className }: { removed: boolean; className?: string }) {
  const { shown, pending } = useToggleState(removed);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={shown}
      title={
        shown
          ? "Put it back on this artist"
          : "Take it off this artist — for a record that isn't really theirs"
      }
      className={
        className ??
        `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          shown
            ? "bg-white/10 text-text ring-1 ring-inset ring-line hover:bg-white/15"
            : "btn-ghost"
        }`
      }
    >
      {shown ? "Put back" : "Not their release"}
    </button>
  );
}

export function RemoveReleaseButton({
  releaseId,
  removed,
  className,
}: {
  releaseId: string;
  removed: boolean;
  className?: string;
}) {
  return (
    <form action={setReleaseRemoved.bind(null, releaseId, !removed)}>
      <Toggle removed={removed} className={className} />
    </form>
  );
}
