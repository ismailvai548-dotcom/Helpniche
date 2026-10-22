/* ==========================================================================
   MODULE: SOCIAL MEDIA CONTROL WITH STRICT TIMER APP BLOCKER
   ========================================================================== */

let installedAppsList = [];
let isFetchingApps = false;
let appSearchQuery = '';
let activeBlockTargetApp = null;
let blockUnitMode = 'minutes'; // 'minutes' or 'hours'
let blockTimerInterval = null;

let reelsBlockState = {
    enabled: false,
    remainingSeconds: 0,
    isLocked: false
};

function toBanglaDigits(num) {
    if (num === null || num === undefined) return '';
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, d => bengaliDigits[Number(d)]);
}

function formatSecondsToBangla(totalSec) {
    if (totalSec <= 0) return '০ সেকেন্ড';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) {
        return `${toBanglaDigits(m)} মিনিট ${toBanglaDigits(s)} সেকেন্ড`;
    }
    return `${toBanglaDigits(s)} সেকেন্ড`;
}

function renderReelsBlockerCardContent() {
    const isEnabled = Boolean(reelsBlockState.enabled);
    const isLocked = Boolean(reelsBlockState.isLocked && reelsBlockState.remainingSeconds > 0);
    const accentColor = isEnabled ? (isLocked ? '#ef4444' : '#10b981') : '#64748b';
    const bgGradient = isEnabled
        ? (isLocked
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)')
        : 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.95) 100%)';

    return `
        <div class="dash-card reels-blocker-card" id="card-reels-blocker" style="background: ${bgGradient}; border: 1.5px solid ${isEnabled ? accentColor : '#334155'}; border-radius: 18px; padding: 16px 18px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35); transition: all 0.3s;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
                <div style="display: flex; align-items: flex-start; gap: 14px; flex: 1;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: ${isEnabled ? (isLocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)') : 'rgba(148, 163, 184, 0.12)'}; border: 1.5px solid ${isEnabled ? accentColor : '#475569'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: ${isEnabled ? accentColor : '#94a3b8'};">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4zM8 17H5v-2h3v2zm0-4H5v-2h3v2zm6 4h-3v-2h3v2zm0-4h-3v-2h3v2zm6 4h-3v-2h3v2zm0-4h-3v-2h3v2z"/>
                        </svg>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 15px; font-weight: 800; color: #ffffff; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                রিলস ও শর্ট ভিডিও ব্লক
                            </span>
                            <span id="reels-status-badge" style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 8px; background: ${isEnabled ? (isLocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)') : 'rgba(148, 163, 184, 0.15)'}; color: ${isEnabled ? (isLocked ? '#f87171' : '#34d399') : '#94a3b8'}; border: 1px solid ${isEnabled ? accentColor : '#64748b'}; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                ${isEnabled ? (isLocked ? 'লকড (সক্রিয়)' : 'সক্রিয় (অন)') : 'বন্ধ'}
                            </span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; margin: 4px 0 0 0; line-height: 1.45; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            সময়ের অপচয় ও অনর্থক বিনোদন থেকে বাঁচতে ইউটিউব শর্টস, ফেসবুক রিলস ও টিকটক বন্ধ রাখুন।
                        </p>
                    </div>
                </div>

                <!-- Toggle Switch -->
                <div id="btn-toggle-reels-block" style="width: 52px; height: 28px; background: ${isEnabled ? (isLocked ? '#ef4444' : '#10b981') : '#334155'}; border-radius: 20px; position: relative; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0; margin-top: 4px;">
                    <div id="reels-toggle-knob" style="width: 22px; height: 22px; background: #ffffff; border-radius: 50%; position: absolute; top: 3px; left: ${isEnabled ? '27px' : '3px'}; transition: left 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
                </div>
            </div>

            <!-- Lock Info / Countdown -->
            ${isEnabled ? `
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid ${isLocked ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; fill: ${isLocked ? '#f87171' : '#34d399'};"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                        <span id="reels-countdown-text" style="font-size: 11.5px; font-weight: 700; color: ${isLocked ? '#f87171' : '#34d399'}; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ${isLocked ? 'ন্যূনতম লক বাকি: ' + formatSecondsToBangla(reelsBlockState.remainingSeconds) : '৩০ মিনিট পার হয়েছে, চাইলে বন্ধ করতে পারেন'}
                        </span>
                    </div>
                    <span style="font-size: 10px; color: ${isLocked ? '#fca5a5' : '#a7f3d0'}; font-weight: 700; background: ${isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; border: 1px solid ${isLocked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}; padding: 2px 8px; border-radius: 6px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                        ${isLocked ? 'স্ট্রিক্ট ৩০ মি. লক' : 'আনলকড'}
                    </span>
                </div>
            ` : `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                    <span style="font-size: 11px; color: #64748b; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                        অন করলে ন্যূনতম ৩০ মিনিট কোনোভাবেই বন্ধ করা যাবে না।
                    </span>
                </div>
            `}

            <!-- DAILY REELS & ANALYTICS BUTTON -->
            <div id="btn-open-reels-analytics" style="margin-top: 14px; padding: 12px 14px; background: rgba(15, 23, 42, 0.7); border: 1.5px solid #00E676; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0, 230, 118, 0.12);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(0, 230, 118, 0.15); border: 1px solid #00E676; display: flex; align-items: center; justify-content: center; color: #00E676;">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                    </div>
                    <div>
                        <div style="font-size: 13.5px; font-weight: 800; color: #ffffff; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ডেইলি রিলস ও পরিসংখ্যান
                        </div>
                        <div id="reels-card-subtext" style="font-size: 11px; color: #34d399; margin-top: 2px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            আজকের দেখা: ০টি | লিমিট: বন্ধ
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: #00E676; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    <span>হিসেব ও লিমিট</span>
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
            </div>
        </div>
    `;
}

function updateReelsBlockerCardUI() {
    const wrapper = document.getElementById('wrapper-reels-blocker-card');
    if (wrapper) {
        wrapper.innerHTML = renderReelsBlockerCardContent();
        bindReelsBlockerEvents();
    }
}

function updateReelsCountdownText() {
    const el = document.getElementById('reels-countdown-text');
    if (el) {
        el.textContent = 'ন্যূনতম লক বাকি: ' + formatSecondsToBangla(reelsBlockState.remainingSeconds);
    }
}

function fetchReelsBlockStatus() {
    if (window.Capacitor?.Plugins?.SocialMediaControlPlugin?.getReelsBlockStatus) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.getReelsBlockStatus()
            .then(res => {
                reelsBlockState.enabled = Boolean(res?.enabled);
                reelsBlockState.remainingSeconds = Number(res?.remainingSeconds || 0);
                reelsBlockState.isLocked = Boolean(res?.isLocked);
                updateReelsBlockerCardUI();
            })
            .catch(err => {
                console.error("Failed to fetch reels block status", err);
            });
    } else {
        const savedExpiry = Number(localStorage.getItem('REELS_BLOCK_EXPIRY') || '0');
        const now = Date.now();
        const isEnabled = localStorage.getItem('REELS_BLOCK_ENABLED') === 'true';
        reelsBlockState.enabled = isEnabled;
        if (isEnabled && savedExpiry > now) {
            reelsBlockState.remainingSeconds = Math.floor((savedExpiry - now) / 1000);
            reelsBlockState.isLocked = true;
        } else {
            reelsBlockState.remainingSeconds = 0;
            reelsBlockState.isLocked = false;
        }
        updateReelsBlockerCardUI();
    }
}

function enableReelsBlockAction() {
    if (window.Capacitor?.Plugins?.SocialMediaControlPlugin?.enableReelsBlock) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.enableReelsBlock()
            .then(res => {
                reelsBlockState.enabled = true;
                reelsBlockState.remainingSeconds = Number(res?.remainingSeconds || 1800);
                reelsBlockState.isLocked = true;
                updateReelsBlockerCardUI();
            })
            .catch(err => {
                alert("রিলস ব্লক চালু করতে সমস্যা হয়েছে: " + (err?.message || err));
            });
    } else {
        const lockMs = 30 * 60 * 1000;
        localStorage.setItem('REELS_BLOCK_ENABLED', 'true');
        localStorage.setItem('REELS_BLOCK_EXPIRY', String(Date.now() + lockMs));
        reelsBlockState.enabled = true;
        reelsBlockState.remainingSeconds = 1800;
        reelsBlockState.isLocked = true;
        updateReelsBlockerCardUI();
    }
}

function disableReelsBlockAction() {
    if (reelsBlockState.isLocked && reelsBlockState.remainingSeconds > 0) {
        const timeMsg = formatSecondsToBangla(reelsBlockState.remainingSeconds);
        alert('নির্ধারিত ৩০ মিনিট শেষ না হওয়া পর্যন্ত এটি বন্ধ করা যাবে না।\n\nঅবশিষ্ট লক সময়: ' + timeMsg);
        return;
    }

    if (window.Capacitor?.Plugins?.SocialMediaControlPlugin?.disableReelsBlock) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.disableReelsBlock()
            .then(res => {
                reelsBlockState.enabled = false;
                reelsBlockState.remainingSeconds = 0;
                reelsBlockState.isLocked = false;
                updateReelsBlockerCardUI();
            })
            .catch(err => {
                alert(err?.message || "বন্ধ করা সম্ভব হয়নি");
            });
    } else {
        localStorage.setItem('REELS_BLOCK_ENABLED', 'false');
        localStorage.removeItem('REELS_BLOCK_EXPIRY');
        reelsBlockState.enabled = false;
        reelsBlockState.remainingSeconds = 0;
        reelsBlockState.isLocked = false;
        updateReelsBlockerCardUI();
    }
}

function bindReelsBlockerEvents() {
    const btnToggle = document.getElementById('btn-toggle-reels-block');
    if (btnToggle) {
        btnToggle.onclick = () => {
            if (reelsBlockState.enabled) {
                disableReelsBlockAction();
            } else {
                enableReelsBlockAction();
            }
        };
    }
}

/**
 * Main render function for Social Media Control Page
 */
function renderSocialControlTab() {
    startBlockTimerLoop();
    fetchReelsBlockStatus();

    return `
        <div class="screen-wrapper social-control-wrapper">
            <!-- Top Header with Back Button -->
            <div class="social-header-bar" style="margin-bottom:16px;">
                <button class="btn-back-home" id="btn-back-to-home">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <div>
                    <h1 class="app-title social-title" style="font-size:20px; font-weight:bold; color:var(--accent-green, #00E676); margin:0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">সোশ্যাল মিডিয়া কন্ট্রোল</h1>
                </div>
            </div>

            <!-- REELS & SHORT VIDEO BLOCKER (AT THE TOP) -->
            <div id="wrapper-reels-blocker-card" style="margin-bottom: 18px;">
                ${renderReelsBlockerCardContent()}
            </div>

            <!-- Search Bar -->
            <div class="search-box-container">
                <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" id="social-app-search-input" class="search-input" placeholder="অ্যাপের নাম বা প্যাকেজ দিয়ে খুঁজুন..." value="${appSearchQuery}">
                ${appSearchQuery ? `<button class="search-clear-btn" id="btn-clear-search">&times;</button>` : ''}
            </div>

            <!-- Main Content Container -->
            <div id="social-apps-content-area">
                ${renderAppsContent()}
            </div>
        </div>

        <!-- Block Setup Modal (Bottom Sheet Style) -->
        <div class="modal-overlay" id="modal-block-app-duration">
            <div class="modal-card block-setup-modal-card">
                <div class="modal-app-header" id="modal-target-app-header"></div>

                <div class="modal-block-title">কত সময়ের জন্য ব্লক করতে চান?</div>
                <p class="modal-block-desc">নির্ধারিত সময় শেষ না হওয়া পর্যন্ত অ্যাপটি সম্পূর্ণ লক থাকবে (স্ট্রিক্ট নো-বাইপাস)।</p>

                <!-- Unit Switcher Tabs (Minutes / Hours) -->
                <div class="block-unit-tabs">
                    <button class="unit-tab-btn ${blockUnitMode === 'minutes' ? 'active' : ''}" id="btn-unit-minutes">মিনিট (Minutes)</button>
                    <button class="unit-tab-btn ${blockUnitMode === 'hours' ? 'active' : ''}" id="btn-unit-hours">ঘণ্টা (Hours)</button>
                </div>

                <!-- Quick Presets -->
                <div class="preset-pills-row" id="block-preset-pills">
                    ${renderPresetPills()}
                </div>

                <!-- Custom Input -->
                <div class="custom-duration-input-wrap">
                    <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px; text-align:left;">
                        কাস্টম সময় (${blockUnitMode === 'hours' ? 'ঘণ্টা' : 'মিনিট'} লিখুন):
                    </label>
                    <input type="number" id="input-custom-block-duration" class="input-dark" min="1" max="720" placeholder="${blockUnitMode === 'hours' ? 'যেমন: ২' : 'যেমন: ৩০'}">
                </div>

                <div class="strict-warning-banner">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="color:#FF1744; width:16px; height:16px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <span><strong>স্ট্রিক্ট পলিসি:</strong> সময় শেষ হওয়ার আগে অ্যাপটি আনলক করা যাবে না।</span>
                </div>

                <div class="modal-btn-row">
                    <button class="btn-modal" style="background:#263238; color:#FFF;" id="btn-close-block-modal">বাতিল</button>
                    <button class="btn-modal btn-confirm-block" id="btn-submit-app-block" style="display:inline-flex; align-items:center; justify-content:center; gap:6px;"><svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:currentColor;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg><span>ব্লক নিশ্চিত করুন</span></button>
                </div>
            </div>
        </div>

        <!-- Permission Required Modal -->
        <div class="modal-overlay" id="modal-accessibility-permission-req">
            <div class="modal-card">
                <div style="display:flex; justify-content:center; margin-bottom:8px;"><svg viewBox="0 0 24 24" style="width:36px; height:36px; fill:var(--accent-green);"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></div>
                <h3 style="font-size:18px; color:var(--accent-green); margin-bottom:8px;">এক্সেসিবিলিটি পারমিশন প্রয়োজন</h3>
                <p style="font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:16px; text-align:left;">
                    অ্যাপ ব্লক ফিচারটি ব্যাকগ্রাউন্ডে ইনস্ট্যান্ট অ্যাপ শনাক্ত ও লক করতে এক্সেসিবিলিটি পারমিশন ব্যবহার করে। অনুগ্রহ করে এটি সক্রিয় করুন।
                </p>
                <div class="modal-btn-row">
                    <button class="btn-modal" style="background:#263238; color:#FFF;" id="btn-close-perm-modal">পরে করব</button>
                    <button class="btn-modal" style="background:var(--accent-green); color:#000;" id="btn-grant-accessibility-perm">পারমিশন দিন</button>
                </div>
            </div>
        </div>

        <!-- DAILY REELS ANALYTICS & LIMIT MODAL -->
        <div class="modal-overlay" id="modal-reels-analytics" style="display: none; align-items: center; justify-content: center; z-index: 999999; backdrop-filter: blur(8px); background: rgba(2, 6, 23, 0.85); padding: 16px; box-sizing: border-box;">
            <div class="modal-card" style="max-width: 420px; width: 100%; max-height: 85vh; overflow-y: auto; background: #0f172a; border: 1.5px solid #1e293b; border-radius: 20px; padding: 20px; box-shadow: 0 20px 45px rgba(0,0,0,0.7); color: #fff; box-sizing: border-box;">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(0, 230, 118, 0.2); border: 1px solid #00E676; display: flex; align-items: center; justify-content: center; color: #00E676;">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                        </div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #00E676; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">ডেইলি রিলস অ্যানালিটিক্স</h3>
                    </div>
                    <button id="btn-close-reels-analytics" style="background: transparent; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
                </div>

                <!-- Today Highlight Box -->
                <div style="background: linear-gradient(135deg, rgba(0, 230, 118, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1.5px solid #00E676; border-radius: 16px; padding: 16px; margin-bottom: 16px; text-align: center;">
                    <div style="font-size: 12px; color: #94a3b8; font-weight: 700;">আজকের দেখা রিলস</div>
                    <div id="analytics-today-count" style="font-size: 38px; font-weight: 900; color: #00E676; margin: 4px 0; font-family: monospace;">০</div>
                    <div id="analytics-today-time" style="font-size: 11.5px; color: #cbd5e1;">আনুমানিক অপচয়কৃত সময়: ০ মিনিট</div>

                    <!-- Progress Bar -->
                    <div id="analytics-progress-container" style="margin-top: 12px; display: none;">
                        <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: #94a3b8; margin-bottom: 4px;">
                            <span>দৈনিক লিমিট অগ্রগতি</span>
                            <span id="analytics-progress-label">০ / ৫০</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #1e293b; border-radius: 6px; overflow: hidden;">
                            <div id="analytics-progress-bar" style="width: 0%; height: 100%; background: #00E676; transition: width 0.3s;"></div>
                        </div>
                    </div>
                </div>

                <!-- 2x2 Stats Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;">
                    <!-- 7 Days -->
                    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">গত ৭ দিনে</div>
                        <div id="analytics-7days" style="font-size: 20px; font-weight: 800; color: #38bdf8; margin-top: 2px;">০টি</div>
                    </div>

                    <!-- 30 Days -->
                    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">গত এক মাসে</div>
                        <div id="analytics-30days" style="font-size: 20px; font-weight: 800; color: #a78bfa; margin-top: 2px;">০টি</div>
                    </div>

                    <!-- Lifetime -->
                    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">লাইফটাইম মোট</div>
                        <div id="analytics-lifetime" style="font-size: 20px; font-weight: 800; color: #34d399; margin-top: 2px;">০টি</div>
                    </div>

                    <!-- Peak Record -->
                    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">একদিনে সর্বোচ্চ রেকর্ড</div>
                        <div id="analytics-peak" style="font-size: 20px; font-weight: 800; color: #f43f5e; margin-top: 2px;">০টি</div>
                        <div id="analytics-peak-date" style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">-</div>
                    </div>
                </div>

                <!-- Daily Limit Controller -->
                <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 14px;">
                    <div style="font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                        <span>দৈনিক রিলস লিমিট</span>
                        <span id="analytics-current-limit-tag" style="font-size: 10.5px; color: #00E676; background: rgba(0, 230, 118, 0.15); border: 1px solid rgba(0, 230, 118, 0.3); padding: 2px 8px; border-radius: 6px;">সীমা নেই</span>
                    </div>
                    <p style="font-size: 11px; color: #94a3b8; margin: 0 0 10px 0; line-height: 1.4;">
                        দিনে সর্বোচ্চ কয়টি রিলস দেখতে চান তা নির্ধারণ করুন। লিমিট শেষ হলে রিলস স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে (সর্বোচ্চ ১০০০টি)।
                    </p>

                    <!-- Presets -->
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
                        <button class="btn-reels-preset" data-val="10" style="padding: 5px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 11px; cursor: pointer;">১০টি</button>
                        <button class="btn-reels-preset" data-val="25" style="padding: 5px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 11px; cursor: pointer;">২৫টি</button>
                        <button class="btn-reels-preset" data-val="50" style="padding: 5px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 11px; cursor: pointer;">৫০টি</button>
                        <button class="btn-reels-preset" data-val="100" style="padding: 5px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 11px; cursor: pointer;">১০০টি</button>
                        <button class="btn-reels-preset" data-val="200" style="padding: 5px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 11px; cursor: pointer;">২০০টি</button>
                        <button class="btn-reels-preset" data-val="1000" style="padding: 5px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 11px; cursor: pointer;">১০০০ (সর্বোচ্চ)</button>
                    </div>

                    <!-- Custom input -->
                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <input type="number" id="input-custom-reels-limit" min="1" max="1000" placeholder="কাস্টম সংখ্যা লিখুন (১ - ১০০০)" style="flex: 1; padding: 10px 12px; background: #020617; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 12.5px; outline: none; box-sizing: border-box;">
                        <button id="btn-save-reels-limit" style="padding: 10px 16px; background: #00E676; color: #042f2e; border: none; border-radius: 8px; font-size: 12.5px; font-weight: 800; cursor: pointer;">সেভ</button>
                    </div>

                    <button id="btn-clear-reels-limit" style="width: 100%; padding: 8px; background: #020617; color: #94a3b8; border: 1px solid #334155; border-radius: 8px; font-size: 11.5px; cursor: pointer;">লিমিট তুলে নিন (আনলিমিটেড)</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Quick Presets according to Unit Mode
 */
function renderPresetPills() {
    if (blockUnitMode === 'hours') {
        return `
            <button class="preset-pill-btn" data-val="1">১ ঘণ্টা</button>
            <button class="preset-pill-btn" data-val="2">২ ঘণ্টা</button>
            <button class="preset-pill-btn" data-val="4">৪ ঘণ্টা</button>
            <button class="preset-pill-btn" data-val="8">৮ ঘণ্টা</button>
            <button class="preset-pill-btn" data-val="12">১২ ঘণ্টা</button>
            <button class="preset-pill-btn" data-val="24">২৪ ঘণ্টা</button>
        `;
    } else {
        return `
            <button class="preset-pill-btn" data-val="15">১৫ মি.</button>
            <button class="preset-pill-btn" data-val="30">৩০ মি.</button>
            <button class="preset-pill-btn" data-val="45">৪৫ মি.</button>
            <button class="preset-pill-btn" data-val="60">৬০ মি.</button>
            <button class="preset-pill-btn" data-val="120">১২০ মি.</button>
        `;
    }
}

/**
 * Renders loading skeleton or filtered app lists
 */
function renderAppsContent() {
    if (isFetchingApps) {
        return `
            <div class="skeleton-loader-container">
                <div class="skeleton-header"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
    }

    if (!installedAppsList || installedAppsList.length === 0) {
        return `
            <div class="empty-state-card">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:12px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <div style="font-size:16px; font-weight:700; color:var(--text-color);">কোনো অ্যাপ পাওয়া যায়নি</div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">রিফ্রেশ বা পুনরায় ফেচ করুন</p>
                <button class="btn-primary-focus" id="btn-retry-fetch-apps" style="width:auto; padding:8px 24px; margin:16px auto 0 auto; font-size:13px;">
                    পুনরায় ফেচ করুন
                </button>
            </div>
        `;
    }

    const q = appSearchQuery.trim().toLowerCase();
    const filteredApps = installedAppsList.filter(app => {
        if (!q) return true;
        const nameMatch = app.appName && app.appName.toLowerCase().includes(q);
        const pkgMatch = app.packageName && app.packageName.toLowerCase().includes(q);
        return nameMatch || pkgMatch;
    });

    const socialApps = filteredApps.filter(a => a.isSocialMedia);
    const otherApps = filteredApps.filter(a => !a.isSocialMedia);

    if (filteredApps.length === 0) {
        return `
            <div class="empty-state-card">
                <div style="font-size:15px; font-weight:700; color:var(--text-color);">"${escapeHtml(appSearchQuery)}" দিয়ে কোনো অ্যাপ মেলেনি</div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">অন্য কোনো নাম দিয়ে চেষ্টা করুন</p>
            </div>
        `;
    }

    return `
        <!-- Social Media Apps Section -->
        ${socialApps.length > 0 ? `
            <div class="apps-section-card social-highlight-card">
                <div class="section-title-row">
                    <div class="section-title text-social-gradient">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="color:#FF1744;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        সোশ্যাল মিডিয়া অ্যাপস (Social Media)
                    </div>
                    <span class="badge-count social-badge-count">${socialApps.length} টি শনাক্তকৃত</span>
                </div>
                <div class="app-list-grid">
                    ${socialApps.map(app => renderAppItem(app, true)).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Other Apps Section -->
        ${otherApps.length > 0 ? `
            <div class="apps-section-card">
                <div class="section-title-row">
                    <div class="section-title">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
                        অন্যান্য ইনস্টলকৃত অ্যাপস (Other Apps)
                    </div>
                    <span class="badge-count">${otherApps.length} টি অ্যাপ</span>
                </div>
                <div class="app-list-grid">
                    ${otherApps.map(app => renderAppItem(app, false)).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Render individual App Item row
 */
function renderAppItem(app, isSocial) {
    const defaultIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%238B949E"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>`;
    const iconSrc = app.icon ? app.icon : defaultIcon;
    const isBlocked = app.isBlocked && app.remainingSeconds > 0;

    return `
        <div class="app-item-card ${isSocial ? 'social-item-highlight' : ''} ${isBlocked ? 'app-card-blocked' : ''}" data-pkg="${escapeHtml(app.packageName)}">
            <div class="app-item-left">
                <img class="app-icon-img" src="${iconSrc}" alt="${escapeHtml(app.appName)}" onerror="this.src='${defaultIcon}'" />
                <div class="app-info-col">
                    <div class="app-name-title">${escapeHtml(app.appName)}</div>
                    <div class="app-package-sub">${escapeHtml(app.packageName)}</div>
                </div>
            </div>
            <div class="app-item-right">
                ${isBlocked ? `
                    <div class="blocked-active-badge">
                        <svg viewBox="0 0 24 24" class="lock-icon-pulse" style="width:12px; height:12px; fill:currentColor;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                        <span class="countdown-time-text">${formatRemainingTime(app.remainingSeconds)}</span>
                    </div>
                ` : `
                    <button class="btn-trigger-block" data-pkg="${escapeHtml(app.packageName)}">
                        <span>+ ব্লক</span>
                    </button>
                `}
            </div>
        </div>
    `;
}

/**
 * Event Listeners & Actions
 */
function bindSocialControlEvents() {
    bindReelsBlockerEvents();

    // Reels Analytics Button
    const btnOpenAnalytics = document.getElementById('btn-open-reels-analytics');
    if (btnOpenAnalytics) {
        btnOpenAnalytics.onclick = openReelsAnalyticsModal;
    }

    const btnCloseAnalytics = document.getElementById('btn-close-reels-analytics');
    if (btnCloseAnalytics) {
        btnCloseAnalytics.onclick = closeReelsAnalyticsModal;
    }

    document.querySelectorAll('.btn-reels-preset').forEach(btn => {
        btn.onclick = () => {
            const v = btn.getAttribute('data-val');
            const inp = document.getElementById('input-custom-reels-limit');
            if (inp) inp.value = v;
        };
    });

    const btnSaveLimit = document.getElementById('btn-save-reels-limit');
    if (btnSaveLimit) {
        btnSaveLimit.onclick = () => {
            const inp = document.getElementById('input-custom-reels-limit');
            if (inp && inp.value) {
                saveReelsDailyLimit(inp.value);
            } else {
                alert('অনুগ্রহ করে ১ থেকে ১০০০ এর মধ্যে একটি সংখ্যা লিখুন।');
            }
        };
    }

    const btnClearLimit = document.getElementById('btn-clear-reels-limit');
    if (btnClearLimit) {
        btnClearLimit.onclick = () => {
            const inp = document.getElementById('input-custom-reels-limit');
            if (inp) inp.value = '';
            saveReelsDailyLimit(0);
        };
    }

    fetchReelsAnalyticsData();

    // Back to home
    const btnBack = document.getElementById('btn-back-to-home');
    if (btnBack) btnBack.onclick = () => switchTab('home');

    // Search Input
    const searchInp = document.getElementById('social-app-search-input');
    if (searchInp) {
        searchInp.oninput = (e) => {
            appSearchQuery = e.target.value;
            updateSocialAppsUI();
        };
    }

    // Clear Search
    const btnClear = document.getElementById('btn-clear-search');
    if (btnClear) {
        btnClear.onclick = () => {
            appSearchQuery = '';
            updateSocialAppsUI();
        };
    }

    // Retry button
    const btnRetry = document.getElementById('btn-retry-fetch-apps');
    if (btnRetry) btnRetry.onclick = () => fetchDeviceApps();

    // Attach click events for "+ Block" buttons
    document.querySelectorAll('.btn-trigger-block').forEach(btn => {
        btn.onclick = (e) => {
            const pkg = e.currentTarget.dataset.pkg;
            const targetApp = installedAppsList.find(a => a.packageName === pkg);
            if (targetApp) {
                openBlockSetupModal(targetApp);
            }
        };
    });

    // Unit switcher tabs
    const btnMin = document.getElementById('btn-unit-minutes');
    if (btnMin) {
        btnMin.onclick = () => {
            blockUnitMode = 'minutes';
            refreshBlockModalUnits();
        };
    }

    const btnHrs = document.getElementById('btn-unit-hours');
    if (btnHrs) {
        btnHrs.onclick = () => {
            blockUnitMode = 'hours';
            refreshBlockModalUnits();
        };
    }

    // Close Block Modal
    const btnCloseModal = document.getElementById('btn-close-block-modal');
    if (btnCloseModal) {
        btnCloseModal.onclick = () => {
            document.getElementById('modal-block-app-duration').style.display = 'none';
        };
    }

    // Submit Block Button
    const btnSubmitBlock = document.getElementById('btn-submit-app-block');
    if (btnSubmitBlock) {
        btnSubmitBlock.onclick = submitBlockConfirmation;
    }

    // Close Permission Modal
    const btnClosePerm = document.getElementById('btn-close-perm-modal');
    if (btnClosePerm) {
        btnClosePerm.onclick = () => {
            document.getElementById('modal-accessibility-permission-req').style.display = 'none';
        };
    }

    // Grant Permission Button
    const btnGrantPerm = document.getElementById('btn-grant-accessibility-perm');
    if (btnGrantPerm) {
        btnGrantPerm.onclick = () => {
            document.getElementById('modal-accessibility-permission-req').style.display = 'none';
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialMediaControlPlugin) {
                window.Capacitor.Plugins.SocialMediaControlPlugin.requestAccessibilityPermission();
            }
        };
    }

    // Fetch apps if empty
    if (installedAppsList.length === 0 && !isFetchingApps) {
        fetchDeviceApps();
    }
}

/**
 * Open Block Setup Modal for selected app
 */
function openBlockSetupModal(app) {
    activeBlockTargetApp = app;
    const defaultIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%238B949E"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>`;
    const iconSrc = app.icon ? app.icon : defaultIcon;

    const headerEl = document.getElementById('modal-target-app-header');
    if (headerEl) {
        headerEl.innerHTML = `
            <img class="modal-app-icon" src="${iconSrc}" alt="${escapeHtml(app.appName)}" />
            <div>
                <div class="modal-app-title">${escapeHtml(app.appName)}</div>
                <div class="modal-app-pkg">${escapeHtml(app.packageName)}</div>
            </div>
        `;
    }

    const inpCustom = document.getElementById('input-custom-block-duration');
    if (inpCustom) inpCustom.value = '';

    refreshBlockModalUnits();
    document.getElementById('modal-block-app-duration').style.display = 'flex';
}

/**
 * Refresh unit tab pills and input placeholder
 */
function refreshBlockModalUnits() {
    const btnMin = document.getElementById('btn-unit-minutes');
    const btnHrs = document.getElementById('btn-unit-hours');
    if (btnMin) btnMin.classList.toggle('active', blockUnitMode === 'minutes');
    if (btnHrs) btnHrs.classList.toggle('active', blockUnitMode === 'hours');

    const inpCustom = document.getElementById('input-custom-block-duration');
    if (inpCustom) {
        inpCustom.placeholder = blockUnitMode === 'hours' ? 'যেমন: ২ (সর্বোচ্চ ১৬৮)' : 'যেমন: ৩০ (সর্বোচ্চ ১০,০৮০)';
        inpCustom.max = blockUnitMode === 'hours' ? '168' : '10080';
        inpCustom.value = '';
    }

    const pillsContainer = document.getElementById('block-preset-pills');
    if (pillsContainer) {
        pillsContainer.innerHTML = renderPresetPills();
        // Bind preset click handlers
        pillsContainer.querySelectorAll('.preset-pill-btn').forEach(btn => {
            btn.onclick = (e) => {
                pillsContainer.querySelectorAll('.preset-pill-btn').forEach(b => b.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                const val = e.currentTarget.dataset.val;
                if (inpCustom) inpCustom.value = val;
            };
        });
    }
}

/**
 * Handle submit block confirmation
 */
function submitBlockConfirmation() {
    if (!activeBlockTargetApp) return;

    const inpCustom = document.getElementById('input-custom-block-duration');
    let rawVal = inpCustom ? parseInt(inpCustom.value, 10) : 0;

    if (isNaN(rawVal) || rawVal <= 0) {
        alert("অনুগ্রহ করে সঠিক ব্লক সময় (ডিউরেশন) লিখুন বা সিলেক্ট করুন।");
        return;
    }

    let hours = 0;
    let minutes = 0;

    if (blockUnitMode === 'hours') {
        if (rawVal > 168) rawVal = 168; // Max 168 hours (7 days)
        hours = rawVal;
    } else {
        if (rawVal > 10080) rawVal = 10080; // Max 10,080 minutes (7 days)
        minutes = rawVal;
    }

    // Verify accessibility permission first
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialMediaControlPlugin) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.checkPermissions()
            .then(res => {
                if (res && res.accessibilityEnabled) {
                    executeNativeBlock(activeBlockTargetApp.packageName, hours, minutes);
                } else {
                    document.getElementById('modal-block-app-duration').style.display = 'none';
                    document.getElementById('modal-accessibility-permission-req').style.display = 'flex';
                }
            })
            .catch(() => {
                executeNativeBlock(activeBlockTargetApp.packageName, hours, minutes);
            });
    } else {
        // Fallback for browser testing
        executeNativeBlock(activeBlockTargetApp.packageName, hours, minutes);
    }
}

/**
 * Execute block call to Native Plugin
 */
function executeNativeBlock(packageName, hours, minutes) {
    const totalMs = ((hours * 3600) + (minutes * 60)) * 1000;

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialMediaControlPlugin) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.setAppBlock({
            packageName: packageName,
            hours: hours,
            minutes: minutes
        }).then(() => {
            applyLocalBlockState(packageName, totalMs);
        }).catch(err => {
            console.error("Native block failed:", err);
            applyLocalBlockState(packageName, totalMs);
        });
    } else {
        applyLocalBlockState(packageName, totalMs);
    }
}

/**
 * Apply block state locally and update UI
 */
function applyLocalBlockState(packageName, durationMs) {
    const MAX_DURATION_MS = 7 * 24 * 3600 * 1000;
    const clampedDurationMs = Math.min(Math.max(durationMs, 60000), MAX_DURATION_MS);
    const targetApp = installedAppsList.find(a => a.packageName === packageName);

    if (targetApp) {
        targetApp.isBlocked = true;
        targetApp.remainingSeconds = Math.floor(clampedDurationMs / 1000);

        // Also persist in local storage for web/offline fallback
        const localBlocks = JSON.parse(localStorage.getItem('APP_BLOCK_EXPIRIES') || '{}');
        localBlocks[packageName] = Date.now() + clampedDurationMs;
        localStorage.setItem('APP_BLOCK_EXPIRIES', JSON.stringify(localBlocks));
    }

    document.getElementById('modal-block-app-duration').style.display = 'none';
    updateSocialAppsUI();
    alert(`${targetApp ? targetApp.appName : 'অ্যাপটি'} সফলভাবে ব্লক করা হয়েছে! নির্দিষ্ট সময় পার না হওয়া পর্যন্ত এটি ব্যবহার বন্ধ থাকবে।`);
}

/**
 * Live Countdown Timer loop
 */
function startBlockTimerLoop() {
    if (blockTimerInterval) clearInterval(blockTimerInterval);

    blockTimerInterval = setInterval(() => {
        let hasActiveBlocks = false;
        const now = Date.now();
        const localBlocks = JSON.parse(localStorage.getItem('APP_BLOCK_EXPIRIES') || '{}');
        const MAX_BLOCK_SECONDS = 7 * 24 * 3600;

        installedAppsList.forEach(app => {
            if (localBlocks[app.packageName]) {
                const expiry = localBlocks[app.packageName];
                let rem = Math.max(0, Math.floor((expiry - now) / 1000));
                if (rem > MAX_BLOCK_SECONDS) rem = MAX_BLOCK_SECONDS;

                if (rem > 0) {
                    app.isBlocked = true;
                    app.remainingSeconds = rem;
                    hasActiveBlocks = true;
                } else {
                    app.isBlocked = false;
                    app.remainingSeconds = 0;
                    delete localBlocks[app.packageName];
                }
            } else if (app.isBlocked && app.remainingSeconds > 0) {
                app.remainingSeconds--;
                if (app.remainingSeconds > MAX_BLOCK_SECONDS) {
                    app.remainingSeconds = MAX_BLOCK_SECONDS;
                }
                if (app.remainingSeconds <= 0) {
                    app.isBlocked = false;
                } else {
                    hasActiveBlocks = true;
                }
            }
        });

        localStorage.setItem('APP_BLOCK_EXPIRIES', JSON.stringify(localBlocks));

        if (hasActiveBlocks) {
            updateLiveCountdownBadges();
        }

        // Reels Blocker live countdown
        if (reelsBlockState.enabled && reelsBlockState.remainingSeconds > 0) {
            reelsBlockState.remainingSeconds--;
            if (reelsBlockState.remainingSeconds <= 0) {
                reelsBlockState.isLocked = false;
                updateReelsBlockerCardUI();
            } else {
                updateReelsCountdownText();
            }
        }
    }, 1000);
}

/**
 * Update remaining time text in live UI
 */
function updateLiveCountdownBadges() {
    document.querySelectorAll('.app-item-card').forEach(card => {
        const pkg = card.dataset.pkg;
        if (!pkg) return;
        const app = installedAppsList.find(a => a.packageName === pkg);
        if (!app) return;

        const timeTextEl = card.querySelector('.countdown-time-text');
        const isBlocked = app.isBlocked && app.remainingSeconds > 0;

        if (isBlocked && timeTextEl) {
            timeTextEl.textContent = formatRemainingTime(app.remainingSeconds);
        } else if (!isBlocked && card.classList.contains('app-card-blocked')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderAppItem(app, app.isSocialMedia).trim();
            if (tempDiv.firstChild) {
                card.replaceWith(tempDiv.firstChild);
                bindSocialControlEvents();
            }
        }
    });
}

/**
 * Fetches installed apps
 */
function fetchDeviceApps() {
    isFetchingApps = true;
    updateSocialAppsUI();

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialMediaControlPlugin) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.getInstalledApps()
            .then(result => {
                isFetchingApps = false;
                if (result && Array.isArray(result.apps)) {
                    installedAppsList = result.apps;
                    syncLocalBlockExpiries();
                } else {
                    installedAppsList = [];
                }
                updateSocialAppsUI();
            })
            .catch(err => {
                console.error("Failed to fetch device apps:", err);
                isFetchingApps = false;
                loadMockAppsFallback();
            });
    } else {
        setTimeout(() => loadMockAppsFallback(), 600);
    }
}

function syncLocalBlockExpiries() {
    const localBlocks = JSON.parse(localStorage.getItem('APP_BLOCK_EXPIRIES') || '{}');
    const now = Date.now();
    const MAX_BLOCK_SECONDS = 7 * 24 * 3600;

    installedAppsList.forEach(app => {
        if (app.remainingSeconds > MAX_BLOCK_SECONDS) {
            app.remainingSeconds = MAX_BLOCK_SECONDS;
        }

        if (localBlocks[app.packageName]) {
            let rem = Math.max(0, Math.floor((localBlocks[app.packageName] - now) / 1000));
            if (rem > MAX_BLOCK_SECONDS) rem = MAX_BLOCK_SECONDS;

            if (rem > 0) {
                app.isBlocked = true;
                app.remainingSeconds = rem;
            } else {
                delete localBlocks[app.packageName];
            }
        } else if (app.isBlocked && app.remainingSeconds > 0) {
            localBlocks[app.packageName] = now + (app.remainingSeconds * 1000);
        }
    });

    localStorage.setItem('APP_BLOCK_EXPIRIES', JSON.stringify(localBlocks));
}

/**
 * Fallback generator for browser testing
 */
function loadMockAppsFallback() {
    isFetchingApps = false;
    installedAppsList = [
        { appName: 'Facebook', packageName: 'com.facebook.katana', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'YouTube', packageName: 'com.google.android.youtube', icon: '', isSocialMedia: true, isSystemApp: true, isBlocked: false, remainingSeconds: 0 },
        { appName: 'Instagram', packageName: 'com.instagram.android', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'TikTok', packageName: 'com.zhiliaoapp.musically', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'WhatsApp', packageName: 'com.whatsapp', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'Messenger', packageName: 'com.facebook.orca', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'X (Twitter)', packageName: 'com.twitter.android', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'Snapchat', packageName: 'com.snapchat.android', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 },
        { appName: 'Telegram', packageName: 'org.telegram.messenger', icon: '', isSocialMedia: true, isSystemApp: false, isBlocked: false, remainingSeconds: 0 }
    ];
    syncLocalBlockExpiries();
    updateSocialAppsUI();
}

/**
 * Format remaining seconds into HH:MM:SS string
 */
function formatRemainingTime(sec) {
    if (sec <= 0) return '00m 00s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) {
        return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
    return `${pad(m)}m ${pad(s)}s`;
}

/**
 * Partial UI refresh
 */
function updateSocialAppsUI() {
    const area = document.getElementById('social-apps-content-area');
    if (area) {
        area.innerHTML = renderAppsContent();
        bindSocialControlEvents();
    }
}

/**
 * Utility HTML escaping function
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


let currentReelsAnalytics = {
    today: 0,
    dailyLimit: 0,
    last7Days: 0,
    last30Days: 0,
    lifetime: 0,
    peakCount: 0,
    peakDate: '-'
};

function fetchReelsAnalyticsData() {
    if (window.Capacitor?.Plugins?.SocialMediaControlPlugin?.getReelsAnalytics) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.getReelsAnalytics()
            .then(res => {
                if (res) {
                    currentReelsAnalytics = {
                        today: Number(res.today || 0),
                        dailyLimit: Number(res.dailyLimit || 0),
                        last7Days: Number(res.last7Days || 0),
                        last30Days: Number(res.last30Days || 0),
                        lifetime: Number(res.lifetime || 0),
                        peakCount: Number(res.peakCount || 0),
                        peakDate: res.peakDate || '-'
                    };
                    updateReelsAnalyticsUI();
                }
            })
            .catch(() => updateReelsAnalyticsUI());
    } else {
        updateReelsAnalyticsUI();
    }
}

function updateReelsAnalyticsUI() {
    const subText = document.getElementById('reels-card-subtext');
    if (subText) {
        const limStr = currentReelsAnalytics.dailyLimit > 0 ? (currentReelsAnalytics.dailyLimit + 'টি') : 'বন্ধ';
        subText.innerText = `আজকের দেখা: ${currentReelsAnalytics.today}টি | লিমিট: ${limStr}`;
    }

    const todayCountEl = document.getElementById('analytics-today-count');
    const todayTimeEl = document.getElementById('analytics-today-time');
    const days7El = document.getElementById('analytics-7days');
    const days30El = document.getElementById('analytics-30days');
    const lifetimeEl = document.getElementById('analytics-lifetime');
    const peakEl = document.getElementById('analytics-peak');
    const peakDateEl = document.getElementById('analytics-peak-date');
    const limitTag = document.getElementById('analytics-current-limit-tag');
    const progContainer = document.getElementById('analytics-progress-container');
    const progBar = document.getElementById('analytics-progress-bar');
    const progLabel = document.getElementById('analytics-progress-label');

    if (todayCountEl) todayCountEl.innerText = String(currentReelsAnalytics.today);
    if (todayTimeEl) {
        const approxMin = Math.round(currentReelsAnalytics.today * 0.8);
        todayTimeEl.innerText = `আনুমানিক অপচয়কৃত সময়: ${approxMin} মিনিট`;
    }
    if (days7El) days7El.innerText = `${currentReelsAnalytics.last7Days}টি`;
    if (days30El) days30El.innerText = `${currentReelsAnalytics.last30Days}টি`;
    if (lifetimeEl) lifetimeEl.innerText = `${currentReelsAnalytics.lifetime}টি`;
    if (peakEl) peakEl.innerText = `${currentReelsAnalytics.peakCount}টি`;
    if (peakDateEl) peakDateEl.innerText = currentReelsAnalytics.peakDate && currentReelsAnalytics.peakDate !== '-' ? `তারিখ: ${currentReelsAnalytics.peakDate}` : 'রেকর্ড হয়নি';

    if (limitTag) {
        if (currentReelsAnalytics.dailyLimit > 0) {
            limitTag.innerText = `দৈনিক সীমা: ${currentReelsAnalytics.dailyLimit}টি`;
            limitTag.style.color = '#00E676';
        } else {
            limitTag.innerText = 'সীমা নেই';
            limitTag.style.color = '#94a3b8';
        }
    }

    if (progContainer && progBar && progLabel) {
        if (currentReelsAnalytics.dailyLimit > 0) {
            progContainer.style.display = 'block';
            const pct = Math.min(100, Math.round((currentReelsAnalytics.today / currentReelsAnalytics.dailyLimit) * 100));
            progBar.style.width = `${pct}%`;
            progBar.style.background = pct >= 90 ? '#ef4444' : '#00E676';
            progLabel.innerText = `${currentReelsAnalytics.today} / ${currentReelsAnalytics.dailyLimit} (${pct}%)`;
        } else {
            progContainer.style.display = 'none';
        }
    }

    // Update Home page badge if available
    const homeBadge = document.getElementById('home-reels-today-badge');
    if (homeBadge) {
        homeBadge.innerText = `রিলস আজ: ${currentReelsAnalytics.today}টি`;
    }
}

function openReelsAnalyticsModal() {
    const modal = document.getElementById('modal-reels-analytics');
    if (modal) {
        modal.style.display = 'flex';
        fetchReelsAnalyticsData();
    }
}

function closeReelsAnalyticsModal() {
    const modal = document.getElementById('modal-reels-analytics');
    if (modal) modal.style.display = 'none';
}

function saveReelsDailyLimit(limitVal) {
    let lim = parseInt(limitVal, 10);
    if (isNaN(lim) || lim < 0) lim = 0;
    if (lim > 1000) lim = 1000;

    if (window.Capacitor?.Plugins?.SocialMediaControlPlugin?.setReelsDailyLimit) {
        window.Capacitor.Plugins.SocialMediaControlPlugin.setReelsDailyLimit({ limit: lim })
            .then(() => {
                currentReelsAnalytics.dailyLimit = lim;
                updateReelsAnalyticsUI();
                alert(lim > 0 ? `দৈনিক রিলস লিমিট ${lim}টি সফলভাবে সেভ করা হয়েছে!` : 'দৈনিক রিলস লিমিট বন্ধ করা হয়েছে।');
            })
            .catch(err => alert('লিমিট সেভ করা যায়নি: ' + err));
    } else {
        currentReelsAnalytics.dailyLimit = lim;
        updateReelsAnalyticsUI();
    }
}
