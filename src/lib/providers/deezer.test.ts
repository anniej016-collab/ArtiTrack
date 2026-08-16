import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchArtistReleases,
  fetchReleaseTracks,
  searchArtists,
} from "@/lib/providers/deezer";

function mockJson(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchArtists", () => {
  it("maps results and tolerates a missing picture", async () => {
    mockJson({
      data: [
        { id: 399, name: "Radiohead", picture_medium: "p.jpg", nb_album: 9 },
        { id: 412, name: "No Picture" },
      ],
    });

    const results = await searchArtists("radio");
    expect(results).toEqual([
      { externalId: "399", name: "Radiohead", imageUrl: "p.jpg", albumCount: 9 },
      { externalId: "412", name: "No Picture", imageUrl: null, albumCount: null },
    ]);
  });

  it("drops entries with no usable name", async () => {
    mockJson({ data: [{ id: 1 }, { id: 2, name: "  " }, { id: 3, name: "Real" }] });
    expect(await searchArtists("x")).toHaveLength(1);
  });

  it("does not call out at all for a blank query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchArtists("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchArtistReleases", () => {
  it("maps record_type onto our release types", async () => {
    mockJson({
      data: [
        { id: 1, title: "A", release_date: "2020-01-02", record_type: "album" },
        { id: 2, title: "B", release_date: "2020-01-03", record_type: "ep" },
        { id: 3, title: "C", release_date: "2020-01-04", record_type: "single" },
        { id: 4, title: "D", release_date: "2020-01-05", record_type: "compilation" },
        { id: 5, title: "E", release_date: "2020-01-06", record_type: "??" },
      ],
    });

    expect((await fetchArtistReleases("399")).map((r) => r.type)).toEqual([
      "ALBUM",
      "EP",
      "SINGLE",
      "OTHER",
      "OTHER",
    ]);
  });

  it("skips releases whose date is unusable rather than storing an invalid one", async () => {
    mockJson({
      data: [
        { id: 1, title: "Good", release_date: "2007-10-10", record_type: "album" },
        { id: 2, title: "Zero date", release_date: "0000-00-00", record_type: "album" },
        { id: 3, title: "No date", record_type: "album" },
      ],
    });

    const releases = await fetchArtistReleases("399");
    expect(releases.map((r) => r.title)).toEqual(["Good"]);
    expect(releases[0].releaseDate.toISOString()).toBe("2007-10-10T00:00:00.000Z");
  });

  it("collapses the same album id repeated across markets", async () => {
    mockJson({
      data: [
        { id: 7, title: "Dup", release_date: "2010-01-01", record_type: "album" },
        { id: 7, title: "Dup", release_date: "2010-01-01", record_type: "album" },
      ],
    });
    expect(await fetchArtistReleases("399")).toHaveLength(1);
  });
});

describe("fetchReleaseTracks", () => {
  it("orders by track position and keeps duration", async () => {
    mockJson({
      data: [
        { id: 2, title: "Second", duration: 200, track_position: 2 },
        { id: 1, title: "First", duration: 180, track_position: 1 },
      ],
    });

    const tracks = await fetchReleaseTracks("1001");
    expect(tracks.map((t) => t.title)).toEqual(["First", "Second"]);
    expect(tracks[0].duration).toBe(180);
  });

  it("falls back to list order when position is missing", async () => {
    mockJson({ data: [{ id: 1, title: "A" }, { id: 2, title: "B" }] });
    expect((await fetchReleaseTracks("1")).map((t) => t.position)).toEqual([1, 2]);
  });
});

describe("error handling", () => {
  it("surfaces the provider's own error body, which arrives with HTTP 200", async () => {
    mockJson({ error: { message: "Quota limit exceeded" } });
    await expect(searchArtists("x")).rejects.toThrow("Quota limit exceeded");
  });

  it("reports a readable message on an HTTP failure", async () => {
    mockJson({}, false, 503);
    await expect(searchArtists("x")).rejects.toThrow(/503/);
  });

  it("reports a readable message when the network is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(searchArtists("x")).rejects.toThrow(/Could not reach Deezer/);
  });
});
