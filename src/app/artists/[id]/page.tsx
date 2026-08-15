import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddReleaseForm } from "@/components/AddReleaseForm";
import { StatusToggleButton } from "@/components/StatusToggleButton";
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
    (release) => release.listenedAt !== null,
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="text-xs font-medium text-zinc-500 hover:text-foreground">
          ← All artists
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{artist.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {artist.status === "ACTIVE"
              ? "You're following new releases from this artist."
              : `Updates paused${artist.pausedAt ? " on " + formatDate(artist.pausedAt) : ""}. Their release history below is unaffected.`}
          </p>
        </div>
        <StatusToggleButton artistId={artist.id} status={artist.status} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Log a release
        </h2>
        <AddReleaseForm artistId={artist.id} />
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
                <ListenedToggle
                  releaseId={release.id}
                  listened={release.listenedAt !== null}
                />
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
