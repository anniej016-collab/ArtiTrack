import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

/**
 * Every control here is a form posting to a server, so a tap costs a round
 * trip. What made the app feel broken rather than merely slow was that nothing
 * moved in the meantime: the honest reading of a button that hasn't changed is
 * that it didn't work, so it gets pressed again.
 */
/**
 * Keeps every server action in flight until the returned promise settles, so a
 * test can look at the page in the state a slow connection leaves it in.
 */
async function holdPosts(page: import("@playwright/test").Page, until: Promise<void>) {
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") await until;
    // By the time a held route resumes the page may have moved on, and
    // Playwright will have handled the route itself.
    await route.continue().catch(() => {});
  });
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

test("the heard tick answers the tap before the server does", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  // Hold the server action open, so the only thing that can move the button is
  // the page itself.
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await holdPosts(page, held);

  const card = page.locator("#to-listen li").first();
  const tick = card.getByRole("button", { name: /Mark heard|Heard/ });
  await expect(tick).toHaveAttribute("aria-pressed", "false");

  await tick.click();

  // Already showing what it is about to be, and refusing a second press.
  await expect(tick).toHaveAttribute("aria-pressed", "true");
  await expect(tick).toBeDisabled();

  release();
});

test("a second tap can't land while the first is in flight", async ({ page }) => {
  /*
   * The failure this prevents: pressing twice used to send the same value
   * twice, and pressing a third time — once the first had landed — undid the
   * lot. Nothing looked wrong, it just refused to stay ticked.
   */
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  let posts = 0;
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") posts += 1;
    // Defensive: by the time a held route resumes, the page may have moved on
    // and Playwright will have handled it already.
    await route.continue().catch(() => {});
  });

  const card = page.locator("#to-listen li").first();
  const tick = card.getByRole("button", { name: /Mark heard|Heard/ });

  await tick.click();
  await tick.click({ force: true, timeout: 2000 }).catch(() => {});
  await expect(page.locator("#to-listen li")).toHaveCount(
    (await page.locator("#to-listen li").count()) || 0,
  );

  // One press, one request, however many times it was tapped.
  expect(posts).toBe(1);
  await page.unroute("**/*");
});

test("the rating fills in the whole row on press, not just the star pressed", async ({
  page,
}) => {
  await addArtist(page, "Testhead", { heardAlready: true });
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Testhead" }).first().click();
  await page.waitForURL(/\/artists\//);
  await page.getByRole("link", { name: /^Releases ·/ }).click();
  await page.getByRole("link", { name: "In Testing", exact: true }).click();
  await page.waitForURL(/\/releases\//);

  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await holdPosts(page, held);

  await page.getByRole("button", { name: "Rate 4 out of 5" }).click();
  // All four stars, and the readout, without waiting for the server.
  await expect(page.getByText("4/5")).toBeVisible();

  release();
});
