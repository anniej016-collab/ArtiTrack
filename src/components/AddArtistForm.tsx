import { createArtist } from "@/lib/actions";

export function AddArtistForm() {
  return (
    <form action={createArtist} className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-muted">
            Artist name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Someone the search can't find"
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="artist-photo"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Photo link <span className="text-faint">(optional)</span>
          </label>
          <input
            id="artist-photo"
            name="imageUrl"
            type="url"
            placeholder="https://…"
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="btn-primary shrink-0 px-4 py-2 text-sm">
          Add
        </button>
      </div>
    </form>
  );
}
