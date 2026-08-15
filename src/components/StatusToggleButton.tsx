import { setArtistStatus } from "@/lib/actions";

export function StatusToggleButton({
  artistId,
  status,
}: {
  artistId: string;
  status: "ACTIVE" | "PAUSED";
}) {
  const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
  const label = status === "ACTIVE" ? "Pause updates" : "Resume updates";
  const action = setArtistStatus.bind(null, artistId, nextStatus);

  return (
    <form action={action}>
      <button
        type="submit"
        className={
          status === "ACTIVE"
            ? "rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
            : "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-colors hover:opacity-90"
        }
      >
        {label}
      </button>
    </form>
  );
}
