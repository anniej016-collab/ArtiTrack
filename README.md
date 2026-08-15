# ArtiTrack

A personal tracker for the artists you follow: log their releases, mark what you've
listened to, and pause artists you no longer want new-release updates from — without
losing their history.

- **Search for an artist** on the home page and add them. Their back catalogue is
  imported automatically from [Deezer](https://www.deezer.com) — no API key or account
  needed. Artists can still be added and their releases logged by hand.
- **Check for new releases** with a button on the home page (all followed artists) or on
  a single artist's page. Re-syncing updates existing releases rather than duplicating
  them, and never overwrites what you've marked as listened.
- **Mark releases as listened.** Anything unlistened from an artist you follow sits in
  the **To listen** queue on the home page. Marking it clears it from the queue; you can
  always un-mark it.
- **Switch between cards and a list** on the home page. Card view shows album art for
  releases and photos for artists; list view is text-only. The choice is stored in a
  cookie, so the server renders the right layout straight away and it survives closing
  the tab.
- **Pause updates** for an artist you no longer follow. They stop being synced, drop out
  of "Following", and their releases leave the To listen queue — but their full release
  history, including what you'd already marked as listened, stays on their page.
- **Resume** a paused artist any time.

When you add an artist, **"Heard already" is ticked by default** so their existing
catalogue does not flood the To listen queue. Releases found by later syncs arrive
unlistened, which is what makes the queue mean "new since I started following".

Being listened to and *when* you listened are stored separately. An imported back
catalogue is marked listened with **no date**, because the date of the import says
nothing about when the music was actually heard. Only pressing the button records a
date, so "Recently listened" shows genuine recent listens rather than an import.

## Deploying to Vercel

1. Push this branch to GitHub (already done).
2. Go to [vercel.com/new](https://vercel.com/new) and import the `ArtiTrack` repository.
   Vercel detects Next.js automatically — leave the build settings alone.
3. **Create the database before the first deploy succeeds.** In the Vercel project, open
   the **Storage** tab → **Create Database** → **Postgres** (Neon) and connect it to the
   project. A custom environment-variable prefix is fine; the app resolves the
   connection string by looking for any variable holding a `postgres://` URL.

   If Vercel reports *"This project already has an existing environment variable with
   name DATABASE_URL"*, either delete that variable under **Settings → Environment
   Variables** and attach again, or attach with a prefix to sidestep the collision.
4. Redeploy. The build runs `prisma migrate deploy`, which creates the tables on the
   first successful build.

If a build fails with *"Connection url is empty"* or *"No Postgres connection string is
available"*, the database is not reaching that build. The build log lists the names of
the database-related variables it can see, which distinguishes "nothing attached" from
"attached but scoped to a different environment".

The app has no login, so anyone with the deployment URL can read and edit your data.
Vercel's **Deployment Protection** settings (Project → Settings → Deployment Protection)
can restrict access to your own Vercel account.

## Running locally

Requires a Postgres database.

```bash
cp .env.example .env       # then fill in DATABASE_URL
npm install                # also generates the Prisma client
npx prisma migrate dev     # creates the tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions)
- [Prisma](https://www.prisma.io) 7 + Postgres (via the `@prisma/adapter-pg` driver adapter)
- Tailwind CSS

## Data model

- `Artist` — name, follow `status` (`ACTIVE` / `PAUSED`), `pausedAt`, plus `source` /
  `externalId` identifying the provider record and `lastSyncedAt`.
- `Release` — belongs to an artist; `title`, `type` (`ALBUM`/`EP`/`SINGLE`/`OTHER`),
  `releaseDate`, `coverUrl`, and `externalId`, which is what makes re-syncing
  idempotent. Hand-entered releases have a null `externalId`.
- Listening state is `listened` (boolean) plus an optional `listenedAt`. `listened` with
  a null `listenedAt` means "heard, date unknown" — the state an imported back catalogue
  lands in.

Pausing an artist only changes `Artist.status`. It never deletes or alters releases, and
`syncArtist` refuses to run for a paused artist.

Adding a provider means implementing `searchArtists` / `fetchArtistReleases` alongside
`src/lib/providers/deezer.ts`; the sync layer is written against that shape.
