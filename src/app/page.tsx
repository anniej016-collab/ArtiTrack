import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddArtistForm } from "@/components/AddArtistForm";
import { ArtistSearch } from "@/components/ArtistSearch";
import { SyncAllButton } from "@/components/SyncButtons";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { ListenedToggle } from "@/components/ListenedToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { formatDate } from "@/lib/format";

// Always read live data, and keep the database out of the build step.
export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="panel px-4 py-3">
      {/* Body font for figures: the display face's flagged "1" collides with a
          following digit at this size. */}
      <p className="font-sans text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-faint">{label}</p>
    </div>
  );
}

/* Deliberately no artwork on this page — it stays a clean, scannable list. */
function ReleaseRow({
  release,
}: {
  release: {
    id: string;
    title: string;
    type: string;
    releaseDate: Date;
    listened: boolean;
    artistId: string;
    artist: { name: string };
  };
}) {
  return (
    <li className="row-hover flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{release.title}</p>
          <ReleaseTypeBadge type={release.type} />
        </div>
        <p className="mt-1 truncate text-xs text-faint">
          <Link
            href={`/artists/${release.artistId}`}
            className="text-muted transition-colors hover:text-text"
          >
            {release.artist.name}
          </Link>
          <span className="mx-1.5 opacity-40">•</span>
          {formatDate(release.releaseDate)}
        </p>
      </div>
      <ListenedToggle releaseId={release.id} listened={release.listened} />
    </li>
  );
}

export default async function Home() {
  const [activeArtists, pausedArtists, toListen, recentlyListened, listenedCount] =
    await Promise.all([
      prisma.artist.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
      prisma.artist.findMany({ where: { status: "PAUSED" }, orderBy: { name: "asc" } }),
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
      prisma.release.count({ where: { listened: true } }),
    ]);

  const syncableCount = activeArtists.filter(
    (artist) => artist.source !== "manual" && artist.externalId,
  ).length;

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Everything you&apos;re
          <span className="block bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
            listening for.
          </span>
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Follow an artist and their releases arrive on their own. Pause anyone you&apos;ve
          moved on from — their history stays.
        </p>

        <div className="mt-6">
          <ArtistSearch />
        </div>

        <details className="mt-3 group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-faint transition-colors hover:text-muted">
            <span className="transition-transform group-open:rotate-90">›</span>
            Can&apos;t find them? Add by hand
          </summary>
          <div className="mt-3">
            <AddArtistForm />
          </div>
        </details>
      </section>

      {(activeArtists.length > 0 || pausedArtists.length > 0) && (
        <section className="grid grid-cols-3 gap-3">
          <Stat value={activeArtists.length} label="Following" />
          <Stat value={toListen.length} label="To listen" />
          <Stat value={listenedCount} label="Heard" />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="eyebrow">To listen</h2>
          {syncableCount > 0 && <SyncAllButton />}
        </div>
        {toListen.length === 0 ? (
          <div className="panel px-5 py-10 text-center">
            <p className="text-sm text-muted">
              {activeArtists.length === 0
                ? "Search for an artist above to get started."
                : "All caught up — nothing new from the artists you follow."}
            </p>
          </div>
        ) : (
          <ul className="panel divide-y divide-line overflow-hidden">
            {toListen.map((release) => (
              <ReleaseRow key={release.id} release={release} />
            ))}
          </ul>
        )}
      </section>

      {recentlyListened.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Recently listened</h2>
          <ul className="panel divide-y divide-line overflow-hidden">
            {recentlyListened.map((release) => (
              <ReleaseRow key={release.id} release={release} />
            ))}
          </ul>
        </section>
      )}

      {activeArtists.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Following · {activeArtists.length}</h2>
          <ul className="panel divide-y divide-line overflow-hidden">
            {activeArtists.map((artist) => (
              <li
                key={artist.id}
                className="row-hover flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="truncate text-sm font-medium transition-colors hover:text-accent"
                >
                  {artist.name}
                </Link>
                <StatusToggleButton artistId={artist.id} status="ACTIVE" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pausedArtists.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Paused · {pausedArtists.length}</h2>
          <p className="mb-3 text-xs text-faint">
            No new releases from these artists. Their history is untouched.
          </p>
          <ul className="panel divide-y divide-line overflow-hidden opacity-60">
            {pausedArtists.map((artist) => (
              <li
                key={artist.id}
                className="row-hover flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/artists/${artist.id}`}
                  className="truncate text-sm font-medium transition-colors hover:text-accent"
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
