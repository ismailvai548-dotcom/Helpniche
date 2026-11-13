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
      AND (c.expires_at IS NULL OR c.expires_at > v_now)
    FOR UPDATE OF c;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'ভুল, মেয়াদোত্তীর্ণ বা ইতিমধ্যে ব্যবহৃত কোড।'
        );
    END IF;

    UPDATE public.unlock_codes
    SET status = 'used',
        used_at = v_now,
        is_used = true
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

-- 7. Backward-compatible Plaintext Unlock Verification Function
CREATE OR REPLACE FUNCTION public.verify_unlock_code(
    p_device_id TEXT,
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_device TEXT;
    v_clean_code TEXT;
    v_code_hash TEXT;
BEGIN
    v_clean_device := lower(trim(p_device_id));
    v_clean_code := replace(trim(p_code), ' ', '');
    v_code_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

    RETURN public.consume_unlock_code(v_clean_device, v_code_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_unlock_code(TEXT, TEXT) TO anon, authenticated, service_role;

-- 8. Zero-Touch Remote Unlock RPC & Policies
CREATE OR REPLACE FUNCTION public.check_and_consume_remote_unlock(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
    v_minutes INTEGER := 5;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT id, reason, status
    INTO v_req
    FROM public.unlock_requests
    WHERE lower(device_id) = lower(trim(p_device_id))
      AND status = 'approved'
    ORDER BY approved_at DESC NULLS LAST, created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false);
    END IF;

    IF v_req.reason IS NOT NULL AND v_req.reason LIKE 'remote_unlock:%' THEN
        v_minutes := COALESCE(NULLIF(split_part(v_req.reason, ':', 2), '')::INTEGER, 5);
    END IF;

    UPDATE public.unlock_requests
    SET status = 'pending',
        reason = 'remote_unlocked_consumed',
        updated_at = v_now
    WHERE id = v_req.id;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_req.id,
        'duration_minutes', v_minutes
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_consume_remote_unlock(TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "anon_select_approved_unlock_requests" ON public.unlock_requests;
CREATE POLICY "anon_select_approved_unlock_requests" ON public.unlock_requests
    FOR SELECT TO anon USING (status = 'approved');

DROP POLICY IF EXISTS "anon_update_approved_unlock_requests" ON public.unlock_requests;
CREATE POLICY "anon_update_approved_unlock_requests" ON public.unlock_requests
    FOR UPDATE TO anon USING (status = 'approved') WITH CHECK (true);

-- 9. Admin-Confirmed Donation Verification Columns & Lookup RPC
ALTER TABLE public.donations
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS request_id UUID,
    ADD COLUMN IF NOT EXISTS device_id TEXT,
    ADD COLUMN IF NOT EXISTS sender_masked TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by TEXT;

CREATE INDEX IF NOT EXISTS idx_donations_sender_method_status
    ON public.donations(sender, method, status);

CREATE INDEX IF NOT EXISTS idx_donations_request_id
    ON public.donations(request_id);

CREATE OR REPLACE FUNCTION public.verify_donations_by_sender(
    p_sender_hash TEXT,
    p_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_norm_hash TEXT := lower(trim(COALESCE(p_sender_hash, '')));
    v_norm_method TEXT := lower(trim(COALESCE(p_method, '')));
    v_approved JSONB;
    v_pending_count INTEGER := 0;
    v_pending_amount NUMERIC := 0;
BEGIN
    IF v_norm_hash = '' OR v_norm_method = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'approved_total', 0,
            'approved_items', '[]'::jsonb,
            'pending_count', 0,
            'pending_amount', 0
        );
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', COALESCE(d.request_id, d.id),
            'amount', d.amount,
            'method', d.method,
            'created_at', d.created_at,
            'approved_at', d.approved_at
        ) ORDER BY d.created_at DESC
    ), '[]'::jsonb)
    INTO v_approved
    FROM public.donations d
    WHERE lower(d.sender) = v_norm_hash
      AND d.status = 'approved'
      AND (
          (v_norm_method = 'bkash' AND lower(d.method) LIKE '%bkash%')
          OR (v_norm_method = 'nagad' AND lower(d.method) LIKE '%nagad%')
          OR lower(d.method) = v_norm_method
      );

    SELECT COUNT(*), COALESCE(SUM(d.amount), 0)
    INTO v_pending_count, v_pending_amount
    FROM public.donations d
    WHERE lower(d.sender) = v_norm_hash
      AND COALESCE(d.status, 'pending') = 'pending'
      AND (
          (v_norm_method = 'bkash' AND lower(d.method) LIKE '%bkash%')
          OR (v_norm_method = 'nagad' AND lower(d.method) LIKE '%nagad%')
          OR lower(d.method) = v_norm_method
      );

    RETURN jsonb_build_object(
        'success', true,
        'approved_items', v_approved,
        'approved_total', COALESCE((
            SELECT SUM((item->>'amount')::NUMERIC) FROM jsonb_array_elements(v_approved) item
        ), 0),
        'pending_count', v_pending_count,
        'pending_amount', v_pending_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_donations_by_sender(TEXT, TEXT) TO anon, authenticated, service_role;


