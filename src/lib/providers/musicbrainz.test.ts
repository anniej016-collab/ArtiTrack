import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArtistReleases, searchArtists } from "@/lib/providers/musicbrainz";

function mockJson(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status, json: async () => body }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchArtists", () => {
  it("maps results, with no image since MusicBrainz has none", async () => {
    mockJson({
      artists: [
        { id: "abc-123", name: "Obscure Collective" },
        { id: "def-456", name: "Another One" },
      ],
    });

    expect(await searchArtists("obscure")).toEqual([
      {
        source: "musicbrainz",
        externalId: "abc-123",
        name: "Obscure Collective",
        imageUrl: null,
        albumCount: null,
      },
      {
        source: "musicbrainz",
        externalId: "def-456",
        name: "Another One",
        imageUrl: null,
        albumCount: null,
      },
    ]);
  });

  it("does not call out at all for a blank query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchArtists("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("identifies itself, which MusicBrainz requires of clients", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await searchArtists("anything");

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/ArtiTrack/);
  });
});

describe("fetchArtistReleases", () => {
  it("fills in missing date parts rather than dropping the release", async () => {
    mockJson({
      "release-groups": [
        { id: "rg-1", title: "Early Tapes", "first-release-date": "2011", "primary-type": "Album" },
        {
          id: "rg-2",
          title: "Half Known",
          "first-release-date": "2015-06",
          "primary-type": "EP",
        },
      ],
    });

    const releases = await fetchArtistReleases("artist-1");
    expect(releases.map((release) => release.releaseDate.toISOString())).toEqual([
      "2011-01-01T00:00:00.000Z",
      "2015-06-01T00:00:00.000Z",
    ]);
    expect(releases.map((release) => release.type)).toEqual(["ALBUM", "EP"]);
  });

  it("treats a secondary type as Other, so a compilation isn't a new album", async () => {
    mockJson({
      "release-groups": [
        {
          id: "rg-3",
          title: "Collected",
          "first-release-date": "2024-02-01",
          "primary-type": "Album",
          "secondary-types": ["Compilation"],
        },
      ],
    });

    expect((await fetchArtistReleases("artist-1"))[0].type).toBe("OTHER");
  });

  it("drops releases with no usable date, which can't be ordered", async () => {
    mockJson({
      "release-groups": [
        { id: "rg-4", title: "Undated", "primary-type": "Album" },
        { id: "rg-5", title: "Nonsense", "first-release-date": "??", "primary-type": "Album" },
        { id: "rg-6", title: "Fine", "first-release-date": "2020-01-01" },
      ],
    });

    expect((await fetchArtistReleases("artist-1")).map((r) => r.title)).toEqual(["Fine"]);
  });

  it("points cover art at the archive, keyed by release group", async () => {
    mockJson({
      "release-groups": [
        { id: "rg-7", title: "Art", "first-release-date": "2020-01-01" },
      ],
    });

    expect((await fetchArtistReleases("artist-1"))[0].coverUrl).toContain(
      "/release-group/rg-7/front-250",
    );
  });

  it("reports a failed request rather than returning nothing", async () => {
    mockJson(null, false, 503);
    await expect(fetchArtistReleases("artist-1")).rejects.toThrow(/503/);
  });
});
