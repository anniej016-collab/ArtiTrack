import { createArtist } from "@/lib/actions";

export function AddArtistForm() {
  return (
    <form
      action={createArtist}
      className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="name" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Artist name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Radiohead"
          className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        Add artist
      </button>
    </form>
  );
}
