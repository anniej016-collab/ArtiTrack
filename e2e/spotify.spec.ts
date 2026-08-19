import { expect, test } from "@playwright/test";
import { addArtist, openArtist, resetDatabase, resetPreferences, runSql } from "./helpers";

/**
 * Spotify leads the search, and an artist can be moved onto it afterwards.
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

test("searching finds artists through Spotify first", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[name="query"]', "Testhead");
  await page.getByRole("button", { name: "Search" }).click();

  const row = page.locator("li").filter({ hasText: "Testhead" }).first();
  await expect(row).toBeVisible();

  // The stand-in serves a different picture per service, which is how the test
  // can tell which one answered.
  await expect(row.locator('img[src*="spotify-"]')).toBeVisible();
});

test("an artist added through Spotify syncs from it", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  await expect(page.getByText(/Releases come from Spotify/)).toBeVisible();
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
   * Force the artist back onto Deezer the way the link control does, then let a
   * check run. Deezer's ids for these records differ from Spotify's, so only
   * matching on title and year can recognise them.
   */
  await runSql(
    `UPDATE "Artist" SET "syncSource" = 'deezer', "syncExternalId" = '399' WHERE name = 'Testhead'`,
  );
  await runSql(`UPDATE "Release" SET "externalId" = NULL WHERE "externalId" IS NOT NULL`);

  await page.reload();
  await page.getByRole("button", { name: /Check for new/ }).click();
  await expect(page.getByText(/Releases come from Deezer/)).toBeVisible();

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
  await runSql(
    `UPDATE "Artist" SET "syncSource" = 'deezer', "syncExternalId" = '399' WHERE name = 'Testhead'`,
  );

  await openArtist(page, "Testhead");
  await expect(page.getByText(/Releases come from Deezer/)).toBeVisible();
  const before = await page.locator("a[href^='/releases/']").count();
  expect(before).toBeGreaterThan(2);

  await page.getByRole("button", { name: /Check a different service/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();

  // On Spotify now, with one copy of the catalogue and the heard marks intact.
  await expect(page.getByText(/Releases come from Spotify/)).toBeVisible();
  await expect(page.locator("a[href^='/releases/']")).toHaveCount(before);
  await page.goto("/");
  await expect(page.locator("#following").getByText("Testhead")).toHaveCount(1);
  await expect(page.locator("#to-listen li")).toHaveCount(0);
});
