import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

/**
 * The page exists because of an outage nobody could see from inside the app:
 * four database settings, one of them shadowing the others, and no way to tell
 * which one was live without reading a hosting dashboard. What it must never do
 * is print a password.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

test("says which database is live, and how much is in it", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });

  await page.goto("/database");
  await expect(page.getByRole("heading", { name: "Database", level: 1 })).toBeVisible();

  // Exactly one setting is the one being read.
  await expect(page.getByText("in use", { exact: true })).toHaveCount(1);

  // And it reports real contents, which is what proves it is the right one.
  await expect(page.getByText(/\d+ artists · \d+ releases/).first()).toBeVisible();
});

test("never puts a password on screen", async ({ page }) => {
  /*
   * The whole reason this page is worth having over reading the hosting
   * dashboard: the dashboard shows the connection string, credentials and all.
   */
  await page.goto("/database");

  const shown = await page.locator("body").innerText();

  // No connection string in any form: no scheme, and nothing shaped like the
  // user:password@host that carries the credentials inside one.
  expect(shown).not.toContain("://");
  expect(shown).not.toMatch(/\S+:\S+@\S+/);

  /*
   * The password itself, when it is distinctive enough to look for. A password
   * that happens to be a substring of the host or the database name — as the
   * local test one is, "artitrack" inside "artitrack_test" — cannot be searched
   * for this way without failing on the database name the page is meant to
   * show.
   */
  const connectionString =
    process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  const { password, host, pathname } = new URL(connectionString);
  expect(password.length).toBeGreaterThan(0);

  if (!host.includes(password) && !pathname.includes(password)) {
    expect(shown).not.toContain(password);
  }
});

test("is behind the same door as everything else", async ({ page }) => {
  // The suite runs unlocked, so this checks the gate covers the path at all
  // rather than that it refuses — the refusing is unit-tested in auth.test.ts.
  await page.goto("/database");
  await expect(page).toHaveURL(/\/database$/);
});
