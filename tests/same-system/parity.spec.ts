import { test, expect } from '@playwright/test';
import { startStoreServer, type RunningStore, type StoreOrder } from '../sut/store-server';
import { countStoreOrders, parseOrderExport, readStoreOrder, readStoreProducts } from '../tasks/store';
import { sel } from '../drivers';
import { getCatalog } from '../tasks/test-data';

/**
 * Same-system parity: ONE application serves the UI, the REST API, and
 * the SQLite database, so these specs prove the layers agree with each
 * other on the same data — the enterprise pattern (UI <-> API <-> SQL
 * <-> export) that the public-demo projects can only approximate.
 *
 * The store is started in-process on an ephemeral port and reset
 * before each test, so the project is deterministic anywhere,
 * including CI, with no external dependency.
 */
// One shared store per file: run serially so a reset in one test can
// never clear another test's session mid-flow. (Parallel-safe design
// would need per-test tenants; serial is the honest trade-off here.)
test.describe.configure({ mode: 'serial' });

let store: RunningStore;

test.beforeAll(async () => {
  store = await startStoreServer();
});

test.afterAll(async () => {
  await store.close();
});

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${store.baseURL}/__test__/reset`);
  expect(res.ok()).toBeTruthy();
});

async function loginAndOpenInventory(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`${store.baseURL}/`);
  await page.fill(sel.username, 'standard_user');
  await page.fill(sel.password, 'secret_sauce');
  await page.click(sel.loginButton);
  await page.waitForURL('**/inventory.html');
}

test.describe('Same-system parity (UI <-> API <-> SQL <-> export)', () => {
  test('catalog agrees across UI, API, and database @smoke @regression', async ({ page, request }) => {
    await loginAndOpenInventory(page);
    const uiItems = await page.locator(sel.inventoryItem).evaluateAll((els) =>
      els.map((el) => ({
        name: el.querySelector('.inventory_item_name')?.textContent?.trim() ?? '',
        price: Number((el.querySelector('.inventory_item_price')?.textContent ?? '').replace('$', '')),
      })),
    );

    const apiRes = await request.get(`${store.baseURL}/api/products`);
    expect(apiRes.ok()).toBeTruthy();
    const apiItems = (await apiRes.json()) as { slug: string; name: string; price: number }[];

    const dbItems = readStoreProducts();
    const catalog = getCatalog();

    // All four views of the catalog — UI, API, SQL, and the versioned
    // fixture the system was seeded from — must be exactly equal.
    const shape = (items: { name: string; price: number }[]) =>
      items.map((i) => ({ name: i.name, price: i.price })).sort((a, b) => a.name.localeCompare(b.name));
    expect(shape(uiItems)).toEqual(shape(catalog));
    expect(shape(apiItems)).toEqual(shape(catalog));
    expect(shape(dbItems)).toEqual(shape(catalog));
  });

  test('UI checkout totals match the API order and the database row @regression', async ({ page, request }) => {
    await loginAndOpenInventory(page);
    await page.click(sel.addToCartButton('sauce-labs-backpack'));
    await page.click(sel.addToCartButton('sauce-labs-onesie'));
    await page.click('.shopping_cart_link');
    await page.click(sel.checkoutButton);
    await page.fill(sel.firstName, 'Pat');
    await page.fill(sel.lastName, 'Shopper');
    await page.fill(sel.postalCode, '37122');
    await page.click(sel.continueButton);

    // UI overview: backpack 29.99 + onesie 7.99 = 37.98; tax 8% = 3.04.
    await expect(page.locator(sel.summarySubtotal)).toContainText('$37.98');
    await expect(page.locator(sel.summaryTax)).toContainText('$3.04');
    await expect(page.locator(sel.summaryTotal)).toContainText('$41.02');
    await page.click(sel.finishButton);
    await expect(page.locator(sel.completeHeader)).toContainText('Thank you for your order!');
    const orderId = Number(await page.locator('[data-test="order-id"]').textContent());

    const apiRes = await request.get(`${store.baseURL}/api/orders/${orderId}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiOrder = (await apiRes.json()) as StoreOrder;
    const dbOrder = readStoreOrder(orderId);
    if (!dbOrder) throw new Error(`order ${orderId} missing from the database (hard fail)`);

    expect(apiOrder.subtotal).toBe(37.98);
    expect(apiOrder.tax).toBe(3.04);
    expect(apiOrder.total).toBe(41.02);
    expect(dbOrder).toEqual(apiOrder);
  });

  test('API-created order is persisted and reads back identically @regression', async ({ request }) => {
    const createRes = await request.post(`${store.baseURL}/api/orders`, {
      data: { customer: 'api-buyer', items: [{ slug: 'sauce-labs-bike-light', qty: 2 }] },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as StoreOrder;
    expect(created.subtotal).toBe(19.98);
    expect(created.tax).toBe(1.6);
    expect(created.total).toBe(21.58);

    const dbOrder = readStoreOrder(created.id);
    if (!dbOrder) throw new Error(`order ${created.id} missing from the database (hard fail)`);
    expect(dbOrder).toEqual(created);

    const getRes = await request.get(`${store.baseURL}/api/orders/${created.id}`);
    expect(getRes.ok()).toBeTruthy();
    expect((await getRes.json()) as StoreOrder).toEqual(created);
  });

  test('xlsx export of a UI order matches API and database totals @regression', async ({ page, request }) => {
    await loginAndOpenInventory(page);
    await page.click(sel.addToCartButton('sauce-labs-fleece-jacket'));
    await page.click('.shopping_cart_link');
    await page.click(sel.checkoutButton);
    await page.fill(sel.firstName, 'Pat');
    await page.fill(sel.lastName, 'Shopper');
    await page.fill(sel.postalCode, '37122');
    await page.click(sel.continueButton);
    await page.click(sel.finishButton);
    const orderId = Number(await page.locator('[data-test="order-id"]').textContent());

    const exportRes = await request.get(`${store.baseURL}/api/orders/${orderId}/export.xlsx`);
    expect(exportRes.ok()).toBeTruthy();
    const parsed = await parseOrderExport(Buffer.from(await exportRes.body()));

    const dbOrder = readStoreOrder(orderId);
    if (!dbOrder) throw new Error(`order ${orderId} missing from the database (hard fail)`);
    expect(parsed.lines).toEqual([{ name: 'Sauce Labs Fleece Jacket', qty: 1, unitPrice: 49.99, lineTotal: 49.99 }]);
    expect(parsed.subtotal).toBe(dbOrder.subtotal);
    expect(parsed.tax).toBe(dbOrder.tax);
    expect(parsed.total).toBe(dbOrder.total);
    expect(parsed.total).toBe(53.99); // 49.99 + 8% tax (4.00)
  });

  test('unknown product is rejected by the API and never persisted @regression', async ({ page, request }) => {
    const before = countStoreOrders();
    const res = await request.post(`${store.baseURL}/api/orders`, {
      data: { customer: 'api-buyer', items: [{ slug: 'not-a-real-product', qty: 1 }] },
    });
    expect(res.status()).toBe(400);
    expect(countStoreOrders()).toBe(before);

    await loginAndOpenInventory(page);
    await expect(page.locator(sel.inventoryItem)).toHaveCount(getCatalog().length);
  });
});
