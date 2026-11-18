/**
 * Drivers layer — raw selectors and routes ONLY.
 * No actions, no assertions. If the UI changes, this is the one file
 * that should need selector updates.
 */
export const routes = {
  login: '/',
  inventory: '/inventory.html',
  cart: '/cart.html',
  checkoutInfo: '/checkout-step-one.html',
  checkoutOverview: '/checkout-step-two.html',
  checkoutComplete: '/checkout-complete.html',
  orders: '/orders.html',
  orderDetail: (id: number) => `/order.html?id=${id}`,
} as const;

export const sel = {
  username: '[data-test="username"]',
  password: '[data-test="password"]',
  loginButton: '[data-test="login-button"]',
  loginError: '[data-test="error"]',
  inventoryItem: '.inventory_item',
  itemName: '.inventory_item_name',
  itemPrice: '.inventory_item_price',
  sortDropdown: '[data-test="product-sort-container"]',
  cartLink: '.shopping_cart_link',
  cartBadge: '.shopping_cart_badge',
  cartItem: '.cart_item',
  checkoutButton: '[data-test="checkout"]',
  firstName: '[data-test="firstName"]',
  lastName: '[data-test="lastName"]',
  postalCode: '[data-test="postalCode"]',
  continueButton: '[data-test="continue"]',
  finishButton: '[data-test="finish"]',
  completeHeader: '.complete-header',
  summarySubtotal: '.summary_subtotal_label',
  summaryTax: '.summary_tax_label',
  summaryTotal: '.summary_total_label',
  addToCartButton: (slug: string) => `[data-test="add-to-cart-${slug}"]`,
  orderHistoryLink: '[data-test="order-history-link"]',
  orderRow: '[data-test="order-row"]',
  orderId: '[data-test="order-id"]',
  orderSubtotal: '[data-test="order-subtotal"]',
  orderTax: '[data-test="order-tax"]',
  orderTotal: '[data-test="order-total"]',
  ordersEmpty: '[data-test="orders-empty"]',
  orderDetailLink: '[data-test="order-detail-link"]',
  orderDetail: '[data-test="order-detail"]',
  orderLine: '[data-test="order-line"]',
  lineTotal: '[data-test="line-total"]',
  orderNotFound: '[data-test="order-not-found"]',
} as const;
