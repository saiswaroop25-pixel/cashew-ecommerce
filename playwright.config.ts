import { defineConfig } from "@playwright/test";

/**
 * Browser tests run against a PRODUCTION build (what visitors actually get), on port 3100.
 * They use the installed Microsoft Edge, so no browser download is needed.
 *
 *   npm run test:e2e            (builds and starts the app for you; reuses one already running on 3100)
 *
 * The tests read the real (dev) database, and the guest-cart test removes the cart it creates (see tests/e2e/global-teardown.ts).
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, testMatch: /(smoke|a11y)\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 420_000,
    stdout: "ignore",
  },
});
