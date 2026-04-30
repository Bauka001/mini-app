-- Server-canonical tournament score audit. One row per (user, week, game) —
-- a user can only have one score per game per week, matching the client's
-- "each game counts once" behavior. Tournament leaderboards should be
-- computed from this table, not from client-supplied state.

CREATE TABLE IF NOT EXISTS public.tournament_scores (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    week_key TEXT NOT NULL,
    game_id TEXT NOT NULL,
    score NUMERIC NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- One score per game per user per week.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tournament_scores_user_week_game
    ON public.tournament_scores(user_telegram_id, week_key, game_id);

CREATE INDEX IF NOT EXISTS idx_tournament_scores_week
    ON public.tournament_scores(week_key);

CREATE INDEX IF NOT EXISTS idx_tournament_scores_user_week
    ON public.tournament_scores(user_telegram_id, week_key);

ALTER TABLE public.tournament_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_tournament_scores" ON public.tournament_scores;
CREATE POLICY "service_role_only_tournament_scores" ON public.tournament_scores
    FOR ALL USING (FALSE) WITH CHECK (FALSE);
