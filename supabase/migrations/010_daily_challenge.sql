-- Daily Challenge: one designated game per day, a fair daily leaderboard,
-- and a consecutive-day streak computed from the rows themselves.

create table if not exists daily_challenge_scores (
  id                 bigserial primary key,
  user_telegram_id   bigint not null,
  challenge_date     date not null,
  game_id            text not null,
  score              int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_telegram_id, challenge_date)
);

create index if not exists idx_dcs_date  on daily_challenge_scores(challenge_date);
create index if not exists idx_dcs_user  on daily_challenge_scores(user_telegram_id);
create index if not exists idx_dcs_board on daily_challenge_scores(challenge_date, score desc);
