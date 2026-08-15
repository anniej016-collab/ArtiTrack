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
import { GroupToggle } from "@/components/GroupToggle";
import { SectionNav } from "@/components/SectionNav";
import { VinylIcon } from "@/components/icons";
import { getGroupMode, getViewMode, type ViewMode } from "@/lib/view-mode";
import { groupReleases } from "@/lib/grouping";
import { formatDate } from "@/lib/format";

/** Grouping only helps if the queue isn't silently truncated first. */
const TO_LISTEN_LIMIT = 200;

// Always read live data, and keep the database out of the build step.
export const dynamic = "force-dynamic";

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

function ReleaseRow({
  release,
  showArtist = true,
}: {
  release: ReleaseCardData;
  showArtist?: boolean;
}) {
  return (
    <li className="row-hover flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium">{release.title}</p>
          <ReleaseTypeBadge type={release.type} />
        </div>
        <p className="mt-1 truncate text-xs text-faint">
          {showArtist && release.artist && (
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

function ReleaseGroup({
  releases,
  mode,
  showArtist = true,
}: {
  releases: ReleaseCardData[];
  mode: ViewMode;
  showArtist?: boolean;
}) {
  if (mode === "list") {
    return (
      <ul className="panel divide-y divide-line overflow-hidden">
        {releases.map((release) => (
          <ReleaseRow key={release.id} release={release} showArtist={showArtist} />
        ))}
      </ul>
    );
  }

  // Denser than the artist page: here the grid shares the screen with three
  // other sections, so tiles stay small enough to leave room for them.
  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          showArtist={showArtist}
          compact
        />
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
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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

  const [
    viewMode,
    groupMode,
    activeArtists,
    pausedArtists,
    toListen,
    toListenTotal,
    recentlyListened,
    heardCount,
  ] = await Promise.all([
      getViewMode(),
      getGroupMode(),
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
        take: TO_LISTEN_LIMIT,
        include: { artist: { select: { name: true } } },
      }),
      prisma.release.count({
        where: { listened: false, artist: { status: "ACTIVE" } },
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

  const sections = [
    "to-listen",
    ...(recentlyListened.length > 0 ? ["recently-listened"] : []),
    ...(activeArtists.length > 0 ? ["following"] : []),
    ...(pausedArtists.length > 0 ? ["paused"] : []),
  ];

  return (
    <div className={`flex flex-col ${hasLibrary ? "gap-8" : "gap-12"}`}>
      {/*
        The full hero is a first-run welcome. Once there's a library to look at,
        it stops earning ~400px at the top of every visit and collapses to a
        search box, so the sections below start near the fold.
      */}
      {hasLibrary ? (
        <section className="pt-1">
          <ArtistSearch />
          <details className="group mt-2.5">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-faint transition-colors hover:text-muted">
              <span className="transition-transform group-open:rotate-90">›</span>
              Can&apos;t find them? Add by hand
            </summary>
            <div className="mt-3">
              <AddArtistForm />
            </div>
          </details>
        </section>
      ) : (
        <section className="pt-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Everything you&apos;re
            <span className="block bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              listening for.
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted">
            Follow an artist and their releases arrive on their own. Pause anyone
            you&apos;ve moved on from — their history stays.
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
      )}

      {hasLibrary && (
        <>
          <div className="-mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Your library
              </h2>
              {/* Counts inline rather than as tiles: same information, a fraction
                  of the vertical space. */}
              <p className="text-xs text-faint">
                {activeArtists.length} following
                <span className="mx-1 opacity-40">·</span>
                {toListenTotal} to listen
                <span className="mx-1 opacity-40">·</span>
                {heardCount} heard
              </p>
            </div>
            <ViewToggle current={viewMode} />
          </div>

          <div className="-mb-6">
            <SectionNav available={sections} />
          </div>
        </>
      )}

      <section id="to-listen" className="scroll-mt-28">
        <SectionHeading title="To listen" count={toListenTotal}>
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
          <>
            {toListen.length > 1 && (
              <div className="mb-4">
                <GroupToggle current={groupMode} />
              </div>
            )}

            {groupMode === "none" ? (
              <ReleaseGroup releases={toListen} mode={viewMode} />
            ) : (
              <div className="flex flex-col gap-5">
                {groupReleases(toListen, groupMode).map((group) => (
                  // Open by default, but foldable: a long queue shouldn't push
                  // the rest of the page out of reach.
                  <details key={group.key} open className="group/fold">
                    <summary className="mb-2.5 flex cursor-pointer list-none items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className="text-faint transition-transform group-open/fold:rotate-90"
                      >
                        ›
                      </span>
                      <span className="font-display text-base font-semibold tracking-tight">
                        {group.label}
                      </span>
                      <span className="text-xs text-faint">{group.items.length}</span>
                      {group.artistId && (
                        <Link
                          href={`/artists/${group.artistId}`}
                          className="ml-auto text-xs text-faint transition-colors hover:text-accent"
                        >
                          Open
                        </Link>
                      )}
                    </summary>
                    {/* The heading already names the artist when grouped that way. */}
                    <ReleaseGroup
                      releases={group.items}
                      mode={viewMode}
                      showArtist={groupMode !== "artist"}
                    />
                  </details>
                ))}
              </div>
            )}

            {toListenTotal > toListen.length && (
              <p className="mt-4 text-xs text-faint">
                Showing the {toListen.length} most recent of {toListenTotal}.
              </p>
            )}
          </>
        )}
      </section>

      {recentlyListened.length > 0 && (
        <section id="recently-listened" className="scroll-mt-28">
          <SectionHeading title="Recently listened" />
          <ReleaseGroup releases={recentlyListened} mode={viewMode} />
        </section>
      )}

      {activeArtists.length > 0 && (
        <section id="following" className="scroll-mt-28">
          <SectionHeading title="Following" count={activeArtists.length} />
          <ArtistGroup artists={activeArtists} mode={viewMode} status="ACTIVE" />
        </section>
      )}

      {pausedArtists.length > 0 && (
        <section id="paused" className="scroll-mt-28">
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
