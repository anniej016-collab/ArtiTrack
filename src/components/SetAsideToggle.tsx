"use client";

import { setReleaseAside } from "@/lib/actions";
import { MinusIcon, UndoIcon } from "@/components/icons";
import { useToggleState } from "@/components/pending";

/**
 * Third state for a release: not planned for, and not pretended to be heard.
 *
 * Named after the release it belongs to, because a grid of these otherwise
 * gives a screen reader a column of identical buttons — and because "set aside"
 * on its own doesn't say what.
 */
function Toggle({
  title,
  setAside,
  variant,
}: {
  title: string;
  setAside: boolean;
  variant: "pill" | "overlay";
}) {
  const { shown, pending } = useToggleState(setAside);

  const name = shown ? `Put ${title} back in the queue` : `Set ${title} aside`;
  const hint = shown
    ? "Put it back in the queue"
    : "Keep it out of the queue without marking it heard";

  if (variant === "overlay") {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-label={name}
        aria-pressed={shown}
        title={hint}
        className={`flex size-7 items-center justify-center rounded-full backdrop-blur-md transition ${
          shown
            ? "bg-white/85 text-black shadow-lg shadow-black/30"
            : "reveal-on-hover bg-black/60 text-white/85 shadow-lg shadow-black/30 hover:bg-black/80 hover:text-white"
        }`}
      >
        {shown ? <UndoIcon className="size-3.5" /> : <MinusIcon className="size-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={name}
      aria-pressed={shown}
      title={hint}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        shown
          ? "bg-white/10 text-text ring-1 ring-inset ring-line hover:bg-white/15"
          : "btn-ghost"
      }`}
    >
      {shown ? <UndoIcon className="size-3.5" /> : <MinusIcon className="size-3.5" />}
      {shown ? "Put back" : "Not planning to"}
    </button>
  );
}

export function SetAsideToggle({
  releaseId,
  title,
  setAside,
  variant = "pill",
}: {
  releaseId: string;
  title: string;
  setAside: boolean;
  /** "overlay" sits on album art; "pill" sits in a row of controls. */
  variant?: "pill" | "overlay";
}) {
  return (
    <form action={setReleaseAside.bind(null, releaseId, !setAside)}>
      <Toggle title={title} setAside={setAside} variant={variant} />
    </form>
  );
}
