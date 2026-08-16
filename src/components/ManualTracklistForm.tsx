import { addManualTracks } from "@/lib/actions";

/**
 * A tracklist typed or pasted in one go.
 *
 * Twelve separate little forms is enough friction that nobody would ever fill
 * one in, so the whole list goes in at once and is read leniently: numbers and
 * running times are optional and stripped when present.
 */
export function ManualTracklistForm({
  releaseId,
  tracks,
}: {
  releaseId: string;
  tracks: { title: string; duration: number | null }[];
}) {
  // Seeded with what's already stored, so editing is the same box as adding.
  const existing = tracks
    .map((track) =>
      track.duration
        ? `${track.title} ${Math.floor(track.duration / 60)}:${String(
            track.duration % 60,
          ).padStart(2, "0")}`
        : track.title,
    )
    .join("\n");

  return (
    <form
      action={addManualTracks.bind(null, releaseId)}
      className="panel flex flex-col gap-3 p-4"
    >
      <div>
        <label
          htmlFor="manual-tracks"
          className="mb-1.5 block text-xs font-medium text-muted"
        >
          One song per line
        </label>
        <textarea
          id="manual-tracks"
          name="tracks"
          rows={8}
          defaultValue={existing}
          placeholder={"1. Song One 3:45\n2. Song Two 4:10\nSong Three"}
          className="field w-full resize-y px-3 py-2 font-mono text-sm"
        />
      </div>
      <p className="text-xs text-faint">
        Track numbers and running times are optional — paste a list off a sleeve or a
        wiki and it&apos;ll sort itself out. Saving replaces the songs currently
        listed.
      </p>
      <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
        Save songs
      </button>
    </form>
  );
}
