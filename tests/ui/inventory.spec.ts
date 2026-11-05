import { test, expect } from '@playwright/test';
import { sel } from '../drivers';
import { readInventory, readInventoryItems } from '../tasks';
import { getCatalog } from '../tasks/test-data';

test.describe('Inventory', () => {
  test('shows all 6 catalog products @smoke @regression', async ({ page }) => {
    const products = await readInventory(page);
    expect(products).toHaveLength(getCatalog().length);
  });

  test('sort by price low-to-high is ascending @regression', async ({ page }) => {
    await page.goto('/inventory.html');
    await page.selectOption(sel.sortDropdown, 'lohi');
    // Read the page as displayed — navigating again would reset the sort.
    const products = await readInventoryItems(page);
    const prices = products.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});
