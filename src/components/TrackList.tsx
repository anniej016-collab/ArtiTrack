import Link from "next/link";
import { SongTickButton, FavouriteHeartButton } from "@/components/TrackButtons";
import { setSongListened, setTrackFavourite } from "@/lib/actions";


export type TrackRow = {
  id: string;
  title: string;
  position: number;
  duration: number | null;
  song: { id: string; listened: boolean } | null;
  /** How many releases carry this song, when it's more than this one. */
  appearances?: number;
  /** A favourite of this release. Only meaningful where tracks share one. */
  favourite?: boolean;
};

export function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function SongToggle({
  song,
  title,
}: {
  song: { id: string; listened: boolean };
  title: string;
}) {
  // Named after the song it belongs to: a column of a dozen buttons all
  // announcing "Mark heard" gives a screen reader no way to tell them apart,
  // and reads the same as the release-wide toggle sitting above them.
  return (
    <form action={setSongListened.bind(null, song.id, !song.listened)}>
      <SongTickButton listened={song.listened} title={title} />
    </form>
  );
}

/**
 * The favourite marker, which is hidden by default.
 *
 * Rendered on every row regardless, and shown by CSS: only when it is a
 * favourite, or while the release page is in picking mode. Doing it in the
 * markup instead would mean the whole list re-rendering to enter that mode, and
 * a server round trip to reveal a control is a strange thing to sit through.
 */
function FavouriteToggle({
  track,
  atLimit,
}: {
  track: TrackRow & { favourite: boolean };
  atLimit: boolean;
}) {
  return (
    <span className="flex w-7 shrink-0 justify-center">
      <form action={setTrackFavourite.bind(null, track.id, !track.favourite)}>
        <FavouriteHeartButton
          favourite={track.favourite}
          // Nothing to press: three are already picked and this isn't one.
          spent={atLimit && !track.favourite}
          title={track.title}
        />
      </form>
    </span>
  );
}

export function TrackList({
  tracks,
  /** Shown on the artist-wide songs view, where tracks come from many releases. */
  releaseHref,
  /**
   * Turns on the favourite hearts. Only passed by the release page: a
   * favourite belongs to one record, so the artist-wide song list — where a
   * song may be a favourite on one release and not another — has nothing
   * unambiguous to show.
   */
  favourites = false,
  atLimit = false,
}: {
  tracks: TrackRow[];
  releaseHref?: string;
  favourites?: boolean;
  atLimit?: boolean;
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

            {favourites && (
              <FavouriteToggle
                track={{ ...track, favourite: track.favourite ?? false }}
                atLimit={atLimit}
              />
            )}

            {track.song ? (
              <SongToggle song={track.song} title={track.title} />
            ) : (
              <span className="w-7 shrink-0" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
