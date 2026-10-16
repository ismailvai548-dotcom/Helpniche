import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
// Optional shared secret for webhook validation (H3). Only enforced when set,
// so local testing without it keeps working.
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Critical: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined!");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateSecureRandomCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}

async function hashSha256(text: string): Promise<string> {
  const clean = text.trim();
  const msgUint8 = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("sendTelegramMessage error: missing token or chatId", { tokenConfigured: !!TELEGRAM_BOT_TOKEN, chatId });
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      })
    });
    const data = await res.json();
    return data && data.ok;
  } catch (err) {
    console.error("Telegram Send Message Error:", err);
    return false;
  }
}

async function answerCallbackQuery(queryId: string, text: string, showAlert = false) {
  if (!TELEGRAM_BOT_TOKEN || !queryId) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: queryId, text: text, show_alert: showAlert })
    });
  } catch (err) {
    console.error("Answer Callback Error:", err);
  }
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // H3: validate the Telegram webhook shared secret when configured.
    if (TELEGRAM_WEBHOOK_SECRET) {
      const gotSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
      if (gotSecret !== TELEGRAM_WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const update = await req.json();

    // 1. Handle Callbacks from Admin Inline Keyboard
    if (update.callback_query) {
      const query = update.callback_query;
      const fromUserId = query.from ? query.from.id.toString() : "";

      // H2: fail CLOSED — when TELEGRAM_ADMIN_CHAT_ID is unset/empty, deny ALL
      // admin actions instead of letting everyone through.
      if (!ADMIN_CHAT_ID || fromUserId !== ADMIN_CHAT_ID) {
        await answerCallbackQuery(query.id, "❌ আপনার এই কাজটি করার অনুমতি নেই।", true);
        return new Response("OK");
      }

      const dataStr = query.data as string;

      // Handle [ Need Code ] Callbacks (supports both cd: and need_code:)
      if (dataStr.startsWith("cd:") || dataStr.startsWith("need_code:")) {
        const parts = dataStr.split(":");
        const durType = parts[1] || "10";
        const requestId = parts[2] || "";
        let userChatId = parts[3] || "";
        let deviceId = parts[4] || "";

        let durationMinutes = 10;
        let durationLabel = "10 minutes";
        let durBangla = "১০ মিনিট";

        if (durType === "5" || durType === "5m") {
          durationMinutes = 5;
          durationLabel = "5 minutes";
          durBangla = "৫ মিনিট";
        } else if (durType === "10" || durType === "10m") {
          durationMinutes = 10;
          durationLabel = "10 minutes";
          durBangla = "১০ মিনিট";
        } else if (durType === "30" || durType === "30m") {
          durationMinutes = 30;
          durationLabel = "30 minutes";
          durBangla = "৩০ মিনিট";
        } else if (durType === "perm" || durType === "unlimited") {
          durationMinutes = 999999;
          durationLabel = "Permanent";
          durBangla = "স্থায়ী";
        }

        let reqData: any = null;
        if (requestId) {
          try {
            const { data } = await supabase
              .from("unlock_requests")
              .select("*")
              .eq("id", requestId)
              .maybeSingle();
            reqData = data;
          } catch (e) {
            console.error("DB Fetch Request Error:", e);
          }
        }

        if (reqData) {
          if (!deviceId) deviceId = reqData.device_id;
          if (!userChatId && reqData.telegram_chat_id) userChatId = reqData.telegram_chat_id.toString();
        }

        const cleanDeviceId = deviceId ? deviceId.trim().toLowerCase() : "";

        if (!cleanDeviceId) {
          await answerCallbackQuery(query.id, "⚠️ ডিভাইস আইডি পাওয়া যায়নি!", true);
          return new Response("OK");
        }

        if (!userChatId) {
          try {
            const { data: tgUser } = await supabase
              .from("telegram_users")
              .select("telegram_chat_id")
              .eq("last_device_id", cleanDeviceId)
              .limit(1)
              .maybeSingle();
            if (tgUser && tgUser.telegram_chat_id) {
              userChatId = tgUser.telegram_chat_id.toString();
            }
          } catch (e) {
            console.error("DB Fetch TG User Error:", e);
          }
        }

        // Expire previous unused codes
        try {
          await supabase
            .from("unlock_codes")
            .update({ status: "expired" })
            .eq("device_id", cleanDeviceId)
            .eq("status", "unused");
        } catch (e) {
          console.error("DB Expire Codes Error:", e);
        }

        const plaintextCode = generateSecureRandomCode();
        const codeHash = await hashSha256(plaintextCode);
        const validityWindowMs = Math.max(durationMinutes * 60 * 1000, 30 * 60 * 1000);
        const expiresAt = new Date(Date.now() + validityWindowMs).toISOString();

        // H7: never display or send a code that was NOT persisted. Fail loudly instead.
        let codePersisted = false;
        try {
          const { error } = await supabase
            .from("unlock_codes")
            .insert({
              request_id: requestId || null,
              user_id: reqData ? reqData.user_id : "anonymous_user",
              device_id: cleanDeviceId,
              code_hash: codeHash,
              status: "unused",
              duration_minutes: durationMinutes,
              expires_at: expiresAt,
              created_by: "admin"
            });
          if (error) {
            console.error("Code Save DB Error:", error);
          } else {
            codePersisted = true;
          }
        } catch (e) {
          console.error("DB Insert Code Exception:", e);
        }

        if (!codePersisted) {
          await answerCallbackQuery(query.id, "❌ ডাটাবেসে কোড সংরক্ষণ ব্যর্থ হয়েছে! কোড পাঠানো হয়নি।", true);
          if (ADMIN_CHAT_ID) {
            await sendTelegramMessage(ADMIN_CHAT_ID, `❌ <b>Unlock Code তৈরি ব্যর্থ</b>\n\n📱 <b>Device:</b> <code>${cleanDeviceId}</code>\n\n⚠️ কোডটি ডাটাবেসে সংরক্ষণ করা যায়নি, তাই ইউজারকে পাঠানো হয়নি।`);
          }
          return new Response("OK");
        }

        let userDelivered = false;
        if (userChatId && userChatId !== "undefined" && userChatId !== "null") {
          const userMsg = `🔐 <b>Unlock Code</b>\n\nআপনার Unlock Code:\n\n<code>${plaintextCode}</code>\n\n⏱️ এই কোডটি <b>${durBangla} আনলকের জন্য</b> ব্যবহারযোগ্য।\n⏳ কোডটি আগামী ৩০ মিনিটের মধ্যে অ্যাপে ব্যবহার করুন।\n🔄 কোডটি শুধুমাত্র একবার ব্যবহার করা যাবে।\n📱 ডিভাইস: <code>${cleanDeviceId}</code>`;
          userDelivered = await sendTelegramMessage(userChatId, userMsg);
          if (userDelivered && requestId) {
            try {
              await supabase.from("unlock_requests").update({ status: "sent", telegram_chat_id: userChatId }).eq("id", requestId);
            } catch (e) {}
          }
        } else if (requestId) {
          try {
            await supabase.from("unlock_requests").update({ status: "code_generated" }).eq("id", requestId);
          } catch (e) {}
        }

        const deviceNameDisplay = reqData ? reqData.device_name : "Android Device";
        const deliveryText = userDelivered ? "✅ ইউজারের টেলিগ্রামে কোড পাঠানো হয়েছে" : "⚠️ ইউজারের টেলিগ্রাম চ্যাট পাওয়া যায়নি (কোডটি সরাসরি কপি করুন)";
        const genMsg = `🔑 <b>Unlock Code Generated</b>\n\n📱 <b>Device:</b> ${deviceNameDisplay}\n🆔 <b>Device ID:</b> <code>${cleanDeviceId}</code>\n\n🔑 <b>Unique Code:</b> <code>${plaintextCode}</code>\n\n⏱️ <b>Duration:</b> ${durationLabel} (${durBangla})\n⏳ <b>OTP Valid Window:</b> 30 Mins\n📌 <b>Status:</b> ${deliveryText}`;

        if (query.message && query.message.message_id) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              text: genMsg,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [] }
            })
          }).catch(() => {});
        } else {
          await sendTelegramMessage(ADMIN_CHAT_ID, genMsg);
        }

        await answerCallbackQuery(query.id, `ইউনিক কোড তৈরি করা হয়েছে: ${plaintextCode}`, false);
      }

      // Handle Reject Request (supports both rj: and reject_req:)
      else if (dataStr.startsWith("rj:") || dataStr.startsWith("reject_req:")) {
        const parts = dataStr.split(":");
        const requestId = parts[1] || "";
        let userChatId = parts[2] || "";

        if (requestId) {
          try {
            const { data: rData } = await supabase.from("unlock_requests").select("telegram_chat_id").eq("id", requestId).maybeSingle();
            if (rData && rData.telegram_chat_id) {
              userChatId = rData.telegram_chat_id.toString();
            }
            await supabase.from("unlock_requests").update({ status: "rejected" }).eq("id", requestId);
          } catch (e) {}
        }

        await answerCallbackQuery(query.id, "রিকোয়েস্ট বাতিল করা হয়েছে।", false);

        if (userChatId && userChatId !== "undefined") {
          await sendTelegramMessage(userChatId, "❌ <b>দুঃখিত, অ্যাডমিন আপনার আনলক করার অনুরোধটি বাতিল করেছেন।</b>");
        }

        if (query.message && query.message.message_id) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              text: `${query.message.text}\n\n❌ <b>REJECTED BY ADMIN</b>`,
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: [] }
            })
          }).catch(() => {});
        }
      }
    }

    // 2. Handle User Commands (/start unlock_<deviceId>_<deviceName>)
    if (update.message) {
      const msg = update.message;
      const userChatId = msg.chat.id;
      const text = (msg.text || "").trim();
      const username = msg.from ? msg.from.username || "" : "";

      if (text.startsWith("/start")) {
        let rawParam = text.substring(6).trim();
        if (rawParam.startsWith("unlock_")) {
          rawParam = rawParam.substring(7);
        }

        let deviceId = "";
        let deviceName = "Android Phone";

        const parts = rawParam.split("_");
        if (parts.length >= 2) {
          deviceId = parts[0].trim().toLowerCase();
          deviceName = parts.slice(1).join(" ").trim();
        } else if (rawParam) {
          deviceId = rawParam.trim().toLowerCase();
        }

        // Try DB Upserts silently without blocking message delivery
        if (deviceId) {
          try {
            await supabase.from("telegram_users").upsert({
              telegram_chat_id: userChatId,
              telegram_username: username,
              last_device_id: deviceId,
              updated_at: new Date().toISOString()
            }, { onConflict: "telegram_chat_id" });
          } catch (e) {
            console.error("DB Upsert Error:", e);
          }

          try {
            await supabase.from("unlock_requests").update({ telegram_chat_id: userChatId }).eq("device_id", deviceId).eq("status", "pending");
          } catch (e) {
            console.error("DB Request Update Error:", e);
          }

          // ALWAYS reply to User directly in Telegram
          await sendTelegramMessage(
            userChatId,
            `📩 <b>আপনার ডিভাইস আনলক অনুরোধটি গৃহীত হয়েছে!</b>\n\n<b>ডিভাইস:</b> ${deviceName}\n<b>ডিভাইস আইডি:</b> <code>${deviceId}</code>\n\nঅ্যাডমিনের অনুমোদনের পর আনলক কোড সরাসরি এই ইনবক্সে চলে আসবে।`
          );

          // ALWAYS notify Admin directly in Telegram
          if (ADMIN_CHAT_ID) {
            // Use the tiny cd:<dur>:<requestId> button format (<64 bytes, Telegram limit).
            // Reuse the device's latest pending request, or create one if none exists.
            let adminRequestId = "";
            try {
              const { data: pendingReq } = await supabase
                .from("unlock_requests")
                .select("id")
                .eq("device_id", deviceId)
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (pendingReq && pendingReq.id) {
                adminRequestId = pendingReq.id;
              } else {
                const { data: newReq } = await supabase
                  .from("unlock_requests")
                  .insert({
                    device_id: deviceId,
                    device_name: deviceName || "Android Phone",
                    telegram_chat_id: Number(userChatId) || null,
                    reason: "টেলিগ্রাম সংযোগ থেকে অ্যাডমিন কোড",
                    status: "pending"
                  })
                  .select("id")
                  .maybeSingle();
                if (newReq && newReq.id) adminRequestId = newReq.id;
              }
            } catch (e) {
              console.error("DB Admin Request Lookup Error:", e);
            }

            const adminNotice = `🔔 <b>Telegram User Connected</b>\n\n📱 <b>Device:</b> ${deviceName}\n🆔 <b>Device ID:</b> <code>${deviceId}</code>\n👤 <b>Telegram Chat ID:</b> <code>${userChatId}</code> (@${username || "none"})`;
            const durationKeyboard = adminRequestId ? {
              inline_keyboard: [
                [
                  { text: "⏱️ ৫ মিনিট", callback_data: `cd:5:${adminRequestId}` },
                  { text: "⏱️ ১০ মিনিট", callback_data: `cd:10:${adminRequestId}` }
                ],
                [
                  { text: "⏱️ ৩০ মিনিট", callback_data: `cd:30:${adminRequestId}` },
                  { text: "♾️ পার্মানেন্ট", callback_data: `cd:perm:${adminRequestId}` }
                ]
              ]
            } : undefined;

            await sendTelegramMessage(ADMIN_CHAT_ID, adminNotice, durationKeyboard);
          }
        } else {
          // Generic /start reply to user
          await sendTelegramMessage(
            userChatId,
            `👋 <b>FocusDurood Security Bot-এ স্বাগতম!</b>\n\nআপনার অ্যাপের সিকিউরিটি আনলক রিকোয়েস্টের জন্য অ্যাপ থেকে 'Apply via Telegram' ক্লিক করুন।`
          );
        }
      }
    }

    return new Response("OK");
  } catch (err: any) {
    console.error("Webhook Execution Error:", err);
    return new Response("OK");
  }
});
