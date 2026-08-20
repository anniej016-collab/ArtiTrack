import { expect, test } from "@playwright/test";
import { MOCK_PORT } from "../playwright.config";
import { addArtist, openArtist, resetDatabase, resetPreferences, runSql } from "./helpers";

/**
 * Deezer leads the search; Spotify is reached by moving an artist onto it.
 *
 * Spotify did lead, and was put back behind Deezer because pointing an artist
 * at it fetched no releases — a service that cannot deliver a catalogue must
 * not be the one every newly added artist silently lands on. It stays offered
 * by name in the move panel, where choosing it is deliberate and a failure
 * leaves the artist's existing releases where they are.
 *
 * The move is the part worth pinning down: provider ids never agree between
 * services, so a switch that recognised nothing would add the whole catalogue
 * a second time and take every heard mark with it.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/*
 * The stand-in outlives every test in the run, so a test that reshapes its
 * Spotify listing has to put it back — otherwise "refuses past nothing" leaks
 * into whatever runs next and fails something unrelated.
 */
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") return;
  await spotifyShape(page, {
    copiesWithMarket: 2,
    copiesWithoutMarket: 40,
    refusesPast: 1000,
  });
});

/** Moves the open artist onto Spotify the way a person would. */
async function moveToSpotify(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /Check a different service/ }).click();
  await page.getByRole("button", { name: "Search" }).click();

  const panel = page.locator("div.panel").filter({ hasText: "Which one are they?" });
  const match = panel
    .locator("li")
    .filter({ has: page.getByText("Spotify", { exact: true }) })
    .first();
  await expect(match).toBeVisible();
  await match.getByRole("button", { name: "This one" }).click();
}

test("searching finds artists through Deezer, not Spotify", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[name="query"]', "Testhead");
  await page.getByRole("button", { name: "Search" }).click();

  const row = page.locator("li").filter({ hasText: "Testhead" }).first();
  await expect(row).toBeVisible();

  // The stand-in serves a different picture per service, which is how the test
  // can tell which one answered.
  await expect(row.locator('img[src*="spotify-"]')).toHaveCount(0);
  await expect(row.locator('img[src*="/img/testhead"]')).toBeVisible();
});

test("an artist added from the search syncs from Deezer", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  await expect(page.getByText(/Releases come from Deezer/)).toBeVisible();
  await expect(page.locator("#to-listen li")).toHaveCount(0);
});

test("moving an artist to another service doesn't list everything twice", async ({
  page,
}) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  const before = await page.locator("a[href^='/releases/']").count();
  expect(before).toBeGreaterThan(2);

  /*
   * Force the artist onto Spotify the way the link control does, then let a
   * check run. Spotify's ids for these records differ from Deezer's, so only
   * matching on title and year can recognise them.
   */
  await runSql(
    `UPDATE "Artist" SET "syncSource" = 'spotify', "syncExternalId" = 'sp-399' WHERE name = 'Testhead'`,
  );
  await runSql(`UPDATE "Release" SET "externalId" = NULL WHERE "externalId" IS NOT NULL`);

  await page.reload();
  await page.getByRole("button", { name: /Check for new/ }).click();
  await expect(page.getByText(/Releases come from Spotify/)).toBeVisible();

  // Same records, re-pointed — not a second copy of each.
  await expect(page.locator("a[href^='/releases/']")).toHaveCount(before);
  // And still heard, which is the thing a duplicate would have thrown away.
  await expect(page.locator("#to-listen li")).toHaveCount(0);
});

test("an artist already on a service can be moved to another one", async ({ page }) => {
  /*
   * The gap that made the whole Spotify change unusable: the control offering a
   * service only appeared when *no* service was attached, so an artist watched
   * by one that turns out to be missing records had no way out. Being told to
   * move an artist and finding nothing to press is worse than not offering it.
   *
   * Starts on Deezer, which is where an artist added before Spotify existed
   * actually is, and moves them the way a person would.
   */
  await addArtist(page, "Testhead", { heardAlready: true });

  await openArtist(page, "Testhead");
  await expect(page.getByText(/Releases come from Deezer/)).toBeVisible();
  const before = await page.locator("a[href^='/releases/']").count();
  expect(before).toBeGreaterThan(2);

  /*
   * Picks the Spotify row specifically. Deezer leads the list now, and pressing
   * whatever happens to be first would "move" the artist to the service they
   * are already on and prove nothing.
   */
  await moveToSpotify(page);

  // Says so outright. The panel closing used to be the only sign it worked, and
  // once the panel stopped closing there was no sign at all.
  await expect(page.getByText(/Now checking Spotify/)).toBeVisible();
  await expect(page.getByRole("button", { name: "This one" })).toHaveCount(0);

  // On Spotify now, with one copy of the catalogue and the heard marks intact.
  await expect(page.getByText(/Releases come from Spotify/)).toBeVisible();
  await expect(page.locator("a[href^='/releases/']")).toHaveCount(before);
  await page.goto("/");
  await expect(page.locator("#following").getByText("Testhead")).toHaveCount(1);
  await expect(page.locator("#to-listen li")).toHaveCount(0);
});

test("every match says which service it came from", async ({ page }) => {
  /*
   * Search shows whichever service answers first, and until now did so
   * silently. Someone expecting one service could be handed another's results,
   * pick one, and have no way to work out why nothing changed.
   */
  await page.goto("/");
  await page.fill('input[name="query"]', "Testhead");
  await page.getByRole("button", { name: "Search" }).click();

  const row = page.locator("li").filter({ hasText: "Testhead" }).first();
  await expect(row.getByText("Deezer", { exact: true })).toBeVisible();
});

test("moving an artist offers every service, not just the one they are on", async ({
  page,
}) => {
  /*
   * Search normally stops at the first service that answers, which is right for
   * adding an artist and exactly wrong for moving one: it would only ever offer
   * the service they are already on, so there was no way across at all.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await expect(page.getByText(/Releases come from Deezer/)).toBeVisible();

  await page.getByRole("button", { name: /Check a different service/ }).click();
  await page.getByRole("button", { name: "Search" }).click();

  const panel = page.locator("div.panel").filter({ hasText: "Which one are they?" });
  await expect(panel.getByText("Spotify", { exact: true }).first()).toBeVisible();
  await expect(panel.getByText("Deezer", { exact: true }).first()).toBeVisible();
});

test("a service that fails on the first fetch says so instead of erroring out", async ({
  page,
}) => {
  /*
   * The switch is saved before the fetch runs, so letting the fetch throw
   * turned a link that had already worked into an error page — which had to be
   * reloaded to discover it had worked after all.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  // Every outbound call to the service fails from here on.
  await page.route("**/spotify/**", (route) => route.abort());

  await page.getByRole("button", { name: /Check a different service/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  const match = page.getByRole("button", { name: "This one" }).first();
  await expect(match).toBeVisible();
  await match.click();

  // Still the artist page, with the reason on it rather than an error screen.
  await expect(page.getByRole("heading", { name: "Testhead", level: 1 })).toBeVisible();
});

/** Reshapes the stand-in's album listing the way real Spotify varies. */
async function spotifyShape(
  page: import("@playwright/test").Page,
  shape: Partial<{
    copiesWithMarket: number;
    copiesWithoutMarket: number;
    refusesPast: number;
  }>,
) {
  const query = new URLSearchParams(
    Object.entries(shape).map(([key, value]) => [key, String(value)]),
  );
  const response = await page.request.get(
    `http://127.0.0.1:${MOCK_PORT}/control/spotify-shape?${query}`,
  );
  expect(response.ok()).toBe(true);
}

test("a record listed once per country is added once", async ({ page }) => {
  /*
   * Spotify lists the same record separately for every country it was sold in,
   * each copy under its own id. De-duplicating on that id therefore removed
   * nothing at all, and the copies would have arrived as separate releases.
   */
  await spotifyShape(page, { copiesWithMarket: 6 });

  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await moveToSpotify(page);

  await expect(page.getByText(/Releases come from Spotify/)).toBeVisible();
  await expect(page.getByRole("link", { name: /In Testing/ })).toHaveCount(1);

  // Six copies each of six usable records is thirty-six rows, and every one of
  // them would have been a release of its own.
  const counted = await runSql(
    `SELECT count(*)::int AS n FROM "Release" WHERE title = 'In Testing'`,
  );
  expect(counted.rows[0].n).toBe(1);
});

test("a catalogue too deep to page through keeps what it did reach", async ({
  page,
}) => {
  /*
   * Spotify refuses to look past a fixed depth, answering a bare 400 rather
   * than an empty page. That refusal used to escape as "Spotify returned 400"
   * with no releases at all — throwing away everything already fetched to
   * report that there was more. Most of a catalogue beats none of it.
   */
  await spotifyShape(page, { copiesWithMarket: 30, refusesPast: 100 });

  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await moveToSpotify(page);

  await expect(page.getByText(/Releases come from Spotify/)).toBeVisible();
  await expect(page.getByRole("link", { name: /In Testing/ })).toHaveCount(1);
});

test("a refusal on the very first page is reported, not swallowed", async ({
  page,
}) => {
  /*
   * The other half of the rule above: nothing was fetched, so there is nothing
   * to show and no reason to pretend otherwise. Spotify's own explanation is
   * carried through, because "400" alone cost a deploy and a round trip to
   * learn what the response had said all along.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await spotifyShape(page, { refusesPast: 0 });

  await moveToSpotify(page);

  await expect(page.getByText(/maximum offset is 1000/)).toBeVisible();
});
