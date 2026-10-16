/* ==========================================================================
   DONATION & SADQAH SYSTEM (FULLY DYNAMIC WITH SUPABASE & TELEGRAM)
   ========================================================================== */

(function() {
    'use strict';

    const TELEGRAM_BOT_TOKEN = atob("ODgwODM4MTY5MDpBQUgwd054YnRyYU9oeFA2cTN2N21RdXFmaENRSFhYNkVNTQ==");
    const ADMIN_CHAT_ID = atob("NjI3MTYxMTAwOQ==");
    const SUPABASE_PROJECT_URL = "https://dlxmzzvcpoysoouakadt.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseG16enZjcG95c29vdWFrYWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzA3NDEsImV4cCI6MjA5MzcwNjc0MX0.iXQRyqevSoRXvpUG291OFr4bzQq6yEoN6lXvikoJK5g";

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

    // লোকাল স্টোরেজ থেকে ক্যাশড কনফিগ লোড করা
    try {
        const cached = localStorage.getItem('cached_donation_config');
        if (cached) {
            const parsed = JSON.parse(cached);
            activeConfig = { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch (e) {}

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
        } catch (e) {
            // নেটওয়ার্ক সমস্যা বা টেবিল না থাকলে নীরব থাকবে এবং ডিফল্ট কনফিগ চলবে
        }
    }

    // অ্যাডমিনকে সরাসরি টেলিগ্রামে হাদিয়া সাবমিশন পাঠানো
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
            console.error("Telegram notification failed:", e);
        }
    }

    // Supabase এ ট্রানজ্যাকশন হিস্ট্রি জমা দেওয়া (ঐচ্ছিক ব্যাকআপ)
    async function recordDonationToSupabase(record) {
        try {
            await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/donations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(record)
            });
        } catch (e) {}
    }

    // অ্যাপ ওপেন বা আনলক ট্র্যাক করা
    function trackAppOpen() {
        const totalDonated = parseFloat(localStorage.getItem('donation_total_amount') || '0');
        let openCount = parseInt(localStorage.getItem('donation_open_count') || '0', 10) + 1;
        localStorage.setItem('donation_open_count', openCount.toString());

        const lastPrompt = parseInt(localStorage.getItem('donation_last_prompt_count') || '0', 10);
        const threshold = totalDonated > 0 ? (activeConfig.donor_threshold || 100) : (activeConfig.non_donor_threshold || 15);

        if ((openCount - lastPrompt) >= threshold) {
            // সামান্য বিরতি দিয়ে ডায়ালগ দেখানো যাতে ইউআই পুরোপুরি লোড হতে পারে
            setTimeout(() => {
                showDonationModal();
            }, 1200);
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
            z-index: 99999;
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
                        <button id="btn-donation-back" style="display:none; background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; padding:0 4px; line-height:1;">&larr;</button>
                        <h3 id="donation-modal-header-title" style="margin:0; font-size:16px; font-weight:800; color:#38bdf8;">অ্যাপ পরিচালনায় হাদিয়া</h3>
                    </div>
                    <button id="btn-donation-close-x" style="background:transparent; border:none; color:#94a3b8; font-size:22px; cursor:pointer; line-height:1;">&times;</button>
                </div>

                <!-- মূল কন্টেন্ট বডি -->
                <div id="donation-modal-body" style="padding: 20px; overflow-y: auto; max-height: 75vh;">
                    <!-- ভিউ ১: সাধারণ আবেদন বা পূর্বের ডোনার রিকল -->
                    <div id="donation-view-intro">
                        <div id="donation-badge-container" style="margin-bottom:12px;"></div>
                        <p id="donation-intro-text" style="font-size:13px; color:#cbd5e1; line-height:1.6; margin:0 0 20px 0;"></p>

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
                    <div id="donation-view-methods" style="display:none;">
                        <p style="font-size:13px; color:#cbd5e1; margin:0 0 16px 0; line-height:1.5;">
                            যে মাধ্যমে আপনি হাদিয়া বা অনুদান পাঠাতে চান তা নির্বাচন করুন:
                        </p>

                        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                            <button class="donation-method-btn" data-method="bkash" style="
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                padding: 14px 16px;
                                background: rgba(226, 19, 110, 0.12);
                                border: 1.5px solid #e2136e;
                                border-radius: 14px;
                                color: #fff;
                                cursor: pointer;
                                text-align: left;
                                transition: transform 0.2s, background 0.2s;
                            ">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:42px; height:42px; border-radius:12px; background:#e2136e; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 3px 8px rgba(226,19,110,0.35);">
                                        <svg viewBox="0 0 100 100" style="width:26px; height:26px; fill:#fff;">
                                            <polygon points="5,52 46,14 38,58" />
                                            <polygon points="46,14 94,22 38,58" fill="#fbcfe8" />
                                            <polygon points="38,58 66,92 94,22" />
                                            <polygon points="46,14 74,4 94,22" fill="#fff" />
                                            <polygon points="38,58 52,75 66,92" fill="#f472b6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style="font-size:15px; font-weight:800; color:#ff4081;">বিকাশ (bKash)</div>
                                        <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">Personal (Send Money)</div>
                                    </div>
                                </div>
                                <span style="font-size:12px; font-weight:700; color:#ff4081; background:rgba(226,19,110,0.2); padding:6px 10px; border-radius:8px;">সিলেক্ট করুন &rarr;</span>
                            </button>

                            <button class="donation-method-btn" data-method="nagad" style="
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                padding: 14px 16px;
                                background: rgba(247, 148, 29, 0.12);
                                border: 1.5px solid #f7941d;
                                border-radius: 14px;
                                color: #fff;
                                cursor: pointer;
                                text-align: left;
                                transition: transform 0.2s, background 0.2s;
                            ">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, #f7941d 0%, #ee3124 100%); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 3px 8px rgba(247,148,29,0.35);">
                                        <svg viewBox="0 0 100 100" style="width:26px; height:26px;">
                                            <path d="M50 8 C30 8 16 26 20 48 C22 58 30 68 40 76 C46 81 50 88 50 92 C50 86 56 80 62 74 C72 64 80 52 80 38 C80 20 66 8 50 8 Z" fill="#fff" />
                                            <path d="M50 28 C42 28 36 36 38 46 C39 52 44 58 50 64 C56 58 61 52 62 46 C64 36 58 28 50 28 Z" fill="#f7941d" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style="font-size:15px; font-weight:800; color:#fb923c;">নগদ (Nagad)</div>
                                        <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">Personal (Send Money)</div>
                                    </div>
                                </div>
                                <span style="font-size:12px; font-weight:700; color:#fb923c; background:rgba(247,148,29,0.2); padding:6px 10px; border-radius:8px;">সিলেক্ট করুন &rarr;</span>
                            </button>
                        </div>
                    </div>

                    <!-- ভিউ ৩: পেমেন্ট বিস্তারিত ও ট্রানজ্যাকশন সাবমিশন ফর্ম -->
                    <div id="donation-view-form" style="display:none;">
                        <!-- মেথড ইনফো কার্ড -->
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

                        <p style="font-size:12px; color:#94a3b8; line-height:1.4; margin:0 0 14px 0;">
                            উপরের নম্বরে Send Money সম্পন্ন করার পর নিচের ফর্মটি পূরণ করে সাবমিট করুন যাতে অ্যাপ আপনার অনুদান মনে রাখতে পারে:
                        </p>

                        <!-- সাবমিশন ইনপুটসমূহ -->
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

                    <!-- ভিউ ৪: ধন্যবাদ ও কৃতজ্ঞতা প্রকাশ -->
                    <div id="donation-view-success" style="display:none; text-align:center; padding:10px 0;">
                        <div style="
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                            background: rgba(16, 185, 129, 0.2);
                            border: 2px solid #10b981;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 16px auto;
                            color: #10b981;
                            font-size: 24px;
                            font-weight: bold;
                        ">&check;</div>

                        <h3 style="font-size:18px; font-weight:800; color:#34d399; margin:0 0 10px 0;">জাযাকাল্লাহু খাইরান!</h3>
                        <p style="font-size:12.5px; color:#cbd5e1; line-height:1.6; margin:0 0 16px 0;">
                            আপনার হাদিয়া ও সহযোগিতার তথ্য সফলভাবে সংরক্ষিত হয়েছে। মহান আল্লাহ আপনার দানকে কবুল করুন এবং আপনার রিজিক ও জীবনে বরকত দান করুন।
                        </p>

                        <div id="donation-success-summary" style="
                            background: #020617;
                            border: 1px solid #334155;
                            border-radius: 10px;
                            padding: 12px;
                            font-size: 12px;
                            color: #38bdf8;
                            margin-bottom: 18px;
                            line-height: 1.5;
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
                        ">সম্পন্ন / বন্ধ করুন</button>
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
        const btnLater = document.getElementById('btn-donation-action-later');
        const btnCopy = document.getElementById('btn-donation-copy-num');
        const btnSubmit = document.getElementById('btn-donation-submit-trx');
        const btnSuccessClose = document.getElementById('btn-donation-success-close');

        function dismissModal() {
            if (overlay) overlay.style.display = 'none';
            // কাউন্টার রিসেট যাতে পরবর্তী সাইকেলে আবার আসে
            const openCount = parseInt(localStorage.getItem('donation_open_count') || '0', 10);
            localStorage.setItem('donation_last_prompt_count', openCount.toString());
        }

        if (btnCloseX) btnCloseX.onclick = dismissModal;
        if (btnLater) btnLater.onclick = dismissModal;
        if (btnSuccessClose) btnSuccessClose.onclick = dismissModal;

        if (btnBack) {
            btnBack.onclick = () => {
                const viewForm = document.getElementById('donation-view-form');
                const viewMethods = document.getElementById('donation-view-methods');
                if (viewForm && viewForm.style.display !== 'none') {
                    showView('methods');
                } else {
                    showView('intro');
                }
            };
        }

        if (btnDonate) {
            btnDonate.onclick = () => {
                showView('methods');
            };
        }

        document.querySelectorAll('.donation-method-btn').forEach(btn => {
            btn.onclick = () => {
                const method = btn.getAttribute('data-method');
                selectMethod(method);
            };
        });

        if (btnCopy) {
            btnCopy.onclick = () => {
                const numEl = document.getElementById('donation-card-number');
                if (numEl && numEl.innerText) {
                    const cleanNum = numEl.innerText.replace(/\s+/g, '');
                    navigator.clipboard.writeText(cleanNum).then(() => {
                        const originalText = btnCopy.innerText;
                        btnCopy.innerText = "নম্বর কপি হয়েছে!";
                        btnCopy.style.background = "#10b981";
                        setTimeout(() => {
                            btnCopy.innerText = originalText;
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
        const btnBack = document.getElementById('btn-donation-back');
        const headerTitle = document.getElementById('donation-modal-header-title');

        if (viewIntro) viewIntro.style.display = 'none';
        if (viewMethods) viewMethods.style.display = 'none';
        if (viewForm) viewForm.style.display = 'none';
        if (viewSuccess) viewSuccess.style.display = 'none';

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
            if (headerTitle) headerTitle.innerText = "কৃতজ্ঞতা ও শুকরিয়া";
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
                    <div style="width:46px; height:46px; border-radius:14px; background:linear-gradient(135deg, #f7941d 0%, #ee3124 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(247,148,29,0.4);">
                        <svg viewBox="0 0 100 100" style="width:30px; height:30px;">
                            <path d="M50 8 C30 8 16 26 20 48 C22 58 30 68 40 76 C46 81 50 88 50 92 C50 86 56 80 62 74 C72 64 80 52 80 38 C80 20 66 8 50 8 Z" fill="#fff" />
                            <path d="M50 28 C42 28 36 36 38 46 C39 52 44 58 50 64 C56 58 61 52 62 46 C64 36 58 28 50 28 Z" fill="#f7941d" />
                        </svg>
                    </div>
                `;
            }
        } else {
            if (logoBadge) {
                logoBadge.innerHTML = `
                    <div style="width:46px; height:46px; border-radius:14px; background:#e2136e; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(226,19,110,0.4);">
                        <svg viewBox="0 0 100 100" style="width:30px; height:30px; fill:#fff;">
                            <polygon points="5,52 46,14 38,58" />
                            <polygon points="46,14 94,22 38,58" fill="#fbcfe8" />
                            <polygon points="38,58 66,92 94,22" />
                            <polygon points="46,14 74,4 94,22" fill="#fff" />
                            <polygon points="38,58 52,75 66,92" fill="#f472b6" />
                        </svg>
                    </div>
                `;
            }
        }

        if (cardTitle) cardTitle.innerText = name + " - Send Money";
        if (cardNumber) cardNumber.innerText = num;
        if (headerTitle) headerTitle.innerText = name;

        // ইনপুট রিসেট
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

    // ট্রানজ্যাকশন সাবমিট হ্যান্ডলার
    async function handleDonationSubmit() {
        const senderInput = document.getElementById('donation-input-sender');
        const amountInput = document.getElementById('donation-input-amount');
        const trxInput = document.getElementById('donation-input-trxid');
        const errEl = document.getElementById('donation-form-error');
        const btnSubmit = document.getElementById('btn-donation-submit-trx');

        const sender = senderInput ? senderInput.value.trim() : '';
        const amountVal = amountInput ? parseFloat(amountInput.value) : 0;
        const trxId = trxInput ? trxInput.value.trim() : '';

        if (!sender || sender.length < 6) {
            if (errEl) {
                errEl.innerText = "অনুগ্রহ করে আপনার প্রেরক নম্বরটি লিখুন।";
                errEl.style.display = "block";
            }
            if (senderInput) senderInput.focus();
            return;
        }

        if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
            if (errEl) {
                errEl.innerText = "অনুগ্রহ করে প্রেরিত টাকার পরিমাণ লিখুন।";
                errEl.style.display = "block";
            }
            if (amountInput) amountInput.focus();
            return;
        }

        if (errEl) errEl.style.display = "none";
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = "সাবমিট হচ্ছে...";
        }

        const methodName = (currentSelectedMethod === 'nagad') ? 'নগদ (Nagad)' : 'বিকাশ (bKash)';
        const dateStr = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });

        // লোকাল মেমোরিতে টাকার পরিমাণ ও রেকর্ড সেভ
        let currentTotal = parseFloat(localStorage.getItem('donation_total_amount') || '0');
        currentTotal += amountVal;
        localStorage.setItem('donation_total_amount', currentTotal.toString());

        // সাবমিশন হিস্ট্রি আপডেট
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('donation_history') || '[]');
        } catch (e) {}
        history.push({
            date: new Date().toISOString(),
            dateText: dateStr,
            method: methodName,
            sender: sender,
            amount: amountVal,
            trxId: trxId || 'N/A'
        });
        localStorage.setItem('donation_history', JSON.stringify(history));

        // প্রম্পট কাউন্টার রিসেট যাতে পরবর্তী ১০০ বার পর্যন্ত ডায়ালগ না আসে
        const openCount = parseInt(localStorage.getItem('donation_open_count') || '0', 10);
        localStorage.setItem('donation_last_prompt_count', openCount.toString());

        // সেটিংস ট্যাবের ডোনেশন স্ট্যাটাস থাকলে আপডেট
        if (window.updateSettingsDonationCard) {
            window.updateSettingsDonationCard();
        }

        // টেলিগ্রাম অ্যাডমিন নোটিফিকেশন তৈরি ও প্রেরণ
        const telegramMessage = `<b>নতুন হাদিয়া / অনুদান সাবমিশন!</b>\n\n` +
            `<b>মাধ্যম:</b> ${methodName}\n` +
            `<b>প্রেরক নম্বর:</b> <code>${sender}</code>\n` +
            `<b>টাকার পরিমাণ:</b> ৳${amountVal}\n` +
            `<b>TrxID:</b> <code>${trxId || 'দেওয়া হয়নি'}</code>\n` +
            `<b>তারিখ:</b> ${dateStr}\n` +
            `<b>এই ইউজারের মোট অনুদান:</b> ৳${currentTotal}`;

        notifyTelegramAdmin(telegramMessage);

        // ক্লাউড ডেটাবেজে ব্যাকআপ
        recordDonationToSupabase({
            method: methodName,
            sender: sender,
            amount: amountVal,
            trx_id: trxId || '',
            created_at: new Date().toISOString(),
            total_user_donated: currentTotal
        });

        // সাকসেস স্ক্রিন তৈরি
        const summaryEl = document.getElementById('donation-success-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div><strong>এইমাত্র গৃহীত:</strong> ৳${amountVal} (${methodName})</div>
                <div style="margin-top:4px;"><strong>অ্যাপসে আপনার সর্বমোট অবদান:</strong> ৳${currentTotal}</div>
            `;
        }

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "সাবমিট করুন";
        }

        showView('success');
    }

    // ডায়ালগ ওপেন করা
    function showDonationModal() {
        ensureModalDOMElements();
        const overlay = document.getElementById('donation-modal-overlay');
        const badgeContainer = document.getElementById('donation-badge-container');
        const introText = document.getElementById('donation-intro-text');
        const btnDonate = document.getElementById('btn-donation-action-donate');

        const totalDonated = parseFloat(localStorage.getItem('donation_total_amount') || '0');

        if (totalDonated > 0) {
            // পূর্বের ডোনার - ১০০ বার পর রিকল বার্তা
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
                    ">সহযোগী ডোনার (মোট অবদান: ৳${totalDonated})</span>
                `;
            }
            if (introText) {
                introText.innerText = `জাযাকাল্লাহু খাইরান! আপনি ইতিপূর্বে অ্যাপসের উন্নতির জন্য মোট ৳${totalDonated} হাদিয়া পাঠিয়ে আমাদের পাশে দাঁড়িয়েছিলেন। আপনার আন্তরিক সহযোগিতা আমাদের এই পথচলাকে সচল রেখেছে। অ্যাপসের চলমান সার্ভার ও নতুন ফিচার উন্নয়ন অব্যাহত রাখতে আপনি চাইলে আবারও সামর্থ্য অনুযায়ী হাদিয়া পাঠাতে পারেন।`;
            }
            if (btnDonate) btnDonate.innerText = "আবারও হাদিয়া দিন";
        } else {
            // নতুন ইউজার - ১৫ বার পর নিয়মিত আমন্ত্রণ
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
                introText.innerText = "এই অ্যাপটি সম্পূর্ণ বিজ্ঞাপনমুক্ত এবং আপনার খেদমতে সম্পূর্ণ ফ্রিতে উন্মুক্ত রাখা হয়েছে। এর ব্যাকএন্ড সার্ভার এবং নিয়মিত উন্নয়ন কার্যক্রম সচল রাখতে আপনার আন্তরিক হাদিয়া বা অনুদান আমাদের জন্য অনেক বড় সহায়ক হবে। সামর্থ্য অনুযায়ী যে কোনো পরিমাণ অনুদান দিয়ে এই ভালো কাজে শরিক হতে পারেন।";
            }
            if (btnDonate) btnDonate.innerText = "ডোনেট করুন";
        }

        showView('intro');
        if (overlay) overlay.style.display = 'flex';
    }

    // গ্লোবাল অ্যাক্সেস
    window.openDonationModal = function() {
        showDonationModal();
    };

    window.getDonationStats = function() {
        return {
            totalDonated: parseFloat(localStorage.getItem('donation_total_amount') || '0'),
            openCount: parseInt(localStorage.getItem('donation_open_count') || '0', 10),
            history: JSON.parse(localStorage.getItem('donation_history') || '[]')
        };
    };

    // ইনিশিয়ালাইজেশন
    document.addEventListener('DOMContentLoaded', () => {
        ensureModalDOMElements();
        fetchRemoteDonationConfig();
        trackAppOpen();
    });

    // অ্যাপ ভিজিবিলিটি / ফোকাসে ট্র্যাক করা
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            trackAppOpen();
        }
    });

})();
