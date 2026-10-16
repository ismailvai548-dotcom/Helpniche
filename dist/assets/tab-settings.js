/* ==========================================================================
   TAB 5: SETTINGS & SECURITY (Modular Portal Dashboard)
   ========================================================================== */

const TELEGRAM_BOT_USERNAME = "helpniche_bot";
const SUPABASE_PROJECT_URL = window.SUPABASE_PROJECT_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

function renderSettingsTab() {
    return `
        <div class="screen-wrapper" style="padding:16px; max-width:480px; margin:0 auto; box-sizing:border-box;">
            <!-- Header Row -->
            <div class="header-row" style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:16px;">
                <div>
                    <h1 class="app-title" style="margin:0; font-size:22px; font-weight:800; color:#ffffff;">নিরাপত্তা ও সেটিংস</h1>
                    <p class="app-subtitle" style="margin:4px 0 0 0; font-size:12px; color:#94a3b8;">স্মার্ট কন্ট্রোল ও সিস্টেম পরিচালনা</p>
                </div>
                <div class="badge-protected" id="status-badge" style="display:flex; align-items:center; gap:6px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:20px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px; fill:#10b981;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    <span id="protection-status-text" style="font-size:11px; font-weight:700; color:#10b981;">PROTECTED</span>
                </div>
            </div>

            <!-- ১. সিস্টেম শিল্ড ও প্রোটেকশন (উপরে স্থায়ী লাইভ কার্ড) -->
            <div class="dash-card shield-card" style="margin-bottom:16px;">
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

            <!-- ২. নিচে দুইটি পোর্টাল কার্ড (আনলক ও হাদিয়া) -->
            <div class="settings-grid-container" style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; width:100%;">
                
                <!-- আনলক সেন্টার কার্ড -->
                <button class="btn-circular-control" id="btn-card-unlock" style="min-height:148px; border-radius:22px; background:linear-gradient(145deg, #0c2a42 0%, #061624 100%); border:2px solid #38bdf8; box-shadow:0 6px 20px rgba(56, 189, 248, 0.2); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; padding:16px 8px; text-align:center; outline:none; transition:transform 0.15s;">
                    <div style="width:48px; height:48px; border-radius:50%; background:rgba(56, 189, 248, 0.15); display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid rgba(56, 189, 248, 0.35);">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:24px; height:24px; fill:#38bdf8;">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                    </div>
                    <span style="font-size:14px; font-weight:800; color:#ffffff; line-height:1.3;">আনলক সেন্টার</span>
                    <span style="font-size:10px; color:#38bdf8; font-weight:700; margin-top:6px; background:rgba(56, 189, 248, 0.15); padding:2px 8px; border-radius:10px; border:1px solid rgba(56, 189, 248, 0.3);">এডমিন ওটিপি</span>
                </button>

                <!-- হাদিয়া ও অনুদান কার্ড -->
                <button class="btn-circular-control" id="btn-card-donation" style="min-height:148px; border-radius:22px; background:linear-gradient(145deg, #0d3b2e 0%, #041f17 100%); border:2px solid #10b981; box-shadow:0 6px 20px rgba(16, 185, 129, 0.2); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; padding:16px 8px; text-align:center; outline:none; transition:transform 0.15s;">
                    <div style="width:48px; height:48px; border-radius:50%; background:rgba(16, 185, 129, 0.15); display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid rgba(16, 185, 129, 0.35);">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:24px; height:24px; fill:#10b981;">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </div>
                    <span style="font-size:14px; font-weight:800; color:#ffffff; line-height:1.3;">হাদিয়া ও অনুদান</span>
                    <span id="settings-donation-badge" style="font-size:10px; color:#34d399; font-weight:700; margin-top:6px; background:rgba(16, 185, 129, 0.15); padding:2px 8px; border-radius:10px; border:1px solid rgba(16, 185, 129, 0.3);">বিকাশ ও নগদ</span>
                </button>
            </div>

            <!-- ৩. আপডেট ও সাপোর্ট কার্ড (পুরো প্রস্থ জুড়ে বড় কার্ড) -->
            <button class="btn-circular-control" id="btn-card-updates" style="width:100%; min-height:82px; border-radius:20px; background:linear-gradient(145deg, #1e1b4b 0%, #0f1026 100%); border:2px solid #818cf8; box-shadow:0 6px 20px rgba(129, 140, 248, 0.2); display:flex; flex-direction:row; align-items:center; justify-content:space-between; cursor:pointer; padding:16px 20px; outline:none; transition:transform 0.15s; box-sizing:border-box;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:46px; height:46px; border-radius:50%; background:rgba(129, 140, 248, 0.15); display:flex; align-items:center; justify-content:center; border:1px solid rgba(129, 140, 248, 0.35); flex-shrink:0;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:24px; height:24px; fill:#818cf8;">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.01-.38-1.58-.75-.89-.58-1.39-.94-2.25-1.51-1-.66-.35-1.02.22-1.6.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.9-2.12 5.88-2.53 2.8-.1.17 3.38.1.17z"/>
                        </svg>
                    </div>
                    <div style="text-align:left;">
                        <div style="font-size:15px; font-weight:800; color:#ffffff; line-height:1.3;">আপডেট ও সরাসরি সাপোর্ট</div>
                        <div style="font-size:12px; color:#94a3b8; margin-top:3px;">টেলিগ্রাম চ্যানেল ও ডেভেলপার ইনবক্স</div>
                    </div>
                </div>
                <span style="font-size:10px; color:#818cf8; font-weight:700; background:rgba(129, 140, 248, 0.15); padding:4px 10px; border-radius:12px; border:1px solid rgba(129, 140, 248, 0.3); flex-shrink:0;">যোগাযোগ</span>
            </button>

            <!-- Hidden Elements for State Consistency -->
            <div id="settings-donation-desc" style="display:none;"></div>
            <button id="btn-open-donation-modal" style="display:none;"></button>
            <button id="btn-open-unlock-overlay" style="display:none;"></button>

            <!-- আনলক সেন্টার ডেডিকেটেড মডাল -->
            <div id="unlock-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(6px); padding:16px; box-sizing:border-box;">
                <div style="background:#1e293b; padding:22px 20px; border-radius:18px; width:100%; max-width:340px; text-align:center; box-shadow:0 12px 30px rgba(0,0,0,0.6); color:#fff; border:1px solid #334155;">
                    <div style="width:44px; height:44px; border-radius:50%; background:rgba(56, 189, 248, 0.15); border:1px solid rgba(56, 189, 248, 0.35); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:22px; height:22px; fill:#38bdf8;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    </div>
                    <h3 style="margin:0 0 6px 0; font-size:18px; font-weight:800; color:#fff;">আনলক ও অ্যাডমিন সেন্টার</h3>
                    <p style="font-size:12px; color:#94a3b8; margin:0 0 16px 0; line-height:1.4;">জরুরি প্রয়োজনে সাময়িক আনলক করতে ওয়ান-টাইম পাসকোড লিখুন:</p>

                    <input type="password" id="unlock-passcode-input" placeholder="••••••" maxlength="10" style="width:100%; padding:12px; font-size:22px; text-align:center; letter-spacing:4px; border-radius:10px; border:1.5px solid #334155; background:#0f172a; color:#38bdf8; outline:none; margin-bottom:12px; box-sizing:border-box;" />

                    <div id="unlock-status-msg" style="font-size:12px; margin-bottom:12px; min-height:16px;"></div>

                    <div style="display:flex; gap:10px; margin-bottom:12px;">
                        <button id="btn-cancel-unlock" style="flex:1; padding:11px; border:none; background:#334155; color:#cbd5e1; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px;">বাতিল</button>
                        <button id="btn-submit-unlock" style="flex:1; padding:11px; border:none; background:#0284c7; color:#fff; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;">যাচাই ও আনলক</button>
                    </div>

                    <button class="btn-target-secondary" id="btn-telegram-live" style="width:100%; padding:11px; background:linear-gradient(135deg, #0088cc 0%, #005580 100%); color:#FFF; border-radius:8px; border:none; font-weight:bold; cursor:pointer; font-size:12.5px; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <span>টেলিগ্রাম থেকে কোড পেতে ক্লিক করুন</span>
                    </button>
                </div>
            </div>

            <!-- আপডেট ও যোগাযোগ ডেডিকেটেড মডাল -->
            <div id="updates-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center; backdrop-filter:blur(6px); padding:16px; box-sizing:border-box;">
                <div style="background:#1e293b; padding:22px 20px; border-radius:18px; width:100%; max-width:340px; text-align:center; box-shadow:0 12px 30px rgba(0,0,0,0.6); color:#fff; border:1px solid #334155;">
                    <div style="width:44px; height:44px; border-radius:50%; background:rgba(129, 140, 248, 0.15); border:1px solid rgba(129, 140, 248, 0.35); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:22px; height:22px; fill:#818cf8;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.01-.38-1.58-.75-.89-.58-1.39-.94-2.25-1.51-1-.66-.35-1.02.22-1.6.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.9-2.12 5.88-2.53 2.8-.1.17 3.38.1.17z"/></svg>
                    </div>
                    <h3 style="margin:0 0 6px 0; font-size:18px; font-weight:800; color:#fff;">আপডেট ও সরাসরি যোগাযোগ</h3>
                    <p style="font-size:12px; color:#94a3b8; margin:0 0 16px 0; line-height:1.4;">অফিসিয়াল আপডেট ও সরাসরি সহযোগিতার জন্য নিচের মাধ্যম ব্যবহার করুন:</p>

                    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">
                        <a
                            href="https://t.me/Helpniche"
                            target="_blank"
                            rel="noreferrer"
                            style="width:100%; padding:12px; background:linear-gradient(135deg, #0088cc 0%, #005580 100%); color:#FFF; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; box-sizing:border-box; font-size:13px;"
                        >
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.01-.38-1.58-.75-.89-.58-1.39-.94-2.25-1.51-1-.66-.35-1.02.22-1.6.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.9-2.12 5.88-2.53 2.8-.1.17 3.38.1.17z"/></svg>
                            <span>আপডেট চ্যানেল (Telegram)</span>
                        </a>

                        <a
                            href="https://t.me/RM_Rasel_Hossain?text=%E0%A6%86%E0%A6%B8%E0%A6%B8%E0%A6%BE%E0%A6%B2%E0%A6%BE%E0%A6%AE%E0%A7%81%20%E0%A6%86%E0%A6%B2%E0%A6%BE%E0%A6%87%E0%A6%95%E0%A7%81%E0%A6%AE%20%E0%A6%AD%E0%A6%BE%E0%A6%87%2C%20Helpniche%20%E0%A6%85%E0%A7%8D%E0%A6%AF%E0%A6%AA%E0%A6%B8%20%E0%A6%A5%E0%A7%87%E0%A6%95%E0%A7%87%20%E0%A6%AF%E0%A7%8B%E0%A6%97%E0%A6%BE%E0%A6%AF%E0%A7%8B%E0%A6%97%20%E0%A6%95%E0%A6%B0%E0%A6%A4%E0%A7%87%E0%A6%9B%E0%A6%BF%E0%A5%A4"
                            target="_blank"
                            rel="noreferrer"
                            style="width:100%; padding:12px; background:linear-gradient(135deg, #0f766e 0%, #0f5132 100%); color:#FFF; border-radius:10px; border:none; font-weight:bold; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px; box-sizing:border-box; font-size:13px;"
                        >
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                            <span>ডেভেলপার (Inbox)</span>
                        </a>
                    </div>

                    <button id="btn-close-updates-modal" style="width:100%; padding:10px; border:none; background:#334155; color:#cbd5e1; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px;">ফিরে যান</button>
                </div>
            </div>

        </div>
    `;
}

function bindSettingsTabEvents() {
    // ১. আনলক কার্ড ক্লিক ইভেন্ট
    const btnCardUnlock = document.getElementById('btn-card-unlock');
    const modalUnlock = document.getElementById('unlock-modal-overlay');
    const btnCancelUnlock = document.getElementById('btn-cancel-unlock');
    const inputField = document.getElementById('unlock-passcode-input');
    const statusMsg = document.getElementById('unlock-status-msg');

    if (btnCardUnlock) {
        btnCardUnlock.onclick = () => {
            if (inputField) inputField.value = '';
            if (statusMsg) statusMsg.innerHTML = '';
            if (modalUnlock) modalUnlock.style.display = 'flex';
            if (inputField) inputField.focus();
        };
    }

    if (btnCancelUnlock) {
        btnCancelUnlock.onclick = () => {
            if (modalUnlock) modalUnlock.style.display = 'none';
        };
    }

    // ২. হাদিয়া কার্ড ক্লিক ইভেন্ট
    const btnCardDonation = document.getElementById('btn-card-donation');
    if (btnCardDonation) {
        btnCardDonation.onclick = () => {
            if (window.openDonationModal) {
                window.openDonationModal();
            }
        };
    }

    window.updateSettingsDonationCard = function() {
        const badgeEl = document.getElementById('settings-donation-badge');
        const descEl = document.getElementById('settings-donation-desc');
        const total = parseFloat(localStorage.getItem('donation_total_amount') || '0');
        if (total > 0) {
            if (badgeEl) {
                badgeEl.innerText = `মোট: ৳${total}`;
                badgeEl.style.color = '#34d399';
            }
            if (descEl) {
                descEl.innerText = `আলহামদুলিল্লাহ, আপনার মোট অবদান: ৳${total}`;
            }
        }
    };
    window.updateSettingsDonationCard();

    // ৩. আপডেট ও সাপোর্ট কার্ড ক্লিক ইভেন্ট
    const btnCardUpdates = document.getElementById('btn-card-updates');
    const modalUpdates = document.getElementById('updates-modal-overlay');
    const btnCloseUpdates = document.getElementById('btn-close-updates-modal');

    if (btnCardUpdates) {
        btnCardUpdates.onclick = () => {
            if (modalUpdates) modalUpdates.style.display = 'flex';
        };
    }

    if (btnCloseUpdates) {
        btnCloseUpdates.onclick = () => {
            if (modalUpdates) modalUpdates.style.display = 'none';
        };
    }

    // অ্যাডমিনকে নোটিফিকেশন পাঠানোর ফাংশন (ব্যাকএন্ড / এজ ফাংশনের মাধ্যমে)
    async function notifyAdmin(text) {
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
                    text: text
                })
            }).catch(() => {});
        } catch (e) {
            console.error("Admin notify failed:", e);
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

                // ডিভাইস আইডি সংগ্রহ
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
                        if (modalUnlock) modalUnlock.style.display = 'none';
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
                btnSubmit.innerText = "যাচাই ও আনলক";
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