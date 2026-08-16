import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

/**
 * The mock provider gives "Testhead" an album (In Testing) and a compilation
 * (Very Best Of Testhead) that reuses the album's songs, plus a remaster of a
 * song from another release. That is the shape this feature exists for.
 */

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await resetPreferences(page);
  await addArtist(page, "Testhead", { heardAlready: false });

  // Pull in every tracklist.
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Testhead" }).first().click();
  await page.waitForURL(/\/artists\//);
  const artistUrl = page.url().split("?")[0];
  await page.goto(`${artistUrl}?tab=songs`);

  // Tracklists arrive a batch at a time; keep pressing until none are left,
  // so the tests below always see the whole discography.
  for (let i = 0; i < 5; i += 1) {
    const load = page.getByRole("button", { name: /Load songs/ });
    if ((await load.count()) === 0) break;
    const before = await page.getByRole("button", { name: /Heard$|Mark heard/ }).count();
    await load.first().click();
    await expect
      .poll(async () => page.getByRole("button", { name: /Heard$|Mark heard/ }).count(), {
        timeout: 30_000,
      })
      .toBeGreaterThan(before);
  }
  await expect(page.getByRole("button", { name: /Load songs/ })).toHaveCount(0);
});

test("hearing a song once counts everywhere it appears", async ({ page }) => {
  const artistUrl = page.url().split("?")[0];
  await page.goto(`${artistUrl}?tab=songs`);

  // This song is on both the album and the compilation.
  const rows = page.locator("li").filter({ hasText: "Test Song One" });
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(1);

  // Every copy starts unheard, and none is heard.
  await expect(rows.getByRole("button", { name: "Heard", exact: true })).toHaveCount(0);

  // Marking one copy marks them all: no copy is left unheard.
  await rows.getByRole("button", { name: "Mark heard" }).first().click();
  await expect(rows.getByRole("button", { name: "Mark heard" })).toHaveCount(0);
  expect(
    await rows.getByRole("button", { name: "Heard", exact: true }).count(),
  ).toBeGreaterThan(1);
});

test("a repeated song is counted once in the artist's song total", async ({ page }) => {
  const artistUrl = page.url().split("?")[0];
  await page.goto(`${artistUrl}?tab=songs`);

  const tabLabel = await page.getByRole("link", { name: /^Songs/ }).textContent();
  const songCount = Number(tabLabel!.match(/\d+/)![0]);
  const trackRows = await page
    .locator("li")
    .filter({ has: page.getByRole("button", { name: /Heard$|Mark heard/ }) })
    .count();

  // Fewer distinct songs than track rows, because copies fold together.
  expect(songCount).toBeLessThan(trackRows);
});

test("a song appearing on several releases says so", async ({ page }) => {
  const artistUrl = page.url().split("?")[0];
  await page.goto(`${artistUrl}?tab=songs`);
  await expect(page.getByText(/on \d+ releases/).first()).toBeVisible();
});

test("a remaster folds into the original", async ({ page }) => {
  const artistUrl = page.url().split("?")[0];
  await page.goto(`${artistUrl}?tab=songs`);

  // "Kid Track" on its album, "Kid Track (Remastered 2026)" on the compilation.
  // Rows also carry a track number and duration, so match on the title and
  // separate the two by whether the qualifier is present.
  const original = page
    .locator("li")
    .filter({ hasText: "Kid Track" })
    .filter({ hasNotText: "Remastered" })
    .first();
  const remaster = page
    .locator("li")
    .filter({ hasText: "Kid Track (Remastered" })
    .first();
  await expect(original).toBeVisible();
  await expect(remaster).toBeVisible();

  await original.getByRole("button", { name: "Mark heard" }).click();
  await expect(remaster.getByRole("button", { name: "Heard", exact: true })).toBeVisible();
});
