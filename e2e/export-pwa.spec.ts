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

test("the install control is there even when no browser prompt is", async ({ page }) => {
  /*
   * Whether a browser offers to install is its own decision, and the rules
   * differ per browser and per device — the same app prompts on one and stays
   * silent on another. The app carries its own control so there is always a
   * way in, and says what to do where it can't do it itself.
   */
  await page.goto("/");

  const install = page.getByRole("button", { name: "Install as an app" });
  await expect(install).toBeVisible();

  await install.click();
  await expect(page.getByText(/Add to Home screen|Add to Home Screen/)).toBeVisible();
});

test("the icon and manifest agree with the app's own colours", async ({ request }) => {
  // The icon is generated so it can't drift from the palette; it drifted once,
  // and stayed on the old violet-and-pink for a whole redesign.
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.theme_color).toBe("#08070d");
  expect(manifest.background_color).toBe("#08070d");
  expect(manifest.display).toBe("standalone");

  // At least one icon big enough for every installability rule that asks.
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes.includes("512x512"))).toBe(true);
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);

  const icon = await request.get("/icon");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/png");
});
