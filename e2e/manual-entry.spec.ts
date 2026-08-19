import { expect, test } from "@playwright/test";
import { addArtist, openArtist, resetDatabase, resetPreferences } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "not device-specific");
  await resetDatabase();
  await resetPreferences(page);
});

/** Any image the mock serves, so a link field has something real to point at. */
const PHOTO = "http://127.0.0.1:4199/img/hand-added";

async function addByHand(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.getByText("Can't find them? Add by hand").click();
  await page.fill('input[name="name"]', name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator("#following").getByText(name)).toBeVisible();
}

test("an artist added by hand can carry a photo", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Can't find them? Add by hand").click();
  await page.fill('input[name="name"]', "Hand Added");
  await page.fill('input[name="imageUrl"]', PHOTO);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await openArtist(page, "Hand Added");
  // Twice over: the hero portrait and the blurred backdrop behind it.
  await expect(page.locator(`img[src="${PHOTO}"]`).first()).toBeVisible();
});

test("a photo can be added later, which is the MusicBrainz case", async ({ page }) => {
  await addByHand(page, "No Photo Yet");
  await openArtist(page, "No Photo Yet");

  await page.getByText("Edit name or photo").click();
  await page.fill('input[name="imageUrl"]', PHOTO);
  await page.getByRole("button", { name: "Save artist" }).click();

  await expect(page.locator(`img[src="${PHOTO}"]`).first()).toBeVisible();
});

test("an artist can be renamed", async ({ page }) => {
  await addByHand(page, "Wrong Name");
  await openArtist(page, "Wrong Name");

  await page.getByText("Edit name or photo").click();
  await page.fill('input[name="name"]', "Right Name");
  await page.getByRole("button", { name: "Save artist" }).click();

  await expect(page.getByRole("heading", { name: "Right Name" })).toBeVisible();
});

test("a release logged by hand can carry its own cover", async ({ page }) => {
  await addByHand(page, "Hand Label");
  await openArtist(page, "Hand Label");

  await page.getByText("Log a release by hand").click();
  await page.fill('input[name="title"]', "Hand Made");
  await page.fill('input[name="releaseDate"]', "2026-03-01");
  await page.fill('input[name="coverUrl"]', PHOTO);
  await page.getByRole("button", { name: "Log release" }).click();

  // Logging drops you on the release, which is where songs are typed in.
  await page.waitForURL(/\/releases\//);
  await expect(page.getByRole("heading", { name: "Hand Made" })).toBeVisible();
  await expect(page.locator(`img[src="${PHOTO}"]`)).toBeVisible();
});

test("cover art can be attached to a release that arrived without any", async ({
  page,
}) => {
  await addByHand(page, "Hand Label");
  await openArtist(page, "Hand Label");
  await page.getByText("Log a release by hand").click();
  await page.fill('input[name="title"]', "Bare Sleeve");
  await page.fill('input[name="releaseDate"]', "2026-03-01");
  await page.getByRole("button", { name: "Log release" }).click();
  await page.waitForURL(/\/releases\//);

  await page.getByText("Edit this release").click();
  await page.fill('input[name="coverUrl"]', PHOTO);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.locator(`img[src="${PHOTO}"]`)).toBeVisible();
});

test("a whole tracklist can be pasted in at once", async ({ page }) => {
  await addByHand(page, "Hand Label");
  await openArtist(page, "Hand Label");
  await page.getByText("Log a release by hand").click();
  await page.fill('input[name="title"]', "Typed In");
  await page.fill('input[name="releaseDate"]', "2026-03-01");
  await page.getByRole("button", { name: "Log release" }).click();
  await page.waitForURL(/\/releases\//);

  await page.fill(
    'textarea[name="tracks"]',
    "1. First Thing 3:45\n2. Second Thing 4:10\n3. Third Thing",
  );
  await page.getByRole("button", { name: "Save songs" }).click();

  // Scoped to the list: the edit box is seeded with the same titles.
  const songs = page.getByRole("list").filter({ hasText: "First Thing" }).first();
  await expect(page.getByText("Songs · 3")).toBeVisible();
  await expect(songs.getByText("First Thing")).toBeVisible();
  // Numbering and running times were read off the paste, not stored literally.
  await expect(songs.getByText("3:45")).toBeVisible();
  await expect(songs.getByText("1. First Thing")).toHaveCount(0);
});

test("hand-entered songs count as heard everywhere, same as fetched ones", async ({
  page,
}) => {
  await addByHand(page, "Hand Label");
  await openArtist(page, "Hand Label");
  const artistUrl = page.url();

  /*
   * Two releases sharing a song, both typed in, both unheard — the box is
   * ticked by default. Left ticked, the songs would arrive already heard along
   * with the release that carries them, which is correct but is a different
   * rule from the one under test here.
   */
  for (const title of ["Record One", "Record Two"]) {
    await page.goto(artistUrl);
    await page.getByText("Log a release by hand").click();
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="releaseDate"]', "2026-03-01");
    await page.uncheck('input[name="markListened"]');
    await page.getByRole("button", { name: "Log release" }).click();
    await page.waitForURL(/\/releases\//);
  }

  for (const title of ["Record One", "Record Two"]) {
    await page.goto(artistUrl);
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await page.waitForURL(/\/releases\//);
    await page.fill('textarea[name="tracks"]', "Shared Song\nOwn Song");
    await page.getByRole("button", { name: "Save songs" }).click();
    await expect(page.getByText("Songs · 2")).toBeVisible();
  }

  await page.goto(artistUrl);
  await page.getByRole("link", { name: /Record One/ }).click();
  await page.waitForURL(/\/releases\//);
  await page.getByRole("button", { name: "Mark Shared Song heard" }).click();
  await expect(page.getByText(/1 of 2 songs heard/)).toBeVisible();

  await page.goto(artistUrl);
  await page.getByRole("link", { name: /Record Two/ }).click();
  await page.waitForURL(/\/releases\//);
  // The same song, heard once, counts on the other release too.
  await expect(page.getByText(/1 of 2 songs heard/)).toBeVisible();
});

test("notes on a release show where the release does", async ({ page }) => {
  await addArtist(page, "Test Sault", { heardAlready: false });
  await openArtist(page, "Test Sault");
  await page.getByRole("link", { name: /Untitled \(Test\)/ }).click();
  await page.waitForURL(/\/releases\//);

  await page.getByText("Add a note").click();
  await page.fill('textarea[name="notes"]', "Best thing all year.");
  await page.getByRole("button", { name: "Save note" }).click();

  // Visible on landing, without opening anything or scrolling to an edit form.
  // Scoped to the paragraph: the editor below holds the same text.
  const note = page.locator("p", { hasText: "Best thing all year." }).first();
  await expect(note).toBeVisible();
  expect((await note.boundingBox())!.y).toBeLessThan(700);
});

test("notes on an artist sit under the hero, not at the foot of the page", async ({
  page,
}) => {
  await addArtist(page, "Test Sault", { heardAlready: false });
  await openArtist(page, "Test Sault");

  // The summary carries a chevron alongside the word, so an exact text match
  // misses it.
  await page.locator("summary").filter({ hasText: "Notes" }).click();
  await page.fill('textarea[name="notes"]', "Start with the second record.");
  await page.getByRole("button", { name: "Save notes" }).click();

  const notes = page.locator('textarea[name="notes"]');
  await expect(notes).toHaveValue("Start with the second record.");
  // Above the releases rather than below everything.
  const notesBox = (await notes.boundingBox())!;
  const releases = (await page.getByRole("link", { name: /Releases ·/ }).boundingBox())!;
  expect(notesBox.y).toBeLessThan(releases.y);
});

test("a release logged by hand is heard already, with no date", async ({ page }) => {
  /*
   * Shipped without the choice: a record logged by hand always landed unheard,
   * so documenting something you own meant ticking it heard afterwards — which
   * dates it today and puts a record from years ago at the top of "Recently
   * listened". The artist search has offered this since the beginning; the
   * by-hand form did not.
   */
  await addByHand(page, "Hand Artist");
  await openArtist(page, "Hand Artist");

  await page.getByText("Log a release by hand").click();
  await page.fill('input[name="title"]', "Old Favourite");
  await page.fill('input[name="releaseDate"]', "2015-06-01");
  await page.getByRole("button", { name: "Log release" }).click();
  await page.waitForURL(/\/releases\//);

  // Heard on arrival, so it never enters the queue...
  await expect(page.getByRole("button", { name: "Heard", exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("Old Favourite")).toHaveCount(0);

  // ...and undated, so it is not a recent listen.
  await expect(page.locator("#recently-listened li")).toHaveCount(0);
});

test("logging something to listen to still works", async ({ page }) => {
  await addByHand(page, "Hand Artist");
  await openArtist(page, "Hand Artist");

  await page.getByText("Log a release by hand").click();
  await page.fill('input[name="title"]', "Not Heard Yet");
  await page.fill('input[name="releaseDate"]', "2026-06-01");
  await page.uncheck('input[name="markListened"]');
  await page.getByRole("button", { name: "Log release" }).click();
  await page.waitForURL(/\/releases\//);

  await expect(page.getByRole("button", { name: "Mark heard", exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#to-listen").getByText("Not Heard Yet")).toBeVisible();
});
