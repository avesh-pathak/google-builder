-- Café Circle AI — Phase 2 initial schema
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / ON CONFLICT.
--
-- Access model
--   * The app connects through the Supabase transaction pooler with `pg` using
--     a privileged server-side connection. Privacy filtering is enforced in
--     application code (lib/server/repositories.ts) — NOT by RLS.
--   * RLS is still enabled on every table (deny-all, no policies) as defense in
--     depth, so the Data (REST) API cannot reach these rows via anon/authenticated.

create table if not exists public.users (
  id                    text primary key,
  name                  text not null,
  initials              text not null default '',
  color                 text not null default '#a45f2c',
  bio                   text not null default '',
  sweetness             smallint not null default 3 check (sweetness between 1 and 5),
  bitterness            smallint not null default 3 check (bitterness between 1 and 5),
  temperature           text not null default 'both' check (temperature in ('hot', 'cold', 'both')),
  favorite_flavors      text[] not null default '{}',
  disliked_ingredients  text[] not null default '{}',
  budget                text not null default 'balanced' check (budget in ('value', 'balanced', 'premium')),
  usual_order_id        text,
  usual_note            text not null default '',
  created_at            timestamptz not null default now()
);

create table if not exists public.cafes (
  id          text primary key,
  name        text not null,
  location    text not null default '',
  description text not null default '',
  image       text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.menu_items (
  id          text primary key,
  cafe_id     text references public.cafes (id) on delete set null,
  name        text not null,
  description text not null default '',
  category    text not null check (category in ('drinks', 'food')),
  price       numeric(10, 2) not null check (price >= 0),
  image       text not null default '',
  taste_tags  text[] not null default '{}',
  available   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Friend edges. Mutual relationships are stored in BOTH directions by the
-- seeding/api layer; the (user_id, friend_id) primary key blocks duplicates.
create table if not exists public.friendships (
  user_id    text not null references public.users (id) on delete cascade,
  friend_id  text not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- cafe_id is nullable so a visit can be recorded for a café outside our
-- catalog; cafe_name is always stored as a human-readable snapshot.
create table if not exists public.visits (
  id                  text primary key,
  user_id             text not null references public.users (id) on delete cascade,
  cafe_id             text references public.cafes (id) on delete set null,
  cafe_name           text not null default '',
  visited_at          date not null,
  notes               text,
  shared_with_friends boolean not null default false,
  source              text not null default 'manual' check (source in ('seed', 'manual')),
  created_at          timestamptz not null default now()
);

-- Historical orders survive even when menu_item_id is null (item left the menu).
create table if not exists public.visit_items (
  id           text primary key,
  visit_id     text not null references public.visits (id) on delete cascade,
  menu_item_id text references public.menu_items (id) on delete set null,
  item_name    text not null,
  rating       smallint not null check (rating between 1 and 5),
  created_at   timestamptz not null default now()
);

create table if not exists public.user_favorites (
  user_id      text not null references public.users (id) on delete cascade,
  menu_item_id text not null references public.menu_items (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, menu_item_id)
);

-- Standalone "I tried this from the menu and rated it" signal.
-- Relationship to visit_items.rating:
--   * visit_items.rating is the historical record of one visit.
--   * item_ratings is the user's current opinion of the item itself.
--   The recommender resolves an item's rating as "explicit rating first, else the
--   best visit rating". It never sums the two, so nothing is double-counted.
create table if not exists public.item_ratings (
  user_id      text not null references public.users (id) on delete cascade,
  menu_item_id text not null references public.menu_items (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  updated_at   timestamptz not null default now(),
  primary key (user_id, menu_item_id)
);

create table if not exists public.app_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

create index if not exists visits_user_date_idx on public.visits (user_id, visited_at desc);
create index if not exists visits_shared_idx on public.visits (shared_with_friends) where shared_with_friends;
create index if not exists visit_items_visit_idx on public.visit_items (visit_id);
create index if not exists visit_items_menu_idx on public.visit_items (menu_item_id);
create index if not exists menu_items_category_idx on public.menu_items (category);
create index if not exists friendships_friend_idx on public.friendships (friend_id);
create index if not exists item_ratings_menu_idx on public.item_ratings (menu_item_id);

-- RLS on, no policies: deny-all for anon/authenticated. The table owner
-- (the pooler role) bypasses RLS, which is how the server reads and writes.
alter table public.users enable row level security;
alter table public.cafes enable row level security;
alter table public.menu_items enable row level security;
alter table public.friendships enable row level security;
alter table public.visits enable row level security;
alter table public.visit_items enable row level security;
alter table public.user_favorites enable row level security;
alter table public.item_ratings enable row level security;
alter table public.app_migrations enable row level security;
