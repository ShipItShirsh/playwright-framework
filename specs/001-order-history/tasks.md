# Tasks: Order History for the Demo Store

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Prerequisites**: constitution (`.specify/memory/constitution.md`) — all gates pass, no exceptions recorded.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story from spec.md the task serves (US1/US2/US3)

## Phase 1: Foundational (store + layers)

- [ ] T001 [P] Add `listOrders(db, customer)` to `tests/sut/store-server.ts`, reusing the `getOrder` hydration so list and single-order shapes cannot drift
- [ ] T002 [P] Add `readStoreOrdersByCustomer(customer)` to `tests/tasks/store.ts` (read-only handle, newest first)
- [ ] T003 [P] Add the orders route and history selectors (`orderHistoryLink`, `orderRow`, `orderId`, `orderSubtotal`, `orderTax`, `orderTotal`, `ordersEmpty`) to `tests/drivers/index.ts`

## Phase 2: User Story 1 - See past orders after checkout (Priority: P1) 🎯 MVP

- [ ] T004 [US1] In `tests/sut/store-server.ts`: `GET /api/orders?customer=<name>` returns the customer's orders newest first (`400` without the parameter), and `GET /orders.html` renders the session user's orders per the plan's contract
- [ ] T005 [US1] In `tests/sut/store-server.ts`: inventory page links to `/orders.html` (`data-test="order-history-link"`)
- [ ] T006 [US1] Test in `tests/same-system/order-history.spec.ts`: UI checkout → history page shows the order with checkout totals → list API and database reads equal the page exactly (@smoke @regression)

## Phase 3: User Story 2 - Multiple orders, newest first (Priority: P2)

- [ ] T007 [US2] Test in `tests/same-system/order-history.spec.ts`: two UI orders appear newest-first with their own totals (@regression)
- [ ] T008 [US2] Test in `tests/same-system/order-history.spec.ts`: an API order for another customer never appears in the signed-in user's history, on the page or in their list-API view (@regression)

## Phase 4: User Story 3 - Empty history and signed-out access (Priority: P3)

- [ ] T009 [US3] Test in `tests/same-system/order-history.spec.ts`: fresh user sees "You have no orders yet." and zero rows (@regression)
- [ ] T010 [US3] Test in `tests/same-system/order-history.spec.ts`: opening `/orders.html` with no session redirects to the login page (@regression)

## Phase 5: Polish

- [ ] T011 [P] README: short "Spec-driven development" note pointing at `.specify/` and `specs/001-order-history/`
- [ ] T012 `npm run typecheck` clean; same-system + unit projects green locally; full suite green in CI after push

## Dependencies

- T001–T003 are independent of each other. T004 needs T001. T006 needs T002–T005. T007–T010 need T006's spec file to exist. T012 is last.

## Notes

- Test count goes from 26 to 30 (4 new tests). CI is the arbiter for the public-demo projects, which cannot run from every environment.
