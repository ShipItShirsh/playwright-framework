import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import catalog from '../data/catalog.json';

/**
 * System under test (SUT): a small demo store that serves a web UI, a
 * REST API, and a SQLite database from ONE application, all backed by
 * the same rows. It exists so the same-system parity specs can prove
 * UI <-> API <-> SQL agreement on a single system — the pattern used
 * against real enterprise platforms — instead of comparing two
 * unrelated public demo sites.
 *
 * The product catalog is seeded from the same versioned fixture the
 * rest of the suite uses (tests/data/catalog.json), so there is one
 * source of truth for names and prices.
 *
 * Money is stored and computed in integer cents; the API and UI render
 * dollars. Tax is 8%, rounded to the nearest cent — the same rule the
 * UI checkout specs assert against SauceDemo.
 */
export const STORE_DB_PATH = join(__dirname, 'data', 'store.db');
const TAX_RATE = 0.08;

export interface StoreProduct {
  slug: string;
  name: string;
  price: number; // dollars
}

interface OrderLine {
  slug: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface StoreOrder {
  id: number;
  customer: string;
  items: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
}

const cents = (dollars: number): number => Math.round(dollars * 100);
const dollars = (c: number): number => c / 100;
const fmt = (c: number): string => (c / 100).toFixed(2);

function initDb(): Database.Database {
  // A fresh clone may not contain the data directory (git does not
  // track empty directories), so create it rather than assuming it.
  mkdirSync(dirname(STORE_DB_PATH), { recursive: true });
  const db = new Database(STORE_DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      tax_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_lines (
      order_id INTEGER NOT NULL REFERENCES orders(id),
      slug TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL
    );
  `);
  const upsert = db.prepare(
    'INSERT INTO products (slug, name, price_cents) VALUES (?, ?, ?) ' +
      'ON CONFLICT(slug) DO UPDATE SET name = excluded.name, price_cents = excluded.price_cents',
  );
  for (const p of catalog as StoreProduct[]) upsert.run(p.slug, p.name, cents(p.price));
  return db;
}

function computeTotals(lines: { qty: number; unitPriceCents: number }[]): {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
} {
  const subtotalCents = lines.reduce((sum, l) => sum + l.qty * l.unitPriceCents, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function createOrder(
  db: Database.Database,
  customer: string,
  items: { slug: string; qty: number }[],
): StoreOrder | { error: string } {
  const lines: (OrderLine & { unitPriceCents: number })[] = [];
  for (const item of items) {
    const row = db.prepare('SELECT slug, name, price_cents FROM products WHERE slug = ?').get(item.slug) as
      | { slug: string; name: string; price_cents: number }
      | undefined;
    if (!row) return { error: `unknown product slug: ${item.slug}` };
    lines.push({ slug: row.slug, name: row.name, qty: item.qty, unitPrice: dollars(row.price_cents), unitPriceCents: row.price_cents });
  }
  const { subtotalCents, taxCents, totalCents } = computeTotals(lines);
  const info = db
    .prepare('INSERT INTO orders (customer, subtotal_cents, tax_cents, total_cents) VALUES (?, ?, ?, ?)')
    .run(customer, subtotalCents, taxCents, totalCents);
  const insertLine = db.prepare(
    'INSERT INTO order_lines (order_id, slug, qty, unit_price_cents) VALUES (?, ?, ?, ?)',
  );
  for (const l of lines) insertLine.run(info.lastInsertRowid, l.slug, l.qty, l.unitPriceCents);
  return {
    id: Number(info.lastInsertRowid),
    customer,
    items: lines.map(({ slug, name, qty, unitPrice }) => ({ slug, name, qty, unitPrice })),
    subtotal: dollars(subtotalCents),
    tax: dollars(taxCents),
    total: dollars(totalCents),
  };
}

function getOrder(db: Database.Database, id: number): StoreOrder | undefined {
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
    items: lines.map((l) => ({ slug: l.slug, name: l.name, qty: l.qty, unitPrice: dollars(l.unit_price_cents) })),
    subtotal: dollars(row.subtotal_cents),
    tax: dollars(row.tax_cents),
    total: dollars(row.total_cents),
  };
}

function listProducts(db: Database.Database): StoreProduct[] {
  const rows = db.prepare('SELECT slug, name, price_cents FROM products ORDER BY name').all() as {
    slug: string;
    name: string;
    price_cents: number;
  }[];
  return rows.map((r) => ({ slug: r.slug, name: r.name, price: dollars(r.price_cents) }));
}

// ---------------------------------------------------------------------------
// HTTP plumbing + server-rendered UI (deliberately SauceDemo-shaped markup)
// ---------------------------------------------------------------------------

interface Session {
  user: string;
  cart: string[];
}
const sessions = new Map<string, Session>();

function parseCookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = v.join('=');
  }
  return out;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function send(res: ServerResponse, status: number, body: string, type = 'text/html'): void {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  send(res, status, JSON.stringify(value), 'application/json');
}

function redirect(res: ServerResponse, location: string, headers: Record<string, string> = {}): void {
  res.writeHead(302, { location, ...headers });
  res.end();
}

const page = (title: string, body: string): string =>
  `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;

function loginPage(error?: string): string {
  return page(
    'Swag Labs',
    `<form method="post" action="/login">
       <input data-test="username" name="username" placeholder="Username" />
       <input data-test="password" name="password" type="password" placeholder="Password" />
       ${error ? `<h3 data-test="error">${error}</h3>` : ''}
       <input data-test="login-button" type="submit" value="Login" />
     </form>`,
  );
}

function inventoryPage(db: Database.Database, session: Session): string {
  const items = listProducts(db)
    .map(
      (p) => `<div class="inventory_item">
        <div class="inventory_item_name">${p.name}</div>
        <div class="inventory_item_price">$${p.price.toFixed(2)}</div>
        <form method="post" action="/cart/add">
          <input type="hidden" name="slug" value="${p.slug}" />
          <button data-test="add-to-cart-${p.slug}" type="submit">Add to cart</button>
        </form>
      </div>`,
    )
    .join('');
  const badge = session.cart.length ? `<span class="shopping_cart_badge">${session.cart.length}</span>` : '';
  return page('Products', `<a class="shopping_cart_link" href="/cart.html">${badge}</a><div class="inventory_list">${items}</div>`);
}

function cartPage(db: Database.Database, session: Session): string {
  const items = session.cart
    .map((slug) => listProducts(db).find((p) => p.slug === slug))
    .filter((p): p is StoreProduct => Boolean(p))
    .map(
      (p) => `<div class="cart_item"><div class="inventory_item_name">${p.name}</div><div class="inventory_item_price">$${p.price.toFixed(2)}</div></div>`,
    )
    .join('');
  return page('Your Cart', `${items}<a data-test="checkout" href="/checkout-step-one.html">Checkout</a>`);
}

function checkoutInfoPage(): string {
  return page(
    'Checkout: Your Information',
    `<form method="post" action="/checkout-step-two">
       <input data-test="firstName" name="firstName" placeholder="First Name" />
       <input data-test="lastName" name="lastName" placeholder="Last Name" />
       <input data-test="postalCode" name="postalCode" placeholder="Zip/Postal Code" />
       <input data-test="continue" type="submit" value="Continue" />
     </form>`,
  );
}

function checkoutOverviewPage(db: Database.Database, session: Session): string {
  const lines = session.cart.map((slug) => {
    const p = listProducts(db).find((x) => x.slug === slug);
    if (!p) throw new Error(`cart contains unknown slug ${slug}`);
    return { qty: 1, unitPriceCents: cents(p.price) };
  });
  const t = computeTotals(lines);
  return page(
    'Checkout: Overview',
    `<div class="summary_subtotal_label">Item total: $${fmt(t.subtotalCents)}</div>
     <div class="summary_tax_label">Tax: $${fmt(t.taxCents)}</div>
     <div class="summary_total_label">Total: $${fmt(t.totalCents)}</div>
     <form method="post" action="/checkout/complete">
       <button data-test="finish" type="submit">Finish</button>
     </form>`,
  );
}

function completePage(orderId: number): string {
  return page(
    'Checkout: Complete!',
    `<h2 class="complete-header">Thank you for your order!</h2>
     <div data-test="order-id">${orderId}</div>`,
  );
}

export interface RunningStore {
  port: number;
  baseURL: string;
  close: () => Promise<void>;
}

export async function startStoreServer(port = 0): Promise<RunningStore> {
  const db = initDb();
  const server: Server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;
      const cookies = parseCookies(req);
      const session = cookies.session ? sessions.get(cookies.session) : undefined;

      // ---- test-only reset: deterministic order state per spec ----
      if (req.method === 'POST' && path === '/__test__/reset') {
        db.exec('DELETE FROM order_lines; DELETE FROM orders;');
        sessions.clear();
        return sendJson(res, 200, { ok: true });
      }

      // ---- REST API ----
      if (path === '/api/products' && req.method === 'GET') {
        return sendJson(res, 200, listProducts(db));
      }
      const productMatch = path.match(/^\/api\/products\/(.+)$/);
      if (productMatch && req.method === 'GET') {
        const product = listProducts(db).find((p) => p.slug === decodeURIComponent(productMatch[1]));
        return product ? sendJson(res, 200, product) : sendJson(res, 404, { error: 'product not found' });
      }
      if (path === '/api/orders' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}') as {
          customer?: string;
          items?: { slug: string; qty: number }[];
        };
        if (!body.customer || !Array.isArray(body.items) || body.items.length === 0) {
          return sendJson(res, 400, { error: 'customer and a non-empty items array are required' });
        }
        const result = createOrder(db, body.customer, body.items);
        return 'error' in result ? sendJson(res, 400, result) : sendJson(res, 201, result);
      }
      const orderMatch = path.match(/^\/api\/orders\/(\d+)$/);
      if (orderMatch && req.method === 'GET') {
        const order = getOrder(db, Number(orderMatch[1]));
        return order ? sendJson(res, 200, order) : sendJson(res, 404, { error: 'order not found' });
      }
      const exportMatch = path.match(/^\/api\/orders\/(\d+)\/export\.xlsx$/);
      if (exportMatch && req.method === 'GET') {
        const order = getOrder(db, Number(exportMatch[1]));
        if (!order) return sendJson(res, 404, { error: 'order not found' });
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('OrderSummary');
        ws.addRow(['Name', 'Qty', 'Unit Price', 'Line Total']);
        for (const i of order.items) ws.addRow([i.name, i.qty, i.unitPrice, Math.round(i.qty * i.unitPrice * 100) / 100]);
        ws.addRow(['Subtotal', '', '', order.subtotal]);
        ws.addRow(['Tax', '', '', order.tax]);
        ws.addRow(['Total', '', '', order.total]);
        const buffer = await wb.xlsx.writeBuffer();
        res.writeHead(200, {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="order-${order.id}.xlsx"`,
        });
        return res.end(Buffer.from(buffer));
      }

      // ---- Web UI ----
      if (path === '/' && req.method === 'GET') return send(res, 200, loginPage());
      if (path === '/login' && req.method === 'POST') {
        const form = new URLSearchParams(await readBody(req));
        const user = form.get('username') ?? '';
        const pass = form.get('password') ?? '';
        if (user === 'locked_out_user') {
          return send(res, 200, loginPage('Epic sadface: Sorry, this user has been locked out.'));
        }
        if (user === 'standard_user' && pass === 'secret_sauce') {
          const token = randomUUID();
          sessions.set(token, { user, cart: [] });
          return redirect(res, '/inventory.html', { 'set-cookie': `session=${token}; Path=/; HttpOnly` });
        }
        return send(res, 200, loginPage('Epic sadface: Username and password do not match any user in this service'));
      }
      if (!session) return redirect(res, '/');
      if (path === '/inventory.html') return send(res, 200, inventoryPage(db, session));
      if (path === '/cart/add' && req.method === 'POST') {
        const form = new URLSearchParams(await readBody(req));
        const slug = form.get('slug');
        if (slug) session.cart.push(slug);
        return redirect(res, '/inventory.html');
      }
      if (path === '/cart.html') return send(res, 200, cartPage(db, session));
      if (path === '/checkout-step-one.html') return send(res, 200, checkoutInfoPage());
      if (path === '/checkout-step-two' && req.method === 'POST') {
        await readBody(req); // customer info accepted; the demo does not persist it
        return send(res, 200, checkoutOverviewPage(db, session));
      }
      if (path === '/checkout/complete' && req.method === 'POST') {
        const items = session.cart.map((slug) => ({ slug, qty: 1 }));
        const result = createOrder(db, session.user, items);
        if ('error' in result) return send(res, 400, result.error, 'text/plain');
        session.cart = [];
        return send(res, 200, completePage(result.id));
      }
      return send(res, 404, 'not found', 'text/plain');
    } catch (err) {
      return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('store server did not bind a port');
  return {
    port: address.port,
    baseURL: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        db.close();
        server.close(() => resolve());
      }),
  };
}

// Standalone run: npm run build is not part of this repo's flow, so the
// specs start the server in-process; this entry exists for manual poking
// via a TS runner and is not used by the test suite.
if (require.main === module) {
  void startStoreServer(Number(process.env.PORT ?? 3210)).then((s) => {
    console.log(`demo store listening at ${s.baseURL}`);
  });
}
