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
import { EditArtistForm } from "@/components/EditArtistForm";
import { LinkForSync } from "@/components/LinkForSync";
import { VinylIcon } from "@/components/icons";
import { deleteArtist } from "@/lib/actions";
import { isSyncableSource, providerLabel, supportsTracks } from "@/lib/providers";
import { IMPORT_SOURCE } from "@/lib/import/apply";
import { formatDate } from "@/lib/format";
import { byRating } from "@/lib/release-order";

/**
 * Releases drawn before "Show all" is offered.
 *
 * A discography is for browsing, so this is a screenful and a bit rather than
 * the two rows the home page previews with — but it is not two hundred and
 * thirty-eight. Drawing all of them made this page over a megabyte, sent on
 * every visit and again after every tick, for a page you almost always open to
 * look at one record near the top.
 */
const RELEASES_PER_PAGE = 24;

export default async function ArtistPage({
  params,
  searchParams,
}: PageProps<"/artists/[id]">) {
  const { id } = await params;
  // A search param rather than a cookie: which tab you're on is about this
  // visit, not a standing preference, and it keeps the tabs linkable.
  const query = await searchParams;
  const tab = query?.tab === "songs" ? "songs" : "releases";
  // Ranked or chronological. Also a search param, for the same reason: it is
  // how you are reading this artist right now, not a setting for the whole app.
  const sort = query?.sort === "rating" ? "rating" : "date";
  // A whole discography at once, when asked for. Also a search param: it is
  // about this visit, and it keeps a long page linkable in the state you left
  // it in.
  const showAll = query?.all === "1";

  /*
   * Tracks are fetched only for the tab that shows them.
   *
   * Both tabs used to load every track of every release, because the Releases
   * tab needed two numbers off the back of them — the song count in the tab
   * label, and how many of those songs are heard. For a large discography that
   * is a thousand track rows, each carrying its song and a count of that song's
   * other appearances, fetched and hydrated and thrown away to print
   * "Songs · 966". Two counting queries answer the same question without
   * reading a row, and the Releases tab now touches no track at all.
   */
  const [artist, songCount, heardSongCount, releasesWithSongs] = await Promise.all([
    prisma.artist.findUnique({
      where: { id },
      include: { releases: { orderBy: { releaseDate: "desc" } } },
    }),
    // Songs rather than tracks: the same song on an album and a compilation is
    // one thing to listen to, not two. Songs whose last track has gone are
    // cleared away as tracklists change, so counting them here matches what
    // the Songs tab lists.
    prisma.song.count({ where: { artistId: id } }),
    prisma.song.count({ where: { artistId: id, listened: true } }),
    tab === "songs"
      ? prisma.release.findMany({
          where: { artistId: id, tracks: { some: {} } },
          orderBy: { releaseDate: "desc" },
          /*
           * Capped unless asked otherwise: every tracklist of a large
           * discography at once is thousands of rows on one page, and reading
           * them all to render them all is the slowest thing this app does.
           *
           * One more than shown, which is how the page knows whether to offer
           * the rest without a second query counting what it already has.
           */
          ...(showAll ? {} : { take: RELEASES_PER_PAGE + 1 }),
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
        })
      : Promise.resolve([]),
  ]);

  if (!artist) notFound();

  // The extra row was only ever there to answer "is there more?".
  const moreSongLists = releasesWithSongs.length > RELEASES_PER_PAGE;
  const songLists = moreSongLists
    ? releasesWithSongs.slice(0, RELEASES_PER_PAGE)
    : releasesWithSongs;

  const listenedCount = artist.releases.filter((release) => release.listened).length;
  const favourites = artist.releases.filter((release) => release.favourite);
  const ordered = sort === "rating" ? byRating(artist.releases) : artist.releases;
  const orderedReleases = showAll ? ordered : ordered.slice(0, RELEASES_PER_PAGE);
  const heldBack = ordered.length - orderedReleases.length;

  /** This page as it is now, plus whatever is being changed. */
  const hrefWith = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (tab === "songs") params.set("tab", "songs");
    if (sort === "rating") params.set("sort", "rating");
    if (showAll) params.set("all", "1");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    return `/artists/${artist.id}${query ? `?${query}` : ""}`;
  };
  // Where releases are fetched from, which is separate from where the artist
  // came from: an imported artist can be pointed at a service later.
  const syncSource = artist.syncSource;
  const isSyncable =
    syncSource !== null && isSyncableSource(syncSource) && artist.syncExternalId !== null;
  const canLoadTracks = syncSource !== null && supportsTracks(syncSource);
  const isImported = artist.source === IMPORT_SOURCE;
  const isPaused = artist.status === "PAUSED";

  const missingSongs = canLoadTracks
    ? artist.releases.filter(
        (release) => release.tracksSyncedAt === null && release.externalId !== null,
      ).length
    : 0;

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

              {/* On the banner, under the name: for a catalogue spread across
                  units and side projects, the fuller reference is the thing you
                  came to reach. */}
              {artist.discographyUrl && (
                <a
                  href={artist.discographyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/30 transition hover:bg-accent/25"
                  title="Open the full discography in a new tab"
                >
                  Full discography
                  <span aria-hidden="true" className="text-[0.7rem]">↗</span>
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isSyncable && !isPaused && <SyncArtistButton artistId={artist.id} />}
            <StatusToggleButton artistId={artist.id} status={artist.status} />
          </div>
        </div>
      </section>

      <p className="-mt-6 text-xs text-faint">
        {isPaused
          ? "Paused, so nothing new is pulled in. Everything below stays exactly as it is."
          : isSyncable
            ? `${isImported ? "Imported from a file, and checked against" : "Releases come from"} ${providerLabel(syncSource!)}.${
                artist.lastSyncedAt
                  ? ` Last checked ${formatDate(artist.lastSyncedAt)}.`
                  : ""
              }${canLoadTracks ? "" : " It doesn't publish song lists, so releases only."}`
            : isImported
              ? "Imported from a discography file. Re-import it to bring in changes."
              : "Added by hand — log releases yourself below."}
      </p>

      {/* Nothing is watching for new releases yet, which is the one thing an
          imported or hand-built artist is missing. */}
      {!isSyncable && !isPaused && (
        <div className="-mt-6">
          <LinkForSync artistId={artist.id} artistName={artist.name} />
        </div>
      )}

      {/* Directly under the hero: what you think of an artist is the reason you
          opened their page, not a footnote to it. */}
      <section className="-mt-6">
        <ArtistNotes artistId={artist.id} notes={artist.notes} />
      </section>

      {/* Above the tabs, because this is the answer to "what should I play?" —
          the question the rest of the page makes you work for. Absent entirely
          until something is picked, so it never sits there as an empty shelf. */}
      {favourites.length > 0 && (
        <section>
          <h2 className="section-title mb-4">
            Favourites
            <span className="text-xs font-normal text-faint">{favourites.length}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {favourites.map((release) => (
              <ReleaseCard key={release.id} release={release} showRating />
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5">
            <Link
              href={hrefWith({ tab: null })}
              aria-current={tab === "releases" ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tab === "releases" ? "chip-on" : "text-muted hover:text-text"
              }`}
            >
              Releases · {artist.releases.length}
            </Link>
            <Link
              href={hrefWith({ tab: "songs" })}
              aria-current={tab === "songs" ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tab === "songs" ? "chip-on" : "text-muted hover:text-text"
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

          {/* Only worth offering once there is a ranking to read. */}
          {tab === "releases" && artist.releases.some((r) => r.rating !== null) && (
            <div
              className="inline-flex items-center gap-0.5 rounded-full border border-line p-0.5"
              role="group"
              aria-label="Order"
            >
              <Link
                href={hrefWith({ sort: null })}
                aria-current={sort === "date" ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sort === "date" ? "chip-on" : "text-muted hover:text-text"
                }`}
              >
                Newest
              </Link>
              <Link
                href={hrefWith({ sort: "rating" })}
                aria-current={sort === "rating" ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sort === "rating" ? "chip-on" : "text-muted hover:text-text"
                }`}
              >
                Best rated
              </Link>
            </div>
          )}
        </div>

        {tab === "releases" ? (
          artist.releases.length === 0 ? (
            <div className="panel px-5 py-12 text-center">
              <VinylIcon className="mx-auto size-8 text-white/15" />
              <p className="mt-3 text-sm text-muted">Nothing here yet.</p>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                {orderedReleases.map((release) => (
                  <ReleaseCard
                    key={release.id}
                    release={release}
                    showListenedDate
                    // Only in the ranked view: a rating you sorted by has to be
                    // legible, but on the chronological list it is one more
                    // thing under every title in a grid that is already dense.
                    showRating={sort === "rating"}
                  />
                ))}
              </ul>

              {heldBack > 0 && (
                <div className="mt-5">
                  <Link
                    href={hrefWith({ all: "1" })}
                    className="btn-ghost inline-block px-3 py-1.5 text-xs font-medium"
                  >
                    Show all {ordered.length}
                  </Link>
                </div>
              )}

              {showAll && ordered.length > RELEASES_PER_PAGE && (
                <div className="mt-5">
                  <Link
                    href={hrefWith({ all: null })}
                    className="btn-ghost inline-block px-3 py-1.5 text-xs font-medium"
                  >
                    Show fewer
                  </Link>
                </div>
              )}
            </>
          )
        ) : (
          <div className="flex flex-col gap-6">
            {missingSongs > 0 && (
              <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-xs text-muted">
                  {songLists.length === 0
                    ? "Song lists haven't been fetched yet."
                    : `${missingSongs} release${missingSongs === 1 ? "" : "s"} still to fetch.`}{" "}
                  <span className="text-faint">
                    Each one is a separate request, so they load in batches.
                  </span>
                </p>
                <LoadArtistTracksButton artistId={artist.id} remaining={missingSongs} />
              </div>
            )}

            {songLists.length === 0 ? (
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
              songLists.map((release) => {
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

            {/* Capped the same way as the grid, and for the same reason: every
                tracklist at once is the heaviest page in the app by some way. */}
            {moreSongLists && (
              <div>
                <Link
                  href={hrefWith({ all: "1" })}
                  className="btn-ghost inline-block px-3 py-1.5 text-xs font-medium"
                >
                  Show the rest
                </Link>
              </div>
            )}
          </div>
        )}
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

      <section>
        <details className="group">
          <summary className="eyebrow inline-flex cursor-pointer list-none items-center gap-1.5 transition-colors hover:text-muted">
            <span className="transition-transform group-open:rotate-90">›</span>
            Edit name or photo
          </summary>
          <div className="mt-3">
            <EditArtistForm artist={artist} />
          </div>
        </details>
      </section>

      <form action={deleteArtist.bind(null, artist.id)} className="border-t border-line pt-6">
        <ConfirmDeleteButton artistName={artist.name} />
      </form>
    </div>
  );
}
