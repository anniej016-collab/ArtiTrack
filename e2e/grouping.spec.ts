import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** The queue's grouping control, which is a row of three. */
function groupBy(page: import("@playwright/test").Page, label: string) {
  return page.locator("#to-listen").getByRole("button", { name: label, exact: true });
}

test("grouping opens folded, as an index rather than the same long list", async ({
  page,
}) => {
  /*
   * Every group came open, so grouping reprinted the whole queue with headings
   * in it — more scrolling than the ungrouped list it was meant to make
   * navigable, which is the opposite of the point.
   */
  await addArtist(page, "Testhead", { heardAlready: false });
  await addArtist(page, "Test Moscow", { heardAlready: false });

  await page.goto("/");
  const queue = page.locator("#to-listen");
  const ungrouped = await queue.locator("li").count();
  expect(ungrouped).toBeGreaterThan(2);

  await groupBy(page, "By artist").click();

  /*
   * Both artists are named by a heading, and nothing under them is on screen.
   * Checked on what is visible rather than on what exists: a folded <details>
   * keeps its contents in the document, so counting elements would find every
   * card still there and say nothing about what you can actually see.
   */
  const headings = queue.locator("details > summary");
  await expect(headings).toHaveCount(2);
  await expect(headings.filter({ hasText: "Testhead" })).toBeVisible();
  await expect(headings.filter({ hasText: "Test Moscow" })).toBeVisible();

  await expect(queue.locator("details[open]")).toHaveCount(0);
  await expect(queue.locator("li:visible")).toHaveCount(0);
});

test("a group opens on its own, and stays open while you tick things off", async ({
  page,
}) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await groupBy(page, "By artist").click();
  const queue = page.locator("#to-listen");

  const fold = queue.locator("details").first();
  await fold.locator("summary").click();
  await expect(fold).toHaveAttribute("open", "");

  const before = await fold.locator("li").count();
  expect(before).toBeGreaterThan(1);

  // Ticking one off re-renders the page from the server; the fold must survive
  // that, or every mark closes the group you are working through.
  await fold.locator("li").first().getByRole("button", { name: /Mark heard|Heard/ }).click();
  await expect(fold.locator("li")).toHaveCount(before - 1);
  await expect(fold).toHaveAttribute("open", "");
});

test("grouping by date folds too", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await groupBy(page, "By date").click();

  const queue = page.locator("#to-listen");
  await expect(queue.locator("details")).not.toHaveCount(0);
  await expect(queue.locator("details[open]")).toHaveCount(0);
});
