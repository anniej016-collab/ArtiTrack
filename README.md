# ArtiTrack

A personal tracker for the artists you follow: log their releases, mark what you've
listened to, and pause artists you no longer want new-release updates from — without
losing their history.

- **Search for an artist** on the home page and add them. Their back catalogue is
  imported automatically from [Deezer](https://www.deezer.com) — no API key or account
  needed. Artists Deezer doesn't carry are looked up in
  [MusicBrainz](https://musicbrainz.org) instead, which covers independent, regional and
  older material; it has releases but no artwork or song lists. Artists can still be
  added and their releases logged by hand.
- **New releases arrive on their own.** A scheduled job checks nightly, so the queue is
  up to date whenever you open the app. There are still buttons to check on demand. Re-syncing updates existing releases rather than duplicating
  them, and never overwrites what you've marked as listened.
- **Checking one artist also refreshes their photo**, when the service has a newer one.
  Only that button, never the nightly run: a library that quietly looks different every
  morning is unsettling rather than helpful, and it would cost an extra request per
  artist on the sweep that can least afford one. A photo you typed in yourself is never
  replaced.
- **Mark releases as listened.** Anything unlistened from an artist you follow sits in
  the **To listen** queue on the home page. Marking it clears it from the queue; you can
  always un-mark it.
- **Narrow the queue by what a release actually is.** Albums, EPs, singles, deluxe
  editions, remasters, compilations, soundtracks and live records each get a chip
  with a count, and any of them can be switched off. Categories come from the title
  as well as the provider's type, which only distinguishes four kinds. Only the
  chips you actually have are shown. Long artist lists get a name filter.
- **Hearing a release means hearing its songs**, and ticking off the last song
  completes the release. Because a song belongs to the artist rather than to one
  record, that reaches sideways too: hearing the deluxe edition completes the
  standard album it shares its songs with.
- **Set aside anything you've no plans to play.** A third state, because the other two
  both say the wrong thing about a record you've decided to skip: leaving it unheard
  keeps it in the queue for good, and marking it heard is untrue. It drops out of the
  queue into its own **Set aside** section, where you can put it back or tick it off if
  you get to it after all. Nothing about it is permanent, and the songs are untouched.
- **Group the To listen queue** by artist or by release month, so it's clear whose
  backlog is stacking up. Month headings carry the year only when the queue spans more
  than one.
- **Hearing a song counts everywhere it appears.** The same song turns up as a single,
  on the album, on the deluxe edition and on a greatest-hits; ticking any one of them
  ticks them all, so nothing has to be marked off four times.
- **Open a release** to see its songs and tick off the ones you've heard. An artist's
  **Songs** tab lists every track across their releases with a heard count. Tracklists
  are fetched per release, in batches, because each one costs a separate request.
- **Switch between cards and a list** — each home section keeps its own choice, so the
  queue can be a list while your artists stay as cards.
- **Every section previews two rows**, with "Show all" to expand and a chevron to
  collapse it entirely. Both stick between visits, so the home page stays a fixed length
  however large the library grows. Release sections lead with the most recent; artists
  are listed alphabetically, following and paused alike, because a follow list is looked
  up by name — and alphabetically as a person reads it, so **aespa** sits under A rather
  than after every capitalised name, which is where sorting by byte value puts it. Card view shows album art for
  releases and photos for artists; list view is text-only. The choice is stored in a
  cookie, so the server renders the right layout straight away and it survives closing
  the tab.
- **Pick out up to three favourite songs on a release.** Three is the point rather than
  a technical limit — a shortlist that holds everything is just the tracklist again.
  Fewer is fine and none at all is the normal state: a heart shows only where you gave
  one, and the empty ones appear only while you press *Pick favourites*, so a tracklist
  reads as a list of songs rather than a form waiting to be filled in. A favourite
  belongs to the record rather than to the song, unlike being heard: a track can be the
  highlight of the album and merely present on the greatest-hits.
- **Shortlist an artist's records, and read them in rating order.** A favourite release
  gets its own row at the top of the artist's page, above everything else, and vanishes
  entirely when nothing is picked. Separately, once anything is rated the page offers
  *Best rated* alongside *Newest* — unrated records sit at the end rather than at the
  bottom of the scale, because no opinion is not nought out of five. Ratings show as
  pips under the title in that view only, where they are what you are reading.
- **Edit or delete a single release**, rate it out of five in half-stars, and keep notes
  on it or on the artist. The left half of a star sets the half step and the right half
  the whole one; pressing whichever step is already the rating clears it. Notes sit at the top of the page they belong to, not behind an edit form.
  Deleting one release leaves the artist and everything else intact.
- **Fill in anything a catalogue doesn't supply.** Artist photos and cover art are taken
  as links (right-click an image on the web and copy its address), names can be edited,
  and a tracklist can be pasted in one go — numbered or not, with or without running
  times. Hand-entered songs behave exactly like fetched ones, so hearing one still counts
  everywhere it appears.
- **Pause updates** for an artist you no longer follow. They stop being synced, drop out
  of "Following", and their releases leave the To listen queue — but their full release
  history, including what you'd already marked as listened, stays on their page.
- **Resume** a paused artist any time.
- **See which database it is actually using.** A *Database* link in the footer names
  every database setting the app can see, says which one it reads and which one
  schema updates go to, and reports how much is in each — so "is this the right
  database?" is answered by the app rather than by reading a hosting dashboard.
  It exists because of an outage where the answer mattered and nothing could say it.
  Passwords are never shown.
- **Download your data** as JSON from the link at the bottom of any page. What you've
  heard is hand-entered and can't be re-fetched from anywhere, so it's worth keeping a
  copy.
- **Install it to a home screen** — it opens without browser chrome, like an app. There's
  an **Install as an app** link in the footer, because whether a browser offers to install
  by itself differs per browser and per device: the same app can prompt on a phone and
  stay silent on a tablet. Where the browser hands the offer over, the link installs
  directly; where it doesn't — Safari never does, on any iPhone or iPad — it says which
  menu to use instead.
- **Import a discography you keep yourself** from the link in the footer. For a catalogue
  no music service covers properly — every unit, side project, soundtrack and solo
  release, with tracklists and cover art. Paste the file, and its releases become artists
  in the library. Re-import the same file whenever you update it: what changed is
  corrected, what's new is added, a corrected title is recognised rather than duplicated,
  and what you've marked as heard is never overwritten. Imported artists aren't synced
  from anywhere — the file is where they come from.
- **Keep a "Check out" list** for artists and records you don't follow but mean to hear.
  Reached from the header, and deliberately outside the library: nothing on it counts as
  following anyone and none of it lands in the To listen queue. Add one at a time, or
  paste a playlist in as `Artist - Title` lines — repeats are skipped, so an updated list
  can go straight over the old one. **Follow** on any row hands the name to the tracker's
  own search.
- **An imported or hand-built artist can be watched too.** Where an artist came from
  and where their new releases are fetched from are separate questions, so pointing one
  at Deezer doesn't make a second artist. Open them and press *Check for new releases
  automatically*. The first sync recognises releases the file already brought in — same
  title, same year — and adopts them, keeping their tracklists, notes and heard marks
  rather than listing everything twice.
- **Link out to a fuller discography.** Each artist can carry a link to a detailed
  catalogue kept elsewhere, shown on their banner. An import can set the same link for
  every artist in the file at once, so a group split across a dozen units needs it
  entered only the once.
- **A file that says what a release is keeps saying it.** "OST" and "Concert Film" are
  classifications the four stored types can't hold and no title reveals, so they're
  stored outright and shown as Soundtrack and Live. They are still ordinary releases:
  nothing about being one excludes it from matching a service.
- **The check-out list knows what's already in the tracker.** A playlist is unfiltered by
  definition, so each row says whether you already follow that artist (or have them
  paused), and flags anything whose song or record you have already ticked off — with a
  button to clear those in one go. Nothing is dropped automatically: matching is by name,
  which is sound enough to point at something but not to delete it behind your back.

When you add an artist, **"Heard already" is ticked by default** so their existing
catalogue does not flood the To listen queue. Releases found by later syncs arrive
unlistened, which is what makes the queue mean "new since I started following".

Being listened to and *when* you listened are stored separately. An imported back
catalogue is marked listened with **no date**, because the date of the import says
nothing about when the music was actually heard. Only pressing the button records a
date, so "Recently listened" shows genuine recent listens rather than an import.

Un-ticking something keeps the date, and records the moment it was un-ticked. The flag
is what you say about a record; the date is what happened, and un-ticking says you were
wrong about having heard it, not that the day it was heard on never existed.

Re-ticking within the hour is read as undoing a mistap, and puts back exactly what was
there — **including no date at all**, which is how an imported back catalogue is stored.
Re-ticking later is a real listen and takes today's date. Timing is what separates them:
a mistap is noticed within seconds, while deciding you never really heard a record,
playing it, and ticking it off again takes longer than any mistake does. Keeping only
the date was not enough on its own, because the records it went wrong on were exactly
the ones that never had one.

## How it looks

Electric violet, paired with a bright teal rather than the magenta every streaming
service runs into. The punch is the point — a pastel version of the same idea read as
washed out — so what changes is the second colour, not the saturation. Section headings
carry the display face at full brightness with a short accent rule, because as quiet
uppercase labels they were indistinguishable from the small print inside them. The
header is a two-item nav, Library and Check out, with the current one filled in.

## Deploying to Vercel

The build command is pinned in `vercel.json` to `npm run build`, and that is
load-bearing: `prisma migrate deploy` lives in that script, so a Build Command
set in the Vercel dashboard replaces it silently and ships an app whose schema
change never happened. Every page then fails on a column that does not exist.


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

## Scheduled syncing

`vercel.json` runs `/api/cron/sync` once a day. Set **`CRON_SECRET`** in the project's
Environment Variables — Vercel sends it as a bearer token, and the route refuses to run
without it rather than leaving an endpoint anyone could trigger.

Each run checks the least-recently-checked artists first, capped per run, so a large
follow list is worked through over successive nights instead of timing out in one go.
Paused artists are never checked.

## Keeping it private

Anyone with the URL can otherwise read and edit everything. Set **`ARTITRACK_PASSWORD`**
in the Vercel project's Environment Variables and the whole app sits behind a password
screen. Leave it unset locally so development and the tests aren't obstructed.

The cookie stores a value derived from the password, never the password itself, so
changing the password signs every device out. Vercel's own Deployment Protection does
the same job without any code, but protecting a production URL with it needs a paid
plan.

## Running locally

Requires a Postgres database.

```bash
cp .env.example .env       # then fill in DATABASE_URL
npm install                # also generates the Prisma client
npx prisma migrate dev     # creates the tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test        # unit tests (vitest) — grouping, connection-string resolution, provider parsing
npm run test:e2e  # browser tests (Playwright), desktop and phone
npm run test:all
```

The browser tests run the real app against a stand-in provider in `e2e/mock-provider.mjs`,
so they need no network and are deterministic. They need a Postgres database and
**truncate every table**, so point `TEST_DATABASE_URL` at a scratch database rather
than the one holding real data.

`e2e/regressions.spec.ts` is one test per bug that actually shipped. They are all
browser behaviours — tap targets, responsive rules, state surviving a reload — which is
where this project's regressions have been; unit tests could not have caught any of them.

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
- `Track` — one appearance of a song on one release; `title`, `position`, `duration`,
  `externalId`, `isrc`. Fetched on demand rather than during an artist sync, since one
  request per album would make importing a discography very slow.
  `Release.tracksSyncedAt` records which have been fetched.
- `Song` — a song independent of its releases, holding the listening state. Tracks are
  folded into one per artist by `src/lib/song-identity.ts`, which matches on a
  normalised title: qualifiers describing a repackaging (remaster, deluxe, bonus track,
  featured credits) are ignored, while ones describing a different performance (live,
  acoustic, demo, remix) are kept. Matching is by title rather than ISRC because ISRC
  identifies a *recording*, and a remaster is a different recording — which is exactly
  the case that needs folding. The cost is that two different songs sharing a name
  ("Intro" on three albums) fold together.
- `Release.rating` is in half-stars: a whole number from 1 to 10, where 7 is three and a
  half. Stored doubled rather than as a decimal, because the scale has exactly ten
  positions and an integer cannot land between two of them.
- `Release.unheardAt` records when something was last un-ticked, which is what lets a
  re-tick be read as an undo rather than a listen. `src/lib/listen-dates.ts` holds that
  rule on its own so it can be tested without a database.
- `Release.favourite` and `Track.favourite` are shortlists, not ratings. The release one
  is unlimited and drives the row at the top of the artist page; the track one is capped
  at three per release, enforced in `setTrackFavourite` as well as in the UI.
- Listening state is `listened` (boolean) plus an optional `listenedAt`, on both releases
  and tracks. `listened` with a null `listenedAt` means "heard, date unknown" — the state
  an imported back catalogue lands in. Track and release listening are independent, so a
  part-listened album stays visibly part-listened.

Pausing an artist only changes `Artist.status`. It never deletes or alters releases, and
`syncArtist` refuses to run for a paused artist.

Adding a provider means implementing `searchArtists` / `fetchArtistReleases` alongside
`src/lib/providers/deezer.ts`; the sync layer is written against that shape.
