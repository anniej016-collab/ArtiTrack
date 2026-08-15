import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddReleaseForm } from "@/components/AddReleaseForm";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { SyncArtistButton } from "@/components/SyncButtons";
import { ListenedToggle } from "@/components/ListenedToggle";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteArtist } from "@/lib/actions";
import { formatDate, releaseTypeLabels } from "@/lib/format";

export default async function ArtistPage({
  params,
}: PageProps<"/artists/[id]">) {
  const { id } = await params;

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: { releases: { orderBy: { releaseDate: "desc" } } },
  });

  if (!artist) notFound();

  const listenedCount = artist.releases.filter(
    (release) => release.listened,
  ).length;

  const isSyncable = artist.source !== "manual" && artist.externalId !== null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="text-xs font-medium text-zinc-500 hover:text-foreground">
          ← All artists
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {artist.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
            <img
              src={artist.imageUrl}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full bg-black/5 text-xl font-medium text-zinc-400 dark:bg-white/10"
            >
              {artist.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{artist.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {artist.status === "ACTIVE"
                ? "You're following new releases from this artist."
                : `Updates paused${artist.pausedAt ? " on " + formatDate(artist.pausedAt) : ""}. Their release history below is unaffected.`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusToggleButton artistId={artist.id} status={artist.status} />
          {isSyncable && artist.status === "ACTIVE" && (
            <SyncArtistButton artistId={artist.id} />
          )}
        </div>
      </div>

      {isSyncable && (
        <p className="-mt-4 text-xs text-zinc-500">
          Releases come from Deezer.
          {artist.lastSyncedAt
            ? ` Last checked ${formatDate(artist.lastSyncedAt)}.`
            : ""}
        </p>
      )}

      <section>
        <details>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500 hover:text-foreground">
            Log a release by hand
          </summary>
          <div className="mt-3">
            <AddReleaseForm artistId={artist.id} />
          </div>
        </details>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Release history ({artist.releases.length})
          {listenedCount > 0 && (
            <span className="ml-2 font-normal normal-case tracking-normal text-zinc-400">
              {listenedCount} listened
            </span>
          )}
        </h2>
        {artist.releases.length === 0 ? (
          <p className="text-sm text-zinc-500">No releases logged yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {artist.releases.map((release) => (
              <li
                key={release.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {release.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- provider host isn't known ahead of time */
                    <img
                      src={release.coverUrl}
                      alt=""
                      className="size-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="size-12 shrink-0 rounded bg-black/5 dark:bg-white/10"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{release.title}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {releaseTypeLabels[release.type]} ·{" "}
                      {formatDate(release.releaseDate)}
                      {release.listenedAt
                        ? ` · listened ${formatDate(release.listenedAt)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <ListenedToggle releaseId={release.id} listened={release.listened} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={deleteArtist.bind(null, artist.id)} className="pt-4">
        <ConfirmDeleteButton artistName={artist.name} />
      </form>
    </div>
  );
}
