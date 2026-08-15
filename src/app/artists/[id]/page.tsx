import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddReleaseForm } from "@/components/AddReleaseForm";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { SyncArtistButton } from "@/components/SyncButtons";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ReleaseCard } from "@/components/ReleaseCard";
import { VinylIcon } from "@/components/icons";
import { deleteArtist } from "@/lib/actions";
import { formatDate } from "@/lib/format";

export default async function ArtistPage({ params }: PageProps<"/artists/[id]">) {
  const { id } = await params;

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: { releases: { orderBy: { releaseDate: "desc" } } },
  });

  if (!artist) notFound();

  const listenedCount = artist.releases.filter((release) => release.listened).length;
  const isSyncable = artist.source !== "manual" && artist.externalId !== null;
  const isPaused = artist.status === "PAUSED";

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
            ? `Releases come from Deezer.${
                artist.lastSyncedAt
                  ? ` Last checked ${formatDate(artist.lastSyncedAt)}.`
                  : ""
              }`
            : "Added by hand — log releases yourself below."}
      </p>

      <section>
        <h2 className="eyebrow mb-3">
          Releases {artist.releases.length > 0 && `· ${artist.releases.length}`}
        </h2>

        {artist.releases.length === 0 ? (
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

      <form action={deleteArtist.bind(null, artist.id)} className="border-t border-line pt-6">
        <ConfirmDeleteButton artistName={artist.name} />
      </form>
    </div>
  );
}
