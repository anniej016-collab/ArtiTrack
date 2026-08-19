/**
 * Stand-in for api.deezer.com, shaped like the real responses, plus a
 * MusicBrainz stand-in under /mb for the fallback path.
 *
 * Tests run against this rather than the live services so they are
 * deterministic and work offline. Point the app at it with DEEZER_API_BASE and
 * MUSICBRAINZ_API_BASE.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 4100);
const SELF = `http://127.0.0.1:${PORT}`;

/** Deterministic gradient per seed, so covers are real decodable images. */
function coverSvg(seed, size = 300) {
  const h = createHash("md5").update(seed).digest();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgb(${h[0]},${h[1]},${h[2]})"/>
      <stop offset="100%" stop-color="rgb(${h[3]},${h[4]},${h[5]})"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`;
}

const ARTISTS = [
  { id: 399, name: "Testhead", picture_medium: `${SELF}/img/testhead`, nb_album: 4 },
  { id: 412, name: "Test Moscow", picture_medium: `${SELF}/img/moscow`, nb_album: 3 },
  { id: 501, name: "Test Sault", picture_medium: `${SELF}/img/sault`, nb_album: 2 },
  // Enough names to push a list past the point where filtering is offered.
  { id: 502, name: "Test Cinema", picture_medium: `${SELF}/img/cinema`, nb_album: 1 },
  { id: 503, name: "Test Orchestra", picture_medium: `${SELF}/img/orchestra`, nb_album: 1 },
  { id: 504, name: "Test Quartet", picture_medium: `${SELF}/img/quartet`, nb_album: 1 },
  { id: 505, name: "Test Ensemble", picture_medium: `${SELF}/img/ensemble`, nb_album: 1 },
];

/** Pictures changed since, keyed by artist id. Set through /control/new-picture. */
const newPictures = {};

const album = (id, title, date, type) => ({
  id,
  title,
  release_date: date,
  record_type: type,
  cover_medium: `${SELF}/img/${encodeURIComponent(title)}`,
});

// Deliberately includes: two years, two releases in one month, a duplicate id,
// an unusable date, and a compilation that reuses an album's songs.
const ALBUMS = {
  399: [
    album(1001, "In Testing", "2026-08-10", "album"),
    album(1002, "Kid T", "2026-08-02", "album"),
    album(1003, "Spectre Test", "2019-12-25", "single"),
    album(1004, "Testbag EP", "2019-04-21", "ep"),
    album(1001, "In Testing", "2026-08-10", "album"), // duplicate id
    album(1005, "Broken Date", "0000-00-00", "album"), // unusable date
    album(1006, "Very Best Of Testhead", "2026-01-05", "compilation"),
  ],
  412: [
    album(2001, "Brain Tests", "2026-07-17", "album"),
    album(2002, "Magical Test", "2025-05-10", "album"),
  ],
  501: [album(3001, "Untitled (Test)", "2026-06-19", "album")],
  // Exactly two kinds, so a test can hide every category it has without a
  // dozen clicks.
  502: [
    album(4001, "Cinema One", "2026-04-01", "album"),
    album(4005, "Cinema Cut", "2026-04-20", "single"),
  ],
  503: [album(4002, "Orchestra One", "2026-03-01", "album")],
  504: [album(4003, "Quartet One", "2026-02-01", "album")],
  505: [album(4004, "Ensemble One", "2026-01-01", "album")],
};

/**
 * Tracklists. The compilation (1006) deliberately reuses the ISRCs of tracks
 * from 1001, which is how the same recording appears on several releases.
 */
const TRACKS = {
  1001: [
    { id: 11, title: "Test Song One", duration: 240, track_position: 1, isrc: "AAA000000001" },
    { id: 12, title: "Test Song Two", duration: 200, track_position: 2, isrc: "AAA000000002" },
  ],
  1002: [
    { id: 21, title: "Kid Track", duration: 210, track_position: 1, isrc: "AAA000000021" },
  ],
  1003: [
    { id: 31, title: "Spectre Test", duration: 190, track_position: 1, isrc: "AAA000000031" },
  ],
  1004: [
    { id: 41, title: "Testbag", duration: 180, track_position: 1, isrc: "AAA000000041" },
  ],
  1006: [
    // Same recordings as 1001, as a greatest-hits would carry.
    { id: 61, title: "Test Song One", duration: 240, track_position: 1, isrc: "AAA000000001" },
    { id: 62, title: "Test Song Two", duration: 200, track_position: 2, isrc: "AAA000000002" },
    // A remaster: different recording, so a different ISRC, matched only by title.
    { id: 63, title: "Kid Track (Remastered 2026)", duration: 212, track_position: 3, isrc: "AAA000000063" },
  ],
  2001: [
    { id: 71, title: "Brain One", duration: 230, track_position: 1, isrc: "BBB000000071" },
  ],
  2002: [
    { id: 81, title: "Magical One", duration: 250, track_position: 1, isrc: "BBB000000081" },
  ],
  3001: [
    { id: 91, title: "Sault One", duration: 220, track_position: 1, isrc: "CCC000000091" },
  ],
  // Four songs, which is one more than the favourites limit — the only release
  // here long enough to test what happens at the limit.
  4004: [
    { id: 101, title: "Ensemble I", duration: 200, track_position: 1, isrc: "DDD000000101" },
    { id: 102, title: "Ensemble II", duration: 210, track_position: 2, isrc: "DDD000000102" },
    { id: 103, title: "Ensemble III", duration: 220, track_position: 3, isrc: "DDD000000103" },
    { id: 104, title: "Ensemble IV", duration: 230, track_position: 4, isrc: "DDD000000104" },
  ],
};

/**
 * MusicBrainz side. These artists are deliberately absent from the Deezer list
 * above, which is the only way the fallback is ever reached.
 */
const MB_ARTISTS = [
  { id: "mb-0001", name: "Obscure Test Collective" },
  { id: "mb-0002", name: "Obscure Test Duo" },
];

const MB_RELEASE_GROUPS = {
  "mb-0001": [
    {
      id: "mbrg-1",
      title: "Field Recordings",
      "first-release-date": "2026-05-04",
      "primary-type": "Album",
    },
    // Year-only date: MusicBrainz often knows no more than that.
    { id: "mbrg-2", title: "Early Tapes", "first-release-date": "2011", "primary-type": "Album" },
    // A secondary type makes this Other, not Album.
    {
      id: "mbrg-3",
      title: "Collected Test",
      "first-release-date": "2024-02-01",
      "primary-type": "Album",
      "secondary-types": ["Compilation"],
    },
    // No date at all, so it can't be ordered and is dropped.
    { id: "mbrg-4", title: "Undated Test", "primary-type": "Album" },
  ],
  "mb-0002": [
    {
      id: "mbrg-9",
      title: "Two Of Us",
      "first-release-date": "2026-03-03",
      "primary-type": "EP",
    },
  ],
};

createServer((req, res) => {
  const url = new URL(req.url, SELF);
  const json = (body) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (url.pathname.startsWith("/img/")) {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    return res.end(coverSvg(url.pathname));
  }

  if (url.pathname === "/search/artist") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return json({ data: ARTISTS.filter((a) => a.name.toLowerCase().includes(q)) });
  }

  let match = url.pathname.match(/^\/artist\/(\d+)\/albums$/);
  if (match) return json({ data: ALBUMS[match[1]] ?? [] });

  /*
   * Stands in for an artist changing their photo on the service. A test calls
   * this, then presses "check for new releases" and expects the new one.
   */
  match = url.pathname.match(/^\/control\/new-picture\/(\d+)$/);
  if (match) {
    newPictures[match[1]] = `${SELF}/img/updated-${match[1]}`;
    return json({ ok: true });
  }

  // After the albums route, or "/artist/399/albums" would match here first.
  match = url.pathname.match(/^\/artist\/(\d+)$/);
  if (match) {
    const artist = ARTISTS.find((a) => String(a.id) === match[1]);
    if (!artist) return json({ error: { message: "no such artist" } });
    return json({ ...artist, picture_medium: newPictures[match[1]] ?? artist.picture_medium });
  }

  match = url.pathname.match(/^\/album\/(\d+)\/tracks$/);
  if (match) return json({ data: TRACKS[match[1]] ?? [] });

  /*
   * Spotify's shape: a token endpoint, then paged listings under a different
   * envelope from Deezer's. The same catalogue is served, under Spotify's own
   * ids, which is what makes switching an artist across worth testing — the
   * ids never match, so only title-and-year matching can recognise a record it
   * already has.
   */
  if (url.pathname === "/spotify/api/token") {
    return json({ access_token: "test-token", expires_in: 3600 });
  }

  if (url.pathname === "/spotify/v1/search") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return json({
      artists: {
        items: ARTISTS.filter((a) => a.name.toLowerCase().includes(q)).map((a) => ({
          id: `sp-${a.id}`,
          name: a.name,
          images: [{ url: `${SELF}/img/spotify-${a.id}` }],
        })),
      },
    });
  }

  match = url.pathname.match(/^\/spotify\/v1\/artists\/sp-(\d+)$/);
  if (match) {
    const artist = ARTISTS.find((a) => String(a.id) === match[1]);
    if (!artist) return json({ error: { message: "no such artist" } });
    return json({
      id: `sp-${artist.id}`,
      name: artist.name,
      // The same "changed their photo" control as the Deezer side, so the
      // refresh test exercises whichever service the artist is actually on.
      images: [
        { url: newPictures[artist.id] ?? `${SELF}/img/spotify-${artist.id}` },
      ],
    });
  }

  match = url.pathname.match(/^\/spotify\/v1\/artists\/sp-(\d+)\/albums$/);
  if (match) {
    const albums = (ALBUMS[match[1]] ?? []).filter((a) => a.release_date !== "0000-00-00");
    return json({
      items: albums.map((album) => ({
        id: `sp-${album.id}`,
        name: album.title,
        album_type: album.record_type === "ep" ? "single" : album.record_type,
        release_date: album.release_date,
        release_date_precision: "day",
        images: [{ url: album.cover_medium }],
      })),
      next: null,
    });
  }

  match = url.pathname.match(/^\/spotify\/v1\/albums\/sp-(\d+)\/tracks$/);
  if (match) {
    return json({
      items: (TRACKS[match[1]] ?? []).map((track) => ({
        id: `sp-${track.id}`,
        name: track.title,
        track_number: track.track_position,
        duration_ms: track.duration * 1000,
      })),
      next: null,
    });
  }

  if (url.pathname === "/mb/artist") {
    const q = (url.searchParams.get("query") ?? "").toLowerCase();
    return json({ artists: MB_ARTISTS.filter((a) => a.name.toLowerCase().includes(q)) });
  }

  if (url.pathname === "/mb/release-group") {
    const artist = url.searchParams.get("artist") ?? "";
    return json({ "release-groups": MB_RELEASE_GROUPS[artist] ?? [] });
  }

  // Cover Art Archive stand-in. The real one 404s for most release groups.
  match = url.pathname.match(/^\/coverart\/release-group\/([^/]+)\/front-250$/);
  if (match) {
    if (match[1] !== "mbrg-1") {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    return res.end(coverSvg(url.pathname));
  }

  json({ error: { message: "not found" } });
}).listen(PORT, () => {
  console.log(`mock provider listening on ${SELF}`);
});
