import { expect, test } from "@playwright/test";
import { TEST_CRON_SECRET } from "../playwright.config";
import { addArtist, resetDatabase, resetPreferences, runSql } from "./helpers";

/**
 * Telling next week's album apart from a back catalogue you never got round to.
 *
 * The rule is deliberately counted from first sight rather than from arrival:
 * three months away must not age out everything that landed while you were
 * gone, which is exactly when you most want to know.
 */
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** Hides one release, so a later sync rediscovers it as a new arrival. */
async function hideOneRelease(title: string) {
  await runSql(`DELETE FROM "Release" WHERE title = $1`, [title]);
}

test("a back catalogue is never news, however recently it was added", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  // Everything arrived with the artist, so there is nothing to divide.
  await expect(page.locator("#to-listen li")).not.toHaveCount(0);
  await expect(page.getByRole("heading", { name: "New releases" })).toHaveCount(0);
  await expect(page.locator("#to-listen").getByText("New", { exact: true })).toHaveCount(0);
});

test("a release found by a later check is marked new and led with", async ({
  page,
  request,
}) => {
  await addArtist(page, "Testhead", { heardAlready: false });

  // Take one away, then let the nightly check rediscover it: that is exactly
  // the shape of an artist releasing something next week.
  await hideOneRelease("In Testing");
  const response = await request.get("/api/cron/sync", {
    headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
  });
  expect(response.ok()).toBe(true);

  await page.goto("/");

  const queue = page.locator("#to-listen");
  await expect(page.getByRole("heading", { name: "New releases" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Back catalogue" })).toBeVisible();
  await expect(queue.getByText("New", { exact: true })).toHaveCount(1);

  // And it leads: the new one is the first card in the section.
  await expect(queue.locator("li").first()).toContainText("In Testing");
});

test("it stays new while you are away, then ages out a fortnight after you look", async ({
  page,
  request,
}) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await hideOneRelease("In Testing");
  await request.get("/api/cron/sync", {
    headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
  });

  // Arrived three months ago and never seen: still new, which a rule counting
  // from the release's own arrival would get wrong.
  await runSql(
    `UPDATE "Release" SET "arrivedAt" = now() - interval '90 days' WHERE "arrivedAt" IS NOT NULL`,
  );
  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("New", { exact: true })).toHaveCount(1);

  // That visit started its fortnight. Age it past the window.
  await runSql(
    `UPDATE "Release" SET "firstSeenAt" = now() - interval '15 days' WHERE "firstSeenAt" IS NOT NULL`,
  );
  await page.goto("/");

  await expect(page.locator("#to-listen").getByText("New", { exact: true })).toHaveCount(0);
  // And it has dropped out of the group it was leading.
  await expect(page.getByRole("heading", { name: "New releases" })).toHaveCount(0);
});

test("a glance doesn't burn it", async ({ page, request }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await hideOneRelease("In Testing");
  await request.get("/api/cron/sync", {
    headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
  });

  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("New", { exact: true })).toHaveCount(1);

  // Looked at it, went away, came back: still new.
  await page.goto("/check-out");
  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("New", { exact: true })).toHaveCount(1);
});
