-- 011_app_visitors.sql
-- Tracks EVERY mini-app entry — both verified Telegram users and anonymous
-- visitors (opened outside Telegram / no initData / no user id). One row per
-- distinct visitor (keyed by 'tg:<id>' when the Telegram identity is verified,
-- else 'anon:<uuid>' persisted in the client). visit_count + last_seen_at are
-- bumped on every entry so we can report total / unique / active visitors.

create table if not exists app_visitors (
  id            bigint generated always as identity primary key,
  visitor_key   text unique not null,          -- 'tg:<id>' or 'anon:<uuid>'
  telegram_id   bigint,                         -- verified id (null for anonymous)
  anon_id       text,                           -- client-persisted uuid
  is_verified   boolean not null default false, -- true => Telegram initData validated
  username      text,
  first_name    text,
  last_name     text,
  language_code text,
  platform      text,                           -- ios / android / tdesktop / web / unknown
  app_version   text,                           -- __BUILD_ID__
  start_param   text,                           -- deep-link start param (e.g. 'business')
  is_premium    boolean,                        -- Telegram Premium flag
  referrer      text,                           -- document.referrer (web entries)
  visit_count   integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists app_visitors_telegram_id_idx on app_visitors (telegram_id);
create index if not exists app_visitors_last_seen_idx    on app_visitors (last_seen_at desc);
create index if not exists app_visitors_verified_idx     on app_visitors (is_verified);
create index if not exists app_visitors_first_seen_idx   on app_visitors (first_seen_at desc);
