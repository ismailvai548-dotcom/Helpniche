// File: bot.js (ES Module Version)

import http from 'http';
import crypto from 'crypto';
import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

// ক্রেডেনশিয়াল কনফিগারেশন
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const requiredEnv = ['BOT_TOKEN', 'ADMIN_CHAT_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnv = requiredEnv.filter(name => !process.env[name]);

if (missingEnv.length > 0) {
    console.error(`ত্রুটি: প্রয়োজনীয় এনভায়রনমেন্ট ভ্যারিয়েবল অনুপস্থিত: ${missingEnv.join(', ')}`);
    console.error('অনুগ্রহ করে .env ফাইল বা হোস্টিং এনভায়রনমেন্টে এই মানগুলো সেট করুন।');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ১. ইউজার যখন অ্যাপ থেকে /start <deviceId> দিয়ে রিকোয়েস্ট পাঠাবে
bot.start(async (ctx) => {
    try {
        const textParts = (ctx.message.text || '').split(' ');
        const payload = textParts[1]; // deviceId
        const userId = ctx.from.id;
        const userFullName = escapeHtml(`${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim());
        const username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'N/A';

        if (!payload) {
            return ctx.reply("স্বাগতম! অ্যাপ থেকে আনলক রিকোয়েস্ট পাঠাতে অ্যাপের ভেতর থাকা সহায়তা বাটনে চাপ দিন।");
        }

        const deviceId = payload.trim().toLowerCase();

        // ইউজারকে দেওয়া নোটিশ
        const userWaitMsg = `📩 <b>আপনার আনলক অনুরোধটি গ্রহণ করা হয়েছে!</b>\n\n` +
            `অনুগ্রহ করে অ্যাডমিনের অ্যাপ্রুভালের জন্য অপেক্ষা করুন। অনুমোদন পাওয়া মাত্র ইউনিক কোডটি এই চ্যাটে চলে আসবে।`;
        await ctx.reply(userWaitMsg, { parse_mode: 'HTML' });

        // ডাটাবেসে রিকোয়েস্ট তৈরি করা
        let requestId = null;
        try {
            const { data: reqRec } = await supabase.from('unlock_requests').insert({
                device_id: deviceId,
                telegram_chat_id: userId,
                user_id: String(userId),
                device_name: `${userFullName}'s Phone`,
                reason: 'সাময়িক আনলক প্রয়োজন',
                status: 'pending'
            }).select().single();
            if (reqRec) requestId = reqRec.id;
        } catch (e) {
            console.error("Request save error:", e);
        }

        // অ্যাডমিনকে পাঠানোর ফরম্যাট
        const adminMsg = `🚨 <b>New Unlock Request</b>\n\n` +
            `📱 <b>Device ID:</b> <code>${deviceId}</code>\n` +
            `👤 <b>User:</b> ${userFullName} (${username})\n` +
            `🆔 <b>User ID:</b> <code>${userId}</code>\n` +
            `📝 <b>Reason:</b> সাময়িক আনলক প্রয়োজন\n` +
            `📌 <b>Status:</b> ⏳ Pending Approval\n\n` +
            `অনুমোদনের জন্য সময় নির্বাচন করুন:`;

        const targetId = requestId || `dev_${deviceId.slice(0, 16)}`;
        const inlineKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('⏱️ ৫ মিনিট', `cd:5:${targetId}`),
                Markup.button.callback('⏱️ ১০ মিনিট', `cd:10:${targetId}`)
            ],
            [
                Markup.button.callback('♾️ পার্মানেন্ট', `cd:perm:${targetId}`),
                Markup.button.callback('❌ বাতিল', `rj:${targetId}`)
            ]
        ]);

        await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminMsg, {
            parse_mode: 'HTML',
            ...inlineKeyboard
        });

    } catch (err) {
        console.error("Start handler error:", err.message);
    }
});

// ২. ইনলাইন বাটন ক্লিকের অ্যাকশন হ্যান্ডলার (ইউনিক ৬ ডিজিটের কোড তৈরি)
bot.action(/^(cd|unlock|rj|reject)[:_](.+)$/, async (ctx) => {
    try {
        const fullMatch = ctx.match[0];
        if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
            return ctx.answerCbQuery("❌ শুধুমাত্র অ্যাডমিন অনুমোদন দিতে পারবেন!");
        }

        let isReject = fullMatch.startsWith('rj:') || fullMatch.startsWith('reject');
        let durationMinutes = 5;
        let durationText = "৫ মিনিট";
        let targetId = "";

        if (isReject) {
            const parts = fullMatch.split(/[:_]/);
            targetId = parts[1] || "";
            let targetUserId = null;
            if (targetId && !targetId.startsWith('dev_')) {
                try {
                    const { data: rData } = await supabase.from('unlock_requests').select('telegram_chat_id').eq('id', targetId).maybeSingle();
                    if (rData && rData.telegram_chat_id) targetUserId = rData.telegram_chat_id;
                    await supabase.from('unlock_requests').update({ status: 'rejected' }).eq('id', targetId);
                } catch (e) {}
            }
            await ctx.editMessageText(`❌ <b>Unlock Request Rejected</b>\n\n📌 <b>Status:</b> ❌ Rejected by Admin`, { parse_mode: 'HTML' });
            if (targetUserId) {
                try {
                    await bot.telegram.sendMessage(targetUserId, "❌ দুঃখিত, আপনার আনলক অনুরোধটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।");
                } catch (e) {}
            }
            return ctx.answerCbQuery("বাতিল করা হয়েছে");
        }

        // আনলক অনুমোদন
        const parts = fullMatch.split(/[:_]/);
        const durStr = parts[1] || "5";
        targetId = parts[2] || "";

        if (durStr === "10") {
            durationMinutes = 10;
            durationText = "১০ মিনিট";
        } else if (durStr === "perm") {
            durationMinutes = 52560000;
            durationText = "পার্মানেন্ট (স্থায়ী)";
        }

        let deviceId = "";
        let targetUserId = null;
        let requestId = null;

        if (targetId.startsWith('dev_')) {
            deviceId = targetId.replace('dev_', '');
        } else {
            requestId = targetId;
            try {
                const { data: rData } = await supabase.from('unlock_requests').select('*').eq('id', requestId).maybeSingle();
                if (rData) {
                    deviceId = rData.device_id;
                    targetUserId = rData.telegram_chat_id;
                }
            } catch (e) {}
        }

        if (!deviceId) {
            return ctx.answerCbQuery("ডিভাইস আইডি পাওয়া যায়নি!");
        }

        // ইউনিক ৬ ডিজিটের ওয়ান-টাইম পাসকোড ও হ্যাশ
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash('sha256').update(randomCode).digest('hex');
        const expiresAt = new Date(Date.now() + Math.max(durationMinutes * 60 * 1000, 30 * 60 * 1000)).toISOString();

        // পূর্ববর্তী অব্যবহৃত কোড মেয়াদোত্তীর্ণ করা
        try {
            await supabase.from('unlock_codes').update({ status: 'expired' }).eq('device_id', deviceId.toLowerCase()).eq('status', 'unused');
        } catch (e) {}

        // Supabase-এ ক্যানোনিকাল স্কিমা অনুযায়ী সেভ করা
        const { error } = await supabase.from('unlock_codes').insert({
            request_id: requestId || null,
            device_id: deviceId.toLowerCase(),
            code_hash: codeHash,
            status: 'unused',
            duration_minutes: durationMinutes,
            expires_at: expiresAt,
            created_by: 'admin'
        });

        if (error) {
            console.error("Supabase Save Error:", error);
            return ctx.answerCbQuery("ডাটাবেসে সেভ হতে সমস্যা হয়েছে!");
        }

        if (requestId) {
            try {
                await supabase.from('unlock_requests').update({ status: 'sent', approved_at: new Date().toISOString() }).eq('id', requestId);
            } catch (e) {}
        }

        // ইউজারের কাছে ডেলিভারি
        if (targetUserId) {
            const userCodeDeliveryMsg = `🔐 <b>Unlock Code</b>\n\n` +
                `আপনার Unlock Code:\n\n` +
                `<code>${randomCode}</code>\n\n` +
                `⏱️ এই কোডটি <b>${durationText}ের জন্য</b> ব্যবহারযোগ্য।\n` +
                `🔄 কোডটি শুধুমাত্র একবার ব্যবহার করা যাবে।\n` +
                `📱 এই কোডটি শুধুমাত্র আপনার নির্দিষ্ট ডিভাইসের জন্য কাজ করবে।\n\n` +
                `অ্যাপে ফিরে গিয়ে কোডটি ব্যবহার করুন।`;
            try {
                await bot.telegram.sendMessage(targetUserId, userCodeDeliveryMsg, { parse_mode: 'HTML' });
            } catch (e) {}
        }

        // অ্যাডমিন স্ক্রিন কনফার্মেশন
        const adminDeliveredMsg = `🔑 <b>Unique Unlock Code Generated</b>\n\n` +
            `🆔 <b>Device ID:</b> <code>${deviceId}</code>\n` +
            `🔑 <b>Code:</b> <code>${randomCode}</code>\n` +
            `⏱️ <b>Duration:</b> ${durationText}\n` +
            `📌 <b>Status:</b> ✅ Delivered (Unused)\n\n` +
            `✅ কোডটি সফলভাবে ইউজারের কাছে পাঠানো হয়েছে।`;

        await ctx.editMessageText(adminDeliveredMsg, { parse_mode: 'HTML' });
        ctx.answerCbQuery("কোড তৈরি সফল হয়েছে");
    } catch (actionErr) {
        console.error("Action error:", actionErr);
    }
});

// ৩. Render-এর জন্য ওয়েব পোর্ট
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('FocusDurood Telegram Bot is Active & Running 24/7 on Render!');
});

server.listen(PORT, () => {
    console.log(`🌐 Web listener active on port: ${PORT}`);
});

bot.launch().then(() => {
    console.log("🚀 Telegram Bot is running smoothly with ES Module...");
});

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });