import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchArtistReleases,
  fetchReleaseTracks,
  forgetToken,
  isConfigured,
  searchArtists,
} from "@/lib/providers/spotify";

/** A token request followed by the call under test. */
function mockResponses(...bodies: unknown[]) {
  const fetchMock = vi.fn();
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ access_token: "t", expires_in: 3600 }),
  });
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  forgetToken();
  vi.stubEnv("SPOTIFY_CLIENT_ID", "id");
  vi.stubEnv("SPOTIFY_CLIENT_SECRET", "secret");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("isConfigured", () => {
  it("is false without credentials, since nothing here works anonymously", () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "");
    expect(isConfigured()).toBe(false);
  });
});

describe("searchArtists", () => {
  it("maps results and takes the first image", async () => {
    mockResponses({
      artists: {
        items: [
          { id: "abc", name: "NCT 127", images: [{ url: "big.jpg" }, { url: "small.jpg" }] },
          { id: "def", name: "No Picture", images: [] },
        ],
      },
    });

    expect(await searchArtists("nct")).toEqual([
      {
        source: "spotify",
        externalId: "abc",
        name: "NCT 127",
        imageUrl: "big.jpg",
        albumCount: null,
      },
      {
        source: "spotify",
        externalId: "def",
        name: "No Picture",
        imageUrl: null,
        albumCount: null,
      },
    ]);
  });

  it("asks for a token once and reuses it", async () => {
    const fetchMock = mockResponses({ artists: { items: [] } }, { artists: { items: [] } });
    await searchArtists("one");
    await searchArtists("two");
    // Token, search, search — not token, search, token, search.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("fetchArtistReleases", () => {
  it("reads every page, not just the first", async () => {
    // The failure that would quietly lose most of a discography.
    mockResponses(
      {
        items: [
          {
            id: "1",
            name: "First",
            album_type: "album",
            release_date: "2020-05-04",
            release_date_precision: "day",
            images: [{ url: "a.jpg" }],
          },
        ],
        next: "https://api.spotify.com/v1/artists/x/albums?offset=50",
      },
      {
        items: [
          {
            id: "2",
            name: "Second",
            album_type: "single",
            release_date: "2021-01-02",
            release_date_precision: "day",
            images: [],
          },
        ],
        next: null,
      },
    );

    const releases = await fetchArtistReleases("x");
    expect(releases.map((release) => release.title)).toEqual(["First", "Second"]);
    expect(releases[1].type).toBe("SINGLE");
  });

  it("handles a date that is only a year", async () => {
    mockResponses({
      items: [
        {
          id: "1",
          name: "Old One",
          album_type: "album",
          release_date: "1999",
          release_date_precision: "year",
        },
      ],
      next: null,
    });

    const [release] = await fetchArtistReleases("x");
    expect(release.releaseDate.toISOString()).toBe("1999-01-01T00:00:00.000Z");
  });

  it("drops a release with no usable date, and de-duplicates markets", async () => {
    mockResponses({
      items: [
        { id: "1", name: "Fine", album_type: "album", release_date: "2020-05-04" },
        { id: "1", name: "Fine", album_type: "album", release_date: "2020-05-04" },
        { id: "2", name: "Dateless", album_type: "album" },
      ],
      next: null,
    });

    expect((await fetchArtistReleases("x")).map((r) => r.title)).toEqual(["Fine"]);
  });
});

describe("fetchReleaseTracks", () => {
  it("converts milliseconds to seconds and orders by track number", async () => {
    mockResponses({
      items: [
        { id: "t2", name: "Second", track_number: 2, duration_ms: 200_400 },
        { id: "t1", name: "First", track_number: 1, duration_ms: 245_000 },
      ],
      next: null,
    });

    expect(await fetchReleaseTracks("album")).toEqual([
      { externalId: "t1", title: "First", position: 1, duration: 245, isrc: null },
      { externalId: "t2", title: "Second", position: 2, duration: 200, isrc: null },
    ]);
  });
});

describe("credentials", () => {
  it("says so plainly when they are missing", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "");
    await expect(searchArtists("anything")).rejects.toThrow(/isn't set up/);
  });

  it("says so plainly when Spotify rejects them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }),
    );
    // A mistyped key otherwise reads as "no results", with nothing to explain it.
    await expect(searchArtists("anything")).rejects.toThrow(/Check SPOTIFY_CLIENT_ID/);
  });
});
