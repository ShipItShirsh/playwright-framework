import { test, expect } from '@playwright/test';
import { readInventory } from '../tasks';
import { getCatalog } from '../tasks/test-data';

/**
 * Cross-layer parity: the UI must agree with the data layer.
 * Before claiming a mismatch, align scope first (same product set,
 * same currency/rounding) — then compare names AND prices exactly.
 * In production this pattern runs UI <-> API <-> SQL; here the data
 * layer is the versioned catalog fixture so the repo is self-contained.
 */
test.describe('Catalog parity (UI vs data layer)', () => {
  test('UI inventory matches catalog names and prices exactly @smoke @regression', async ({ page }) => {
    const ui = await readInventory(page);
    const catalog = getCatalog();

    expect(ui.map((p) => p.name).sort()).toEqual(catalog.map((p) => p.name).sort());
    for (const product of catalog) {
      const shown = ui.find((p) => p.name === product.name);
      if (!shown) throw new Error(`"${product.name}" is in the data layer but missing from the UI (hard fail)`);
      expect(shown.price, `${product.name} price`).toBe(product.price);
    }
  });
});
