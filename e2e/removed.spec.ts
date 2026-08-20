import { expect, test } from "@playwright/test";
import { TEST_CRON_SECRET } from "../playwright.config";
import {
  addArtist,
  openArtist,
  openRelease,
  openReleasesTab,
  resetDatabase,
  resetPreferences,
} from "./helpers";

/**
 * Taking a record off an artist it isn't really by.
 *
 * A service files a various-artists compilation under everyone who appears on
 * it, so an artist's page grows records they played two songs on. Deleting one
 * does not work — the row is what tells the next sync it already knows the
 * release, so a deleted one is back the following night.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

async function removeVeryBestOf(page: import("@playwright/test").Page) {
  await openArtist(page, "Testhead");
  await openReleasesTab(page);
  await openRelease(page, "Very Best Of Testhead");
  await page.getByRole("button", { name: "Not their release" }).click();
  await expect(page.getByRole("button", { name: "Put back" })).toBeVisible();
}

test("a removed release leaves the artist page and the queue", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await openArtist(page, "Testhead");
  const before = await page.locator("a[href^='/releases/']").count();

  await removeVeryBestOf(page);

  await openArtist(page, "Testhead");
  await expect(page.locator("a[href^='/releases/']")).toHaveCount(before - 1);
  await expect(page.getByRole("link", { name: "Very Best Of Testhead" })).toHaveCount(0);

  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("Very Best Of Testhead")).toHaveCount(0);
});

test("it stays removed when the service is checked again", async ({ page, request }) => {
  /*
   * The whole reason this is a mark rather than a delete. A deleted row is one
   * the sync has never heard of, so it adds it back — and nothing records that
   * you ever said otherwise.
   */
  await addArtist(page, "Testhead", { heardAlready: false });
  await removeVeryBestOf(page);

  const response = await request.get("/api/cron/sync", {
    headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
  });
  expect(response.ok()).toBe(true);

  await openArtist(page, "Testhead");
  await expect(page.getByRole("link", { name: "Very Best Of Testhead" })).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("Very Best Of Testhead")).toHaveCount(0);
});

test("the removed list is quiet, closed, and can put a record back", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await removeVeryBestOf(page);
  await openArtist(page, "Testhead");

  // Closed by default: the title is in the document but not on screen.
  const fold = page.locator("details").filter({ hasText: "Removed · 1" });
  await expect(fold).toHaveCount(1);
  await expect(fold.locator("[open]")).toHaveCount(0);
  await expect(page.getByText("Very Best Of Testhead")).toBeHidden();

  await fold.locator("summary").click();
  await expect(page.getByText("Very Best Of Testhead")).toBeVisible();

  await fold.getByRole("button", { name: "Put back" }).click();

  // Back among their releases, and the fold has gone with nothing left in it.
  await expect(page.getByRole("link", { name: "Very Best Of Testhead" })).toBeVisible();
  await expect(page.locator("details").filter({ hasText: "Removed ·" })).toHaveCount(0);
});

test("putting it back keeps everything that was on it", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await openReleasesTab(page);
  await openRelease(page, "Very Best Of Testhead");

  await page.getByRole("button", { name: "Rate 4 out of 5" }).click();
  await expect(page.getByText("4/5")).toBeVisible();

  await page.getByRole("button", { name: "Not their release" }).click();
  await expect(page.getByRole("button", { name: "Put back" })).toBeVisible();
  await page.getByRole("button", { name: "Put back" }).click();

  // Nothing was destroyed: the rating and the heard mark are still there.
  await expect(page.getByText("4/5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Heard", exact: true })).toBeVisible();
});

test("'not their release' is nowhere near the heard tick", async ({ page }) => {
  /*
   * It used to sit one button along from Heard. They are nothing alike: Heard
   * is the thing you came to the page to press, and this says the record isn't
   * the artist's at all. A stray thumb reaching for the first should have no
   * chance of finding the second.
   */
  await addArtist(page, "Testhead", { heardAlready: false });
  await openArtist(page, "Testhead");
  await openReleasesTab(page);
  await openRelease(page, "Very Best Of Testhead");

  // Reads "Mark heard" until it's been ticked, "Heard" after.
  const heard = page.getByRole("button", { name: /^(Heard|Mark heard)$/ });
  const remove = page.getByRole("button", { name: "Not their release" });
  await expect(heard).toBeVisible();

  const heardBox = await heard.boundingBox();
  const removeBox = await remove.boundingBox();
  expect(heardBox).not.toBeNull();
  expect(removeBox).not.toBeNull();

  // Far enough down that reaching it is a decision, not a slip.
  expect(removeBox!.y - heardBox!.y).toBeGreaterThan(300);
});
