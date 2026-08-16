/**
 * Stand-in for api.deezer.com, shaped like the real responses.
 *
 * Tests run against this rather than the live service so they are deterministic
 * and work offline. Point the app at it with DEEZER_API_BASE.
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
];

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

  match = url.pathname.match(/^\/album\/(\d+)\/tracks$/);
  if (match) return json({ data: TRACKS[match[1]] ?? [] });

  json({ error: { message: "not found" } });
}).listen(PORT, () => {
  console.log(`mock provider listening on ${SELF}`);
});
