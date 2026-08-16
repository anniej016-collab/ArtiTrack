import { expect, test } from "@playwright/test";
import { TEST_CRON_SECRET } from "../playwright.config";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

/**
 * The scheduled sync is what makes following an artist mean anything without
 * pressing a button, so its authentication and its effect are both worth
 * pinning down. These drive the endpoint directly; no browser is involved.
 */

test.describe("scheduled sync endpoint", () => {
  // No browser involved, so there's nothing for a second device profile to add.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "not device-specific");
  });

  test("refuses a request with no credentials", async ({ request }) => {
    const response = await request.get("/api/cron/sync");
    expect(response.status()).toBe(401);
  });

  test("refuses a request with the wrong secret", async ({ request }) => {
    const response = await request.get("/api/cron/sync", {
      headers: { authorization: "Bearer not-the-secret" },
    });
    expect(response.status()).toBe(401);
  });

  test("runs with the right secret and reports what it did", async ({
    page,
    request,
  }) => {
    await resetDatabase();
    await resetPreferences(page);
    await addArtist(page, "Testhead", { heardAlready: true });

    const response = await request.get("/api/cron/sync", {
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.artistsSynced).toBeGreaterThan(0);
    expect(body.failed).toBe(0);
    expect(typeof body.checkedAt).toBe("string");
  });

  test("a paused artist is not checked", async ({ page, request }) => {
    await resetDatabase();
    await resetPreferences(page);
    await addArtist(page, "Testhead", { heardAlready: true });

    await page.goto("/");
    await page
      .locator("#following li")
      .first()
      .getByRole("button", { name: "Pause" })
      .click();
    await expect(page.locator("#paused")).toBeVisible();

    const response = await request.get("/api/cron/sync", {
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    expect((await response.json()).artistsSynced).toBe(0);
  });
});
