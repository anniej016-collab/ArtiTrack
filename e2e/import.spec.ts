import { expect, test } from "@playwright/test";
import { resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** Shaped like a hand-maintained discography page, units and solo work alike. */
function fixture(extra = "") {
  return `<script>
const DATA = [
{d:"2018-03-14",u:"Unit One",t:"First Record",ty:"Studio Album",la:"Korean",m:["Ana"],cv:"http://127.0.0.1:4199/img/first",tl:[{"t":"Opening","url":"x"},{"t":"★Lead Song","url":"y"}]},
{d:"2019",ap:true,u:"Unit One",t:"A Drama Theme",ty:"OST",la:"Korean",m:["Ana","Bo"]},
{d:"2024-05",u:"Solo",t:"Alone",ty:"Studio Album",la:"Korean",m:["Bo"],tl:["Lead Song","Quiet One"]},
${extra}];
</script>`;
}

async function importFile(page: import("@playwright/test").Page, source: string) {
  await page.goto("/import");
  await page.fill('textarea[name="source"]', source);
  await page.getByRole("button", { name: "Import" }).click();
}

test("a pasted discography becomes artists, releases and songs", async ({ page }) => {
  await importFile(page, fixture());

  await expect(page.getByText(/Imported 3 releases/)).toBeVisible();
  // Solo work is filed under the member, not under a unit called "Solo".
  await expect(page.getByText("Already imported")).toBeVisible();
  await expect(page.getByRole("link", { name: "Unit One" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bo" })).toBeVisible();

  await page.getByRole("link", { name: "Unit One" }).click();
  await page.waitForURL(/\/artists\//);
  await expect(page.getByText("2 releases")).toBeVisible();
  await expect(page.getByText(/Imported from a discography file/)).toBeVisible();

  // The tracklist came with the file, so there is nothing to fetch.
  await page.getByRole("link", { name: /^Songs/ }).click();
  await expect(page.getByRole("button", { name: /Load songs/ })).toHaveCount(0);
  await expect(page.getByText("Opening")).toBeVisible();
  // The title-track star is presentation, not part of the name.
  await expect(page.getByText("★Lead Song")).toHaveCount(0);
});

test("everything imports as heard, so the queue stays empty", async ({ page }) => {
  await importFile(page, fixture());
  await expect(page.getByText(/Imported 3 releases/)).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#to-listen li")).toHaveCount(0);
  // Songs count as heard too, not just the releases.
  await page.locator("#following").getByRole("link", { name: "Bo" }).first().click();
  await page.waitForURL(/\/artists\//);
  await page.getByRole("link", { name: /^Songs/ }).click();
  await expect(page.getByRole("button", { name: /^Mark .+ heard$/ })).toHaveCount(0);
});

test("importing the same file again changes nothing", async ({ page }) => {
  await importFile(page, fixture());
  await expect(page.getByText(/Imported 3 releases/)).toBeVisible();

  await importFile(page, fixture());
  await expect(page.getByText(/Already up to date/)).toBeVisible();

  // No duplicates, and still three releases across the two artists.
  await page.goto("/");
  await expect(page.locator("#following").getByText("Unit One")).toHaveCount(1);
});

test("an updated file adds what's new and keeps what you've marked", async ({ page }) => {
  await importFile(page, fixture());

  // Un-tick one, as you would on finding a gap in what you'd heard.
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Unit One" }).first().click();
  await page.waitForURL(/\/artists\//);
  await page.getByRole("link", { name: "First Record" }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: "First Record" })).toBeVisible();
  await page.getByRole("button", { name: "Heard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();

  // The file gains a release later on.
  await importFile(
    page,
    fixture('{d:"2026-02-02",u:"Unit One",t:"Brand New",ty:"EP",la:"Korean",m:["Ana"]},\n'),
  );
  await expect(page.getByText(/1 added/)).toBeVisible();

  // The new one is in, and the one you un-ticked stayed un-ticked.
  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("First Record")).toBeVisible();
  await page.locator("#following").getByRole("link", { name: "Unit One" }).first().click();
  await page.waitForURL(/\/artists\//);
  await expect(page.getByRole("link", { name: "Brand New" })).toBeVisible();
  await expect(page.getByText("3 releases")).toBeVisible();
});

test("a corrected title is picked up rather than duplicated", async ({ page }) => {
  await importFile(page, fixture());
  await importFile(
    page,
    fixture().replace("A Drama Theme", "A Drama Theme (Part 1)"),
  );

  await expect(page.getByText(/1 updated/)).toBeVisible();
  await page.goto("/");
  await page.locator("#following").getByRole("link", { name: "Unit One" }).first().click();
  await page.waitForURL(/\/artists\//);

  await expect(page.getByRole("link", { name: "A Drama Theme (Part 1)" })).toBeVisible();
  await expect(page.getByText("2 releases")).toBeVisible();
});

test("a file it can't read says so instead of half-importing", async ({ page }) => {
  await importFile(page, "<html>just a page, no data</html>");

  await expect(page.getByText(/Couldn't find the release data/)).toBeVisible();
  await expect(page.getByText("Already imported")).toHaveCount(0);
});
