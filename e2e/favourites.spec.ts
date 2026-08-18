import { expect, test } from "@playwright/test";
import {
  addArtist,
  loadAllTracks,
  openArtist,
  openRelease,
  openReleasesTab,
  resetDatabase,
  resetPreferences,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await resetPreferences(page);
});

/**
 * The picker's own button, which changes wording once something is picked.
 * Exact, because the release-wide "Add to favourites" sits on the same page.
 */
function pickButton(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /^(Pick|Edit) favourites$/ });
}

function heart(page: import("@playwright/test").Page, song: string) {
  return page.getByRole("button", {
    name: new RegExp(`^(Make ${song} a favourite|${song}, a favourite)`),
  });
}

test("song hearts stay out of the way until you go looking for them", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await loadAllTracks(page);

  await openReleasesTab(page);
  await openRelease(page, "In Testing");

  // Nothing picked, so nothing to see: a tracklist reads as a list of songs.
  await expect(heart(page, "Test Song One")).toBeHidden();

  await pickButton(page).click();
  await expect(heart(page, "Test Song One")).toBeVisible();

  await heart(page, "Test Song One").click();
  await expect(heart(page, "Test Song One")).toHaveAttribute("aria-pressed", "true");

  // Leaving the mode hides the empty ones again, and keeps the picked one.
  await page.getByRole("button", { name: "Done" }).click();
  await expect(heart(page, "Test Song One")).toBeVisible();
  await expect(heart(page, "Test Song Two")).toBeHidden();

  // And it survives a reload, since it is stored rather than remembered.
  await page.reload();
  await expect(heart(page, "Test Song One")).toBeVisible();
  await expect(heart(page, "Test Song Two")).toBeHidden();
});

test("a fourth favourite song can't be picked", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  await addArtist(page, "Test Ensemble", { heardAlready: true });
  await openArtist(page, "Test Ensemble");
  await loadAllTracks(page);

  await openReleasesTab(page);
  await openRelease(page, "Ensemble One");

  await pickButton(page).click();
  for (const song of ["Ensemble I", "Ensemble II", "Ensemble III"]) {
    await heart(page, song).click();
    await expect(heart(page, song)).toHaveAttribute("aria-pressed", "true");
  }

  await expect(page.getByText(/that's the limit/)).toBeVisible();
  await expect(heart(page, "Ensemble IV")).toBeDisabled();

  // Freeing one lets the fourth in, so the limit is a cap and not a lock.
  await heart(page, "Ensemble II").click();
  await expect(heart(page, "Ensemble IV")).toBeEnabled();
});

test("picking mode doesn't shift the rows it appears in", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * The hearts are hidden rather than absent, in a slot that keeps its width.
   * Dropping them out of the layout entirely would make every heard tick jump
   * sideways the moment you started picking.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await loadAllTracks(page);

  await openReleasesTab(page);
  await openRelease(page, "In Testing");

  const tick = page.getByRole("button", { name: "Test Song One, heard" });
  const before = await tick.boundingBox();

  await pickButton(page).click();
  await expect(heart(page, "Test Song One")).toBeVisible();

  const after = await tick.boundingBox();
  expect(after!.x).toBeCloseTo(before!.x, 0);
});

test("favourite releases get their own row on the artist page", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  // No favourites, no shelf.
  await expect(page.getByRole("heading", { name: "Favourites" })).toHaveCount(0);

  await openReleasesTab(page);
  await openRelease(page, "In Testing");
  await page.getByRole("button", { name: "Add to favourites" }).click();
  await expect(page.getByRole("button", { name: "Favourite", exact: true })).toBeVisible();

  await openArtist(page, "Testhead");
  const shelf = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Favourites" }),
  });
  await expect(shelf.getByRole("link", { name: "In Testing", exact: true })).toBeVisible();
});

test("releases can be read in rating order", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  // Nothing rated yet, so there is no ranking to offer.
  await expect(page.getByRole("link", { name: "Best rated" })).toHaveCount(0);

  // Rate the oldest release highest, so date order and rating order differ.
  await openReleasesTab(page);
  await openRelease(page, "Testbag EP");
  await page.getByRole("button", { name: "Rate 5 out of 5" }).click();
  await expect(page.getByText("5/5")).toBeVisible();

  await openArtist(page, "Testhead");
  await page.getByRole("link", { name: "Best rated" }).click();
  await expect(page.getByRole("link", { name: "Best rated" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const titles = page.locator("ul li a[href^='/releases/']");
  await expect(titles.first()).toHaveText("Testbag EP");
});
