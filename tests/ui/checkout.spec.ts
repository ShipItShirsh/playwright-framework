import { test, expect } from '@playwright/test';
import { sel, routes } from '../drivers';
import { addToCartBySlug, cartCount, money } from '../tasks';
import { getProduct } from '../tasks/test-data';

test.describe('Checkout', () => {
  test('complete a purchase with correct totals @smoke @regression', async ({ page }) => {
    const backpack = getProduct('Sauce Labs Backpack');
    const light = getProduct('Sauce Labs Bike Light');

    await page.goto(routes.inventory);
    await addToCartBySlug(page, backpack.slug);
    await addToCartBySlug(page, light.slug);
    expect(await cartCount(page)).toBe(2);

    await page.click(sel.cartLink);
    await expect(page.locator(sel.cartItem)).toHaveCount(2);
    await page.click(sel.checkoutButton);

    await page.fill(sel.firstName, 'Alex');
    await page.fill(sel.lastName, 'Tester');
    await page.fill(sel.postalCode, '37122');
    await page.click(sel.continueButton);

    const subtotal = money(await page.locator(sel.summarySubtotal).innerText());
    const tax = money(await page.locator(sel.summaryTax).innerText());
    const total = money(await page.locator(sel.summaryTotal).innerText());

    const expectedSubtotal = Math.round((backpack.price + light.price) * 100) / 100;
    expect(subtotal).toBe(expectedSubtotal);
    expect(tax).toBe(Math.round(expectedSubtotal * 0.08 * 100) / 100);
    expect(total).toBe(Math.round((subtotal + tax) * 100) / 100);

    await page.click(sel.finishButton);
    await expect(page).toHaveURL(/checkout-complete/);
    await expect(page.getByRole('heading', { name: /thank you for your order/i })).toBeVisible();
  });

  test('checkout requires customer information @regression', async ({ page }) => {
    const backpack = getProduct('Sauce Labs Backpack');
    await page.goto(routes.inventory);
    await addToCartBySlug(page, backpack.slug);
    await page.click(sel.cartLink);
    await page.click(sel.checkoutButton);
    await page.click(sel.continueButton);
    await expect(page.locator(sel.loginError)).toContainText('First Name is required');
  });
});
