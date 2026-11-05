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
} as const;
