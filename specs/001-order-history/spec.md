# Feature Specification: Order History for the Demo Store

**Feature Branch**: `001-order-history`
**Created**: 2026-11-16
**Status**: Draft (clarified same day — see Clarifications)
**Input**: "A signed-in user of the demo store should be able to see the orders they have placed, with the same totals the checkout showed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See past orders after checkout (Priority: P1)

A shopper completes a purchase in the demo store, then opens the order
history page and sees that order listed with its number and total, so
they can confirm what they bought without re-checking email or the
database.

**Why this priority**: This is the whole feature. The store already
records orders; the shopper just has no way to see them.

**Independent Test**: Place one order through the UI, open the history
page, and check the order appears with the checkout total. The same
order must read identically from the API and the database.

**Acceptance Scenarios**:

1. **Given** a signed-in user who has completed one order, **When**
   they open the order history page, **Then** the order is listed with
   its order number, its items, and its subtotal, tax, and total.
2. **Given** the same order, **When** it is read through the orders
   list API and directly from the database, **Then** all three views
   (page, API, database) show the same items and the same totals.

---

### User Story 2 - Multiple orders, newest first (Priority: P2)

A shopper who has ordered more than once sees all of their orders on
one page, most recent first, so the order they just placed is at the
top without searching.

**Why this priority**: History is only useful if it stays readable as
orders accumulate; ordering is the one behavior a single-order test
cannot prove.

**Independent Test**: Place two orders with different totals, open the
history page, and check both appear, newest first, each with its own
totals.

**Acceptance Scenarios**:

1. **Given** a signed-in user with two completed orders, **When** they
   open the order history page, **Then** both orders are listed and
   the later order appears above the earlier one.
2. **Given** orders placed by a different customer (via the API),
   **When** the signed-in user opens their history, **Then** only
   their own orders are listed.

---

### User Story 3 - Empty history and signed-out access (Priority: P3)

A new user who has never ordered sees a clear "no orders yet" message
instead of a blank page, and a signed-out visitor who opens the
history URL is sent to the login page instead of seeing anyone's
orders.

**Why this priority**: Both are first-run and safety basics; neither
blocks the main flow, so they rank after it.

**Independent Test**: Reset the store, sign in, open history and check
the empty message; then open the history URL in a fresh session and
check it lands on the login page.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no orders, **When** they open the
   order history page, **Then** the page shows the message "You have
   no orders yet." and lists no orders.
2. **Given** no signed-in session, **When** the order history URL is
   opened, **Then** the visitor is redirected to the login page.

---

### Edge Cases

- An order placed through the API for the same customer name as the
  signed-in user appears in that user's history (the store keys orders
  by customer name; there is one demo user).
- A rejected order (unknown product) never appears in history — it was
  never persisted (already covered by the existing parity suite; the
  history tests re-check it through the list views).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The store MUST serve an order history page to a
  signed-in user listing every order recorded under their customer
  name.
- **FR-002**: Each listed order MUST show its order number, its items
  (name and quantity), and its subtotal, tax, and total.
- **FR-003**: Orders MUST be listed newest first.
- **FR-004**: The history page MUST show only the signed-in user's own
  orders.
- **FR-005**: With no orders, the page MUST show the message "You have
  no orders yet." and no order rows.
- **FR-006**: Opening the history page without a session MUST redirect
  to the login page (the store's existing signed-in rule for UI
  pages).
- **FR-007**: The store MUST expose the same list through the REST
  API: `GET /api/orders?customer=<name>` returns that customer's
  orders, newest first, in the same shape as `GET /api/orders/:id`.
- **FR-008**: The totals shown on the history page MUST equal the
  totals recorded at checkout — the page, the list API, and the
  database row must agree exactly.
- **FR-009**: The inventory page MUST link to the history page so a
  user can reach it without typing the URL.

### Key Entities

- **Order** (existing): id, customer, items (slug, name, qty, unit
  price), subtotal, tax, total. No new fields; the store records no
  order date or status, and this feature does not add any.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every acceptance scenario above is covered by an
  automated test in the same-system project, and the full suite
  passes in CI.
- **SC-002**: For a checked-out order, the history page total, the
  list API total, and the database total are exactly equal (no
  tolerance).
- **SC-003**: No existing test changes behavior: the pre-feature suite
  (26 tests) still passes unchanged alongside the new tests.

## Clarifications

### Session 2026-11-16

- Q: Should orders show a status (placed / shipped / refunded)?
  → A: No. The store records no status; adding one is a bigger feature
  and out of scope here.
- Q: Should the history show order dates? → A: No. The store records
  no timestamp; ordering is by order number, newest (highest number)
  first.
- Q: Refunded or cancelled orders — shown or hidden? → A: Neither
  state exists in the store; every recorded order is shown.
- Q: Does the list API need the session cookie? → A: No. The existing
  orders API is unauthenticated (demo store); the list endpoint
  follows the same rule and filters by the `customer` query parameter.
  The UI page does require a session, per FR-006.
- Q: Exact empty-state wording? → A: "You have no orders yet."

## Assumptions

- The single demo user (`standard_user`) is the customer name UI
  checkouts are recorded under, as the store already does.
- "Newest first" means descending order number; order numbers are
  assigned in creation order by the database.
