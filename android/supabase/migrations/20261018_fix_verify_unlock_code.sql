-- ============================================================================
-- 20261018: Fix verify_unlock_code to support direct plaintext code verification
-- ============================================================================
-- This function computes the SHA-256 hash of the plaintext code using pgcrypto
-- and delegates to the canonical consume_unlock_code function.
-- This ensures backward compatibility for any callers expecting verify_unlock_code.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
