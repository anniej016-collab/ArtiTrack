import { setReleaseListened } from "@/lib/actions";

export function ListenedToggle({
  releaseId,
  listened,
}: {
  releaseId: string;
  listened: boolean;
}) {
  const action = setReleaseListened.bind(null, releaseId, !listened);

  return (
    <form action={action}>
      <button
        type="submit"
        aria-pressed={listened}
        title={listened ? "Mark as not listened" : "Mark as listened"}
        className={
          listened
            ? "flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-600/20 dark:text-emerald-400"
            : "flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        }
      >
        <span aria-hidden="true">{listened ? "✓" : "+"}</span>
        {listened ? "Listened" : "Mark listened"}
      </button>
    </form>
  );
}
