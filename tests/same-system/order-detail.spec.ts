import { test, expect, type Page } from '@playwright/test';
import { startStoreServer, type RunningStore, type StoreOrder } from '../sut/store-server';
import { parseOrderExport, readStoreOrder } from '../tasks/store';
import { routes, sel } from '../drivers';

/**
 * Order detail (specs/002-order-detail): one order's detail page must
 * agree with the single-order API, the database, and the xlsx export —
 * and it must only ever show the signed-in user's own orders. Same
 * setup as the other same-system specs: in-process store, reset
 * before each test, serial, and this file's own database file so
 * parallel workers never share one (the 001 lesson).
 */
test.describe.configure({ mode: 'serial' });

let store: RunningStore;

test.beforeAll(async () => {
  process.env.STORE_DB_FILE = 'store-order-detail.db';
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

test.describe('Order detail (page <-> API <-> SQL <-> export)', () => {
  test('detail page matches API, database, and xlsx export for a UI order @smoke @regression', async ({
    page,
    request,
  }) => {
    await loginAndOpenInventory(page);
    // backpack 29.99 + onesie 7.99 = 37.98; tax 8% = 3.04; total 41.02.
    const orderId = await placeUiOrder(page, ['sauce-labs-backpack', 'sauce-labs-onesie']);

    await page.goto(`${store.baseURL}${routes.orders}`);
    await page.locator(sel.orderRow).nth(0).locator(sel.orderDetailLink).click();
    await page.waitForURL(`**/order.html?id=${orderId}`);

    const detail = page.locator(sel.orderDetail);
    await expect(detail.locator(sel.orderId)).toHaveText(String(orderId));
    const lines = detail.locator(sel.orderLine);
    await expect(lines).toHaveCount(2);
    await expect(lines.nth(0)).toContainText('Sauce Labs Backpack');
    await expect(lines.nth(0).locator(sel.lineTotal)).toHaveText('$29.99');
    await expect(lines.nth(1)).toContainText('Sauce Labs Onesie');
    await expect(lines.nth(1).locator(sel.lineTotal)).toHaveText('$7.99');
    await expect(detail.locator(sel.orderSubtotal)).toContainText('$37.98');
    await expect(detail.locator(sel.orderTax)).toContainText('$3.04');
    await expect(detail.locator(sel.orderTotal)).toContainText('$41.02');

    const apiRes = await request.get(`${store.baseURL}/api/orders/${orderId}`);
    expect(apiRes.ok()).toBeTruthy();
    const apiOrder = (await apiRes.json()) as StoreOrder;

    const dbOrder = readStoreOrder(orderId);
    if (!dbOrder) throw new Error(`order ${orderId} missing from the database (hard fail)`);
    expect(dbOrder).toEqual(apiOrder);

    const exportRes = await request.get(`${store.baseURL}/api/orders/${orderId}/export.xlsx`);
    expect(exportRes.ok()).toBeTruthy();
    const parsed = await parseOrderExport(Buffer.from(await exportRes.body()));
    const byName = <T extends { name: string }>(items: T[]): T[] =>
      [...items].sort((a, b) => a.name.localeCompare(b.name));
    expect(byName(parsed.lines)).toEqual(
      byName(
        apiOrder.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: Math.round(i.qty * i.unitPrice * 100) / 100,
        })),
      ),
    );
    expect(parsed.subtotal).toBe(apiOrder.subtotal);
    expect(parsed.tax).toBe(apiOrder.tax);
    expect(parsed.total).toBe(apiOrder.total);
  });

  test('a multi-quantity order shows the quantity and the multiplied line total @regression', async ({
    page,
    request,
  }) => {
    const createRes = await request.post(`${store.baseURL}/api/orders`, {
      data: { customer: 'standard_user', items: [{ slug: 'sauce-labs-bike-light', qty: 2 }] },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as StoreOrder;
    expect(created.total).toBe(21.58); // 2 x 9.99 = 19.98; tax 1.60

    await loginAndOpenInventory(page);
    await page.goto(`${store.baseURL}${routes.orderDetail(created.id)}`);
    const detail = page.locator(sel.orderDetail);
    const lines = detail.locator(sel.orderLine);
    await expect(lines).toHaveCount(1);
    await expect(lines.nth(0)).toContainText('Sauce Labs Bike Light');
    await expect(lines.nth(0)).toContainText('x2');
    await expect(lines.nth(0).locator(sel.lineTotal)).toHaveText('$19.98');
    await expect(detail.locator(sel.orderTotal)).toContainText('$21.58');
  });

  test("another customer's order returns the not-found page and leaks nothing @regression", async ({
    page,
    request,
  }) => {
    const createRes = await request.post(`${store.baseURL}/api/orders`, {
      data: { customer: 'api-buyer', items: [{ slug: 'sauce-labs-bike-light', qty: 1 }] },
    });
    expect(createRes.status()).toBe(201);
    const other = (await createRes.json()) as StoreOrder;

    await loginAndOpenInventory(page);
    const res = await page.goto(`${store.baseURL}${routes.orderDetail(other.id)}`);
    expect(res?.status()).toBe(404);
    await expect(page.locator(sel.orderNotFound)).toHaveText('Order not found');
    await expect(page.getByText('Sauce Labs Bike Light')).toHaveCount(0);
    await expect(page.locator(sel.orderDetail)).toHaveCount(0);
  });

  test('a nonexistent order id returns the identical not-found page @regression', async ({ page }) => {
    await loginAndOpenInventory(page);
    const res = await page.goto(`${store.baseURL}${routes.orderDetail(999999)}`);
    expect(res?.status()).toBe(404);
    await expect(page.locator(sel.orderNotFound)).toHaveText('Order not found');
    await expect(page.locator(sel.orderDetail)).toHaveCount(0);
  });

  test('opening a detail URL signed out redirects to login @regression', async ({ page }) => {
    await page.goto(`${store.baseURL}${routes.orderDetail(1)}`);
    await expect(page).toHaveURL(`${store.baseURL}/`);
    await expect(page.locator(sel.loginButton)).toBeVisible();
  });
});
