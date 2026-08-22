# FarmDirect — Frontend (now integrated with the real backend)

A React + Vite + TypeScript + Tailwind CSS frontend for **FarmDirect**, a direct farmer-to-consumer marketplace, built from a Google Stitch design (`harvest_ledger`) and now wired to the real `farmdirect-backend` API (Phase H).

## Getting Started

You need the backend running first (see `farmdirect-backend/README.md` — `npm install`, set up `.env`, run migrations, `npm run seed`, `npm run dev`; it listens on port 4000 by default).

```bash
npm install
cp .env.example .env.development   # defaults to http://localhost:4000/api — edit if your backend runs elsewhere
npm run dev
```

Then open the printed local URL (typically http://localhost:5173). Log in with any seeded account from the backend's `npm run seed` output (e.g. `alex.johnson@farmdirect.dev` / the printed dev password), or register a new one.

To create a production build:

```bash
npm run build
npm run preview
```

## What's real vs. what's still demo

**Fully wired to the live API** (register/login/session persistence, real data, real writes):
- Auth: register, login, logout, forgot/reset password, session restore on page reload (silent refresh via the httpOnly cookie)
- Marketplace, Product Detail (+ writing reviews), Farm Discovery (list **and** a real PostGIS nearby search using the browser's geolocation), Farm Detail (+ reviews), Farmer public profile (+ reviews)
- Cart, Addresses, Checkout → real order creation, Orders list, Order Tracking (canonical 6-step status)
- Favorites (products/farms/farmers), Customer Dashboard, Customer Profile (personal info, addresses, notification preferences)
- Farmer: Product Management (create/edit/delete, across all farms a farmer owns), Farmer Inventory (with quick +10/−10 stock adjust buttons), Farmer Orders (kanban, with real status advancement), Farm Profile (personal info, farm info, location coordinates, notification preferences)

**Still demo/mock, clearly labeled in the UI** (no backend feature exists for these — not part of the approved architecture doc's scope):
- Farmer Analytics charts and FarmDirect AI Insights — both explicitly out of scope per the architecture doc; the pages say so
- The farm discovery map's pin *positions* are illustrative (no real farm boundary/shape data), though the **distances shown are real**, computed by the backend's PostGIS query
- `currentCrops` on farm detail renders empty — there's no such column in the approved schema; would need a new migration to add
- Security tab password change routes through the existing forgot-password flow rather than a dedicated "change password while logged in" endpoint (that endpoint isn't part of the backend's API surface)

## What changed structurally for integration

- **`src/services/`** — one API module per resource (`authApi`, `productsApi`, `farmsApi`, `farmersApi`, `cartApi`, `addressesApi`, `ordersApi`, `favoritesApi`, `inventoryApi`, `reviewsApi`), each with a mapper function that converts the backend's DTO shape into the frontend's existing types, so components needed minimal changes. `apiClient.ts` handles the access-token-in-memory + httpOnly-refresh-cookie pattern (decision #5): a 401 triggers one silent refresh-and-retry.
- **`useAuth`** (new) — real session context, restores on page load via `/auth/refresh`.
- **`useCart`/`useFavorites`** — now source of truth is the backend when logged in; guests still get a working localStorage-based cart/favorites (resolved against live product data, not mock), matching the original UX for browsing without an account.
- **`OrderStatus` type + `StatusStepper`** — updated to the backend's canonical 6-status lifecycle (`PENDING…DELIVERED`), replacing the original mock's 7-label list which had two steps ("Harvested", "Picked Up") that don't exist in the real backend. This was flagged as a known gap back in the backend's Phase B and resolved here.
- **Login/Register** — the role toggle was removed from the login form (a real account's role isn't selectable at sign-in time, unlike the old mock); registration still lets you choose customer or farmer since that's a real decision at signup.

## Bugs found during this integration pass (fixed in the backend, not worked around here)

Wiring real pages against real responses surfaced three backend issues that pure backend-side testing hadn't caught:
1. `GET`/`PUT /api/users/me` returned raw snake_case DB rows instead of the camelCase shape the rest of the API uses — profile fields silently came through as `undefined`.
2. `PUT /api/users/me` leaked the bcrypt `password_hash` in its response body.
3. Order responses never included the delivery address, despite the backend storing it since Phase F.
4. `POST`/`PUT /api/products` had no way to accept image URLs at all — a real gap in Phase E, not just missing frontend plumbing.

All four are detailed and fixed in `farmdirect-backend/README.md`'s Phase H section.

## Structure

```
src/
  components/{ui,layout,marketplace,products,farms,farmer,customer,orders,charts}
  pages/{public,customer,farmer,auth}
  services/    # API client + per-resource service modules with DTO mappers  ← new in Phase H
  hooks/       # auth + cart + favorites context (API-backed)
  data/        # remaining mock data: categories (static reference), and the demo-only
               # analytics/AI-insights data used by the two pages that stay mock
  types/       # shared TS types (OrderStatus now matches the backend's canonical enum)
  utils/       # formatting helpers
```
