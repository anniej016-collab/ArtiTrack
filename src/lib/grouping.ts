export type GroupMode = "none" | "artist" | "date";

type Groupable = {
  releaseDate: Date;
  artistId: string;
  artist?: { name: string };
};

export type ReleaseGrouping<T> = {
  key: string;
  label: string;
  /** Set for artist groups so the heading can link through. */
  artistId?: string;
  items: T[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Groups the queue so it's obvious who or what to reach for next.
 *
 * Dates are read in UTC: release dates are stored as UTC midnight, and reading
 * them locally would shift some releases into the previous month.
 */
export function groupReleases<T extends Groupable>(
  releases: T[],
  mode: GroupMode,
): ReleaseGrouping<T>[] {
  if (mode === "none" || releases.length === 0) {
    return [{ key: "all", label: "", items: releases }];
  }

  if (mode === "artist") {
    const byArtist = new Map<string, ReleaseGrouping<T>>();

    for (const release of releases) {
      const existing = byArtist.get(release.artistId);
      if (existing) {
        existing.items.push(release);
        continue;
      }
      byArtist.set(release.artistId, {
        key: release.artistId,
        label: release.artist?.name ?? "Unknown artist",
        artistId: release.artistId,
        items: [release],
      });
    }

    return [...byArtist.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }

  // Only qualify months with a year when the queue actually spans more than one,
  // so a single-year queue reads "October" rather than "October 2026".
  const years = new Set(releases.map((r) => r.releaseDate.getUTCFullYear()));
  const showYear = years.size > 1;

  const byMonth = new Map<string, ReleaseGrouping<T>>();

  for (const release of releases) {
    const year = release.releaseDate.getUTCFullYear();
    const month = release.releaseDate.getUTCMonth();
    // Zero-padded so the key sorts chronologically as a string.
    const key = `${year}-${String(month).padStart(2, "0")}`;

    const existing = byMonth.get(key);
    if (existing) {
      existing.items.push(release);
      continue;
    }
    byMonth.set(key, {
      key,
      label: showYear ? `${MONTHS[month]} ${year}` : MONTHS[month],
      items: [release],
    });
  }

  // Newest first, matching the order releases are listed in.
  return [...byMonth.values()].sort((a, b) => b.key.localeCompare(a.key));
}
