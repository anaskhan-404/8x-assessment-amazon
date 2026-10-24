# Marketplace frontend integration

The existing `Product` union and curated catalogue remain the product source. Comparison state, tray and page are owned by the comparison workstream and are not duplicated here.

## Shopping state

`ShoppingProvider` in `src/shopping-context.tsx` provides cart lines, quantities, wishlist IDs and item totals. Only product IDs and quantities are persisted in `parallel:shopping:v1`. Unknown IDs and invalid quantities are discarded. Quantity is capped at 10 per item as a frontend limit, not an inventory claim. Browser storage failures fall back to memory with a visible notice. Delivery details remain in React state and are lost on refresh.

## Checkout

Pass a client-side `CheckoutAdapter` to `ShoppingProvider` from an integration wrapper. It receives `{ items: [{ productId, quantity }], delivery }` and returns `{ checkoutUrl }` from the real backend. The backend must authenticate, validate stock and quantities, resolve authoritative prices, compute delivery/tax, and create the Stripe session. No card information is collected by this UI. Errors leave the cart intact and enable retry.

Without an adapter, `/checkout` and `/checkout/review` are explicitly labelled previews. The payment button is disabled. No order is created and no payment success is simulated. `Buy now` adds the selected quantity to the existing cart and opens checkout.

## Orders and confirmation

`OrdersPage` accepts `ConfirmedOrder[]`; `OrderConfirmationView` accepts a server-verified `ConfirmedOrder`. The routes currently pass no orders, so they show honest empty/unconnected states. The backend owner should load authorized orders in the server route and pass them to these components. Never trust a query parameter as proof of payment. `/order-confirmation?preview=1` provides a labelled visual preview, without inventing an order number or paid status. Clear the cart only after verified completion; this frontend does not clear it during preview or on an unverified redirect.

## Account and initial entry

The existing account form and `src/proxy.ts` remain demo-only. `parallel-demo-browsing=1` skips the introductory account screen; it is not an auth cookie. The authentication owner should replace that entry policy when wiring real auth. Marketplace header Account links to `/account`; the rest of the catalogue remains accessible.

## Verification

`npm run build`, `npm run lint`. Browser scripts use built-in Node WebSocket/CDP and isolated Chrome; no app dependencies were added. See `tests/shopping-browser.mjs` and `tests/account-flow.mjs` for launch ports and screenshot locations.
