import Link from "next/link";
import { setTrackListened } from "@/lib/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";

export type TrackRow = {
  id: string;
  title: string;
  position: number;
  duration: number | null;
  listened: boolean;
};

export function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function TrackToggle({ track }: { track: TrackRow }) {
  const label = track.listened ? "Mark song as not heard" : "Mark song as heard";

  return (
    <form action={setTrackListened.bind(null, track.id, !track.listened)}>
      <button
        type="submit"
        aria-label={label}
        aria-pressed={track.listened}
        title={label}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full transition ${
          track.listened
            ? "bg-success/15 text-success ring-1 ring-inset ring-success/25 hover:bg-success/25"
            : "border border-line text-faint hover:bg-panel-hover hover:text-text"
        }`}
      >
        {track.listened ? (
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
                    track.listened ? "text-muted" : ""
                  }`}
                >
                  {track.title}
                </Link>
              ) : (
                <p className={`truncate text-sm ${track.listened ? "text-muted" : ""}`}>
                  {track.title}
                </p>
              )}
            </div>
            {duration && (
              <span className="shrink-0 text-xs tabular-nums text-faint">{duration}</span>
            )}
            <TrackToggle track={track} />
          </li>
        );
      })}
    </ul>
  );
}
