# FarmDirect Backend — Phases A through H (complete)

Modular-monolith Express + TypeScript API for FarmDirect, now fully integrated with the React frontend.

- **Phase A:** project scaffold, environment config, PostgreSQL connection, PostGIS/enum foundation migration, health check route.
- **Phase B:** the full table schema (23 tables across identity/catalog/commerce/social) and a development seed script matching the frontend's mock data.
- **Phase C:** authentication (register/login/refresh/logout/forgot-password/reset-password) and `GET`/`PUT /api/users/me`.
- **Phase D:** read-only catalog APIs — farmer public profiles, farms, products.
- **Phase E:** farmer write operations — farm and product create/update/delete (owner-scoped), and inventory adjustment with an append-only movement ledger.
- **Phase F:** commerce — cart, addresses, and orders (creation from cart, the canonical status lifecycle, and the farmer kanban view).
- **Phase G:** reviews and favorites (all six split tables from decision #1, both read and write), notifications, and the `farms/nearby` PostGIS radius search.
- **Phase H (this update):** three real bugs found and fixed while wiring the frontend to this API, plus product image support that Phase E had never actually built.

## Bugs found and fixed during Phase H integration

Frontend integration is where mismatches between what a backend *returns* and what a UI *needs* actually surface — these three were caught by wiring real pages against real responses, not by re-reading the code:

1. **`GET`/`PUT /api/users/me` returned the raw snake_case DB row** (`full_name`, `avatar_url`, `date_of_birth`, …) instead of the camelCase shape every other endpoint in this API uses. The frontend's profile pages read `profile.fullName` and silently got `undefined` everywhere. Fixed in `user.service.ts` with a proper `toProfileDto`/`toUserDto` shaping layer.
2. **`PUT /api/users/me` leaked `password_hash` in the response body.** The old code returned `{ ...user, profile }`, spreading the *entire* raw `users` row — bcrypt hash included — into the JSON sent to the client. Never caught in Phase C's testing because that phase only checked the fields it expected to see, not the full response body. Fixed by the same `toUserDto` rewrite; verified live that the hash is now absent.
3. **Order responses never included the delivery address**, even though `orders.delivery_address_snapshot` has been stored since Phase F. The order-tracking page needs to display it and had nothing to read. Added `deliveryAddress` to `toOrderSummary` in `order.service.ts`.
4. **Product creation/editing never accepted image URLs at all** — `POST`/`PUT /api/products` had no `images` field, and nothing wrote to `product_images`. Added `images?: string[]` to both schemas and models; update does a full replace (delete-then-reinsert) rather than an append, matching how the edit form resubmits the complete current set.

All four were fixed at the source (validation schema → model → service), typechecked, rebuilt, and re-verified live against the running database — not patched around in the frontend.



## Prerequisites

- Node.js 18+
- A PostgreSQL 14+ database you can enable the `postgis` extension on (local install, Docker, or a managed provider that allows `CREATE EXTENSION`)

## Setup

```bash
npm install
cp .env.example .env
# edit .env with your real DATABASE_URL and generate real secrets for
# JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (e.g. `openssl rand -hex 32`)
```

### Local Postgres via Docker (optional, if you don't already have one)

```bash
docker run --name farmdirect-postgres \
  -e POSTGRES_USER=farmdirect \
  -e POSTGRES_PASSWORD=farmdirect \
  -e POSTGRES_DB=farmdirect_dev \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4
```

(Using the `postgis/postgis` image means the extension is available to enable — you still need `CREATE EXTENSION postgis;` to actually turn it on for the database, which the first migration does for you.)

## Run all migrations

```bash
npm run migrate:up
```

This runs 5 migrations in order:

1. Enables `pgcrypto` + `postgis`, creates all 6 enum types (`user_role`, `product_category`, `farming_method`, `availability_status`, `movement_reason`, `order_status`)
2. **Identity:** `users`, `customer_profiles`, `farmer_profiles`, `refresh_tokens`, `password_reset_tokens` — plus the shared `set_updated_at` trigger function every mutable table reuses
3. **Catalog:** `farms` (with `geography(Point,4326)` + GIST index), `farm_images`, `products`, `product_images`, `inventory_movements`
4. **Commerce:** `addresses` (with a partial unique index enforcing one default per customer), `cart_items`, `orders`, `order_items`, `order_status_events` — plus the deferred `inventory_movements.order_id` foreign key that couldn't be added until `orders` existed
5. **Social:** `product_reviews`/`farm_reviews`/`farmer_reviews` and `product_favorites`/`farm_favorites`/`farmer_favorites` (six real-FK tables per decision #1, not polymorphic), `notification_preferences`, `notifications`

Every migration has a working `down` — verified by rolling all four table migrations back and re-applying during development.

To roll back the most recent migration: `npm run migrate:down`.

## Seed development data

```bash
npm run seed
```

Populates the database with data matching `src/data/*.ts` in the frontend: 4 farmers with their farms (Ravi's Organic Farm, Green Acres, Sunrise Valley Farm, Miller's Field — with real lat/lng so PostGIS queries return real distances), 10 products, 1 customer (Alex Johnson) with a default address, a few favorites and reviews, and 3 orders including one mid-lifecycle (`OUT_FOR_DELIVERY`) with a full `order_status_events` history and two completed ones.

All seeded accounts share one dev-only password, printed at the end of the script output. The script is safe to re-run — it truncates and reseeds rather than erroring on conflict.

## Try the auth flow

```bash
# Register (sets an httpOnly refresh-token cookie, scoped to /api/auth)
curl -c cookies.txt -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPass123!","role":"customer","fullName":"Your Name"}'

# Use the returned accessToken on protected routes
curl http://localhost:4000/api/users/me -H "Authorization: Bearer <accessToken>"

# Refresh (reads the cookie, rotates it, returns a new access token)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:4000/api/auth/refresh

# Logout (revokes the current refresh token, clears the cookie)
curl -b cookies.txt -X POST http://localhost:4000/api/auth/logout
```

Farmer registration additionally requires a `farmName` field in the body (validated, not yet persisted to a `farms` row — that happens via `POST /api/farms` in Phase D, since a farmer can own zero-to-many farms per decision #3).

Or use the seeded accounts from `npm run seed` (e.g. `ravi.kumar@farmdirect.dev` / the printed dev password) to log in as an existing farmer or customer.

## Try the catalog endpoints

```bash
# List farms — filters: category, verified_only, search; paginated
curl "http://localhost:4000/api/farms?category=Vegetables&verified_only=true"

# Farm detail, its products, its reviews
curl "http://localhost:4000/api/farms/<farmId>"
curl "http://localhost:4000/api/farms/<farmId>/products"
curl "http://localhost:4000/api/farms/<farmId>/reviews"

# Farms owned by the logged-in farmer (role-gated, note this route is
# registered before "/:id" so "mine" isn't parsed as a farm id)
curl "http://localhost:4000/api/farms/mine" -H "Authorization: Bearer <accessToken>"

# Products — filters: category, search, farm_id, sort (newest|price_asc|price_desc|rating)
curl "http://localhost:4000/api/products?sort=price_asc"
curl "http://localhost:4000/api/products/<productId>"          # includes images[] and reviews[] inline
curl "http://localhost:4000/api/products/<productId>/related"

# Farmer public profile — includes every farm that farmer owns
curl "http://localhost:4000/api/farmers/<farmerId>"
curl "http://localhost:4000/api/farmers/<farmerId>/products"    # merged across all their farms
curl "http://localhost:4000/api/farmers/<farmerId>/reviews"
```

All list endpoints return `{ data, meta: { page, limit, total } }`. `page`/`limit` query params are honored and clamped (max 100 per page).

## Try the farmer write endpoints

```bash
# Create a farm (latitude/longitude optional — can be added later via PUT)
curl -X POST http://localhost:4000/api/farms \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"My New Farm","category":"Vegetables","farmingMethod":"Organic","latitude":19.99,"longitude":73.78}'

# Update / delete — only the owning farmer can; anyone else gets 403, a
# nonexistent id gets 404
curl -X PUT http://localhost:4000/api/farms/<farmId> -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"description":"..."}'
curl -X DELETE http://localhost:4000/api/farms/<farmId> -H "Authorization: Bearer <accessToken>"

# Add a product to one of your own farms — ownership of farmId is checked
# even though it's in the body, not the URL
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"farmId":"<farmId>","name":"Tomatoes","category":"Vegetables","price":38,"unit":"kg","stock":100}'

# Inventory — list everything you own, adjust stock (harvest/sale/adjustment/
# order_cancelled), see the movement ledger
curl "http://localhost:4000/api/inventory" -H "Authorization: Bearer <accessToken>"
curl -X POST "http://localhost:4000/api/inventory/<productId>/adjust" \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"change":50,"reason":"harvest","note":"Fresh pick"}'
curl "http://localhost:4000/api/inventory/<productId>/movements" -H "Authorization: Bearer <accessToken>"
```

Availability (`In Stock`/`Low Stock`/`Out of Stock`) is always recomputed server-side from the new stock vs. `low_stock_threshold` — never sent by the client. An adjustment that would take stock negative is rejected with a `409` and the stock is left untouched (verified live: attempted a `-60` change against a stock of `10`, confirmed the response was a clean 409 and the stock afterward was still exactly `10`, not partially applied).

## Try the commerce flow

```bash
# Cart — POST increments if the product's already in the cart, PUT sets an absolute quantity
curl -X POST http://localhost:4000/api/cart/items -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"productId":"<id>","quantity":2}'
curl -X PUT http://localhost:4000/api/cart/items/<productId> -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"quantity":5}'
curl http://localhost:4000/api/cart -H "Authorization: Bearer <accessToken>"

# Addresses — setting isDefault:true on a new/updated address atomically
# unsets any previous default (there's a partial unique index enforcing
# exactly one default per customer; the model flips the old one off first)
curl -X POST http://localhost:4000/api/addresses -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"label":"Home","addressLine":"204, Lotus Residency","city":"Pune","state":"Maharashtra","isDefault":true}'

# Place an order — either addressId (a saved address) or an inline address
# object; deliveryMethod is "standard" (₹25, 24h) or "express" (₹60, 4h)
curl -X POST http://localhost:4000/api/orders -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"addressId":"<addressId>","deliveryMethod":"express","paymentMethod":"upi"}'

curl http://localhost:4000/api/orders -H "Authorization: Bearer <accessToken>"
curl http://localhost:4000/api/orders/<orderId> -H "Authorization: Bearer <accessToken>"

# Farmer side — kanban-shaped list (only that farmer's line items per order),
# and advancing status along the canonical lifecycle
curl http://localhost:4000/api/farmer/orders -H "Authorization: Bearer <farmerAccessToken>"
curl -X PUT http://localhost:4000/api/orders/<orderId>/status -H "Authorization: Bearer <farmerAccessToken>" -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED","note":"Order accepted"}'
```

`GET /api/orders/:id` is accessible to the owning customer *or* any farmer with at least one item on that order — enforced in the service layer, not a route-level role gate, since the correct check depends on which role is asking.

## Try reviews, favorites, and nearby search

```bash
# Reviews — split per-target (decision #1), one review per customer per
# target enforced at the DB level; a second attempt gets a clean 409
curl -X POST http://localhost:4000/api/products/<id>/reviews -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"rating":5,"comment":"Great!"}'
curl -X POST http://localhost:4000/api/farms/<id>/reviews -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"rating":4}'
curl -X POST http://localhost:4000/api/farmers/<id>/reviews -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"rating":5}'
# Each write recomputes that target's cached rating/review count in the same transaction.

# Favorites — one response shaped for the frontend's tabbed Favorites page
curl http://localhost:4000/api/favorites -H "Authorization: Bearer <accessToken>"
curl -X POST http://localhost:4000/api/favorites/products/<id> -H "Authorization: Bearer <accessToken>"
curl -X DELETE http://localhost:4000/api/favorites/farms/<id> -H "Authorization: Bearer <accessToken>"

# Notifications
curl http://localhost:4000/api/notifications -H "Authorization: Bearer <accessToken>"
curl -X PUT http://localhost:4000/api/notifications/preferences -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{"promotions":false}'

# Nearby farms — PostGIS radius search, distance in km throughout (decision #4)
curl "http://localhost:4000/api/farms/nearby?lat=18.5204&lng=73.8567&radius_km=50"
curl "http://localhost:4000/api/farms/nearby?lat=18.5204&lng=73.8567&radius_km=500&category=Grains&verified_only=true"
```

## Run the dev server

```bash
npm run dev
```

Then check:

```bash
curl http://localhost:4000/api/health
```

Expected response once the DB is reachable and the migration has run:

```json
{
  "status": "ok",
  "time": "2026-08-12T...",
  "database": "connected",
  "postgis": "enabled (v3.4.x)"
}
```

## What's in these phases

**Phase A**
- `src/config/env.ts` — zod-validated environment loading; the process refuses to boot with a clear error if anything required is missing or malformed.
- `src/config/database.ts` — shared `pg` connection pool, a `query()` helper, and a `withTransaction()` helper for multi-table writes (registration, order creation, seeding, etc.).
- `src/app.ts` — Express app: `helmet`, `cors` (credentialed, for the future httpOnly refresh-token cookie), JSON body parsing, `cookie-parser`, a global rate limiter, and the error-handling chain.
- `src/server.ts` — boot sequence: verify DB connectivity before accepting traffic, graceful shutdown on `SIGINT`/`SIGTERM`.
- `src/middleware/errorHandler.ts` — central error handling via a typed `HttpError`; never leaks stack traces or raw DB errors in production responses.
- `src/middleware/rateLimiter.ts` — a generous global limiter (mounted now) and a stricter one scoped for `/api/auth/*` (ready to mount once auth routes exist in Phase C).
- `GET /api/health` — confirms the app is up, the DB is reachable, and PostGIS is actually enabled (not just installed).

**Phase B**
- `db/migrations/` — 5 migrations covering extensions/enums, identity, catalog, commerce, and social table groups. Every table, constraint, and index matches the approved architecture doc exactly (§4, §13), including the decisions from your last message: split reviews/favorites tables, the canonical `order_status` lifecycle, many-farms-per-farmer, and geography columns for the km-based PostGIS queries.
- `db/seeds/dev.ts` — realistic Indian-agriculture seed data mirroring the frontend mocks.

**Phase C**
- `src/utils/password.ts`, `src/utils/jwt.ts` — bcrypt wrapper, access-token sign/verify.
- `src/services/token.service.ts` — opaque refresh-token generation/hashing/rotation (decision #5: random 48-byte value, sha256-hashed before it touches the DB, rotated on every use).
- `src/services/auth.service.ts` — register (transactional: user + role-specific profile + notification preferences in one transaction), login, refresh, logout, forgot-password (logs a dev-only reset link — no real email provider this phase), reset-password (consumes the token, revokes every refresh token for that user).
- `src/services/user.service.ts` — `GET`/`PUT /api/users/me` business logic.
- `src/models/` — `user`, `customerProfile`, `farmerProfile`, `refreshToken`, `passwordResetToken`, `notificationPreferences` — thin, typed query functions, each optionally transaction-scoped.
- `src/middleware/requireAuth.ts`, `requireRole.ts` — JWT verification and role-gating (role-gating isn't exercised by any route yet; the first role-restricted routes — `POST /api/farms`, `POST /api/products`, etc. — land in Phase D+).
- `src/middleware/validate.ts` + `src/validation/*.schemas.ts` — zod request-body validation.
- `src/controllers/auth.controller.ts` — the only place that touches the httpOnly cookie; sets it on register/login/refresh, clears it on logout, scoped to `/api/auth` with `sameSite=lax` and `secure` driven by `COOKIE_SECURE`.
- Routes: `POST /api/auth/{register,login,refresh,logout,forgot-password,reset-password}`, `GET`/`PUT /api/users/me`.

All of the above was tested against the live Phase A/B database, not just typechecked: registration → login → protected route → refresh (with rotation) → logout → attempted reuse of the revoked token (fails, as it should), duplicate-email registration (409), wrong password (401), missing `farmName` for farmer role (400), weak password (400), and the full forgot/reset-password cycle including one-time token consumption.

**Phase D**
- `src/models/{farm,product,farmImage,productImage,productReview,farmReview,farmerReview}.model.ts` — thin, typed read queries. Farm/product list queries build their `WHERE` clause dynamically from whichever filters were actually passed, with parameterized values throughout (no string-built SQL).
- `src/services/{farm,product,farmer}.service.ts` — shape DB rows (snake_case, string-typed numerics from `pg`) into camelCase API DTOs; `product.service.ts`'s `toProductSummary` is shared by the product routes and reused inside `farm.service.ts`/`farmer.service.ts` so a product looks identical everywhere it appears.
- `src/utils/pagination.ts` — shared `?page=&limit=` parsing (clamped to a max of 100) and the `{ data, meta }` response shape used by every list endpoint.
- Routes: `GET /api/farmers/:id[/products|/reviews]`, `GET /api/farms`, `GET /api/farms/mine` (role-gated, registered before `/:id` to avoid being swallowed by the id param — verified live, not just reasoned about), `GET /api/farms/:id[/products|/reviews]`, `GET /api/products`, `GET /api/products/:id[/related]`.

Tested live against the seeded database: category/verified/search filters on farms, category/search/sort (`price_asc` confirmed returning ascending order) on products, farm and product detail (product detail correctly nests its `reviews[]` and aggregated `rating`/`reviewCount`), 404s for unknown ids, the farmer public profile correctly listing every farm a multi-farm farmer owns, `/farms/mine` returning 401 unauthenticated and 403 for a customer token (role gate working), and confirmed route-ordering means `/farms/mine` never gets misrouted to the `/farms/:id` handler.

**Phase E**
- `src/middleware/requireOwnership.ts` — `requireFarmOwnership`/`requireProductOwnership`: 404 if the resource doesn't exist, 403 if it exists but isn't the caller's.
- `src/models/{farm,product}.model.ts` extended with `insert*`/`update*`/`soft delete*` and cheap `find*OwnerId` lookups used by the ownership middleware.
- `src/models/inventoryMovement.model.ts` — the append-only ledger: insert, list-by-product (paginated), and a batched "latest movement per product" query for the inventory list view.
- `applyStockChange` (in `product.model.ts`) applies a stock delta and recomputes `availability` in one statement, guarded by `WHERE stock + $2 >= 0` — **a real bug was caught and fixed here during live testing**: the first version relied on the DB's `CHECK (stock >= 0)` constraint to reject an oversell, which produced a raw, uncaught Postgres error (500) instead of a clean `409`. Adding the guard directly to the `UPDATE ... WHERE` clause turns "would go negative" into "zero rows updated," which the service layer now translates into a proper conflict response — verified live both before and after the fix.
- `src/services/inventory.service.ts` — wraps the stock change + ledger insert in one transaction (`withTransaction`), so a rejected adjustment (or any downstream error) can't leave the two out of sync.
- `POST /api/farms` (farmer role, optional `latitude`/`longitude` building a real `geography(Point,4326)` value), `PUT`/`DELETE /api/farms/:id` (ownership-gated).
- `POST /api/products` (farmer role; `farmId` comes from the request body rather than the URL, so ownership of *that* farm is checked inside the service rather than via URL-param middleware), `PUT`/`DELETE /api/products/:id` (ownership-gated).
- `GET /api/inventory`, `GET /api/inventory/:productId/movements`, `POST /api/inventory/:productId/adjust` — all farmer-role-gated with per-product ownership checks inside the service.

Also fixed along the way: `package.json`'s `main`/`start` script pointed at `dist/server.js`, but `tsconfig.json`'s `rootDir: "."` (needed so both `src/` and `db/` compile together) actually emits to `dist/src/server.js` — caught when `npm start` failed with `MODULE_NOT_FOUND` during this phase's testing, now corrected.

Tested live: farm creation immediately visible in `/farms/mine` (second proof the many-farms-per-farmer relationship works, this time via a write, not just the seeded data); cross-farmer 403 on farm and product update/delete, with a nonexistent id correctly returning 404 instead; product creation with `stock=3` immediately computing `Low Stock` (default threshold 5); a harvest adjustment flipping it back to `In Stock`; the negative-stock rejection and rollback described above; an exact-boundary sale taking stock to precisely 0 and flipping to `Out of Stock`; soft-deleted products disappearing from both the public list and direct-fetch (404) while the underlying row survives; and zod rejecting a negative price with a clean 400.

**Phase F**
- `src/models/{cartItem,address,order,orderStatusEvent}.model.ts` — cart uses `ON CONFLICT (customer_id, product_id) DO UPDATE SET quantity = quantity + EXCLUDED.quantity` for the "add to cart" increment behavior `useCart.addItem` already has on the frontend, plus a separate absolute-set path for the PUT endpoint. Addresses handle the one-default-per-customer partial unique index by unsetting any existing default *before* the insert/update that sets a new one, in the same statement group. Orders generate a short `FD-XXXX` order number (cosmetic, separate from the uuid PK) with a retry-on-collision loop rather than a dedicated DB sequence.
- `src/services/order.service.ts` — the core of this phase:
  - **Order creation** is one transaction: verify stock availability for every cart item up front (clean `409` listing exactly which products are short, not a generic failure); snapshot the delivery address (either a saved `addressId` or an inline object) and every item's name/unit/price at time of purchase; decrement stock via the same guarded `applyStockChange` from Phase E (so a race between the pre-check and the transaction still can't oversell); write the initial `PENDING` `order_status_events` row; clear the cart — all-or-nothing.
  - **Status transitions** enforce the canonical lifecycle from decision #2 (`PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED`, `CANCELLED` reachable from any non-terminal state) — an invalid jump like `PENDING → DELIVERED` is rejected with a `409` naming the actually-allowed next states, and both `DELIVERED` and `CANCELLED` are terminal (no further transitions).
  - **Cancellation restocks inventory** — every item on a cancelled order gets its stock restored and an `order_cancelled`-reason ledger entry, finally exercising that enum value that's existed since Phase B's migration but had nothing to trigger it until now.
  - **The farmer kanban view** (`GET /api/farmer/orders`) is a pure read-side mapping over the one canonical status (`PENDING→"New"`, `CONFIRMED→"Accepted"`, …, `OUT_FOR_DELIVERY`/`DELIVERED→"Completed"`) — no second stored status field — and each farmer only sees their own line items on a shared order, not another farmer's products.
- `GET/POST/PUT/DELETE /api/cart`, `/api/addresses`, `POST/GET /api/orders`, `GET /api/orders/:id` (customer-owner-or-has-item-farmer, checked in the service), `PUT /api/orders/:id/status` (farmer), `GET /api/farmer/orders` (the exact path from the architecture doc, mounted as its own small router since it doesn't fit under `/api/orders`).

Tested live end-to-end, not just typechecked: cart add-then-add-again correctly incremented (2→4) rather than duplicating a row; PUT set an absolute quantity (kale to exactly 3) instead of incrementing; a new default address correctly flipped the old default off (confirmed only one `isDefault:true` row existed afterward); a real order placed against the seeded cart came back with exactly correct totals (₹287 subtotal + ₹60 express fee = ₹347) and the 4-hour express delivery window; **tomato stock correctly went 120 → 116** after the order and **cart was cleared**; the farmer kanban correctly showed the new order as `PENDING`/"New"; an uninvolved farmer got 403 on both viewing and updating an order he has no items on; an invalid `PENDING → DELIVERED` jump was rejected with 409 naming the real next options; a valid `PENDING → CONFIRMED` transition succeeded and appended to the status ledger; **cancelling the order restored stock to exactly 120** and the movement ledger showed the full story (`+120 harvest`, `-4 sale`, `+4 order_cancelled`); the now-terminal cancelled order correctly rejected a further transition attempt; an empty-cart checkout returned 400; and an oversell attempt (requesting 500 units of an 8-unit-stock product) returned 409 with the specific product and available stock named in the response.

**Phase G**
- `src/models/{product,farm,farmer}Review.model.ts` extended with `insert*` (all six split tables have their own insert now, matching the split-not-polymorphic design from decision #1) and `recompute*RatingCache` functions added to `product.model.ts`, `farm.model.ts`, `farmerProfile.model.ts` — each recalculates `rating_cached`/`review_count_cached` from the live review rows in the same transaction as the insert, so the cached numbers shown everywhere else in the API (product cards, farm cards, farmer profiles) never drift from the underlying reviews.
- `src/models/{product,farm,farmer}Favorite.model.ts` — three small tables, `ON CONFLICT DO NOTHING` on add and a plain `DELETE` on remove, so toggling a favorite twice is a no-op rather than an error either direction.
- `src/models/notification.model.ts` (the send-log) and `notificationPreferences.model.ts` extended with read/update (insert-default already existed from Phase C's registration flow).
- **`listFarmsNearby` in `farm.model.ts`** — the PostGIS query designed back in the architecture doc's §6 finally implemented: `ST_DWithin` filters by radius, the `<->` KNN operator (not `ST_Distance` in `ORDER BY`) drives sorting off the GIST index created in Phase B, and `ST_Distance(...)/1000` gives km directly per decision #4.
- Reviews follow the same "translate the DB's unique-constraint violation into a clean 409" pattern established in Phase E (stock guard) and Phase F (order-number retry) — catching pg error code `23505` rather than letting a duplicate-review attempt surface as a raw 500.
- `POST /api/{products,farms,farmers}/:id/reviews`, `GET /api/products/:id/reviews` (farms/farmers already had their GET from Phase D), `GET /api/favorites`, `POST`/`DELETE /api/favorites/{products,farms,farmers}/:id`, `GET /api/notifications`, `PUT /api/notifications/preferences`, `GET /api/farms/nearby` (registered before `/farms/:id`, same route-ordering pattern as `/farms/mine`).

Tested live: a genuinely fresh product review immediately recomputed the cached rating from 0/0 to 4.0/1; a second attempt at the exact same product by the exact same customer correctly hit the seed data's existing review and returned 409 (caught what looked like a bug in testing but was actually the seed script's own review firing the same protection correctly); farm and farmer reviews both recomputed their respective caches the same way; favoriting the same product twice stayed idempotent (201 both times, no duplicate, no error) and unfavoriting removed it cleanly; notification preferences updated exactly the one field requested, leaving the rest untouched; and the nearby-farms search is the standout result — querying from Sunrise Valley Farm's own coordinates returned itself at `0 km` and Ravi's Organic Farm at `163.66 km` with a 500km radius, then correctly dropped Ravi's farm entirely when the radius was tightened to 50km, and combining `category=Grains` with a 1000km radius correctly surfaced only Miller's Field at `609.81 km` — real geographic math against real coordinates, not a stubbed distance value.

**This is the full backend from the approved architecture doc.** Every phase (A through G) has been built, typechecked, compiled, and exercised against a live PostgreSQL + PostGIS database with the seeded dataset — including deliberately trying to break the trickiest parts (oversell, invalid status jumps, cross-farmer access, duplicate reviews, negative stock) rather than only testing the happy path.

## What's intentionally not here yet

**Only Phase H — frontend integration.** The backend itself is feature-complete per the architecture doc: every table, every endpoint, every decision from the approved architecture review is implemented and has been exercised against a live database. What's left is swapping the React app's mock data (`src/data/*.ts`) for real `fetch` calls to this API, endpoint by endpoint — starting with read-only catalog pages, ending with auth/cart/orders — while keeping the UI visually unchanged, per the original brief. No AI insights endpoint either (`ai_insights` remains an explicitly out-of-scope placeholder table, never on the phase list).
