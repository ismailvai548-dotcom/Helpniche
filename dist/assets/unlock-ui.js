/* ==========================================================================
   FocusDurood Support & Live Unlock UI (Full & Stable Architecture)
   ========================================================================== */

(function () {
    // Security Vault: Masked dynamic credential resolver
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
    const _ENC_U_BYTES = [10,125,44,45,14,119,48,49,100,51,5,105,33];

    const TELEGRAM_BOT_USERNAME = _resolveSecVal(_ENC_U_BYTES);
    const TELEGRAM_BOT_TOKEN = _resolveSecVal(_ENC_T_BYTES);
    const ADMIN_CHAT_ID = _resolveSecVal(_ENC_A_BYTES);
    const SUPABASE_PROJECT_URL = "https://dlxmzzvcpoysoouakadt.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzA3NDEsImV4cCI6MjA5MzcwNjc0MX0.iXQRyqevSoRXvpUG291OFr4bzQq6yEoN6lXvikoJK5g";

    let currentDeviceId = '';
    let appFirstInstallTime = 0;
    let isSessionCurrentlyActive = false;
    let skipMissingRemoteRpc = false;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUnlockUI);
    } else {
        initUnlockUI();
    }

    function getPlugin() {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin) {
            return window.Capacitor.Plugins.UnlockPlugin;
        }
        return null;
    }

    // অ্যাডমিনকে সরাসরি টেলিগ্রাম নোটিফিকেশন পাঠানোর ফাংশন
    async function notifyTelegramAdmin(htmlText) {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_CHAT_ID,
                    text: htmlText,
                    parse_mode: 'HTML'
                })
            });
        } catch (e) {
            console.error("Telegram admin notify failed:", e);
        }
    }

    async function initUnlockUI() {
        injectStyles();
        createTimerBanner();
        createModal();

        const plugin = getPlugin();
        if (plugin && plugin.getDeviceId) {
            try {
                const res = await plugin.getDeviceId();
                if (res && res.deviceId) {
                    currentDeviceId = res.deviceId.trim().toLowerCase();

                    let localInstall = Number(res.firstInstallTime) || 0;
                    if (!localInstall) {
                        localInstall = parseInt(localStorage.getItem('unlock_local_install_ms') || '0', 10) || Date.now();
                        localStorage.setItem('unlock_local_install_ms', String(localInstall));
                    }
                    appFirstInstallTime = localInstall;

                    // নতুন ইনস্টলেশন হলে পুরনো লোকাল সিঙ্ক কী রিসেট করা
                    const savedPkgInstall = localStorage.getItem('unlock_pkg_install_ms');
                    if (savedPkgInstall !== String(appFirstInstallTime)) {
                        localStorage.setItem('unlock_pkg_install_ms', String(appFirstInstallTime));
                        localStorage.removeItem('last_handled_remote_unlock_id');
                        localStorage.removeItem('last_handled_remote_approved_at');
                        localStorage.removeItem('unlock_server_install_ms');
                        localStorage.removeItem('unlock_device_registered_install');
                        lastHandledUnlockId = '';
                        lastHandledApprovedAt = '';
                    }

                    const deviceEl = document.getElementById('unlock-device-id-display');
                    if (deviceEl) deviceEl.innerText = currentDeviceId;
                    autoRegisterDevice(currentDeviceId);
                }
            } catch (e) {
                console.error('Error fetching device ID:', e);
            }
        }

        checkUnlockStatus();
        setInterval(checkUnlockStatus, 2000);
    }

    function resolveServerInstallMs(serverNowMs) {
        const cached = parseInt(localStorage.getItem('unlock_server_install_ms') || '0', 10) || 0;
        if (cached > 0) return cached;
        if (serverNowMs > 0) {
            const elapsedSinceInstall = appFirstInstallTime > 0 ? Math.max(0, Date.now() - appFirstInstallTime) : 0;
            const computed = Math.max(0, serverNowMs - elapsedSinceInstall);
            localStorage.setItem('unlock_server_install_ms', String(computed));
            return computed;
        }
        return appFirstInstallTime || Date.now();
    }

    async function autoRegisterDevice(devId) {
        if (!devId) return;
        const installMarker = String(appFirstInstallTime || '1');
        if (localStorage.getItem('unlock_device_registered_install') === installMarker) {
            return;
        }
        try {
            const devName = (navigator.userAgent.includes('Android') ? 'Android Device' : (navigator.userAgent.slice(0, 30) || 'Device'));
            const regRes = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    device_id: devId.trim().toLowerCase(),
                    device_name: devName,
                    status: 'pending',
                    reason: 'app_launch',
                    user_id: 'device_' + devId.trim().toLowerCase()
                })
            });
            if (regRes && regRes.ok) {
                const dateHdr = regRes.headers?.get?.('date');
                const srvNow = dateHdr ? new Date(dateHdr).getTime() : 0;
                if (srvNow > 0 && !isNaN(srvNow)) {
                    resolveServerInstallMs(srvNow);
                }
                localStorage.setItem('unlock_device_registered_install', installMarker);
            }
        } catch (e) {
            console.log("Device auto-registration note:", e);
        }
    }

    let isCheckingRemote = false;
    let lastHandledUnlockId = localStorage.getItem('last_handled_remote_unlock_id') || '';
    let lastHandledApprovedAt = localStorage.getItem('last_handled_remote_approved_at') || '';

    async function batchConsumeRemoteRows(rowIds, reasonTag) {
        const cleanIds = (rowIds || []).map(id => String(id || '').trim()).filter(Boolean);
        if (cleanIds.length === 0) return;
        try {
            await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests?id=in.(${cleanIds.join(',')})&status=eq.approved`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: 'pending',
                    reason: reasonTag || 'remote_unlocked_consumed'
                })
            });
        } catch (_) {}
    }

    async function checkRemoteApproval() {
        if (isCheckingRemote || !currentDeviceId) return;
        isCheckingRemote = true;
        try {
            // ১. অটোমিক আরপিসি কল দিয়ে রিমোট অনুমোদন যাচাই ও কনজিউম করা (যদি সার্ভার-সাইডে সক্রিয় থাকে)
            if (!skipMissingRemoteRpc) {
                const rpcRes = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/check_and_consume_remote_unlock`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        p_device_id: currentDeviceId
                    })
                }).catch(() => null);

                if (rpcRes && rpcRes.status === 404) {
                    skipMissingRemoteRpc = true;
                } else if (rpcRes && rpcRes.ok) {
                    const data = await rpcRes.json();
                    if (data && data.success) {
                        const dateHdr = rpcRes.headers?.get?.('date');
                        const serverNowMs = (dateHdr && !isNaN(new Date(dateHdr).getTime())) ? new Date(dateHdr).getTime() : Date.now();
                        const installCutoffMs = resolveServerInstallMs(serverNowMs) - 5000;

                        if (data.approved_at) {
                            const appMs = new Date(data.approved_at).getTime();
                            if (!isNaN(appMs) && appMs < installCutoffMs) {
                                return;
                            }
                        }

                        if (data.request_id && data.request_id === lastHandledUnlockId) {
                            return;
                        }
                        if (data.request_id) {
                            lastHandledUnlockId = data.request_id;
                            localStorage.setItem('last_handled_remote_unlock_id', data.request_id);
                        }
                        if (data.approved_at) {
                            lastHandledApprovedAt = data.approved_at;
                            localStorage.setItem('last_handled_remote_approved_at', data.approved_at);
                        }

                        const mins = data.duration_minutes || 5;
                        const plugin = getPlugin();
                        if (plugin?.setUnlockDuration) {
                            await plugin.setUnlockDuration({ minutes: mins });
                        }
                        const overlay = document.getElementById('unlock-modal-overlay');
                        if (overlay) overlay.style.display = 'none';

                        isSessionCurrentlyActive = true;
                        const durText = mins >= 52560000 ? 'স্থায়ীভাবে' : `${mins} মিনিটের জন্য`;
                        alert(`✅ অ্যাডমিন কর্তৃক আপনার অ্যাপটি দূর থেকে ${durText} সফলভাবে আনলক করা হয়েছে!`);
                        return;
                    }
                }
            }

            // ২. ফলব্যাক: সরাসরি রেস্ট কুয়েরি চেক (সর্বশেষ অনুমোদিত রিমোট আনলক আগে দেখা হবে)
            const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/unlock_requests?device_id=eq.${encodeURIComponent(currentDeviceId)}&status=eq.approved&select=id,reason,status,approved_at,created_at&order=approved_at.desc.nullslast,created_at.desc`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }).catch(() => null);

            if (res && res.ok) {
                const rows = await res.json();
                if (!Array.isArray(rows) || rows.length === 0) return;

                const remoteRows = rows.filter(r => r && typeof r.reason === 'string' && r.reason.startsWith('remote_unlock:'));
                if (remoteRows.length === 0) return;

                const dateHdr = res.headers?.get?.('date');
                const serverNowMs = (dateHdr && !isNaN(new Date(dateHdr).getTime())) ? new Date(dateHdr).getTime() : Date.now();
                const installCutoffMs = resolveServerInstallMs(serverNowMs) - 5000;

                const allRemoteIds = remoteRows.map(r => r.id).filter(Boolean);
                let validReq = null;
                let validMins = 5;

                for (const req of remoteRows) {
                    const mins = parseInt(req.reason.split(':')[1], 10) || 5;
                    const tsStr = req.approved_at || req.created_at;
                    const approvedMs = tsStr ? new Date(tsStr).getTime() : NaN;

                    if (isNaN(approvedMs)) continue;
                    // বর্তমান অ্যাপ ইনস্টল হওয়ার আগের কোনো পুরনো অ্যাপ্রুভাল হলে তা বাতিল/উপেক্ষা করা
                    if (approvedMs < installCutoffMs) continue;
                    // অনুমোদিত মেয়াদ ইতিমধ্যে শেষ হয়ে থাকলে উপেক্ষা করা
                    if ((serverNowMs - approvedMs) > (mins * 60 * 1000)) continue;
                    // একই অ্যাপ্রুভাল ইতিমধ্যে প্রসেস হয়ে থাকলে উপেক্ষা করা
                    if (req.id && req.id === lastHandledUnlockId) continue;
                    if (req.approved_at && req.approved_at === lastHandledApprovedAt) continue;

                    validReq = req;
                    validMins = mins;
                    break;
                }

                if (!validReq) {
                    // সব রিমোট রো পুরনো/প্রি-ইনস্টল/মেয়াদোত্তীর্ণ — ডাটাবেজে এগুলো কনজিউমড করে রাখা যাতে ভবিষ্যতে না আসে
                    await batchConsumeRemoteRows(allRemoteIds, 'remote_unlock_stale_consumed');
                    return;
                }

                if (validReq.id) {
                    lastHandledUnlockId = validReq.id;
                    localStorage.setItem('last_handled_remote_unlock_id', validReq.id);
                }
                if (validReq.approved_at) {
                    lastHandledApprovedAt = validReq.approved_at;
                    localStorage.setItem('last_handled_remote_approved_at', validReq.approved_at);
                }

                const plugin = getPlugin();
                if (plugin?.setUnlockDuration) {
                    await plugin.setUnlockDuration({ minutes: validMins });
                }

                // এই ডিভাইসের সকল পেন্ডিং approved রিমোট আনলক রো একসাথে কনজিউম করা
                await batchConsumeRemoteRows(allRemoteIds, 'remote_unlocked_consumed');

                // Hide modal if open
                const overlay = document.getElementById('unlock-modal-overlay');
                if (overlay) overlay.style.display = 'none';

                isSessionCurrentlyActive = true;
                const durText = validMins >= 52560000 ? 'স্থায়ীভাবে' : `${validMins} মিনিটের জন্য`;
                alert(`✅ অ্যাডমিন কর্তৃক আপনার অ্যাপটি দূর থেকে ${durText} সফলভাবে আনলক করা হয়েছে!`);
            }
        } catch (e) {
            console.log("Remote check note:", e);
        } finally {
            isCheckingRemote = false;
        }
    }

    async function checkUnlockStatus() {
        const plugin = getPlugin();
        if (!plugin || !plugin.getUnlockStatus) return;

        try {
            const status = await plugin.getUnlockStatus();
            const timerEl = document.getElementById('unlock-timer-banner');

            if (status && status.isUnlocked && status.remainingSeconds > 0) {
                isSessionCurrentlyActive = true;
                const remainingHours = Math.floor(status.remainingSeconds / 3600);
                if (remainingHours > 1000) {
                    if (timerEl) {
                        timerEl.style.display = 'block';
                        timerEl.innerText = `Unlimited Unlock Active`;
                    }
                } else {
                    const mins = Math.floor(status.remainingSeconds / 60);
                    const secs = status.remainingSeconds % 60;
                    if (timerEl) {
                        timerEl.style.display = 'block';
                        timerEl.innerText = `Unlocked (${mins}m ${secs}s remaining)`;
                    }
                }
                // গুরুত্বপূর্ণ: অ্যাপটি ইতিমধ্যে আনলকড থাকলে রিমোট কুয়েরি বা অ্যালার্ট চেক করার প্রয়োজন নেই
                return;
            } else {
                if (timerEl) timerEl.style.display = 'none';

                // সেশন শেষ হলে অ্যাডমিনকে নোটিফিকেশন পাঠানো
                if (isSessionCurrentlyActive) {
                    isSessionCurrentlyActive = false;
                    const endNotice = `<b>আনলক সেশন সমাপ্ত হয়েছে!</b>\n\n` +
                        `<b>Device ID:</b> <code>${currentDeviceId}</code>\n` +
                        `<b>স্ট্যাটাস:</b> সময় শেষ, প্রটেকশন পুনরায় লক করা হয়েছে।`;
                    notifyTelegramAdmin(endNotice);
                }

                // শুধুমাত্র যদি অ্যাপটি লকড অবস্থায় থাকে, তখনই রিমোট আনলক চেক করা হবে
                checkRemoteApproval();
            }
        } catch (e) {
            console.error('Error checking unlock status:', e);
        }
    }

    function injectStyles() {
        if (document.getElementById('focusdurood-unlock-styles')) return;
        const style = document.createElement('style');
        style.id = 'focusdurood-unlock-styles';
        style.innerHTML = `
            #unlock-timer-banner {
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: #2e7d32;
                color: white;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: bold;
                z-index: 999999;
                display: none;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            }
            #unlock-modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.6);
                z-index: 1000000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            .unlock-modal-card {
                background: #ffffff;
                color: #333333;
                border-radius: 12px;
                width: 100%;
                max-width: 360px;
                padding: 20px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                font-family: system-ui, -apple-system, sans-serif;
            }
            .unlock-modal-card h3 {
                margin-top: 0;
                margin-bottom: 12px;
                color: #1e293b;
                font-size: 18px;
                text-align: center;
            }
            .unlock-device-box {
                background: #f1f5f9;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                color: #475569;
                text-align: center;
                margin-bottom: 16px;
                font-family: monospace;
            }
            .unlock-input-group {
                margin-bottom: 16px;
            }
            .unlock-input-group label {
                display: block;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 6px;
                color: #475569;
            }
            .unlock-input-group input {
                width: 100%;
                padding: 10px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 16px;
                box-sizing: border-box;
                text-align: center;
            }
            .unlock-btn {
                width: 100%;
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            .unlock-btn:hover { opacity: 0.9; }
            .unlock-btn-telegram {
                background: #0088cc;
                color: white;
                margin-bottom: 10px;
            }
            .unlock-btn-validate {
                background: #16a34a;
                color: white;
            }
            .unlock-btn-close {
                background: #64748b;
                color: white;
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    function createTimerBanner() {
        if (document.getElementById('unlock-timer-banner')) return;
        const timerBanner = document.createElement('div');
        timerBanner.id = 'unlock-timer-banner';
        document.body.appendChild(timerBanner);
    }

    function createModal() {
        if (document.getElementById('unlock-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'unlock-modal-overlay';
        overlay.innerHTML = `
            <div class="unlock-modal-card">
                <h3>Helpniche Support & Unlock</h3>

                <div class="unlock-device-box">
                    Device ID: <span id="unlock-device-id-display">লোড হচ্ছে...</span>
                </div>

                <div class="unlock-input-group">
                    <label>বট থেকে প্রাপ্ত ওয়ান-টাইম কোড দিন:</label>
                    <input type="password" id="unlock-otp-input" placeholder="••••••" maxLength="10" style="letter-spacing: 4px; font-weight: bold; text-align: center;" />
                </div>

                <button class="unlock-btn unlock-btn-validate" id="unlock-validate-btn">
                    Validate & Unlock
                </button>

                <button class="unlock-btn unlock-btn-banking" id="unlock-banking-pause-btn" style="margin-top: 10px; background: linear-gradient(135deg, #E11D48, #9F1239); color: white;">
                    ⚡ বিকাশ / নগদ সাময়িক বিরতি (৫ মিনিট)
                </button>

                <button class="unlock-btn unlock-btn-telegram" id="unlock-telegram-link-btn" style="margin-top: 10px;">
                    Contact Telegram Admin
                </button>

                <button class="unlock-btn unlock-btn-close" id="unlock-close-btn">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('unlock-close-btn').onclick = () => {
            overlay.style.display = 'none';
        };

        // বিকাশ / নগদ সাময়িক বিরতি বাটন হ্যান্ডলার
        const bankingBtn = document.getElementById('unlock-banking-pause-btn');
        if (bankingBtn) {
            bankingBtn.onclick = async () => {
                const confirmed = confirm(
                    "বিকাশ/নগদ ব্যবহারের জন্য ৫ মিনিটের সাময়িক বিরতি শুরু হবে।\n\n" +
                    "• ৫ মিনিট স্ক্রিনে কাউন্টডাউন বাবল থাকবে।\n" +
                    "• ৫ মিনিট শেষ হলে এক্সেসিবিলিটি অন করা বাধ্যতামূলক থাকবে।\n\n" +
                    "আপনি কি বিরতি শুরু করতে চান?"
                );
                if (!confirmed) return;

                const plugin = getPlugin();
                if (plugin && plugin.startBankingPause) {
                    try {
                        overlay.style.display = 'none';
                        await plugin.startBankingPause({ minutes: 5 });
                        alert("✅ বিকাশ মোড চালু হয়েছে! ৫ মিনিটের জন্য লেনদেন করুন। ৫ মিনিট পর স্ক্রিনে অন করার অপশন আসবে।");
                    } catch (e) {
                        alert("ত্রুটি: " + (e?.message || e));
                    }
                } else {
                    alert("ব্যাংকিং বিরতি প্লাগইন পাওয়া যায়নি।");
                }
            };
        }

        // টেলিগ্রাম ওপেন করার সময় Device ID ডিপ-লিংকে পাস করা
        document.getElementById('unlock-telegram-link-btn').onclick = async () => {
            const plugin = getPlugin();
            if (!currentDeviceId && plugin?.getDeviceId) {
                try {
                    const d = await plugin.getDeviceId();
                    if (d?.deviceId) currentDeviceId = d.deviceId.trim().toLowerCase();
                } catch(e) {}
            }

            const cleanUser = TELEGRAM_BOT_USERNAME.replace(/^@/, '').trim();
            let webUri = `https://t.me/${cleanUser}`;
            if (currentDeviceId) webUri += `?start=${currentDeviceId}`;

            if (plugin && plugin.openTelegramBot) {
                plugin.openTelegramBot({ botUsername: cleanUser, deviceId: currentDeviceId }).catch(() => {
                    window.open(webUri, '_system');
                });
            } else {
                window.open(webUri, '_system');
            }
        };

        // ওয়ান-টাইম পাসকোড যাচাই ও আনলক
        const validateBtn = document.getElementById('unlock-validate-btn');
        if (validateBtn) {
            validateBtn.onclick = async () => {
                const codeInput = document.getElementById('unlock-otp-input');
                const code = codeInput ? codeInput.value.trim() : '';

                if (!code || code.length < 4) {
                    alert('অনুগ্রহ করে সঠিক পাসকোডটি ইনপুট দিন।');
                    return;
                }

                validateBtn.disabled = true;
                validateBtn.innerText = "যাচাই হচ্ছে...";

                try {
                    const plugin = getPlugin();

                    // ১. অফলাইন ইমার্জেন্সি মাস্টার কোড (ইন্টারনেট বা সার্ভার ডাউন থাকলেও কাজ করবে)
                    if (code === '999999' || code === '888888' || code === '7788') {
                        const mins = (code === '7788') ? 10 : 52560000;
                        if (plugin?.setUnlockDuration) {
                            await plugin.setUnlockDuration({ minutes: mins });
                        }
                        alert(`মাস্টার কোড দ্বারা আনলক সফল! সময়সীমা: ${mins > 1000 ? 'স্থায়ী' : mins + ' মিনিট'}`);
                        overlay.style.display = 'none';
                        if (codeInput) codeInput.value = '';
                        checkUnlockStatus();
                        return;
                    }

                    // ২. ডিভাইস আইডি নিশ্চিতকরণ
                    if (!currentDeviceId && plugin?.getDeviceId) {
                        try {
                            const d = await plugin.getDeviceId();
                            if (d?.deviceId) currentDeviceId = d.deviceId.trim().toLowerCase();
                        } catch (e) {}
                    }

                    // ৩. SHA-256 হ্যাশ তৈরি
                    let codeHash = '';
                    try {
                        const enc = new TextEncoder();
                        const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(code));
                        codeHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
                    } catch (hashErr) {
                        console.error('SHA-256 error:', hashErr);
                    }

                    if (!codeHash) {
                        alert('ব্রাউজার সিকিউরিটি এরর: কোড হ্যাশ তৈরি করা সম্ভব হয়নি। জরুরি আনলকে 999999 ব্যবহার করুন।');
                        return;
                    }

                    // ৪. Supabase ভেরিফিকেশন কল (consume_unlock_code)
                    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/consume_unlock_code`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Profile': 'public',
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({
                            p_device_id: currentDeviceId,
                            p_code_hash: codeHash
                        })
                    });

                    const result = await response.json();

                    if (result && result.success) {
                        const durationMinutes = result.duration_minutes || 5;
                        const isUnlimited = durationMinutes >= 52560000;
                        const durationText = isUnlimited ? 'স্থায়ী' : `${durationMinutes} মিনিট`;

                        // অ্যাডমিনকে নোটিফিকেশন পাঠানো
                        const startNotice = `<b>আনলক সেশন শুরু হয়েছে!</b>\n\n` +
                            `<b>Device ID:</b> <code>${currentDeviceId}</code>\n` +
                            `<b>মেয়াদ:</b> ${durationText}\n` +
                            `<b>ব্যবহৃত কোড:</b> <code>${code}</code>`;
                        notifyTelegramAdmin(startNotice);

                        alert(`আনলক সফল হয়েছে! সময়সীমা: ${durationText}`);

                        if (plugin?.setUnlockDuration) {
                            await plugin.setUnlockDuration({ minutes: durationMinutes });
                        }

                        overlay.style.display = 'none';
                        if (codeInput) codeInput.value = '';
                        isSessionCurrentlyActive = true;
                        checkUnlockStatus();

                    } else {
                        alert(`রিজেক্ট: ${result?.message || 'ভুল কোড অথবা ইতিমধ্যে ব্যবহার করা হয়েছে!'}\n(Device: ${currentDeviceId || 'অজানা'})`);
                    }

                } catch (err) {
                    console.error("Unlock error:", err);
                    alert(`সার্ভার সংযোগ এরর: ${err.message}\n(ইন্টারনেট সমস্যা হলে জরুরি আনলকে 999999 দিন)`);
                } finally {
                    validateBtn.disabled = false;
                    validateBtn.innerText = "Validate & Unlock";
                }
            };
        }
    }
})();