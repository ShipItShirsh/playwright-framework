import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { STORE_DB_PATH, type StoreOrder, type StoreProduct } from '../sut/store-server';

/**
 * Tasks-layer helpers for the same-system store: read the SUT's SQLite
 * database directly (the SQL layer) and parse its xlsx order export.
 * Specs own the assertions; these helpers only fetch and shape data.
 * The database is opened read-only — tests must never write to the
 * system they are verifying.
 */
export function readStoreProducts(): StoreProduct[] {
  const db = new Database(STORE_DB_PATH, { readonly: true });
  try {
    const rows = db.prepare('SELECT slug, name, price_cents FROM products ORDER BY name').all() as {
      slug: string;
      name: string;
      price_cents: number;
    }[];
    return rows.map((r) => ({ slug: r.slug, name: r.name, price: r.price_cents / 100 }));
  } finally {
    db.close();
  }
}

export function readStoreOrder(id: number): StoreOrder | undefined {
  const db = new Database(STORE_DB_PATH, { readonly: true });
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as
      | { id: number; customer: string; subtotal_cents: number; tax_cents: number; total_cents: number }
      | undefined;
    if (!row) return undefined;
    const lines = db
      .prepare(
        'SELECT l.slug, p.name, l.qty, l.unit_price_cents FROM order_lines l JOIN products p ON p.slug = l.slug WHERE l.order_id = ?',
      )
      .all(id) as { slug: string; name: string; qty: number; unit_price_cents: number }[];
    return {
      id: row.id,
      customer: row.customer,
      items: lines.map((l) => ({ slug: l.slug, name: l.name, qty: l.qty, unitPrice: l.unit_price_cents / 100 })),
      subtotal: row.subtotal_cents / 100,
      tax: row.tax_cents / 100,
      total: row.total_cents / 100,
    };
  } finally {
    db.close();
  }
}

export function countStoreOrders(): number {
  const db = new Database(STORE_DB_PATH, { readonly: true });
  try {
    const row = db.prepare('SELECT COUNT(*) AS n FROM orders').get() as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}

export interface ParsedExport {
  lines: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  total: number;
}

/** Parse the SUT's order export (xlsx) back into values a spec can compare. */
export async function parseOrderExport(buffer: Buffer): Promise<ParsedExport> {
  const wb = new ExcelJS.Workbook();
  // ExcelJS load() accepts the ArrayBuffer-shaped data Playwright returns.
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet('OrderSummary');
  if (!ws) throw new Error('Export workbook is missing the OrderSummary sheet (hard fail by policy)');
  const parsed: ParsedExport = { lines: [], subtotal: 0, tax: 0, total: 0 };
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const label = String(row.getCell(1).value ?? '');
    if (label === 'Subtotal') parsed.subtotal = Number(row.getCell(4).value);
    else if (label === 'Tax') parsed.tax = Number(row.getCell(4).value);
    else if (label === 'Total') parsed.total = Number(row.getCell(4).value);
    else if (label) {
      parsed.lines.push({
        name: label,
        qty: Number(row.getCell(2).value),
        unitPrice: Number(row.getCell(3).value),
        lineTotal: Number(row.getCell(4).value),
      });
    }
  });
  return parsed;
}
