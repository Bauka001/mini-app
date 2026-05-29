-- ============================================================
-- COMBINED MIGRATIONS 001-007 — paste this whole file into
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================



-- >>>>>>>>>>>>>>>> 001_create_users_table.sql >>>>>>>>>>>>>>>>

-- Supabase Migration Script for Users Table
-- Run this in Supabase SQL Editor to create the users table and required functions

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT,
    username TEXT,
    photo_url TEXT,
    coins BIGINT DEFAULT 100,
    gems BIGINT DEFAULT 0,
    xp BIGINT DEFAULT 0,
    level BIGINT DEFAULT 1,
    brain_stats JSONB DEFAULT '{"focus": 20, "memory": 20, "logic": 20, "speed": 20, "flexibility": 20}',
    skin_inventory TEXT[] DEFAULT ARRAY['default'],
    active_skin TEXT DEFAULT 'default',
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'silver', 'gold', 'premium')),
    plan_expiry BIGINT,
    hp BIGINT DEFAULT 100,
    max_hp BIGINT DEFAULT 100,
    fec_balance BIGINT DEFAULT 0,
    inventory JSONB DEFAULT '{"freezes": 0, "hints": 0, "shields": 0}',
    daily_goal_minutes BIGINT DEFAULT 10,
    streak BIGINT DEFAULT 0,
    daily_reward_streak BIGINT DEFAULT 0,
    last_daily_reward_date TIMESTAMPTZ,
    promotion_end_iso TIMESTAMPTZ,
    daily_quest JSONB DEFAULT '{"id": "daily_quest_3games", "games_played": [], "is_completed": false, "is_claimed": false, "last_reset_date": null}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on telegram_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (telegram_id = (CURRENT_SETTING('request.jwt.claims', true)::JSONB->>'telegram_id')::BIGINT);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (telegram_id = (CURRENT_SETTING('request.jwt.claims', true)::JSONB->>'telegram_id')::BIGINT);

-- Function to record game results
CREATE OR REPLACE FUNCTION public.record_game_result(
    p_telegram_id BIGINT,
    p_game_id TEXT,
    p_score BIGINT,
    p_coins_earned BIGINT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET
        coins = coins + p_coins_earned,
        xp = xp + p_score,
        updated_at = NOW()
    WHERE telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record purchases
CREATE OR REPLACE FUNCTION public.record_purchase(
    p_telegram_id BIGINT,
    p_item_type TEXT,
    p_item_id TEXT,
    p_cost BIGINT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET
        coins = coins - p_cost,
        updated_at = NOW()
    WHERE telegram_id = p_telegram_id AND coins >= p_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync full user state
CREATE OR REPLACE FUNCTION public.sync_user_state(
    p_telegram_id BIGINT,
    p_data JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET
        coins = COALESCE((p_data->>'coins')::BIGINT, coins),
        gems = COALESCE((p_data->>'gems')::BIGINT, gems),
        xp = COALESCE((p_data->>'xp')::BIGINT, xp),
        level = COALESCE((p_data->>'level')::BIGINT, level),
        brain_stats = COALESCE((p_data->>'brain_stats')::JSONB, brain_stats),
        skin_inventory = COALESCE(p_data->>'skin_inventory', skin_inventory),
        active_skin = COALESCE((p_data->>'active_skin')::TEXT, active_skin),
        plan = COALESCE((p_data->>'plan')::TEXT, plan),
        plan_expiry = COALESCE((p_data->>'plan_expiry')::BIGINT, plan_expiry),
        hp = COALESCE((p_data->>'hp')::BIGINT, hp),
        max_hp = COALESCE((p_data->>'max_hp')::BIGINT, max_hp),
        fec_balance = COALESCE((p_data->>'fec_balance')::BIGINT, fec_balance),
        inventory = COALESCE((p_data->>'inventory')::JSONB, inventory),
        daily_goal_minutes = COALESCE((p_data->>'daily_goal_minutes')::BIGINT, daily_goal_minutes),
        streak = COALESCE((p_data->>'streak')::BIGINT, streak),
        daily_reward_streak = COALESCE((p_data->>'daily_reward_streak')::BIGINT, daily_reward_streak),
        last_daily_reward_date = COALESCE((p_data->>'last_daily_reward_date')::TIMESTAMPTZ, last_daily_reward_date),
        promotion_end_iso = COALESCE((p_data->>'promotion_end_iso')::TIMESTAMPTZ, promotion_end_iso),
        daily_quest = COALESCE((p_data->>'daily_quest')::JSONB, daily_quest),
        updated_at = NOW()
    WHERE telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- >>>>>>>>>>>>>>>> 002_admin_panel_foundation.sql >>>>>>>>>>>>>>>>

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS blocked_by BIGINT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS block_reason TEXT;

CREATE TABLE IF NOT EXISTS public.admin_users (
    telegram_id BIGINT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_entries (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_replies (
    id BIGSERIAL PRIMARY KEY,
    feedback_id BIGINT NOT NULL REFERENCES public.feedback_entries(id) ON DELETE CASCADE,
    admin_telegram_id BIGINT NOT NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_reports (
    id BIGSERIAL PRIMARY KEY,
    report_key TEXT UNIQUE,
    reporter_telegram_id BIGINT,
    reported_user_telegram_id BIGINT,
    username TEXT,
    group_id TEXT,
    group_name TEXT,
    message_id TEXT,
    message_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'hidden')),
    report_count INTEGER NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id BIGSERIAL PRIMARY KEY,
    admin_telegram_id BIGINT NOT NULL,
    report_id BIGINT REFERENCES public.chat_reports(id) ON DELETE SET NULL,
    target_user_telegram_id BIGINT,
    action_type TEXT NOT NULL,
    reason TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tickets (
    id TEXT PRIMARY KEY,
    ticket_number BIGINT UNIQUE NOT NULL,
    user_telegram_id BIGINT NOT NULL,
    user_name TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'used', 'cancelled')),
    verified_at TIMESTAMPTZ,
    verified_by BIGINT,
    source TEXT NOT NULL DEFAULT 'plan_upgrade'
);

CREATE TABLE IF NOT EXISTS public.ticket_verifications (
    id BIGSERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    ticket_number BIGINT NOT NULL,
    user_telegram_id BIGINT NOT NULL,
    verified_by BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'reverted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_telegram_id BIGINT NOT NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_created_at ON public.feedback_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_status ON public.feedback_entries(status);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback_id ON public.feedback_replies(feedback_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON public.chat_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_reports_created_at ON public.chat_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_admin_users" ON public.admin_users;
CREATE POLICY "service_role_only_admin_users" ON public.admin_users
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_feedback_entries" ON public.feedback_entries;
CREATE POLICY "service_role_only_feedback_entries" ON public.feedback_entries
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_feedback_replies" ON public.feedback_replies;
CREATE POLICY "service_role_only_feedback_replies" ON public.feedback_replies
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_chat_reports" ON public.chat_reports;
CREATE POLICY "service_role_only_chat_reports" ON public.chat_reports
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_moderation_actions" ON public.moderation_actions;
CREATE POLICY "service_role_only_moderation_actions" ON public.moderation_actions
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_tickets" ON public.tickets;
CREATE POLICY "service_role_only_tickets" ON public.tickets
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_ticket_verifications" ON public.ticket_verifications;
CREATE POLICY "service_role_only_ticket_verifications" ON public.ticket_verifications
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP POLICY IF EXISTS "service_role_only_audit_logs" ON public.audit_logs;
CREATE POLICY "service_role_only_audit_logs" ON public.audit_logs
    FOR ALL USING (FALSE) WITH CHECK (FALSE);

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_feedback_entries_updated_at ON public.feedback_entries;
CREATE TRIGGER update_feedback_entries_updated_at
    BEFORE UPDATE ON public.feedback_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_reports_updated_at ON public.chat_reports;
CREATE TRIGGER update_chat_reports_updated_at
    BEFORE UPDATE ON public.chat_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- >>>>>>>>>>>>>>>> 003_create_social_tasks.sql >>>>>>>>>>>>>>>>

-- Create social_tasks table
CREATE TABLE IF NOT EXISTS public.social_tasks (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'telegram', 'instagram', 'twitter', 'other')),
    url TEXT NOT NULL,
    reward INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger for social_tasks
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_social_tasks_updated_at
    BEFORE UPDATE ON public.social_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create user_social_tasks table to track completions
CREATE TABLE IF NOT EXISTS public.user_social_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    task_id TEXT NOT NULL REFERENCES public.social_tasks(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_telegram_id, task_id)
);

-- Enable RLS
ALTER TABLE public.social_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies (Service role bypasses RLS, so this is mostly for safety)
CREATE POLICY "Public tasks are viewable by everyone."
    ON public.social_tasks FOR SELECT
    USING (true);

CREATE POLICY "User tasks are viewable by the user."
    ON public.user_social_tasks FOR SELECT
    USING (true);

-- Insert initial tasks
INSERT INTO public.social_tasks (id, platform, url, reward, is_active) VALUES
('yt_founding', 'youtube', 'https://www.youtube.com/@founding.01', 10, true),
('ig_founding', 'instagram', 'https://www.instagram.com/focus_game_clube?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', 10, true),
('tg_founding', 'telegram', 'https://t.me/+od_Mx-6Iz3Q3NWEy', 10, true)
ON CONFLICT (id) DO NOTHING;


-- >>>>>>>>>>>>>>>> 004_secure_payment_foundation.sql >>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>> 005_wheel_of_fortune.sql >>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>> 006_admin_panel_v2.sql >>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>> 007_stars_focus_nft.sql >>>>>>>>>>>>>>>>

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
