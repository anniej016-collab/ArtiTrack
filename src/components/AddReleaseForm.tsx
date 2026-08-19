import { addRelease } from "@/lib/actions";

export function AddReleaseForm({ artistId }: { artistId: string }) {
  return (
    <form action={addRelease} className="panel flex flex-col gap-3 p-4">
      <input type="hidden" name="artistId" value={artistId} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-muted">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. In Rainbows"
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-32">
          <label htmlFor="type" className="mb-1.5 block text-xs font-medium text-muted">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue="ALBUM"
            className="field w-full px-3 py-2 text-sm"
          >
            <option value="ALBUM">Album</option>
            <option value="EP">EP</option>
            <option value="SINGLE">Single</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label
            htmlFor="releaseDate"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Release date
          </label>
          <input
            id="releaseDate"
            name="releaseDate"
            type="date"
            required
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="coverUrl" className="mb-1.5 block text-xs font-medium text-muted">
          Cover art link <span className="text-faint">(optional)</span>
        </label>
        <input
          id="coverUrl"
          name="coverUrl"
          type="url"
          placeholder="https://…"
          className="field w-full px-3 py-2 text-sm"
        />
      </div>
      {/* Checked by default, and for the same reason the artist search box is:
          a record you are logging by hand is usually one you already own and
          have heard, and the alternative — tick it heard afterwards — records
          today as the day you heard it, which puts a record from years ago at
          the top of "Recently listened". Heard here means heard with no date,
          because when you actually heard it is not something this form knows. */}
      <label
        className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted transition-colors hover:text-text"
        title="Log it as already heard, without recording today as the date"
      >
        <input
          type="checkbox"
          name="markListened"
          defaultChecked
          className="size-3.5 shrink-0 cursor-pointer accent-violet-500"
        />
        Heard already
      </label>

      <p className="text-xs text-faint">
        You&apos;ll land on the release itself, where the songs can be typed in.
      </p>
      <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
        Log release
      </button>
    </form>
  );
}
