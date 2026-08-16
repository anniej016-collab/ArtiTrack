import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddReleaseForm } from "@/components/AddReleaseForm";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { SyncArtistButton } from "@/components/SyncButtons";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ReleaseCard } from "@/components/ReleaseCard";
import { TrackList } from "@/components/TrackList";
import { LoadArtistTracksButton } from "@/components/LoadTracksButton";
import { ArtistNotes } from "@/components/ArtistNotes";
import { VinylIcon } from "@/components/icons";
import { deleteArtist } from "@/lib/actions";
import { isSyncableSource, providerLabel, supportsTracks } from "@/lib/providers";
import { formatDate } from "@/lib/format";

export default async function ArtistPage({
  params,
  searchParams,
}: PageProps<"/artists/[id]">) {
  const { id } = await params;
  // A search param rather than a cookie: which tab you're on is about this
  // visit, not a standing preference, and it keeps the tabs linkable.
  const tab = (await searchParams)?.tab === "songs" ? "songs" : "releases";

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      releases: {
        orderBy: { releaseDate: "desc" },
        include: {
          tracks: {
            orderBy: { position: "asc" },
            include: {
              song: {
                select: {
                  id: true,
                  listened: true,
                  _count: { select: { tracks: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!artist) notFound();

  const listenedCount = artist.releases.filter((release) => release.listened).length;
  const isSyncable = isSyncableSource(artist.source) && artist.externalId !== null;
  const canLoadTracks = supportsTracks(artist.source);
  const isPaused = artist.status === "PAUSED";

  const releasesWithSongs = artist.releases.filter(
    (release) => release.tracks.length > 0,
  );
  const missingSongs = canLoadTracks
    ? artist.releases.filter(
        (release) => release.tracksSyncedAt === null && release.externalId !== null,
      ).length
    : 0;
  // Counted per song, not per track: the same song on an album and a compilation
  // is one thing to listen to, not two.
  const songIds = new Set(
    artist.releases.flatMap((release) =>
      release.tracks.flatMap((track) => (track.song ? [track.song.id] : [])),
    ),
  );
  const heardSongIds = new Set(
    artist.releases.flatMap((release) =>
      release.tracks.flatMap((track) =>
        track.song?.listened ? [track.song.id] : [],
      ),
    ),
  );
  const songCount = songIds.size;
  const heardSongCount = heardSongIds.size;

  return (
    <div className="flex flex-col gap-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-faint transition-colors hover:text-text"
      >
        <span aria-hidden="true">←</span> All artists
      </Link>

      {/* Hero: the artist photo doubles as the backdrop, blurred out behind itself. */}
      <section className="relative overflow-hidden rounded-2xl border border-line">
        {artist.imageUrl && (
          <div className="absolute inset-0" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */}
            <img
              src={artist.imageUrl}
              alt=""
              className="size-full scale-125 object-cover opacity-40 blur-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/50" />
          </div>
        )}

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {artist.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
              <img
                src={artist.imageUrl}
                alt=""
                className="size-20 shrink-0 rounded-full object-cover ring-2 ring-white/15 sm:size-24"
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/25 to-accent-2/25 ring-2 ring-white/10 sm:size-24">
                <VinylIcon className="size-10 text-white/40" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display truncate text-3xl font-semibold tracking-tight sm:text-4xl">
                {artist.name}
              </h1>
              <p className="mt-1.5 text-xs text-muted">
                {artist.releases.length} release
                {artist.releases.length === 1 ? "" : "s"}
                <span className="mx-1.5 opacity-40">•</span>
                {listenedCount} heard
                {isPaused && (
                  <>
                    <span className="mx-1.5 opacity-40">•</span>
                    <span className="text-amber-300/90">
                      paused
                      {artist.pausedAt ? ` ${formatDate(artist.pausedAt)}` : ""}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isSyncable && !isPaused && <SyncArtistButton artistId={artist.id} />}
            <StatusToggleButton artistId={artist.id} status={artist.status} />
          </div>
        </div>
      </section>

      <p className="-mt-6 text-xs text-faint">
        {isPaused
          ? "Paused, so nothing new is pulled in. Everything below stays exactly as it is."
          : isSyncable
            ? `Releases come from ${providerLabel(artist.source)}.${
                artist.lastSyncedAt
                  ? ` Last checked ${formatDate(artist.lastSyncedAt)}.`
                  : ""
              }${canLoadTracks ? "" : " It doesn't publish song lists, so releases only."}`
            : "Added by hand — log releases yourself below."}
      </p>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5">
            <Link
              href={`/artists/${artist.id}`}
              aria-current={tab === "releases" ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tab === "releases"
                  ? "bg-white/90 text-black"
                  : "text-faint hover:text-text"
              }`}
            >
              Releases · {artist.releases.length}
            </Link>
            <Link
              href={`/artists/${artist.id}?tab=songs`}
              aria-current={tab === "songs" ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tab === "songs" ? "bg-white/90 text-black" : "text-faint hover:text-text"
              }`}
            >
              Songs{songCount > 0 ? ` · ${songCount}` : ""}
            </Link>
          </div>

          {tab === "songs" && songCount > 0 && (
            <p className="text-xs text-faint">
              {heardSongCount} of {songCount} heard
            </p>
          )}
        </div>

        {tab === "releases" ? (
          artist.releases.length === 0 ? (
            <div className="panel px-5 py-12 text-center">
              <VinylIcon className="mx-auto size-8 text-white/15" />
              <p className="mt-3 text-sm text-muted">Nothing here yet.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {artist.releases.map((release) => (
                <ReleaseCard key={release.id} release={release} showListenedDate />
              ))}
            </ul>
          )
        ) : (
          <div className="flex flex-col gap-6">
            {missingSongs > 0 && (
              <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-xs text-muted">
                  {releasesWithSongs.length === 0
                    ? "Song lists haven't been fetched yet."
                    : `${missingSongs} release${missingSongs === 1 ? "" : "s"} still to fetch.`}{" "}
                  <span className="text-faint">
                    Each one is a separate request, so they load in batches.
                  </span>
                </p>
                <LoadArtistTracksButton artistId={artist.id} remaining={missingSongs} />
              </div>
            )}

            {releasesWithSongs.length === 0 ? (
              missingSongs === 0 && (
                <div className="panel flex flex-col items-center gap-3 px-5 py-10 text-center">
                  <VinylIcon className="size-7 text-white/15" />
                  <p className="max-w-xs text-sm text-muted">
                    {isSyncable && !canLoadTracks
                      ? `${providerLabel(artist.source)} doesn't publish song lists, so there's nothing to fetch here.`
                      : "No songs to show."}
                  </p>
                </div>
              )
            ) : (
              releasesWithSongs.map((release) => {
                const heard = release.tracks.filter((t) => t.song?.listened).length;
                return (
                  <div key={release.id}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <Link
                        href={`/releases/${release.id}`}
                        className="font-display truncate text-base font-semibold tracking-tight transition-colors hover:text-accent"
                      >
                        {release.title}
                      </Link>
                      <span className="shrink-0 text-xs text-faint">
                        {heard}/{release.tracks.length}
                      </span>
                    </div>
                    <TrackList
                      tracks={release.tracks.map((track) => ({
                        ...track,
                        appearances: track.song?._count.tracks,
                      }))}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <section>
        <ArtistNotes artistId={artist.id} notes={artist.notes} />
      </section>

      <section>
        <details className="group">
          <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-muted">
            <span className="transition-transform group-open:rotate-90">›</span>
            Log a release by hand
          </summary>
          <div className="mt-3">
            <AddReleaseForm artistId={artist.id} />
          </div>
        </details>
      </section>

      <form action={deleteArtist.bind(null, artist.id)} className="border-t border-line pt-6">
        <ConfirmDeleteButton artistName={artist.name} />
      </form>
    </div>
  );
}
