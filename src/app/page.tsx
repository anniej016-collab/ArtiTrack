import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddArtistForm } from "@/components/AddArtistForm";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { formatDate, releaseTypeLabels } from "@/lib/format";

export default async function Home() {
  const [activeArtists, pausedArtists, recentReleases] = await Promise.all([
    prisma.artist.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
    prisma.artist.findMany({
      where: { status: "PAUSED" },
      orderBy: { name: "asc" },
    }),
    prisma.release.findMany({
      where: { artist: { status: "ACTIVE" } },
      orderBy: { releaseDate: "desc" },
      take: 10,
      include: { artist: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Your artists
        </h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Add an artist to start tracking their releases.
        </p>
        <AddArtistForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Recent releases from artists you follow
        </h2>
        {recentReleases.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing yet — log a release from an artist&apos;s page once you&apos;ve added one.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {recentReleases.map((release) => (
              <li key={release.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{release.title}</p>
                  <p className="text-xs text-zinc-500">
                    {release.artist.name} · {releaseTypeLabels[release.type]} ·{" "}
                    {formatDate(release.releaseDate)}
                  </p>
                </div>
                <Link
                  href={`/artists/${release.artistId}`}
                  className="text-xs font-medium text-zinc-500 hover:text-foreground"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Following ({activeArtists.length})
        </h2>
        {activeArtists.length === 0 ? (
          <p className="text-sm text-zinc-500">No artists yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {activeArtists.map((artist) => (
              <li key={artist.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/artists/${artist.id}`} className="text-sm font-medium hover:underline">
                  {artist.name}
                </Link>
                <StatusToggleButton artistId={artist.id} status="ACTIVE" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {pausedArtists.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Paused ({pausedArtists.length})
          </h2>
          <p className="mb-3 text-xs text-zinc-500">
            You won&apos;t see new releases from these artists here, but their full history is still saved on their page.
          </p>
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 opacity-70 dark:divide-white/10 dark:border-white/10">
            {pausedArtists.map((artist) => (
              <li key={artist.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/artists/${artist.id}`} className="text-sm font-medium hover:underline">
                  {artist.name}
                </Link>
                <StatusToggleButton artistId={artist.id} status="PAUSED" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
