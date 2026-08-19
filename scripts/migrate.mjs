/**
 * Applies pending migrations, retrying a connection that isn't answering yet.
 *
 * A hosted database that has been idle can refuse the first connection while it
 * wakes, and the build reaches for it before anything else — so a deploy that
 * was in every way fine failed with P1001, having never got as far as
 * compiling. Retrying costs seconds on a cold database and nothing at all on a
 * warm one.
 *
 * This is deliberately not a way of tolerating a failed migration: a migration
 * that is genuinely wrong fails every attempt and still fails the build, which
 * is the behaviour that matters. Only the waiting is new.
 */
import { spawnSync } from "node:child_process";

/** Rising gaps, so a database that needs a moment gets one without stalling a build. */
const WAITS_MS = [3_000, 8_000, 20_000];

function attempt() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

function sleep(ms) {
  // Synchronous on purpose: this runs as a build step, and there is nothing
  // else for the process to be getting on with.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

for (let index = 0; index <= WAITS_MS.length; index += 1) {
  if (attempt()) process.exit(0);

  const wait = WAITS_MS[index];
  if (wait === undefined) break;

  console.error(
    `\nMigrations failed to apply. The database may still be waking; ` +
      `retrying in ${wait / 1000}s (${index + 1} of ${WAITS_MS.length}).\n`,
  );
  sleep(wait);
}

console.error(
  "\nMigrations could not be applied after several attempts.\n" +
    "If this says P1001, the database refused every connection — check it is " +
    "running and that the deploy can reach it. Any other error is the " +
    "migration itself, and the build is right to stop here.\n",
);
process.exit(1);
