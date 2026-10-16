-- ==============================================================================
-- Bug-batch-2 migration (2026-10-16)
--   H1: restrictive RLS on public.donations (anon INSERT-only; SELECT restricted)
--   H5: public.unlock_attempts table for per-device OTP rate limiting
-- ==============================================================================
-- NOTE: the donations table is created/managed by the app flow already; this
-- migration only tightens its Row Level Security. The verify-unlock-code edge
-- function degrades gracefully (rate limiting disabled) until unlock_attempts
-- exists, so applying this migration is what ACTIVATES the H5 lockout.

-- --- H1: donations RLS -------------------------------------------------------
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_donations" ON public.donations;
CREATE POLICY "service_role_all_donations" ON public.donations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon may INSERT donation backups (app writes with the anon key) but can
-- never SELECT / UPDATE / DELETE: donor TrxIDs and sender hashes stay private.
DROP POLICY IF EXISTS "anon_insert_donations" ON public.donations;
CREATE POLICY "anon_insert_donations" ON public.donations
    FOR INSERT TO anon WITH CHECK (true);

-- Defensively drop any overly-permissive legacy policies if they exist.
DROP POLICY IF EXISTS "public_read_donations" ON public.donations;
DROP POLICY IF EXISTS "anon_select_donations" ON public.donations;
DROP POLICY IF EXISTS "anon_all_donations" ON public.donations;
DROP POLICY IF EXISTS "authenticated_all_donations" ON public.donations;

-- --- H5: per-device OTP rate-limit state --------------------------------------
CREATE TABLE IF NOT EXISTS public.unlock_attempts (
    device_id TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.unlock_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_unlock_attempts" ON public.unlock_attempts;
CREATE POLICY "service_role_all_unlock_attempts" ON public.unlock_attempts
    FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Intentionally NO anon/authenticated policies: only the edge function
-- (service role key) reads/writes this table.
