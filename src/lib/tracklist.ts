export type ParsedTrack = {
  title: string;
  position: number;
  /** Length in seconds, when the line carried one. */
  duration: number | null;
};

/** "3:45" or "1:02:30" at the end of a line, with whatever separates it. */
const TRAILING_DURATION = /[\s\-–—·|]*[([]?(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)[)\]]?$/;

/** A leading track number: "1.", "01)", "3 -", "12". */
const LEADING_NUMBER = /^(\d{1,3})\s*[.):\-–—]?\s+/;

function toSeconds(hours: string | undefined, minutes: string, seconds: string) {
  return (
    (hours ? Number(hours) * 3600 : 0) + Number(minutes) * 60 + Number(seconds)
  );
}

/**
 * Turns a pasted tracklist into rows.
 *
 * Entering a twelve-track album one field at a time is enough work that nobody
 * does it, so the whole list is pasted at once and read leniently. Anything
 * copied off a sleeve, a wiki table or a streaming page tends to arrive as one
 * track per line, optionally numbered, optionally with a running time.
 */
export function parseTracklist(input: string): ParsedTrack[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  /*
   * Leading numbers are only stripped when the paste is mostly numbered.
   * Judged across the whole list rather than line by line, so a track called
   * "99 Problems" keeps its name in an unnumbered list and loses nothing in a
   * numbered one, where the 99 would be the track number anyway.
   */
  const numbered =
    lines.length > 0 &&
    lines.filter((line) => LEADING_NUMBER.test(line)).length > lines.length / 2;

  const tracks: ParsedTrack[] = [];

  for (const line of lines) {
    let working = numbered ? line.replace(LEADING_NUMBER, "") : line;

    let duration: number | null = null;
    const match = working.match(TRAILING_DURATION);
    if (match) {
      duration = toSeconds(match[1], match[2], match[3]);
      working = working.slice(0, match.index).trim();
    }

    // Trailing separators left behind once the duration is gone.
    const title = working.replace(/[\s\-–—·|]+$/, "").trim();
    if (!title) continue;

    tracks.push({ title, position: tracks.length + 1, duration });
  }

  return tracks;
}
