# GODIA PRIME CONNECT SOLUTIONS — existing frontend + backend starter

This package includes a copy of the supplied `GODIA_PRIME_CONNECT_STEP1_FRONTEND.html`, renamed to `index.html`, plus a proposed Cloudflare Worker backend and D1 schema. It does not modify the original file in your repository.

## Files
- `index.html` — existing supplied frontend copy; preserve your repository's current index.html unless you intentionally decide to replace it after comparing versions.
- `src/index.js` — Worker API entry point.
- `wrangler.toml` — Cloudflare Worker configuration template. “Wrangler” is the Cloudflare deployment/configuration tool; this is a TOML text file.
- `schema.sql` — creates products, customers, sales and sale_items tables, without demo records.
- `README.md` — this guide.

## Critical status
The supplied frontend currently uses browser/localStorage state for products, sales, customers and orders. It does not yet call the API routes in `src/index.js`. Therefore, adding these files does NOT automatically connect the frontend to the backend. Frontend integration must be done separately after the D1 database and API have been verified.

The backend API does not yet include authentication/authorization. Do not use it for public production business data until access control is implemented and tested.

## Before deploying
1. Inspect the existing GitHub repository and current Cloudflare Worker configuration first.
2. Preserve the existing `index.html`; compare it with this copy before any replacement.
3. Create or select the intended D1 database in Cloudflare.
4. Replace both placeholders in `wrangler.toml` with the real database name and ID shown by Cloudflare. Never guess the ID.
5. Apply `schema.sql` to that same D1 database.
6. Configure the Worker D1 binding named exactly `DB` to point to that database.
7. Verify the existing Worker is connected to the intended repository and branch before changing integration settings.
8. Deploy only after the configuration and database are verified.
9. Test `/api/health`; expect `ok: true` and `database.connected: true`.
10. Only then integrate frontend functions with the API and test each feature.

## Intended API routes
- `GET /api/health`
- `GET/POST /api/products`; `GET/PUT/PATCH/DELETE /api/products/:id`
- `GET/POST /api/customers`; `GET/PUT/PATCH/DELETE /api/customers/:id`
- `GET/POST /api/sales`; `GET /api/sales/:id`; `GET /api/sales/:id/items`
- `GET /api/dashboard`

No fake records are inserted by the schema.
