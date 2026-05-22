-- Wheel of Fortune secure server-side foundation

CREATE TABLE IF NOT EXISTS public.wheel_campaigns (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    spin_cost_gems INTEGER NOT NULL DEFAULT 100 CHECK (spin_cost_gems > 0),
    topup_free_spin_threshold_kzt INTEGER NOT NULL DEFAULT 1000 CHECK (topup_free_spin_threshold_kzt > 0),
    daily_spin_limit INTEGER CHECK (daily_spin_limit IS NULL OR daily_spin_limit > 0),
    jackpot_probability_min NUMERIC(8, 5) NOT NULL DEFAULT 0.00010,
    jackpot_probability_max NUMERIC(8, 5) NOT NULL DEFAULT 0.00100,
    suspense_min_ms INTEGER NOT NULL DEFAULT 5200,
    suspense_max_ms INTEGER NOT NULL DEFAULT 7600,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wheel_prizes (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES public.wheel_campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('balance', 'physical')),
    value INTEGER NOT NULL DEFAULT 0,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    probability NUMERIC(10, 6) NOT NULL DEFAULT 0 CHECK (probability >= 0),
    weight INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'out_of_stock', 'archived')),
    accent_color TEXT,
    stock_total INTEGER CHECK (stock_total IS NULL OR stock_total >= 0),
    stock_remaining INTEGER CHECK (stock_remaining IS NULL OR stock_remaining >= 0),
    image_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wheel_user_state (
    user_telegram_id BIGINT PRIMARY KEY,
    free_spins INTEGER NOT NULL DEFAULT 0 CHECK (free_spins >= 0),
    total_spins INTEGER NOT NULL DEFAULT 0 CHECK (total_spins >= 0),
    paid_spins INTEGER NOT NULL DEFAULT 0 CHECK (paid_spins >= 0),
    total_topup_kzt BIGINT NOT NULL DEFAULT 0 CHECK (total_topup_kzt >= 0),
    daily_spin_count INTEGER NOT NULL DEFAULT 0 CHECK (daily_spin_count >= 0),
    daily_spin_date DATE,
    last_rare_win_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wheel_spins (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES public.wheel_campaigns(id) ON DELETE RESTRICT,
    user_telegram_id BIGINT NOT NULL,
    prize_id TEXT REFERENCES public.wheel_prizes(id) ON DELETE SET NULL,
    spin_source TEXT NOT NULL CHECK (spin_source IN ('free', 'paid', 'promo', 'admin')),
    cost_gems INTEGER NOT NULL DEFAULT 0 CHECK (cost_gems >= 0),
    gems_before BIGINT NOT NULL DEFAULT 0,
    gems_after BIGINT NOT NULL DEFAULT 0,
    free_spins_before INTEGER NOT NULL DEFAULT 0,
    free_spins_after INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_review', 'granted', 'used', 'cancelled')),
    prize_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_seed TEXT,
    suspense_ms INTEGER NOT NULL DEFAULT 6000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.wheel_topups (
    id TEXT PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ton', 'telegram_stars', 'admin')),
    amount_kzt INTEGER NOT NULL CHECK (amount_kzt > 0),
    crystals_added INTEGER NOT NULL CHECK (crystals_added > 0),
    free_spins_awarded INTEGER NOT NULL DEFAULT 0 CHECK (free_spins_awarded >= 0),
    status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('pending', 'applied', 'failed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wheel_campaigns_status ON public.wheel_campaigns(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_wheel_prizes_campaign_status ON public.wheel_prizes(campaign_id, status, rarity);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_created ON public.wheel_spins(user_telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_campaign_created ON public.wheel_spins(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wheel_topups_user_created ON public.wheel_topups(user_telegram_id, created_at DESC);

ALTER TABLE public.wheel_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_wheel_campaigns" ON public.wheel_campaigns;
CREATE POLICY "service_role_only_wheel_campaigns" ON public.wheel_campaigns
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_wheel_prizes" ON public.wheel_prizes;
CREATE POLICY "service_role_only_wheel_prizes" ON public.wheel_prizes
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_wheel_user_state" ON public.wheel_user_state;
CREATE POLICY "service_role_only_wheel_user_state" ON public.wheel_user_state
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_wheel_spins" ON public.wheel_spins;
CREATE POLICY "service_role_only_wheel_spins" ON public.wheel_spins
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_wheel_topups" ON public.wheel_topups;
CREATE POLICY "service_role_only_wheel_topups" ON public.wheel_topups
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP TRIGGER IF EXISTS update_wheel_campaigns_updated_at ON public.wheel_campaigns;
CREATE TRIGGER update_wheel_campaigns_updated_at
    BEFORE UPDATE ON public.wheel_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wheel_prizes_updated_at ON public.wheel_prizes;
CREATE TRIGGER update_wheel_prizes_updated_at
    BEFORE UPDATE ON public.wheel_prizes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wheel_user_state_updated_at ON public.wheel_user_state;
CREATE TRIGGER update_wheel_user_state_updated_at
    BEFORE UPDATE ON public.wheel_user_state
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.wheel_campaigns (
    id,
    code,
    title,
    status,
    spin_cost_gems,
    topup_free_spin_threshold_kzt,
    daily_spin_limit,
    jackpot_probability_min,
    jackpot_probability_max,
    suspense_min_ms,
    suspense_max_ms,
    settings
) VALUES (
    'wheel-main',
    'wheel_main',
    'Wheel of Fortune',
    'active',
    100,
    1000,
    20,
    0.00010,
    0.00100,
    5200,
    7600,
    '{"bigPrizeCooldownHours": 72, "dailyLimitEnabled": false}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    spin_cost_gems = EXCLUDED.spin_cost_gems,
    topup_free_spin_threshold_kzt = EXCLUDED.topup_free_spin_threshold_kzt,
    daily_spin_limit = EXCLUDED.daily_spin_limit,
    jackpot_probability_min = EXCLUDED.jackpot_probability_min,
    jackpot_probability_max = EXCLUDED.jackpot_probability_max,
    suspense_min_ms = EXCLUDED.suspense_min_ms,
    suspense_max_ms = EXCLUDED.suspense_max_ms,
    settings = EXCLUDED.settings,
    updated_at = NOW();

INSERT INTO public.wheel_prizes (id, campaign_id, title, type, value, rarity, probability, weight, status, accent_color, metadata)
VALUES
    ('wheel-balance-100', 'wheel-main', '50 кристалл', 'balance', 50, 'common', 0.340000, 3400, 'active', '#22d3ee', '{"card":"cyan","rewardKind":"crystals","displayOrder":4}'::jsonb),
    ('wheel-balance-200', 'wheel-main', '1000 монета', 'balance', 1000, 'common', 0.240000, 2400, 'active', '#f59e0b', '{"card":"amber","rewardKind":"coins","displayOrder":2}'::jsonb),
    ('wheel-balance-500', 'wheel-main', '2500 монета', 'balance', 2500, 'uncommon', 0.170000, 1700, 'active', '#fb7185', '{"card":"rose","rewardKind":"coins","displayOrder":6}'::jsonb),
    ('wheel-balance-1000', 'wheel-main', '100 кристалл', 'balance', 100, 'rare', 0.080000, 800, 'active', '#60a5fa', '{"card":"sky","rewardKind":"crystals","displayOrder":7}'::jsonb),
    ('wheel-balance-2000', 'wheel-main', '250 кристалл', 'balance', 250, 'epic', 0.030000, 300, 'active', '#818cf8', '{"card":"violet","rewardKind":"crystals","displayOrder":9}'::jsonb),
    ('wheel-balance-5000', 'wheel-main', '10000 монета', 'balance', 10000, 'epic', 0.008000, 80, 'active', '#ef4444', '{"card":"red","rewardKind":"coins","displayOrder":10}'::jsonb),
    ('wheel-airpods', 'wheel-main', 'AirPods', 'physical', 1, 'rare', 0.003000, 30, 'active', '#f8fafc', '{"card":"silver","rewardKind":"physical","displayOrder":5}'::jsonb),
    ('wheel-powerbank', 'wheel-main', '5000 монета', 'balance', 5000, 'rare', 0.005000, 50, 'active', '#f97316', '{"card":"orange","rewardKind":"coins","displayOrder":8}'::jsonb),
    ('wheel-smartwatch', 'wheel-main', 'Смарт сағат', 'physical', 1, 'epic', 0.001800, 18, 'active', '#c084fc', '{"card":"purple","rewardKind":"physical","displayOrder":3}'::jsonb),
    ('wheel-iphone', 'wheel-main', 'iPhone 17 Pro Max 1TB', 'physical', 1, 'legendary', 0.000400, 4, 'active', '#fde047', '{"card":"gold","rewardKind":"physical","displayOrder":1}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    type = EXCLUDED.type,
    value = EXCLUDED.value,
    rarity = EXCLUDED.rarity,
    probability = EXCLUDED.probability,
    weight = EXCLUDED.weight,
    status = EXCLUDED.status,
    accent_color = EXCLUDED.accent_color,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();
