import { describe, expect, it } from "vitest";
import { NEW_WINDOW_MS, isNewRelease } from "@/lib/newness";

const now = new Date("2026-08-18T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe("isNewRelease", () => {
  it("is never new if it arrived with the artist", () => {
    // A back catalogue is not news, however recently it was imported.
    expect(isNewRelease({ arrivedAt: null, firstSeenAt: null }, now)).toBe(false);
    expect(isNewRelease({ arrivedAt: null, firstSeenAt: daysAgo(1) }, now)).toBe(false);
  });

  it("is new the moment it arrives, before anyone has looked", () => {
    expect(isNewRelease({ arrivedAt: daysAgo(1), firstSeenAt: null }, now)).toBe(true);
  });

  it("survives three months away, because nothing ages unseen", () => {
    // The case a plain "released in the last fortnight" rule gets wrong: every
    // one of these would have expired before it was ever on screen.
    expect(isNewRelease({ arrivedAt: daysAgo(90), firstSeenAt: null }, now)).toBe(true);
  });

  it("still counts within a fortnight of being seen", () => {
    expect(isNewRelease({ arrivedAt: daysAgo(30), firstSeenAt: daysAgo(13) }, now)).toBe(
      true,
    );
  });

  it("stops counting once the fortnight is up", () => {
    expect(isNewRelease({ arrivedAt: daysAgo(30), firstSeenAt: daysAgo(15) }, now)).toBe(
      false,
    );
  });

  it("treats the boundary as expired, so the window is exactly a fortnight", () => {
    const seen = new Date(now.getTime() - NEW_WINDOW_MS);
    expect(isNewRelease({ arrivedAt: daysAgo(30), firstSeenAt: seen }, now)).toBe(false);
  });

  it("is not burned by a glance", () => {
    // Seen once and left alone: still new tomorrow, which is the point.
    const seen = new Date(now.getTime() - 60_000);
    expect(isNewRelease({ arrivedAt: daysAgo(1), firstSeenAt: seen }, now)).toBe(true);
  });
});
