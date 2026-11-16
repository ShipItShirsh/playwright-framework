import { test, expect, type Page } from '@playwright/test';
import { startStoreServer, type RunningStore, type StoreOrder } from '../sut/store-server';
import { readStoreOrder, readStoreOrdersByCustomer } from '../tasks/store';
import { routes, sel } from '../drivers';

/**
 * Order history (specs/001-order-history): the demo store's history
 * page, its orders list API, and the database must all show the same
 * orders with the same totals — the same parity rule as
 * parity.spec.ts, applied to the list views instead of a single
 * order. Same setup: in-process store, reset before each test,
 * serial because the store is shared per file.
 */
test.describe.configure({ mode: 'serial' });

let store: RunningStore;

test.beforeAll(async () => {
  // Own database file: parity.spec.ts runs in a parallel worker
  // against the same data directory, and two suites resetting one
  // shared file would interleave. Each file gets its own store.
  process.env.STORE_DB_FILE = 'store-order-history.db';
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

/** Place one UI order for the given slugs; returns the new order id. */
async function placeUiOrder(page: Page, slugs: string[]): Promise<number> {
  await page.goto(`${store.baseURL}${routes.inventory}`);
  for (const slug of slugs) await page.click(sel.addToCartButton(slug));
  await page.click(sel.cartLink);
  await page.click(sel.checkoutButton);
  await page.fill(sel.firstName, 'Pat');
  await page.fill(sel.lastName, 'Shopper');
  await page.fill(sel.postalCode, '37122');
  await page.click(sel.continueButton);
  await page.click(sel.finishButton);
  await expect(page.locator(sel.completeHeader)).toContainText('Thank you for your order!');
  return Number(await page.locator(sel.orderId).textContent());
}

test.describe('Order history (page <-> list API <-> SQL)', () => {
  test('checkout order appears in history with identical totals in page, API, and database @smoke @regression', async ({
    page,
    request,
  }) => {
    await loginAndOpenInventory(page);
    // backpack 29.99 + onesie 7.99 = 37.98; tax 8% = 3.04; total 41.02.
    const orderId = await placeUiOrder(page, ['sauce-labs-backpack', 'sauce-labs-onesie']);

    await page.goto(`${store.baseURL}${routes.inventory}`);
    await page.click(sel.orderHistoryLink);
    await page.waitForURL('**/orders.html');

    const rows = page.locator(sel.orderRow);
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0).locator(sel.orderId)).toHaveText(String(orderId));
    await expect(rows.nth(0)).toContainText('Sauce Labs Backpack');
    await expect(rows.nth(0)).toContainText('Sauce Labs Onesie');
    await expect(rows.nth(0).locator(sel.orderSubtotal)).toContainText('$37.98');
    await expect(rows.nth(0).locator(sel.orderTax)).toContainText('$3.04');
    await expect(rows.nth(0).locator(sel.orderTotal)).toContainText('$41.02');

    const apiRes = await request.get(`${store.baseURL}/api/orders?customer=standard_user`);
    expect(apiRes.ok()).toBeTruthy();
    const apiOrders = (await apiRes.json()) as StoreOrder[];
    expect(apiOrders).toHaveLength(1);
    expect(apiOrders[0].id).toBe(orderId);
    expect(apiOrders[0].total).toBe(41.02);

    const dbOrders = readStoreOrdersByCustomer('standard_user');
    expect(dbOrders).toEqual(apiOrders);
    const dbOrder = readStoreOrder(orderId);
    if (!dbOrder) throw new Error(`order ${orderId} missing from the database (hard fail)`);
    expect(apiOrders[0]).toEqual(dbOrder);
  });

  test('two orders are listed newest first, on the page and in the API @regression', async ({ page, request }) => {
    await loginAndOpenInventory(page);
    const firstId = await placeUiOrder(page, ['sauce-labs-fleece-jacket']); // total 53.99
    const secondId = await placeUiOrder(page, ['sauce-labs-backpack']); // total 32.39
    expect(secondId).toBeGreaterThan(firstId);

    await page.goto(`${store.baseURL}${routes.orders}`);
    const rows = page.locator(sel.orderRow);
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).locator(sel.orderId)).toHaveText(String(secondId));
    await expect(rows.nth(0).locator(sel.orderTotal)).toContainText('$32.39');
    await expect(rows.nth(1).locator(sel.orderId)).toHaveText(String(firstId));
    await expect(rows.nth(1).locator(sel.orderTotal)).toContainText('$53.99');

    const apiRes = await request.get(`${store.baseURL}/api/orders?customer=standard_user`);
    const apiOrders = (await apiRes.json()) as StoreOrder[];
    expect(apiOrders.map((o) => o.id)).toEqual([secondId, firstId]);
    expect(readStoreOrdersByCustomer('standard_user')).toEqual(apiOrders);
  });

  test("another customer's orders never appear in the signed-in user's history @regression", async ({
    page,
    request,
  }) => {
    const otherRes = await request.post(`${store.baseURL}/api/orders`, {
      data: { customer: 'api-buyer', items: [{ slug: 'sauce-labs-bike-light', qty: 2 }] },
    });
    expect(otherRes.status()).toBe(201);
    const other = (await otherRes.json()) as StoreOrder;

    await loginAndOpenInventory(page);
    const ownId = await placeUiOrder(page, ['sauce-labs-onesie']);

    await page.goto(`${store.baseURL}${routes.orders}`);
    const rows = page.locator(sel.orderRow);
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0).locator(sel.orderId)).toHaveText(String(ownId));

    const ownRes = await request.get(`${store.baseURL}/api/orders?customer=standard_user`);
    const ownOrders = (await ownRes.json()) as StoreOrder[];
    expect(ownOrders.map((o) => o.id)).toEqual([ownId]);

    const otherResList = await request.get(`${store.baseURL}/api/orders?customer=api-buyer`);
    const otherOrders = (await otherResList.json()) as StoreOrder[];
    expect(otherOrders.map((o) => o.id)).toEqual([other.id]);
  });

  test('a user with no orders sees the empty-history message @regression', async ({ page }) => {
    await loginAndOpenInventory(page);
    await page.goto(`${store.baseURL}${routes.orders}`);
    await expect(page.locator(sel.ordersEmpty)).toHaveText('You have no orders yet.');
    await expect(page.locator(sel.orderRow)).toHaveCount(0);
  });

  test('opening the history page signed out redirects to login @regression', async ({ page }) => {
    await page.goto(`${store.baseURL}${routes.orders}`);
    await expect(page).toHaveURL(`${store.baseURL}/`);
    await expect(page.locator(sel.loginButton)).toBeVisible();
  });
});
