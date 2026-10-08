-- ==============================================================================
-- FocusDurood App - Supabase Database Schema, Indexes, RLS & Atomic Function
-- ==============================================================================

-- 1. Create Table: unlock_requests
CREATE TABLE IF NOT EXISTS public.unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT DEFAULT 'anonymous_user',
    device_id TEXT NOT NULL,
    device_name TEXT DEFAULT 'Android Phone',
    telegram_chat_id BIGINT,
    reason TEXT DEFAULT 'জরুরি আনলক প্রয়োজন',
    status TEXT DEFAULT 'pending', -- 'pending', 'code_generated', 'sent', 'rejected', 'expired'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for unlock_requests
CREATE INDEX IF NOT EXISTS idx_unlock_requests_device_id ON public.unlock_requests(device_id);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_status ON public.unlock_requests(status);
CREATE INDEX IF NOT EXISTS idx_unlock_requests_telegram_chat_id ON public.unlock_requests(telegram_chat_id);

-- 2. Create Table: unlock_codes
CREATE TABLE IF NOT EXISTS public.unlock_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.unlock_requests(id) ON DELETE SET NULL,
    user_id TEXT DEFAULT 'anonymous_user',
    device_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    plaintext_code TEXT NOT NULL,
    status TEXT DEFAULT 'unused', -- 'unused', 'used', 'expired'
    duration_minutes INTEGER DEFAULT 10,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

-- Indexes for unlock_codes
CREATE INDEX IF NOT EXISTS idx_unlock_codes_device_id ON public.unlock_codes(device_id);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_code_hash ON public.unlock_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_plaintext_code ON public.unlock_codes(plaintext_code);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_status ON public.unlock_codes(status);
CREATE INDEX IF NOT EXISTS idx_unlock_codes_expires_at ON public.unlock_codes(expires_at);

-- 3. Create Table: telegram_users
CREATE TABLE IF NOT EXISTS public.telegram_users (
    telegram_chat_id BIGINT PRIMARY KEY,
    user_id TEXT,
    telegram_username TEXT,
    last_device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for telegram_users
CREATE INDEX IF NOT EXISTS idx_telegram_users_last_device_id ON public.telegram_users(last_device_id);

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) on all tables
-- ==============================================================================
ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anon Select Unlock Requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Anon Insert Unlock Requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Anon Update Unlock Requests" ON public.unlock_requests;
DROP POLICY IF EXISTS "Anon Select Unlock Codes" ON public.unlock_codes;
DROP POLICY IF EXISTS "Anon Update Unlock Codes" ON public.unlock_codes;
DROP POLICY IF EXISTS "Anon All Telegram Users" ON public.telegram_users;

-- RLS Policies for Client App (anon & authenticated roles)
CREATE POLICY "Anon Insert Unlock Requests" ON public.unlock_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon Select Unlock Requests" ON public.unlock_requests
    FOR SELECT USING (true);

CREATE POLICY "Anon Update Unlock Requests" ON public.unlock_requests
    FOR UPDATE USING (true);

CREATE POLICY "Anon Select Unlock Codes" ON public.unlock_codes
    FOR SELECT USING (true);

CREATE POLICY "Anon Update Unlock Codes" ON public.unlock_codes
    FOR UPDATE USING (true);

CREATE POLICY "Anon All Telegram Users" ON public.telegram_users
    FOR ALL USING (true);

-- ==============================================================================
-- 5. Atomic Code Verification & Consumption Database Function
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.consume_unlock_code(
    p_device_id TEXT,
    p_code_hash TEXT
) RETURNS JSONB AS $$
DECLARE
    v_rec RECORD;
    v_clean_device_id TEXT;
    v_clean_code_hash TEXT;
BEGIN
    -- 1. Trim and Clean input parameters
    v_clean_device_id := LOWER(TRIM(p_device_id));
    v_clean_code_hash := LOWER(TRIM(p_code_hash));

    IF v_clean_device_id IS NULL OR v_clean_device_id = '' OR v_clean_code_hash IS NULL OR v_clean_code_hash = '' THEN
        RETURN jsonb_build_object('success', false, 'message', '❌ ডিভাইস আইডি এবং কোড প্রদান করুন!');
    END IF;

    -- 2. Strict Search: Match device_id, code_hash, status='unused', and expires_at > NOW() (UTC)
    SELECT * INTO v_rec
    FROM public.unlock_codes
    WHERE LOWER(TRIM(device_id)) = v_clean_device_id
      AND LOWER(TRIM(code_hash)) = v_clean_code_hash
      AND status = 'unused'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    -- 3. If valid unused record not found, determine exact reason for rejection
    IF NOT FOUND THEN
        -- Check if code was already used
        IF EXISTS (
            SELECT 1 FROM public.unlock_codes
            WHERE LOWER(TRIM(device_id)) = v_clean_device_id
              AND LOWER(TRIM(code_hash)) = v_clean_code_hash
              AND status = 'used'
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', '❌ এই কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে!');

        -- Check if code expired
        ELSIF EXISTS (
            SELECT 1 FROM public.unlock_codes
            WHERE LOWER(TRIM(device_id)) = v_clean_device_id
              AND LOWER(TRIM(code_hash)) = v_clean_code_hash
              AND expires_at <= NOW()
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', '⏰ কোডটির মেয়াদ শেষ হয়ে গেছে! নতুন কোডের আবেদন করুন।');

        ELSE
            RETURN jsonb_build_object('success', false, 'message', '❌ ভুল বা অকার্যকর কোড দেওয়া হয়েছে!');
        END IF;
    END IF;

    -- 4. Mark code as used atomically
    UPDATE public.unlock_codes
    SET status = 'used',
        used_at = NOW()
    WHERE id = v_rec.id;

    -- 5. Mark associated request as fulfilled if exists
    IF v_rec.request_id IS NOT NULL THEN
        UPDATE public.unlock_requests
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = v_rec.request_id;
    END IF;

    -- 6. Return Success with unlock duration
    RETURN jsonb_build_object(
        'success', true,
        'duration_minutes', v_rec.duration_minutes,
        'message', '✅ Verification Successful! অ্যাপ আনলক সম্পন্ন হয়েছে।'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
