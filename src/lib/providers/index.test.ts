import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SYNCABLE_SOURCES,
  TRACK_SOURCES,
  getProvider,
  isSyncableSource,
  providerLabel,
  searchArtistsEverywhere,
  supportsTracks,
} from "@/lib/providers";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the provider registry", () => {
  it("knows its own sources and nothing else", () => {
    expect(isSyncableSource("deezer")).toBe(true);
    expect(isSyncableSource("musicbrainz")).toBe(true);
    // How a hand-added artist is stored: there is nowhere to sync it from.
    expect(isSyncableSource("manual")).toBe(false);
    expect(getProvider("manual")).toBeNull();
  });

  it("separates sources that can produce song lists from those that can't", () => {
    expect(supportsTracks("deezer")).toBe(true);
    expect(supportsTracks("musicbrainz")).toBe(false);
    expect(SYNCABLE_SOURCES).toEqual(expect.arrayContaining(["deezer", "musicbrainz"]));
    expect(TRACK_SOURCES).toEqual(["deezer"]);
  });

  it("names sources for display, falling back to the raw value", () => {
    expect(providerLabel("musicbrainz")).toBe("MusicBrainz");
    expect(providerLabel("manual")).toBe("manual");
  });
});

/** Both providers go through fetch, so the URL is what tells them apart. */
function mockSearch({
  deezerResults,
  musicbrainzResults,
  musicbrainzFails = false,
}: {
  deezerResults: unknown[];
  musicbrainzResults?: unknown[];
  musicbrainzFails?: boolean;
}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("musicbrainz") || url.includes("/artist?fmt=json")) {
      if (musicbrainzFails) throw new Error("offline");
      return { ok: true, status: 200, json: async () => ({ artists: musicbrainzResults }) };
    }
    return { ok: true, status: 200, json: async () => ({ data: deezerResults }) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("searchArtistsEverywhere", () => {
  it("does not reach for the fallback when the main source has the artist", async () => {
    const fetchMock = mockSearch({
      deezerResults: [{ id: 1, name: "Found" }],
      musicbrainzResults: [{ id: "mb-1", name: "Also Found" }],
    });

    const { results, usedFallback } = await searchArtistsEverywhere("found");
    expect(results.map((artist) => artist.name)).toEqual(["Found"]);
    expect(usedFallback).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back when the main source has nothing", async () => {
    mockSearch({
      deezerResults: [],
      musicbrainzResults: [{ id: "mb-1", name: "Obscure" }],
    });

    const { results, usedFallback } = await searchArtistsEverywhere("obscure");
    expect(results.map((artist) => artist.name)).toEqual(["Obscure"]);
    expect(results[0].source).toBe("musicbrainz");
    expect(usedFallback).toBe(true);
  });

  it("reads as nothing found when the fallback itself is unreachable", async () => {
    mockSearch({ deezerResults: [], musicbrainzFails: true });

    // A search that already succeeded shouldn't turn into an error message
    // because of a source the user never asked for.
    await expect(searchArtistsEverywhere("obscure")).resolves.toEqual({
      results: [],
      usedFallback: false,
    });
  });
});
