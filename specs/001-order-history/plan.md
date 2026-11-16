# Implementation Plan: Order History for the Demo Store

**Branch**: `001-order-history` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

## Summary

Add an order history to the demo store: a signed-in page at
`/orders.html` listing the session user's orders (newest first, with
items and totals), a matching list endpoint `GET
/api/orders?customer=<name>`, and a same-system spec that proves the
page, the list API, and the database agree. No schema change — the
orders tables already hold everything the page shows.

## Technical Context

**Language/Version**: TypeScript (strict), Node 20+, Playwright test runner
**Primary Dependencies**: existing only — `better-sqlite3`, no new packages
**Storage**: the store's existing SQLite tables (`orders`, `order_lines`)
**Testing**: Playwright, `same-system` project (serial, in-process store, reset per test)
**Target Platform**: local + GitHub Actions CI, same as the existing suite
**Project Type**: test framework with a bundled demo system under test
**Performance Goals**: none beyond the existing suite's — history renders from one indexed-by-customer query
**Constraints**: money in integer cents inside the store; exact decimal comparison in tests
**Scale/Scope**: one demo user, demo-scale order counts; no pagination (see Complexity Tracking)

## Constitution Check

*GATE: must pass before implementation; re-checked after.*

- **I. Layered architecture** — new selectors/routes go in
  `tests/drivers/index.ts`; the database list read goes in
  `tests/tasks/store.ts`; all assertions stay in the new spec. ✔
- **II. Hard assertions only** — every scenario is asserted exactly,
  including the redirect and the empty state. No soft checks. ✔
- **III. Cross-layer parity** — the feature exists precisely to be
  checked across page ↔ list API ↔ database; totals compared exactly.
  ✔
- **IV. Determinism** — same-system project pattern reused: in-process
  store, `/__test__/reset` before each test, serial mode with the
  reason stated. ✔
- **V. Config fails fast** — no new configuration. ✔
- **VI. Session auth** — the store issues its own session; the spec
  logs in per file as the existing same-system specs do. ✔
- **Style gates** — spec titles carry `@smoke`/`@regression`; strict
  typecheck must pass. ✔

No violations; Complexity Tracking has one scoped decision only.

## Project Structure

### Documentation (this feature)

```text
specs/001-order-history/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
tests/
├── drivers/index.ts            # + orders route and history selectors
├── sut/store-server.ts         # + listOrders(), GET /api/orders list, /orders.html page, inventory link
├── tasks/store.ts              # + readStoreOrdersByCustomer()
└── same-system/
    └── order-history.spec.ts   # new spec: scenarios from spec.md
README.md                       # one short section pointing at specs/
```

**Structure Decision**: everything lands in the files that already own
that layer. No new directories, no new dependencies, no schema change.

## Data Model

Unchanged. `listOrders(db, customer)` reads `orders` for one customer
ordered by `id DESC` and hydrates lines exactly as `getOrder` does, so
list and single-order views can never disagree about shape.

## Contracts

- `GET /api/orders?customer=<name>` → `200` JSON array of `StoreOrder`
  (same shape as `GET /api/orders/:id`), newest first. Missing
  `customer` → `400 { error: 'customer query parameter is required' }`.
- `GET /orders.html` (session required) → one
  `<div class="order" data-test="order-row">` per order containing
  `[data-test="order-id"]`, item names/quantities, and
  `[data-test="order-subtotal"]`, `[data-test="order-tax"]`,
  `[data-test="order-total"]` formatted like the checkout overview
  (`Item total: $X` / `Tax: $X` / `Total: $X`). No orders →
  `<p data-test="orders-empty">You have no orders yet.</p>` and no
  rows.
- Inventory page gains `<a data-test="order-history-link"
  href="/orders.html">Order history</a>`.

## Complexity Tracking

| Decision | Why | Simpler alternative rejected |
|----------|-----|------------------------------|
| No pagination on the history page | Demo store, reset per test; order counts are single-digit in every scenario | Paging adds a second contract (page size, ordering across pages) with no scenario needing it |
| Per-spec-file database file (`STORE_DB_FILE`, added during implementation) | Found by the first local run: `fullyParallel` puts each same-system spec file in its own worker, but both files shared one SQLite file, so parity's orders leaked into this spec's history (3 rows where 2 were expected). Each spec file now gets its own DB file in the same gitignored data directory; the store resolves the path via `storeDbPath()` and the tasks layer reads the same file. | Serializing the whole project (loses parallel CI time for every future file) or per-test tenants in the store (a bigger SUT change than the feature itself) |
