import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  // Editing is form behaviour, not layout, so one profile is enough.
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
  await addArtist(page, "Testhead", { heardAlready: false });
});

/** Opens the first release in the queue. */
async function openFirstRelease(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator("#to-listen a[href^='/releases/']").first().click();
  await page.waitForURL(/\/releases\//);
}

test("a release can be renamed and its notes kept", async ({ page }) => {
  await openFirstRelease(page);

  await page.getByText("Edit this release").click();
  await page.fill('input[name="title"]', "Renamed By Hand");
  await page.fill('textarea[name="notes"]', "Second half is the good half.");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { name: "Renamed By Hand" })).toBeVisible();
  // The note shows as text; the textarea also holds it, so target the paragraph.
  await expect(
    page.getByRole("paragraph").filter({ hasText: "Second half is the good half." }),
  ).toBeVisible();

  // And it survives a reload rather than only living on screen.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Renamed By Hand" })).toBeVisible();
});

test("a release can be rated, and the same star clears it", async ({ page }) => {
  await openFirstRelease(page);

  await page.getByRole("button", { name: "Rate 4 out of 5" }).click();
  await expect(page.getByText("4/5")).toBeVisible();

  // Pressing the current rating again removes it.
  await page.getByRole("button", { name: "Clear rating" }).click();
  await expect(page.getByText("4/5")).toHaveCount(0);
});

test("a single release can be deleted without touching the artist", async ({ page }) => {
  await page.goto("/");
  const before = await page.locator("#to-listen li").count();

  await openFirstRelease(page);
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByText("Edit this release").click();
  await page.getByRole("button", { name: "Delete this release" }).click();

  // Back on the artist, who is still there.
  await page.waitForURL(/\/artists\//);
  await expect(page.getByRole("heading", { name: "Testhead" })).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#to-listen li")).toHaveCount(before - 1);
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});

test("notes can be kept against an artist", async ({ page }) => {
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Testhead" }).first().click();
  await page.waitForURL(/\/artists\//);

  // The summary reads "› Notes", so match the element rather than exact text.
  await page.locator("summary").filter({ hasText: "Notes" }).click();
  await page.fill('textarea[name="notes"]', "Saw them in 2019, still owe them a listen.");
  await page.getByRole("button", { name: "Save notes" }).click();

  await page.reload();
  await expect(page.locator('textarea[name="notes"]')).toHaveValue(
    "Saw them in 2019, still owe them a listen.",
  );
});
