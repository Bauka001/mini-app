-- =============================================================================
-- 007 — Telegram Stars products, $FOCUS jetton ledger, NFT trophies, wallet links
-- =============================================================================
-- This migration introduces the Web3 + Stars data model the app needs to:
--   1. Process Telegram Stars purchases beyond VIP (cases, revive, tickets,
--      coin packs, wheel spins, $FOCUS jetton credits).
--   2. Track TON wallet bindings per user.
--   3. Maintain a server-authoritative $FOCUS jetton ledger that can be drained
--      on-chain once the jetton master contract is deployed.
--   4. Award + claim NFT trophies linked to user wallets.
-- =============================================================================

-- -------- Allow Stars payment orders with `plan_code` outside of plan table.
-- For non-VIP Stars products, plan_code stores the productCode (e.g. case_basic).
-- We loosen the FK so non-VIP product codes don't have to exist in plans.
ALTER TABLE public.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_plan_code_fkey;

-- Extend the status enum to include 'pending_grant' for failed-grant retry flow.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'payment_orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
    ALTER TABLE public.payment_orders
      ADD CONSTRAINT payment_orders_status_check
      CHECK (status IN ('created','pending','paid','failed','expired','canceled','pending_grant'));
  END IF;
END$$;

-- =============================================================================
-- Stars grants audit log (idempotency + auditing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stars_grants (
  id BIGSERIAL PRIMARY KEY,
  payment_order_id TEXT NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  product_code TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount_stars INTEGER NOT NULL CHECK (amount_stars >= 0),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_order_id)
);
CREATE INDEX IF NOT EXISTS idx_stars_grants_user ON public.stars_grants(user_telegram_id, created_at DESC);

-- =============================================================================
-- Per-user inventory of mystery cases (Stars + earned)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_inventory (
  user_telegram_id BIGINT NOT NULL,
  case_id TEXT NOT NULL,
  mystery_boxes INTEGER NOT NULL DEFAULT 0 CHECK (mystery_boxes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_telegram_id, case_id)
);

-- =============================================================================
-- Per-user single-use consumables (revives, tickets, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_consumables (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1 CHECK (amount > 0),
  consumed_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_consumables_user_kind ON public.user_consumables(user_telegram_id, kind, consumed_at);

-- Atomic increment helper used by Stars grant flow when RPC is available.
CREATE OR REPLACE FUNCTION public.increment_user_consumable(
  p_user_telegram_id BIGINT,
  p_kind TEXT,
  p_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_consumables (user_telegram_id, kind, amount, source)
  VALUES (p_user_telegram_id, p_kind, p_delta, 'stars_grant');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Wheel of Fortune — add paid_spins_remaining if column missing
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wheel_user_state') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'wheel_user_state' AND column_name = 'paid_spins_remaining'
    ) THEN
      ALTER TABLE public.wheel_user_state ADD COLUMN paid_spins_remaining INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;
END$$;

-- =============================================================================
-- TON wallet bindings (1 wallet per user, history kept via stars_grants if needed)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_wallet_links (
  user_telegram_id BIGINT PRIMARY KEY,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'mainnet',
  public_key TEXT,
  ton_proof JSONB,
  wallet_info JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_wallet_links_address ON public.user_wallet_links(address);

-- =============================================================================
-- $FOCUS jetton ledger
-- =============================================================================
-- Each row is a credit (+) or debit (-) entry. Balance = SUM(delta) per user.
-- Reasons:
--   - daily_workout_complete, tournament_top1, tournament_top3
--   - referral_wallet_bind, onboarding_wallet_bind
--   - stars_purchase (via stars grant flow)
--   - claim_locked (when user requests on-chain claim; offsetting credit posted by worker on success)
CREATE TABLE IF NOT EXISTS public.focus_token_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_focus_token_ledger_user ON public.focus_token_ledger(user_telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_token_ledger_reason ON public.focus_token_ledger(user_telegram_id, reason);

-- On-chain claim requests — picked up by an external worker once jetton is deployed.
CREATE TABLE IF NOT EXISTS public.focus_claim_requests (
  id TEXT PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','success','failed','canceled')),
  tx_hash TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_focus_claim_requests_status ON public.focus_claim_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_focus_claim_requests_user ON public.focus_claim_requests(user_telegram_id, created_at DESC);

-- =============================================================================
-- NFT trophy awards
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.nft_trophy_awards (
  id TEXT PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  trophy_code TEXT NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'awarded'
    CHECK (status IN ('awarded','claim_requested','minted','failed')),
  claim_wallet TEXT,
  claim_tx TEXT,
  claim_requested_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nft_trophy_awards_user ON public.nft_trophy_awards(user_telegram_id, awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_nft_trophy_awards_status ON public.nft_trophy_awards(status);

-- =============================================================================
-- Seed plans: register Stars-as-XTR prices so /plans endpoint surfaces both rails
-- =============================================================================
INSERT INTO public.plans (code, name, duration_days, features, is_active)
VALUES
  ('basic',   'BASIC',   365, '["7 games", "Daily workout", "Stats"]'::jsonb,                                  TRUE),
  ('pro',     'PRO',     365, '["All BASIC", "AI insights", "Custom workouts"]'::jsonb,                         TRUE),
  ('premium', 'PREMIUM', 365, '["All PRO", "Brain age tracking", "Priority support", "Tournament tickets"]'::jsonb, TRUE)
ON CONFLICT (code) DO UPDATE SET features = EXCLUDED.features, is_active = EXCLUDED.is_active;

-- Plan prices for both providers (TON + Stars/XTR).
INSERT INTO public.plan_prices (plan_code, provider, currency, amount_nano, display_amount, is_active)
VALUES
  ('basic',   'ton',             'TON', 10000000000, '10 TON',     TRUE),
  ('pro',     'ton',             'TON', 12500000000, '12.5 TON',   TRUE),
  ('premium', 'ton',             'TON', 15000000000, '15 TON',     TRUE),
  ('basic',   'telegram_stars',  'XTR', 140,         '140 ⭐',     TRUE),
  ('pro',     'telegram_stars',  'XTR', 175,         '175 ⭐',     TRUE),
  ('premium', 'telegram_stars',  'XTR', 205,         '205 ⭐',     TRUE)
ON CONFLICT (plan_code, provider, currency) DO UPDATE SET
  amount_nano = EXCLUDED.amount_nano,
  display_amount = EXCLUDED.display_amount,
  is_active = EXCLUDED.is_active;

-- =============================================================================
-- Views for admin dashboard
-- =============================================================================
CREATE OR REPLACE VIEW public.focus_balances AS
SELECT
  user_telegram_id,
  COALESCE(SUM(delta), 0) AS balance,
  COUNT(*) FILTER (WHERE delta > 0) AS credit_count,
  COUNT(*) FILTER (WHERE delta < 0) AS debit_count,
  MAX(created_at) AS last_activity
FROM public.focus_token_ledger
GROUP BY user_telegram_id;

CREATE OR REPLACE VIEW public.stars_revenue_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  product_code,
  kind,
  COUNT(*) AS purchases,
  SUM(amount_stars) AS total_stars
FROM public.stars_grants
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
