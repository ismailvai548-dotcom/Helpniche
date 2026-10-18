-- ============================================================================
-- 20261018: Complete Unlock System Reconcile & Compatibility Fix
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure backward-compatible columns exist on unlock_codes table
ALTER TABLE public.unlock_codes ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.unlock_codes ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;

-- 2. Trigger to automatically backfill code_hash & status if legacy bot writes code/is_used
CREATE OR REPLACE FUNCTION public.trg_unlock_codes_legacy_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.code_hash IS NULL AND NEW.code IS NOT NULL THEN
        NEW.code_hash := encode(digest(replace(trim(NEW.code), ' ', ''), 'sha256'), 'hex');
    END IF;
    IF NEW.status IS NULL THEN
        IF NEW.is_used = true THEN
            NEW.status := 'used';
        ELSE
            NEW.status := 'unused';
        END IF;
    END IF;
    IF NEW.expires_at IS NULL AND NEW.duration_minutes IS NOT NULL THEN
        NEW.expires_at := now() + (NEW.duration_minutes || ' minutes')::interval;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_codes_legacy_compat_trigger ON public.unlock_codes;
CREATE TRIGGER trg_unlock_codes_legacy_compat_trigger
    BEFORE INSERT OR UPDATE ON public.unlock_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_unlock_codes_legacy_compat();

-- 3. Fix consume_unlock_code to support NULL expires_at
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

-- 4. Create backward-compatible verify_unlock_code function
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

