# Feature Specification: Order Detail for the Demo Store

**Feature Branch**: `002-order-detail`
**Created**: 2026-11-17
**Status**: Draft (clarified same day — see Clarifications)
**Input**: "From the order history (001), a signed-in user should be able to open one order and see its full line items, with totals that match everywhere."

Builds on [001-order-history](../001-order-history/spec.md): the history page lists orders; this feature adds the per-order view it links to.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open one order and see its line items (Priority: P1)

A shopper on the order history page opens one order and sees every
item in it — name, quantity, unit price, and line total — plus the
order's subtotal, tax, and total, so they can check exactly what they
paid for without leaving the store.

**Why this priority**: This is the whole feature. The history page
(001) shows totals; the detail is where a shopper verifies them.

**Independent Test**: Place one multi-item order through the UI, open
its detail from the history page, and check the lines and totals. The
same order must read identically from the single-order API, the
database, and the order's xlsx export.

**Acceptance Scenarios**:

1. **Given** a signed-in user with a completed order, **When** they
   open the order's detail from the history page, **Then** the detail
   page shows each item with quantity, unit price, and line total,
   and the order's subtotal, tax, and total.
2. **Given** the same order, **When** it is read through the
   single-order API, directly from the database, and through the
   xlsx export, **Then** all four views (detail page, API, database,
   export) agree on items and totals exactly.

---

### User Story 2 - Other people's orders stay private (Priority: P2)

A signed-in user who opens the detail URL for an order that belongs
to a different customer gets a plain "order not found" response —
the same response as for an order number that does not exist — so
order numbers cannot be used to probe other customers' purchases.

**Why this priority**: The history page (001) already filters to the
signed-in user's own orders; the detail URL must not become a way
around that filter.

**Independent Test**: Create an order for another customer through
the API, sign in, open that order's detail URL directly, and check
the response is "order not found" with none of the order's data on
the page.

**Acceptance Scenarios**:

1. **Given** an order belonging to a different customer, **When** the
   signed-in user opens its detail URL, **Then** the page shows
   "Order not found" and none of that order's items or totals.
2. **Given** an order number that does not exist, **When** the
   signed-in user opens its detail URL, **Then** the page shows the
   same "Order not found" response — the two cases are
   indistinguishable.

---

### User Story 3 - Signed-out access (Priority: P3)

A signed-out visitor who opens a detail URL is sent to the login
page, under the store's existing signed-in rule for UI pages.

**Why this priority**: Same safety basic as 001's history page;
ranked after the main flow.

**Independent Test**: In a fresh session, open a detail URL and check
it lands on the login page.

**Acceptance Scenarios**:

1. **Given** no signed-in session, **When** an order detail URL is
   opened, **Then** the visitor is redirected to the login page.

---

### Edge Cases

- An order with several units of one product (placed through the
  API) shows the quantity and a line total of qty × unit price.
- A missing or non-numeric order id in the URL is treated as "order
  not found", not an error page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each order row on the history page MUST link to that
  order's detail page.
- **FR-002**: The detail page MUST show the order number, each item's
  name, quantity, unit price, and line total, and the order's
  subtotal, tax, and total.
- **FR-003**: The detail page MUST be served only for an order whose
  customer is the signed-in user. Any other order number — another
  customer's, or one that does not exist — MUST return the same
  "Order not found" page with HTTP 404.
- **FR-004**: Opening a detail URL without a session MUST redirect to
  the login page (the store's existing signed-in rule for UI pages).
- **FR-005**: The items and totals on the detail page MUST equal the
  single-order API, the database row, and the xlsx export of the
  same order, exactly.
- **FR-006**: No new API endpoint is introduced; the detail page reads
  the same order record the existing `GET /api/orders/:id` returns.

### Key Entities

- **Order** (existing, unchanged): id, customer, items (slug, name,
  qty, unit price), subtotal, tax, total. Line total is derived
  (qty × unit price), never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every acceptance scenario above is covered by an
  automated test in the same-system project, and the full suite
  passes in CI.
- **SC-002**: For a checked-out order, the detail page, the
  single-order API, the database, and the xlsx export agree exactly
  on items and totals (no tolerance).
- **SC-003**: No existing test changes behavior: the pre-feature suite
  (31 tests) still passes unchanged alongside the new tests.

## Clarifications

### Session 2026-11-17

- Q: What URL shape? → A: `/order.html?id=<n>`, consistent with the
  store's flat `.html` pages; the id is read from the query string.
- Q: Should another customer's order show a different response than a
  nonexistent one? → A: No — identical "Order not found" (404) for
  both, so the response never confirms an order exists.
- Q: New API endpoint for the detail? → A: No. `GET /api/orders/:id`
  already returns the full order; the page renders from the same
  record (FR-006).
- Q: Are line totals stored? → A: No — derived as qty × unit price,
  the same arithmetic the xlsx export already performs.
- Q: Exact not-found wording? → A: "Order not found".

## Assumptions

- The detail page is reached primarily from the history page link,
  but direct URL access behaves identically (same session and
  ownership rules).
- Money formatting matches the history page and checkout overview
  (`Item total: $X` / `Tax: $X` / `Total: $X`).
