import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences, runSql } from "./helpers";

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

test("pressing a kind leaves you with that kind", async ({ page }) => {
  /*
   * Shipped backwards: the chips took a category away rather than picking it
   * out, so pressing "Singles" showed everything except the single. A filter
   * is pressed to be left with the thing you pressed.
   */
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const queue = page.locator("#to-listen");
  await expect(queue.getByText("Single", { exact: true })).toHaveCount(1);
  await expect(queue.getByText("EP", { exact: true })).toHaveCount(1);

  await chip(page, "Singles").click();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "true");

  // The single, and nothing else.
  await expect(queue.getByText("Single", { exact: true })).toHaveCount(1);
  await expect(queue.getByText("EP", { exact: true })).toHaveCount(0);
  await expect(queue.getByText("Album", { exact: true })).toHaveCount(0);
});

test("nothing pressed means everything", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const queue = page.locator("#to-listen");
  const all = await queue.locator("li").count();
  expect(all).toBeGreaterThan(1);

  // Every chip starts unpressed, and the queue is whole.
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "false");
  await expect(chip(page, "Albums")).toHaveAttribute("aria-pressed", "false");

  // Pressing and unpressing the same chip returns to everything.
  await chip(page, "Singles").click();
  await expect(queue.locator("li")).not.toHaveCount(all);
  await chip(page, "Singles").click();
  await expect(queue.locator("li")).toHaveCount(all);
});

test("several kinds can be picked at once and cleared together", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const queue = page.locator("#to-listen");
  await chip(page, "Singles").click();
  await chip(page, "EPs").click();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "true");
  await expect(chip(page, "EPs")).toHaveAttribute("aria-pressed", "true");

  // Both kinds, and only those two.
  await expect(queue.getByText("Single", { exact: true })).toHaveCount(1);
  await expect(queue.getByText("EP", { exact: true })).toHaveCount(1);
  await expect(queue.getByText("Album", { exact: true })).toHaveCount(0);

  await page.locator("#to-listen").getByRole("button", { name: "Show all" }).click();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "false");
  await expect(chip(page, "EPs")).toHaveAttribute("aria-pressed", "false");
  // Testhead's catalogue carries two albums, both back.
  await expect(queue.getByText("Album", { exact: true })).toHaveCount(2);
});

test("a chip keeps its count after it is pressed", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const singles = chip(page, "Singles");
  const before = await singles.textContent();
  await singles.click();
  // Counts describe the whole queue, not the filtered view, or every other chip
  // would read zero the moment one was pressed.
  await expect(singles).toHaveText(before ?? "");
  await expect(chip(page, "Albums")).not.toHaveText(/\b0$/);
});

test("the filter is remembered across a reload", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  await chip(page, "Singles").click();
  /*
   * Settled before reloading, or the reload races the action that writes the
   * cookie and the test measures nothing. The chip's own state fills in
   * optimistically, so the queue narrowing is what says the server has it.
   */
  await expect(page.locator("#to-listen").getByText("Album", { exact: true })).toHaveCount(0);

  await page.reload();
  await expect(chip(page, "Singles")).toHaveAttribute("aria-pressed", "true");
});

test("picking a kind the queue hasn't got says so rather than looking empty", async ({
  page,
}) => {
  /*
   * Reachable whenever the chosen kind is all heard: the chips are drawn from
   * the whole queue, so one can be pressed and match nothing left in it.
   */
  await addArtist(page, "Test Cinema", { heardAlready: false });
  await page.goto("/");

  const queue = page.locator("#to-listen");
  await chip(page, "Albums").click();
  /*
   * Waiting on the queue rather than on the chip. The chip fills in the moment
   * it is pressed, before the server has been told, so it is no longer proof
   * that the filter has landed — the queue narrowing is.
   */
  await expect(queue.locator("li")).toHaveCount(1);

  // Tick the only album off, and the filter now matches nothing.
  await queue.locator("li").first().getByRole("button", { name: /Mark heard|Heard/ }).click();

  await expect(page.getByText("Nothing in the queue of that kind.")).toBeVisible();
  /*
   * The chip stays, reading nought, because it is the only thing that explains
   * the empty queue. Dropping it once its last release left would strand the
   * filter switched on with nothing on screen switching it off.
   */
  await expect(chip(page, "Albums")).toBeVisible();
  await expect(chip(page, "Albums")).toHaveText(/0$/);

  await chip(page, "Albums").click();
  await expect(queue.locator("li")).not.toHaveCount(0);
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

test("the filter finds an artist the preview never showed", async ({ page }) => {
  /*
   * Shipped broken by the payload work: previewing two rows started sending
   * only two rows, and the filter searches what is on the page. Someone filed
   * under W in a list of two hundred simply could not be found, with nothing to
   * suggest the rest were never there — and pressing "Show all" first is not a
   * filter.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await runSql(`
    INSERT INTO "Artist" (id, name, status, source, "createdAt")
    SELECT 'bulk' || g, 'Filler ' || g, 'ACTIVE', 'manual', now()
    FROM generate_series(1, 30) g
  `);
  // Sorts last, so the two-row preview cannot be showing it.
  await runSql(`
    INSERT INTO "Artist" (id, name, status, source, "createdAt")
    VALUES ('zed', 'Wanted Group', 'ACTIVE', 'manual', now())
  `);

  await page.goto("/");
  const following = page.locator("#following");

  // Out of sight to begin with, as the preview intends.
  await expect(following.getByRole("link", { name: "Wanted Group" })).toBeHidden();

  await following.getByRole("searchbox", { name: /Filter artists/ }).fill("wanted");

  await expect(following.getByRole("link", { name: "Wanted Group" })).toBeVisible();
  // And it is the only thing left.
  await expect(following.locator("li:visible")).toHaveCount(1);
});

test("the filter works in list view too", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await runSql(`
    INSERT INTO "Artist" (id, name, status, source, "createdAt")
    SELECT 'bulk' || g, 'Filler ' || g, 'ACTIVE', 'manual', now()
    FROM generate_series(1, 30) g
  `);
  await runSql(`
    INSERT INTO "Artist" (id, name, status, source, "createdAt")
    VALUES ('zed', 'Wanted Group', 'ACTIVE', 'manual', now())
  `);

  await page.goto("/");
  const following = page.locator("#following");
  await following.getByRole("button", { name: "List view" }).click();
  await expect(following.locator("ul.panel")).toBeVisible();

  await expect(following.getByRole("link", { name: "Wanted Group" })).toBeHidden();
  await following.getByRole("searchbox", { name: /Filter artists/ }).fill("wanted");
  await expect(following.getByRole("link", { name: "Wanted Group" })).toBeVisible();
});
