import ExcelJS from 'exceljs';
import type { UiProduct } from './index';

/**
 * Export-parity helper: build an xlsx "order summary export" from a set
 * of items, read it back, and return the parsed rows so a spec can prove
 * export totals match what the UI showed. In production suites this same
 * helper compares a real downloaded workbook against UI/API values.
 *
 * Built on ExcelJS (actively maintained). The older SheetJS `xlsx`
 * package is deliberately not used: its last npm release (0.18.5) carries
 * two high-severity advisories (prototype pollution, ReDoS) with no fix
 * published to npm.
 */
export interface ExportRow {
  name: string;
  price: number;
}

export async function buildAndReadBackExport(items: UiProduct[]): Promise<{ rows: ExportRow[]; total: number }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('OrderSummary');
  ws.addRow(['Name', 'Price']);
  for (const i of items) ws.addRow([i.name, i.price]);
  const buffer = await wb.xlsx.writeBuffer();

  const parsed = new ExcelJS.Workbook();
  await parsed.xlsx.load(buffer);
  const sheet = parsed.getWorksheet('OrderSummary');
  if (!sheet) throw new Error('Export workbook is missing the OrderSummary sheet (hard fail by policy)');
  const rows: ExportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header row
    rows.push({ name: String(row.getCell(1).value), price: Number(row.getCell(2).value) });
  });
  const total = rows.reduce((sum, r) => sum + r.price, 0);
  return { rows, total: Math.round(total * 100) / 100 };
}
