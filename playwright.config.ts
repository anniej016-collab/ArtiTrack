// Playwright doesn't read .env on its own, and both the config and the test
// helpers need the database URL from it.
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3999;
const MOCK_PORT = 4199;

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
  timeout: 60_000,
  expect: { timeout: 15_000 },

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
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
        // The password gate would otherwise block every test at the door.
        ARTITRACK_PASSWORD: "",
      },
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
    },
  ],
});
