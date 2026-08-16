import { addDiscovery, addDiscoveryBatch } from "@/lib/actions";

export function AddDiscoveryForm() {
  return (
    <form action={addDiscovery} className="panel flex flex-col gap-3 p-4">
      {/* Stacked: this form lives in a narrow column beside the list. */}
      <div className="flex flex-col gap-3">
        <div className="flex-1">
          <label
            htmlFor="d-artist"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Artist
          </label>
          <input
            id="d-artist"
            name="artistName"
            required
            placeholder="Who to check out"
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="d-title"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Song or record <span className="text-faint">(optional)</span>
          </label>
          <input
            id="d-title"
            name="title"
            placeholder="Leave empty for the artist"
            className="field w-full px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="d-note" className="mb-1.5 block text-xs font-medium text-muted">
          Note <span className="text-faint">(optional)</span>
        </label>
        <input
          id="d-note"
          name="note"
          placeholder="Where you heard about them."
          className="field w-full px-3 py-2 text-sm"
        />
      </div>

      <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
        Add to the list
      </button>
    </form>
  );
}

export function PasteDiscoveriesForm() {
  return (
    <form action={addDiscoveryBatch} className="panel flex flex-col gap-3 p-4">
      <div>
        <label
          htmlFor="d-lines"
          className="mb-1.5 block text-xs font-medium text-muted"
        >
          One per line, artist first
        </label>
        <textarea
          id="d-lines"
          name="lines"
          rows={8}
          placeholder={"Sampha - Spirit 2.0\nYaya Bey - Karma Don't Wait\nNala Sinephro"}
          className="field w-full resize-y px-3 py-2 font-mono text-sm"
        />
      </div>
      <p className="text-xs text-faint">
        The artist goes before the dash and the song after it — a line with no dash is
        taken as an artist on their own. Numbering and running times are ignored, and
        anything already on the list is skipped, so an updated playlist can be pasted
        straight over the old one.
      </p>
      <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
        Add them all
      </button>
    </form>
  );
}
