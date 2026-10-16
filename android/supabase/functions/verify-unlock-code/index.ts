import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashSha256(text: string): Promise<string> {
  const clean = text.trim();
  const msgUint8 = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- H5: per-device OTP rate limiting (backed by public.unlock_attempts) ---
// 5 failed attempts -> 15 minute lockout. All helpers fail OPEN (allow the
// attempt) when the unlock_attempts table/migration isn't applied yet, so code
// verification keeps working before the migration is deployed.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function getUnlockLockout(deviceId: string): Promise<{ locked: boolean; lockedUntil?: string }> {
  try {
    const { data, error } = await supabase
      .from("unlock_attempts")
      .select("failed_attempts, locked_until")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (error || !data) return { locked: false };
    if (data.locked_until && new Date(data.locked_until).getTime() > Date.now()) {
      return { locked: true, lockedUntil: data.locked_until };
    }
    // Lockout window passed (or counter saturated without a lock): reset so old
    // failures don't linger forever.
    if (data.locked_until || (data.failed_attempts || 0) >= MAX_FAILED_ATTEMPTS) {
      await supabase
        .from("unlock_attempts")
        .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
        .eq("device_id", deviceId);
    }
    return { locked: false };
  } catch {
    return { locked: false };
  }
}

async function recordUnlockAttempt(deviceId: string, success: boolean): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    if (success) {
      await supabase
        .from("unlock_attempts")
        .upsert(
          { device_id: deviceId, failed_attempts: 0, locked_until: null, updated_at: nowIso },
          { onConflict: "device_id" }
        );
      return;
    }
    // NOTE: read-modify-write increment; two failures racing in the same instant
    // can undercount by 1. Acceptable for a lockout mechanism, but a future
    // SECURITY DEFINER RPC could make it fully atomic.
    const { data } = await supabase
      .from("unlock_attempts")
      .select("failed_attempts")
      .eq("device_id", deviceId)
      .maybeSingle();
    const attempts = (data?.failed_attempts || 0) + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      : null;
    await supabase
      .from("unlock_attempts")
      .upsert(
        { device_id: deviceId, failed_attempts: attempts, locked_until: lockedUntil, updated_at: nowIso },
        { onConflict: "device_id" }
      );
  } catch {
    // Best-effort: never break code verification if the table isn't available.
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const { device_id, code } = await req.json();

    if (!device_id || !code) {
      return new Response(
        JSON.stringify({ success: false, message: "ডিভাইস আইডি এবং কোড প্রদান করুন।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Strict Trim & Clean Inputs
    const cleanDeviceId = device_id.toString().trim().toLowerCase();
    const cleanCode = code.toString().trim().replace(/\s+/g, "");
    const codeHash = await hashSha256(cleanCode);

    // H5: per-device rate limiting — 5 failed attempts -> 15 minute lockout
    const lockout = await getUnlockLockout(cleanDeviceId);
    if (lockout.locked) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `⛔ অনেকবার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে ${LOCKOUT_MINUTES} মিনিট পর আবার চেষ্টা করুন।`,
          locked_until: lockout.lockedUntil
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Try Atomic Database RPC Function consume_unlock_code
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("consume_unlock_code", {
      p_device_id: cleanDeviceId,
      p_code_hash: codeHash
    });

    if (!rpcErr && rpcResult) {
      await recordUnlockAttempt(cleanDeviceId, rpcResult.success === true);
      return new Response(
        JSON.stringify(rpcResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fallback: Direct Query in case RPC function is not created in DB yet
    console.warn("RPC consume_unlock_code not found or failed, using fallback query:", rpcErr);

    const nowIso = new Date().toISOString();

    // Query unlock_codes table for matching record
    const { data: codeRecs, error: fetchErr } = await supabase
      .from("unlock_codes")
      .select("*")
      .eq("device_id", cleanDeviceId)
      .eq("code_hash", codeHash)
      .order("created_at", { ascending: false });

    if (fetchErr || !codeRecs || codeRecs.length === 0) {
      await recordUnlockAttempt(cleanDeviceId, false);
      return new Response(
        JSON.stringify({ success: false, message: "❌ ভুল বা অকার্যকর কোড দেওয়া হয়েছে!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find first unused & unexpired matching record
    const validRec = codeRecs.find(r => r.status === "unused" && new Date(r.expires_at) > new Date(nowIso));

    if (!validRec) {
      const usedRec = codeRecs.find(r => r.status === "used");
      if (usedRec) {
        await recordUnlockAttempt(cleanDeviceId, false);
        return new Response(
          JSON.stringify({ success: false, message: "❌ এই কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiredRec = codeRecs.find(r => new Date(r.expires_at) <= new Date(nowIso));
      if (expiredRec) {
        await recordUnlockAttempt(cleanDeviceId, false);
        return new Response(
          JSON.stringify({ success: false, message: "⏰ কোডটির মেয়াদ শেষ হয়ে গেছে! নতুন কোডের আবেদন করুন।" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await recordUnlockAttempt(cleanDeviceId, false);
      return new Response(
        JSON.stringify({ success: false, message: "❌ ভুল বা অকার্যকর কোড দেওয়া হয়েছে!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // H4: atomic consumption — a single UPDATE ... WHERE status='unused' RETURNING.
    // A concurrent request racing on the same code gets zero rows back, so the
    // code can never be spent twice. Zero rows = invalid / already-used.
    const { data: consumedRows, error: consumeErr } = await supabase
      .from("unlock_codes")
      .update({ status: "used", used_at: nowIso })
      .eq("id", validRec.id)
      .eq("status", "unused")
      .gt("expires_at", nowIso)
      .select("id, request_id, duration_minutes");

    if (consumeErr || !consumedRows || consumedRows.length === 0) {
      await recordUnlockAttempt(cleanDeviceId, false);
      return new Response(
        JSON.stringify({ success: false, message: "❌ এই কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const consumed = consumedRows[0];
    if (consumed.request_id) {
      await supabase
        .from("unlock_requests")
        .update({ status: "approved", approved_at: nowIso, updated_at: nowIso })
        .eq("id", consumed.request_id);
    }

    await recordUnlockAttempt(cleanDeviceId, true);

    return new Response(
      JSON.stringify({
        success: true,
        duration_minutes: consumed.duration_minutes || 10,
        message: "✅ Verification Successful! অ্যাপ আনলক সম্পন্ন হয়েছে।"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || "An error occurred during verification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
