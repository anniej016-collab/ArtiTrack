import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListenedToggle } from "@/components/ListenedToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { TrackList } from "@/components/TrackList";
import { LoadReleaseTracksButton } from "@/components/LoadTracksButton";
import { CoverPlaceholder, VinylIcon } from "@/components/icons";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReleasePage({ params }: PageProps<"/releases/[id]">) {
  const { id } = await params;

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      artist: { select: { id: true, name: true, source: true } },
      tracks: { orderBy: { position: "asc" } },
    },
  });

  if (!release) notFound();

  const heard = release.tracks.filter((track) => track.listened).length;
  const canLoadTracks =
    release.artist.source !== "manual" && release.externalId !== null;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/artists/${release.artistId}`}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-faint transition-colors hover:text-text"
      >
        <span aria-hidden="true">←</span> {release.artist.name}
      </Link>

      <section className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="aspect-square w-40 shrink-0 overflow-hidden rounded-xl border border-line bg-white/2 sm:w-48">
          {release.coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
            <img src={release.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <CoverPlaceholder className="size-full" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {release.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{release.artist.name}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <ReleaseTypeBadge type={release.type} />
            <span className="text-xs text-faint">
              {formatDate(release.releaseDate)}
            </span>
            {release.tracks.length > 0 && (
              <span className="text-xs text-faint">
                <span className="mx-1 opacity-40">·</span>
                {heard} of {release.tracks.length} songs heard
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ListenedToggle releaseId={release.id} listened={release.listened} />
            {canLoadTracks && release.tracks.length > 0 && (
              <LoadReleaseTracksButton releaseId={release.id} />
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">
          Songs {release.tracks.length > 0 && `· ${release.tracks.length}`}
        </h2>

        {release.tracks.length > 0 ? (
          <TrackList tracks={release.tracks} />
        ) : (
          <div className="panel flex flex-col items-center gap-3 px-5 py-10 text-center">
            <VinylIcon className="size-7 text-white/15" />
            <p className="max-w-xs text-sm text-muted">
              {canLoadTracks
                ? "Song list hasn't been fetched yet."
                : "This release was added by hand, so there's no song list to fetch."}
            </p>
            {canLoadTracks && <LoadReleaseTracksButton releaseId={release.id} />}
          </div>
        )}
      </section>
    </div>
  );
}
