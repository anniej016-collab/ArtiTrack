import { expect, test } from "@playwright/test";
import { addArtist, openArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

test("an artist the main source doesn't carry is still findable", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[name="query"]', "Obscure Test");
  await page.getByRole("button", { name: "Search" }).click();

  // Both mock MusicBrainz artists match, and none of the Deezer ones do.
  await expect(page.getByText("Obscure Test Collective")).toBeVisible();
  await expect(page.getByText(/come from MusicBrainz instead/)).toBeVisible();
});

test("searching the main source doesn't mention the fallback", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[name="query"]', "Testhead");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.locator("li").filter({ hasText: "Testhead" }).first()).toBeVisible();
  await expect(page.getByText(/come from MusicBrainz instead/)).toHaveCount(0);
});

test("a fallback artist imports with their releases", async ({ page }) => {
  await addArtist(page, "Obscure Test Collective", { heardAlready: false });
  await openArtist(page, "Obscure Test Collective");

  // Three of the four release groups are usable; the undated one can't be
  // ordered so it is dropped.
  await expect(page.getByText("3 releases")).toBeVisible();
  await expect(page.getByRole("link", { name: /Field Recordings/ })).toBeVisible();
  // A year-only date still lands somewhere sensible rather than being lost.
  await expect(page.getByRole("link", { name: /Early Tapes/ })).toBeVisible();
  await expect(page.getByText("Releases come from MusicBrainz.")).toBeVisible();
});

test("the fallback's releases are honest about having no song lists", async ({
  page,
}) => {
  await addArtist(page, "Obscure Test Collective", { heardAlready: false });
  await openArtist(page, "Obscure Test Collective");

  // Nothing offers to fetch songs that can't be fetched.
  await page.getByRole("link", { name: /^Songs/ }).click();
  await expect(page.getByRole("button", { name: /Load songs/i })).toHaveCount(0);
  // Said both in the provenance line and in the empty song list.
  await expect(page.getByText(/doesn't publish song lists/).first()).toBeVisible();

  await page.getByRole("link", { name: /Releases ·/ }).click();
  await page.getByRole("link", { name: /Field Recordings/ }).click();
  await page.waitForURL(/\/releases\//);
  // Said both in the provenance line and in the empty song list.
  await expect(page.getByText(/doesn't publish song lists/).first()).toBeVisible();
});

test("a fallback artist can still be re-checked for new releases", async ({ page }) => {
  await addArtist(page, "Obscure Test Duo", { heardAlready: true });
  await openArtist(page, "Obscure Test Duo");

  await page.getByRole("button", { name: /Check for new/i }).click();
  await expect(page.getByText(/Last checked/)).toBeVisible();
});
