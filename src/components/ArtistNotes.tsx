import { updateArtistNotes } from "@/lib/actions";

export function ArtistNotes({
  artistId,
  notes,
}: {
  artistId: string;
  notes: string | null;
}) {
  return (
    <details className="group" open={Boolean(notes)}>
      <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-muted">
        <span className="transition-transform group-open:rotate-90">›</span>
        Notes
      </summary>
      <form
        action={updateArtistNotes.bind(null, artistId)}
        className="panel mt-3 flex flex-col gap-3 p-4"
      >
        <label htmlFor="artist-notes" className="sr-only">
          Notes about this artist
        </label>
        <textarea
          id="artist-notes"
          name="notes"
          rows={3}
          defaultValue={notes ?? ""}
          placeholder="Why you follow them, what to listen to first, anything."
          className="field w-full resize-y px-3 py-2 text-sm"
        />
        <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
          Save notes
        </button>
      </form>
    </details>
  );
}
