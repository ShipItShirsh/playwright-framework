import type { Page } from '@playwright/test';
import { sel, routes } from '../drivers';
import { getConfig } from '../../config/env';

/**
 * Tasks layer — reusable user actions built on the drivers layer.
 * Specs call tasks; tasks use selectors; specs own the assertions.
 * Layering: spec assertions -> tasks -> drivers -> browser.
 */
export async function login(page: Page, user: string, password: string): Promise<void> {
  await page.goto(routes.login);
  await page.fill(sel.username, user);
  await page.fill(sel.password, password);
  await page.click(sel.loginButton);
}

export async function loginAsTestUser(page: Page): Promise<void> {
  const cfg = getConfig();
  await login(page, cfg.TEST_USER, cfg.TEST_PASSWORD);
  await page.waitForURL(`**${routes.inventory}`);
}

export interface UiProduct {
  name: string;
  price: number;
}

/** Read products from the inventory page as currently displayed (no navigation). */
export async function readInventoryItems(page: Page): Promise<UiProduct[]> {
  const items = page.locator(sel.inventoryItem);
  const out: UiProduct[] = [];
  for (let i = 0; i < (await items.count()); i++) {
    const row = items.nth(i);
    const name = (await row.locator(sel.itemName).innerText()).trim();
    const priceText = await row.locator(sel.itemPrice).innerText();
    out.push({ name, price: Number(priceText.replace('$', '')) });
  }
  return out;
}

/** Navigate to inventory, then read the products shown. */
export async function readInventory(page: Page): Promise<UiProduct[]> {
  await page.goto(routes.inventory);
  return readInventoryItems(page);
}

export async function addToCartBySlug(page: Page, slug: string): Promise<void> {
  await page.click(sel.addToCartButton(slug));
}

export async function cartCount(page: Page): Promise<number> {
  const badge = page.locator(sel.cartBadge);
  if ((await badge.count()) === 0) return 0;
  return Number(await badge.innerText());
}

export function money(text: string): number {
  return Number(text.replace(/[^0-9.]/g, ''));
}
