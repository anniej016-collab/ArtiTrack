import { addRelease } from "@/lib/actions";

export function AddReleaseForm({ artistId }: { artistId: string }) {
  return (
    <form
      action={addRelease}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10"
    >
      <input type="hidden" name="artistId" value={artistId} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="title" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. In Rainbows"
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>
        <div className="w-full sm:w-36">
          <label htmlFor="type" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue="ALBUM"
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          >
            <option value="ALBUM">Album</option>
            <option value="EP">EP</option>
            <option value="SINGLE">Single</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="releaseDate" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Release date
          </label>
          <input
            id="releaseDate"
            name="releaseDate"
            type="date"
            required
            className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>
      </div>
      <button
        type="submit"
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        Log release
      </button>
    </form>
  );
}
