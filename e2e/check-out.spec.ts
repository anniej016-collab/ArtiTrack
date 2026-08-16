import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/**
 * The paste box sits in a <details> that starts open only while the list is
 * empty, so whether it needs opening depends on what's already there.
 */
async function openPaste(page: import("@playwright/test").Page) {
  const box = page.locator('textarea[name="lines"]');
  if (!(await box.isVisible())) {
    await page.locator("summary").filter({ hasText: "Paste a playlist" }).click();
  }
  await expect(box).toBeVisible();
}

test("the list is reachable from anywhere and starts empty", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Check out" }).click();
  await page.waitForURL(/\/check-out/);

  await expect(page.getByRole("heading", { name: "Check out", level: 1 })).toBeVisible();
  await expect(page.getByText("Nothing on the list yet.")).toBeVisible();
});

test("something can be added, ticked off and removed", async ({ page }) => {
  await page.goto("/check-out");

  await page.fill('input[name="artistName"]', "Nala Sinephro");
  await page.fill('input[name="title"]', "Space 1.8");
  await page.fill('input[name="note"]', "Recommended by a friend");
  await page.getByRole("button", { name: "Add to the list" }).click();

  await expect(page.getByText("Space 1.8")).toBeVisible();
  await expect(page.getByText(/Nala Sinephro.*Recommended by a friend/)).toBeVisible();
  await expect(page.getByText("To hear · 1")).toBeVisible();

  await page.getByRole("button", { name: "Mark Space 1.8 heard" }).click();
  await expect(page.getByText("Heard · 1")).toBeVisible();
  await expect(page.getByText("To hear · 1")).toHaveCount(0);

  await page.getByRole("button", { name: "Remove Space 1.8" }).click();
  await expect(page.getByText("Nothing on the list yet.")).toBeVisible();
});

test("a whole playlist can be pasted in", async ({ page }) => {
  await page.goto("/check-out");

  await openPaste(page);
  await page.fill(
    'textarea[name="lines"]',
    "1. Sampha - Spirit 2.0 3:45\nYaya Bey - Karma Don't Wait\nNala Sinephro",
  );
  await page.getByRole("button", { name: "Add them all" }).click();

  await expect(page.getByText("To hear · 3")).toBeVisible();
  await expect(page.getByText("Spirit 2.0")).toBeVisible();
  // A line with no dash is the artist on their own.
  await expect(page.getByText("Nala Sinephro", { exact: true })).toBeVisible();
});

test("pasting an updated playlist adds only what is new", async ({ page }) => {
  await page.goto("/check-out");
  await openPaste(page);

  await page.fill('textarea[name="lines"]', "Sampha - Spirit 2.0\nYaya Bey - Karma");
  await page.getByRole("button", { name: "Add them all" }).click();
  await expect(page.getByText("To hear · 2")).toBeVisible();

  // The same list with one more on the end.
  await openPaste(page);
  await page.fill(
    'textarea[name="lines"]',
    "Sampha - Spirit 2.0\nYaya Bey - Karma\nNala Sinephro - Space 1.8",
  );
  await page.getByRole("button", { name: "Add them all" }).click();

  await expect(page.getByText("To hear · 3")).toBeVisible();
});

test("everything heard can be cleared in one go", async ({ page }) => {
  await page.goto("/check-out");
  await openPaste(page);
  await page.fill('textarea[name="lines"]', "Sampha - Spirit 2.0\nYaya Bey - Karma");
  await page.getByRole("button", { name: "Add them all" }).click();

  await page.getByRole("button", { name: "Mark Spirit 2.0 heard" }).click();
  await expect(page.getByText("Heard · 1")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear these" }).click();

  await expect(page.getByText("Heard · 1")).toHaveCount(0);
  await expect(page.getByText("To hear · 1")).toBeVisible();
});

test("Follow hands the name to the tracker's own search", async ({ page }) => {
  await page.goto("/check-out");
  await page.fill('input[name="artistName"]', "Testhead");
  await page.getByRole("button", { name: "Add to the list" }).click();

  await page.getByRole("link", { name: "Follow" }).click();
  await page.waitForURL(/\/\?q=/);

  // Landed on the library with the search filled in, ready to go.
  await expect(page.locator('input[name="query"]')).toHaveValue("Testhead");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator("li").filter({ hasText: "Testhead" }).first()).toBeVisible();
});

test("the check-out list stays out of the To listen queue", async ({ page }) => {
  // The whole reason it is a separate list: nothing here is a commitment.
  await addArtist(page, "Test Sault", { heardAlready: false });

  await page.goto("/check-out");
  await page.fill('input[name="artistName"]', "Someone Else");
  await page.fill('input[name="title"]', "Some Record");
  await page.getByRole("button", { name: "Add to the list" }).click();
  await expect(page.getByText("Some Record")).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("Some Record")).toHaveCount(0);
  await expect(page.locator("#following").getByText("Someone Else")).toHaveCount(0);
});

test("the export carries the check-out list too", async ({ page }) => {
  await page.goto("/check-out");
  await page.fill('input[name="artistName"]', "Nala Sinephro");
  await page.fill('input[name="title"]', "Space 1.8");
  await page.getByRole("button", { name: "Add to the list" }).click();
  await expect(page.getByText("Space 1.8")).toBeVisible();

  const response = await page.request.get("/api/export");
  const body = await response.json();

  expect(body.checkOut).toEqual([
    expect.objectContaining({
      artistName: "Nala Sinephro",
      title: "Space 1.8",
      heard: false,
    }),
  ]);
});
