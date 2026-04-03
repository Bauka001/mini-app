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
