import { setReleaseListened } from "@/lib/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";

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
  const action = setReleaseListened.bind(null, releaseId, !listened);
  const { name, title } = labels(listened);

  if (variant === "overlay") {
    const box = size === "sm" ? "size-7" : "size-8";
    const glyph = size === "sm" ? "size-3.5" : "size-4";

    return (
      <form action={action}>
        <button
          type="submit"
          aria-label={name}
          aria-pressed={listened}
          title={title}
          className={`flex ${box} items-center justify-center rounded-full backdrop-blur-md transition ${
            listened
              ? "bg-success text-black shadow-lg shadow-black/30"
              : "reveal-on-hover bg-black/60 text-white/85 shadow-lg shadow-black/30 hover:bg-black/80 hover:text-white"
          }`}
        >
          {listened ? (
            <CheckIcon className={glyph} />
          ) : (
            <PlusIcon className={glyph} />
          )}
        </button>
      </form>
    );
  }

  return (
    <form action={action}>
      <button
        type="submit"
        aria-pressed={listened}
        title={title}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          listened
            ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
            : "btn-ghost"
        }`}
      >
        {listened ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
        {name}
      </button>
    </form>
  );
}
