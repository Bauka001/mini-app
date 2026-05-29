-- Idempotency + audit table for paid plan upgrades. Written by the bot
-- payment webhook (server/index.js POST /telegram/webhook) using the
-- service-role key. RLS denies everyone else.

CREATE TABLE IF NOT EXISTS public.payment_charges (
    id BIGSERIAL PRIMARY KEY,
    telegram_payment_charge_id TEXT UNIQUE NOT NULL,
    provider_payment_charge_id TEXT,
    telegram_id BIGINT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('silver', 'gold', 'premium')),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    invoice_payload TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_charges_telegram_id ON public.payment_charges(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payment_charges_created_at ON public.payment_charges(created_at DESC);

ALTER TABLE public.payment_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_payment_charges" ON public.payment_charges;
CREATE POLICY "service_role_only_payment_charges" ON public.payment_charges
    FOR ALL USING (FALSE) WITH CHECK (FALSE);
