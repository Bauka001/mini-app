-- Secure payment foundation for TON/Stars payment flows

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'silver', 'gold', 'basic', 'pro', 'premium'));

CREATE TABLE IF NOT EXISTS public.plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plan_prices (
  id BIGSERIAL PRIMARY KEY,
  plan_code TEXT NOT NULL REFERENCES public.plans(code) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram_stars', 'ton')),
  currency TEXT NOT NULL,
  amount_nano BIGINT NOT NULL CHECK (amount_nano > 0),
  display_amount TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_code, provider, currency)
);

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id TEXT PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('telegram_stars', 'ton')),
  plan_code TEXT NOT NULL REFERENCES public.plans(code),
  currency TEXT NOT NULL,
  amount_nano BIGINT NOT NULL CHECK (amount_nano > 0),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'paid', 'failed', 'expired', 'canceled')),
  memo TEXT,
  provider_invoice_id TEXT,
  provider_charge_id TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_created
  ON public.payment_orders(user_telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status
  ON public.payment_orders(status, provider);

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id BIGSERIAL PRIMARY KEY,
  payment_order_id TEXT NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_events_unique
  ON public.payment_provider_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id TEXT PRIMARY KEY,
  user_telegram_id BIGINT NOT NULL,
  tier_code TEXT NOT NULL REFERENCES public.plans(code),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  source_payment_order_id TEXT NOT NULL UNIQUE REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_entitlements_active
  ON public.user_entitlements(user_telegram_id, status, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.ton_payment_checks (
  id BIGSERIAL PRIMARY KEY,
  payment_order_id TEXT NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  tx_hash TEXT,
  tx_lt TEXT,
  source_address TEXT,
  destination_address TEXT,
  amount_nano BIGINT,
  memo TEXT,
  confirmations INTEGER NOT NULL DEFAULT 0,
  check_status TEXT NOT NULL DEFAULT 'pending' CHECK (check_status IN ('pending', 'matched', 'not_found', 'rejected')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plans (code, name, duration_days, features)
VALUES
  ('basic', 'Basic', 365, '["stroop_unlimited"]'::jsonb),
  ('pro', 'Pro', 365, '["stroop_unlimited","schulte_access"]'::jsonb),
  ('premium', 'Premium', 365, '["stroop_unlimited","schulte_access","vip_analytics","vip_tournament"]'::jsonb)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  duration_days = EXCLUDED.duration_days,
  features = EXCLUDED.features,
  updated_at = NOW();

INSERT INTO public.plan_prices (plan_code, provider, currency, amount_nano, display_amount)
VALUES
  ('basic', 'ton', 'TON', 10000000000, '10 TON'),
  ('pro', 'ton', 'TON', 12500000000, '12.5 TON'),
  ('premium', 'ton', 'TON', 15000000000, '15 TON')
ON CONFLICT (plan_code, provider, currency) DO UPDATE
SET
  amount_nano = EXCLUDED.amount_nano,
  display_amount = EXCLUDED.display_amount,
  updated_at = NOW();
