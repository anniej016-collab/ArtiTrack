import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** A chip in the queue's filter row, by the category it names. */
function chip(page: import("@playwright/test").Page, label: string) {
  return page.locator("#to-listen").getByRole("button", { name: new RegExp(`^${label}`) });
}

test("each kind of release gets its own chip, counted", async ({ page }) => {
  // Testhead's catalogue is an album, an EP, a single and a compilation.
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await expect(chip(page, "Albums")).toBeVisible();
  await expect(chip(page, "EPs")).toBeVisible();
  await expect(chip(page, "Singles")).toBeVisible();
  await expect(chip(page, "Compilations")).toBeVisible();
  // Nothing in the catalogue is a soundtrack, so that chip is never offered.
  await expect(chip(page, "Soundtracks")).toHaveCount(0);
});

test("hiding one kind leaves the others alone", async ({ page }) => {
  // The old three-way toggle failed exactly here: "no singles" also dropped
  // compilations and everything else that wasn't an album or an EP.
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const queue = page.locator("#to-listen");
  await expect(queue.getByText("Single", { exact: true })).toHaveCount(1);

  await chip(page, "Singles").click();

  await expect(queue.getByText("Single", { exact: true })).toHaveCount(0);
  // Everything else survives, which is the whole point.
  await expect(chip(page, "EPs")).toHaveAttribute("aria-pressed", "true");
  await expect(chip(page, "Compilations")).toHaveAttribute("aria-pressed", "true");
  await expect(queue.getByText("EP", { exact: true })).toHaveCount(1);
});

test("several kinds can be hidden at once and put back together", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await chip(page, "Singles").click();
  await chip(page, "Compilations").click();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "false");
  await expect(chip(page, "Compilations")).toHaveAttribute("aria-pressed", "false");

  await page.locator("#to-listen").getByRole("button", { name: "Show all" }).click();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "true");
  await expect(chip(page, "Compilations")).toHaveAttribute("aria-pressed", "true");
});

test("a chip keeps its count after it is switched off", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const singles = chip(page, "Singles");
  const before = await singles.textContent();
  await singles.click();
  // Counts describe the queue, not the filtered view, or a chip you turned off
  // would read zero and give you nothing to turn back on.
  await expect(singles).toHaveText(before ?? "");
});

test("the filter is remembered across a reload", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await chip(page, "Singles").click();
  // Settled before reloading, or the reload races the action that writes the
  // cookie and the test measures nothing.
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "false");
});

test("hiding everything says so rather than looking empty", async ({ page }) => {
  // Test Cinema's catalogue is one album and one single, so two clicks empty it.
  await addArtist(page, "Test Cinema", { heardAlready: false });
  await page.goto("/");

  await chip(page, "Albums").click();
  await expect(chip(page, "Albums")).toHaveAttribute("aria-pressed", "false");
  await chip(page, "Singles").click();

  await expect(page.getByText("Nothing left once those kinds are hidden.")).toBeVisible();
  // The way back is still on screen.
  await expect(chip(page, "Albums")).toBeVisible();
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
