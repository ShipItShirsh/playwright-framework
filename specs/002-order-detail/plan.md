# Implementation Plan: Order Detail for the Demo Store

**Branch**: `002-order-detail` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

## Summary

Add an order detail page to the demo store: history rows link to
`/order.html?id=<n>`, which renders one order's line items and totals
from the same `getOrder` record the API returns. Ownership is enforced
in the page handler — an order whose customer is not the session user
gets the identical 404 "Order not found" page as a nonexistent id.
No schema change, no new API endpoint, no new dependencies.

## Technical Context

**Language/Version**: TypeScript (strict), Node 20+, Playwright test runner
**Primary Dependencies**: existing only — `better-sqlite3`, ExcelJS (export parsing in tests)
**Storage**: the store's existing SQLite tables, read through `getOrder`
**Testing**: Playwright, `same-system` project (serial, in-process store, reset per test, own DB file per spec file — the 001 lesson)
**Target Platform**: local + GitHub Actions CI, same as the existing suite
**Project Type**: test framework with a bundled demo system under test
**Constraints**: money compared exactly; line totals derived, never stored

## Constitution Check

*GATE: must pass before implementation; re-checked after.*

- **I. Layered architecture** — new selectors/route in
  `tests/drivers/index.ts`; no new tasks-layer helper is needed
  (`readStoreOrder` and `parseOrderExport` already exist); assertions
  stay in the new spec. ✔
- **II. Hard assertions only** — every scenario asserted exactly,
  including the 404 sameness (status, heading, and absence of the
  other order's data). ✔
- **III. Cross-layer parity** — the feature's main test is a four-way
  check: detail page ↔ single-order API ↔ database ↔ xlsx export. ✔
- **IV. Determinism** — same pattern as 001: in-process store, reset
  per test, serial mode, and this spec file sets its own
  `STORE_DB_FILE` (`store-order-detail.db`) so parallel workers never
  share a database file. ✔
- **V. Config fails fast** — no new configuration. ✔
- **VI. Session auth** — the store's existing session gate covers the
  new page; the spec logs in per file as the other same-system specs
  do. ✔
- **Style gates** — spec titles carry `@smoke`/`@regression`; strict
  typecheck must pass. ✔

No violations and no exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/002-order-detail/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
tests/
├── drivers/index.ts            # + orderDetail route builder and detail selectors
├── sut/store-server.ts         # + orderDetailPage(), /order.html route, history-row detail links
└── same-system/
    └── order-detail.spec.ts    # new spec: scenarios from spec.md
README.md                       # Spec Kit section now names both features
```

**Structure Decision**: the page handler reuses `getOrder` (the same
hydration the API and the 001 list use), so the detail view cannot
drift from the single-order API. Ownership is checked against
`order.customer !== session.user` in the handler; the not-found
response is one shared function so the two cases (not yours / does
not exist) are identical by construction, not by discipline.

## Contracts

- History row gains `<a data-test="order-detail-link"
  href="/order.html?id=<id>">View order</a>`.
- `GET /order.html?id=<n>` (session required):
  - Own order → `200`, `<div data-test="order-detail">` containing
    `[data-test="order-id"]`; one `<div class="order_line"
    data-test="order-line">` per item with the item name,
    `x<qty>`, unit price `$<unit>`, and line total
    `[data-test="line-total"]` `$<qty × unit>`; then
    `[data-test="order-subtotal"]`, `[data-test="order-tax"]`,
    `[data-test="order-total"]` formatted like the history page.
  - Another customer's order, a nonexistent id, or a
    missing/non-numeric id → `404` page whose body is
    `<h2>Order not found</h2>` (inside `data-test="order-not-found"`)
    and nothing else about any order.
- No API change: `GET /api/orders/:id` and
  `GET /api/orders/:id/export.xlsx` are used by the tests as-is.

## Complexity Tracking

No constitution exceptions. One scoped decision: the not-found page
returns a rendered HTML 404 rather than the plain-text style used by
the store's catch-all route, because the spec (FR-003) makes the
not-found response itself a tested behavior with a stable selector.
