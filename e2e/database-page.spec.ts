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

  // Exactly one setting is the one being read. Scoped to the list, because the
  // advice below it mentions the badge by name.
  const settings = page.locator("section").filter({
    has: page.getByRole("heading", { name: "What each setting points at" }),
  });
  await expect(settings.getByText("in use", { exact: true })).toHaveCount(1);

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

test("what it says about the spares matches what it shows", async ({ page }) => {
  /*
   * The verdict said the spare settings were safe to remove while the section
   * naming them only ever appeared for settings pointing at a *different*
   * database — so in the ordinary case, several names for one place, the page
   * promised guidance and then showed none of it. Someone took that at its
   * word and went looking through a hosting dashboard for a box that could not
   * appear.
   */
  await page.goto("/database");

  const shown = await page.locator("body").innerText();
  const promisesRemoval = /safe to remove|removing them is safe/i.test(shown);
  const namesThem = shown.includes("The others");

  expect(promisesRemoval && !namesThem).toBe(false);
});
