-- ==============================================================================
-- FocusDurood App - Canonical Supabase Database Schema, Indexes, RLS & RPC
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: telegram_users
CREATE TABLE IF NOT EXISTS public.telegram_users (
    telegram_chat_id BIGINT PRIMARY KEY,
    user_id TEXT,
    telegram_username TEXT,
    last_device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_last_device ON public.telegram_users(last_device_id);

-- 2. Table: unlock_requests
CREATE TABLE IF NOT EXISTS public.unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT DEFAULT 'anonymous_user',
    device_id TEXT NOT NULL,
    device_name TEXT DEFAULT 'Android Phone',
    telegram_chat_id BIGINT,
    reason TEXT DEFAULT 'জরুরি আনলক প্রয়োজন',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'code_generated', 'sent', 'approved', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unlock_requests_device_id ON public.unlock_requests(device_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.unlock_requests(status);

-- 3. Table: unlock_codes
CREATE TABLE IF NOT EXISTS public.unlock_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.unlock_requests(id) ON DELETE CASCADE,
    user_id TEXT DEFAULT 'anonymous_user',
    device_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired', 'revoked')),
    duration_minutes INTEGER DEFAULT 10 NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_unlock_codes_verify ON public.unlock_codes(device_id, code_hash, status);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_expires_at ON public.unlock_codes(expires_at);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_codes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Service Role: Full access
CREATE POLICY "service_role_all_telegram_users" ON public.telegram_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_unlock_requests" ON public.unlock_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_unlock_codes" ON public.unlock_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon Role:
-- Can only insert unlock_requests, cannot read or tamper with codes
CREATE POLICY "anon_insert_unlock_requests" ON public.unlock_requests
    FOR INSERT TO anon WITH CHECK (true);

-- 5b. Donations table: restrictive RLS (H1 — donor PII protection).
-- Anon: INSERT-only. No SELECT/UPDATE/DELETE policy for anon or authenticated,
-- so donation rows (TrxID + sender hash) are never publicly readable.
-- Service role keeps full access.
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_donations" ON public.donations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_donations" ON public.donations
    FOR INSERT TO anon WITH CHECK (true);

-- 5c. Per-device OTP rate-limit state for verify-unlock-code (H5).
-- Only the edge function (service role) touches this table: no anon or
-- authenticated policies at all.
CREATE TABLE IF NOT EXISTS public.unlock_attempts (
    device_id TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.unlock_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_unlock_attempts" ON public.unlock_attempts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Atomic Code Verification & Consumption Function
CREATE OR REPLACE FUNCTION public.consume_unlock_code(
    p_device_id TEXT,
    p_code_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code_rec RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT c.id, c.request_id, c.duration_minutes, c.expires_at, c.status
    INTO v_code_rec
    FROM public.unlock_codes c
    WHERE lower(c.device_id) = lower(p_device_id)
      AND c.code_hash = p_code_hash
      AND c.status = 'unused'
      AND c.expires_at > v_now
    FOR UPDATE OF c;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'ভুল, মেয়াদোত্তীর্ণ বা ইতিমধ্যে ব্যবহৃত কোড।'
        );
    END IF;

    UPDATE public.unlock_codes
    SET status = 'used',
        used_at = v_now
    WHERE id = v_code_rec.id;

    IF v_code_rec.request_id IS NOT NULL THEN
        UPDATE public.unlock_requests
        SET status = 'approved',
            approved_at = v_now,
            updated_at = v_now
        WHERE id = v_code_rec.request_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'duration_minutes', v_code_rec.duration_minutes,
        'message', 'আনলক কোড সফলভাবে যাচাই করা হয়েছে।'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_unlock_code(TEXT, TEXT) TO anon, authenticated, service_role;
