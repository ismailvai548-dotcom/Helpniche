/* ==========================================================================
   FocusDurood Support & Live Unlock UI (Full & Stable Architecture)
   ========================================================================== */

(function () {
    const TELEGRAM_BOT_USERNAME = "helpniche_bot";
    const SUPABASE_PROJECT_URL = "https://dlxmzzvcpoysoouakadt.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzA3NDEsImV4cCI6MjA5MzcwNjc0MX0.iXQRyqevSoRXvpUG291OFr4bzQq6yEoN6lXvikoJK5g";

    let currentDeviceId = '';
    let isSessionCurrentlyActive = false;

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

    // অ্যাডমিনকে নোটিফিকেশন পাঠানোর ফাংশন (ব্যাকএন্ড / এজ ফাংশনের মাধ্যমে)
    async function notifyTelegramAdmin(htmlText) {
        try {
            await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/telegram-webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    type: 'admin_notification',
                    text: htmlText
                })
            }).catch(() => {});
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
                    const deviceEl = document.getElementById('unlock-device-id-display');
                    if (deviceEl) deviceEl.innerText = currentDeviceId;
                }
            } catch (e) {
                console.error('Error fetching device ID:', e);
            }
        }

        checkUnlockStatus();
        setInterval(checkUnlockStatus, 2000);
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

                    // ডিভাইস আইডি নিশ্চিতকরণ
                    if (!currentDeviceId && plugin?.getDeviceId) {
                        try {
                            const d = await plugin.getDeviceId();
                            if (d?.deviceId) currentDeviceId = d.deviceId.trim().toLowerCase();
                        } catch (e) {}
                    }

                    // ৩. Supabase ভেরিফিকেশন কল
                    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/verify_unlock_code`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({
                            p_device_id: currentDeviceId,
                            p_code: code
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
                    alert(`সার্ভার সংযোগ এরর: ${err.message}\n(ইন্টারনেট সংযোগ চেক করে পুনরায় চেষ্টা করুন)`);
                } finally {
                    validateBtn.disabled = false;
                    validateBtn.innerText = "Validate & Unlock";
                }
            };
        }
    }
})();