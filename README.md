# Café Circle AI — Phase 2 (Frontend + Supabase PostgreSQL)

> **Your taste. Your friends. Your café.**

Discover what you'll actually love, recommended by people you trust and personalized
from your own café memories.

Phase 1 built the complete frontend on seeded data. **Phase 2 replaces that with a
real backend**: Supabase PostgreSQL, read and written through Next.js Route Handlers
using Supabase's Data API. Business data no longer lives in `localStorage`.

Gemini, Cloud Run and auth are still out of scope.

---

## Stack

- **Next.js 16** (App Router, `app/` at the repo root)
- **TypeScript** (strict)
- **Tailwind CSS v4** — design tokens in `app/globals.css`
- **Supabase PostgreSQL** accessed with **`@supabase/supabase-js`** (server-side only)
- **lucide-react** icons
- React Context for client state

---

## 1. Set up Supabase

1. In the [Supabase dashboard](https://supabase.com/dashboard), create (or open) a
   project.
2. Use the existing **`.env`** at the repo root. The server reads these settings:

   ```bash
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SECRET_KEY=<your-current-secret-key>
   ```

   Keep the secret key server-only; never prefix it with `NEXT_PUBLIC_`.
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` identify
   public clients, but cannot read these deny-all-RLS demo tables. The current
   server API intentionally uses the secret key. No `DATABASE_URL` is required
   to run the app or seed data.
3. If a secret key was pasted into chat or a screenshot, rotate it in Supabase
   Dashboard → Settings → API Keys and update `.env`. Rotate exposed Gemini keys too.

## 2. Create the schema and seed

Apply SQL in **Supabase SQL Editor**, in this order:

1. `supabase/migrations/001_initial_schema.sql` (skip if already applied).
2. `supabase/migrations/20261011065347_supabase_api.sql` (new server-role grants,
   atomic visit RPC, development reset RPC, and read-only migration check).

API keys do not support DDL. `npm run db:migrate` verifies that the API migration
was already applied; it does not pretend to run SQL through an API key. An optional
`DATABASE_URL` still enables the old PostgreSQL migration runner, but is not used
by app routes or seeding.

```bash
npm run db:seed       # safe to run after the initial tables exist
npm run db:setup      # verifies API migration, then seeds
npm run db:check      # read-only API, privacy filters, anonymous access and RPC checks
```

- `npm run db:seed` loads the Phase 1 demo data from `lib/data.ts`. It is
  **idempotent** — re-running never duplicates a row and never overwrites
  preferences you have since edited. It asserts equal row counts after two runs.
  Batches run in dependency order; a partial seed is safe to retry. Seeding does
  not truncate data. Standalone ratings stay empty because visit item ratings
  already provide the historical feedback.

## 3. Run the app

```bash
npm run dev           # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

---

## Database

| Table | Holds |
| --- | --- |
| `users` | Demo people + taste profile (sweetness, bitterness, temperature, favorite flavors, **disliked ingredients**, budget, usual order) |
| `cafes` | Café name, location, description, image |
| `menu_items` | Menu catalogue with price, category, taste tags |
| `friendships` | Mutual friend edges, stored in **both** directions |
| `visits` | A café visit — `cafe_id` nullable, `cafe_name` snapshot, date, notes, `shared_with_friends` |
| `visit_items` | One ordered line — `menu_item_id` nullable so history survives menu changes, denormalized `item_name`, rating 1–5 |
| `user_favorites` | One row per user/item pair (primary key enforces it) |
| `item_ratings` | The user's current opinion of an item (one row per user/item pair) |
| `app_migrations` | Which migration files have been applied |

### How ratings avoid double-counting

`visit_items.rating` is the historical record of one visit. `item_ratings` is the
user's current opinion of the item itself. The recommender resolves an item's rating
as **explicit rating first, else the best visit rating** — it never sums the two, and
"already tried" is a set union. The same feedback can therefore never count twice.

### Privacy

Friend-facing reads only ever return visits with `shared_with_friends = true`. That
filter lives in `lib/server/repositories.ts`, **not** in RLS, because the app connects
with a server-only secret key (`service_role` bypasses RLS). RLS remains enabled
with no policies, so publishable-key clients cannot reach these rows. RPCs use
`SECURITY INVOKER`, with execute permission granted only to `service_role`.

There is no authentication: the demo profile switcher picks a user id and sends it.
**A demo user id is not a credential** and these endpoints must not be exposed
publicly as-is. Bootstrap intentionally includes all demo profiles and their
private visit histories for profile switching; it is not a privacy boundary.

---

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Database connectivity check |
| `GET` | `/api/bootstrap` | Everything the app needs to start |
| `PATCH` | `/api/users/[id]/preferences` | Update taste preferences |
| `GET` | `/api/users/[id]/visits` | One user's visit history |
| `GET` | `/api/users/[id]/friends` | Friends + **shared-only** activity |
| `PUT` / `DELETE` | `/api/users/[id]/favorites/[itemId]` | Add / remove a favorite |
| `PUT` | `/api/users/[id]/ratings/[itemId]` | Create or update an item rating |
| `POST` | `/api/visits` | Save a visit and its items in one transaction |
| `POST` | `/api/dev/reset` | Development only: re-seed app-owned demo tables |

Every handler calls `await connection()` before touching the database, so the
production build never needs a live database (Next.js 16 Cache Components would
otherwise try to prerender a DB-reading `GET` handler).

---

## How the frontend talks to the backend

`lib/store.tsx` kept the **exact same `useApp()` surface** as Phase 1, so no feature
component needed rewriting:

- On load it fetches `/api/bootstrap`, with a loading screen and a retryable error
  screen in `app/page.tsx`.
- Favorites, ratings and taste edits update optimistically and roll back if the write
  fails, showing a dismissible banner.
- New visits are written first, then merged into state with the row the server returned.
- `localStorage` now holds only the selected demo profile.

## Recommendations

`lib/recommender.ts` is unchanged in spirit and remains deterministic:

- **Recommended for you** — untried items a friend rated 4+ in a *shared* visit,
  ranked by their rating plus your taste match.
- **Friends' favorites** — each friend's highest-rated shared items.
- **Discover something new** — untried items ranked by your stored profile.
- **Taste similarity** — labels and sentences, never a fake percentage.
- Items that mention a **disliked ingredient** are excluded from suggestions.

Gemini (Phase 3) will replace the explanation strings and add menu-image
understanding; the result shape does not change.

---

## Project structure

```
app/
  page.tsx                    SPA shell + loading/error states
  api/                        route handlers (health, bootstrap, users, visits, dev)
components/                   unchanged Phase 1 UI
lib/
  types.ts  data.ts  store.tsx  recommender.ts  utils.ts  ui.ts
  server/
    supabase.ts               server-only Supabase Data API client + health
    db.ts                     optional pg migration runner support only
    http.ts                   JSON + error responses
    validators.ts             strict input validation
    serialize.ts              row → domain mapping
    repositories.ts           Data API repositories + friend privacy filtering
    seed.ts                   idempotent demo seeding
scripts/
  migrate.ts  seed.ts         CLI entry points
supabase/migrations/
  001_initial_schema.sql
  20261011065347_supabase_api.sql
```

---

## Phase boundaries

**Done:** full UI, Supabase schema + migration runner, idempotent seeding, REST API,
frontend wired to the database, deterministic friend-powered recommendations.

**Not started:** Gemini menu vision and AI explanations, Cloud Run deployment, auth,
Google Maps, payments. The `GEMINI_API_KEY` in `.env` is intentionally unused.
