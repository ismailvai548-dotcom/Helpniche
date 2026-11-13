-- Migration: 20261113_donation_verification.sql
-- Adds admin verification status columns to donations and provides canonical lookup RPC.

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

-- Canonical RPC to look up approved & pending donations by hashed sender phone + method
-- Privacy note: only accepts one-way SHA-256 sender hash and never returns raw phone numbers.
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
