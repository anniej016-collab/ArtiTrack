import Link from "next/link";
import { setSongListened, setTrackFavourite } from "@/lib/actions";
import { CheckIcon, HeartIcon, PlusIcon } from "@/components/icons";

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
  const name = song.listened ? `${title}, heard` : `Mark ${title} heard`;

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
  // Nothing to press: three are already picked and this isn't one of them.
  const spent = atLimit && !track.favourite;

  return (
    <span className="flex w-7 shrink-0 justify-center">
      <form action={setTrackFavourite.bind(null, track.id, !track.favourite)}>
        <button
          type="submit"
          disabled={spent}
          data-on={track.favourite ? "true" : "false"}
          aria-label={
            track.favourite
              ? `${track.title}, a favourite on this release`
              : `Make ${track.title} a favourite on this release`
          }
          aria-pressed={track.favourite}
          title={
            spent
              ? `Three favourites already picked on this release`
              : track.favourite
                ? "Remove from favourites"
                : "Make a favourite of this release"
          }
          className={`song-favourite size-7 items-center justify-center rounded-full transition ${
            track.favourite
              ? "text-accent hover:text-accent/70"
              : spent
                ? "cursor-not-allowed text-white/10"
                : "text-white/25 hover:text-accent"
          }`}
        >
          <HeartIcon className="size-4" filled={track.favourite} />
        </button>
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
