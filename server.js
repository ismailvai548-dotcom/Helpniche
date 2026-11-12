// File: bot.js (ES Module Version for Render & Server)

import http from 'http';
import crypto from 'crypto';
import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

// ১. ক্রেডেনশিয়াল কনফিগারেশন
const BOT_TOKEN = process.env.BOT_TOKEN || '8808381690:AAH0wNxbtraOhxP6q3v7mQuqfhCQHXX6EMM';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '6271611009';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dlxmzzvcpoysoouakadt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMDc0MSwiZXhwIjoyMDkzNzA2NzQxfQ.4NS9sJkAkM2x4p2CmhgmZ95N1XdamwnKpH98hRktOw8';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// সেশন স্টোরেজ (অ্যাডমিনের স্টেপ ট্র্যাকিং)
const adminSessions = new Map();

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// অ্যাডমিন চ্যাটের মূল কীবোর্ড বাটন (বটের নিচে স্থায়ী থাকবে)
const ADMIN_KEYBOARD = Markup.keyboard([
    ['👥 ইউজার লিস্ট', '🔓 আনলক ইউজার'],
    ['📊 ড্যাশবোর্ড / স্ট্যাটাস']
]).resize();

// ২. /start কমান্ড হ্যান্ডলার
bot.start(async (ctx) => {
    try {
        const textParts = (ctx.message.text || '').split(' ');
        const payload = textParts[1]; // deviceId
        const userId = ctx.from.id;
        const userFullName = escapeHtml(`${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim());
        const username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'N/A';

        // যদি কোনো ইউজার অ্যাপ থেকে /start <deviceId> দিয়ে আসে
        if (payload) {
            const deviceId = payload.trim().toLowerCase();

            // ইউজারকে দেওয়া নোটিশ
            const userWaitMsg = `📩 <b>আপনার আনলক অনুরোধটি গ্রহণ করা হয়েছে!</b>\n\n` +
                `অনুগ্রহ করে অ্যাডমিনের অ্যাপ্রুভালের জন্য অপেক্ষা করুন। অনুমোদন পাওয়া মাত্র ইউনিক কোডটি এই চ্যাটে চলে আসবে।`;
            await ctx.reply(userWaitMsg, { parse_mode: 'HTML' });

            // ডাটাবেসে রিকোয়েস্ট তৈরি
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

            // অ্যাডমিনকে নোটিফিকেশন পাঠানো
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
            return;
        }

        // যদি অ্যাডমিন সাধারণ /start দেয়
        if (String(userId) === String(ADMIN_CHAT_ID)) {
            adminSessions.delete(ctx.chat.id);
            return ctx.reply(
                `👋 <b>স্বাগতম অ্যাডমিন!</b>\n\n` +
                `Helpniche কন্ট্রোল প্যানেলে আপনাকে স্বাগতম। নিচের বাটনগুলো ব্যবহার করে ইউজার লিস্ট দেখতে পারবেন এবং যেকোনো ডিভাইস আনলক করতে পারবেন।`,
                { parse_mode: 'HTML', ...ADMIN_KEYBOARD }
            );
        }

        // সাধারণ সাধারণ ইউজার
        return ctx.reply("স্বাগতম! অ্যাপ থেকে আনলক রিকোয়েস্ট পাঠাতে অ্যাপের ভেতর থাকা সহায়তা বাটনে চাপ দিন।");

    } catch (err) {
        console.error("Start handler error:", err.message);
    }
});

// ৩. /cancel কমান্ড
bot.command('cancel', async (ctx) => {
    if (adminSessions.has(ctx.chat.id)) {
        adminSessions.delete(ctx.chat.id);
        return ctx.reply("❌ বর্তমান আনলক প্রক্রিয়া বাতিল করা হয়েছে।", ADMIN_KEYBOARD);
    }
    return ctx.reply("কোনো সক্রিয় প্রক্রিয়া চালু নেই।", ADMIN_KEYBOARD);
});

// ৪. "👥 ইউজার লিস্ট" হ্যান্ডলার
async function handleUserList(ctx) {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.reply("❌ শুধুমাত্র অ্যাডমিন এই তালিকা দেখতে পারবেন।");
    }

    try {
        const loadingMsg = await ctx.reply("⏳ সুপাবেস (Supabase) থেকে ইউজার তালিকা লোড হচ্ছে...");

        // unlock_requests থেকে ডিভাইস আনা
        const { data: requests, error: reqErr } = await supabase
            .from('unlock_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30);

        // unlock_codes থেকেও ডিভাইস আনা
        const { data: recentCodes, error: codeErr } = await supabase
            .from('unlock_codes')
            .select('device_id, duration_minutes, status, created_at, code')
            .order('created_at', { ascending: false })
            .limit(30);

        // ইউনিক ডিভাইস তালিকা তৈরি
        const deviceMap = new Map();

        if (requests && requests.length > 0) {
            for (const r of requests) {
                if (r.device_id) {
                    const devKey = r.device_id.trim().toLowerCase();
                    if (!deviceMap.has(devKey)) {
                        deviceMap.set(devKey, {
                            deviceId: devKey,
                            name: r.device_name || 'Android Device',
                            status: r.status,
                            time: r.created_at
                        });
                    }
                }
            }
        }

        if (recentCodes && recentCodes.length > 0) {
            for (const c of recentCodes) {
                if (c.device_id) {
                    const devKey = c.device_id.trim().toLowerCase();
                    if (!deviceMap.has(devKey)) {
                        deviceMap.set(devKey, {
                            deviceId: devKey,
                            name: 'Android Device',
                            status: c.status,
                            time: c.created_at
                        });
                    }
                }
            }
        }

        const deviceList = Array.from(deviceMap.values());
        const totalCount = deviceList.length;

        if (totalCount === 0) {
            try { await ctx.deleteMessage(loadingMsg.message_id); } catch(e) {}
            return ctx.reply("ℹ️ সুপাবেসে এখনও কোনো ডিভাইসের তথ্য পাওয়া যায়নি। ইউজার অ্যাপ ওপেন করলে এখানে দেখতে পাবেন।", ADMIN_KEYBOARD);
        }

        let msg = `👥 <b>নিবন্ধিত ইউজার ও ডিভাইস তালিকা</b>\n\n`;
        msg += `📊 <b>মোট সক্রিয় ডিভাইস:</b> ${totalCount} টি\n`;
        msg += `─────────────────────────\n`;

        const displayItems = deviceList.slice(0, 10);
        displayItems.forEach((dev, idx) => {
            let dateStr = '';
            try {
                dateStr = new Date(dev.time).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true });
            } catch (e) {
                dateStr = dev.time;
            }
            msg += `<b>${idx + 1}.</b> 📱 <code>${dev.deviceId}</code>\n`;
            msg += `   🏷️ <i>${escapeHtml(dev.name)}</i>\n`;
            msg += `   🕒 <i>${dateStr}</i>\n\n`;
        });

        if (totalCount > 10) {
            msg += `<i>...এবং আরও ${totalCount - 10}টি ডিভাইস সংরক্ষিত রয়েছে।</i>\n\n`;
        }

        msg += `💡 কোনো ডিভাইস আনলক করতে নিচের বাটনে চাপ দিন অথবা উপরের <code>Device ID</code> কপি করে "🔓 আনলক ইউজার" এ দিন।`;

        const inlineKb = Markup.inlineKeyboard([
            [Markup.button.callback('🔓 যে কোনো ডিভাইস আনলক করুন', 'trigger_unlock_prompt')],
            [Markup.button.callback('🔄 রিফ্রেশ তালিকা', 'refresh_user_list')]
        ]);

        try { await ctx.deleteMessage(loadingMsg.message_id); } catch(e) {}
        await ctx.reply(msg, { parse_mode: 'HTML', ...inlineKb });

    } catch (e) {
        console.error("User list error:", e);
        ctx.reply("❌ তালিকা লোড করতে সমস্যা: " + e.message, ADMIN_KEYBOARD);
    }
}

bot.hears(['👥 ইউজার লিস্ট', '/users'], handleUserList);
bot.action('refresh_user_list', async (ctx) => {
    try { await ctx.answerCbQuery("তালিকা রিফ্রেশ হচ্ছে..."); } catch (e) {}
    handleUserList(ctx);
});

// ৫. "🔓 আনলক ইউজার" হ্যান্ডলার
function startUnlockFlow(ctx) {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.reply("❌ শুধুমাত্র অ্যাডমিন আনলক অনুমোদন দিতে পারবেন।");
    }
    adminSessions.set(ctx.chat.id, { step: 'awaiting_device_id' });
    return ctx.reply(
        `🔓 <b>ইউজার আনলক প্রসেস</b>\n\n` +
        `অনুগ্রহ করে যে ডিভাইসটি আনলক করতে চান, তার <b>Device ID</b> টি লিখে বা পেস্ট করে পাঠান:\n\n` +
        `<i>(বাতিল করতে চাইলে /cancel লিখুন)</i>`,
        { parse_mode: 'HTML' }
    );
}

bot.hears(['🔓 আনলক ইউজার', '/unlock'], startUnlockFlow);
bot.action('trigger_unlock_prompt', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    startUnlockFlow(ctx);
});

// ৬. টেক্সট মেসেজ হ্যান্ডলার (Device ID বা কাস্টম সময় ইনপুট)
bot.on('text', async (ctx, next) => {
    const text = (ctx.message.text || '').trim();
    const chatId = ctx.chat.id;

    if (text.startsWith('/') || text === '👥 ইউজার লিস্ট' || text === '🔓 আনলক ইউজার' || text === '📊 ড্যাশবোর্ড / স্ট্যাটাস') {
        return next();
    }

    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return next();
    }

    const session = adminSessions.get(chatId);
    if (!session) return next();

    // ধাপ ১: Device ID প্রদান করা হয়েছে
    if (session.step === 'awaiting_device_id') {
        const deviceId = text.toLowerCase();
        if (deviceId.length < 4) {
            return ctx.reply("❌ সঠিক Device ID দিন (কমপক্ষে ৪ অক্ষর):");
        }

        adminSessions.set(chatId, { step: 'awaiting_type', deviceId: deviceId });

        const msg = `📱 <b>ডিভাইস ID:</b> <code>${deviceId}</code>\n\n` +
            `আপনি এই ডিভাইসের জন্য কি ধরনের আনলক করতে চান?\n` +
            `নিচের যেকোনো একটি অপশন বেছে নিন:`;

        const inlineKb = Markup.inlineKeyboard([
            [Markup.button.callback('♾️ পার্মানেন্ট আনলক', `adm_perm_${deviceId}`)],
            [Markup.button.callback('⏱️ সময় নির্ধারণ (Time)', `adm_time_${deviceId}`)],
            [Markup.button.callback('❌ বাতিল', 'adm_cancel')]
        ]);

        return ctx.reply(msg, { parse_mode: 'HTML', ...inlineKb });
    }

    // ধাপ ২: কাস্টম মিনিট লিখে পাঠিয়েছে
    if (session.step === 'awaiting_custom_min') {
        const mins = parseInt(text, 10);
        if (isNaN(mins) || mins <= 0) {
            return ctx.reply("❌ অনুগ্রহ করে সঠিক মিনিটের সংখ্যা লিখুন (যেমন: 25):");
        }
        return executeUnlock(ctx, session.deviceId, mins, `${mins} মিনিট`);
    }

    // ধাপ ৩: কাস্টম ঘণ্টা লিখে পাঠিয়েছে
    if (session.step === 'awaiting_custom_hr') {
        const hrs = parseFloat(text);
        if (isNaN(hrs) || hrs <= 0) {
            return ctx.reply("❌ অনুগ্রহ করে সঠিক ঘণ্টার সংখ্যা লিখুন (যেমন: 2 বা 1.5):");
        }
        const mins = Math.round(hrs * 60);
        return executeUnlock(ctx, session.deviceId, mins, `${hrs} ঘণ্টা (${mins} মিনিট)`);
    }

    return next();
});

// ৭. ইনলাইন বাটন হ্যান্ডলারস (আনলক অপশনস)

// ক. পার্মানেন্ট আনলক
bot.action(/^adm_perm_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];
    return executeUnlock(ctx, deviceId, 52560000, "পার্মানেন্ট (স্থায়ী)");
});

// খ. সময় নির্ধারণে চাপ দিলে -> মিনিট নাকি ঘণ্টা সিলেক্ট
bot.action(/^adm_time_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];

    const msg = `📱 <b>ডিভাইস ID:</b> <code>${deviceId}</code>\n\n` +
        `⏱️ <b>সময় নির্ধারণ করুন:</b>\n` +
        `আপনি কি মিনিট নাকি ঘণ্টা এককে সময় দিতে চান?`;

    const inlineKb = Markup.inlineKeyboard([
        [
            Markup.button.callback('⏱️ মিনিট (Minutes)', `adm_unit_min_${deviceId}`),
            Markup.button.callback('⏳ ঘণ্টা (Hours)', `adm_unit_hr_${deviceId}`)
        ],
        [
            Markup.button.callback('🔙 পেছনে', `adm_back_type_${deviceId}`),
            Markup.button.callback('❌ বাতিল', 'adm_cancel')
        ]
    ]);

    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineKb });
});

// পেছনের বাটনে চাপ দিলে আবার মূল টাইপ অপশনে
bot.action(/^adm_back_type_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];

    const msg = `📱 <b>ডিভাইস ID:</b> <code>${deviceId}</code>\n\n` +
        `আপনি এই ডিভাইসের জন্য কি ধরনের আনলক করতে চান?\n` +
        `নিচের যেকোনো একটি অপশন বেছে নিন:`;

    const inlineKb = Markup.inlineKeyboard([
        [Markup.button.callback('♾️ পার্মানেন্ট আনলক', `adm_perm_${deviceId}`)],
        [Markup.button.callback('⏱️ সময় নির্ধারণ (Time)', `adm_time_${deviceId}`)],
        [Markup.button.callback('❌ বাতিল', 'adm_cancel')]
    ]);

    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineKb });
});

// গ. মিনিট ইউনিট অপশনস
bot.action(/^adm_unit_min_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];

    const msg = `📱 <b>ডিভাইস ID:</b> <code>${deviceId}</code>\n\n` +
        `⏱️ <b>মিনিট নির্বাচন করুন:</b>\n` +
        `নিচের বাটন থেকে নির্বাচন করুন অথবা কাস্টম সংখ্যা লিখতে পারেন:`;

    const inlineKb = Markup.inlineKeyboard([
        [
            Markup.button.callback('⏱️ ৫ মিনিট', `adm_do_min_5_${deviceId}`),
            Markup.button.callback('⏱️ ১০ মিনিট', `adm_do_min_10_${deviceId}`)
        ],
        [
            Markup.button.callback('⏱️ ১৫ মিনিট', `adm_do_min_15_${deviceId}`),
            Markup.button.callback('⏱️ ৩০ মিনিট', `adm_do_min_30_${deviceId}`)
        ],
        [
            Markup.button.callback('⏱️ ৪৫ মিনিট', `adm_do_min_45_${deviceId}`),
            Markup.button.callback('⏱️ ৬০ মিনিট', `adm_do_min_60_${deviceId}`)
        ],
        [Markup.button.callback('✏️ কাস্টম মিনিট লিখুন', `adm_prompt_min_${deviceId}`)],
        [Markup.button.callback('🔙 পেছনে', `adm_time_${deviceId}`)]
    ]);

    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineKb });
});

// ঘ. ঘণ্টা ইউনিট অপশনস
bot.action(/^adm_unit_hr_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];

    const msg = `📱 <b>ডিভাইস ID:</b> <code>${deviceId}</code>\n\n` +
        `⏳ <b>ঘণ্টা নির্বাচন করুন:</b>\n` +
        `নিচের বাটন থেকে নির্বাচন করুন অথবা কাস্টম সংখ্যা লিখতে পারেন:`;

    const inlineKb = Markup.inlineKeyboard([
        [
            Markup.button.callback('⏳ ১ ঘণ্টা', `adm_do_hr_1_${deviceId}`),
            Markup.button.callback('⏳ ২ ঘণ্টা', `adm_do_hr_2_${deviceId}`)
        ],
        [
            Markup.button.callback('⏳ ৪ ঘণ্টা', `adm_do_hr_4_${deviceId}`),
            Markup.button.callback('⏳ ৮ ঘণ্টা', `adm_do_hr_8_${deviceId}`)
        ],
        [
            Markup.button.callback('⏳ ১২ ঘণ্টা', `adm_do_hr_12_${deviceId}`),
            Markup.button.callback('⏳ ২৪ ঘণ্টা (১ দিন)', `adm_do_hr_24_${deviceId}`)
        ],
        [Markup.button.callback('✏️ কাস্টম ঘণ্টা লিখুন', `adm_prompt_hr_${deviceId}`)],
        [Markup.button.callback('🔙 পেছনে', `adm_time_${deviceId}`)]
    ]);

    await ctx.editMessageText(msg, { parse_mode: 'HTML', ...inlineKb });
});

// ঙ. কাস্টম মিনিট প্রম্পট
bot.action(/^adm_prompt_min_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];
    adminSessions.set(ctx.chat.id, { step: 'awaiting_custom_min', deviceId: deviceId });
    await ctx.reply(
        `✏️ <b>ডিভাইস:</b> <code>${deviceId}</code>\n\n` +
        `আপনি কত মিনিট আনলক দিতে চান? শুধু সংখ্যাটি লিখে পাঠান (যেমন: 25):`,
        { parse_mode: 'HTML' }
    );
});

// চ. কাস্টম ঘণ্টা প্রম্পট
bot.action(/^adm_prompt_hr_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const deviceId = ctx.match[1];
    adminSessions.set(ctx.chat.id, { step: 'awaiting_custom_hr', deviceId: deviceId });
    await ctx.reply(
        `✏️ <b>ডিভাইস:</b> <code>${deviceId}</code>\n\n` +
        `আপনি কত ঘণ্টা আনলক দিতে চান? শুধু সংখ্যাটি লিখে পাঠান (যেমন: 3 বা 1.5):`,
        { parse_mode: 'HTML' }
    );
});

// ছ. প্রিসেট মিনিট ও ঘণ্টা ক্লিক হ্যান্ডলার
bot.action(/^adm_do_min_(\d+)_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const mins = parseInt(ctx.match[1], 10);
    const deviceId = ctx.match[2];
    return executeUnlock(ctx, deviceId, mins, `${mins} মিনিট`);
});

bot.action(/^adm_do_hr_(\d+)_(.+)$/, async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const hrs = parseInt(ctx.match[1], 10);
    const deviceId = ctx.match[2];
    const mins = hrs * 60;
    return executeUnlock(ctx, deviceId, mins, `${hrs} ঘণ্টা (${mins} মিনিট)`);
});

// জ. বাতিল হ্যান্ডলার
bot.action('adm_cancel', async (ctx) => {
    try { await ctx.answerCbQuery("বাতিল করা হয়েছে"); } catch (e) {}
    adminSessions.delete(ctx.chat.id);
    await ctx.editMessageText("❌ আনলক প্রক্রিয়া বাতিল করা হয়েছে।", { parse_mode: 'HTML' });
});

// ৮. বিদ্যমান রিকোয়েস্ট থেকে অ্যাপ্রুভ/রিজেক্ট হ্যান্ডলার (cd: & rj:)
bot.action(/^(cd|unlock|rj|reject)[:_](.+)$/, async (ctx) => {
    try {
        const cmd = ctx.match[1];
        const remainder = ctx.match[2] || "";

        if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
            return ctx.answerCbQuery("❌ শুধুমাত্র অ্যাডমিন অনুমোদন দিতে পারবেন!");
        }

        let isReject = cmd === 'rj' || cmd === 'reject';
        let durationMinutes = 5;
        let durationText = "৫ মিনিট";
        let targetId = "";

        if (isReject) {
            targetId = remainder;
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

        let sepIdx = remainder.indexOf(':');
        if (sepIdx < 0) sepIdx = remainder.indexOf('_');
        const durStr = (sepIdx >= 0 ? remainder.slice(0, sepIdx) : remainder) || "5";
        targetId = sepIdx >= 0 ? remainder.slice(sepIdx + 1) : "";

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

        return executeUnlock(ctx, deviceId, durationMinutes, durationText, targetUserId, requestId);

    } catch (e) {
        console.error("Action error:", e);
    }
});

// ৯. মূল আনলক কার্যকর ফাংশন
async function executeUnlock(ctx, deviceId, minutes, durationText, targetUserId = null, requestId = null) {
    try {
        const cleanDevId = deviceId.trim().toLowerCase();
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash('sha256').update(randomCode).digest('hex');
        const expiresAt = new Date(Date.now() + Math.max(minutes * 60 * 1000, 30 * 60 * 1000)).toISOString();

        // পূর্ববর্তী অব্যবহৃত কোড মেয়াদোত্তীর্ণ করা
        try {
            await supabase
                .from('unlock_codes')
                .update({ status: 'expired' })
                .eq('device_id', cleanDevId)
                .eq('status', 'unused');
        } catch (e) {}

        // Supabase-এ নতুন কোড সেভ করা
        const { error: insErr } = await supabase.from('unlock_codes').insert({
            device_id: cleanDevId,
            code_hash: codeHash,
            code: randomCode,
            status: 'unused',
            is_used: false,
            duration_minutes: minutes,
            expires_at: expiresAt,
            created_by: 'admin',
            user_id: 'anonymous_user',
            request_id: requestId || null
        });

        if (insErr) {
            console.error("Supabase Save Error:", insErr);
            return ctx.reply("❌ সুপাবেস ডাটাবেসে সেভ হতে সমস্যা হয়েছে: " + insErr.message);
        }

        // unlock_requests আপডেট করা (ডিভাইসের জিরো-টাচ রিমোট আনলকের জন্য)
        try {
            await supabase
                .from('unlock_requests')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    reason: `remote_unlock:${minutes}`
                })
                .eq('device_id', cleanDevId);
        } catch (e) {}

        // অ্যাডমিনকে সুন্দর কনফার্মেশন মেসেজ
        const adminSuccessMsg = `✅ <b>আনলক সফলভাবে কার্যকর হয়েছে!</b>\n\n` +
            `📱 <b>Device ID:</b> <code>${cleanDevId}</code>\n` +
            `⏱️ <b>মেয়াদ:</b> ${durationText}\n` +
            `🔑 <b>ব্যাকআপ কোড:</b> <code>${randomCode}</code>\n` +
            `📌 <b>স্ট্যাটাস:</b> 🟢 দূর থেকে অটো-আনলক অনুমোদিত\n\n` +
            `🚀 <b>জিরো-টাচ রিমোট আনলক:</b> ইউজারের ফোনে কোড টাইপ করার প্রয়োজন নেই, ফোন অন থাকা অবস্থায় স্বয়ংক্রিয়ভাবে ${durationText}ের জন্য আনলক হয়ে যাবে!\n` +
            `<i>(যদি ফোন অফলাইন থাকে, তবে ব্যাকআপ হিসেবে কোডটি ব্যবহার করা যাবে)</i>`;

        if (ctx.callbackQuery) {
            await ctx.editMessageText(adminSuccessMsg, { parse_mode: 'HTML' });
        } else {
            await ctx.reply(adminSuccessMsg, { parse_mode: 'HTML', ...ADMIN_KEYBOARD });
        }

        // ইউজারের কাছে সরাসরি টেলিগ্রামে পাঠানো (যদি ইউজার বটে থাকে)
        if (targetUserId) {
            const userCodeDeliveryMsg = `🔐 <b>Unlock Code Approved!</b>\n\n` +
                `আপনার Unlock Code:\n\n` +
                `<code>${randomCode}</code>\n\n` +
                `⏱️ মেয়াদ: <b>${durationText}</b>\n` +
                `🔄 কোডটি শুধুমাত্র একবার ব্যবহার করা যাবে।\n` +
                `📱 এই কোডটি শুধুমাত্র আপনার নির্দিষ্ট ডিভাইসের জন্য কাজ করবে।\n\n` +
                `অ্যাপে ফিরে গিয়ে কোডটি ইনপুট দিন।`;
            try {
                await bot.telegram.sendMessage(targetUserId, userCodeDeliveryMsg, { parse_mode: 'HTML' });
            } catch (e) {}
        }

        adminSessions.delete(ctx.chat?.id || ctx.from?.id);

    } catch (err) {
        console.error("Execute unlock error:", err);
        ctx.reply("❌ আনলক কার্যকর করতে সমস্যা: " + err.message);
    }
}

// ১০. "📊 ড্যাশবোর্ড / স্ট্যাটাস" হ্যান্ডলার
bot.hears(['📊 ড্যাশবোর্ড / স্ট্যাটাস', '/status'], async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.reply("❌ শুধুমাত্র অ্যাডমিন এই স্ট্যাটাস দেখতে পারবেন।");
    }

    try {
        const { count: totalReqs } = await supabase.from('unlock_requests').select('*', { count: 'exact', head: true });
        const { count: totalCodes } = await supabase.from('unlock_codes').select('*', { count: 'exact', head: true });
        const { count: unusedCodes } = await supabase.from('unlock_codes').select('*', { count: 'exact', head: true }).eq('status', 'unused');
        const { count: usedCodes } = await supabase.from('unlock_codes').select('*', { count: 'exact', head: true }).eq('status', 'used');

        const statusMsg = `📊 <b>Helpniche অ্যাডমিন ড্যাশবোর্ড</b>\n\n` +
            `📱 <b>মোট ডিভাইস রিকোয়েস্ট:</b> ${totalReqs || 0} টি\n` +
            `🔑 <b>মোট তৈরি করা কোড:</b> ${totalCodes || 0} টি\n` +
            `⏳ <b>অব্যবহৃত কোড (Active):</b> ${unusedCodes || 0} টি\n` +
            `✅ <b>ব্যবহৃত কোড (Used):</b> ${usedCodes || 0} টি\n` +
            `🟢 <b>সার্ভার স্ট্যাটাস:</b> অনলাইন ও সচল\n` +
            `🕒 <b>সময়:</b> ${new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true })}`;

        await ctx.reply(statusMsg, { parse_mode: 'HTML', ...ADMIN_KEYBOARD });
    } catch (e) {
        ctx.reply("❌ স্ট্যাটাস ফেচ করতে সমস্যা: " + e.message, ADMIN_KEYBOARD);
    }
});

// ১১. Render-এর জন্য ওয়েব পোর্ট
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('FocusDurood / Helpniche Telegram Bot is Active & Running 24/7 on Render!');
});

server.listen(PORT, () => {
    console.log(`🌐 Web listener active on port: ${PORT}`);
});

bot.launch().then(() => {
    console.log("🚀 Helpniche Telegram Bot is running smoothly with User List and Smart Unlock...");
});

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });