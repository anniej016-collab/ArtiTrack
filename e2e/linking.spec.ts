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
{d:"2019",ap:true,u:"Testhead",t:"Spectre Test",ty:"OST",la:"English",m:["Ana"]},
{d:"2015-01-01",u:"Testhead",t:"Something Only The File Knows",ty:"Concert Film",la:"English",m:["Ana"]},
];
</script>`;

async function importFile(page: import("@playwright/test").Page) {
  await page.goto("/import");
  await page.fill('textarea[name="source"]', FILE);
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/Imported 3 releases/)).toBeVisible();
}

/**
 * Whichever service leads the search is the one an artist gets linked to, and
 * these tests are about linking rather than about which service that is. Named
 * once so a change of order is one edit here, not nine.
 */
const LEADING_SERVICE = /checked against Deezer/;

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
  await expect(page.getByText(LEADING_SERVICE)).toBeVisible();
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
  await expect(page.getByText(LEADING_SERVICE)).toBeVisible();

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
  await expect(page.getByText(LEADING_SERVICE)).toBeVisible();

  // The service has never heard of this one; syncing must not remove it.
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
  await expect(page.getByText(LEADING_SERVICE)).toBeVisible();

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

test("an OST the file classifies is still matched to the service", async ({ page }) => {
  /*
   * The file's own categories — OST, concert film — describe records that
   * mostly do exist on a service too. They are classifications, not a claim
   * that the record is unavailable, so nothing about them excludes a release
   * from matching. Only being genuinely absent does.
   */
  await importFile(page);
  await openTesthead(page);
  await page.getByRole("button", { name: /Check for new releases automatically/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();
  await expect(page.getByText(LEADING_SERVICE)).toBeVisible();

  // The service lists "Spectre Test" as a single; the file calls it an OST. One row.
  await expect(page.getByRole("link", { name: "Spectre Test" })).toHaveCount(1);

  // And the file's classification is what's kept, not the service's.
  await page.getByRole("link", { name: "Spectre Test" }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: "Spectre Test" })).toBeVisible();
  await expect(page.getByText("Soundtrack", { exact: true })).toBeVisible();

  // Being matched means its songs can now be fetched, which an unmatched
  // file-only row could never do.
  await expect(page.getByRole("button", { name: /Load songs/ })).toBeVisible();
});

test("a matched OST's songs fold in with the rest of the artist's", async ({ page }) => {
  await importFile(page);
  await openTesthead(page);
  await page.getByRole("button", { name: /Check for new releases automatically/ }).click();
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "This one" }).first().click();
  await expect(page.getByText(LEADING_SERVICE)).toBeVisible();

  await page.getByRole("link", { name: "Spectre Test" }).click();
  await page.waitForURL(/\/releases\//);
  await page.getByRole("button", { name: /Load songs/ }).click();

  // The song arrives under the same artist and counts like any other — heard,
  // because the release it belongs to was imported as heard.
  await expect(page.getByText(/1 of 1 songs heard/)).toBeVisible();
});
