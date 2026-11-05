import { test, expect } from '@playwright/test';
import { sel, routes } from '../drivers';
import { addToCartBySlug, money, readInventory } from '../tasks';
import { getProduct } from '../tasks/test-data';
import { buildAndReadBackExport } from '../tasks/xlsx-parity';

/**
 * Export parity: an exported order summary (xlsx) must match the totals
 * the checkout UI presents for the same cart — same items, same scope,
 * same rounding, or the test fails.
 */
test.describe('Checkout export parity (UI vs xlsx export)', () => {
  test('exported totals match checkout overview @regression', async ({ page }) => {
    const backpack = getProduct('Sauce Labs Backpack');
    const onesie = getProduct('Sauce Labs Onesie');
    const chosen = [backpack, onesie];

    await page.goto(routes.inventory);
    for (const p of chosen) await addToCartBySlug(page, p.slug);
    await page.click(sel.cartLink);
    await page.click(sel.checkoutButton);
    await page.fill(sel.firstName, 'Alex');
    await page.fill(sel.lastName, 'Tester');
    await page.fill(sel.postalCode, '37122');
    await page.click(sel.continueButton);

    const uiSubtotal = money(await page.locator(sel.summarySubtotal).innerText());

    const inventory = await readInventory(page);
    const cartItems = inventory.filter((i) => chosen.some((c) => c.name === i.name));
    const exported = await buildAndReadBackExport(cartItems);

    expect(exported.rows.map((r) => r.name).sort()).toEqual(chosen.map((c) => c.name).sort());
    expect(exported.total).toBe(uiSubtotal);
  });
});
