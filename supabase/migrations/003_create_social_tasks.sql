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
