-- =============================================================
-- Admin Panel V2 — browser-based admin, promo codes, app settings
-- =============================================================

-- ----- App Settings (global key/value store) ------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_by BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only_app_settings" ON public.app_settings;
CREATE POLICY "service_role_only_app_settings" ON public.app_settings
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- Bootstrap default promotion end (same as current frontend default)
INSERT INTO public.app_settings (key, value)
VALUES ('promotion_end_iso', '"2026-04-26T08:00:00.000Z"'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- ----- Promo Codes ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_codes (
    code TEXT PRIMARY KEY,
    discount_percent INTEGER NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 1 AND 100),
    plan_codes TEXT[] NOT NULL DEFAULT ARRAY['basic','pro','premium'],
    max_uses INTEGER,                     -- NULL = unlimited
    used_count INTEGER NOT NULL DEFAULT 0,
    valid_until TIMESTAMPTZ,              -- NULL = no expiry
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT,                            -- e.g. blogger name / campaign
    blogger_name TEXT,                    -- for whom this code was created
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_created_at ON public.promo_codes(created_at DESC);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only_promo_codes" ON public.promo_codes;
CREATE POLICY "service_role_only_promo_codes" ON public.promo_codes
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP TRIGGER IF EXISTS update_promo_codes_updated_at ON public.promo_codes;
CREATE TRIGGER update_promo_codes_updated_at
    BEFORE UPDATE ON public.promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ----- Promo Code Redemptions ----------------------------------
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL REFERENCES public.promo_codes(code) ON DELETE CASCADE,
    user_telegram_id BIGINT NOT NULL,
    plan_code TEXT,
    discount_percent INTEGER,
    payment_order_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON public.promo_code_redemptions(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_code_redemptions(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_created_at ON public.promo_code_redemptions(created_at DESC);

ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only_promo_redemptions" ON public.promo_code_redemptions;
CREATE POLICY "service_role_only_promo_redemptions" ON public.promo_code_redemptions
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- ----- Admin Browser Sessions (token-based) --------------------
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    token TEXT PRIMARY KEY,
    admin_telegram_id BIGINT NOT NULL,
    admin_login TEXT,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON public.admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON public.admin_sessions(admin_telegram_id);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only_admin_sessions" ON public.admin_sessions;
CREATE POLICY "service_role_only_admin_sessions" ON public.admin_sessions
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

-- ----- Helpful view for stats ----------------------------------
CREATE OR REPLACE VIEW public.admin_app_overview AS
SELECT
    (SELECT COUNT(*) FROM public.users) AS users_total,
    (SELECT COUNT(*) FROM public.users WHERE plan != 'free') AS users_paid,
    (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '24 hours') AS users_new_24h,
    (SELECT COUNT(*) FROM public.users WHERE created_at > NOW() - INTERVAL '7 days') AS users_new_7d,
    (SELECT COUNT(*) FROM public.users WHERE is_blocked = TRUE) AS users_blocked,
    (SELECT COUNT(*) FROM public.tickets) AS tickets_total,
    (SELECT COUNT(*) FROM public.tickets WHERE status = 'pending') AS tickets_pending,
    (SELECT COUNT(*) FROM public.tickets WHERE status = 'verified') AS tickets_verified,
    (SELECT COUNT(*) FROM public.feedback_entries WHERE status = 'new') AS feedback_new,
    (SELECT COUNT(*) FROM public.promo_codes WHERE is_active = TRUE) AS promo_codes_active,
    (SELECT COALESCE(SUM(used_count),0) FROM public.promo_codes) AS promo_redemptions_total;
