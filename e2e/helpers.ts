import { Client } from "pg";
import type { Page } from "@playwright/test";

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
    await client.query('TRUNCATE "Track", "Release", "Artist" CASCADE');
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
  await row.getByText("Added").waitFor();
}

/** Ids are generated, so tests find an artist by opening them from the list. */
export async function openArtist(page: Page, name: string) {
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name }).first().click();
  await page.waitForURL(/\/artists\//);
}
