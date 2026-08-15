import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddArtistForm } from "@/components/AddArtistForm";
import { ArtistSearch } from "@/components/ArtistSearch";
import { SyncAllButton } from "@/components/SyncButtons";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { ListenedToggle } from "@/components/ListenedToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { ReleaseCard, type ReleaseCardData } from "@/components/ReleaseCard";
import { ArtistCard, type ArtistCardData } from "@/components/ArtistCard";
import { ViewToggle } from "@/components/ViewToggle";
import { VinylIcon } from "@/components/icons";
import { getViewMode, type ViewMode } from "@/lib/view-mode";
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

function SectionHeading({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="eyebrow">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-1.5 text-faint/70">· {count}</span>
        )}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-5 py-10 text-center">
      <VinylIcon className="size-7 text-white/15" />
      <p className="max-w-xs text-sm text-muted">{message}</p>
    </div>
  );
}

function ReleaseRow({ release }: { release: ReleaseCardData }) {
  return (
    <li className="row-hover flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{release.title}</p>
          <ReleaseTypeBadge type={release.type} />
        </div>
        <p className="mt-1 truncate text-xs text-faint">
          {release.artist && (
            <>
              <Link
                href={`/artists/${release.artistId}`}
                className="text-muted transition-colors hover:text-text"
              >
                {release.artist.name}
              </Link>
              <span className="mx-1.5 opacity-40">•</span>
            </>
          )}
          {formatDate(release.releaseDate)}
        </p>
      </div>
      <ListenedToggle releaseId={release.id} listened={release.listened} />
    </li>
  );
}

function ReleaseGroup({ releases, mode }: { releases: ReleaseCardData[]; mode: ViewMode }) {
  if (mode === "list") {
    return (
      <ul className="panel divide-y divide-line overflow-hidden">
        {releases.map((release) => (
          <ReleaseRow key={release.id} release={release} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {releases.map((release) => (
        <ReleaseCard key={release.id} release={release} showArtist />
      ))}
    </ul>
  );
}

function ArtistGroup({
  artists,
  mode,
  status,
}: {
  artists: ArtistCardData[];
  mode: ViewMode;
  status: "ACTIVE" | "PAUSED";
}) {
  if (mode === "list") {
    return (
      <ul className="panel divide-y divide-line overflow-hidden">
        {artists.map((artist) => (
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
            <StatusToggleButton artistId={artist.id} status={status} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </ul>
  );
}

export default async function Home() {
  const artistSelect = {
    id: true,
    name: true,
    imageUrl: true,
    status: true,
    source: true,
    externalId: true,
    _count: { select: { releases: true } },
  } as const;

  const [viewMode, activeArtists, pausedArtists, toListen, recentlyListened, heardCount] =
    await Promise.all([
      getViewMode(),
      prisma.artist.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: artistSelect,
      }),
      prisma.artist.findMany({
        where: { status: "PAUSED" },
        orderBy: { name: "asc" },
        select: artistSelect,
      }),
      prisma.release.findMany({
        where: { listened: false, artist: { status: "ACTIVE" } },
        orderBy: { releaseDate: "desc" },
        take: 16,
        include: { artist: { select: { name: true } } },
      }),
      // Only releases marked by hand, which is what carries a date. An imported
      // back catalogue is listened but undated, and was never "recent".
      prisma.release.findMany({
        where: { listenedAt: { not: null }, artist: { status: "ACTIVE" } },
        orderBy: { listenedAt: "desc" },
        take: 8,
        include: { artist: { select: { name: true } } },
      }),
      prisma.release.count({ where: { listened: true } }),
    ]);

  const syncableCount = activeArtists.filter(
    (artist) => artist.source !== "manual" && artist.externalId,
  ).length;
  const hasLibrary = activeArtists.length > 0 || pausedArtists.length > 0;

  return (
    <div className="flex flex-col gap-12">
      <section className="pt-2">
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

        <div className="mt-6 rounded-2xl border border-line bg-gradient-to-b from-white/6 to-transparent p-4">
          <ArtistSearch />
          <details className="group mt-3">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-faint transition-colors hover:text-muted">
              <span className="transition-transform group-open:rotate-90">›</span>
              Can&apos;t find them? Add by hand
            </summary>
            <div className="mt-3">
              <AddArtistForm />
            </div>
          </details>
        </div>
      </section>

      {hasLibrary && (
        <>
          <section className="grid grid-cols-3 gap-3">
            <Stat value={activeArtists.length} label="Following" />
            <Stat value={toListen.length} label="To listen" />
            <Stat value={heardCount} label="Heard" />
          </section>

          <div className="-mb-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Your library
            </h2>
            <ViewToggle current={viewMode} />
          </div>
        </>
      )}

      <section>
        <SectionHeading title="To listen" count={toListen.length}>
          {syncableCount > 0 && <SyncAllButton />}
        </SectionHeading>
        {toListen.length === 0 ? (
          <EmptyState
            message={
              activeArtists.length === 0
                ? "Search for an artist above and their releases will show up here."
                : "All caught up — nothing new from the artists you follow."
            }
          />
        ) : (
          <ReleaseGroup releases={toListen} mode={viewMode} />
        )}
      </section>

      {recentlyListened.length > 0 && (
        <section>
          <SectionHeading title="Recently listened" />
          <ReleaseGroup releases={recentlyListened} mode={viewMode} />
        </section>
      )}

      {activeArtists.length > 0 && (
        <section>
          <SectionHeading title="Following" count={activeArtists.length} />
          <ArtistGroup artists={activeArtists} mode={viewMode} status="ACTIVE" />
        </section>
      )}

      {pausedArtists.length > 0 && (
        <section>
          <SectionHeading title="Paused" count={pausedArtists.length} />
          <p className="-mt-1 mb-3 text-xs text-faint">
            No new releases from these artists. Their history is untouched.
          </p>
          <div className="opacity-65 transition-opacity hover:opacity-100">
            <ArtistGroup artists={pausedArtists} mode={viewMode} status="PAUSED" />
          </div>
        </section>
      )}
    </div>
  );
}
