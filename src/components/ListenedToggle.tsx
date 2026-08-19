"use client";

import { setReleaseListened } from "@/lib/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { useToggleState } from "@/components/pending";

/**
 * Both variants share one accessible name, matching the pill's visible text, so
 * the control is described the same way whichever shape it takes. The fuller
 * description of the action lives in the tooltip.
 */
function labels(listened: boolean) {
  return {
    name: listened ? "Heard" : "Mark heard",
    title: listened ? "Mark as not heard" : "Mark as heard",
  };
}

/**
 * Inside the form, so it can see whether that form is mid-flight and show the
 * state the tap is heading for rather than the one it is leaving.
 */
function Toggle({
  listened,
  variant,
  size,
}: {
  listened: boolean;
  variant: "pill" | "overlay";
  size: "sm" | "md";
}) {
  const { shown, pending } = useToggleState(listened);
  const { name, title } = labels(shown);

  if (variant === "overlay") {
    const box = size === "sm" ? "size-7" : "size-8";
    const glyph = size === "sm" ? "size-3.5" : "size-4";

    return (
      <button
        type="submit"
        disabled={pending}
        aria-label={name}
        aria-pressed={shown}
        title={title}
        className={`flex ${box} items-center justify-center rounded-full backdrop-blur-md transition ${
          shown
            ? "bg-success text-black shadow-lg shadow-black/30"
            : "reveal-on-hover bg-black/60 text-white/85 shadow-lg shadow-black/30 hover:bg-black/80 hover:text-white"
        }`}
      >
        {shown ? <CheckIcon className={glyph} /> : <PlusIcon className={glyph} />}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={shown}
      title={title}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        shown
          ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
          : "btn-ghost"
      }`}
    >
      {shown ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
      {name}
    </button>
  );
}

export function ListenedToggle({
  releaseId,
  listened,
  variant = "pill",
  size = "md",
}: {
  releaseId: string;
  listened: boolean;
  /** "overlay" sits on top of album art; "pill" sits in a text row. */
  variant?: "pill" | "overlay";
  size?: "sm" | "md";
}) {
  return (
    <form action={setReleaseListened.bind(null, releaseId, !listened)}>
      <Toggle listened={listened} variant={variant} size={size} />
    </form>
  );
}
