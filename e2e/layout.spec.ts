import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences, runSql } from "./helpers";

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

test("following is ordered by name, not by when you added them", async ({ page }) => {
  /*
   * It was recency, on the reasoning that a preview should show whoever you
   * just followed. In use that is worth about a minute, against a list whose
   * every other visit is someone looking up a name they already know.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await addArtist(page, "Test Moscow", { heardAlready: true });

  await page.goto("/");
  const names = await page
    .locator("#following li a[href^='/artists/']")
    .allTextContents();
  expect(names.map((name) => name.trim())).toEqual(["Test Moscow", "Testhead"]);
});

test("paused artists are ordered by name too", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await addArtist(page, "Test Moscow", { heardAlready: true });

  // Pause the alphabetically later one first, so recency and name disagree.
  for (const name of ["Testhead", "Test Moscow"]) {
    await page.goto("/");
    await page.locator("#following").getByRole("link", { name }).first().click();
    await page.waitForURL(/\/artists\//);
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  }

  await page.goto("/");
  const names = await page.locator("#paused li a[href^='/artists/']").allTextContents();
  expect(names.map((name) => name.trim())).toEqual(["Test Moscow", "Testhead"]);
});

test("a preview sends only the cards a preview can show", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * The two-row preview was done purely in CSS, so a queue of two hundred
   * records rendered two hundred cards and hid a hundred and eighty-eight of
   * them. On the real library that was over a megabyte of HTML per page load,
   * nearly all of it display:none. "Show all" is a server action either way, so
   * sending the rest bought nothing at all.
   */
  await addArtist(page, "Testhead", { heardAlready: false });

  await runSql(`
    INSERT INTO "Release" (id, "artistId", title, type, "releaseDate", listened, "setAside", "createdAt")
    SELECT 'bulk' || g, a.id, 'Bulk ' || g, 'ALBUM', now(), false, false, now()
    FROM generate_series(1, 40) g, (SELECT id FROM "Artist" LIMIT 1) a
  `);

  await page.goto("/");

  // What the browser can see is unchanged: still two rows.
  const visible = page.locator("#to-listen li:visible");
  await expect(visible).toHaveCount(12);

  // And what the server sent is no more than that.
  await expect(page.locator("#to-listen li")).toHaveCount(12);

  // Expanding is what fetches the rest.
  await page.getByRole("button", { name: /^Show all/ }).first().click();
  await expect
    .poll(async () => page.locator("#to-listen li").count())
    .toBeGreaterThan(12);
});

test("a lowercase name sits under its own letter, not after everyone", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * Shipped broken: ordering was left to the database, which under the C
   * collation compares byte values — every capital sorts before every
   * lowercase letter, so Z came before a. A follow list of mostly capitalised
   * names dumped "aespa" and "twice" in a clump at the end, nowhere near the
   * letter they start with.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await runSql(`
    INSERT INTO "Artist" (id, name, status, source, "createdAt")
    VALUES ('lower1', 'aespa', 'ACTIVE', 'manual', now()),
           ('lower2', 'twice', 'ACTIVE', 'manual', now()),
           ('upper1', 'Zara', 'ACTIVE', 'manual', now())
  `);

  await page.goto("/");
  const names = await page
    .locator("#following li a[href^='/artists/']")
    .allTextContents();

  expect(names.map((name) => name.trim())).toEqual([
    "aespa",
    "Testhead",
    "twice",
    "Zara",
  ]);
});
