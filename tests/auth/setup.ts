import { test as setup, expect } from '@playwright/test';
import { loginAsTestUser } from '../tasks';
import { AUTH_STATE } from '../../config/env';

/**
 * Auth setup project — runs once, logs in through the real UI, and saves
 * storage state that the UI / cross-layer projects reuse.
 * Enterprise version: the same slot holds an SSO lifecycle (saved state +
 * token freshness check + coordinated refresh across parallel workers),
 * kept separate from any database auth. Here the demo app's login stands
 * in for SSO so the repo runs anywhere with no secrets.
 */
setup('authenticate @smoke', async ({ page }) => {
  await loginAsTestUser(page);
  await expect(page).toHaveURL(/inventory/);
  await page.context().storageState({ path: AUTH_STATE });
});
