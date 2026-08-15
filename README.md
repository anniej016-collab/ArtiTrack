# ArtiTrack

A personal tracker for the artists you follow: log their releases over time, and if you stop wanting new-release updates from an artist, pause them without losing their history.

- **Add an artist** from the home page.
- **Log releases** (albums, EPs, singles) manually from an artist's page.
- **Pause updates** for an artist you no longer want to hear new stuff from — they drop out of "Following" and the recent-releases feed, but their full release history stays on their page.
- **Resume** a paused artist any time.

Releases are entered manually for now. The data model has a `source`/`externalId` field on each artist reserved for a future auto-pull integration (e.g. Spotify or MusicBrainz) without needing a schema rewrite.

## Getting started

```bash
npm install       # also generates the Prisma client
npx prisma migrate dev   # creates the local SQLite database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions)
- [Prisma](https://www.prisma.io) + SQLite (`dev.db`, local file — not committed)
- Tailwind CSS

## Data model

- `Artist` — name, follow `status` (`ACTIVE` / `PAUSED`), `pausedAt`.
- `Release` — belongs to an artist, has a `title`, `type` (`ALBUM`/`EP`/`SINGLE`/`OTHER`), and `releaseDate`. Releases are never deleted or hidden when you pause an artist.
