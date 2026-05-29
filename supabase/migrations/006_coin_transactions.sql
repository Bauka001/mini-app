-- Audit ledger for every server-side coin (and gem) movement. Lets us trace
-- "where did the coins come from / go to" and gives admin tooling something
-- to reconcile against if abuse is suspected.

CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'coins' CHECK (currency IN ('coins', 'gems')),
    amount BIGINT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    reason TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_created
    ON public.coin_transactions(user_telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_reason
    ON public.coin_transactions(reason);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_coin_transactions" ON public.coin_transactions;
CREATE POLICY "service_role_only_coin_transactions" ON public.coin_transactions
    FOR ALL USING (FALSE) WITH CHECK (FALSE);
