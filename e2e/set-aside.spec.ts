import { expect, test } from "@playwright/test";
import { addArtist, openArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** The first card in the queue, and the title it carries. */
async function firstQueued(page: import("@playwright/test").Page) {
  const card = page.locator("#to-listen li").first();
  const title = (await card.locator("a").first().textContent())!.trim();
  return { card, title };
}

test("a release can be set aside and leaves the queue", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const before = await page.locator("#to-listen li").count();
  const { card, title } = await firstQueued(page);

  await card.getByRole("button", { name: `Set ${title} aside` }).click();

  await expect(page.locator("#to-listen li")).toHaveCount(before - 1);
  await expect(page.locator("#to-listen").getByText(title)).toHaveCount(0);

  // It has somewhere to be, rather than vanishing.
  await expect(page.locator("#set-aside").getByText(title)).toBeVisible();
  await expect(page.getByText("1 set aside")).toBeVisible();
});

test("set aside is not the same as heard", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");
  const { card, title } = await firstQueued(page);
  await card.getByRole("button", { name: `Set ${title} aside` }).click();
  await expect(page.locator("#set-aside").getByText(title)).toBeVisible();

  // Nothing about it claims to have been listened to.
  await expect(page.getByText(/0 heard/)).toBeVisible();
  await expect(page.locator("#recently-listened")).toHaveCount(0);
});

test("it can be put back in the queue at any time", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const before = await page.locator("#to-listen li").count();
  const { card, title } = await firstQueued(page);
  await card.getByRole("button", { name: `Set ${title} aside` }).click();
  await expect(page.locator("#to-listen li")).toHaveCount(before - 1);

  await page
    .locator("#set-aside")
    .getByRole("button", { name: `Put ${title} back in the queue` })
    .click();

  await expect(page.locator("#to-listen li")).toHaveCount(before);
  await expect(page.locator("#to-listen").getByText(title)).toBeVisible();
  // The section goes once it's empty rather than sitting there at zero.
  await expect(page.locator("#set-aside")).toHaveCount(0);
});

test("one that's set aside can still be ticked off later", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");

  const { card, title } = await firstQueued(page);
  await card.getByRole("button", { name: `Set ${title} aside` }).click();
  const aside = page.locator("#set-aside");
  await expect(aside.getByText(title)).toBeVisible();

  await aside.getByRole("button", { name: /Mark heard|Heard/ }).first().click();

  // Hearing it settles the question, so it leaves both the queue and the list.
  await expect(page.locator("#set-aside")).toHaveCount(0);
  await expect(page.locator("#to-listen").getByText(title)).toHaveCount(0);
  await expect(page.getByText(/1 heard/)).toBeVisible();
});

test("the decision survives a reload and shows on the release itself", async ({
  page,
}) => {
  await addArtist(page, "Test Sault", { heardAlready: false });
  await openArtist(page, "Test Sault");
  await page.getByRole("link", { name: /Untitled \(Test\)/ }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: "Untitled (Test)" })).toBeVisible();

  await page.getByRole("button", { name: /^Set .+ aside$/ }).click();
  await expect(page.getByRole("button", { name: /put .+ back/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /put .+ back/i })).toBeVisible();
  // Still unheard, so the heard toggle is untouched.
  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();
});

test("nothing offers to set aside something already heard", async ({ page }) => {
  await addArtist(page, "Test Sault", { heardAlready: true });
  await openArtist(page, "Test Sault");
  await page.getByRole("link", { name: /Untitled \(Test\)/ }).click();
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: "Untitled (Test)" })).toBeVisible();

  // There is nothing left to decide once you've heard it.
  await expect(page.getByRole("button", { name: /aside/i })).toHaveCount(0);
});

test("the export records what you've set aside", async ({ page }) => {
  await addArtist(page, "Testhead", { heardAlready: false });
  await page.goto("/");
  const { card, title } = await firstQueued(page);
  await card.getByRole("button", { name: `Set ${title} aside` }).click();
  await expect(page.locator("#set-aside").getByText(title)).toBeVisible();

  const body = await (await page.request.get("/api/export")).json();
  const releases = body.artists.flatMap((a: { releases: unknown[] }) => a.releases);
  const aside = releases.filter((r: { setAside: boolean }) => r.setAside);

  // A decision of yours, recoverable from nowhere else.
  expect(aside).toHaveLength(1);
  expect(aside[0]).toMatchObject({ title, listened: false });
});
