// Playwright doesn't read .env on its own, and both the config and the test
// helpers need the database URL from it.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3999;
export const MOCK_PORT = 4199;
export const TEST_CRON_SECRET = "test-cron-secret";

/**
 * Runs the real app against a stand-in provider, so the tests are deterministic
 * and need no network. They need a Postgres database: set TEST_DATABASE_URL, or
 * DATABASE_URL is used.
 *
 * These cover browser behaviour — tap targets, responsive rules, state that
 * survives a reload — which is where this project's regressions have actually
 * been. Pure logic is covered by vitest instead.
 */
/**
 * Normally Playwright uses the browser it downloads itself. Set
 * PLAYWRIGHT_CHROMIUM_PATH to point at an existing Chromium instead, for
 * sandboxes and CI images that ship one and disallow the download.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

const launchOptions = {
  ...(executablePath ? { executablePath } : {}),
  /*
   * These tests only ever talk to localhost. Left to itself the browser picks
   * up any proxy in the environment, and a proxy that rejects a single script
   * chunk leaves the page un-hydrated — every form then falls back to a native
   * submit and the suite silently tests the no-JavaScript path instead of the
   * real one.
   */
  args: [
    "--no-proxy-server",
    // Containers and CI images commonly run as root, where Chromium's sandbox
    // refuses to start at all.
    "--no-sandbox",
    "--disable-dev-shm-usage",
  ],
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  // The app is one shared database, so parallel specs would fight over it.
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? "line" : "list",
  /*
   * Generous, because these run against a development server compiling routes
   * on demand while the whole suite hammers it. A server action that returns
   * in well under a second on its own can take many times that with the rest
   * of the suite queued behind it, and a tight limit turns that into a failure
   * that says nothing about the app.
   *
   * Left at 30s deliberately. Past a hundred tests the development server
   * degrades over a long run: three full runs each failed one test on a
   * timeout, a different test each time, never on an assertion about
   * behaviour, and every one of them passed alone in a few seconds. Raising
   * the limit to 45s did not help — the run that failed at 180s had spent
   * three minutes waiting for a page that renders in two. A bigger number
   * buys nothing here and hides genuine hangs; the fix is to test against a
   * production build instead of a development server.
   */
  timeout: 120_000,
  expect: { timeout: 30_000 },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
    {
      // A real touch profile: several past bugs only appeared without hover.
      // The iPhone descriptor defaults to WebKit, so the engine is pinned back
      // to Chromium — what matters here is the viewport, touch and lack of
      // hover, not the rendering engine.
      name: "phone",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        launchOptions,
      },
    },
  ],

  webServer: [
    {
      command: `node e2e/mock-provider.mjs`,
      env: { MOCK_PORT: String(MOCK_PORT) },
      url: `http://127.0.0.1:${MOCK_PORT}/search/artist?q=test`,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
    },
    {
      command: `npx next dev -p ${PORT}`,
      env: {
        DEEZER_API_BASE: `http://127.0.0.1:${MOCK_PORT}`,
        SPOTIFY_API_BASE: `http://127.0.0.1:${MOCK_PORT}/spotify/v1`,
        SPOTIFY_ACCOUNTS_BASE: `http://127.0.0.1:${MOCK_PORT}/spotify`,
        SPOTIFY_CLIENT_ID: "test-client",
        SPOTIFY_CLIENT_SECRET: "test-secret",
        MUSICBRAINZ_API_BASE: `http://127.0.0.1:${MOCK_PORT}/mb`,
        COVER_ART_API_BASE: `http://127.0.0.1:${MOCK_PORT}/coverart`,
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
        // The suite runs unlocked. Next refuses to run two dev servers in one
        // directory, so the gate can't have an instance of its own here; its
        // rules are covered by unit tests in src/lib/auth.test.ts instead.
        ARTITRACK_PASSWORD: "",
        CRON_SECRET: TEST_CRON_SECRET,
      },
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
    },
  ],
});
