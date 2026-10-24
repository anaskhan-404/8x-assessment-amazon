# Backend integration

The app uses Better Auth email/password authentication, Neon PostgreSQL, Drizzle and hosted Stripe Checkout in **test mode only**. The existing sign-in/sign-up screens are wired to Better Auth. The root introduction remains a presentation gate; `parallel-demo-browsing` never grants account or order access.

## Configuration

Use ignored `.env.local`, with the names in `.env.example`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection URL with TLS (`sslmode=require`) |
| `BETTER_AUTH_URL` | Exact application origin, initially `http://localhost:3000`; use HTTPS in deployment |
| `BETTER_AUTH_SECRET` | Random secret, at least 32 characters; keep stable across deployments |
| `STRIPE_SECRET_KEY` | `sk_test_...` server key; live keys are rejected |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` for this exact webhook endpoint or Stripe CLI listener |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional `pk_test_...`; stored as requested, but hosted redirect checkout does not need Stripe.js |

The supplied Stripe test keys and a generated auth secret are stored only in ignored local configuration. No credentials are included in migrations, fixtures, or this document. Initialization is lazy; unrelated static builds do not connect to the database or Stripe. Missing runtime configuration returns a service error instead of falling back to demo authentication.

## Database commands

```sh
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:generate` writes versioned SQL under `drizzle/`; `db:migrate` applies it. `db:seed` transactionally upserts the **existing** exports from `src/data.ts` (including `src/marketplace-data.ts`). Re-running the seed preserves user data and historical references and deactivates products removed from the catalogue. The first migration assumes a fresh database. If a database was previously created with `db:push`, baseline/reconcile it before applying the initial migration; do not delete existing data.

The curated TypeScript catalogue is the authoring source for IDs, categories, display prices and specifications. The seeded database is the server's operational source for cart/checkout pricing. Deploy catalogue changes together with `db:seed`; do not independently edit database product prices while the frontend still renders curated prices. No shared `Product` types or comparison engine were changed by the backend.

Tables: `auth_user`, `auth_session`, `auth_account`, `auth_verification`, `auth_rate_limit`, `categories`, `products`, `carts`, `cart_items`, `customer_addresses`, `orders`, `order_items`, `payment_events`, `wishlist_items`.

Passwords are hashed by Better Auth, not custom application code. Sessions use HttpOnly cookies and persisted revocable session records. The library manages session renewal, CSRF/origin checks and auth rate limits. In deployment, configure your trusted reverse proxy's IP forwarding in Better Auth if individual IP throttling is needed; absent a trusted IP it safely falls back to a shared per-route bucket. No email service is configured, so email verification and password recovery are not enabled. Email sign-in is supported; phone sign-in is not.

## Frontend contract

All application API responses are JSON with `Cache-Control: no-store`. Errors have `{ error: string, issues?: [...] }`. Mutation requests must carry the configured same-site `Origin`; cart/wishlist JSON mutations use `Content-Type: application/json`. Bodies reject extra price/total fields. Authentication credentials go through Better Auth at `/api/auth/*`.

| Endpoint | Contract |
| --- | --- |
| `GET /api/auth/get-session` | Better Auth session/user or null |
| `POST /api/auth/sign-up/email` | `{name,email,password}`; creates account and session |
| `POST /api/auth/sign-in/email` | `{email,password}` |
| `POST /api/auth/sign-out` | Revokes session |
| `GET /api/cart` | `{items,currency:'usd',totalCents}` |
| `POST /api/cart` | `{productId,quantity}` adds quantity |
| `PATCH /api/cart` | `{productId,quantity}` sets quantity |
| `DELETE /api/cart` | `{productId}` removes line |
| `POST /api/cart/merge` | Authenticated; atomically merges the cookie's guest cart |
| `GET /api/wishlist` | Authenticated `{items}` |
| `POST /api/wishlist` / `DELETE /api/wishlist` | Authenticated `{productId}` |
| `POST /api/checkout` | Authenticated; no pricing/body needed; returns `{url,orderId}` |
| `GET /api/orders` | Authenticated `{orders}` (latest 100) |
| `GET /api/orders/:id` | Authenticated `{order,items}`, owner only; otherwise 404 |
| `POST /api/stripe/webhook` | Raw Stripe body + signature; no browser Origin required |

Cart items: `{productId,name,slug,image,quantity,unitPriceCents,available}`. Wishlist items: `{productId,name,slug,image,price,available}` where price is a decimal dollar string. Order snapshots and cart totals use integer cents. Checkout ignores any browser price claims and snapshots server database product names/prices/quantities.

Guests use a random 256-bit HttpOnly cookie, with only its SHA-256 digest stored as the database cart owner. Authenticated carts are keyed to the user ID. Sign-in triggers a merge; retries are safe. The guest cart is deleted only after the merge commits. Combined quantities cap at 99; more than 50 distinct products returns 409 and preserves both carts. The cookie lasts 30 days; old guest database rows can be periodically cleaned up by an operator.

The frontend agent owns shopping presentation and uses these APIs through `ShoppingProvider`. Protected `/orders`, `/orders/:id`, and `/wishlist` loaders validate actual sessions server-side. `/account` renders either the existing auth form or a signed-in account summary with sign-out.

## Stripe setup and payment lifecycle

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Put that listener's `whsec_...` into `.env.local` and restart the app. For a deployed app, register its HTTPS `/api/stripe/webhook` endpoint in Stripe test mode. Use the Stripe SDK API version `2026-09-30.endive` for event payloads. Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

The checkout route requires the webhook secret before creating sessions. It accepts card payments in test mode, collects billing/shipping details on Stripe, and supports US/CA/GB/PK shipping addresses. Shipping is free and additional tax is zero in this assessment. The application stores no card data. Successful payment stores an order address snapshot and customer address record.

An order and its line items are created transactionally before contacting Stripe. One unique `(cart_id, cart_version)` order and an order-specific Stripe idempotency key protect retries and duplicate clicks. Session parameters use frozen order snapshots. Old ambiguous attempts without a saved session ID are blocked after 23 hours, before Stripe's guaranteed idempotency retention expires; updating the cart starts a new attempt.

Verified webhook events must match order ID, user metadata, session ID, currency and exact amount. Event IDs are deduplicated within the same transaction as the payment update. Paid orders cannot be downgraded by late failure/expiration events. An unpaid completion stays pending. A verified expired/failed event allows a new checkout attempt. Cart contents clear on payment only if the cart version still matches; later shopping changes remain saved.

Stripe success returns to the protected `/orders/:id` page, which reads the database status. The URL never confirms payment. Cancellation returns to `/cart?checkout=cancelled`, preserves the cart and pending order, and permits resuming the open Stripe session. Cancellation itself does not change payment status.

## Verification

```sh
npm run test:backend
npm run test:catalogue
npm run lint
npm run build
node --conditions=react-server --import tsx scripts/check-stripe.ts
```

Backend tests run actual SQL migrations twice and seed twice against disposable embedded PostgreSQL (PGlite), with the same Drizzle schema and queries. They exercise Better Auth registration, hashed passwords, sessions, logout, wrong-password/origin rejection, guest cart merge, trusted totals, owner checks, order reuse, signature verification, payment mismatches, replay protection and late events. PGlite validates PostgreSQL behavior but does not validate Neon networking or production deployment.

Live Neon migrations/seeding, browser registration with Neon, complete Stripe Checkout payment, and delivery of real Stripe webhook events require the missing deployment configuration. Do not interpret passing local tests or a successful build as verification of those external services. See the delivery report for actual command results.
