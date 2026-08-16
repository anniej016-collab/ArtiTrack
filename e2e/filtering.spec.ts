import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

test("the queue can be narrowed to exclude singles", async ({ page }) => {
  // Testhead's catalogue includes a single and an EP alongside the albums.
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const singleBadge = page.locator("#to-listen").getByText("Single", { exact: true });
  await expect(singleBadge.first()).toBeVisible();

  await page.locator("#to-listen").getByRole("button", { name: "No singles" }).click();
  await expect(page.locator("#to-listen").getByText("Single", { exact: true })).toHaveCount(
    0,
  );
  // EPs survive this filter.
  await expect(page.locator("#to-listen").getByText("EP", { exact: true })).toHaveCount(1);

  await page.locator("#to-listen").getByRole("button", { name: "Albums" }).click();
  await expect(page.locator("#to-listen").getByText("EP", { exact: true })).toHaveCount(0);
  await expect(
    page.locator("#to-listen").getByText("Album", { exact: true }).first(),
  ).toBeVisible();
});

test("the queue filter is remembered", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await page.locator("#to-listen").getByRole("button", { name: "Albums" }).click();
  await expect(
    page.locator("#to-listen").getByRole("button", { name: "Albums" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(
    page.locator("#to-listen").getByRole("button", { name: "Albums" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("artists can be filtered by name", async ({ page }) => {
  // Enough artists that the filter is offered at all.
  for (const name of [
    "Testhead",
    "Test Moscow",
    "Test Sault",
    "Test Cinema",
    "Test Orchestra",
  ]) {
    await addArtist(page, name, { heardAlready: true });
  }
  await page.goto("/");

  const filter = page.locator("#following").getByRole("searchbox");
  await expect(filter).toBeVisible();

  await filter.fill("moscow");
  await expect(page.locator("#following-list li:visible")).toHaveCount(1);
  await expect(page.locator("#following-list li:visible")).toContainText("Test Moscow");

  // Clearing brings everyone back, including any the two-row preview had hidden.
  await filter.fill("");
  await expect(page.locator("#following-list li:visible")).toHaveCount(5);
});
