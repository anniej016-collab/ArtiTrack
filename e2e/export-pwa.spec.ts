import { expect, test } from "@playwright/test";
import { addArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

test("the export contains the library and the listening state", async ({
  page,
  request,
}) => {
  await addArtist(page, "Testhead", { heardAlready: true });

  const response = await request.get("/api/export");
  expect(response.status()).toBe(200);
  // Offered as a file rather than displayed, so it can actually be kept.
  expect(response.headers()["content-disposition"]).toContain("attachment");
  expect(response.headers()["content-disposition"]).toContain(".json");

  const body = await response.json();
  expect(body.format).toBe("artitrack-export-v1");
  expect(body.artistCount).toBe(1);

  const artist = body.artists[0];
  expect(artist.name).toBe("Testhead");
  expect(artist.status).toBe("ACTIVE");
  expect(artist.releases.length).toBeGreaterThan(0);

  // The part that cannot be re-fetched from anywhere is present.
  expect(artist.releases.every((r: { listened: boolean }) => r.listened)).toBe(true);
});

test("the download link is reachable from the app", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Download my data" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/api/export");
});

test("the app declares itself installable", async ({ page, request }) => {
  await page.goto("/");
  // Next serves the manifest at a fixed path; the page must point at it.
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);

  const body = await manifest.json();
  expect(body.name).toBe("ArtiTrack");
  // "standalone" is what opens it without browser chrome.
  expect(body.display).toBe("standalone");
  expect(body.start_url).toBe("/");
  expect(body.icons.length).toBeGreaterThan(0);

  const icon = await request.get(body.icons[0].src);
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/png");
});
