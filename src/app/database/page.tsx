import Link from "next/link";
import { Client } from "pg";
import {
  describePostgresUrl,
  discoverPostgresUrlVars,
  resolveMigrationUrlVar,
  resolveRuntimeUrlVar,
} from "@/lib/db-url";

export const dynamic = "force-dynamic";

/**
 * Which database the app is actually talking to.
 *
 * This exists because of an outage: the deployed app was reading one database
 * while its settings named four, and there was no way to see that from inside
 * the app. Working it out meant reading environment variables in a hosting
 * dashboard — fiddly, and the one place a connection string's password is on
 * screen.
 *
 * Behind the password gate with everything else, and nothing here prints a
 * credential: a host and a database name say which server without opening it.
 */
type Probe = {
  name: string;
  host: string;
  database: string;
  identity: string;
  inUse: boolean;
  usedForMigrations: boolean;
  artists: number | null;
  releases: number | null;
  error: string | null;
};

/**
 * Postgres error codes, turned into something worth reading.
 *
 * "relation \"Artist\" does not exist" is the most useful answer this page can
 * give — it means the database is real but has never had ArtiTrack in it — and
 * it is also the least legible. Saying so plainly is the whole point.
 */
function readableError(cause: unknown): string {
  const code = (cause as { code?: string } | null)?.code;

  if (code === "42P01") return "Empty — a real database, but ArtiTrack has never used it.";
  if (code === "3D000") return "No database by that name on the server.";
  if (code === "28P01" || code === "28000") return "The username or password is wrong.";
  if (code === "ENOTFOUND" || code === "ETIMEDOUT" || code === "ECONNREFUSED") {
    return "Couldn't reach the server.";
  }

  return cause instanceof Error ? cause.message : "Couldn't read it.";
}

/** Opens each candidate briefly and counts what is in it. */
async function probe(
  name: string,
  url: string,
): Promise<Omit<Probe, "inUse" | "usedForMigrations">> {
  const target = describePostgresUrl(url)!;
  const base = { name, ...target, artists: null, releases: null, error: null };

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const { rows } = await client.query(
      'SELECT (SELECT count(*) FROM "Artist") artists, (SELECT count(*) FROM "Release") releases',
    );
    return {
      ...base,
      artists: Number(rows[0].artists),
      releases: Number(rows[0].releases),
    };
  } catch (cause) {
    return { ...base, error: readableError(cause) };
  } finally {
    await client.end().catch(() => {});
  }
}

export default async function DatabasePage() {
  const names = discoverPostgresUrlVars();
  const runtime = resolveRuntimeUrlVar();
  const migrations = resolveMigrationUrlVar();

  const probes: Probe[] = await Promise.all(
    names.map(async (name) => ({
      ...(await probe(name, process.env[name]!)),
      inUse: name === runtime,
      usedForMigrations: name === migrations,
    })),
  );

  const distinct = new Set(probes.map((entry) => entry.identity));
  const live = probes.find((entry) => entry.inUse);
  /*
   * Every setting that isn't the one being read.
   *
   * This used to list only the ones naming a *different* database, which is
   * backwards: those are the ones to be careful with. In the ordinary case —
   * several names for one database — it listed nothing at all, directly under
   * a sentence saying the spares were safe to remove. Promising guidance and
   * then not giving it sends someone hunting through a hosting dashboard for a
   * box that was never going to appear.
   */
  const others = probes.filter((entry) => !entry.inUse);

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-faint transition-colors hover:text-text"
      >
        <span aria-hidden="true">←</span> Back
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Database
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Which database this app reads and writes, and what else its settings
          point at. Passwords are never shown.
        </p>
      </div>

      {/* The verdict first: it is the reason anyone opens this page. */}
      <section className="panel px-5 py-4">
        <h2 className="eyebrow mb-2">In short</h2>
        {probes.length === 0 ? (
          <p className="text-sm text-muted">
            No database settings found at all — which shouldn&apos;t be possible
            while this page is loading.
          </p>
        ) : distinct.size === 1 ? (
          <p className="text-sm text-text">
            All {probes.length} settings point at the{" "}
            <strong>same database</strong>, which is the healthy answer: they
            are one place under several names, which is how a hosting provider
            usually hands a database over. Nothing needs changing.
          </p>
        ) : (
          <p className="text-sm text-text">
            These settings point at{" "}
            <strong>{distinct.size} different databases</strong>. Your library is
            in the one marked <em>in use</em>. Removing that one would send the
            app to a different database and your library would look empty — so
            leave it be, and tidy the others.
          </p>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-3">What each setting points at</h2>
        <ul className="panel divide-y divide-line overflow-hidden">
          {probes.map((entry) => (
            <li key={entry.name} className="flex flex-col gap-1.5 px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-sm font-medium">{entry.name}</code>
                {entry.inUse && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[0.7rem] font-semibold text-success ring-1 ring-inset ring-success/25">
                    in use
                  </span>
                )}
                {entry.usedForMigrations && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.7rem] font-semibold text-accent ring-1 ring-inset ring-accent/25">
                    used for updates
                  </span>
                )}
              </div>
              <p className="break-all text-xs text-faint">
                {entry.host} · {entry.database || "(no database named)"}
              </p>
              <p className="text-xs text-muted">
                {entry.error ?? `${entry.artists} artists · ${entry.releases} releases`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {others.length > 0 && (
        <section className="panel px-5 py-4">
          <h2 className="eyebrow mb-2">The others</h2>
          <ul className="flex flex-col gap-1.5">
            {others.map((entry) => (
              <li key={entry.name} className="text-sm text-muted">
                <code className="text-text">{entry.name}</code> —{" "}
                {entry.identity === live?.identity
                  ? "another name for the same database. Nothing reads it, and it is almost certainly the hosting provider's, so it is better left where it is than tidied away."
                  : "a different database. Nothing reads it, but deleting the setting does not delete what is in it — check that before assuming it is spare."}
              </li>
            ))}
          </ul>
          {live && (
            <p className="mt-3 text-xs text-faint">
              If you do remove one, remove it on its own and reload this page:
              it should still say <em>in use</em> against{" "}
              <code className="text-muted">{live.name}</code>.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
