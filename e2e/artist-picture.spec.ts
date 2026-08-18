import { expect, test } from "@playwright/test";
import { MOCK_PORT, TEST_CRON_SECRET } from "../playwright.config";
import { addArtist, openArtist, resetDatabase, resetPreferences } from "./helpers";

/**
 * Artist photos go stale: a group changes their picture on the service and the
 * tracker keeps the one it took the day you followed them.
 *
 * Refreshing it is deliberately tied to pressing "check for new" on one
 * artist's page, and deliberately kept out of the nightly sweep — a library
 * that quietly looks different every morning is unsettling rather than helpful,
 * and it would cost an extra request per artist on the run that can least
 * afford one.
 */

const DEEZER_TESTHEAD = 399;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** Tells the stand-in provider that this artist has changed their photo. */
async function changePictureOnTheService(
  request: import("@playwright/test").APIRequestContext,
) {
  const response = await request.get(
    `http://127.0.0.1:${MOCK_PORT}/control/new-picture/${DEEZER_TESTHEAD}`,
  );
  expect(response.ok()).toBe(true);
}

function updatedPicture(page: import("@playwright/test").Page) {
  return page.locator(`img[src*="updated-${DEEZER_TESTHEAD}"]`);
}

test("checking an artist picks up their new photo", async ({ page, request }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await expect(updatedPicture(page)).toHaveCount(0);

  await changePictureOnTheService(request);

  await page.getByRole("button", { name: /Check for new/ }).click();
  await expect(updatedPicture(page).first()).toBeVisible();
});

test("the nightly sync leaves photos alone", async ({ page, request }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await changePictureOnTheService(request);

  const response = await request.get("/api/cron/sync", {
    headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
  });
  expect(response.ok()).toBe(true);

  await openArtist(page, "Testhead");
  await expect(updatedPicture(page)).toHaveCount(0);
});

test("a photo you chose yourself is never overwritten", async ({ page, request }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  await page.getByText("Edit name or photo").click();
  await page.fill('input[name="imageUrl"]', "https://example.test/mine.jpg");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('img[src="https://example.test/mine.jpg"]').first()).toBeAttached();

  await changePictureOnTheService(request);
  await page.getByRole("button", { name: /Check for new/ }).click();

  await expect(updatedPicture(page)).toHaveCount(0);
  await expect(page.locator('img[src="https://example.test/mine.jpg"]').first()).toBeAttached();
});
