-- ============================================================================
-- Canonical Database Reconcile & RLS Hardening Migration
-- ============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure canonical table: telegram_users
CREATE TABLE IF NOT EXISTS public.telegram_users (
    telegram_chat_id BIGINT PRIMARY KEY,
    user_id TEXT,
    telegram_username TEXT,
    last_device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Ensure canonical table: unlock_requests
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

-- 4. Ensure canonical table: unlock_codes
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

-- Drop plaintext_code or legacy mismatch columns if they exist
ALTER TABLE public.unlock_codes DROP COLUMN IF EXISTS plaintext_code;
ALTER TABLE public.unlock_codes DROP COLUMN IF EXISTS code;
ALTER TABLE public.unlock_codes DROP COLUMN IF EXISTS is_used;

-- 5. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_unlock_requests_device_id ON public.unlock_requests(device_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.unlock_requests(status);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_verify ON public.unlock_codes(device_id, code_hash, status);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_expires_at ON public.unlock_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_users_last_device ON public.telegram_users(last_device_id);

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_codes ENABLE ROW LEVEL SECURITY;

-- 7. Drop legacy open policies
DROP POLICY IF EXISTS "Service role full access on telegram_users" ON public.telegram_users;
DROP POLICY IF EXISTS "Service role full access on unlock_requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Service role full access on unlock_codes" ON public.unlock_codes;

DROP POLICY IF EXISTS "Anon Select Unlock Requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Anon Insert Unlock Requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Anon Update Unlock Requests" ON public.unlock_requests;

DROP POLICY IF EXISTS "Anon Select Unlock Codes" ON public.unlock_codes;
DROP POLICY IF EXISTS "Anon Update Unlock Codes" ON public.unlock_codes;
DROP POLICY IF EXISTS "Anon All Telegram Users" ON public.telegram_users;

DROP POLICY IF EXISTS "service_role_all_telegram_users" ON public.telegram_users;
DROP POLICY IF EXISTS "service_role_all_unlock_requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "service_role_all_unlock_codes" ON public.unlock_codes;
DROP POLICY IF EXISTS "anon_insert_unlock_requests" ON public.unlock_requests;

-- 8. Create Secure, Least-Privilege Policies
-- SERVICE_ROLE: Full access to all tables (Edge functions & Bot servers)
CREATE POLICY "service_role_all_telegram_users" ON public.telegram_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_unlock_requests" ON public.unlock_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_unlock_codes" ON public.unlock_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ANON ROLE (Mobile Client):
-- unlock_requests: Anon can insert new requests, but cannot read or modify others
CREATE POLICY "anon_insert_unlock_requests" ON public.unlock_requests
    FOR INSERT TO anon WITH CHECK (true);

-- unlock_codes: No policies created for anon (Default DENY).
-- Codes can ONLY be consumed through the SECURITY DEFINER function consume_unlock_code.

-- 9. Atomic Code Verification & Consumption Function
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

    -- Update code status to used
    UPDATE public.unlock_codes
    SET status = 'used',
        used_at = v_now
    WHERE id = v_code_rec.id;

    -- Update parent request status to approved
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

-- Grant execution rights to anon and authenticated
GRANT EXECUTE ON FUNCTION public.consume_unlock_code(TEXT, TEXT) TO anon, authenticated, service_role;
