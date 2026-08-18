import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import {
  addArtist,
  openArtist,
  openRelease,
  openReleasesTab,
  resetDatabase,
  resetPreferences,
  runSql,
} from "./helpers";

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

test("adding an artist closes the search instead of leaving it open", async ({
  page,
}) => {
  /*
   * This once asserted the opposite. The original bug was the results list
   * disappearing on its own when adding the first artist flipped the page out
   * of its empty state — a change happening *to* the search rather than
   * because of it. Deliberately clearing it once an artist is in is a
   * different thing: the query has been answered, and leaving the box filled
   * meant emptying it by hand before anything else could be done.
   */
  await page.goto("/");
  await page.fill('input[name="query"]', "test");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator("li").filter({ hasText: "Testhead" })).toBeVisible();

  await page
    .locator("li")
    .filter({ hasText: "Testhead" })
    .first()
    .getByRole("button", { name: "Add" })
    .click();

  await expect(page.getByText("Added Testhead.")).toBeVisible();
  // The list is gone and the box is empty, ready for the next search.
  await expect(page.locator("li").filter({ hasText: "Test Moscow" })).toHaveCount(0);
  await expect(page.locator('input[name="query"]')).toHaveValue("");
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

test("re-ticking a release you un-ticked by accident doesn't call it a new listen", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * Shipped broken: un-marking a release cleared listenedAt along with the
   * flag, so the date you heard it was destroyed by the un-tick and re-ticking
   * stamped today. A record heard years ago reappeared at the top of "Recently
   * listened", which is the one section that is supposed to mean something.
   */
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page
    .locator("#to-listen li")
    .first()
    .getByRole("button", { name: /Mark heard|Heard/ })
    .click();

  // Wait for the mark to be committed before reaching past the app to change
  // it. Under a loaded dev server the action can still be in flight here, and
  // then the backdate below matches no rows and the test fails describing a
  // bug that isn't there.
  await expect(page.locator("#recently-listened li")).toHaveCount(1);

  // Backdate it: the only button available stamps today, and the bug is about
  // what happens to a date from long ago.
  await runSql(
    `UPDATE "Release" SET "listenedAt" = TIMESTAMP '2020-03-04 12:00:00' WHERE listened = true`,
  );

  // A hard reload, not a client navigation: the date went in behind the app's
  // back, so nothing has told Next to drop what it already rendered.
  await openArtist(page, "Testhead");
  const artistUrl = page.url();
  await page.reload();
  await expect(page.getByText("Heard Mar 4, 2020").first()).toBeVisible();

  await openReleasesTab(page);
  const heardBefore = await page.getByText("Heard Mar 4, 2020").count();
  await openRelease(page, "In Testing");

  await page.getByRole("button", { name: "Heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Heard", exact: true })).toBeVisible();

  // The original date is back, not today's.
  await page.goto(artistUrl);
  await expect(page.getByText("Heard Mar 4, 2020")).toHaveCount(heardBefore);
});

test("an un-ticked release drops out of Recently listened", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * Shipped broken alongside the above: the section asked only for a date, not
   * for the release still being heard. Once the date stopped being erased, a
   * release you had taken back off sat there as a recent listen.
   */
  await addArtist(page, "Testhead", { heardAlready: false });

  await page.goto("/");
  await page
    .locator("#to-listen li")
    .first()
    .getByRole("button", { name: /Mark heard|Heard/ })
    .click();

  const recent = page.locator("#recently-listened li");
  await expect(recent).toHaveCount(1);
  const title = await recent.first().locator("a").first().innerText();

  await openArtist(page, "Testhead");
  await openReleasesTab(page);
  await openRelease(page, title);
  await page.getByRole("button", { name: "Heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#recently-listened li")).toHaveCount(0);
});

test("undoing a mistap on an imported record doesn't invent a listen", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * Shipped half-fixed, which was worse than obvious.
   *
   * Keeping the date across an un-tick only helps a release that had one. An
   * imported back catalogue is marked heard with *no* date on purpose — the
   * import day says nothing about when the music was heard — so a mistap had no
   * date to restore and re-ticking invented today's, putting a decade-old
   * record at the top of "Recently listened". Which is the complaint the first
   * fix was supposed to answer.
   */
  await addArtist(page, "Testhead", { heardAlready: true });

  await page.goto("/");
  await expect(page.locator("#recently-listened li")).toHaveCount(0);

  await openArtist(page, "Testhead");
  await openReleasesTab(page);
  await openRelease(page, "In Testing");

  await page.getByRole("button", { name: "Heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Heard", exact: true })).toBeVisible();

  // Undone, not listened to: it goes back to heard-with-no-date.
  await page.goto("/");
  await expect(page.locator("#recently-listened li")).toHaveCount(0);
});

test("a real listen after a deliberate un-tick still counts", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * The other side of the same rule, and the reason it is timed rather than
   * absolute: deciding you never really heard something, playing it, and
   * ticking it off is a genuine listen and has to be dated. Only the window
   * separates it from the mistap above.
   */
  await addArtist(page, "Testhead", { heardAlready: true });

  await openArtist(page, "Testhead");
  await openReleasesTab(page);
  await openRelease(page, "In Testing");

  await page.getByRole("button", { name: "Heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();

  // Age the un-tick past the window, which is the one thing a test can't wait for.
  await runSql(
    `UPDATE "Release" SET "unheardAt" = now() - interval '3 hours' WHERE "unheardAt" IS NOT NULL`,
  );

  await page.reload();
  await page.getByRole("button", { name: "Mark heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Heard", exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#recently-listened li")).toHaveCount(1);
});
