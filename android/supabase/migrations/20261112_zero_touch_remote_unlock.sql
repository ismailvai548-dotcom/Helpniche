-- Migration: 20261112_zero_touch_remote_unlock.sql
-- Enables atomic zero-touch remote unlock from Telegram bot without code typing.

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

-- Allow anon to select and update approved unlock requests as fallback
DROP POLICY IF EXISTS "anon_select_approved_unlock_requests" ON public.unlock_requests;
CREATE POLICY "anon_select_approved_unlock_requests" ON public.unlock_requests
    FOR SELECT TO anon USING (status = 'approved');

DROP POLICY IF EXISTS "anon_update_approved_unlock_requests" ON public.unlock_requests;
CREATE POLICY "anon_update_approved_unlock_requests" ON public.unlock_requests
    FOR UPDATE TO anon USING (status = 'approved') WITH CHECK (true);
