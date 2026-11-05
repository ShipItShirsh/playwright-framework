import { defineConfig, devices } from '@playwright/test';
import { getConfig, AUTH_STATE } from './config/env';

const cfg = getConfig();

// Optional corporate proxy: PLAYWRIGHT_PROXY=http://host:3128 npm test
// (parse credentials out of the URL rather than logging or embedding them)
function proxyFromEnv() {
  const raw = process.env.PLAYWRIGHT_PROXY;
  if (!raw) return undefined;
  const u = new URL(raw);
  return {
    server: `${u.protocol}//${u.host}`,
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
  };
}

/**
 * Three test layers, one config — the same separation used in enterprise
 * suites: fast API checks, browser UI checks, and cross-layer parity
 * checks that prove the layers agree with each other.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./scripts/app-reporter.ts'],
    // Machine-readable results feed the flaky-test history:
    // npm run report:flaky -- --ingest test-results/results.json
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Optional override when Chromium is provided by the machine/CI image:
    // CHROMIUM_PATH=/path/to/chrome npm test
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
    proxy: proxyFromEnv(),
    // Only for local test rigs with a TLS-intercepting proxy / self-signed envs:
    // PLAYWRIGHT_IGNORE_HTTPS_ERRORS=1 npm test   (never enable in CI)
    ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === '1',
  },
  projects: [
    { name: 'setup', testMatch: /auth\/setup\.ts/, use: { baseURL: cfg.UI_BASE_URL } },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: cfg.API_BASE_URL },
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: cfg.UI_BASE_URL,
        storageState: AUTH_STATE,
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'cross-layer',
      testDir: './tests/cross-layer',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: cfg.UI_BASE_URL,
        storageState: AUTH_STATE,
      },
    },
    {
      // Pure-logic unit tests (no browser): aggregation rules for the
      // flaky-test reporter.
      name: 'unit',
      testDir: './tests/unit',
    },
    {
      // Same-system parity: the spec starts the demo store in-process
      // (UI + API + SQLite in one app), so there is no baseURL or
      // stored auth — the store issues its own session at login.
      name: 'same-system',
      testDir: './tests/same-system',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
