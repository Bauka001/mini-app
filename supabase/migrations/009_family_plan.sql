-- Family plan support: one owner buys FAMILY premium, up to (seats-1) members
-- redeem an invite link to receive a linked premium entitlement.

create table if not exists family_groups (
  owner_telegram_id        bigint primary key,
  seats                    int not null default 4,
  ends_at                  timestamptz not null,
  source_payment_order_id  text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists family_members (
  id                  bigserial primary key,
  owner_telegram_id   bigint not null references family_groups(owner_telegram_id) on delete cascade,
  member_telegram_id  bigint not null,
  joined_at           timestamptz not null default now(),
  unique (owner_telegram_id, member_telegram_id)
);

create index if not exists idx_family_members_member on family_members(member_telegram_id);
