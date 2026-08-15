import Link from "next/link";
import { ListenedToggle } from "@/components/ListenedToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { CoverPlaceholder } from "@/components/icons";
import { formatDate } from "@/lib/format";

export type ReleaseCardData = {
  id: string;
  title: string;
  type: string;
  releaseDate: Date;
  coverUrl: string | null;
  listened: boolean;
  listenedAt: Date | null;
  artistId: string;
  artist?: { name: string };
};

/** Shared by the home grid and the artist page, so the two never drift apart. */
export function ReleaseCard({
  release,
  showArtist = false,
  showListenedDate = false,
}: {
  release: ReleaseCardData;
  showArtist?: boolean;
  showListenedDate?: boolean;
}) {
  return (
    <li className="group flex flex-col gap-2.5">
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

        <div className="absolute right-2 top-2">
          <ListenedToggle
            releaseId={release.id}
            listened={release.listened}
            variant="overlay"
          />
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={release.title}>
          {release.title}
        </p>

        {showArtist && release.artist && (
          <Link
            href={`/artists/${release.artistId}`}
            className="mt-0.5 block truncate text-xs text-muted transition-colors hover:text-accent"
          >
            {release.artist.name}
          </Link>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ReleaseTypeBadge type={release.type} />
          <span className="text-xs text-faint">
            {release.releaseDate.getUTCFullYear()}
          </span>
        </div>

        {showListenedDate && release.listenedAt && (
          <p className="mt-1 text-[0.7rem] text-faint">
            Heard {formatDate(release.listenedAt)}
          </p>
        )}
      </div>
    </li>
  );
}
