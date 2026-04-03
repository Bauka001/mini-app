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
