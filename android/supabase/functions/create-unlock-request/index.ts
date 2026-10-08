import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const { user_id, device_id, device_name, reason } = await req.json();

    if (!device_id) {
      return new Response(
        JSON.stringify({ success: false, message: "device_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanDeviceId = device_id.trim().toLowerCase();
    const cleanDeviceName = device_name ? device_name.trim() : "Android Phone";
    const cleanReason = reason ? reason.trim() : "জরুরি আনলক প্রয়োজন";
    const cleanUserId = user_id ? user_id.trim() : "anonymous_user";

    // 1. Check if user already registered telegram_chat_id for this device_id
    let telegramChatId: string | number = "";
    const { data: tgUser } = await supabase
      .from("telegram_users")
      .select("telegram_chat_id")
      .eq("last_device_id", cleanDeviceId)
      .limit(1)
      .maybeSingle();

    if (tgUser && tgUser.telegram_chat_id) {
      telegramChatId = tgUser.telegram_chat_id;
    }

    // 2. Expire previous pending unlock requests for this device
    await supabase
      .from("unlock_requests")
      .update({ status: "expired" })
      .eq("device_id", cleanDeviceId)
      .eq("status", "pending");

    // 3. Insert New Unlock Request into Supabase
    const { data: requestRec, error: reqErr } = await supabase
      .from("unlock_requests")
      .insert({
        user_id: cleanUserId,
        device_id: cleanDeviceId,
        device_name: cleanDeviceName,
        telegram_chat_id: telegramChatId ? telegramChatId : null,
        reason: cleanReason,
        status: "pending"
      })
      .select()
      .single();

    if (reqErr || !requestRec) {
      console.error("Database Insert Error:", reqErr);
      return new Response(
        JSON.stringify({ success: false, message: "রিকোয়েস্ট ডাটাবেসে সেভ করা সম্ভব হয়নি।", db_error: reqErr }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Send Admin Telegram Notification with Duration & Action buttons
    const userDisplay = telegramChatId ? `ChatID: <code>${telegramChatId}</code>` : cleanUserId;
    const adminMessage = `🔔 <b>New Unlock Request</b>\n\n📱 <b>Device:</b> ${cleanDeviceName}\n🆔 <b>Device ID:</b> <code>${cleanDeviceId}</code>\n👤 <b>User:</b> ${userDisplay}\n\n📝 <b>Reason:</b>\n<i>${cleanReason}</i>\n\n📌 <b>Status:</b> Pending`;

    const userChatIdStr = telegramChatId ? telegramChatId.toString() : "";

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "⏱️ ৫ মিনিট", callback_data: `need_code:5:${requestRec.id}:${userChatIdStr}:${cleanDeviceId}` },
          { text: "⏱️ ১০ মিনিট", callback_data: `need_code:10:${requestRec.id}:${userChatIdStr}:${cleanDeviceId}` }
        ],
        [
          { text: "⏱️ ৩০ মিনিট", callback_data: `need_code:30:${requestRec.id}:${userChatIdStr}:${cleanDeviceId}` },
          { text: "♾️ পার্মানেন্ট", callback_data: `need_code:perm:${requestRec.id}:${userChatIdStr}:${cleanDeviceId}` }
        ],
        [
          { text: "❌ বাতিল", callback_data: `reject_req:${requestRec.id}:${userChatIdStr}` }
        ]
      ]
    };

    if (TELEGRAM_BOT_TOKEN && ADMIN_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: adminMessage,
          parse_mode: "HTML",
          reply_markup: inlineKeyboard
        })
      }).catch(err => console.error("Telegram Send Error:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestRec.id,
        message: "অনুরোধটি সফলভাবে তৈরি করা হয়েছে এবং অ্যাডমিনের কাছে নোটিফিকেশন পাঠানো হয়েছে।"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
