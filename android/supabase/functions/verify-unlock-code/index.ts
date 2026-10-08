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

    // 2. Try Atomic Database RPC Function consume_unlock_code
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("consume_unlock_code", {
      p_device_id: cleanDeviceId,
      p_code_hash: codeHash
    });

    if (!rpcErr && rpcResult) {
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
      .or(`code_hash.eq.${codeHash},plaintext_code.eq.${cleanCode}`)
      .order("created_at", { ascending: false });

    if (fetchErr || !codeRecs || codeRecs.length === 0) {
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
        return new Response(
          JSON.stringify({ success: false, message: "❌ এই কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiredRec = codeRecs.find(r => new Date(r.expires_at) <= new Date(nowIso));
      if (expiredRec) {
        return new Response(
          JSON.stringify({ success: false, message: "⏰ কোডটির মেয়াদ শেষ হয়ে গেছে! নতুন কোডের আবেদন করুন।" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, message: "❌ ভুল বা অকার্যকর কোড দেওয়া হয়েছে!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark code as used
    await supabase
      .from("unlock_codes")
      .update({ status: "used", used_at: nowIso })
      .eq("id", validRec.id);

    if (validRec.request_id) {
      await supabase
        .from("unlock_requests")
        .update({ status: "completed", updated_at: nowIso })
        .eq("id", validRec.request_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        duration_minutes: validRec.duration_minutes || 10,
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
