import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

/**
 * Clicks a row somewhere that carries no control of its own — the gap between
 * the text and the button on the right. That gap is exactly what used to be
 * dead, so it is the point worth asserting on.
 */
async function clickDeadSpace(page: Page, row: Locator) {
  const rowBox = (await row.boundingBox())!;
  const button = row.getByRole("button").first();
  const buttonBox = await button.boundingBox();
  const x = buttonBox ? buttonBox.x - 12 : rowBox.x + rowBox.width * 0.7;
  await page.mouse.click(x, rowBox.y + rowBox.height / 2);
}

/**
 * Each test here corresponds to a bug that actually shipped. They are the
 * reason this suite exists: every one is a browser behaviour that unit tests
 * cannot see.
 */

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await resetPreferences(page);
});

test("the whole artist row is tappable in list view, not just the name", async ({
  page,
}) => {
  // Shipped broken: the link wrapped only the name, about 7% of the row, so
  // tapping a row did nothing and it looked like list view was broken.
  await addArtist(page, "Testhead", { heardAlready: true });

  await page.goto("/");
  await page.locator("#following").getByRole("button", { name: "List view" }).click();
  await expect(page.locator("#following ul.panel")).toBeVisible();

  const row = page.locator("#following li").first();
  await clickDeadSpace(page, row);

  await page.waitForURL(/\/artists\//);
});

test("the whole release row opens the release in list view", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page.locator("#to-listen").getByRole("button", { name: "List view" }).click();
  await expect(page.locator("#to-listen ul.panel")).toBeVisible();

  const row = page.locator("#to-listen li").first();
  await clickDeadSpace(page, row);

  await page.waitForURL(/\/releases\//);
});

test("the heard toggle still toggles instead of opening the release", async ({
  page,
}) => {
  // The stretched link covers the row, so the controls on top of it must win.
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page.locator("#to-listen").getByRole("button", { name: "List view" }).click();
  await expect(page.locator("#to-listen ul.panel")).toBeVisible();

  const before = await page.locator("#to-listen li").count();
  await page
    .locator("#to-listen li")
    .first()
    .getByRole("button", { name: "Mark heard" })
    .click();

  // Stayed put, and the release left the queue: the button acted, not the link.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#to-listen li")).toHaveCount(before - 1);
});

test("search results survive adding the first artist", async ({ page }) => {
  // Adding the first artist flips the page out of its empty state. The search
  // sits above that change and must not be disturbed by it, or you lose the
  // results you were still working through.
  await page.goto("/");
  await page.fill('input[name="query"]', "test");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator("li").filter({ hasText: "Testhead" })).toBeVisible();

  const first = page.locator("li").filter({ hasText: "Testhead" }).first();
  await first.getByRole("button", { name: "Add" }).click();
  await first.getByText("Added").waitFor();

  // The other results must still be there to add.
  await expect(
    page.locator("li").filter({ hasText: "Test Moscow" }).getByRole("button", {
      name: "Add",
    }),
  ).toBeVisible();
});

test("the 'heard already' choice is reachable on a phone", async ({ page }, testInfo) => {
  // Shipped broken: hidden below the sm breakpoint but still defaulting to
  // checked, so on a phone every import silently marked the catalogue heard.
  test.skip(testInfo.project.name !== "phone", "phone-only concern");

  await page.goto("/");
  await page.fill('input[name="query"]', "Testhead");
  await page.getByRole("button", { name: "Search" }).click();

  const row = page.locator("li").filter({ hasText: "Testhead" }).first();
  await expect(row.locator('input[name="markListened"]')).toBeVisible();
  await row.locator('input[name="markListened"]').uncheck();
  await expect(row.locator('input[name="markListened"]')).not.toBeChecked();
});

test("an imported back catalogue is heard but carries no date", async ({ page }) => {
  // Shipped broken: the import stamped listenedAt with the import time, so a
  // decade of music claimed to have been listened to today.
  await addArtist(page, "Testhead", { heardAlready: true });

  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Testhead" }).first().click();
  await page.waitForURL(/\/artists\//);

  // Every release came in marked heard.
  await expect(
    page.getByRole("button", { name: "Heard", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark heard" })).toHaveCount(0);
  // But no "Heard <date>" anywhere, because the date is genuinely unknown.
  await expect(page.getByText(/^Heard \w+ \d+, \d{4}$/)).toHaveCount(0);
});

test("marking something heard now does record the date", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Testhead" }).first().click();
  await page.waitForURL(/\/artists\//);

  await page.getByRole("button", { name: "Mark heard" }).first().click();
  await expect(page.getByText(/^Heard \w+ \d+, \d{4}$/).first()).toBeVisible();
});
