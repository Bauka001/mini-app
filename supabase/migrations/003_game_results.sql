-- Audit table for server-validated game submissions.
-- Each row represents a single game result that the backend recorded after
-- validating the submission and crediting coins/xp to the user.

CREATE TABLE IF NOT EXISTS public.game_results (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    game_id TEXT NOT NULL,
    score NUMERIC,
    coins_awarded INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_game_results_user_submitted_at
    ON public.game_results(user_telegram_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_results_game_id_submitted_at
    ON public.game_results(game_id, submitted_at DESC);

ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_game_results" ON public.game_results;
CREATE POLICY "service_role_only_game_results" ON public.game_results
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- Idempotency table for the payment-webhook Edge Function.
-- Prevents duplicate Telegram messages when Supabase retries the webhook.
CREATE TABLE IF NOT EXISTS public.webhook_notifications (
    ticket_id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_webhook_notifications" ON public.webhook_notifications;
CREATE POLICY "service_role_only_webhook_notifications" ON public.webhook_notifications
    FOR ALL USING (FALSE) WITH CHECK (FALSE);
