import Link from "next/link";
import { setSongListened } from "@/lib/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";

export type TrackRow = {
  id: string;
  title: string;
  position: number;
  duration: number | null;
  song: { id: string; listened: boolean } | null;
  /** How many releases carry this song, when it's more than this one. */
  appearances?: number;
};

export function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function SongToggle({ song }: { song: { id: string; listened: boolean } }) {
  const name = song.listened ? "Heard" : "Mark heard";

  return (
    <form action={setSongListened.bind(null, song.id, !song.listened)}>
      <button
        type="submit"
        aria-label={name}
        aria-pressed={song.listened}
        title={
          song.listened
            ? "Mark as not heard, everywhere this song appears"
            : "Mark as heard, everywhere this song appears"
        }
        className={`flex size-7 shrink-0 items-center justify-center rounded-full transition ${
          song.listened
            ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
            : "border border-line text-faint hover:bg-panel-hover hover:text-text"
        }`}
      >
        {song.listened ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <PlusIcon className="size-3.5" />
        )}
      </button>
    </form>
  );
}

export function TrackList({
  tracks,
  /** Shown on the artist-wide songs view, where tracks come from many releases. */
  releaseHref,
}: {
  tracks: TrackRow[];
  releaseHref?: string;
}) {
  return (
    <ul className="panel divide-y divide-line overflow-hidden">
      {tracks.map((track) => {
        const duration = formatDuration(track.duration);
        const listened = track.song?.listened ?? false;

        return (
          <li
            key={track.id}
            className="row-hover flex items-center gap-3 px-3 py-2.5"
          >
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-faint">
              {track.position}
            </span>

            <div className="min-w-0 flex-1">
              {releaseHref ? (
                <Link
                  href={releaseHref}
                  className={`block truncate text-sm transition-colors hover:text-accent ${
                    listened ? "text-muted" : ""
                  }`}
                >
                  {track.title}
                </Link>
              ) : (
                <p className={`truncate text-sm ${listened ? "text-muted" : ""}`}>
                  {track.title}
                </p>
              )}
              {track.appearances !== undefined && track.appearances > 1 && (
                <p className="text-[0.7rem] text-faint">
                  on {track.appearances} releases
                </p>
              )}
            </div>

            {duration && (
              <span className="shrink-0 text-xs tabular-nums text-faint">
                {duration}
              </span>
            )}

            {track.song ? (
              <SongToggle song={track.song} />
            ) : (
              <span className="w-7 shrink-0" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
