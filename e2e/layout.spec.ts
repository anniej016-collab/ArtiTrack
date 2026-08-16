import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await resetPreferences(page);
});

test("each section keeps its own layout", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page.locator("#to-listen").getByRole("button", { name: "List view" }).click();
  await expect(page.locator("#to-listen ul.panel")).toBeVisible();

  // Following was never touched, so it must still be cards.
  await expect(page.locator("#following li img").first()).toBeVisible();
  // And the queue must have no artwork.
  await expect(page.locator("#to-listen img")).toHaveCount(0);
});

test("layout and section state survive a reload", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page.locator("#following").getByRole("button", { name: "List view" }).click();
  await expect(page.locator("#following ul.panel")).toBeVisible();

  await page.reload();
  await expect(page.locator("#following ul.panel")).toBeVisible();
});

test("a section can be collapsed and stays collapsed", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await expect(page.locator("#to-listen li").first()).toBeVisible();

  await page
    .locator("#to-listen")
    .getByRole("button", { name: /Collapse To listen/ })
    .click();
  await expect(page.locator("#to-listen li")).toHaveCount(0);
  // The heading stays, so it can be brought back.
  await expect(page.locator("#to-listen h2")).toBeVisible();

  await page.reload();
  await expect(page.locator("#to-listen li")).toHaveCount(0);

  await page
    .locator("#to-listen")
    .getByRole("button", { name: /Expand To listen/ })
    .click();
  await expect(page.locator("#to-listen li").first()).toBeVisible();
});

test("a card preview shows exactly two rows", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "measured at one known width");

  // Three artists is enough to overflow two rows at the narrowest column count.
  await addArtist(page, "Testhead", { heardAlready: false });
  await addArtist(page, "Test Moscow", { heardAlready: false });
  await addArtist(page, "Test Sault", { heardAlready: false });

  // 3 columns below sm, so two rows is six tiles.
  await page.setViewportSize({ width: 500, height: 900 });
  await page.goto("/");

  const rowCount = await page.evaluate(() => {
    const tops = [...document.querySelectorAll("#to-listen li")]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => Math.round(el.getBoundingClientRect().top));
    return new Set(tops).size;
  });
  expect(rowCount).toBe(2);
  await expect(page.locator("#to-listen li:visible")).toHaveCount(6);

  // Show all reveals the rest.
  await page.locator("#to-listen").getByRole("button", { name: /Show all/ }).click();
  // Wait for the expanded state to land before counting, or the old markup is measured.
  await expect(
    page.locator("#to-listen").getByRole("button", { name: /Show less/ }),
  ).toBeVisible();
  expect(await page.locator("#to-listen li:visible").count()).toBeGreaterThan(6);
});

test("following is ordered by most recently added", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await addArtist(page, "Test Moscow", { heardAlready: true });

  await page.goto("/");
  const names = await page
    .locator("#following li a[href^='/artists/']")
    .allTextContents();
  expect(names[0].trim()).toBe("Test Moscow");
});
