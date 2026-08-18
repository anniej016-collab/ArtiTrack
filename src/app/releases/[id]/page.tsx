import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListenedToggle } from "@/components/ListenedToggle";
import { SetAsideToggle } from "@/components/SetAsideToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { TrackList } from "@/components/TrackList";
import { FavouriteSongs } from "@/components/FavouriteSongs";
import { LoadReleaseTracksButton } from "@/components/LoadTracksButton";
import { RatingStars } from "@/components/RatingStars";
import { FavouriteReleaseButton } from "@/components/FavouriteReleaseButton";
import { EditReleaseForm } from "@/components/EditReleaseForm";
import { ReleaseNotes } from "@/components/ReleaseNotes";
import { ManualTracklistForm } from "@/components/ManualTracklistForm";
import { CoverPlaceholder, VinylIcon } from "@/components/icons";
import { providerLabel, supportsTracks } from "@/lib/providers";
import { formatDate } from "@/lib/format";
import { MAX_FAVOURITE_SONGS } from "@/lib/favourites";

export const dynamic = "force-dynamic";

export default async function ReleasePage({ params }: PageProps<"/releases/[id]">) {
  const { id } = await params;

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      artist: { select: { id: true, name: true, syncSource: true } },
      tracks: {
        orderBy: { position: "asc" },
        include: {
          song: {
            select: {
              id: true,
              listened: true,
              // How many releases carry this song, so a repeat is visible as one.
              _count: { select: { tracks: true } },
            },
          },
        },
      },
    },
  });

  if (!release) notFound();

  const heard = release.tracks.filter((track) => track.song?.listened).length;
  const favourites = release.tracks.filter((track) => track.favourite).length;
  const syncSource = release.artist.syncSource;
  const canLoadTracks =
    syncSource !== null && supportsTracks(syncSource) && release.externalId !== null;
  // Only hand-entered rows are editable by hand; a fetched tracklist is the
  // provider's to replace.
  const manualTracks = release.tracks.filter((track) => track.externalId === null);

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
            <ReleaseTypeBadge
            type={release.type}
            title={release.title}
            category={release.category}
          />
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

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <RatingStars releaseId={release.id} rating={release.rating} />
            <FavouriteReleaseButton
              releaseId={release.id}
              favourite={release.favourite}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ListenedToggle releaseId={release.id} listened={release.listened} />
            {!release.listened && (
              <SetAsideToggle
                releaseId={release.id}
                title={release.title}
                setAside={release.setAside}
              />
            )}
          </div>

          <ReleaseNotes releaseId={release.id} notes={release.notes} />
        </div>
      </section>

      <FavouriteSongs
        count={release.tracks.length}
        picked={favourites}
        refresh={
          canLoadTracks && release.tracks.length > 0 ? (
            <LoadReleaseTracksButton releaseId={release.id} loaded />
          ) : null
        }
      >
        {release.tracks.length > 0 ? (
          <TrackList
            favourites
            atLimit={favourites >= MAX_FAVOURITE_SONGS}
            tracks={release.tracks.map((track) => ({
              ...track,
              appearances: track.song?._count.tracks,
            }))}
          />
        ) : (
          <div className="panel flex flex-col items-center gap-3 px-5 py-10 text-center">
            <VinylIcon className="size-7 text-white/15" />
            <p className="max-w-xs text-sm text-muted">
              {canLoadTracks
                ? "Song list hasn't been fetched yet."
                : release.externalId === null
                  ? "This release was added by hand, so there's no song list to fetch."
                  : syncSource === null
                    ? "Nothing is watching this artist yet, so there's no song list to fetch."
                    : `${providerLabel(syncSource)} doesn't publish song lists, so there's nothing to fetch.`}
            </p>
            {canLoadTracks && <LoadReleaseTracksButton releaseId={release.id} />}
          </div>
        )}
      </FavouriteSongs>

      {/* Offered whenever nothing can be fetched, and as an editor once songs
          have been typed in — the two cases the provider can't cover. */}
      {(!canLoadTracks || manualTracks.length > 0) && (
        <section>
          <details className="group" open={release.tracks.length === 0}>
            <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-muted">
              <span className="transition-transform group-open:rotate-90">›</span>
              {release.tracks.length === 0 ? "Type the songs in" : "Edit the songs"}
            </summary>
            <div className="mt-3">
              <ManualTracklistForm releaseId={release.id} tracks={manualTracks} />
            </div>
          </details>
        </section>
      )}

      <section>
        <details className="group">
          <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-muted">
            <span className="transition-transform group-open:rotate-90">›</span>
            Edit this release
          </summary>
          <div className="mt-3">
            <EditReleaseForm release={release} />
          </div>
        </details>
      </section>
    </div>
  );
}
