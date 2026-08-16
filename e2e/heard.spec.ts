import { expect, test } from "@playwright/test";
import {
  addArtist,
  loadAllTracks,
  openArtist,
  resetDatabase,
  resetPreferences,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await resetPreferences(page);
});

/**
 * The release-wide toggle, as opposed to the per-song ones further down the
 * page. Song buttons name their song, so an exact match reaches only this one.
 */
function releaseToggle(page: import("@playwright/test").Page, name: string) {
  return page.getByRole("button", { name, exact: true });
}

test("the heard tick sits on the cover, not clipped out of it", async ({ page }) => {
  /*
   * Shipped broken: the wrapper carried both `absolute` and `relative`, and
   * Tailwind emits `relative` last, so it won. The button dropped into normal
   * flow below the artwork, where the cover's overflow-hidden cut it off — the
   * quickest way to tick things off vanished without a trace in the markup.
   */
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const card = page.locator("#to-listen li").first();
  const toggle = card.getByRole("button", { name: /Mark heard|Heard/ });

  const cover = await card.locator("div").first().boundingBox();
  const button = await toggle.boundingBox();
  expect(cover).not.toBeNull();
  expect(button).not.toBeNull();

  // Inside the artwork's box, near its top-right corner.
  expect(button!.y).toBeGreaterThanOrEqual(cover!.y - 1);
  expect(button!.y + button!.height).toBeLessThanOrEqual(cover!.y + cover!.height + 1);
  expect(button!.x).toBeGreaterThan(cover!.x + cover!.width / 2);
});

test("a release can be ticked off from the grid without opening it", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const before = await page.locator("#to-listen li").count();
  await page
    .locator("#to-listen li")
    .first()
    .getByRole("button", { name: /Mark heard|Heard/ })
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#to-listen li")).toHaveCount(before - 1);
});

test("hearing a release means hearing every song on it", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  // Shipped broken: a release could read "heard" and "0 of 12 songs heard" at
  // the same time, which meant ticking off music already listened to.
  await addArtist(page, "Testhead", { heardAlready: false });
  await openArtist(page, "Testhead");

  await loadAllTracks(page);

  await page.getByRole("link", { name: /Releases ·/ }).click();
  await page.getByRole("link", { name: "In Testing" }).click();
  await page.waitForURL(/\/releases\//);

  await expect(page.getByText(/0 of 2 songs heard/)).toBeVisible();
  await releaseToggle(page, "Mark heard").click();

  await expect(page.getByText(/2 of 2 songs heard/)).toBeVisible();
  await expect(releaseToggle(page, "Heard")).toBeVisible();
});

test("un-hearing a release keeps songs heard by way of another release", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  await addArtist(page, "Testhead", { heardAlready: false });
  await openArtist(page, "Testhead");
  const artistUrl = page.url();

  await loadAllTracks(page);

  // The compilation carries the album's two songs plus a remaster of a third.
  await page.goto(artistUrl);
  await page.getByRole("link", { name: "In Testing" }).click();
  await page.waitForURL(/\/releases\//);
  // Anchored to content only this page has: the URL changes before the new
  // page renders, and the artist grid behind it carries toggles with the very
  // same name, so acting too early clicks the wrong record entirely.
  await expect(page.getByText(/0 of 2 songs heard/)).toBeVisible();

  await releaseToggle(page, "Mark heard").click();
  await expect(page.getByText(/2 of 2 songs heard/)).toBeVisible();

  await page.goto(artistUrl);
  await page.getByRole("link", { name: "Very Best Of Testhead" }).click();
  await page.waitForURL(/\/releases\//);
  // Two of its three songs came from the album that was just marked heard.
  await expect(page.getByText(/2 of 3 songs heard/)).toBeVisible();

  await releaseToggle(page, "Mark heard").click();
  await expect(page.getByText(/3 of 3 songs heard/)).toBeVisible();

  // Taking the compilation back off marks the compilation unheard...
  await releaseToggle(page, "Heard").click();
  await expect(releaseToggle(page, "Mark heard")).toBeVisible();

  // ...but must not un-hear the album whose songs it borrowed.
  await page.goto(artistUrl);
  await page.getByRole("link", { name: "In Testing" }).click();
  await page.waitForURL(/\/releases\//);
  // The heading first: waitForURL returns before the new page is on screen.
  await expect(page.getByRole("heading", { name: "In Testing" })).toBeVisible();

  await expect(page.getByText(/2 of 2 songs heard/)).toBeVisible();
  await expect(releaseToggle(page, "Heard")).toBeVisible();
});

test("ticking off the last song completes the release", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  await addArtist(page, "Testhead", { heardAlready: false });
  await openArtist(page, "Testhead");
  await loadAllTracks(page);

  await page.getByRole("link", { name: /Releases ·/ }).click();
  await page.getByRole("link", { name: "Kid T" }).click();
  await page.waitForURL(/\/releases\//);

  // Kid T is a single-track release, so one song finishes it.
  await expect(releaseToggle(page, "Mark heard")).toBeVisible();
  await page.getByRole("button", { name: "Mark Kid Track heard" }).click();

  await expect(releaseToggle(page, "Heard")).toBeVisible();
  await expect(page.getByText(/1 of 1 songs heard/)).toBeVisible();
});

test("songs fetched for an already-heard release count as heard", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * An imported back catalogue is marked heard long before its tracklists
   * arrive. Without this, pressing "load songs" on a decade of favourites
   * would report nothing heard and drag every one of them back into the queue.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");

  await loadAllTracks(page);

  const heading = page.getByText(/\d+ of \d+ heard/);
  await expect(heading).toBeVisible();
  await expect(heading).not.toContainText(/^0 of/);

  // And the queue stays empty rather than refilling.
  await page.goto("/");
  await expect(page.locator("#to-listen li")).toHaveCount(0);
});

test("a release heard before songs existed does not report them unheard", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");

  /*
   * The shape every library imported before the two were tied together is in:
   * releases marked heard sitting over songs marked unheard. A migration
   * repairs what is already stored; this covers the same ground through the
   * app, so the rule can't quietly stop holding.
   */
  await addArtist(page, "Testhead", { heardAlready: true });
  await openArtist(page, "Testhead");
  await loadAllTracks(page);

  // Every song under a heard release reads as heard, without touching anything.
  await expect(page.getByRole("button", { name: /^Mark .+ heard$/ })).toHaveCount(0);

  // And un-ticking a release still un-ticks the songs only it carries.
  await page.getByRole("link", { name: /Releases ·/ }).click();
  await page.getByRole("link", { name: "Testbag EP" }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: "Testbag EP" })).toBeVisible();
  await expect(page.getByText(/1 of 1 songs heard/)).toBeVisible();

  await releaseToggle(page, "Heard").click();
  await expect(page.getByText(/0 of 1 songs heard/)).toBeVisible();
});
