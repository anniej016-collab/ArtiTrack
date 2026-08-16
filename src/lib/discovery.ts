export type ParsedDiscovery = {
  artistName: string;
  /** Null when the line names only an artist. */
  title: string | null;
};

/** The dashes people and exports actually use between an artist and a title. */
const SEPARATOR = /\s+[-–—|]\s+|\s+[·•]\s+/;

/** A leading list number, as pasted from a numbered playlist. */
const LEADING_NUMBER = /^\s*\d{1,3}[.):]?\s+/;

/** Trailing noise an export leaves behind: durations, "E" badges, stray quotes. */
const TRAILING_DURATION = /\s+\d{1,2}:[0-5]\d\s*$/;

/**
 * Reads a pasted batch of things to check out.
 *
 * Written for what a playlist actually looks like once it's text: one item per
 * line, usually "Artist - Title", sometimes just a name. Which side is the
 * artist can't be inferred, so the first is taken as the artist and the form
 * says as much — guessing per line would put half of them in backwards.
 */
export function parseDiscoveryLines(input: string): ParsedDiscovery[] {
  const seen = new Set<string>();
  const items: ParsedDiscovery[] = [];

  for (const raw of input.split(/\r?\n/)) {
    const line = raw
      .replace(LEADING_NUMBER, "")
      .replace(TRAILING_DURATION, "")
      .trim();
    if (!line) continue;

    const [first, ...rest] = line.split(SEPARATOR);
    const artistName = first.trim();
    if (!artistName) continue;

    // Anything after the first separator is the title, dashes and all.
    const title = rest.join(" - ").trim() || null;

    // Same artist and title twice in one paste is a duplicate, not two leads.
    const key = `${artistName.toLowerCase()}|${(title ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ artistName, title });
  }

  return items;
}
