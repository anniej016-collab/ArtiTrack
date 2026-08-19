import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddArtistForm } from "@/components/AddArtistForm";
import { ArtistSearch } from "@/components/ArtistSearch";
import { SyncAllButton } from "@/components/SyncButtons";
import { StatusToggleButton } from "@/components/StatusToggleButton";
import { ListenedToggle } from "@/components/ListenedToggle";
import { SetAsideToggle } from "@/components/SetAsideToggle";
import { ReleaseTypeBadge } from "@/components/ReleaseTypeBadge";
import { ReleaseCard, type ReleaseCardData } from "@/components/ReleaseCard";
import { ArtistCard, type ArtistCardData } from "@/components/ArtistCard";
import { ViewToggle } from "@/components/ViewToggle";
import { GroupToggle } from "@/components/GroupToggle";
import { SectionNav } from "@/components/SectionNav";
import { QueueCategoryFilter } from "@/components/QueueCategoryFilter";
import { ArtistFilter } from "@/components/ArtistFilter";
import {
  CollapsibleSection,
  FILTER_MIN,
  CARD_PREVIEW,
  LIST_PREVIEW,
  PREVIEW_MIN,
} from "@/components/CollapsibleSection";
import { VinylIcon } from "@/components/icons";
import {
  getGroupMode,
  getHiddenCategories,
  getSectionStates,
  getViewModes,
  type SectionKey,
  type ViewMode,
} from "@/lib/view-mode";
import { countByCategory, releaseCategory } from "@/lib/release-category";
import { isSyncableSource } from "@/lib/providers";
import { groupReleases } from "@/lib/grouping";
import { formatDate } from "@/lib/format";
import { byName } from "@/lib/name-order";

/** Grouping only helps if the queue isn't silently truncated first. */
const TO_LISTEN_LIMIT = 200;
/** Groups shown before "Show all", when the queue is grouped and previewed. */
const PREVIEW_GROUPS = 2;

// Always read live data, and keep the database out of the build step.
export const dynamic = "force-dynamic";

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
    // Mirrors the card: the whole row opens the release, with the artist link
    // and the heard toggle lifted above the stretched link.
    <li className="row-hover relative flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/releases/${release.id}`}
            className="truncate text-sm font-medium transition-colors after:absolute after:inset-0 hover:text-accent"
          >
            {release.title}
          </Link>
          <ReleaseTypeBadge
            type={release.type}
            title={release.title}
            category={release.category}
          />
        </div>
        <p className="mt-1 truncate text-xs text-faint">
          {showArtist && release.artist && (
            <>
              <Link
                href={`/artists/${release.artistId}`}
                className="relative z-10 text-muted transition-colors hover:text-text"
              >
                {release.artist.name}
              </Link>
              <span className="mx-1.5 opacity-40">•</span>
            </>
          )}
          {formatDate(release.releaseDate)}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-2">
        {!release.listened && (
          <SetAsideToggle
            releaseId={release.id}
            title={release.title}
            setAside={release.setAside}
          />
        )}
        <ListenedToggle releaseId={release.id} listened={release.listened} />
      </div>
    </li>
  );
}

function ReleaseGroup({
  releases,
  mode,
  showArtist = true,
  clamp = false,
}: {
  releases: ReleaseCardData[];
  mode: ViewMode;
  showArtist?: boolean;
  /** Preview: two rows in card view, a short slice in list view. */
  clamp?: boolean;
}) {
  if (mode === "list") {
    const shown = clamp ? releases.slice(0, LIST_PREVIEW) : releases;
    return (
      <ul className="panel divide-y divide-line overflow-hidden">
        {shown.map((release) => (
          <ReleaseRow key={release.id} release={release} showArtist={showArtist} />
        ))}
      </ul>
    );
  }

  // Denser than the artist page: here the grid shares the screen with three
  // other sections, so tiles stay small enough to leave room for them.
  //
  // Sliced as well as clamped. The CSS decides how many of these are visible at
  // the current width; the slice decides how many are worth sending at all,
  // which the CSS alone could never do — a preview of a 200-record queue was
  // shipping all 200 and hiding 188 of them.
  const shown = clamp ? releases.slice(0, CARD_PREVIEW) : releases;

  return (
    <ul
      className={`grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 ${
        clamp ? "clamp-rows" : ""
      }`}
    >
      {shown.map((release) => (
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
  clamp = false,
  id,
}: {
  artists: ArtistCardData[];
  mode: ViewMode;
  status: "ACTIVE" | "PAUSED";
  clamp?: boolean;
  id?: string;
}) {
  if (mode === "list") {
    const shown = clamp ? artists.slice(0, LIST_PREVIEW) : artists;
    return (
      <ul id={id} className="panel divide-y divide-line overflow-hidden">
        {shown.map((artist) => (
          // `relative` anchors the stretched link, so the whole row is tappable
          // instead of just the name.
          <li
            key={artist.id}
            className="row-hover relative flex items-center justify-between gap-3 px-4 py-3"
          >
            <Link
              href={`/artists/${artist.id}`}
              className="min-w-0 truncate text-sm font-medium transition-colors after:absolute after:inset-0 hover:text-accent"
            >
              {artist.name}
            </Link>
            <div className="relative z-10">
              <StatusToggleButton artistId={artist.id} status={status} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const shownCards = clamp ? artists.slice(0, CARD_PREVIEW) : artists;

  return (
    <ul
      id={id}
      className={`grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 ${
        clamp ? "clamp-rows" : ""
      }`}
    >
      {shownCards.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </ul>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  // Arriving from the check-out list carries the artist's name for the search.
  const prefill = (await searchParams)?.q;
  const initialQuery = typeof prefill === "string" ? prefill : "";

  const artistSelect = {
    id: true,
    name: true,
    imageUrl: true,
    status: true,
    syncSource: true,
    syncExternalId: true,
    _count: { select: { releases: true } },
  } as const;

  const hiddenCategories = await getHiddenCategories();
  const queueWhere = {
    listened: false,
    // Set aside is a third answer to "am I going to play this": out of the
    // queue, but not claiming to have been heard.
    setAside: false,
    artist: { status: "ACTIVE" as const },
  };

  const [
    viewModes,
    sectionStates,
    groupMode,
    unsortedActive,
    unsortedPaused,
    queueCandidates,
    toListenTotal,
    recentlyListened,
    setAsideReleases,
    heardCount,
  ] = await Promise.all([
      getViewModes(),
      getSectionStates(),
      getGroupMode(),
      // Alphabetical, because this is the list you come back to. A follow list
      // is looked up by name — recency only helps in the minute after adding
      // someone, and costs you a stable place to find everyone else.
      //
      // Ordered after reading rather than in SQL: see byName. Both lists are
      // read whole, so sorting here loses nothing.
      prisma.artist.findMany({ where: { status: "ACTIVE" }, select: artistSelect }),
      prisma.artist.findMany({ where: { status: "PAUSED" }, select: artistSelect }),
      prisma.release.findMany({
        where: queueWhere,
        orderBy: { releaseDate: "desc" },
        take: TO_LISTEN_LIMIT,
        include: { artist: { select: { name: true } } },
      }),
      prisma.release.count({ where: queueWhere }),
      // Category comes from the title as well as the type, so it can't be a SQL
      // filter — the queue is narrowed after it is read.
      // Only releases marked by hand, which is what carries a date. An imported
      // back catalogue is listened but undated, and was never "recent".
      //
      // Still heard matters as much as dated: the date now survives un-ticking
      // (so re-ticking restores it rather than reading as today), which without
      // this left un-ticked releases sitting here as recent listens.
      prisma.release.findMany({
        where: {
          listened: true,
          listenedAt: { not: null },
          artist: { status: "ACTIVE" },
        },
        orderBy: { listenedAt: "desc" },
        take: 8,
        include: { artist: { select: { name: true } } },
      }),
      // Most recently set aside first, so a decision can be walked back while
      // it's still fresh in mind.
      prisma.release.findMany({
        where: { setAside: true, artist: { status: "ACTIVE" } },
        orderBy: [{ setAsideAt: "desc" }, { releaseDate: "desc" }],
        include: { artist: { select: { name: true } } },
      }),
      prisma.release.count({ where: { listened: true } }),
    ]);

  const activeArtists = byName(unsortedActive, (artist) => artist.name);
  const pausedArtists = byName(unsortedPaused, (artist) => artist.name);

  // Counts describe the whole queue, not what survives the filter, so a chip
  // keeps its number and stays clickable after you switch it off.
  const categoryCounts = countByCategory(queueCandidates);
  const toListen = queueCandidates.filter(
    (release) =>
      !hiddenCategories.includes(
        releaseCategory(release.title, release.type, release.category),
      ),
  );

  const queuePreview = sectionStates["to-listen"] === "preview";

  /**
   * A preview only hides something when the list is longer than the shortest
   * two-row capacity, so the control isn't offered when it would do nothing.
   */
  const canShowAll = (section: SectionKey, total: number) =>
    sectionStates[section] === "preview" &&
    total > (viewModes[section] === "list" ? LIST_PREVIEW : PREVIEW_MIN);

  const syncableCount = activeArtists.filter(
    (artist) => artist.syncSource && isSyncableSource(artist.syncSource) && artist.syncExternalId,
  ).length;
  const hasLibrary = activeArtists.length > 0 || pausedArtists.length > 0;

  const sections = [
    "to-listen",
    ...(setAsideReleases.length > 0 ? ["set-aside"] : []),
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
      <section className={hasLibrary ? "pt-1" : "pt-2"}>
        {/*
          Hidden rather than unmounted once a library exists, so adding the
          first artist changes only classes and can't disturb the search below
          it mid-flow. Covered by e2e/regressions.spec.ts.
        */}
        <div className={hasLibrary ? "hidden" : ""}>
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
        </div>

        <div
          className={
            hasLibrary
              ? ""
              : "mt-6 rounded-2xl border border-line bg-gradient-to-b from-white/6 to-transparent p-4"
          }
        >
          <ArtistSearch initialQuery={initialQuery} />
          <details className={hasLibrary ? "group mt-2.5" : "group mt-3"}>
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
          <div className="-mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Your library
              </h2>
              {/* Counts inline rather than as tiles: same information, a fraction
                  of the vertical space. */}
              <p className="text-xs text-faint">
                {activeArtists.length} following
                <span className="mx-1 opacity-40">·</span>
                {toListenTotal} to listen
                {setAsideReleases.length > 0 && (
                  <>
                    <span className="mx-1 opacity-40">·</span>
                    {setAsideReleases.length} set aside
                  </>
                )}
                <span className="mx-1 opacity-40">·</span>
                {heardCount} heard
              </p>
            </div>
          </div>

          <div className="-mb-6">
            <SectionNav available={sections} />
          </div>
        </>
      )}

      <CollapsibleSection
        section="to-listen"
        id="to-listen"
        title="To listen"
        count={toListenTotal}
        state={sectionStates["to-listen"]}
        canShowAll={canShowAll("to-listen", toListen.length)}
        controls={
          <>
            {syncableCount > 0 && <SyncAllButton />}
            <ViewToggle section="to-listen" current={viewModes["to-listen"]} />
          </>
        }
      >
        {queueCandidates.length === 0 ? (
          <EmptyState
            message={
              activeArtists.length === 0
                ? "Search for an artist above and their releases will show up here."
                : "All caught up — nothing new from the artists you follow."
            }
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2.5">
              {queueCandidates.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <GroupToggle current={groupMode} />
                </div>
              )}
              <QueueCategoryFilter counts={categoryCounts} hidden={hiddenCategories} />
            </div>

            {/* Filtered down to nothing, which is a different situation from an
                empty queue and needs the chips left in reach to undo. */}
            {toListen.length === 0 ? (
              <EmptyState message="Nothing left once those kinds are hidden." />
            ) : groupMode === "none" ? (
              <ReleaseGroup
                releases={toListen}
                mode={viewModes["to-listen"]}
                clamp={queuePreview}
              />
            ) : (
              <div className="flex flex-col gap-5">
                {/* In preview only the first couple of groups show, each itself
                    clamped, so grouping can't reintroduce an endless section. */}
                {groupReleases(toListen, groupMode)
                  .slice(0, queuePreview ? PREVIEW_GROUPS : undefined)
                  .map((group) => (
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
                      mode={viewModes["to-listen"]}
                      showArtist={groupMode !== "artist"}
                      clamp={queuePreview}
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
      </CollapsibleSection>

      {/* Only when there is something in it. A decision to skip a record should
          leave the page alone until it's made. */}
      {setAsideReleases.length > 0 && (
        <CollapsibleSection
          section="set-aside"
          id="set-aside"
          title="Set aside"
          count={setAsideReleases.length}
          state={sectionStates["set-aside"]}
          canShowAll={canShowAll("set-aside", setAsideReleases.length)}
          note={
            <p className="mb-3 text-xs text-faint">
              Out of the queue without being marked heard. Put any of them back, or
              tick one off if you get to it after all.
            </p>
          }
          controls={
            <ViewToggle section="set-aside" current={viewModes["set-aside"]} />
          }
        >
          <ReleaseGroup
            releases={setAsideReleases}
            mode={viewModes["set-aside"]}
            clamp={sectionStates["set-aside"] === "preview"}
          />
        </CollapsibleSection>
      )}

      {recentlyListened.length > 0 && (
        <CollapsibleSection
          section="recently-listened"
          id="recently-listened"
          title="Recently listened"
          count={recentlyListened.length}
          state={sectionStates["recently-listened"]}
          canShowAll={canShowAll("recently-listened", recentlyListened.length)}
          controls={
            <ViewToggle
              section="recently-listened"
              current={viewModes["recently-listened"]}
            />
          }
        >
          <ReleaseGroup
            releases={recentlyListened}
            mode={viewModes["recently-listened"]}
            clamp={sectionStates["recently-listened"] === "preview"}
          />
        </CollapsibleSection>
      )}

      {activeArtists.length > 0 && (
        <CollapsibleSection
          section="following"
          id="following"
          title="Following"
          count={activeArtists.length}
          state={sectionStates.following}
          canShowAll={canShowAll("following", activeArtists.length)}
          controls={
            <>
              {activeArtists.length >= FILTER_MIN && (
                <ArtistFilter targetId="following-list" />
              )}
              <ViewToggle section="following" current={viewModes.following} />
            </>
          }
        >
          <ArtistGroup
            id="following-list"
            artists={activeArtists}
            mode={viewModes.following}
            status="ACTIVE"
            clamp={sectionStates.following === "preview"}
          />
        </CollapsibleSection>
      )}

      {pausedArtists.length > 0 && (
        <CollapsibleSection
          section="paused"
          id="paused"
          title="Paused"
          count={pausedArtists.length}
          state={sectionStates.paused}
          canShowAll={canShowAll("paused", pausedArtists.length)}
          controls={
            <>
              {pausedArtists.length >= FILTER_MIN && (
                <ArtistFilter targetId="paused-list" />
              )}
              <ViewToggle section="paused" current={viewModes.paused} />
            </>
          }
          note={
            <p className="-mt-1 mb-3 text-xs text-faint">
              No new releases from these artists. Their history is untouched.
            </p>
          }
        >
          <div className="opacity-65 transition-opacity hover:opacity-100">
            <ArtistGroup
              id="paused-list"
              artists={pausedArtists}
              mode={viewModes.paused}
              status="PAUSED"
              clamp={sectionStates.paused === "preview"}
            />
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
