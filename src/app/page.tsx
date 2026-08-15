import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddArtistForm } from "@/components/AddArtistForm";
import { ArtistSearch } from "@/components/ArtistSearch";
import { SyncAllButton } from "@/components/SyncButtons";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { ListenedToggle } from "@/components/ListenedToggle";
import { formatDate, releaseTypeLabels } from "@/lib/format";

// Always read live data, and keep the database out of the build step.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [activeArtists, pausedArtists, toListen, recentlyListened] =
    await Promise.all([
      prisma.artist.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
      }),
      prisma.artist.findMany({
        where: { status: "PAUSED" },
        orderBy: { name: "asc" },
      }),
      prisma.release.findMany({
        where: { listened: false, artist: { status: "ACTIVE" } },
        orderBy: { releaseDate: "desc" },
        take: 15,
        include: { artist: true },
      }),
      // Only releases marked by hand, which is what carries a date. An imported
      // back catalogue is listened but undated, and was never "recent".
      prisma.release.findMany({
        where: { listenedAt: { not: null }, artist: { status: "ACTIVE" } },
        orderBy: { listenedAt: "desc" },
        take: 5,
        include: { artist: true },
      }),
    ]);

  const syncableCount = activeArtists.filter(
    (artist) => artist.source !== "manual" && artist.externalId,
  ).length;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Your artists
        </h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Search for an artist to pull in their releases automatically.
        </p>
        <ArtistSearch />
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-foreground">
            Can&apos;t find them? Add by hand
          </summary>
          <div className="mt-3">
            <AddArtistForm />
          </div>
        </details>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            To listen ({toListen.length})
          </h2>
          {syncableCount > 0 && <SyncAllButton />}
        </div>
        {toListen.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing waiting — you&apos;re all caught up on the artists you follow.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {toListen.map((release) => (
              <li
                key={release.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{release.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    <Link
                      href={`/artists/${release.artistId}`}
                      className="hover:underline"
                    >
                      {release.artist.name}
                    </Link>{" "}
                    · {releaseTypeLabels[release.type]} ·{" "}
                    {formatDate(release.releaseDate)}
                  </p>
                </div>
                <ListenedToggle releaseId={release.id} listened={release.listened} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentlyListened.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Recently listened
          </h2>
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {recentlyListened.map((release) => (
              <li
                key={release.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{release.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    <Link
                      href={`/artists/${release.artistId}`}
                      className="hover:underline"
                    >
                      {release.artist.name}
                    </Link>{" "}
                    · {releaseTypeLabels[release.type]} ·{" "}
                    {formatDate(release.releaseDate)}
                  </p>
                </div>
                <ListenedToggle releaseId={release.id} listened={release.listened} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Following ({activeArtists.length})
        </h2>
        {activeArtists.length === 0 ? (
          <p className="text-sm text-zinc-500">No artists yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {activeArtists.map((artist) => (
              <li
                key={artist.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
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
            You won&apos;t see new releases from these artists here, but their full
            history is still saved on their page.
          </p>
          <ul className="flex flex-col divide-y divide-black/10 rounded-lg border border-black/10 opacity-70 dark:divide-white/10 dark:border-white/10">
            {pausedArtists.map((artist) => (
              <li
                key={artist.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
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
