/* ==========================================================================
   TAB 5: SETTINGS & SECURITY (Fully Synchronized with Supabase)
   ========================================================================== */

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
                    <div class="shield-item">
                        <span class="shield-label">অনুপ্রবেশকারী ক্যামেরা গার্ড</span>
                        <span class="shield-val" id="intruder-shield-val" style="color:#94a3b8;">Inactive</span>
                    </div>
                </div>
            </div>

            <!-- ২. ক্যামেরা অনুপ্রবেশকারী সিকিউরিটি কার্ড -->
            <div class="dash-card" style="border: 1px solid rgba(244, 63, 94, 0.4);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; color:#f43f5e;"><path fill="currentColor" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm7-13h-3.17L14 2H10L8.17 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/></svg>
                        <span style="font-size:14px; font-weight:800; color:#ffffff;">অনুপ্রবেশকারী সেলফি (ক্যামেরা গার্ড)</span>
                    </div>
                    <!-- Toggle Switch (Default OFF) -->
                    <div id="btn-toggle-intruder-camera" style="width:48px; height:26px; background:#334155; border-radius:20px; position:relative; cursor:pointer; transition:background 0.3s ease;">
                        <div id="intruder-camera-knob" style="width:20px; height:20px; background:#ffffff; border-radius:50%; position:absolute; top:3px; left:3px; transition:left 0.3s ease; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
                    </div>
                </div>
                <div id="intruder-camera-title" style="font-size:13px; font-weight:700; color:#94a3b8; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">
                    ভুল পাসওয়ার্ড দিলে স্বয়ংক্রিয় ছবি (বন্ধ)
                </div>
                <p id="intruder-camera-desc" style="font-size:11.5px; color:#94a3b8; margin:4px 0 0 0; line-height:1.4; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">
                    লক স্ক্রিনে ভুল পাসওয়ার্ড দিলে সামনের ক্যামেরা দিয়ে ছবি তুলে ফোনের মেমোরিতে নিরাপদে রাখবে।
                </p>

                <!-- সেটিংস ও অপশন সেকশন -->
                <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:11.5px; color:#cbd5e1; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">ভুল চেষ্টার সীমা:</span>
                        <div style="display:flex; gap:6px;">
                            <button id="btn-thresh-1" style="background:#0ea5e9; border:none; color:#fff; font-size:11px; padding:3px 10px; border-radius:6px; cursor:pointer; font-weight:700; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">১ বার</button>
                            <button id="btn-thresh-2" style="background:#334155; border:none; color:#94a3b8; font-size:11px; padding:3px 10px; border-radius:6px; cursor:pointer; font-weight:700; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">২ বার</button>
                        </div>
                    </div>

                    <!-- ২ টি মূল অপশন বাটন: ব্যাকআপ ফটোস এবং সংরক্ষিত ছবি -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:4px;">
                        <button id="btn-open-telegram-backup" style="padding:10px 8px; background:rgba(14, 165, 233, 0.15); border:1px solid #0284c7; color:#38bdf8; font-size:12px; font-weight:700; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:15px; height:15px;"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                            <span>ফটো ব্যাকআপ</span>
                        </button>
                        <button id="btn-view-intruder-logs" style="padding:10px 8px; background:rgba(244, 63, 94, 0.15); border:1px solid rgba(244, 63, 94, 0.4); color:#fda4af; font-size:12px; font-weight:700; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:15px; height:15px;"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/></svg>
                            <span>সংরক্ষিত ছবি</span>
                        </button>
                    </div>

                    <div style="font-size:11px; color:#94a3b8; font-family:'Kalpurush', 'SolaimanLipi', sans-serif; display:flex; align-items:center; justify-content:space-between; padding:2px 2px;">
                        <span>ব্যাকআপ অবস্থা:</span>
                        <span id="badge-intruder-chat-id" style="font-weight:700; color:#38bdf8;">ফোনে সংরক্ষিত (অফলাইন)</span>
                    </div>
                </div>
            </div>

            <!-- ৩. আনলক ও অ্যাডমিন সেন্টার -->
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

            <!-- ৬. ফটো ব্যাকআপ (টেলিগ্রাম) ডায়ালগ -->
            <div id="intruder-perm-dialog-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99998; justify-content:center; align-items:center; backdrop-filter:blur(5px); padding:16px; box-sizing:border-box;">
                <div style="background:#1e293b; border:1px solid #0284c7; border-radius:16px; max-width:380px; width:100%; padding:20px; color:#fff; box-shadow:0 12px 30px rgba(0,0,0,0.6); font-family:'Kalpurush', 'SolaimanLipi', sans-serif;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:36px; height:36px; border-radius:10px; background:rgba(14,165,233,0.2); display:flex; align-items:center; justify-content:center;">
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:20px; height:20px; color:#38bdf8;"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                            </div>
                            <div>
                                <h3 style="margin:0; font-size:15px; font-weight:800;">ফটো ব্যাকআপ (টেলিগ্রাম)</h3>
                                <span style="font-size:11px; color:#94a3b8;">ছবি ও লোকেশন ক্লাউড ব্যাকআপ</span>
                            </div>
                        </div>
                        <button id="btn-cancel-intruder-perm" style="background:transparent; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">&times;</button>
                    </div>

                    <p style="font-size:12px; color:#cbd5e1; line-height:1.5; margin:0 0 12px 0;">
                        ছবিগুলো আপনার ফোনের নিজস্ব মেমোরিতে সেভ থাকে। আপনি চাইলে বাড়তি সুরক্ষায় সরাসরি আপনার ব্যক্তিগত টেলিগ্রামেও ব্যাকআপ রাখতে পারেন।
                    </p>

                    <!-- ধাপ ১: আইডি সংগ্রহ -->
                    <div style="background:#0f172a; border-radius:10px; padding:10px; margin-bottom:12px; border:1px solid #334155;">
                        <div style="font-size:11.5px; font-weight:700; color:#38bdf8; margin-bottom:4px;">ধাপ ১: আপনার চ্যাট আইডি সংগ্রহ করুন</div>
                        <div style="font-size:11px; color:#94a3b8; line-height:1.4; margin-bottom:8px;">নিচের বাটনে চাপ দিয়ে Start করলেই সরাসরি আপনার চ্যাট আইডি পাবেন:</div>
                        <a href="https://t.me/helpniche_bot?start=chatid" target="_blank" rel="noreferrer" style="display:flex; align-items:center; justify-content:center; gap:6px; background:#0ea5e9; color:#fff; font-size:12px; font-weight:700; padding:8px 12px; border-radius:8px; text-decoration:none;">
                            <span>চ্যাট আইডি নিন</span>
                        </a>
                    </div>

                    <!-- ধাপ ২: চ্যাট আইডি ইনপুট -->
                    <div style="margin-bottom:12px;">
                        <label style="display:block; font-size:11.5px; font-weight:700; color:#cbd5e1; margin-bottom:5px;">ধাপ ২: আপনার টেলিগ্রাম চ্যাট আইডি দিন:</label>
                        <input type="text" id="modal-intruder-chat-id" placeholder="যেমন: 6271611009" style="width:100%; box-sizing:border-box; padding:10px 12px; background:#0f172a; border:1px solid #475569; border-radius:8px; color:#fff; font-size:13px; font-weight:600; outline:none;" />
                        <div id="modal-chat-id-error" style="color:#f87171; font-size:11px; margin-top:5px; display:none;"></div>
                    </div>

                    <!-- টেস্ট বাটন -->
                    <div style="margin-bottom:12px;">
                        <button id="btn-test-telegram-alert" style="width:100%; padding:9px; background:rgba(16,185,129,0.15); color:#34d399; border:1px solid #059669; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
                            কানেকশন টেস্ট করুন
                        </button>
                        <div id="telegram-chat-id-status" style="font-size:11px; margin-top:6px; line-height:1.4; display:none;"></div>
                    </div>

                    <div style="display:flex; gap:8px;">
                        <button id="btn-remove-telegram-backup" style="flex:1; padding:10px; background:#334155; color:#cbd5e1; border:none; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">ব্যাকআপ বন্ধ রাখুন</button>
                        <button id="btn-confirm-intruder-perm" style="flex:1; padding:10px; background:#10b981; color:#000; border:none; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer;">ব্যাকআপ সেভ করুন</button>
                    </div>
                </div>
            </div>

            <!-- ৭. অনুপ্রবেশকারী ছবি ও ফুল স্ক্রিন গ্যালারি মডাল -->
            <div id="intruder-logs-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:#0b1120; z-index:99999; flex-direction:column; overflow:hidden;">
                <!-- গ্যালারি হেডার -->
                <div style="background:#1e293b; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button id="btn-close-intruder-logs" style="background:#334155; border:none; color:#fff; font-size:14px; font-weight:bold; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">X</button>
                        <div>
                            <h3 style="margin:0; font-size:15px; font-weight:800; color:#fff;">অনুপ্রবেশকারীর ছবি ও হিস্ট্রি</h3>
                            <span id="intruder-logs-counter" style="font-size:11px; color:#94a3b8;">০টি ছবি সংরক্ষিত</span>
                        </div>
                    </div>
                    <button id="btn-clear-intruder-logs" style="padding:6px 12px; border:1px solid #ef4444; background:rgba(239, 68, 68, 0.15); color:#fca5a5; border-radius:8px; font-size:11.5px; font-weight:bold; cursor:pointer;">সব মুছুন</button>
                </div>

                <!-- পাসপোর্ট সাইজ গ্রিড কন্টেইনার (৩ কলাম গ্রিড - ১৬-২০টি ছবি দেখার উপযোগী) -->
                <div id="intruder-logs-container" style="flex:1; overflow-y:auto; padding:14px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; align-content:start;">
                    <div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:13px; padding:40px 0;">কোনো অনুপ্রবেশকারী ছবি নেই</div>
                </div>
            </div>

            <!-- ৮. বড় করে ছবি দেখার ডিটেইল পপ-আপ -->
            <div id="intruder-detail-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:100000; justify-content:center; align-items:center; backdrop-filter:blur(6px); padding:16px; box-sizing:border-box;">
                <div style="background:#1e293b; border-radius:16px; max-width:380px; width:100%; padding:18px; color:#fff; text-align:center; box-shadow:0 15px 35px rgba(0,0,0,0.7); border:1px solid #475569;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="font-size:14px; font-weight:800; color:#f87171;">অবৈধ আনলক প্রচেষ্টা</span>
                        <button id="btn-close-intruder-detail" style="background:#334155; border:none; color:#fff; font-size:13px; font-weight:bold; width:28px; height:28px; border-radius:6px; cursor:pointer;">X</button>
                    </div>

                    <img id="intruder-detail-img" src="" alt="Intruder Full" style="width:100%; max-height:55vh; object-fit:contain; border-radius:10px; background:#0f172a; border:1px solid #334155; margin-bottom:10px;" />

                    <div id="intruder-detail-date" style="font-size:12px; color:#cbd5e1; margin-bottom:14px; font-weight:600;"></div>

                    <div style="display:flex; gap:10px;">
                        <button id="btn-delete-single-log" style="flex:1; padding:10px; background:rgba(239, 68, 68, 0.2); border:1px solid #ef4444; color:#fca5a5; border-radius:8px; font-size:12px; font-weight:bold; cursor:pointer;">এই ছবি মুছুন</button>
                        <button id="btn-dismiss-detail-modal" style="flex:1; padding:10px; background:#475569; border:none; color:#fff; border-radius:8px; font-size:12px; cursor:pointer;">বন্ধ করুন</button>
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

    // অনুপ্রবেশকারী ক্যামেরা সিকিউরিটি হ্যান্ডলার
    let isIntruderEnabled = localStorage.getItem('intruder_selfie_enabled') === 'true';
    let intruderThreshold = parseInt(localStorage.getItem('intruder_selfie_threshold') || '1', 10);
    const btnToggleIntruder = document.getElementById('btn-toggle-intruder-camera');
    const intruderKnob = document.getElementById('intruder-camera-knob');
    const intruderTitle = document.getElementById('intruder-camera-title');
    const intruderDesc = document.getElementById('intruder-camera-desc');
    const btnThresh1 = document.getElementById('btn-thresh-1');
    const btnThresh2 = document.getElementById('btn-thresh-2');
    const btnViewIntruderLogs = document.getElementById('btn-view-intruder-logs');
    const intruderPermDialog = document.getElementById('intruder-perm-dialog-overlay');
    const btnCancelIntruderPerm = document.getElementById('btn-cancel-intruder-perm');
    const btnConfirmIntruderPerm = document.getElementById('btn-confirm-intruder-perm');

    // গ্যালারি ও ডিটেইল মডাল রেফারেন্স
    const intruderLogsModal = document.getElementById('intruder-logs-modal-overlay');
    const btnCloseIntruderLogs = document.getElementById('btn-close-intruder-logs');
    const btnClearIntruderLogs = document.getElementById('btn-clear-intruder-logs');
    const intruderLogsContainer = document.getElementById('intruder-logs-container');
    const intruderLogsCounter = document.getElementById('intruder-logs-counter');
    const intruderDetailModal = document.getElementById('intruder-detail-modal-overlay');
    const btnCloseIntruderDetail = document.getElementById('btn-close-intruder-detail');
    const btnDismissDetailModal = document.getElementById('btn-dismiss-detail-modal');
    const btnDeleteSingleLog = document.getElementById('btn-delete-single-log');
    const intruderDetailImg = document.getElementById('intruder-detail-img');
    const intruderDetailDate = document.getElementById('intruder-detail-date');

    let currentSelectedLogId = null;
    let cachedIntruderLogs = [];

    function updateThresholdButtons(thresh) {
        intruderThreshold = thresh;
        if (btnThresh1 && btnThresh2) {
            if (thresh === 1) {
                btnThresh1.style.background = '#0ea5e9';
                btnThresh1.style.color = '#fff';
                btnThresh2.style.background = '#334155';
                btnThresh2.style.color = '#94a3b8';
            } else {
                btnThresh2.style.background = '#0ea5e9';
                btnThresh2.style.color = '#fff';
                btnThresh1.style.background = '#334155';
                btnThresh1.style.color = '#94a3b8';
            }
        }
    }

    function updateChatIdBadge(chatId) {
        const badge = document.getElementById('badge-intruder-chat-id');
        if (!badge) return;
        if (chatId && chatId.trim()) {
            badge.innerText = 'ক্লাউড ব্যাকআপ: ' + chatId.trim();
            badge.style.color = '#34d399';
        } else {
            badge.innerText = 'ফোনে সংরক্ষিত (অফলাইন)';
            badge.style.color = '#38bdf8';
        }
    }

    function updateIntruderToggleUI(enabled) {
        if (!btnToggleIntruder || !intruderKnob || !intruderTitle || !intruderDesc) return;
        const intruderShieldVal = document.getElementById('intruder-shield-val');
        if (intruderShieldVal) {
            intruderShieldVal.innerText = enabled ? 'Active' : 'Inactive';
            intruderShieldVal.style.color = enabled ? 'var(--accent-green, #4CAF50)' : '#94a3b8';
        }
        if (enabled) {
            btnToggleIntruder.style.background = '#10b981';
            intruderKnob.style.left = '25px';
            intruderTitle.innerText = 'অনুপ্রবেশকারীর ছবি তোলা (চালু)';
            intruderTitle.style.color = '#34d399';
            intruderDesc.innerText = 'লক স্ক্রিনে ভুল পাসওয়ার্ড দিলে সামনের ক্যামেরা দিয়ে ছবি তুলে ফোনের মেমোরিতে নিরাপদে রাখবে।';
        } else {
            btnToggleIntruder.style.background = '#334155';
            intruderKnob.style.left = '3px';
            intruderTitle.innerText = 'ক্যামেরা সিকিউরিটি (বন্ধ)';
            intruderTitle.style.color = '#94a3b8';
            intruderDesc.innerText = 'ভুল পাসওয়ার্ড দিলেও কোনো ছবি তোলা হবে না।';
        }
    }

    function refreshIntruderSettings() {
        const currentSavedChatId = localStorage.getItem('intruder_telegram_chat_id') || '';
        updateChatIdBadge(currentSavedChatId);

        if (window.Capacitor?.Plugins?.UnlockPlugin?.getIntruderSettings) {
            window.Capacitor.Plugins.UnlockPlugin.getIntruderSettings().then(res => {
                if (res) {
                    if (typeof res.enabled === 'boolean') {
                        isIntruderEnabled = res.enabled;
                        localStorage.setItem('intruder_selfie_enabled', isIntruderEnabled ? 'true' : 'false');
                        updateIntruderToggleUI(isIntruderEnabled);
                    }
                    if (typeof res.threshold === 'number') {
                        intruderThreshold = res.threshold;
                        localStorage.setItem('intruder_selfie_threshold', intruderThreshold.toString());
                        updateThresholdButtons(intruderThreshold);
                    }
                    if (res.telegramChatId) {
                        localStorage.setItem('intruder_telegram_chat_id', res.telegramChatId);
                        updateChatIdBadge(res.telegramChatId);
                    }
                }
            }).catch(() => {});
        }
    }

    updateIntruderToggleUI(isIntruderEnabled);
    updateThresholdButtons(intruderThreshold);
    refreshIntruderSettings();

    const modalIntruderChatId = document.getElementById('modal-intruder-chat-id');
    const modalChatIdError = document.getElementById('modal-chat-id-error');
    const btnChangeIntruderChatId = document.getElementById('btn-change-intruder-chat-id');
    const btnTestTelegramAlert = document.getElementById('btn-test-telegram-alert');
    const telegramChatIdStatus = document.getElementById('telegram-chat-id-status');

    // টগল ক্লিকে ক্যামেরা গার্ড অন/অফ
    if (btnToggleIntruder) {
        btnToggleIntruder.onclick = async () => {
            if (!isIntruderEnabled) {
                // সরাসরি শুধুমাত্র ক্যামেরা পারমিশন চাওয়া (লোকেশন পারমিশন এখানে চাওয়া হবে না)
                if (window.Capacitor?.Plugins?.UnlockPlugin?.requestCameraPermission) {
                    try {
                        await window.Capacitor.Plugins.UnlockPlugin.requestCameraPermission();
                    } catch(e) {
                        console.error("Failed to request camera permission:", e);
                    }
                }

                isIntruderEnabled = true;
                localStorage.setItem('intruder_selfie_enabled', 'true');
                updateIntruderToggleUI(true);

                if (window.Capacitor?.Plugins?.UnlockPlugin?.setIntruderSettings) {
                    try {
                        await window.Capacitor.Plugins.UnlockPlugin.setIntruderSettings({
                            enabled: true,
                            threshold: intruderThreshold,
                            telegramChatId: localStorage.getItem('intruder_telegram_chat_id') || ''
                        });
                    } catch(e) {
                        console.error("Failed to enable intruder settings:", e);
                    }
                }
            } else {
                isIntruderEnabled = false;
                localStorage.setItem('intruder_selfie_enabled', 'false');
                updateIntruderToggleUI(false);
                if (window.Capacitor?.Plugins?.UnlockPlugin?.setIntruderSettings) {
                    try {
                        await window.Capacitor.Plugins.UnlockPlugin.setIntruderSettings({
                            enabled: false,
                            threshold: intruderThreshold
                        });
                    } catch(e) {
                        console.error("Failed to disable intruder settings:", e);
                    }
                }
            }
        };
    }

    // ফটো ব্যাকআপ বাটন (টেলিগ্রাম ব্যাকআপ ডায়ালগ ওপেন)
    const btnOpenTelegramBackup = document.getElementById('btn-open-telegram-backup');
    if (btnOpenTelegramBackup) {
        btnOpenTelegramBackup.onclick = () => {
            if (modalIntruderChatId) {
                modalIntruderChatId.value = localStorage.getItem('intruder_telegram_chat_id') || '';
            }
            if (modalChatIdError) {
                modalChatIdError.style.display = 'none';
            }
            if (telegramChatIdStatus) {
                telegramChatIdStatus.style.display = 'none';
            }
            if (intruderPermDialog) {
                intruderPermDialog.style.display = 'flex';
            }
        };
    }

    // ব্যাকআপ ডায়ালগ বন্ধ
    if (btnCancelIntruderPerm) {
        btnCancelIntruderPerm.onclick = () => {
            if (intruderPermDialog) intruderPermDialog.style.display = 'none';
        };
    }

    // ব্যাকআপ সেভ বাটন
    if (btnConfirmIntruderPerm) {
        btnConfirmIntruderPerm.onclick = async () => {
            const enteredChatId = modalIntruderChatId ? modalIntruderChatId.value.trim() : '';
            if (!enteredChatId) {
                if (modalChatIdError) {
                    modalChatIdError.innerText = 'অনুগ্রহ করে একটি টেলিগ্রাম চ্যাট আইডি লিখুন অথবা ব্যাকআপ বন্ধ রাখুন চাপুন।';
                    modalChatIdError.style.display = 'block';
                }
                if (modalIntruderChatId) modalIntruderChatId.focus();
                return;
            }

            if (modalChatIdError) modalChatIdError.style.display = 'none';
            if (intruderPermDialog) intruderPermDialog.style.display = 'none';

            // ব্যাকআপ যুক্ত করার সময় লোকেশন পারমিশন চাওয়া
            if (window.Capacitor?.Plugins?.UnlockPlugin?.requestLocationPermission) {
                try {
                    await window.Capacitor.Plugins.UnlockPlugin.requestLocationPermission();
                } catch(e) {
                    console.error("Failed to request location permission on backup add:", e);
                }
            }

            localStorage.setItem('intruder_telegram_chat_id', enteredChatId);
            updateChatIdBadge(enteredChatId);

            if (window.Capacitor?.Plugins?.UnlockPlugin?.setIntruderSettings) {
                try {
                    await window.Capacitor.Plugins.UnlockPlugin.setIntruderSettings({
                        telegramChatId: enteredChatId
                    });
                } catch(e) {
                    console.error("Failed to save telegram backup chat ID:", e);
                }
            }
            alert('টেলিগ্রাম ক্লাউড ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে।');
        };
    }

    // ব্যাকআপ বন্ধ বাটন
    const btnRemoveTelegramBackup = document.getElementById('btn-remove-telegram-backup');
    if (btnRemoveTelegramBackup) {
        btnRemoveTelegramBackup.onclick = async () => {
            if (modalChatIdError) modalChatIdError.style.display = 'none';
            if (modalIntruderChatId) modalIntruderChatId.value = '';
            if (intruderPermDialog) intruderPermDialog.style.display = 'none';

            localStorage.removeItem('intruder_telegram_chat_id');
            updateChatIdBadge('');

            if (window.Capacitor?.Plugins?.UnlockPlugin?.setIntruderSettings) {
                try {
                    await window.Capacitor.Plugins.UnlockPlugin.setIntruderSettings({
                        telegramChatId: ''
                    });
                } catch(e) {
                    console.error("Failed to clear telegram backup chat ID:", e);
                }
            }
            alert('টেলিগ্রাম ব্যাকআপ বন্ধ করা হয়েছে। ছবি শুধুমাত্র ফোনের মেমোরিতে সেভ থাকবে।');
        };
    }

    if (btnThresh1) {
        btnThresh1.onclick = async () => {
            updateThresholdButtons(1);
            localStorage.setItem('intruder_selfie_threshold', '1');
            if (window.Capacitor?.Plugins?.UnlockPlugin?.setIntruderSettings) {
                await window.Capacitor.Plugins.UnlockPlugin.setIntruderSettings({ threshold: 1 });
            }
        };
    }

    if (btnThresh2) {
        btnThresh2.onclick = async () => {
            updateThresholdButtons(2);
            localStorage.setItem('intruder_selfie_threshold', '2');
            if (window.Capacitor?.Plugins?.UnlockPlugin?.setIntruderSettings) {
                await window.Capacitor.Plugins.UnlockPlugin.setIntruderSettings({ threshold: 2 });
            }
        };
    }

    if (btnTestTelegramAlert) {
        btnTestTelegramAlert.onclick = async () => {
            const chatIdVal = localStorage.getItem('intruder_telegram_chat_id') || (modalIntruderChatId ? modalIntruderChatId.value.trim() : '');
            if (!chatIdVal) {
                if (telegramChatIdStatus) {
                    telegramChatIdStatus.innerText = 'প্রথমে চ্যাট আইডি যুক্ত করুন।';
                    telegramChatIdStatus.style.color = '#f87171';
                    telegramChatIdStatus.style.display = 'block';
                }
                return;
            }

            if (telegramChatIdStatus) {
                telegramChatIdStatus.innerText = 'টেস্ট মেসেজ পাঠানো হচ্ছে...';
                telegramChatIdStatus.style.color = '#38bdf8';
                telegramChatIdStatus.style.display = 'block';
            }
            try {
                if (window.Capacitor?.Plugins?.UnlockPlugin?.testTelegramNotification) {
                    const res = await window.Capacitor.Plugins.UnlockPlugin.testTelegramNotification({
                        chatId: chatIdVal
                    });
                    if (res && res.success) {
                        if (telegramChatIdStatus) {
                            telegramChatIdStatus.innerText = 'টেস্ট মেসেজ সফলভাবে আপনার টেলিগ্রামে পৌঁছেছে! আপনার আইডি সঠিকভাবে সংযুক্ত।';
                            telegramChatIdStatus.style.color = '#34d399';
                            telegramChatIdStatus.style.display = 'block';
                        }
                    } else {
                        const errMsg = res?.errorMsg || 'মেসেজ পাঠানো সম্ভব হয়নি। প্রথমে টেলিগ্রাম বটে গিয়ে Start চাপুন।';
                        if (telegramChatIdStatus) {
                            telegramChatIdStatus.innerText = errMsg;
                            telegramChatIdStatus.style.color = '#f87171';
                            telegramChatIdStatus.style.display = 'block';
                        }
                    }
                }
            } catch(e) {
                if (telegramChatIdStatus) {
                    telegramChatIdStatus.innerText = 'ত্রুটি: ' + e.message;
                    telegramChatIdStatus.style.color = '#f87171';
                    telegramChatIdStatus.style.display = 'block';
                }
            }
        };
    }

    async function loadIntruderLogs() {
        if (!intruderLogsContainer) return;
        intruderLogsContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:12px; padding:30px 0;">লোড হচ্ছে...</div>';
        try {
            if (window.Capacitor?.Plugins?.UnlockPlugin?.getIntruderLogs) {
                const res = await window.Capacitor.Plugins.UnlockPlugin.getIntruderLogs();
                cachedIntruderLogs = res?.logs || [];
                if (intruderLogsCounter) {
                    intruderLogsCounter.innerText = `${cachedIntruderLogs.length}টি ছবি সংরক্ষিত`;
                }
                if (cachedIntruderLogs.length === 0) {
                    intruderLogsContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:13px; padding:40px 0;">কোনো অনুপ্রবেশকারী ছবি পাওয়া যায়নি</div>';
                    return;
                }
                intruderLogsContainer.innerHTML = cachedIntruderLogs.map((item, idx) => `
                    <div class="intruder-thumb-card" data-idx="${idx}" style="background:#0f172a; border:1px solid #334155; border-radius:10px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; box-shadow:0 4px 10px rgba(0,0,0,0.3); transition:transform 0.2s ease;">
                        <div style="width:100%; aspect-ratio:3/4; overflow:hidden; background:#020617; display:flex; align-items:center; justify-content:center;">
                            <img src="${item.image}" alt="Intruder" style="width:100%; height:100%; object-fit:cover;" />
                        </div>
                        <div style="padding:6px 4px; width:100%; text-align:center; box-sizing:border-box; background:#1e293b; border-top:1px solid #334155;">
                            <div style="font-size:10px; color:#f87171; font-weight:700;">অবৈধ আনলক</div>
                            <div style="font-size:9.5px; color:#cbd5e1; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.dateText}</div>
                        </div>
                    </div>
                `).join('');

                intruderLogsContainer.querySelectorAll('.intruder-thumb-card').forEach(card => {
                    card.onclick = (e) => {
                        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                        const item = cachedIntruderLogs[idx];
                        if (item) {
                            openIntruderDetail(item);
                        }
                    };
                });
            } else {
                intruderLogsContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:12px; padding:30px 0;">প্লাগইন সংযুক্ত নয়</div>';
            }
        } catch (err) {
            intruderLogsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#f87171; font-size:12px; padding:30px 0;">ত্রুটি: ${err.message}</div>`;
        }
    }

    function openIntruderDetail(item) {
        currentSelectedLogId = item.id;
        if (intruderDetailImg) intruderDetailImg.src = item.image;
        if (intruderDetailDate) intruderDetailDate.innerText = `সময়: ${item.dateText}`;
        if (intruderDetailModal) intruderDetailModal.style.display = 'flex';
    }

    if (btnCloseIntruderDetail) {
        btnCloseIntruderDetail.onclick = () => {
            if (intruderDetailModal) intruderDetailModal.style.display = 'none';
        };
    }

    if (btnDismissDetailModal) {
        btnDismissDetailModal.onclick = () => {
            if (intruderDetailModal) intruderDetailModal.style.display = 'none';
        };
    }

    if (btnDeleteSingleLog) {
        btnDeleteSingleLog.onclick = async () => {
            if (currentSelectedLogId && window.Capacitor?.Plugins?.UnlockPlugin?.deleteIntruderLog) {
                await window.Capacitor.Plugins.UnlockPlugin.deleteIntruderLog({ id: currentSelectedLogId });
                if (intruderDetailModal) intruderDetailModal.style.display = 'none';
                loadIntruderLogs();
            }
        };
    }

    if (btnViewIntruderLogs) {
        btnViewIntruderLogs.onclick = () => {
            if (intruderLogsModal) {
                intruderLogsModal.style.display = 'flex';
                loadIntruderLogs();
            }
        };
    }

    if (btnCloseIntruderLogs) {
        btnCloseIntruderLogs.onclick = () => {
            if (intruderLogsModal) intruderLogsModal.style.display = 'none';
        };
    }

    if (btnClearIntruderLogs) {
        btnClearIntruderLogs.onclick = async () => {
            if (confirm("সব অনুপ্রবেশকারী ছবি মুছে ফেলতে চান?")) {
                if (window.Capacitor?.Plugins?.UnlockPlugin?.clearAllIntruderLogs) {
                    await window.Capacitor.Plugins.UnlockPlugin.clearAllIntruderLogs();
                    loadIntruderLogs();
                }
            }
        };
    }

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
    const intruderShieldEl = document.getElementById('intruder-shield-val');
    if (intruderShieldEl) {
        const isIntruderOn = localStorage.getItem('intruder_selfie_enabled') === 'true';
        intruderShieldEl.innerText = (isIntruderOn && status.adminActive) ? 'Active' : 'Inactive';
        intruderShieldEl.style.color = (isIntruderOn && status.adminActive) ? '#34d399' : '#94a3b8';
    }
};