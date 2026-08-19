import Link from "next/link";
import { ListenedToggle } from "@/components/ListenedToggle";
import { SetAsideToggle } from "@/components/SetAsideToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { CoverPlaceholder, HeartIcon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import { STAR_COUNT, formatRating } from "@/lib/rating";
import { isNewRelease } from "@/lib/newness";

export type ReleaseCardData = {
  id: string;
  title: string;
  type: string;
  category: string | null;
  releaseDate: Date;
  coverUrl: string | null;
  listened: boolean;
  listenedAt: Date | null;
  setAside: boolean;
  rating?: number | null;
  favourite?: boolean;
  arrivedAt?: Date | null;
  firstSeenAt?: Date | null;
  artistId: string;
  artist?: { name: string };
};

/**
 * A rating at a glance, shown as pips rather than five drawn stars.
 *
 * At this size five outlined stars turn to mush, and the row has to sit under a
 * title without competing with it. Only filled pips are drawn — the empty half
 * of the scale is the part nobody reads. A half-star is a half-width pip, which
 * is legible at 6px in a way that half a star outline is not.
 */
function RatingPips({ rating }: { rating: number }) {
  const whole = Math.floor(rating / 2);
  const half = rating % 2 === 1;
  const label = `${formatRating(rating)} out of ${STAR_COUNT}`;

  return (
    <p className="mt-1 flex items-center gap-1" title={label}>
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: whole }, (_, index) => (
          <span key={index} className="size-1.5 rounded-full bg-accent" />
        ))}
        {half && <span className="h-1.5 w-[3px] rounded-full bg-accent" />}
      </span>
      <span className="sr-only">Rated {label}</span>
    </p>
  );
}

/** Shared by the home grid and the artist page, so the two never drift apart. */
export function ReleaseCard({
  release,
  showArtist = false,
  showListenedDate = false,
  showRating = false,
  compact = false,
}: {
  release: ReleaseCardData;
  showArtist?: boolean;
  showListenedDate?: boolean;
  /** Stars under the title. Only where the ranking is the point of the list. */
  showRating?: boolean;
  /** Denser text for the home page, where many tiles share the screen with other sections. */
  compact?: boolean;
}) {
  return (
    <li className={`group relative flex flex-col ${compact ? "gap-2" : "gap-2.5"}`}>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-white/2">
        {release.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
          <img
            src={release.coverUrl}
            alt=""
            loading="lazy"
            /* Heard covers recede a little, but the check badge is the real
               signal — dimming hard makes a fully-heard catalogue look washed out. */
            className={`size-full object-cover transition duration-300 group-hover:scale-[1.04] ${
              release.listened ? "opacity-75" : ""
            }`}
          />
        ) : (
          <CoverPlaceholder className="size-full" />
        )}

        {/* Above the stretched link so it toggles instead of opening the release.
            Only one position utility: pairing `relative` with `absolute` here let
            `relative` win — Tailwind emits it later — which dropped the button
            into flow, where the cover's overflow-hidden clipped it out of sight. */}
        <div
          className={`absolute z-10 ${compact ? "right-1.5 top-1.5" : "right-2 top-2"}`}
        >
          <ListenedToggle
            releaseId={release.id}
            listened={release.listened}
            variant="overlay"
            size={compact ? "sm" : "md"}
          />
        </div>

        {/* Opposite corner from the tick: two different decisions, so they
            shouldn't be neighbours you can hit by mistake. Hidden once heard,
            when there is nothing left to decide. */}
        {!release.listened && (
          <div
            className={`absolute z-10 ${compact ? "left-1.5 top-1.5" : "left-2 top-2"}`}
          >
            <SetAsideToggle
              releaseId={release.id}
              title={release.title}
              setAside={release.setAside}
              variant="overlay"
            />
          </div>
        )}

        {/* Bottom-right, the last free corner. Says why this one is above the
            rest of the queue, and goes quiet with the split it explains. */}
        {isNewRelease(
          { arrivedAt: release.arrivedAt ?? null, firstSeenAt: release.firstSeenAt ?? null },
          new Date(),
        ) && (
          <div
            className={`absolute z-10 rounded-full bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-on-accent ${
              compact ? "bottom-1.5 right-1.5" : "bottom-2 right-2"
            }`}
          >
            New
          </div>
        )}

        {/* A mark, not a control: both top corners are already spoken for, and
            the place to change your mind is the release's own page. */}
        {release.favourite && (
          <div
            className={`absolute z-10 flex items-center justify-center rounded-full bg-black/55 p-1 text-accent backdrop-blur-sm ${
              compact ? "bottom-1.5 left-1.5" : "bottom-2 left-2"
            }`}
            title="One of your favourites"
          >
            <HeartIcon className="size-3.5" filled />
            <span className="sr-only">Favourite</span>
          </div>
        )}
      </div>

      <div className="min-w-0">
        {/* Stretched over the whole tile: the cover is the obvious thing to tap. */}
        <Link
          href={`/releases/${release.id}`}
          className={`block truncate font-medium transition-colors after:absolute after:inset-0 hover:text-accent ${
            compact ? "text-xs" : "text-sm"
          }`}
          title={release.title}
        >
          {release.title}
        </Link>

        {showArtist && release.artist && (
          <Link
            href={`/artists/${release.artistId}`}
            className={`relative z-10 mt-0.5 block truncate text-muted transition-colors hover:text-accent ${
              compact ? "text-[0.7rem]" : "text-xs"
            }`}
          >
            {release.artist.name}
          </Link>
        )}

        <div
          className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 ${
            compact ? "mt-1" : "mt-1.5 gap-x-2"
          }`}
        >
          <ReleaseTypeBadge
            type={release.type}
            title={release.title}
            category={release.category}
          />
          <span className={compact ? "text-[0.7rem] text-faint" : "text-xs text-faint"}>
            {release.releaseDate.getUTCFullYear()}
          </span>
        </div>

        {showRating && release.rating != null && (
          <RatingPips rating={release.rating} />
        )}

        {/* Both, not just the date: the date survives un-ticking now, so a
            release you have taken back off would otherwise still say "Heard". */}
        {showListenedDate && release.listened && release.listenedAt && (
          <p className="mt-1 text-[0.7rem] text-faint">
            Heard {formatDate(release.listenedAt)}
          </p>
        )}
      </div>
    </li>
  );
}
