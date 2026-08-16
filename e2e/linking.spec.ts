import { expect, test } from "@playwright/test";
import { resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/**
 * A file holding two of Testhead's records — one the mock provider also lists,
 * under a slightly different date, and one it doesn't know about at all.
 */
const FILE = `<script>
const DATA = [
{d:"2026",ap:true,u:"Testhead",t:"In Testing",ty:"Studio Album",la:"English",m:["Ana"],n:"from the file",tl:[{"t":"Test Song One"},{"t":"Test Song Two"}]},
{d:"2015-01-01",u:"Testhead",t:"Something Only The File Knows",ty:"OST",la:"English",m:["Ana"]},
];
</script>`;

async function importFile(page: import("@playwright/test").Page) {
  await page.goto("/import");
  await page.fill('textarea[name="source"]', FILE);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/Imported 2 releases/)).toBeVisible();
}

async function openTesthead(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Testhead" }).first().click();
  await page.waitForURL(/\/artists\//);
  await expect(page.getByRole("heading", { name: "Testhead", level: 1 })).toBeVisible();
}

test("an imported artist can be pointed at a service and then syncs", async ({ page }) => {
  await importFile(page);
  await openTesthead(page);

  await expect(page.getByText(/Imported from a discography file/)).toBeVisible();
  await page.getByRole("button", { name: /Check for new releases automatically/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();

  // Now watched, and it says where from without becoming a second artist.
  await expect(page.getByText(/checked against Deezer/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Check for new/ })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#following").getByText("Testhead")).toHaveCount(1);
});

test("syncing an imported artist doesn't list the same record twice", async ({ page }) => {
  await importFile(page);
  await openTesthead(page);
  await page.getByRole("button", { name: /Check for new releases automatically/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();
  await expect(page.getByText(/checked against Deezer/)).toBeVisible();

  // The file and the provider both carry "In Testing" — one row, not two.
  await expect(page.getByRole("link", { name: "In Testing" })).toHaveCount(1);

  // The adopted row kept what the file gave it, tracklist included.
  await page.getByRole("link", { name: "In Testing" }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByText("Songs · 2")).toBeVisible();
  // Scoped to the note itself; the editor below holds the same text.
  await expect(page.locator("p", { hasText: "from the file" }).first()).toBeVisible();
});

test("the file's own releases survive a sync that doesn't know them", async ({ page }) => {
  await importFile(page);
  await openTesthead(page);
  await page.getByRole("button", { name: /Check for new releases automatically/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();
  await expect(page.getByText(/checked against Deezer/)).toBeVisible();

  // Deezer has never heard of this one; syncing must not remove it.
  await expect(
    page.getByRole("link", { name: "Something Only The File Knows" }),
  ).toBeVisible();
  // And the provider's own extra releases arrived.
  await expect(page.getByRole("link", { name: "Kid T" })).toBeVisible();
});

test("re-importing after linking still doesn't duplicate", async ({ page }) => {
  await importFile(page);
  await openTesthead(page);
  await page.getByRole("button", { name: /Check for new releases automatically/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();
  await expect(page.getByText(/checked against Deezer/)).toBeVisible();

  // The two routes to the same record must not fight each other.
  await page.goto("/import");
  await page.fill('textarea[name="source"]', FILE);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/Already up to date/)).toBeVisible();

  await openTesthead(page);
  await expect(page.getByRole("link", { name: "In Testing" })).toHaveCount(1);
});

test("an artist added from a service is watched from the start", async ({ page }) => {
  await page.goto("/");
  await page.fill('input[name="query"]', "Test Sault");
  await page.getByRole("button", { name: "Search" }).click();
  await page
    .locator("li")
    .filter({ hasText: "Test Sault" })
    .first()
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByText("Added Test Sault.")).toBeVisible();

  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Test Sault" }).first().click();
  await page.waitForURL(/\/artists\//);

  await expect(page.getByText(/Releases come from Deezer/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Check for new releases automatically/ }),
  ).toHaveCount(0);
});

test("an artist can carry a link to a fuller discography elsewhere", async ({ page }) => {
  await importFile(page);
  await openTesthead(page);

  await page.getByText("Edit name or photo").click();
  await page.fill('input[name="discographyUrl"]', "https://example.test/nct");
  await page.getByRole("button", { name: "Save artist" }).click();

  const link = page.getByRole("link", { name: /Full discography/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://example.test/nct");
  // Opens away from the tracker rather than navigating out of it.
  await expect(link).toHaveAttribute("target", "_blank");
});
