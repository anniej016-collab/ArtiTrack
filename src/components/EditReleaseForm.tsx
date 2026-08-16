import { deleteRelease, updateRelease } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

/** Date inputs want YYYY-MM-DD, and the value is stored at UTC midnight. */
function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function EditReleaseForm({
  release,
}: {
  release: {
    id: string;
    title: string;
    type: string;
    releaseDate: Date;
    coverUrl: string | null;
  };
}) {
  return (
    <div className="flex flex-col gap-3">
      <form action={updateRelease} className="panel flex flex-col gap-3 p-4">
        <input type="hidden" name="releaseId" value={release.id} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label
              htmlFor="edit-title"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Title
            </label>
            <input
              id="edit-title"
              name="title"
              required
              defaultValue={release.title}
              className="field w-full px-3 py-2 text-sm"
            />
          </div>
          <div className="w-full sm:w-32">
            <label
              htmlFor="edit-type"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Type
            </label>
            <select
              id="edit-type"
              name="type"
              defaultValue={release.type}
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
              htmlFor="edit-date"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Release date
            </label>
            <input
              id="edit-date"
              name="releaseDate"
              type="date"
              required
              defaultValue={toDateInput(release.releaseDate)}
              className="field w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Notes are edited beside the cover at the top of the page, so they
            aren't repeated here — two editors for one field would race. */}
        <div>
          <label
            htmlFor="edit-cover"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Cover art link
          </label>
          <input
            id="edit-cover"
            name="coverUrl"
            type="url"
            defaultValue={release.coverUrl ?? ""}
            placeholder="https://…"
            className="field w-full px-3 py-2 text-sm"
          />
          <p className="mt-1.5 text-xs text-faint">
            Right-click a cover image on the web and copy its image address.
          </p>
        </div>

        <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
          Save changes
        </button>
      </form>

      <form action={deleteRelease.bind(null, release.id)}>
        <ConfirmSubmitButton
          message={`Delete "${release.title}"? This removes it and its songs from your tracker.`}
          className="text-xs font-medium text-faint transition-colors hover:text-red-400"
        >
          Delete this release
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
