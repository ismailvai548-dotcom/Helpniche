// File: bot.js (ES Module Version for Render & Server)

import http from 'http';
import crypto from 'crypto';
import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

// ১. ক্রেডেনশিয়াল কনফিগারেশন (Environment Variables ONLY — never hardcode secrets)
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://dlxmzzvcpoysoouakadt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SECRET_KEY || '';

if (!BOT_TOKEN || !ADMIN_CHAT_ID || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Critical: Missing required environment variables (TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID, SECRET_KEY).");
}

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_SERVICE_KEY || 'placeholder');

// সেশন স্টোরেজ (অ্যাডমিনের স্টেপ ট্র্যাকিং)
const adminSessions = new Map();

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizeBdPhone(raw) {
    if (!raw) return '';
    const bnToEn = String(raw).replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
    let digits = bnToEn.replace(/\D/g, '');
    if (digits.startsWith('00880') && digits.length === 15) {
        digits = '0' + digits.slice(5);
    } else if (digits.startsWith('880') && digits.length === 13) {
        digits = '0' + digits.slice(3);
    } else if (digits.length === 10 && digits.startsWith('1')) {
        digits = '0' + digits;
    }
    return digits;
}

function isValidBdPhone(norm) {
    return /^01[3-9]\d{8}$/.test(norm);
}

function maskPhone(norm) {
    if (!norm || norm.length < 7) return '••••••••';
    return `${norm.slice(0, 3)}••••${norm.slice(-4)}`;
}

function sha256Hex(text) {
    return crypto.createHash('sha256').update(String(text || '').trim()).digest('hex');
}

function parseDonationMeta(row) {
    if (!row) return null;
    try {
        const parsed = JSON.parse(row.reason || '{}');
        if (parsed && parsed.type === 'donation') return parsed;
    } catch (_) {}
    return null;
}

function decodeRelayPayload(hexStr) {
    try {
        const cleanHex = String(hexStr || '').trim();
        if (!cleanHex || cleanHex.length % 2 !== 0) return null;
        const jsonStr = Buffer.from(cleanHex, 'hex').toString('utf8');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length >= 2) {
            return { sender: String(parsed[0] || ''), trxId: String(parsed[1] || '') };
        }
    } catch (_) {}
    return null;
}

function stripDonationTrxTags(rawTrx) {
    return String(rawTrx || '')
        .replace(/\[REQ:[^\]]+\]/gi, '')
        .replace(/\[TG:[^\]]+\]/gi, '')
        .replace(/\[REL:[^\]]+\]/gi, '')
        .trim();
}

// অ্যাডমিন চ্যাটের মূল কীবোর্ড বাটন (বটের নিচে স্থায়ী থাকবে)
const ADMIN_KEYBOARD = Markup.keyboard([
    ['👥 ইউজার লিস্ট', '🔓 আনলক ইউজার'],
    ['💰 হাদিয়া ও অনুদান', '📊 ড্যাশবোর্ড / স্ট্যাটাস']
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
                if (r.device_id && !r.device_id.startsWith('donation_')) {
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

    if (text.startsWith('/') || text === '👥 ইউজার লিস্ট' || text === '🔓 আনলক ইউজার' || text === '💰 হাদিয়া ও অনুদান' || text === '📊 ড্যাশবোর্ড / স্ট্যাটাস') {
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

    // ম্যানুয়াল ডোনেশন ধাপ ১: প্রেরকের মোবাইল নম্বর
    if (session.step === 'awaiting_donation_phone') {
        const norm = normalizeBdPhone(text);
        if (!isValidBdPhone(norm)) {
            return ctx.reply("❌ সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন (যেমন: 017xxxxxxxx):");
        }
        adminSessions.set(chatId, { step: 'awaiting_donation_method', phone: norm });
        const inlineKb = Markup.inlineKeyboard([
            [
                Markup.button.callback('🩷 বিকাশ (bKash)', 'don_man_method_bkash'),
                Markup.button.callback('🧡 নগদ (Nagad)', 'don_man_method_nagad')
            ],
            [Markup.button.callback('❌ বাতিল', 'adm_cancel')]
        ]);
        return ctx.reply(
            `📱 <b>প্রেরক নম্বর:</b> <code>${norm}</code>\n\nকোন মাধ্যমে টাকা এসেছে নির্বাচন করুন:`,
            { parse_mode: 'HTML', ...inlineKb }
        );
    }

    // ম্যানুয়াল ডোনেশন ধাপ ৩: টাকার পরিমাণ
    if (session.step === 'awaiting_donation_amount') {
        const bnEn = text.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
        const amt = parseFloat(bnEn.replace(/[^\d.]/g, ''));
        if (isNaN(amt) || amt <= 0) {
            return ctx.reply("❌ অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন (যেমন: 100 বা 500):");
        }
        return executeManualDonationSave(ctx, session.phone, session.method, amt);
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

        // unlock_requests আপডেট করা (ডিভাইসের জিরো-টাচ রিমোট আনলকের জন্য — কেবল ১টি সর্বশেষ/টার্গেট রো)
        try {
            const approvedIso = new Date().toISOString();

            // পূর্বে কোনো অব্যবহৃত/অবশিষ্ট approved রো থাকলে তা পরিষ্কার করা (যাতে রি-ইনস্টলে পুরনো রো থেকে পুনরায় আনলক না হয়)
            await supabase
                .from('unlock_requests')
                .update({
                    status: 'pending',
                    reason: 'remote_unlock_superseded'
                })
                .eq('device_id', cleanDevId)
                .eq('status', 'approved');

            let updatedSingle = false;
            if (requestId) {
                const { data: reqUpdated } = await supabase
                    .from('unlock_requests')
                    .update({
                        status: 'approved',
                        approved_at: approvedIso,
                        reason: `remote_unlock:${minutes}`
                    })
                    .eq('id', requestId)
                    .select('id');
                if (reqUpdated && reqUpdated.length > 0) updatedSingle = true;
            }

            if (!updatedSingle) {
                const { data: latestReqs } = await supabase
                    .from('unlock_requests')
                    .select('id')
                    .eq('device_id', cleanDevId)
                    .not('user_id', 'like', 'don_%')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (latestReqs && latestReqs.length > 0) {
                    const { data: latestUpdated } = await supabase
                        .from('unlock_requests')
                        .update({
                            status: 'approved',
                            approved_at: approvedIso,
                            reason: `remote_unlock:${minutes}`
                        })
                        .eq('id', latestReqs[0].id)
                        .select('id');
                    if (latestUpdated && latestUpdated.length > 0) updatedSingle = true;
                }
            }

            if (!updatedSingle) {
                await supabase
                    .from('unlock_requests')
                    .insert({
                        device_id: cleanDevId,
                        device_name: 'Android Device',
                        user_id: 'device_' + cleanDevId,
                        status: 'approved',
                        approved_at: approvedIso,
                        reason: `remote_unlock:${minutes}`
                    });
            }
        } catch (e) {
            console.error("Remote unlock request upsert error:", e);
        }

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

// ১০. "💰 হাদিয়া ও অনুদান" ম্যানেজমেন্ট ও অ্যাডমিন কনফার্মেশন সিস্টেম
const relayedRequestIds = new Set();

async function renderDonationDashboard(ctx, editExisting = false) {
    const { data: rows, error } = await supabase
        .from('unlock_requests')
        .select('*')
        .like('user_id', 'don_%')
        .order('created_at', { ascending: false })
        .limit(40);

    if (error) {
        if (editExisting) {
            return ctx.answerCbQuery("❌ ডোনেশন ডাটা লোড করতে সমস্যা: " + error.message, { show_alert: true });
        }
        return ctx.reply("❌ ডোনেশন ডাটা লোড করতে সমস্যা: " + error.message, ADMIN_KEYBOARD);
    }

    // ট্রানজ্যাকশন আইডি পরিষ্কারভাবে দেখানোর জন্য donations টেবিল থেকেও ম্যাচিং ম্যাপ নেওয়া
    const { data: donTableRows } = await supabase
        .from('donations')
        .select('trx_id')
        .order('created_at', { ascending: false })
        .limit(80);

    const trxByReqId = new Map();
    const senderByReqId = new Map();
    (donTableRows || []).forEach((d) => {
        const raw = String(d.trx_id || '');
        const m = raw.match(/\[REQ:([0-9a-f-]+)\]/i);
        if (m && m[1]) {
            const relMatch = raw.match(/\[REL:([0-9a-f]+)\]/i);
            if (relMatch && relMatch[1]) {
                const unsealed = decodeRelayPayload(relMatch[1]);
                if (unsealed) {
                    if (unsealed.sender) senderByReqId.set(m[1], unsealed.sender);
                    if (unsealed.trxId) trxByReqId.set(m[1], unsealed.trxId);
                }
            }
            if (!trxByReqId.has(m[1])) {
                const cleaned = stripDonationTrxTags(raw);
                if (cleaned && cleaned !== 'N/A') trxByReqId.set(m[1], cleaned);
            }
        }
    });

    // কেবল pending ও approved আইটেম রাখা (বাতিল/ডিলিট হওয়া কোনো রেকর্ড থাকবে না)
    const items = (rows || [])
        .map((r) => ({ row: r, meta: parseDonationMeta(r) }))
        .filter((x) => x.meta && (x.row.status === 'pending' || x.row.status === 'approved'));

    const pending = items.filter((x) => x.row.status === 'pending');
    const approved = items.filter((x) => x.row.status === 'approved');
    const approvedSum = approved.reduce((s, x) => s + (Number(x.meta.amount) || 0), 0);
    const pendingSum = pending.reduce((s, x) => s + (Number(x.meta.amount) || 0), 0);

    let msg = `💰 <b>হাদিয়া ও অনুদান ব্যবস্থাপনা</b>\n\n`;
    msg += `✅ <b>মোট অনুমোদিত:</b> ${approved.length} টি (৳${approvedSum})\n`;
    msg += `⏳ <b>অপেক্ষমাণ (Pending):</b> ${pending.length} টি (৳${pendingSum})\n`;
    msg += `─────────────────────────\n`;

    const preview = items.slice(0, 10);
    if (preview.length === 0) {
        msg += `<i>এখনও কোনো ডোনেশন রেকর্ড পাওয়া যায়নি।</i>\n\n`;
    } else {
        preview.forEach((item, idx) => {
            const { row, meta } = item;
            const stIcon = row.status === 'approved' ? '✅' : '⏳';
            const senderDisplay = senderByReqId.get(row.id) || meta.senderMasked || '••••••••';
            const trxDisplay = trxByReqId.get(row.id) || meta.trxMasked || '';
            let dt = '';
            try { dt = new Date(row.created_at).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true }); } catch (_) { dt = row.created_at; }
            msg += `<b>${idx + 1}.</b> ${stIcon} <b>৳${meta.amount || 0}</b> — ${escapeHtml(meta.methodLabel || meta.method || '')}\n`;
            msg += `   📱 <code>${escapeHtml(senderDisplay)}</code>`;
            if (trxDisplay) msg += ` | 🧾 <code>${escapeHtml(trxDisplay)}</code>`;
            msg += `\n   🕒 <i>${dt}</i>\n\n`;
        });
    }

    const btnRows = [];
    pending.slice(0, 6).forEach(({ row, meta }) => {
        const btnSender = senderByReqId.get(row.id) || meta.senderMasked || '';
        btnRows.push([
            Markup.button.callback(`✅ কনফার্ম ৳${meta.amount || 0} (${btnSender})`, `don_ok:${row.id}`),
            Markup.button.callback(`❌ বাতিল ও ডিলিট`, `don_no:${row.id}`)
        ]);
    });
    btnRows.push([Markup.button.callback('➕ ম্যানুয়ালি ডোনেশন যোগ করুন', 'don_manual_start')]);
    btnRows.push([Markup.button.callback('🔄 রিফ্রেশ তালিকা', 'refresh_donations')]);

    if (editExisting && ctx.callbackQuery?.message?.message_id) {
        try {
            await ctx.editMessageText(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btnRows) });
            return;
        } catch (editErr) {
            if (String(editErr.message || '').includes('message is not modified')) return;
        }
    }
    await ctx.reply(msg, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btnRows) });
}

async function handleDonationDashboard(ctx) {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.reply("❌ শুধুমাত্র অ্যাডমিন এই তথ্য দেখতে পারবেন।");
    }

    try {
        await relayPendingDonations().catch(() => {});
        await renderDonationDashboard(ctx, false);
    } catch (e) {
        console.error("Donation dashboard error:", e);
        ctx.reply("❌ হাদিয়া তালিকা লোড করতে সমস্যা: " + e.message, ADMIN_KEYBOARD);
    }
}

bot.hears(['💰 হাদিয়া ও অনুদান', '/donations'], handleDonationDashboard);
bot.action('refresh_donations', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.answerCbQuery("❌ অনুমোদিত নয়!", { show_alert: true });
    }
    try { await ctx.answerCbQuery("রিফ্রেশ হচ্ছে..."); } catch (e) {}
    await relayPendingDonations().catch(() => {});
    return renderDonationDashboard(ctx, true);
});

bot.action('don_manual_start', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.answerCbQuery("❌ অনুমোদিত নয়!", { show_alert: true });
    }
    try { await ctx.answerCbQuery(); } catch (e) {}
    adminSessions.set(ctx.chat.id, { step: 'awaiting_donation_phone' });
    return ctx.reply(
        `➕ <b>ম্যানুয়াল অনুমোদিত ডোনেশন যোগ করুন</b>\n\n` +
        `দাতার বিকাশ/নগদ প্রেরক নম্বরটি লিখুন (যেমন: <code>017xxxxxxxx</code>):\n\n` +
        `<i>(বাতিল করতে /cancel লিখুন)</i>`,
        { parse_mode: 'HTML' }
    );
});

bot.action(/^don_man_method_(bkash|nagad)$/, async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.answerCbQuery("❌ অনুমোদিত নয়!", { show_alert: true });
    }
    try { await ctx.answerCbQuery(); } catch (e) {}
    const method = ctx.match[1];
    const session = adminSessions.get(ctx.chat.id);
    if (!session || !session.phone) {
        return ctx.reply("⚠️ অনুগ্রহ করে আবার শুরু থেকে নম্বর দিন (/donations)।", ADMIN_KEYBOARD);
    }
    adminSessions.set(ctx.chat.id, { ...session, step: 'awaiting_donation_amount', method });
    const label = method === 'nagad' ? 'নগদ (Nagad)' : 'বিকাশ (bKash)';
    return ctx.reply(
        `📱 নম্বর: <code>${session.phone}</code>\n💳 মাধ্যম: <b>${label}</b>\n\nকত টাকা দিয়েছেন তা সংখ্যায় লিখুন (যেমন: <code>200</code>):`,
        { parse_mode: 'HTML' }
    );
});

async function executeManualDonationSave(ctx, normPhone, methodCode, amountVal) {
    try {
        const senderHash = sha256Hex(normPhone);
        const senderMasked = maskPhone(normPhone);
        const methodLabel = methodCode === 'nagad' ? 'নগদ (Nagad)' : 'বিকাশ (bKash)';
        const nowIso = new Date().toISOString();
        const reasonMeta = {
            type: 'donation',
            v: 1,
            method: methodCode,
            methodLabel,
            amount: amountVal,
            senderMasked,
            senderHash,
            trxMasked: 'ADMIN',
            devId: 'admin',
            submittedAt: nowIso
        };

        const { data: insertedReq, error: reqErr } = await supabase
            .from('unlock_requests')
            .insert({
                user_id: `don_${methodCode}_${senderHash}`,
                device_id: 'donation_admin',
                device_name: `Donation ${methodLabel} (${senderMasked})`,
                status: 'approved',
                approved_at: nowIso,
                reason: JSON.stringify(reasonMeta)
            })
            .select('id')
            .single();

        if (reqErr || !insertedReq) {
            return ctx.reply("❌ ডাটাবেজে ডোনেশন সংরক্ষণ ব্যর্থ: " + (reqErr?.message || 'Unknown'), ADMIN_KEYBOARD);
        }

        const donInsert = {
            method: methodLabel,
            sender: senderHash,
            amount: amountVal,
            trx_id: `ADMIN [REQ:${insertedReq.id}]`,
            created_at: nowIso,
            total_user_donated: amountVal
        };
        try {
            const { error: dErr } = await supabase.from('donations').insert({
                ...donInsert,
                status: 'approved',
                request_id: insertedReq.id,
                device_id: 'admin',
                sender_masked: senderMasked,
                approved_at: nowIso,
                verified_by: 'telegram_admin_manual'
            });
            if (dErr) {
                await supabase.from('donations').insert(donInsert);
            }
        } catch (_) {}

        adminSessions.delete(ctx.chat?.id || ctx.from?.id);
        return ctx.reply(
            `✅ <b>অনুমোদিত ডোনেশন ডাটাবেজে যোগ হয়েছে!</b>\n\n` +
            `📱 <b>নম্বর:</b> <code>${normPhone}</code> (${senderMasked})\n` +
            `💳 <b>মাধ্যম:</b> ${methodLabel}\n` +
            `💵 <b>পরিমাণ:</b> ৳${amountVal}\n\n` +
            `ইউজার অ্যাপের "টাকা দিয়েছি / নম্বর দিয়ে যাচাই করুন" অপশন থেকে এখনই এই অবদান নিজের প্রোফাইলে যুক্ত করতে পারবেন।`,
            { parse_mode: 'HTML', ...ADMIN_KEYBOARD }
        );
    } catch (e) {
        console.error("Manual donation save error:", e);
        return ctx.reply("❌ ত্রুটি হয়েছে: " + e.message, ADMIN_KEYBOARD);
    }
}

// ডোনেশন অ্যাপ্রুভ ও রিজেক্ট/ডিলিট ইনলাইন বাটন হ্যান্ডলার (don_ok:<uuid> / don_no:<uuid>)
bot.action(/^(don_ok|don_no):(.+)$/, async (ctx) => {
    try {
        if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
            return ctx.answerCbQuery("❌ শুধুমাত্র অ্যাডমিন এটি কনফার্ম করতে পারবেন!", { show_alert: true });
        }

        const isApprove = ctx.match[1] === 'don_ok';
        const requestId = (ctx.match[2] || '').trim();
        if (!requestId) {
            return ctx.answerCbQuery("❌ রিকোয়েস্ট আইডি পাওয়া যায়নি!", { show_alert: true });
        }

        const rawOrigText = ctx.callbackQuery?.message?.text || '';
        const isDashboardMsg = rawOrigText.includes('হাদিয়া ও অনুদান ব্যবস্থাপনা');

        const { data: reqRow, error: fetchErr } = await supabase
            .from('unlock_requests')
            .select('*')
            .eq('id', requestId)
            .maybeSingle();

        if (fetchErr || !reqRow) {
            if (isDashboardMsg) {
                await renderDonationDashboard(ctx, true);
            } else {
                try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
            }
            return ctx.answerCbQuery("ℹ️ এই অনুরোধটি ইতিপূর্বেই বাতিল ও ডাটাবেজ থেকে মুছে ফেলা হয়েছে।");
        }

        const meta = parseDonationMeta(reqRow) || {};
        const amountVal = Number(meta.amount) || 0;

        if (!isApprove) {
            // বাতিল করলে ডাটাবেজ থেকেই সরাসরি সম্পূর্ণ মুছে ফেলা হবে (unlock_requests + donations)
            const { error: delReqErr } = await supabase
                .from('unlock_requests')
                .delete()
                .eq('id', requestId);

            if (delReqErr) {
                return ctx.answerCbQuery("❌ মুছে ফেলতে সমস্যা: " + delReqErr.message, { show_alert: true });
            }

            try {
                await supabase.from('donations').delete().ilike('trx_id', `%REQ:${requestId}%`);
                await supabase.from('donations').delete().eq('request_id', requestId);
            } catch (_) {}

            if (isDashboardMsg) {
                await renderDonationDashboard(ctx, true);
            } else {
                let delTimeStr = '';
                try { delTimeStr = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true }); } catch (_) { delTimeStr = new Date().toISOString(); }
                const origText = escapeHtml(rawOrigText || `হাদিয়া অনুরোধ (${meta.methodLabel || ''} ৳${amountVal})`);

                try {
                    await ctx.editMessageText(
                        `${origText}\n\n───────────────────\n🗑 <b>বাতিল ও ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে!</b>\n🕒 <b>সময়:</b> ${delTimeStr}`,
                        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } }
                    );
                } catch (editErr) {
                    console.error("editMessageText error:", editErr.message);
                }
            }

            return ctx.answerCbQuery("🗑 বাতিল ও ডাটাবেজ থেকে মুছে ফেলা হয়েছে!");
        }

        if (reqRow.status === 'approved') {
            if (isDashboardMsg) {
                await renderDonationDashboard(ctx, true);
            } else {
                try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
            }
            return ctx.answerCbQuery("✅ এটি ইতিপূর্বেই কনফার্ম করা হয়েছে।");
        }

        const nowIso = new Date().toISOString();
        const { error: updErr } = await supabase
            .from('unlock_requests')
            .update({
                status: 'approved',
                approved_at: nowIso,
                updated_at: nowIso
            })
            .eq('id', requestId);

        if (updErr) {
            return ctx.answerCbQuery("❌ আপডেট ব্যর্থ: " + updErr.message, { show_alert: true });
        }

        // donations টেবিলও আপডেট করা (পাশাপাশি কোনো [REL:...] থাকলে পরিষ্কার করা)
        try {
            const { data: matchingDons } = await supabase
                .from('donations')
                .select('id, trx_id')
                .ilike('trx_id', `%REQ:${requestId}%`);

            for (const dRow of (matchingDons || [])) {
                const cleanTrx = String(dRow.trx_id || '').replace(/\[REL:[^\]]+\]/gi, '[TG:OK]').replace(/\s+/g, ' ').trim();
                const { error: donErr } = await supabase
                    .from('donations')
                    .update({
                        status: 'approved',
                        approved_at: nowIso,
                        verified_by: 'telegram_admin',
                        total_user_donated: amountVal,
                        trx_id: cleanTrx
                    })
                    .eq('id', dRow.id);
                if (donErr) {
                    await supabase
                        .from('donations')
                        .update({ total_user_donated: amountVal, trx_id: cleanTrx })
                        .eq('id', dRow.id);
                }
            }
        } catch (_) {}

        if (isDashboardMsg) {
            await renderDonationDashboard(ctx, true);
        } else {
            let timeStr = '';
            try { timeStr = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true }); } catch (_) { timeStr = nowIso; }

            const origText = escapeHtml(rawOrigText || `হাদিয়া অনুরোধ (${meta.methodLabel || ''} ৳${amountVal})`);
            const footer = `\n\n───────────────────\n✅ <b>কনফার্ম ও অনুমোদিত!</b>\n🕒 <b>সময়:</b> ${timeStr}\n📌 ইউজারের আইডি/প্রোফাইলে এবং নম্বর যাচাই সিস্টেমে স্থায়ীভাবে যুক্ত হয়েছে।`;

            try {
                await ctx.editMessageText(`${origText}${footer}`, {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [] }
                });
            } catch (editErr) {
                console.error("editMessageText error:", editErr.message);
            }
        }

        return ctx.answerCbQuery(`✅ ৳${amountVal} হাদিয়া কনফার্ম ও অনুমোদিত হয়েছে!`);
    } catch (e) {
        console.error("Donation action error:", e);
        try { await ctx.answerCbQuery("❌ ত্রুটি: " + e.message, { show_alert: true }); } catch (_) {}
    }
});

// অটোমেটিক টেলিগ্রাম রিলে ওয়াচার (ইউজারের ফোনে Telegram API ব্লক থাকলে Render নিজেই ফুল ডিটেইলস পাঠাবে)
let isRelayRunning = false;
async function relayPendingDonations() {
    if (isRelayRunning) return;
    isRelayRunning = true;
    try {
        // ১. ক্লায়েন্ট ইভেন্ট নোটিফিকেশন রিলে (unlock_requests টেবিল থেকে)
        const { data: notifyRows } = await supabase
            .from('unlock_requests')
            .select('*')
            .like('user_id', 'notify_%')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10);

        for (const nRow of (notifyRows || [])) {
            try {
                const payload = JSON.parse(nRow.reason || '{}');
                if (payload && payload.text && ADMIN_CHAT_ID) {
                    await bot.telegram.sendMessage(ADMIN_CHAT_ID, String(payload.text), {
                        parse_mode: 'HTML',
                        ...(payload.reply_markup ? { reply_markup: payload.reply_markup } : {})
                    });
                }
                await supabase.from('unlock_requests').delete().eq('id', nRow.id);
            } catch (nErr) {
                console.error("Client notify relay error:", nErr.message);
            }
        }

        // ২. পেন্ডিং হাদিয়া / অনুদান রিলে
        const { data: relRows } = await supabase
            .from('donations')
            .select('*')
            .ilike('trx_id', '%[REL:%')
            .order('created_at', { ascending: true })
            .limit(10);

        if (!relRows || relRows.length === 0) return;

        for (const dRow of relRows) {
            const rawTrx = String(dRow.trx_id || '');
            const reqMatch = rawTrx.match(/\[REQ:([0-9a-f-]+)\]/i);
            const relMatch = rawTrx.match(/\[REL:([0-9a-f]+)\]/i);
            if (!reqMatch || !reqMatch[1] || !relMatch || !relMatch[1]) continue;

            const requestId = reqMatch[1];
            const unsealed = decodeRelayPayload(relMatch[1]);
            const cleanedTrx = rawTrx.replace(/\[REL:[^\]]+\]/gi, '[TG:OK]').replace(/\s+/g, ' ').trim();

            if (relayedRequestIds.has(requestId)) {
                await supabase.from('donations').update({ trx_id: cleanedTrx }).eq('id', dRow.id);
                continue;
            }

            // রিকোয়েস্ট পেন্ডিং থাকলে মেসেজ পাঠানো
            const { data: reqRow } = await supabase
                .from('unlock_requests')
                .select('*')
                .eq('id', requestId)
                .maybeSingle();

            if (reqRow && reqRow.status === 'pending' && unsealed) {
                const meta = parseDonationMeta(reqRow) || {};
                const methodName = meta.methodLabel || dRow.method || 'বিকাশ/নগদ';
                const amountVal = dRow.amount || meta.amount || 0;
                const senderNum = unsealed.sender || meta.senderMasked || 'অজানা';
                const trxCode = unsealed.trxId || stripDonationTrxTags(rawTrx) || 'দেওয়া হয়নি';
                let dateStr = '';
                try { dateStr = new Date(dRow.created_at || Date.now()).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true }); } catch (_) { dateStr = dRow.created_at || ''; }

                const adminMsg =
                    `💰 <b>নতুন হাদিয়া / অনুদান কনফার্মেশন অনুরোধ!</b>\n\n` +
                    `💳 <b>মাধ্যম:</b> ${escapeHtml(methodName)}\n` +
                    `📱 <b>প্রেরক নম্বর:</b> <code>${escapeHtml(senderNum)}</code>\n` +
                    `💵 <b>টাকার পরিমাণ:</b> ৳${amountVal}\n` +
                    `🧾 <b>TrxID:</b> <code>${escapeHtml(trxCode)}</code>\n` +
                    `🆔 <b>Device ID:</b> <code>${escapeHtml(meta.devId || 'android')}</code>\n` +
                    `🕒 <b>তারিখ:</b> ${escapeHtml(dateStr)}\n` +
                    `📌 <b>বর্তমান স্ট্যাটাস:</b> ⏳ অ্যাডমিন কনফার্মেশনের অপেক্ষায়\n\n` +
                    `<i>বিকাশ/নগদ মেসেজ যাচাই করে নিচের বাটনে চাপ দিন:</i>`;

                const inlineKb = Markup.inlineKeyboard([
                    [
                        Markup.button.callback('✅ কনফার্ম করুন', `don_ok:${requestId}`),
                        Markup.button.callback('❌ বাতিল ও মুছে ফেলুন', `don_no:${requestId}`)
                    ]
                ]);

                try {
                    await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminMsg, {
                        parse_mode: 'HTML',
                        ...inlineKb
                    });
                    if (relayedRequestIds.size > 200) relayedRequestIds.clear();
                    relayedRequestIds.add(requestId);
                } catch (sendErr) {
                    console.error("Relay Telegram send error:", sendErr.message);
                    continue;
                }
            }

            await supabase.from('donations').update({ trx_id: cleanedTrx }).eq('id', dRow.id);
        }
    } catch (e) {
        console.error("Relay polling error:", e.message);
    } finally {
        isRelayRunning = false;
    }
}

// ১১. "📊 ড্যাশবোর্ড / স্ট্যাটাস" হ্যান্ডলার
bot.hears(['📊 ড্যাশবোর্ড / স্ট্যাটাস', '/status'], async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
        return ctx.reply("❌ শুধুমাত্র অ্যাডমিন এই স্ট্যাটাস দেখতে পারবেন।");
    }

    try {
        const { count: totalReqs } = await supabase.from('unlock_requests').select('*', { count: 'exact', head: true }).not('device_id', 'like', 'donation_%');
        const { count: totalCodes } = await supabase.from('unlock_codes').select('*', { count: 'exact', head: true });
        const { count: unusedCodes } = await supabase.from('unlock_codes').select('*', { count: 'exact', head: true }).eq('status', 'unused');
        const { count: usedCodes } = await supabase.from('unlock_codes').select('*', { count: 'exact', head: true }).eq('status', 'used');
        const { data: donRows } = await supabase.from('unlock_requests').select('status,reason').like('user_id', 'don_%');

        let donPendingCount = 0;
        let donApprovedCount = 0;
        let donApprovedAmt = 0;
        (donRows || []).forEach((r) => {
            const m = parseDonationMeta(r);
            if (!m) return;
            if (r.status === 'pending') donPendingCount += 1;
            else if (r.status === 'approved') {
                donApprovedCount += 1;
                donApprovedAmt += Number(m.amount) || 0;
            }
        });

        const statusMsg = `📊 <b>Helpniche অ্যাডমিন ড্যাশবোর্ড</b>\n\n` +
            `📱 <b>মোট ডিভাইস রিকোয়েস্ট:</b> ${totalReqs || 0} টি\n` +
            `🔑 <b>মোট তৈরি করা কোড:</b> ${totalCodes || 0} টি\n` +
            `⏳ <b>অব্যবহৃত কোড (Active):</b> ${unusedCodes || 0} টি\n` +
            `✅ <b>ব্যবহৃত কোড (Used):</b> ${usedCodes || 0} টি\n\n` +
            `💰 <b>অনুমোদিত হাদিয়া:</b> ${donApprovedCount} টি (মোট ৳${donApprovedAmt})\n` +
            `⏳ <b>অপেক্ষমাণ হাদিয়া:</b> ${donPendingCount} টি\n\n` +
            `🟢 <b>সার্ভার স্ট্যাটাস:</b> অনলাইন ও সচল\n` +
            `🕒 <b>সময়:</b> ${new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', hour12: true })}`;

        await ctx.reply(statusMsg, { parse_mode: 'HTML', ...ADMIN_KEYBOARD });
    } catch (e) {
        ctx.reply("❌ স্ট্যাটাস ফেচ করতে সমস্যা: " + e.message, ADMIN_KEYBOARD);
    }
});

// ১২. Render-এর জন্য ওয়েব পোর্ট ও ব্যাকএন্ড নোটিফিকেশন এন্ডপয়েন্ট
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'POST' && (req.url === '/api/notify-admin' || req.url === '/notify-admin')) {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
            if (body.length > 65536) req.destroy();
        });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const text = String(payload.text || payload.message || '').trim();
                if (!text || !ADMIN_CHAT_ID || !BOT_TOKEN) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ ok: false, delivered: false }));
                }
                const extra = { parse_mode: 'HTML' };
                if (payload.reply_markup) {
                    extra.reply_markup = payload.reply_markup;
                } else if (payload.requestId) {
                    extra.reply_markup = {
                        inline_keyboard: [[
                            { text: '✅ কনফার্ম করুন', callback_data: `don_ok:${payload.requestId}` },
                            { text: '❌ বাতিল ও মুছে ফেলুন', callback_data: `don_no:${payload.requestId}` }
                        ]]
                    };
                }
                await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, extra);
                if (payload.requestId) {
                    relayedRequestIds.add(String(payload.requestId));
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: true, delivered: true }));
            } catch (err) {
                console.error("Notify endpoint error:", err.message);
                res.writeHead(502, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ ok: false, delivered: false }));
            }
        });
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('FocusDurood / Helpniche Telegram Bot is Active & Running 24/7 on Render!');
});

server.listen(PORT, () => {
    console.log(`🌐 Web listener active on port: ${PORT}`);
});

if (BOT_TOKEN) {
    bot.launch().then(() => {
        console.log("🚀 Helpniche Telegram Bot is running smoothly with Auto Donation Push, DB Delete-on-Cancel, and Smart Unlock...");
        setTimeout(() => relayPendingDonations(), 3000);
        setInterval(() => relayPendingDonations(), 10000);
    });
}

process.once('SIGINT', () => { try { bot.stop('SIGINT'); } catch (_) {} server.close(); });
process.once('SIGTERM', () => { try { bot.stop('SIGTERM'); } catch (_) {} server.close(); });