-- Tracks tournament entries server-side. Required for the VIP free-entry
-- once-per-week dedup check and as an audit trail for paid entries.

CREATE TABLE IF NOT EXISTS public.tournament_entries (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    week_key TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('vip', 'stars', 'ton')),
    settlement_status TEXT NOT NULL DEFAULT 'recorded' CHECK (
        settlement_status IN ('recorded', 'confirmed', 'refunded')
    ),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Once-per-week-per-method enforcement at the DB level (defense in depth on
-- top of the application-level check in /tournaments/join).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tournament_entries_user_week_method
    ON public.tournament_entries(user_telegram_id, week_key, payment_method);

CREATE INDEX IF NOT EXISTS idx_tournament_entries_week
    ON public.tournament_entries(week_key);

ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_tournament_entries" ON public.tournament_entries;
CREATE POLICY "service_role_only_tournament_entries" ON public.tournament_entries
    FOR ALL USING (FALSE) WITH CHECK (FALSE);
