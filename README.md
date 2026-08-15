# ArtiTrack

A personal tracker for the artists you follow: log their releases, mark what you've
listened to, and pause artists you no longer want new-release updates from — without
losing their history.

- **Add an artist** from the home page.
- **Log releases** (albums, EPs, singles) from an artist's page.
- **Mark releases as listened.** Anything unlistened from an artist you follow sits in
  the **To listen** queue on the home page. Marking it clears it from the queue; you can
  always un-mark it.
- **Pause updates** for an artist you no longer follow. They drop out of "Following" and
  their releases leave the To listen queue — but their full release history, including
  what you'd already marked as listened, stays on their page.
- **Resume** a paused artist any time.

Releases are entered manually. The `Artist` model reserves `source` / `externalId`
fields for a future auto-pull integration (e.g. Spotify or MusicBrainz) so that can be
added without a schema rewrite.

## Deploying to Vercel

1. Push this branch to GitHub (already done).
2. Go to [vercel.com/new](https://vercel.com/new) and import the `ArtiTrack` repository.
   Vercel detects Next.js automatically — leave the build settings alone.
3. **Create the database before the first deploy succeeds.** In the Vercel project, open
   the **Storage** tab → **Create Database** → **Postgres** (Neon). Connect it to the
   project **without a custom environment-variable prefix** — the app looks for the
   standard names and a prefix renames them.

   If Vercel reports *"This project already has an existing environment variable with
   name DATABASE_URL"*, delete that variable under **Settings → Environment Variables**
   and connect the database again. Reaching for a custom prefix to dodge the collision
   will produce a variable the app cannot see.
4. Redeploy. The build runs `prisma migrate deploy`, which creates the tables on the
   first successful build.

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

- `Artist` — name, follow `status` (`ACTIVE` / `PAUSED`), `pausedAt`.
- `Release` — belongs to an artist; `title`, `type` (`ALBUM`/`EP`/`SINGLE`/`OTHER`),
  `releaseDate`, and `listenedAt` (null means not listened yet).

Pausing an artist only changes `Artist.status`. It never deletes or alters releases.
