import { Client } from "pg";
import { expect, type Page } from "@playwright/test";

const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

/**
 * Specs share one database, so each starts from empty. Cookies carry view and
 * section preferences, so those are cleared too or a later spec inherits an
 * earlier one's layout.
 */
export async function resetDatabase() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('TRUNCATE "Track", "Release", "Artist", "Discovery" CASCADE');
  } finally {
    await client.end();
  }
}

/**
 * Runs one statement against the test database.
 *
 * For the handful of states the app has no way to produce on purpose — a
 * release heard years ago, say, when the only button available stamps today.
 */
export async function runSql(text: string, values: unknown[] = []) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

export async function resetPreferences(page: Page) {
  await page.context().clearCookies();
}

/** Adds an artist through the real search flow rather than seeding the database. */
export async function addArtist(
  page: Page,
  name: string,
  { heardAlready }: { heardAlready: boolean },
) {
  await page.goto("/");
  await page.fill('input[name="query"]', name);
  await page.getByRole("button", { name: "Search" }).click();

  const row = page.locator("li").filter({ hasText: name }).first();
  await row.waitFor();

  const checkbox = row.locator('input[name="markListened"]');
  if (heardAlready) await checkbox.check();
  else await checkbox.uncheck();

  await row.getByRole("button", { name: "Add" }).click();
  // Adding clears the search and replaces it with a confirmation.
  await page.getByText(`Added ${name}.`).waitFor();
}

/**
 * Presses "load songs" until nothing is left to fetch.
 *
 * Tracklists arrive a batch at a time, and a batch can come back short if a
 * request fails — which is swallowed by design. Waiting for the button to go
 * away is the only signal that the whole discography is really in.
 */
export async function loadAllTracks(page: Page) {
  const tab = page.getByRole("link", { name: /^Songs/ });
  await tab.click();
  // The tab marks itself current once its content is on screen. Probing for the
  // load button before that reads the releases tab and finds nothing to do.
  await expect(tab).toHaveAttribute("aria-current", "page");

  const load = page.getByRole("button", { name: /Load songs/ });
  // Song toggles are named after their song, in either state.
  const toggles = page.getByRole("button", { name: /^Mark .+ heard$|, heard$/ });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await load.count()) === 0) break;

    // More songs on the page is the only trustworthy sign a batch landed;
    // nothing navigates, so there is no load state to wait on.
    const before = await toggles.count();
    await load.first().click();
    await expect.poll(async () => toggles.count(), { timeout: 30_000 }).toBeGreaterThan(
      before,
    );
  }

  await expect(load).toHaveCount(0);
}

/**
 * Switches to the Releases tab and waits until it is actually showing.
 *
 * The tabs are client-side links, so the click resolves long before the new
 * content is on screen. Acting immediately after it reaches whatever the
 * previous tab left behind.
 */
export async function openReleasesTab(page: Page) {
  const tab = page.getByRole("link", { name: /^Releases ·/ });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
}

/**
 * Opens one release from an artist's grid, settled on its own page.
 *
 * waitForURL returns as soon as the address changes, which is before the page
 * renders — and the grid left behind carries controls with the same names as
 * the release page's, so acting too early acts on the wrong record.
 */
export async function openRelease(page: Page, title: string) {
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
}

/** Ids are generated, so tests find an artist by opening them from the list. */
export async function openArtist(page: Page, name: string) {
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name }).first().click();
  await page.waitForURL(/\/artists\//);
}
