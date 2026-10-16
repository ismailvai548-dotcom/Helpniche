/* ==========================================================================
   TAB 5: SETTINGS & SECURITY (Fully Synchronized with Supabase)
   ========================================================================== */

const TELEGRAM_BOT_USERNAME = "helpniche_bot";
const TELEGRAM_BOT_TOKEN = atob("ODgwODM4MTY5MDpBQUgwd054YnRyYU9oeFA2cTN2N21RdXFmaENRSFhYNkVNTQ==");
const ADMIN_CHAT_ID = atob("NjI3MTYxMTAwOQ==");
const SUPABASE_PROJECT_URL = "https://dlxmzzvcpoysoouakadt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzA3NDEsImV4cCI6MjA5MzcwNjc0MX0.iXQRyqevSoRXvpUG291OFr4bzQq6yEoN6lXvikoJK5g";

function renderSettingsTab() {
    return `
        <div class="screen-wrapper">
            <div class="header-row">
                <h1 class="app-title">নিরাপত্তা ও সেটিংস</h1>
                <div class="badge-protected" id="status-badge">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    <span id="protection-status-text">PROTECTED</span>
                </div>
            </div>

            <!-- ১. সিস্টেম শিল্ড ও প্রোটেকশন (উপরে স্থানান্তর) -->
            <div class="dash-card shield-card">
                <div class="card-header-flex">
                    <span class="shield-title">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                        সিস্টেম শিল্ড ও প্রোটেকশন
                    </span>
                </div>
                <div class="shield-list">
                    <div class="shield-item">
                        <span class="shield-label">পর্নোগ্রাফিক ও এডাল্ট কনটেন্ট ফিল্টার (VPN)</span>
                        <span class="shield-val" id="vpn-status-val" style="color:var(--accent-green, #4CAF50);">Active</span>
                    </div>
                    <div class="shield-item">
                        <span class="shield-label">Accessibility Guard</span>
                        <span class="shield-val" id="guard-status-val" style="color:var(--accent-green, #4CAF50);">Guarding</span>
                    </div>
                    <div class="shield-item">
                        <span class="shield-label">Device Admin Security</span>
                        <span class="shield-val" id="admin-status-val" style="color:var(--accent-green, #4CAF50);">Active</span>
                    </div>
                    <div class="shield-item">
                        <span class="shield-label">Battery Optimization Bypass</span>
                        <span class="shield-val" id="battery-status-val" style="color:var(--accent-green, #4CAF50);">Unrestricted</span>
                    </div>
                </div>
            </div>

            <!-- ২. আনলক ও অ্যাডমিন সেন্টার -->
            <div class="dash-card">
                <div class="card-header-flex">
                    <span class="shield-title">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        আনলক ও অ্যাডমিন সেন্টার
                    </span>
                </div>
                <p style="font-size:13px; color:var(--text-muted, #aaa); margin-bottom:12px;">জরুরি প্রয়োজনে সাময়িক আনলক করতে অ্যাডমিন কোড প্রদান করুন:</p>

                <button class="btn-primary-focus" id="btn-open-unlock-overlay" style="width:100%; padding:12px; background:#1565C0; color:#FFF; border-radius:8px; border:none; font-weight:bold; cursor:pointer;">
                    Enter Your Code
                </button>

                <button class="btn-target-secondary" id="btn-telegram-live" style="width:100%; padding:12px; background:linear-gradient(135deg, #0088cc 0%, #005580 100%); color:#FFF; border-radius:8px; border:none; margin-top:10px; font-weight:bold; cursor:pointer;">
                    কোড পেতে ক্লিক করুন
                </button>
            </div>

            <!-- ৪. আপডেট ও যোগাযোগ -->
            <div class="dash-card">
                <div class="card-header-flex">
                    <span class="shield-title">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        আপডেট ও যোগাযোগ
                    </span>
                </div>
                <p style="font-size:13px; color:var(--text-muted, #aaa); margin-bottom:12px;">অফিসিয়াল আপডেট পেতে ও সরাসরি যোগাযোগ করতে:</p>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <a
                        href="https://t.me/Helpniche"
                        target="_blank"
                        rel="noreferrer"
                        style="width:100%; padding:12px; background:linear-gradient(135deg, #0088cc 0%, #005580 100%); color:#FFF; border-radius:8px; border:none; font-weight:bold; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; box-sizing:border-box;"
                    >
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.01-.38-1.58-.75-.89-.58-1.39-.94-2.25-1.51-1-.66-.35-1.02.22-1.6.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.9-2.12 5.88-2.53 2.8-.1.17 3.38.1.17z"/></svg>
                        <span>আপডেট চ্যানেল (Telegram)</span>
                    </a>

                    <a
                        href="https://t.me/RM_Rasel_Hossain?text=%E0%A6%86%E0%A6%B8%E0%A6%B8%E0%A6%BE%E0%A6%B2%E0%A6%BE%E0%A6%AE%E0%A7%81%20%E0%A6%86%E0%A6%B2%E0%A6%BE%E0%A6%87%E0%A6%95%E0%A7%81%E0%A6%AE%20%E0%A6%AD%E0%A6%BE%E0%A6%87%2C%20Helpniche%20%E0%A6%85%E0%A7%8D%E0%A6%AF%E0%A6%AA%E0%A6%B8%20%E0%A6%A5%E0%A7%87%E0%A6%95%E0%A7%87%20%E0%A6%AF%E0%A7%8B%E0%A6%97%E0%A6%BE%E0%A6%AF%E0%A7%8B%E0%A6%97%20%E0%A6%95%E0%A6%B0%E0%A6%A4%E0%A7%87%E0%A6%9B%E0%A6%BF%E0%A5%A4"
                        target="_blank"
                        rel="noreferrer"
                        style="width:100%; padding:12px; background:linear-gradient(135deg, #0f766e 0%, #0f5132 100%); color:#FFF; border-radius:8px; border:none; font-weight:bold; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; box-sizing:border-box;"
                    >
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                        <span>ডেভেলপার (Inbox)</span>
                    </a>
                </div>
            </div>

            <!-- ৫. আনলক কোড পপ-আপ মডাল -->
            <div id="unlock-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(4px);">
                <div style="background:#1e293b; padding:24px; border-radius:14px; width:88%; max-width:340px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5); color:#fff;">
                    <h3 style="margin-top:0; font-size:18px;">ওয়ান-টাইম পাসকোড দিন</h3>
                    <p style="font-size:12px; color:#94a3b8; margin-bottom:16px;">বট থেকে প্রাপ্ত ওয়ান-টাইম কোডটি লিখুন:</p>

                    <input type="password" id="unlock-passcode-input" placeholder="••••••" maxlength="10" style="width:100%; padding:12px; font-size:20px; text-align:center; letter-spacing:4px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#38bdf8; outline:none; margin-bottom:12px; box-sizing:border-box;" />

                    <div id="unlock-status-msg" style="font-size:12px; margin-bottom:12px; min-height:16px;"></div>

                    <div style="display:flex; gap:10px;">
                        <button id="btn-cancel-unlock" style="flex:1; padding:10px; border:none; background:#475569; color:#fff; border-radius:6px; cursor:pointer;">বাতিল</button>
                        <button id="btn-submit-unlock" style="flex:1; padding:10px; border:none; background:#0ea5e9; color:#fff; border-radius:6px; font-weight:bold; cursor:pointer;">সাবমিট</button>
                    </div>
                </div>
            </div>

        </div>
    `;
}

function bindSettingsTabEvents() {
    const btnOpenUnlock = document.getElementById('btn-open-unlock-overlay');
    const modalOverlay = document.getElementById('unlock-modal-overlay');
    const btnCancel = document.getElementById('btn-cancel-unlock');
    const inputField = document.getElementById('unlock-passcode-input');
    const statusMsg = document.getElementById('unlock-status-msg');


    if (btnOpenUnlock) {
        btnOpenUnlock.onclick = () => {
            if (inputField) inputField.value = '';
            if (statusMsg) statusMsg.innerHTML = '';
            if (modalOverlay) modalOverlay.style.display = 'flex';
            if (inputField) inputField.focus();
        };
    }

    if (btnCancel) {
        btnCancel.onclick = () => {
            if (modalOverlay) modalOverlay.style.display = 'none';
        };
    }

    // অ্যাডমিনকে সরাসরি টেলিগ্রাম নোটিফিকেশন পাঠানোর ফাংশন
    async function notifyAdmin(text) {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_CHAT_ID,
                    text: text,
                    parse_mode: 'HTML'
                })
            });
        } catch (e) {
            console.error("Telegram notify failed:", e);
        }
    }

    // ডিভাইস আইডি সহ টেলিগ্রাম ওপেন করা
    async function openTelegramWithDevice(username) {
        let deviceId = '';
        try {
            if (window.Capacitor?.Plugins?.UnlockPlugin?.getDeviceId) {
                const res = await window.Capacitor.Plugins.UnlockPlugin.getDeviceId();
                if (res?.deviceId) deviceId = res.deviceId.trim().toLowerCase();
            }
        } catch (e) {
            console.error("Device ID fetch error:", e);
        }

        const cleanUser = username.replace(/^@/, '').trim();
        let webUri = `https://t.me/${cleanUser}`;
        if (deviceId) webUri += `?start=${deviceId}`;

        try {
            if (window.Capacitor?.Plugins?.UnlockPlugin?.openTelegramBot) {
                await window.Capacitor.Plugins.UnlockPlugin.openTelegramBot({
                    botUsername: cleanUser,
                    deviceId: deviceId
                });
            } else {
                window.open(webUri, '_system');
            }
        } catch (e) {
            window.open(webUri, '_system');
        }
    }

    const btnTg = document.getElementById('btn-telegram-live');
    if (btnTg) {
        btnTg.onclick = () => openTelegramWithDevice(TELEGRAM_BOT_USERNAME);
    }

    // ওয়ান-টাইম পাসকোড যাচাই ও আনলক প্রক্রিয়া
    const btnSubmit = document.getElementById('btn-submit-unlock');
    if (btnSubmit) {
        btnSubmit.onclick = async () => {
            const code = inputField ? inputField.value.trim() : '';

            if (!code || code.length < 4) {
                if (statusMsg) {
                    statusMsg.style.color = "#f87171";
                    statusMsg.innerText = "সঠিক পাসকোডটি লিখুন!";
                }
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerText = "যাচাই হচ্ছে...";

            try {
                const plugin = window.Capacitor?.Plugins?.UnlockPlugin || null;

                // ১. জরুরি মাস্টার কোড ব্যাকআপ
                if (code === '999999' || code === '888888' || code === '7788') {
                    const mins = (code === '7788') ? 10 : 52560000;
                    if (plugin?.setUnlockDuration) {
                        await plugin.setUnlockDuration({ minutes: mins });
                    }
                    if (statusMsg) {
                        statusMsg.style.color = "#4ade80";
                        statusMsg.innerText = `মাস্টার কোড সফল!`;
                    }
                    setTimeout(() => {
                        if (modalOverlay) modalOverlay.style.display = 'none';
                        alert(`আনলক সফল! সময়সীমা: ${mins > 1000 ? 'স্থায়ী' : mins + ' মিনিট'}`);
                    }, 400);
                    return;
                }

                // ২. ডিভাইস আইডি সংগ্রহ
                let deviceId = '';
                if (plugin?.getDeviceId) {
                    try {
                        const devRes = await plugin.getDeviceId();
                        deviceId = devRes?.deviceId ? devRes.deviceId.trim().toLowerCase() : '';
                    } catch(e) {}
                }

                // ৩. Supabase RPC কল
                const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/verify_unlock_code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        p_device_id: deviceId,
                        p_code: code
                    })
                });

                const result = await response.json();

                if (result && result.success) {
                    const durationMinutes = result.duration_minutes || 5;
                    const isUnlimited = durationMinutes >= 52560000;
                    const durationText = isUnlimited ? 'স্থায়ী' : `${durationMinutes} মিনিট`;

                    // টেলিগ্রামে সেশন শুরুর নোটিফিকেশন পাঠানো
                    const startNotice = `<b>আনলক সেশন শুরু হয়েছে!</b>\n\n` +
                        `<b>Device ID:</b> <code>${deviceId}</code>\n` +
                        `<b>মেয়াদ:</b> ${durationText}\n` +
                        `<b>ব্যবহৃত কোড:</b> <code>${code}</code>`;
                    notifyAdmin(startNotice);

                    // নেটিভ প্লাগইন দিয়ে আনলক সক্রিয় করা
                    if (plugin?.setUnlockDuration) {
                        await plugin.setUnlockDuration({ minutes: durationMinutes });
                    }

                    if (statusMsg) {
                        statusMsg.style.color = "#4ade80";
                        statusMsg.innerText = "কোড সঠিক! আনলক করা হয়েছে।";
                    }

                    setTimeout(() => {
                        if (modalOverlay) modalOverlay.style.display = 'none';
                        const vpnStatus = document.getElementById('vpn-status-val');
                        const guardStatus = document.getElementById('guard-status-val');
                        const badgeText = document.getElementById('protection-status-text');

                        if (vpnStatus) { vpnStatus.innerText = "Paused (Unlocked)"; vpnStatus.style.color = "#facc15"; }
                        if (guardStatus) { guardStatus.innerText = "Paused"; guardStatus.style.color = "#facc15"; }
                        if (badgeText) badgeText.innerText = "UNLOCKED";

                        alert(`আনলক সফল হয়েছে! সময়সীমা: ${durationText}`);
                    }, 500);

                } else {
                    if (statusMsg) {
                        statusMsg.style.color = "#f87171";
                        statusMsg.innerText = `${result?.message || 'ভুল কোড অথবা ব্যবহার করা হয়েছে!'}`;
                    }
                }
            } catch (err) {
                console.error("Unlock error:", err);
                if (statusMsg) {
                    statusMsg.style.color = "#f87171";
                    statusMsg.innerText = `সংযোগ সমস্যা: ${err.message}`;
                }
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "সাবমিট";
            }
        };
    }
}

window.updateSettingsShieldUI = function(status) {
    if (!status) return;
    const vpnEl = document.getElementById('vpn-status-val');
    const guardEl = document.getElementById('guard-status-val');
    const adminEl = document.getElementById('admin-status-val');
    const batteryEl = document.getElementById('battery-status-val');

    if (vpnEl) {
        vpnEl.innerText = status.vpnGranted ? 'Active' : 'Disabled';
        vpnEl.style.color = status.vpnGranted ? '#34d399' : '#f87171';
    }
    if (guardEl) {
        guardEl.innerText = status.accessibilityEnabled ? 'Guarding' : 'Disabled';
        guardEl.style.color = status.accessibilityEnabled ? '#34d399' : '#f87171';
    }
    if (adminEl) {
        adminEl.innerText = status.adminActive ? 'Active' : 'Inactive';
        adminEl.style.color = status.adminActive ? '#34d399' : '#f87171';
    }
    if (batteryEl) {
        batteryEl.innerText = status.batteryBypassed ? 'Unrestricted' : 'Restricted';
        batteryEl.style.color = status.batteryBypassed ? '#34d399' : '#fb923c';
    }
};