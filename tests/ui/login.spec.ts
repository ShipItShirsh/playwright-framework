import { test, expect } from '@playwright/test';
import { getConfig } from '../../config/env';
import { sel } from '../drivers';
import { login } from '../tasks';

// These tests exercise login itself, so they start unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
  test('valid user reaches inventory @smoke @regression', async ({ page }) => {
    const cfg = getConfig();
    await login(page, cfg.TEST_USER, cfg.TEST_PASSWORD);
    await expect(page).toHaveURL(/inventory/);
    await expect(page.locator(sel.inventoryItem)).toHaveCount(6);
  });

  test('locked-out user gets a clear error and stays on login @regression', async ({ page }) => {
    const cfg = getConfig();
    await login(page, cfg.LOCKED_USER, cfg.TEST_PASSWORD);
    await expect(page.locator(sel.loginError)).toContainText('locked out');
    await expect(page).not.toHaveURL(/inventory/);
  });

  test('wrong password is rejected @regression', async ({ page }) => {
    const cfg = getConfig();
    await login(page, cfg.TEST_USER, 'not-the-password');
    await expect(page.locator(sel.loginError)).toContainText('do not match');
  });
});
