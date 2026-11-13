/* ==========================================================================
   DONATION & SADQAH SYSTEM (ADMIN-CONFIRMED & NUMBER VERIFICATION ENABLED)
   ========================================================================== */

(function() {
    'use strict';

    const SUPABASE_PROJECT_URL = window.SUPABASE_PROJECT_URL || "https://dlxmzzvcpoysoouakadt.supabase.co";
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzA3NDEsImV4cCI6MjA5MzcwNjc0MX0.iXQRyqevSoRXvpUG291OFr4bzQq6yEoN6lXvikoJK5g";

    // Masked Telegram Admin credential resolver (mirrors unlock-ui pattern)
    const _SEC_PART_A = [72, 51, 108, 112, 78, 49, 99, 104, 51, 95];
    const _SEC_PART_B = [83, 51, 99, 117, 114, 49, 116, 121, 95];
    const _SEC_PART_C = [77, 52, 115, 116, 51, 114, 95, 75, 51, 121];

    function _resolveSecVal(byteSeq) {
        const k = String.fromCharCode(..._SEC_PART_A, ..._SEC_PART_B, ..._SEC_PART_C);
        let out = '';
        for (let i = 0; i < byteSeq.length; i++) {
            out += String.fromCharCode(byteSeq[i] ^ k.charCodeAt(i % k.length) ^ (i + 42));
        }
        return out;
    }

    const _ENC_T_BYTES = [90,32,112,101,83,38,98,111,56,92,93,71,20,10,122,127,0,58,23,2,107,3,92,10,96,42,126,69,73,56,22,116,79,116,27,70,101,45,71,90,57,6,100,106,42];
    const _ENC_A_BYTES = [84,42,119,108,86,47,98,105,49,85];

    const TELEGRAM_BOT_TOKEN = _resolveSecVal(_ENC_T_BYTES);
    const ADMIN_CHAT_ID = _resolveSecVal(_ENC_A_BYTES);

    // ডিফল্ট কনফিগারেশন (অফলাইনেও যাতে কাজ করে)
    const DEFAULT_CONFIG = {
        bkash_number: "01773622548",
        bkash_type: "Personal (Send Money)",
        nagad_number: "01773622548",
        nagad_type: "Personal (Send Money)",
        non_donor_threshold: 15,
        donor_threshold: 100
    };

    let activeConfig = { ...DEFAULT_CONFIG };
    let currentSelectedMethod = null;
    let currentVerifyPhone = '';
    let currentVerifyMethod = null;
    let pendingPollIntervalId = null;
    let lastSyncTimestamp = 0;
    let isSyncRunning = false;

    // লোকাল স্টোরেজ থেকে ক্যাশড কনফিগ লোড করা
    try {
        const cached = localStorage.getItem('cached_donation_config');
        if (cached) {
            const parsed = JSON.parse(cached);
            activeConfig = { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch (e) {}

    // নিরাপদ লোকাল স্টোরেজ হেল্পার
    function readJsonStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed !== null && parsed !== undefined ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJsonStorage(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // বাংলা-ইংরেজি নম্বর নরমালাইজেশন (+880 / 880 / 017... / ০১৭... -> canonical 017...)
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

    function maskTrxId(trx) {
        const t = String(trx || '').trim();
        if (!t) return '';
        if (t.length <= 4) return '••••';
        return `${t.slice(0, 2)}••••${t.slice(-2)}`;
    }

    function formatMethodLabel(code) {
        return code === 'nagad' ? 'নগদ (Nagad)' : 'বিকাশ (bKash)';
    }

    // Pure-JS SHA-256 fallback in case WebCrypto is unavailable in any WebView context
    function fallbackSha256Hex(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        const lengthProperty = 'length';
        let i, j;
        let result = '';
        const words = [];
        const asciiBitLength = ascii[lengthProperty] * 8;
        let hash = fallbackSha256Hex.h = fallbackSha256Hex.h || [];
        const k = fallbackSha256Hex.k = fallbackSha256Hex.k || [];
        let primeCounter = k[lengthProperty];
        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        ascii += '\x80';
        while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j >> 8) return '';
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength);
        const workingHash = hash.slice(0, 8);
        for (j = 0; j < words[lengthProperty];) {
            const w = words.slice(j, j += 16);
            const oldHash = workingHash.slice(0);
            for (i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const a = workingHash[0], e = workingHash[4];
                const temp1 = workingHash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & workingHash[5]) ^ ((~e) & workingHash[6]))
                    + k[i]
                    + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0);
                const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & workingHash[1]) ^ (a & workingHash[2]) ^ (workingHash[1] & workingHash[2]));
                workingHash.unshift((temp1 + temp2) | 0);
                workingHash[4] = (workingHash[4] + temp1) | 0;
                workingHash.pop();
            }
            for (i = 0; i < 8; i++) {
                workingHash[i] = (workingHash[i] + oldHash[i]) | 0;
            }
        }
        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                const b = (workingHash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }

    // H1 (donor PII): SHA-256 hex helper — the raw donor phone number is never
    // stored in public DB columns; only its one-way hash is saved & queried.
    async function sha256Hex(text) {
        const clean = String(text || '').trim();
        try {
            if (window.crypto && window.crypto.subtle) {
                const buf = await window.crypto.subtle.digest(
                    'SHA-256', new TextEncoder().encode(clean)
                );
                return Array.from(new Uint8Array(buf))
                    .map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {}
        return fallbackSha256Hex(clean);
    }

    async function getClientDeviceId() {
        try {
            if (window.Capacitor?.Plugins?.UnlockPlugin?.getDeviceId) {
                const res = await window.Capacitor.Plugins.UnlockPlugin.getDeviceId();
                if (res && res.deviceId) {
                    const clean = res.deviceId.trim().toLowerCase();
                    localStorage.setItem('donation_cached_dev_id', clean);
                    return clean;
                }
            }
        } catch (e) {}
        const cachedNative = localStorage.getItem('donation_cached_dev_id');
        if (cachedNative) return cachedNative;

        let fallbackId = localStorage.getItem('donation_client_dev_id');
        if (!fallbackId) {
            fallbackId = 'web_' + Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4);
            localStorage.setItem('donation_client_dev_id', fallbackId);
        }
        return fallbackId;
    }

    // ক্লাউড (Supabase) থেকে ডায়নামিক কনফিগ ফেচ করা
    async function fetchRemoteDonationConfig() {
        try {
            const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/app_config?key=eq.donation_config&select=value`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0 && data[0].value) {
                    activeConfig = { ...DEFAULT_CONFIG, ...data[0].value };
                    localStorage.setItem('cached_donation_config', JSON.stringify(activeConfig));
                }
            }
        } catch (e) {}
    }

    // অ্যাডমিনকে হাদিয়া কনফার্মেশন বাটনসহ টেলিগ্রাম মেসেজ পাঠানো
    async function sendTelegramConfirmationRequest(htmlText, requestId) {
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: '✅ কনফার্ম করুন', callback_data: `don_ok:${requestId}` },
                    { text: '❌ বাতিল করুন', callback_data: `don_no:${requestId}` }
                ]
            ]
        };

        // ১. সরাসরি Bot API কল (তাৎক্ষণিক ও বাটনসহ)
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
                const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_CHAT_ID,
                        text: htmlText,
                        parse_mode: 'HTML',
                        reply_markup: inlineKeyboard
                    }),
                    signal: controller ? controller.signal : undefined
                });
                if (timer) clearTimeout(timer);
                if (res.ok) {
                    const data = await res.json().catch(() => null);
                    if (data && data.ok) return true;
                }
            } catch (e) {}
        }

        // ২. ফলব্যাক: এজ ফাংশন যদি ডিপ্লয় করা থাকে
        try {
            const res = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/telegram-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    type: 'donation_alert',
                    text: htmlText,
                    reply_markup: inlineKeyboard
                })
            });
            if (res.ok) return true;
        } catch (e) {}

        return false;
    }

    // Supabase-এ পেন্ডিং ভেরিফিকেশন রিকোয়েস্ট সংরক্ষণ (unlock_requests টেবিলে donation_ প্রিফিক্সসহ আলাদা আইসোলেশন)
    async function createDonationVerificationRequest({ devId, methodCode, methodLabel, senderHash, senderMasked, amountVal, trxId, nowIso }) {
        const reasonObj = {
            type: 'donation',
            v: 1,
            method: methodCode,
            methodLabel: methodLabel,
            amount: amountVal,
            senderMasked: senderMasked,
            senderHash: senderHash,
            trxMasked: maskTrxId(trxId),
            devId: devId,
            submittedAt: nowIso
        };

        const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: `don_${methodCode}_${senderHash}`,
                device_id: `donation_${devId}`,
                device_name: `Donation ${methodLabel} (${senderMasked})`,
                status: 'pending',
                reason: JSON.stringify(reasonObj)
            })
        });

        if (!res.ok) {
            throw new Error(`DB error (${res.status})`);
        }
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows[0] || !rows[0].id) {
            throw new Error('Invalid DB response');
        }
        return rows[0].id;
    }

    // Supabase-এর canonical donations টেবিলে রেকর্ড সংরক্ষণ
    async function recordDonationToSupabase(record) {
        try {
            await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/donations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(record)
            });
        } catch (e) {}
    }

    // ডোনেশন মেটাডাটা পার্সার
    function parseDonationMeta(row) {
        if (!row) return null;
        try {
            const parsed = JSON.parse(row.reason || '{}');
            if (parsed && parsed.type === 'donation' && Number(parsed.amount) > 0) {
                return parsed;
            }
        } catch (e) {}
        return null;
    }

    // ডিভাইস ও পেন্ডিং লিস্টের জন্য অ্যাডমিন কনফার্মেশন অটো-সিঙ্ক
    async function syncPendingDonations(forceManual = false) {
        const now = Date.now();
        if (isSyncRunning) return { newlyApprovedCount: 0, newlyApprovedAmount: 0, newlyRejectedCount: 0 };
        if (!forceManual && now - lastSyncTimestamp < 8000) {
            return { newlyApprovedCount: 0, newlyApprovedAmount: 0, newlyRejectedCount: 0 };
        }
        isSyncRunning = true;
        lastSyncTimestamp = now;

        try {
            const devId = await getClientDeviceId();
            const pendingList = readJsonStorage('donation_pending_list', []);
            const creditedIds = readJsonStorage('donation_credited_ids', []);
            const rejectedSeenIds = readJsonStorage('donation_rejected_seen_ids', []);

            // ডিভাইস অনুযায়ী ডোনেশন রো আনা
            const queryUrl = `${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests?device_id=eq.${encodeURIComponent('donation_' + devId)}&user_id=like.don_%25&select=id,user_id,status,reason,created_at,approved_at&order=created_at.desc`;
            const res = await fetch(queryUrl, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }).catch(() => null);

            let fetchedRows = [];
            if (res && res.ok) {
                const data = await res.json().catch(() => []);
                if (Array.isArray(data)) fetchedRows = data;
            }

            // লোকাল পেন্ডিং আইটেমগুলোর মধ্যে কোনো আইডি ডিভাইস পরিবর্তন বা অন্য কারণে মিস হলে সরাসরি id দিয়ে চেক করা
            const knownIds = new Set(fetchedRows.map(r => r.id));
            const missingIds = pendingList
                .map(p => p.requestId)
                .filter(id => id && !knownIds.has(id));

            const cleanMissing = missingIds.filter(id => /^[0-9a-f-]+$/i.test(id));
            if (cleanMissing.length > 0) {
                const extraRes = await fetch(
                    `${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests?id=in.(${cleanMissing.join(',')})&select=id,user_id,status,reason,created_at,approved_at`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    }
                ).catch(() => null);
                if (extraRes && extraRes.ok) {
                    const extraData = await extraRes.json().catch(() => []);
                    if (Array.isArray(extraData)) {
                        fetchedRows = fetchedRows.concat(extraData);
                    }
                }
            }

            if (fetchedRows.length === 0) {
                return { newlyApprovedCount: 0, newlyApprovedAmount: 0, newlyRejectedCount: 0 };
            }

            let currentTotal = parseFloat(localStorage.getItem('donation_total_amount') || '0');
            if (isNaN(currentTotal) || currentTotal < 0) currentTotal = 0;

            let history = readJsonStorage('donation_history', []);
            const rowById = new Map();
            fetchedRows.forEach(r => { if (r && r.id) rowById.set(r.id, r); });

            let newlyApprovedCount = 0;
            let newlyApprovedAmount = 0;
            const approvedMethodLabels = [];
            let newlyRejectedCount = 0;
            let newlyRejectedAmount = 0;

            for (const row of rowById.values()) {
                const meta = parseDonationMeta(row);
                if (!meta) continue;
                const amt = parseFloat(meta.amount) || 0;
                const mLabel = meta.methodLabel || formatMethodLabel(meta.method);

                if (row.status === 'approved') {
                    if (!creditedIds.includes(row.id)) {
                        creditedIds.push(row.id);
                        currentTotal += amt;
                        newlyApprovedCount += 1;
                        newlyApprovedAmount += amt;
                        if (!approvedMethodLabels.includes(mLabel)) {
                            approvedMethodLabels.push(mLabel);
                        }
                    }
                    // হিস্ট্রিতে স্ট্যাটাস আপডেট করা
                    const idx = history.findIndex(h => h.requestId === row.id);
                    if (idx >= 0) {
                        history[idx].status = 'approved';
                        history[idx].approvedAt = row.approved_at || new Date().toISOString();
                    } else {
                        history.push({
                            requestId: row.id,
                            date: row.created_at || new Date().toISOString(),
                            dateText: new Date(row.created_at || Date.now()).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' }),
                            method: mLabel,
                            methodCode: meta.method || 'bkash',
                            senderMasked: meta.senderMasked || '',
                            senderHash: meta.senderHash || '',
                            amount: amt,
                            trxId: meta.trxMasked || 'N/A',
                            status: 'approved',
                            approvedAt: row.approved_at || new Date().toISOString()
                        });
                    }
                } else if (row.status === 'rejected') {
                    const idx = history.findIndex(h => h.requestId === row.id);
                    if (idx >= 0) {
                        history[idx].status = 'rejected';
                    }
                    if (!rejectedSeenIds.includes(row.id)) {
                        rejectedSeenIds.push(row.id);
                        newlyRejectedCount += 1;
                        newlyRejectedAmount += amt;
                    }
                }
            }

            // লোকাল পেন্ডিং তালিকা থেকে কনফার্মড বা বাতিলকৃত আইটেম সরানো
            const updatedPending = pendingList.filter(p => {
                const matched = rowById.get(p.requestId);
                if (!matched) return true;
                return matched.status === 'pending';
            });

            if (newlyApprovedCount > 0) {
                localStorage.setItem('donation_total_amount', currentTotal.toString());
                writeJsonStorage('donation_credited_ids', creditedIds);
            }
            if (newlyRejectedCount > 0) {
                writeJsonStorage('donation_rejected_seen_ids', rejectedSeenIds);
            }
            writeJsonStorage('donation_history', history);
            writeJsonStorage('donation_pending_list', updatedPending);

            updatePendingPollingState();

            if (window.updateSettingsDonationCard) {
                window.updateSettingsDonationCard();
            }

            // মডাল খোলা থাকলে ইন্ট্রো অংশ রিফ্রেশ করা
            const overlay = document.getElementById('donation-modal-overlay');
            if (overlay && overlay.style.display !== 'none') {
                refreshIntroContent();
            }

            if (newlyApprovedCount > 0) {
                const methodSummary = approvedMethodLabels.join(', ');
                alert(`✅ আলহামদুলিল্লাহ! আপনার ৳${newlyApprovedAmount} (${methodSummary}) হাদিয়া অ্যাডমিন কর্তৃক কনফার্ম হয়ে আপনার প্রোফাইলে যুক্ত হয়েছে।`);
            } else if (newlyRejectedCount > 0) {
                alert(`❌ আপনার ৳${newlyRejectedAmount} হাদিয়া সাবমিশনটি অ্যাডমিন কর্তৃক যাচাইয়ের পর বাতিল করা হয়েছে (প্রোফাইলে যোগ করা হয়নি)।`);
            } else if (forceManual) {
                if (updatedPending.length > 0) {
                    alert('⏳ আপনার অনুদানটি এখনো অ্যাডমিনের কনফার্মেশনের অপেক্ষায় আছে। কনফার্ম হলেই এখানে যুক্ত হয়ে যাবে।');
                } else {
                    alert('ℹ️ নতুন কোনো কনফার্মেশন পেন্ডিং নেই।');
                }
            }

            return { newlyApprovedCount, newlyApprovedAmount, newlyRejectedCount };
        } catch (e) {
            console.error('Pending donation sync error:', e);
            return { newlyApprovedCount: 0, newlyApprovedAmount: 0, newlyRejectedCount: 0 };
        } finally {
            isSyncRunning = false;
        }
    }

    function updatePendingPollingState() {
        const pendingList = readJsonStorage('donation_pending_list', []);
        if (pendingList.length > 0 && !pendingPollIntervalId) {
            pendingPollIntervalId = setInterval(() => {
                syncPendingDonations(false);
            }, 15000);
        } else if (pendingList.length === 0 && pendingPollIntervalId) {
            clearInterval(pendingPollIntervalId);
            pendingPollIntervalId = null;
        }
    }

    let lastTrackTime = 0;

    // অ্যাপ ওপেন বা আনলক ট্র্যাক করা
    function trackAppOpen() {
        const now = Date.now();
        if (now - lastTrackTime < 3000) {
            return;
        }
        lastTrackTime = now;

        const totalDonated = parseFloat(localStorage.getItem('donation_total_amount') || '0');
        let openCount = parseInt(localStorage.getItem('donation_open_count') || '0', 10) + 1;
        localStorage.setItem('donation_open_count', openCount.toString());

        const lastPrompt = parseInt(localStorage.getItem('donation_last_prompt_count') || '0', 10);
        const threshold = totalDonated > 0 ? (activeConfig.donor_threshold || 100) : (activeConfig.non_donor_threshold || 15);

        if ((openCount - lastPrompt) >= threshold) {
            setTimeout(() => {
                showDonationModal();
            }, 1000);
        }
    }

    // ডায়ালগ ডম ও স্টাইল তৈরি
    function ensureModalDOMElements() {
        if (document.getElementById('donation-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'donation-modal-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(2, 6, 23, 0.88);
            z-index: 1000000;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(8px);
            padding: 16px;
            box-sizing: border-box;
            font-family: 'Kalpurush', 'SolaimanLipi', system-ui, sans-serif;
        `;

        overlay.innerHTML = `
            <div id="donation-modal-card" style="
                background: #0f172a;
                border: 1px solid #1e293b;
                border-radius: 20px;
                max-width: 400px;
                width: 100%;
                color: #fff;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                position: relative;
            ">
                <!-- হেডার -->
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: #1e293b;
                    border-bottom: 1px solid #334155;
                ">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button id="btn-donation-back" style="display:none; background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer; padding:0 6px; line-height:1;">&larr;</button>
                        <h3 id="donation-modal-header-title" style="margin:0; font-size:16px; font-weight:800; color:#38bdf8;">অ্যাপ পরিচালনায় হাদিয়া</h3>
                    </div>
                    <button id="btn-donation-close-x" style="background:transparent; border:none; color:#94a3b8; font-size:22px; cursor:pointer; line-height:1;">&times;</button>
                </div>

                <!-- মূল কন্টেন্ট বডি -->
                <div id="donation-modal-body" style="padding: 20px; overflow-y: auto; max-height: 78vh;">
                    <!-- ভিউ ১: সাধারণ আবেদন / পেন্ডিং অবস্থা / নম্বর যাচাই অপশন -->
                    <div id="donation-view-intro">
                        <div id="donation-badge-container" style="margin-bottom:12px;"></div>
                        <div id="donation-pending-container" style="display:none; margin-bottom:14px;"></div>
                        <p id="donation-intro-text" style="font-size:13px; color:#cbd5e1; line-height:1.6; margin:0 0 18px 0;"></p>

                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <button id="btn-donation-action-donate" style="
                                width: 100%;
                                padding: 13px;
                                background: #10b981;
                                color: #042f2e;
                                border: none;
                                border-radius: 10px;
                                font-size: 14px;
                                font-weight: 800;
                                cursor: pointer;
                            ">ডোনেট করুন</button>

                            <button id="btn-donation-action-verify" style="
                                width: 100%;
                                padding: 12px;
                                background: rgba(56, 189, 248, 0.14);
                                color: #38bdf8;
                                border: 1px solid rgba(56, 189, 248, 0.45);
                                border-radius: 10px;
                                font-size: 13px;
                                font-weight: 800;
                                cursor: pointer;
                            ">টাকা দিয়েছি / নম্বর দিয়ে যাচাই করুন</button>

                            <button id="btn-donation-action-later" style="
                                width: 100%;
                                padding: 11px;
                                background: #1e293b;
                                color: #94a3b8;
                                border: 1px solid #334155;
                                border-radius: 10px;
                                font-size: 13px;
                                font-weight: 700;
                                cursor: pointer;
                            ">পরে করব</button>
                        </div>
                    </div>

                    <!-- ভিউ ২: মেথড নির্বাচন (বিকাশ / নগদ) -->
                    <div id="donation-view-methods" style="display:none; text-align:center;">
                        <p style="font-size:13px; color:#cbd5e1; margin:0 0 20px 0; line-height:1.5;">
                            যে মাধ্যমে আপনি হাদিয়া বা অনুদান পাঠাতে চান তা নির্বাচন করুন:
                        </p>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                            <div class="donation-method-btn" data-method="bkash" style="
                                background: linear-gradient(145deg, #1e293b, #0f172a);
                                border: 1.5px solid rgba(226, 19, 110, 0.4);
                                border-radius: 18px;
                                padding: 20px 10px;
                                cursor: pointer;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                gap: 12px;
                                transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
                                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
                            ">
                                <div style="
                                    width: 72px;
                                    height: 72px;
                                    border-radius: 50%;
                                    overflow: hidden;
                                    background: #e2136e;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    box-shadow: 0 4px 14px rgba(226, 19, 110, 0.45);
                                    border: 2px solid rgba(255, 255, 255, 0.2);
                                ">
                                    <img src="assets/bkash-logo.png" alt="bKash" style="width:100%; height:100%; object-fit:cover;" />
                                </div>
                                <span style="font-size:16px; font-weight:800; color:#ffffff;">বিকাশ</span>
                            </div>

                            <div class="donation-method-btn" data-method="nagad" style="
                                background: linear-gradient(145deg, #1e293b, #0f172a);
                                border: 1.5px solid rgba(247, 148, 29, 0.4);
                                border-radius: 18px;
                                padding: 20px 10px;
                                cursor: pointer;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                gap: 12px;
                                transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
                                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
                            ">
                                <div style="
                                    width: 72px;
                                    height: 72px;
                                    border-radius: 50%;
                                    overflow: hidden;
                                    background: #ffffff;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    box-shadow: 0 4px 14px rgba(247, 148, 29, 0.45);
                                    border: 2px solid rgba(255, 255, 255, 0.2);
                                ">
                                    <img src="assets/nagad-logo.png" alt="Nagad" style="width:100%; height:100%; object-fit:cover;" />
                                </div>
                                <span style="font-size:16px; font-weight:800; color:#ffffff;">নগদ</span>
                            </div>
                        </div>

                        <button id="btn-donation-methods-to-verify" style="
                            width: 100%;
                            padding: 10px;
                            background: transparent;
                            color: #38bdf8;
                            border: 1px dashed rgba(56, 189, 248, 0.4);
                            border-radius: 10px;
                            font-size: 12.5px;
                            font-weight: 700;
                            cursor: pointer;
                        ">ইতিপূর্বে টাকা পাঠিয়েছেন? নম্বর দিয়ে যাচাই করুন &rarr;</button>
                    </div>

                    <!-- ভিউ ৩: পেমেন্ট বিস্তারিত ও ট্রানজ্যাকশন সাবমিশন ফর্ম -->
                    <div id="donation-view-form" style="display:none;">
                        <div id="donation-method-card" style="
                            background: #1e293b;
                            border: 1px solid #334155;
                            border-radius: 16px;
                            padding: 16px;
                            margin-bottom: 16px;
                            text-align: center;
                        ">
                            <div id="donation-card-logo-badge" style="display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px;"></div>
                            <div id="donation-card-title" style="font-size:15px; font-weight:800; margin-bottom:6px;"></div>
                            <div id="donation-card-number" style="font-size:22px; font-weight:900; letter-spacing:2px; color:#38bdf8; margin-bottom:12px; font-family:monospace;"></div>

                            <button id="btn-donation-copy-num" style="
                                width: 100%;
                                padding: 10px;
                                background: #0284c7;
                                color: #fff;
                                border: none;
                                border-radius: 8px;
                                font-size: 13px;
                                font-weight: 800;
                                cursor: pointer;
                                transition: background 0.2s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 6px;
                            ">
                                <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                <span>ট্যাপ করে নম্বর কপি করুন</span>
                            </button>
                        </div>

                        <p style="font-size:12px; color:#94a3b8; line-height:1.45; margin:0 0 14px 0;">
                            উপরের নম্বরে Send Money সম্পন্ন করার পর নিচের ফর্মটি পূরণ করে সাবমিট করুন। অ্যাডমিন যাচাই করে কনফার্ম করলে আপনার প্রোফাইলে যুক্ত হবে:
                        </p>

                        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">
                            <div>
                                <label style="display:block; font-size:11.5px; color:#cbd5e1; margin-bottom:4px; font-weight:700;">যে নম্বর থেকে টাকা পাঠিয়েছেন (প্রেরকের নম্বর):</label>
                                <input type="tel" id="donation-input-sender" placeholder="যেমন: 017xxxxxxxx" style="
                                    width: 100%;
                                    box-sizing: border-box;
                                    padding: 10px 12px;
                                    background: #020617;
                                    border: 1px solid #334155;
                                    border-radius: 8px;
                                    color: #fff;
                                    font-size: 13px;
                                    outline: none;
                                ">
                            </div>

                            <div>
                                <label style="display:block; font-size:11.5px; color:#cbd5e1; margin-bottom:4px; font-weight:700;">টাকার পরিমাণ (৳):</label>
                                <input type="number" id="donation-input-amount" placeholder="যেমন: 100, 200, 500" style="
                                    width: 100%;
                                    box-sizing: border-box;
                                    padding: 10px 12px;
                                    background: #020617;
                                    border: 1px solid #334155;
                                    border-radius: 8px;
                                    color: #fff;
                                    font-size: 13px;
                                    outline: none;
                                ">
                            </div>

                            <div>
                                <label style="display:block; font-size:11.5px; color:#cbd5e1; margin-bottom:4px; font-weight:700;">ট্রানজ্যাকশন আইডি (TrxID):</label>
                                <input type="text" id="donation-input-trxid" placeholder="যেমন: BLA892XXXX" style="
                                    width: 100%;
                                    box-sizing: border-box;
                                    padding: 10px 12px;
                                    background: #020617;
                                    border: 1px solid #334155;
                                    border-radius: 8px;
                                    color: #fff;
                                    font-size: 13px;
                                    outline: none;
                                ">
                            </div>
                        </div>

                        <div id="donation-form-error" style="display:none; color:#f87171; font-size:11.5px; margin-bottom:10px; line-height:1.4;"></div>

                        <button id="btn-donation-submit-trx" style="
                            width: 100%;
                            padding: 13px;
                            background: #10b981;
                            color: #042f2e;
                            border: none;
                            border-radius: 10px;
                            font-size: 13.5px;
                            font-weight: 800;
                            cursor: pointer;
                        ">সাবমিট করুন</button>
                    </div>

                    <!-- ভিউ ৪: পেন্ডিং কনফার্মেশন স্ক্রিন -->
                    <div id="donation-view-success" style="display:none; text-align:center; padding:8px 0;">
                        <div style="
                            width: 54px;
                            height: 54px;
                            border-radius: 50%;
                            background: rgba(251, 191, 36, 0.16);
                            border: 2px solid #fbbf24;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 14px auto;
                            color: #fbbf24;
                            font-size: 24px;
                            font-weight: bold;
                        ">&#9203;</div>

                        <h3 style="font-size:17px; font-weight:800; color:#fbbf24; margin:0 0 10px 0;">অনুরোধ পাঠানো হয়েছে (পর্যালোচনায় আছে)</h3>
                        <p style="font-size:12.5px; color:#cbd5e1; line-height:1.6; margin:0 0 16px 0;">
                            আপনার হাদিয়ার তথ্য অ্যাডমিনের কাছে পাঠানো হয়েছে। টাকা প্রাপ্তি যাচাই করে অ্যাডমিন কনফার্ম করা মাত্রই এটি আপনার প্রোফাইলে যুক্ত হয়ে যাবে।
                        </p>

                        <div id="donation-success-summary" style="
                            background: #020617;
                            border: 1px solid #334155;
                            border-radius: 10px;
                            padding: 12px;
                            font-size: 12px;
                            color: #cbd5e1;
                            margin-bottom: 18px;
                            line-height: 1.6;
                            text-align: left;
                        "></div>

                        <button id="btn-donation-success-close" style="
                            width: 100%;
                            padding: 12px;
                            background: #1e293b;
                            color: #fff;
                            border: 1px solid #475569;
                            border-radius: 10px;
                            font-size: 13px;
                            font-weight: 700;
                            cursor: pointer;
                        ">ঠিক আছে / বন্ধ করুন</button>
                    </div>

                    <!-- ভিউ ৫: "টাকা দিয়েছি / নম্বর দিয়ে যাচাই ও প্রোফাইলে যোগ করুন" -->
                    <div id="donation-view-verify" style="display:none;">
                        <!-- ধাপ ১: প্রেরকের মোবাইল নম্বর ইনপুট -->
                        <div id="donation-verify-step-phone">
                            <p style="font-size:13px; color:#cbd5e1; line-height:1.55; margin:0 0 14px 0;">
                                আপনি পূর্বে যে মোবাইল নম্বর থেকে হাদিয়া পাঠিয়েছিলেন, নিচে সেই নম্বরটি লিখুন:
                            </p>

                            <label style="display:block; font-size:11.5px; color:#94a3b8; margin-bottom:6px; font-weight:700;">প্রেরকের মোবাইল নম্বর:</label>
                            <input type="tel" id="donation-verify-phone-input" placeholder="যেমন: 017xxxxxxxx" style="
                                width: 100%;
                                box-sizing: border-box;
                                padding: 12px 14px;
                                background: #020617;
                                border: 1.5px solid #334155;
                                border-radius: 10px;
                                color: #fff;
                                font-size: 15px;
                                letter-spacing: 0.8px;
                                outline: none;
                                margin-bottom: 10px;
                            ">

                            <div id="donation-verify-phone-error" style="display:none; color:#f87171; font-size:12px; margin-bottom:10px; line-height:1.4;"></div>

                            <button id="btn-donation-verify-next" style="
                                width: 100%;
                                padding: 13px;
                                background: #0284c7;
                                color: #ffffff;
                                border: none;
                                border-radius: 10px;
                                font-size: 14px;
                                font-weight: 800;
                                cursor: pointer;
                            ">পরবর্তী ধাপ &rarr;</button>
                        </div>

                        <!-- ধাপ ২: বিকাশ বা নগদ নির্বাচন ও এন্টার -->
                        <div id="donation-verify-step-method" style="display:none;">
                            <div style="
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                background: #1e293b;
                                border: 1px solid #334155;
                                border-radius: 10px;
                                padding: 10px 12px;
                                margin-bottom: 14px;
                            ">
                                <span style="font-size:12.5px; color:#cbd5e1;">নম্বর: <strong id="donation-verify-phone-badge" style="color:#38bdf8; font-family:monospace;"></strong></span>
                                <button id="btn-donation-verify-edit-phone" style="background:transparent; border:none; color:#38bdf8; font-size:12px; font-weight:700; cursor:pointer; text-decoration:underline;">পরিবর্তন</button>
                            </div>

                            <p style="font-size:13px; color:#cbd5e1; margin:0 0 14px 0; line-height:1.45; text-align:center;">
                                কোন মাধ্যমে টাকা দিয়েছিলেন তা নির্বাচন করে এন্টার দিন:
                            </p>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px;">
                                <div class="donation-verify-method-card" data-verify-method="bkash" style="
                                    background: linear-gradient(145deg, #1e293b, #0f172a);
                                    border: 1.5px solid rgba(226, 19, 110, 0.35);
                                    border-radius: 16px;
                                    padding: 16px 8px;
                                    cursor: pointer;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    gap: 10px;
                                    transition: all 0.2s;
                                ">
                                    <div style="width:56px; height:56px; border-radius:50%; overflow:hidden; background:#e2136e; display:flex; align-items:center; justify-content:center; border:2px solid rgba(255,255,255,0.2);">
                                        <img src="assets/bkash-logo.png" alt="bKash" style="width:100%; height:100%; object-fit:cover;" />
                                    </div>
                                    <span style="font-size:15px; font-weight:800; color:#fff;">বিকাশ</span>
                                </div>

                                <div class="donation-verify-method-card" data-verify-method="nagad" style="
                                    background: linear-gradient(145deg, #1e293b, #0f172a);
                                    border: 1.5px solid rgba(247, 148, 29, 0.35);
                                    border-radius: 16px;
                                    padding: 16px 8px;
                                    cursor: pointer;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    gap: 10px;
                                    transition: all 0.2s;
                                ">
                                    <div style="width:56px; height:56px; border-radius:50%; overflow:hidden; background:#ffffff; display:flex; align-items:center; justify-content:center; border:2px solid rgba(255,255,255,0.2);">
                                        <img src="assets/nagad-logo.png" alt="Nagad" style="width:100%; height:100%; object-fit:cover;" />
                                    </div>
                                    <span style="font-size:15px; font-weight:800; color:#fff;">নগদ</span>
                                </div>
                            </div>

                            <div id="donation-verify-result-box" style="display:none; border-radius:10px; padding:12px; font-size:12.5px; line-height:1.55; margin-bottom:14px;"></div>

                            <button id="btn-donation-verify-submit" style="
                                width: 100%;
                                padding: 13px;
                                background: #10b981;
                                color: #042f2e;
                                border: none;
                                border-radius: 10px;
                                font-size: 13.5px;
                                font-weight: 800;
                                cursor: pointer;
                                opacity: 0.6;
                            ">এন্টার / যাচাই ও যোগ করুন</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        bindModalEvents();
    }

    // ইভেন্ট লিসেনার সংযুক্তিকরণ
    function bindModalEvents() {
        const overlay = document.getElementById('donation-modal-overlay');
        const btnCloseX = document.getElementById('btn-donation-close-x');
        const btnBack = document.getElementById('btn-donation-back');
        const btnDonate = document.getElementById('btn-donation-action-donate');
        const btnOpenVerify = document.getElementById('btn-donation-action-verify');
        const btnMethodsToVerify = document.getElementById('btn-donation-methods-to-verify');
        const btnLater = document.getElementById('btn-donation-action-later');
        const btnCopy = document.getElementById('btn-donation-copy-num');
        const btnSubmit = document.getElementById('btn-donation-submit-trx');
        const btnSuccessClose = document.getElementById('btn-donation-success-close');

        const verifyPhoneInput = document.getElementById('donation-verify-phone-input');
        const btnVerifyNext = document.getElementById('btn-donation-verify-next');
        const btnVerifyEditPhone = document.getElementById('btn-donation-verify-edit-phone');
        const btnVerifySubmit = document.getElementById('btn-donation-verify-submit');

        function dismissModal() {
            if (overlay) overlay.style.display = 'none';
            const openCount = parseInt(localStorage.getItem('donation_open_count') || '0', 10);
            localStorage.setItem('donation_last_prompt_count', openCount.toString());
        }

        if (btnCloseX) btnCloseX.onclick = dismissModal;
        if (btnLater) btnLater.onclick = dismissModal;
        if (btnSuccessClose) btnSuccessClose.onclick = dismissModal;

        if (btnBack) {
            btnBack.onclick = () => {
                const viewForm = document.getElementById('donation-view-form');
                const viewVerify = document.getElementById('donation-view-verify');
                const stepMethod = document.getElementById('donation-verify-step-method');

                if (viewForm && viewForm.style.display !== 'none') {
                    showView('methods');
                } else if (viewVerify && viewVerify.style.display !== 'none' && stepMethod && stepMethod.style.display !== 'none') {
                    showVerifyPhoneStep();
                } else {
                    refreshIntroContent();
                    showView('intro');
                }
            };
        }

        if (btnDonate) {
            btnDonate.onclick = () => {
                showView('methods');
            };
        }

        if (btnOpenVerify) {
            btnOpenVerify.onclick = openVerifyFlow;
        }
        if (btnMethodsToVerify) {
            btnMethodsToVerify.onclick = openVerifyFlow;
        }

        document.querySelectorAll('.donation-method-btn').forEach(btn => {
            btn.onclick = () => {
                const method = btn.getAttribute('data-method');
                selectMethod(method);
            };
        });

        document.querySelectorAll('.donation-verify-method-card').forEach(card => {
            card.onclick = () => {
                selectVerifyMethod(card.getAttribute('data-verify-method'));
            };
        });

        if (btnVerifyNext) {
            btnVerifyNext.onclick = advanceToVerifyMethodStep;
        }
        if (verifyPhoneInput) {
            verifyPhoneInput.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    advanceToVerifyMethodStep();
                }
            });
        }
        if (btnVerifyEditPhone) {
            btnVerifyEditPhone.onclick = showVerifyPhoneStep;
        }
        if (btnVerifySubmit) {
            btnVerifySubmit.onclick = executeDonationVerify;
        }

        if (btnCopy) {
            btnCopy.onclick = () => {
                const numEl = document.getElementById('donation-card-number');
                if (numEl && numEl.innerText) {
                    const cleanNum = numEl.innerText.replace(/\s+/g, '');
                    navigator.clipboard.writeText(cleanNum).then(() => {
                        const labelSpan = btnCopy.querySelector('span');
                        const origText = labelSpan ? labelSpan.innerText : btnCopy.innerText;
                        if (labelSpan) labelSpan.innerText = "নম্বর কপি হয়েছে!";
                        else btnCopy.innerText = "নম্বর কপি হয়েছে!";
                        btnCopy.style.background = "#10b981";
                        setTimeout(() => {
                            if (labelSpan) labelSpan.innerText = origText;
                            else btnCopy.innerText = origText;
                            btnCopy.style.background = "#0284c7";
                        }, 2000);
                    }).catch(() => {
                        alert("নম্বর: " + cleanNum);
                    });
                }
            };
        }

        if (btnSubmit) {
            btnSubmit.onclick = handleDonationSubmit;
        }
    }

    // ভিউ পরিবর্তন লজিক
    function showView(viewName) {
        const viewIntro = document.getElementById('donation-view-intro');
        const viewMethods = document.getElementById('donation-view-methods');
        const viewForm = document.getElementById('donation-view-form');
        const viewSuccess = document.getElementById('donation-view-success');
        const viewVerify = document.getElementById('donation-view-verify');
        const btnBack = document.getElementById('btn-donation-back');
        const headerTitle = document.getElementById('donation-modal-header-title');

        if (viewIntro) viewIntro.style.display = 'none';
        if (viewMethods) viewMethods.style.display = 'none';
        if (viewForm) viewForm.style.display = 'none';
        if (viewSuccess) viewSuccess.style.display = 'none';
        if (viewVerify) viewVerify.style.display = 'none';

        if (viewName === 'intro') {
            if (viewIntro) viewIntro.style.display = 'block';
            if (btnBack) btnBack.style.display = 'none';
            if (headerTitle) headerTitle.innerText = "অ্যাপ পরিচালনায় হাদিয়া";
        } else if (viewName === 'methods') {
            if (viewMethods) viewMethods.style.display = 'block';
            if (btnBack) btnBack.style.display = 'inline-block';
            if (headerTitle) headerTitle.innerText = "পেমেন্ট মাধ্যম বেছে নিন";
        } else if (viewName === 'form') {
            if (viewForm) viewForm.style.display = 'block';
            if (btnBack) btnBack.style.display = 'inline-block';
        } else if (viewName === 'success') {
            if (viewSuccess) viewSuccess.style.display = 'block';
            if (btnBack) btnBack.style.display = 'none';
            if (headerTitle) headerTitle.innerText = "অ্যাডমিন কনফার্মেশন অপেক্ষমাণ";
        } else if (viewName === 'verify') {
            if (viewVerify) viewVerify.style.display = 'block';
            if (btnBack) btnBack.style.display = 'inline-block';
            if (headerTitle) headerTitle.innerText = "নম্বর দিয়ে হাদিয়া যাচাই";
        }
    }

    function openVerifyFlow() {
        currentVerifyPhone = '';
        currentVerifyMethod = null;
        const phoneInput = document.getElementById('donation-verify-phone-input');
        if (phoneInput) phoneInput.value = '';
        showVerifyPhoneStep();
        showView('verify');
        setTimeout(() => {
            const inp = document.getElementById('donation-verify-phone-input');
            if (inp) inp.focus();
        }, 50);
    }

    function showVerifyPhoneStep() {
        const stepPhone = document.getElementById('donation-verify-step-phone');
        const stepMethod = document.getElementById('donation-verify-step-method');
        const errEl = document.getElementById('donation-verify-phone-error');
        if (stepPhone) stepPhone.style.display = 'block';
        if (stepMethod) stepMethod.style.display = 'none';
        if (errEl) errEl.style.display = 'none';
    }

    function advanceToVerifyMethodStep() {
        const phoneInput = document.getElementById('donation-verify-phone-input');
        const errEl = document.getElementById('donation-verify-phone-error');
        const raw = phoneInput ? phoneInput.value.trim() : '';
        const norm = normalizeBdPhone(raw);

        if (!isValidBdPhone(norm)) {
            if (errEl) {
                errEl.innerText = "অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন (যেমন: 017xxxxxxxx)।";
                errEl.style.display = 'block';
            }
            if (phoneInput) phoneInput.focus();
            return;
        }

        if (errEl) errEl.style.display = 'none';
        currentVerifyPhone = norm;
        currentVerifyMethod = null;

        const badge = document.getElementById('donation-verify-phone-badge');
        if (badge) badge.innerText = norm;

        const resBox = document.getElementById('donation-verify-result-box');
        if (resBox) resBox.style.display = 'none';

        document.querySelectorAll('.donation-verify-method-card').forEach(card => {
            const m = card.getAttribute('data-verify-method');
            card.style.borderColor = m === 'bkash' ? 'rgba(226, 19, 110, 0.35)' : 'rgba(247, 148, 29, 0.35)';
            card.style.boxShadow = 'none';
            card.style.transform = 'scale(1)';
        });

        const btnSubmit = document.getElementById('btn-donation-verify-submit');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'এন্টার / যাচাই ও যোগ করুন';
            btnSubmit.style.opacity = '0.6';
        }

        const stepPhone = document.getElementById('donation-verify-step-phone');
        const stepMethod = document.getElementById('donation-verify-step-method');
        if (stepPhone) stepPhone.style.display = 'none';
        if (stepMethod) stepMethod.style.display = 'block';
    }

    function selectVerifyMethod(method) {
        currentVerifyMethod = method;
        document.querySelectorAll('.donation-verify-method-card').forEach(card => {
            const m = card.getAttribute('data-verify-method');
            if (m === method) {
                card.style.borderColor = m === 'bkash' ? '#e2136e' : '#f7941d';
                card.style.boxShadow = m === 'bkash'
                    ? '0 0 16px rgba(226, 19, 110, 0.45)'
                    : '0 0 16px rgba(247, 148, 29, 0.45)';
                card.style.transform = 'scale(1.03)';
            } else {
                card.style.borderColor = 'rgba(148, 163, 184, 0.25)';
                card.style.boxShadow = 'none';
                card.style.transform = 'scale(0.98)';
            }
        });

        const resBox = document.getElementById('donation-verify-result-box');
        if (resBox) resBox.style.display = 'none';

        const btnSubmit = document.getElementById('btn-donation-verify-submit');
        if (btnSubmit) btnSubmit.style.opacity = '1';
    }

    async function executeDonationVerify() {
        const resBox = document.getElementById('donation-verify-result-box');
        const btnSubmit = document.getElementById('btn-donation-verify-submit');

        if (!currentVerifyPhone || !isValidBdPhone(currentVerifyPhone)) {
            showVerifyPhoneStep();
            return;
        }
        if (!currentVerifyMethod) {
            if (resBox) {
                resBox.style.display = 'block';
                resBox.style.background = 'rgba(248, 113, 113, 0.14)';
                resBox.style.border = '1px solid #f87171';
                resBox.style.color = '#fca5a5';
                resBox.innerHTML = 'অনুগ্রহ করে প্রথমে <strong>বিকাশ</strong> অথবা <strong>নগদ</strong> নির্বাচন করুন।';
            }
            return;
        }

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = 'ডাটাবেজে যাচাই হচ্ছে...';
        }
        if (resBox) resBox.style.display = 'none';

        try {
            const senderHash = await sha256Hex(currentVerifyPhone);
            const userKey = `don_${currentVerifyMethod}_${senderHash}`;
            const methodLabel = formatMethodLabel(currentVerifyMethod);

            // ১. প্রাইমারি কুয়েরি: unlock_requests থেকে এই নম্বর + মাধ্যমের অনুদান রেকর্ড আনা
            const url = `${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests?user_id=eq.${encodeURIComponent(userKey)}&select=id,status,reason,created_at,approved_at&order=created_at.desc`;
            const res = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            if (!res.ok) {
                throw new Error(`সার্ভার রেসপন্স ত্রুটি (${res.status})`);
            }

            const rows = await res.json();
            const recordMap = new Map();

            if (Array.isArray(rows)) {
                rows.forEach(r => {
                    const meta = parseDonationMeta(r);
                    if (meta) {
                        recordMap.set(r.id, {
                            id: r.id,
                            status: r.status,
                            amount: parseFloat(meta.amount) || 0,
                            methodLabel: meta.methodLabel || methodLabel,
                            methodCode: meta.method || currentVerifyMethod,
                            senderMasked: meta.senderMasked || maskPhone(currentVerifyPhone),
                            senderHash: meta.senderHash || senderHash,
                            trxMasked: meta.trxMasked || '',
                            createdAt: r.created_at,
                            approvedAt: r.approved_at
                        });
                    }
                });
            }

            // ২. ক্যানোনিকাল RPC (যদি মাইগ্রেশন চালানো থাকে, উভয় সোর্স মার্জ)
            try {
                const rpcRes = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/verify_donations_by_sender`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        p_sender_hash: senderHash,
                        p_method: currentVerifyMethod
                    })
                });
                if (rpcRes.ok) {
                    const rpcData = await rpcRes.json();
                    if (rpcData && rpcData.success && Array.isArray(rpcData.approved_items)) {
                        rpcData.approved_items.forEach(item => {
                            if (item && item.id && !recordMap.has(item.id) && Number(item.amount) > 0) {
                                recordMap.set(item.id, {
                                    id: item.id,
                                    status: 'approved',
                                    amount: parseFloat(item.amount) || 0,
                                    methodLabel: item.method || methodLabel,
                                    methodCode: currentVerifyMethod,
                                    senderMasked: maskPhone(currentVerifyPhone),
                                    senderHash: senderHash,
                                    trxMasked: '',
                                    createdAt: item.created_at,
                                    approvedAt: item.approved_at
                                });
                            }
                        });
                    }
                }
            } catch (_) {}

            const allRecords = Array.from(recordMap.values());
            const approvedRows = allRecords.filter(r => r.status === 'approved');
            const pendingRows = allRecords.filter(r => r.status === 'pending');
            const rejectedRows = allRecords.filter(r => r.status === 'rejected');

            const creditedIds = readJsonStorage('donation_credited_ids', []);
            let currentTotal = parseFloat(localStorage.getItem('donation_total_amount') || '0');
            if (isNaN(currentTotal) || currentTotal < 0) currentTotal = 0;

            const approvedTotalForPair = approvedRows.reduce((s, r) => s + r.amount, 0);
            const uncreditedApproved = approvedRows.filter(r => !creditedIds.includes(r.id));

            if (uncreditedApproved.length > 0) {
                let newlyAddedAmount = 0;
                const history = readJsonStorage('donation_history', []);
                const pendingList = readJsonStorage('donation_pending_list', []);

                uncreditedApproved.forEach(r => {
                    newlyAddedAmount += r.amount;
                    creditedIds.push(r.id);

                    const hIdx = history.findIndex(h => h.requestId === r.id);
                    if (hIdx >= 0) {
                        history[hIdx].status = 'approved';
                        history[hIdx].approvedAt = r.approvedAt || new Date().toISOString();
                    } else {
                        history.push({
                            requestId: r.id,
                            date: r.createdAt || new Date().toISOString(),
                            dateText: new Date(r.createdAt || Date.now()).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' }),
                            method: r.methodLabel,
                            methodCode: r.methodCode,
                            senderMasked: r.senderMasked,
                            senderHash: r.senderHash,
                            amount: r.amount,
                            trxId: r.trxMasked || 'Verified',
                            status: 'approved',
                            approvedAt: r.approvedAt || new Date().toISOString()
                        });
                    }
                });

                const newlyApprovedIdSet = new Set(uncreditedApproved.map(r => r.id));
                const filteredPending = pendingList.filter(p => !newlyApprovedIdSet.has(p.requestId));

                currentTotal += newlyAddedAmount;
                localStorage.setItem('donation_total_amount', currentTotal.toString());
                writeJsonStorage('donation_credited_ids', creditedIds);
                writeJsonStorage('donation_history', history);
                writeJsonStorage('donation_pending_list', filteredPending);
                updatePendingPollingState();

                if (window.updateSettingsDonationCard) {
                    window.updateSettingsDonationCard();
                }

                if (resBox) {
                    resBox.style.display = 'block';
                    resBox.style.background = 'rgba(16, 185, 129, 0.14)';
                    resBox.style.border = '1px solid #10b981';
                    resBox.style.color = '#6ee7b7';
                    resBox.innerHTML =
                        `<div><strong>✅ আলহামদুলিল্লাহ! পেমেন্ট যাচাই সফল হয়েছে।</strong></div>` +
                        `<div style="margin-top:6px;">• নতুন যোগ হয়েছে: <strong>৳${newlyAddedAmount}</strong> (${escapeHtml(methodLabel)})</div>` +
                        `<div>• এই নম্বর ও মাধ্যমে অনুমোদিত মোট: <strong>৳${approvedTotalForPair}</strong></div>` +
                        `<div>• আপনার প্রোফাইলে সর্বমোট অবদান: <strong>৳${currentTotal}</strong></div>`;
                }
            } else if (approvedRows.length > 0) {
                // সব অনুমোদিত আইডি ইতিমধ্যে creditedIds-এ আছে
                if (currentTotal === 0 && approvedTotalForPair > 0) {
                    currentTotal = approvedTotalForPair;
                    localStorage.setItem('donation_total_amount', currentTotal.toString());
                    if (window.updateSettingsDonationCard) window.updateSettingsDonationCard();
                }
                if (resBox) {
                    resBox.style.display = 'block';
                    resBox.style.background = 'rgba(56, 189, 248, 0.14)';
                    resBox.style.border = '1px solid #38bdf8';
                    resBox.style.color = '#7dd3fc';
                    resBox.innerHTML =
                        `<div><strong>ℹ️ ইতিমধ্যেই যুক্ত রয়েছে</strong></div>` +
                        `<div style="margin-top:6px;">${escapeHtml(currentVerifyPhone)} নম্বর ও ${escapeHtml(methodLabel)} মাধ্যমের অনুমোদিত <strong>৳${approvedTotalForPair}</strong> পূর্বেই আপনার প্রোফাইলে যুক্ত করা হয়েছে।</div>` +
                        `<div style="margin-top:4px;">বর্তমান মোট অবদান: <strong>৳${currentTotal}</strong></div>`;
                }
            } else if (pendingRows.length > 0) {
                const pendingAmt = pendingRows.reduce((s, r) => s + r.amount, 0);
                if (resBox) {
                    resBox.style.display = 'block';
                    resBox.style.background = 'rgba(251, 191, 36, 0.14)';
                    resBox.style.border = '1px solid #fbbf24';
                    resBox.style.color = '#fde68a';
                    resBox.innerHTML =
                        `<div><strong>⏳ অ্যাডমিন কনফার্মেশনের অপেক্ষায় আছে</strong></div>` +
                        `<div style="margin-top:6px;">এই নম্বর ও ${escapeHtml(methodLabel)} মাধ্যমে <strong>৳${pendingAmt}</strong>-এর আবেদন জমা রয়েছে, তবে অ্যাডমিন এখনো কনফার্ম করেননি। অনুমোদনের পর পুনরায় যাচাই করুন।</div>`;
                }
            } else {
                const rejNote = rejectedRows.length > 0
                    ? `<div style="margin-top:6px; font-size:11.5px; opacity:0.9;">(দ্রষ্টব্য: এই নম্বরের পূর্বের একটি আবেদন অ্যাডমিন কর্তৃক বাতিল অবস্থায় রয়েছে।)</div>`
                    : '';
                if (resBox) {
                    resBox.style.display = 'block';
                    resBox.style.background = 'rgba(248, 113, 113, 0.14)';
                    resBox.style.border = '1px solid #f87171';
                    resBox.style.color = '#fca5a5';
                    resBox.innerHTML =
                        `<div><strong>❌ কোনো অনুমোদিত পেমেন্ট পাওয়া যায়নি</strong></div>` +
                        `<div style="margin-top:6px;"><code>${escapeHtml(currentVerifyPhone)}</code> নম্বর এবং <strong>${escapeHtml(methodLabel)}</strong> মাধ্যমে ডাটাবেজে কোনো অনুমোদিত হাদিয়া পাওয়া যায়নি। তাই প্রোফাইলে কোনো টাকা যোগ করা হয়নি।</div>` +
                        rejNote;
                }
            }
        } catch (err) {
            if (resBox) {
                resBox.style.display = 'block';
                resBox.style.background = 'rgba(248, 113, 113, 0.14)';
                resBox.style.border = '1px solid #f87171';
                resBox.style.color = '#fca5a5';
                resBox.innerHTML = `<strong>সংযোগ সমস্যা:</strong> ডাটাবেজ যাচাই করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।`;
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'এন্টার / যাচাই ও যোগ করুন';
            }
        }
    }

    // মেথড নির্বাচন ও কার্ড রেন্ডার
    function selectMethod(method) {
        currentSelectedMethod = method;
        const cardTitle = document.getElementById('donation-card-title');
        const cardNumber = document.getElementById('donation-card-number');
        const headerTitle = document.getElementById('donation-modal-header-title');

        let name = "বিকাশ (Personal)";
        let num = activeConfig.bkash_number || "01773622548";

        const logoBadge = document.getElementById('donation-card-logo-badge');

        if (method === 'nagad') {
            name = "নগদ (Personal)";
            num = activeConfig.nagad_number || "01773622548";
            if (logoBadge) {
                logoBadge.innerHTML = `
                    <div style="width:60px; height:60px; border-radius:50%; overflow:hidden; background:#ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(247,148,29,0.45); border:2px solid rgba(255,255,255,0.25);">
                        <img src="assets/nagad-logo.png" alt="Nagad" style="width:100%; height:100%; object-fit:cover;" />
                    </div>
                `;
            }
        } else {
            if (logoBadge) {
                logoBadge.innerHTML = `
                    <div style="width:60px; height:60px; border-radius:50%; overflow:hidden; background:#e2136e; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(226,19,110,0.45); border:2px solid rgba(255,255,255,0.25);">
                        <img src="assets/bkash-logo.png" alt="bKash" style="width:100%; height:100%; object-fit:cover;" />
                    </div>
                `;
            }
        }

        if (cardTitle) cardTitle.innerText = name + " - Send Money";
        if (cardNumber) cardNumber.innerText = num;
        if (headerTitle) headerTitle.innerText = name;

        const senderInput = document.getElementById('donation-input-sender');
        const amountInput = document.getElementById('donation-input-amount');
        const trxInput = document.getElementById('donation-input-trxid');
        const errEl = document.getElementById('donation-form-error');

        if (senderInput) senderInput.value = '';
        if (amountInput) amountInput.value = '';
        if (trxInput) trxInput.value = '';
        if (errEl) errEl.style.display = 'none';

        showView('form');
    }

    // ট্রানজ্যাকশন সাবমিট হ্যান্ডলার (অ্যাডমিন কনফার্মেশনের আগে প্রোফাইলে টাকা যোগ হবে না)
    async function handleDonationSubmit() {
        const senderInput = document.getElementById('donation-input-sender');
        const amountInput = document.getElementById('donation-input-amount');
        const trxInput = document.getElementById('donation-input-trxid');
        const errEl = document.getElementById('donation-form-error');
        const btnSubmit = document.getElementById('btn-donation-submit-trx');

        const rawSender = senderInput ? senderInput.value.trim() : '';
        const normSender = normalizeBdPhone(rawSender);
        const rawAmt = amountInput ? String(amountInput.value).replace(/[০-৯]/g, d => String(d.charCodeAt(0) - 0x09e6)) : '0';
        const amountVal = parseFloat(rawAmt);
        const trxId = trxInput ? trxInput.value.trim() : '';

        if (!isValidBdPhone(normSender)) {
            if (errEl) {
                errEl.innerText = "অনুগ্রহ করে সঠিক ১১ ডিজিটের প্রেরক মোবাইল নম্বর লিখুন (যেমন: 017xxxxxxxx)।";
                errEl.style.display = "block";
            }
            if (senderInput) senderInput.focus();
            return;
        }

        if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
            if (errEl) {
                errEl.innerText = "অনুগ্রহ করে প্রেরিত টাকার সঠিক পরিমাণ লিখুন।";
                errEl.style.display = "block";
            }
            if (amountInput) amountInput.focus();
            return;
        }

        if (errEl) errEl.style.display = "none";
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = "অ্যাডমিনের কাছে পাঠানো হচ্ছে...";
        }

        const methodCode = (currentSelectedMethod === 'nagad') ? 'nagad' : 'bkash';
        const methodName = formatMethodLabel(methodCode);
        const nowIso = new Date().toISOString();
        const dateStr = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });

        try {
            const devId = await getClientDeviceId();
            const senderHash = await sha256Hex(normSender);
            const senderMasked = maskPhone(normSender);

            // ১. Supabase-এ পেন্ডিং ভেরিফিকেশন রিকোয়েস্ট তৈরি করা (এখনও অনুমোদিত নয়)
            const requestId = await createDonationVerificationRequest({
                devId,
                methodCode,
                methodLabel: methodName,
                senderHash,
                senderMasked,
                amountVal,
                trxId,
                nowIso
            });

            // ২. ক্যানোনিকাল donations টেবিলে ব্যাকআপ সংরক্ষণ (PII রোধে কেবল হ্যাশ)
            recordDonationToSupabase({
                method: methodName,
                sender: senderHash,
                amount: amountVal,
                trx_id: trxId ? `${trxId} [REQ:${requestId}]` : `REQ:${requestId}`,
                created_at: nowIso,
                total_user_donated: 0
            });

            // ৩. টেলিগ্রাম অ্যাডমিন নোটিফিকেশন + [ ✅ কনফার্ম করুন ] / [ ❌ বাতিল করুন ] বাটন
            const telegramMessage =
                `💰 <b>নতুন হাদিয়া / অনুদান কনফার্মেশন অনুরোধ!</b>\n\n` +
                `💳 <b>মাধ্যম:</b> ${escapeHtml(methodName)}\n` +
                `📱 <b>প্রেরক নম্বর:</b> <code>${escapeHtml(normSender)}</code>\n` +
                `💵 <b>টাকার পরিমাণ:</b> ৳${amountVal}\n` +
                `🧾 <b>TrxID:</b> <code>${escapeHtml(trxId || 'দেওয়া হয়নি')}</code>\n` +
                `🆔 <b>Device ID:</b> <code>${escapeHtml(devId)}</code>\n` +
                `🕒 <b>তারিখ:</b> ${escapeHtml(dateStr)}\n` +
                `📌 <b>বর্তমান স্ট্যাটাস:</b> ⏳ অ্যাডমিন কনফার্মেশনের অপেক্ষায়\n\n` +
                `<i>বিকাশ/নগদ মেসেজ যাচাই করে নিচের বাটনে চাপ দিন:</i>`;

            await sendTelegramConfirmationRequest(telegramMessage, requestId);

            // ৪. লোকালে শুধুমাত্র 'pending' হিসেবে সংরক্ষণ — প্রোফাইলের মোট অনুদান (donation_total_amount) এখনি বাড়বে না!
            const pendingList = readJsonStorage('donation_pending_list', []);
            pendingList.push({
                requestId,
                method: methodCode,
                methodLabel: methodName,
                senderMasked,
                senderHash,
                amount: amountVal,
                trxId: trxId || 'N/A',
                createdAt: nowIso,
                status: 'pending'
            });
            writeJsonStorage('donation_pending_list', pendingList);

            const history = readJsonStorage('donation_history', []);
            history.push({
                requestId,
                date: nowIso,
                dateText: dateStr,
                method: methodName,
                methodCode,
                senderMasked,
                senderHash,
                amount: amountVal,
                trxId: trxId || 'N/A',
                status: 'pending'
            });
            writeJsonStorage('donation_history', history);

            // প্রম্পট কাউন্টার রিসেট যাতে অপ্রয়োজনে ডায়ালগ না আসে
            const openCount = parseInt(localStorage.getItem('donation_open_count') || '0', 10);
            localStorage.setItem('donation_last_prompt_count', openCount.toString());

            updatePendingPollingState();

            if (window.updateSettingsDonationCard) {
                window.updateSettingsDonationCard();
            }

            const currentVerifiedTotal = parseFloat(localStorage.getItem('donation_total_amount') || '0') || 0;
            const summaryEl = document.getElementById('donation-success-summary');
            if (summaryEl) {
                summaryEl.innerHTML =
                    `<div><strong>জমাকৃত পরিমাণ:</strong> ৳${amountVal} (${escapeHtml(methodName)})</div>` +
                    `<div style="margin-top:4px;"><strong>প্রেরক নম্বর:</strong> <code>${escapeHtml(normSender)}</code></div>` +
                    `<div style="margin-top:4px;"><strong>স্ট্যাটাস:</strong> <span style="color:#fbbf24; font-weight:700;">⏳ অ্যাডমিন কনফার্মেশনের অপেক্ষায়</span></div>` +
                    `<div style="margin-top:4px;"><strong>প্রোফাইলে বর্তমান অনুমোদিত মোট:</strong> ৳${currentVerifiedTotal}</div>`;
            }

            showView('success');
        } catch (err) {
            console.error('Donation submit error:', err);
            if (errEl) {
                errEl.innerText = "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।";
                errEl.style.display = "block";
            }
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "সাবমিট করুন";
            }
        }
    }

    function refreshIntroContent() {
        const badgeContainer = document.getElementById('donation-badge-container');
        const pendingContainer = document.getElementById('donation-pending-container');
        const introText = document.getElementById('donation-intro-text');
        const btnDonate = document.getElementById('btn-donation-action-donate');

        const totalDonated = parseFloat(localStorage.getItem('donation_total_amount') || '0') || 0;
        const pendingList = readJsonStorage('donation_pending_list', []);

        if (totalDonated > 0) {
            if (badgeContainer) {
                badgeContainer.innerHTML = `
                    <span style="
                        background: rgba(16, 185, 129, 0.15);
                        border: 1px solid #10b981;
                        color: #34d399;
                        padding: 4px 10px;
                        border-radius: 8px;
                        font-size: 11px;
                        font-weight: 800;
                    ">সহযোগী ডোনার (অনুমোদিত মোট: ৳${totalDonated})</span>
                `;
            }
            if (introText) {
                introText.innerText = `জাযাকাল্লাহু খাইরান! আপনি ইতিপূর্বে অ্যাপসের উন্নতির জন্য মোট ৳${totalDonated} হাদিয়া পাঠিয়ে আমাদের পাশে দাঁড়িয়েছিলেন। অ্যাপসের চলমান সার্ভার ও নতুন ফিচার উন্নয়ন অব্যাহত রাখতে আপনি চাইলে আবারও সামর্থ্য অনুযায়ী হাদিয়া পাঠাতে পারেন।`;
            }
            if (btnDonate) btnDonate.innerText = "আবারও হাদিয়া দিন";
        } else {
            if (badgeContainer) {
                badgeContainer.innerHTML = `
                    <span style="
                        background: rgba(14, 165, 233, 0.15);
                        border: 1px solid #0284c7;
                        color: #38bdf8;
                        padding: 4px 10px;
                        border-radius: 8px;
                        font-size: 11px;
                        font-weight: 800;
                    ">স্বেচ্ছাসেবী অনুদান</span>
                `;
            }
            if (introText) {
                introText.innerText = "এই অ্যাপটি সম্পূর্ণ বিজ্ঞাপনমুক্ত এবং আপনার খেদমতে সম্পূর্ণ ফ্রিতে উন্মুক্ত রাখা হয়েছে। এর ব্যাকএন্ড সার্ভার এবং নিয়মিত উন্নয়ন কার্যক্রম সচল রাখতে আপনার আন্তরিক হাদিয়া বা অনুদান আমাদের জন্য অনেক বড় সহায়ক হবে।";
            }
            if (btnDonate) btnDonate.innerText = "ডোনেট করুন";
        }

        if (pendingContainer) {
            if (pendingList.length > 0) {
                const pendingSum = pendingList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                const itemsHtml = pendingList.slice(-2).map(p =>
                    `<div style="margin-top:4px; font-size:11.5px; color:#fef08a;">• ৳${p.amount} (${escapeHtml(p.methodLabel || '')}) — ${escapeHtml(p.senderMasked || '')}</div>`
                ).join('');
                pendingContainer.style.display = 'block';
                pendingContainer.innerHTML = `
                    <div style="
                        background: rgba(251, 191, 36, 0.12);
                        border: 1px solid rgba(251, 191, 36, 0.45);
                        border-radius: 12px;
                        padding: 10px 12px;
                    ">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <span style="font-size:12px; font-weight:800; color:#fbbf24;">⏳ পর্যালোচনায় আছে (মোট: ৳${pendingSum})</span>
                            <button id="btn-donation-refresh-pending" style="
                                background: rgba(251, 191, 36, 0.2);
                                border: 1px solid rgba(251, 191, 36, 0.5);
                                color: #fde68a;
                                font-size: 11px;
                                font-weight: 700;
                                padding: 4px 8px;
                                border-radius: 6px;
                                cursor: pointer;
                            ">রিফ্রেশ করুন</button>
                        </div>
                        ${itemsHtml}
                        <div style="margin-top:5px; font-size:11px; color:#cbd5e1;">অ্যাডমিন কনফার্ম করলে স্বয়ংক্রিয়ভাবে প্রোফাইলে যুক্ত হবে।</div>
                    </div>
                `;
                const btnRefresh = document.getElementById('btn-donation-refresh-pending');
                if (btnRefresh) {
                    btnRefresh.onclick = async () => {
                        btnRefresh.disabled = true;
                        btnRefresh.innerText = 'চেক হচ্ছে...';
                        await syncPendingDonations(true);
                        refreshIntroContent();
                    };
                }
            } else {
                pendingContainer.style.display = 'none';
                pendingContainer.innerHTML = '';
            }
        }
    }

    // ডায়ালগ ওপেন করা
    function showDonationModal() {
        ensureModalDOMElements();
        refreshIntroContent();
        showView('intro');
        const overlay = document.getElementById('donation-modal-overlay');
        if (overlay) overlay.style.display = 'flex';
        syncPendingDonations(false);
    }

    // গ্লোবাল অ্যাক্সেস
    window.openDonationModal = function() {
        showDonationModal();
    };

    window.openDonationVerifyModal = function() {
        ensureModalDOMElements();
        const overlay = document.getElementById('donation-modal-overlay');
        if (overlay) overlay.style.display = 'flex';
        openVerifyFlow();
    };

    window.trackDonationAppOpen = function() {
        trackAppOpen();
    };

    window.triggerDonationSync = function(force) {
        return syncPendingDonations(Boolean(force));
    };

    window.getDonationStats = function() {
        return {
            totalDonated: parseFloat(localStorage.getItem('donation_total_amount') || '0') || 0,
            pendingList: readJsonStorage('donation_pending_list', []),
            openCount: parseInt(localStorage.getItem('donation_open_count') || '0', 10),
            history: readJsonStorage('donation_history', [])
        };
    };

    function initDonationSystem() {
        ensureModalDOMElements();
        fetchRemoteDonationConfig();
        trackAppOpen();
        updatePendingPollingState();
        setTimeout(() => syncPendingDonations(false), 1800);
    }

    // ১. কোল্ড স্টার্ট ইনিশিয়ালাইজেশন (রেডি স্টেট সেফগার্ডসহ)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDonationSystem);
    } else {
        initDonationSystem();
    }

    // ২. ওয়েবভিউ ভিজিবিলিটি ট্র্যাকিং
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            trackAppOpen();
            syncPendingDonations(false);
        }
    });

    // ৩. কর্ডোভা / ক্যাপাসিটর রিজিউম ইভেন্ট
    document.addEventListener('resume', () => {
        trackAppOpen();
        syncPendingDonations(false);
    });

    // ৪. উইন্ডো ফোকাস ইভেন্ট
    window.addEventListener('focus', () => {
        trackAppOpen();
    });

    // ৫. ক্যাপাসিটর অ্যাপ স্টেট প্লাগইন ইভেন্ট
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
                if (state && state.isActive) {
                    trackAppOpen();
                    syncPendingDonations(false);
                }
            });
        }
    } catch (e) {}

})();
