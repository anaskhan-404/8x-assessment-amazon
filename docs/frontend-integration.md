# Marketplace frontend integration

The existing curated Product union is the merchandising source. The backend APIs are authoritative for cart prices, quantities, availability and saved wishlist entries. Comparison state, tray and page remain in the comparison workstream.

## Shared shopping state

ShoppingProvider in src/shopping-context.tsx calls the existing API routes; there is no second localStorage cart. Product cards, product detail actions, header counts, cart and wishlist consume this provider. Mutations disable shopping controls until the server responds. Errors retain the last confirmed state and show an explicit error with an account link for 401 responses. Save-for-later removes the cart line only after the wishlist write succeeds.

- GET /api/auth/get-session establishes guest/signed-in presentation.
- GET /api/cart returns items and totalCents. POST/PATCH send productId and quantity; DELETE sends productId.
- POST /api/cart/merge runs on first signed-in load; auth's existing merge also remains supported.
- GET /api/wishlist returns saved product entries. POST/DELETE send productId.
- Quantity controls use the backend range 1–99.
- API state refreshes after route changes and window focus.

## Checkout and orders

/checkout reviews the server-priced cart. POST /api/checkout (no body) returns the hosted Stripe URL. The UI never collects card/address data: Stripe collects shipping and billing addresses. The test-mode label, free shipping/no additional tax, and supported shipping countries match the backend contract. Failures stay on checkout with an actionable message; no fake success or order creation occurs. Buy now waits for a successful cart mutation before opening checkout.

The backend's /orders and /orders/[id] retain requirePageUser, ownedOrder and orderIdSchema validation. The views use database paymentStatus to distinguish pending, paid, failed and expired checkout. A return query parameter never proves payment. /order-confirmation is an informational entry to order history; its optional preview is explicitly labelled, contains no fabricated order number, and performs no operation.

/cart?checkout=cancelled displays cancellation without clearing the cart. The backend owns verified payment/cart updates.

## Ownership

Frontend: views, shared shell, product cards, shopping components and styling. Backend: auth/account integration, server/API/database/Stripe code, migrations and backend tests. Existing Cart and Wishlist component entrypoints re-export the polished views so the protected route integration remains intact.

## Verification

Build and lint operate on the full project. Browser tests use an isolated Chrome CDP session (9231) and production server (3017). Run node --import tsx tests/shopping-browser.mjs. The script explicitly intercepts API fixture responses to verify UI behavior independently of unavailable Neon/Stripe credentials; it does not claim a live payment or authentication integration test. Screenshots are under .tmp/shopping-ui. Protected signed-in order/wishlist routes require the backend environment for complete end-to-end verification.

