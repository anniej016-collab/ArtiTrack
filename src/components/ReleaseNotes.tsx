import { updateReleaseNotes } from "@/lib/actions";

/**
 * Notes sit with the release itself rather than behind an edit form at the
 * bottom of the page. What you thought of a record is the reason you'd open it
 * again, so it belongs where you land, not two screens down.
 *
 * Written notes show as text with the editor folded away; an empty one shows
 * only a quiet prompt, so a release you've said nothing about stays clean.
 */
export function ReleaseNotes({
  releaseId,
  notes,
}: {
  releaseId: string;
  notes: string | null;
}) {
  return (
    <div className="mt-4">
      {/* The note itself is never folded away — the editor is. Hiding the text
          while editing meant saving it and being shown nothing. */}
      {notes && (
        <p className="mb-2 whitespace-pre-wrap rounded-lg border-l-2 border-accent/50 bg-white/3 px-3 py-2 text-sm text-muted">
          {notes}
        </p>
      )}

      <details className="group/notes">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-faint transition-colors hover:text-muted">
          <span aria-hidden="true" className="transition-transform group-open/notes:rotate-45">
            +
          </span>
          {notes ? "Edit note" : "Add a note"}
        </summary>

        <form
          action={updateReleaseNotes.bind(null, releaseId)}
          className="mt-2 flex flex-col gap-2"
        >
          <label htmlFor="release-notes" className="sr-only">
            Notes about this release
          </label>
          <textarea
            id="release-notes"
            name="notes"
            rows={3}
            defaultValue={notes ?? ""}
            placeholder="What you made of it."
            className="field w-full resize-y px-3 py-2 text-sm"
          />
          <button type="submit" className="btn-primary self-start px-3.5 py-1.5 text-xs">
            Save note
          </button>
        </form>
      </details>
    </div>
  );
}
