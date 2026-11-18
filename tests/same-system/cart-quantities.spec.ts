import { test, expect, type Page } from '@playwright/test';
import { startStoreServer, type RunningStore, type StoreOrder } from '../sut/store-server';
import { readStoreOrder, setCartQuantity } from '../tasks/store';
import { routes, sel } from '../drivers';

/**
 * Cart quantities (specs/003-cart-quantities): the cart counts units,
 * not just distinct products, and checkout carries the quantities
 * into the placed order. Same setup as the other same-system specs:
 * in-process store, reset before each test, serial, and this file's
 * own database file (the 001 lesson).
 */
test.describe.configure({ mode: 'serial' });

let store: RunningStore;

test.beforeAll(async () => {
  process.env.STORE_DB_FILE = 'store-cart-quantities.db';
  store = await startStoreServer();
});

test.afterAll(async () => {
  await store.close();
});

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${store.baseURL}/__test__/reset`);
  expect(res.ok()).toBeTruthy();
});

async function loginAndOpenInventory(page: Page): Promise<void> {
  await page.goto(`${store.baseURL}/`);
  await page.fill(sel.username, 'standard_user');
  await page.fill(sel.password, 'secret_sauce');
  await page.click(sel.loginButton);
  await page.waitForURL('**/inventory.html');
}

/** From the cart page, run checkout to completion; returns the order id. */
async function checkoutFromCart(page: Page): Promise<number> {
  await page.click(sel.checkoutButton);
  await page.fill(sel.firstName, 'Pat');
  await page.fill(sel.lastName, 'Shopper');
  await page.fill(sel.postalCode, '37122');
  await page.click(sel.continueButton);
  await page.click(sel.finishButton);
  await expect(page.locator(sel.completeHeader)).toContainText('Thank you for your order!');
  return Number(await page.locator(sel.orderId).textContent());
}

test.describe('Cart quantities (cart <-> checkout <-> API <-> SQL)', () => {
  test('adding the same product twice counts up and checkout carries qty 2 into the order @smoke @regression', async ({
    page,
    request,
  }) => {
    await loginAndOpenInventory(page);
    await page.click(sel.addToCartButton('sauce-labs-backpack'));
    await page.click(sel.addToCartButton('sauce-labs-backpack'));
    await expect(page.locator(sel.cartBadge)).toHaveText('2');

    await page.click(sel.cartLink);
    const row = page.locator(sel.cartItemRow('sauce-labs-backpack'));
    await expect(page.locator(sel.cartItem)).toHaveCount(1);
    await expect(row.locator(sel.cartQty)).toHaveValue('2');
    await expect(row.locator(sel.cartLineTotal)).toHaveText('$59.98');

    await page.click(sel.checkoutButton);
    await page.fill(sel.firstName, 'Pat');
    await page.fill(sel.lastName, 'Shopper');
    await page.fill(sel.postalCode, '37122');
    await page.click(sel.continueButton);
    await expect(page.locator(sel.overviewLineTotal)).toHaveText('$59.98');
    await expect(page.locator(sel.summarySubtotal)).toContainText('$59.98');
    await expect(page.locator(sel.summaryTax)).toContainText('$4.80');
    await expect(page.locator(sel.summaryTotal)).toContainText('$64.78');
    await page.click(sel.finishButton);
    await expect(page.locator(sel.completeHeader)).toContainText('Thank you for your order!');
    const orderId = Number(await page.locator(sel.orderId).textContent());

    const apiRes = await request.get(`${store.baseURL}/api/orders/${orderId}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiOrder = (await apiRes.json()) as StoreOrder;
    expect(apiOrder.items).toEqual([
      { slug: 'sauce-labs-backpack', name: 'Sauce Labs Backpack', qty: 2, unitPrice: 29.99 },
    ]);
    expect(apiOrder.subtotal).toBe(59.98);
    expect(apiOrder.tax).toBe(4.8);
    expect(apiOrder.total).toBe(64.78);

    const dbOrder = readStoreOrder(orderId);
    if (!dbOrder) throw new Error(`order ${orderId} missing from the database (hard fail)`);
    expect(dbOrder).toEqual(apiOrder);
  });

  test('setting quantities on the cart page reprices the cart, and 0 removes the item @regression', async ({
    page,
  }) => {
    await loginAndOpenInventory(page);
    await page.click(sel.addToCartButton('sauce-labs-backpack'));
    await page.click(sel.addToCartButton('sauce-labs-bike-light'));
    await page.click(sel.cartLink);

    const backpack = page.locator(sel.cartItemRow('sauce-labs-backpack'));
    await backpack.locator(sel.cartQty).fill('3');
    await backpack.locator(sel.updateQtyButton).click();
    await expect(backpack.locator(sel.cartLineTotal)).toHaveText('$89.97');

    // Quantities live in the session: leave the cart and come back.
    await page.goto(`${store.baseURL}${routes.inventory}`);
    await expect(page.locator(sel.cartBadge)).toHaveText('4'); // 3 + 1 units
    await page.click(sel.cartLink);
    await expect(backpack.locator(sel.cartQty)).toHaveValue('3');

    const bikeLight = page.locator(sel.cartItemRow('sauce-labs-bike-light'));
    await bikeLight.locator(sel.cartQty).fill('0');
    await bikeLight.locator(sel.updateQtyButton).click();
    await expect(page.locator(sel.cartItemRow('sauce-labs-bike-light'))).toHaveCount(0);
    await expect(page.locator(sel.cartItem)).toHaveCount(1);

    // Checkout prices exactly what the cart shows: 3 x 29.99 = 89.97; tax 7.20; total 97.17.
    const orderId = await checkoutFromCart(page);
    const dbOrder = readStoreOrder(orderId);
    if (!dbOrder) throw new Error(`order ${orderId} missing from the database (hard fail)`);
    expect(dbOrder.items).toEqual([
      { slug: 'sauce-labs-backpack', name: 'Sauce Labs Backpack', qty: 3, unitPrice: 29.99 },
    ]);
    expect(dbOrder.total).toBe(97.17);
  });

  test('invalid quantities are rejected with 400 and the cart is unchanged @regression', async ({ page }) => {
    await loginAndOpenInventory(page);
    await page.click(sel.addToCartButton('sauce-labs-backpack'));

    expect((await setCartQuantity(page, store.baseURL, 'sauce-labs-backpack', 100)).status()).toBe(400);
    expect((await setCartQuantity(page, store.baseURL, 'sauce-labs-backpack', -1)).status()).toBe(400);
    expect((await setCartQuantity(page, store.baseURL, 'sauce-labs-bike-light', 1)).status()).toBe(400);

    await page.click(sel.cartLink);
    const row = page.locator(sel.cartItemRow('sauce-labs-backpack'));
    await expect(row.locator(sel.cartQty)).toHaveValue('1');
    await expect(row.locator(sel.cartLineTotal)).toHaveText('$29.99');
  });
});
