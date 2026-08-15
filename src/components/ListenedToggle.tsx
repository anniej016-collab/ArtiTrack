import { setReleaseListened } from "@/lib/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";

export function ListenedToggle({
  releaseId,
  listened,
  variant = "pill",
}: {
  releaseId: string;
  listened: boolean;
  /** "overlay" sits on top of album art; "pill" sits in a text row. */
  variant?: "pill" | "overlay";
}) {
  const action = setReleaseListened.bind(null, releaseId, !listened);
  const label = listened ? "Mark as not listened" : "Mark as listened";

  if (variant === "overlay") {
    return (
      <form action={action}>
        <button
          type="submit"
          aria-label={label}
          aria-pressed={listened}
          title={label}
          className={`flex size-8 items-center justify-center rounded-full backdrop-blur-md transition ${
            listened
              ? "bg-success text-black shadow-lg shadow-black/30"
              : "reveal-on-hover bg-black/60 text-white/85 shadow-lg shadow-black/30 hover:bg-black/80 hover:text-white"
          }`}
        >
          {listened ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
        </button>
      </form>
    );
  }

  return (
    <form action={action}>
      <button
        type="submit"
        aria-pressed={listened}
        title={label}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          listened
            ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
            : "btn-ghost"
        }`}
      >
        {listened ? <CheckIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
        {listened ? "Heard" : "Mark heard"}
      </button>
    </form>
  );
}
