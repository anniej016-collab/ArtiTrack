import { syncAllAction, syncArtistAction } from "@/lib/actions";

export function SyncAllButton() {
  return (
    <form action={syncAllAction}>
      <button
        type="submit"
        className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
      >
        Check for new releases
      </button>
    </form>
  );
}

export function SyncArtistButton({ artistId }: { artistId: string }) {
  return (
    <form action={syncArtistAction.bind(null, artistId)}>
      <button
        type="submit"
        className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5"
      >
        Check for new releases
      </button>
    </form>
  );
}
