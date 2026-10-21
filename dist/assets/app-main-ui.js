/* ==========================================================================
   MAIN ORCHESTRATOR & ROUTER (UPDATED WITH ADVANCED AI & DUROOD ACTIONS)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', initMainUI);


let isBrowserInstalled = false;
let isBrowserDownloading = false;

function checkBrowserStatus() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled) {
        window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled().then(function(res) {
            if (res && typeof res.installed === 'boolean') {
                isBrowserInstalled = res.installed;
                updateBrowserUI();
            }
        }).catch(function() {});
    }
}

function updateBrowserUI() {
    const desc = document.getElementById('home-browser-desc');
    const badge = document.getElementById('home-browser-badge');
    if (desc) {
        desc.innerText = isBrowserInstalled ? (currentLang === 'bn' ? 'ব্রাউজার ওপেন করুন' : 'Open Browser') : (currentLang === 'bn' ? 'অ্যাডমুক্ত ব্রাউজার ইনস্টল করুন' : 'Install Safe Browser');
    }
    if (badge) {
        badge.innerText = isBrowserInstalled ? (currentLang === 'bn' ? 'ওপেন' : 'Open') : (currentLang === 'bn' ? 'ইনস্টল' : 'Install');
        badge.style.background = isBrowserInstalled ? '#10b981' : '#0284c7';
    }
}

function handleBrowserClick() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled) {
        window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled().then(function(res) {
            if (res && res.installed) {
                isBrowserInstalled = true;
                updateBrowserUI();
                window.Capacitor.Plugins.UnlockPlugin.openBrowser().catch(function(err) {
                    console.error('Failed to open browser:', err);
                });
            } else {
                isBrowserInstalled = false;
                updateBrowserUI();
                showBrowserModal();
            }
        }).catch(function() {
            showBrowserModal();
        });
    } else {
        showBrowserModal();
    }
}

function showBrowserModal() {
    const modal = document.getElementById('browser-install-modal');
    if (modal) modal.style.display = 'flex';
}

function hideBrowserModal() {
    const modal = document.getElementById('browser-install-modal');
    if (modal) modal.style.display = 'none';
}

function startBrowserDownloadAndInstall() {
    if (isBrowserDownloading) return;
    isBrowserDownloading = true;

    const progressBox = document.getElementById('browser-download-progress-box');
    const actionButtons = document.getElementById('browser-modal-action-buttons');
    const errorBox = document.getElementById('browser-download-error-box');
    const percentEl = document.getElementById('browser-download-percent');
    const barEl = document.getElementById('browser-download-bar');

    if (errorBox) errorBox.style.display = 'none';
    if (progressBox) progressBox.style.display = 'block';
    if (actionButtons) actionButtons.style.display = 'none';

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.downloadAndInstallBrowser) {
        window.Capacitor.Plugins.UnlockPlugin.downloadAndInstallBrowser({
            url: 'https://github.com/ismailvai548-dotcom/helpniche-web/releases/download/v1.0.1/Helpniche.Browser.apk'
        }).then(function(res) {
            isBrowserDownloading = false;
            hideBrowserModal();
            if (progressBox) progressBox.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'flex';
        }).catch(function(err) {
            isBrowserDownloading = false;
            if (progressBox) progressBox.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'flex';
            if (errorBox) {
                errorBox.innerText = typeof err === 'string' ? err : (err && err.message ? err.message : 'ডাউনলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
                errorBox.style.display = 'block';
            }
        });
    } else {
        window.open('https://github.com/ismailvai548-dotcom/helpniche-web/releases/download/v1.0.1/Helpniche.Browser.apk', '_blank');
        isBrowserDownloading = false;
        hideBrowserModal();
    }
}

function initMainUI() {
    injectGlobalStyles();
    applyTheme(currentTheme);

    const root = document.getElementById('root') || document.body;

    root.innerHTML = `
        <div id="app-container">
            <main id="app-content-area"></main>
            ${renderBottomNav()}
        </div>
        ${renderModalsAndOverlays()}
        <audio id="target-audio-player"></audio>
        <audio id="alarm-audio-player" loop></audio>
    `;

    targetAudioPlayer = document.getElementById('target-audio-player');
    alarmAudioPlayer = document.getElementById('alarm-audio-player');

    bindGlobalEvents();
    if (isFocusSessionActive) {
        switchTab('focus');
    } else {
        switchTab('home');
    }

    setInterval(updateStreakDisplays, 1000);
    fetchOnboardingStatusFromNative();
    checkBrowserStatus();

    window.addEventListener('focus', checkBrowserStatus);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') checkBrowserStatus();
    });

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.addListener) {
        window.Capacitor.Plugins.UnlockPlugin.addListener('browserDownloadProgress', function(data) {
            if (data && typeof data.progress === 'number') {
                const percentEl = document.getElementById('browser-download-percent');
                const barEl = document.getElementById('browser-download-bar');
                if (percentEl) percentEl.innerText = data.progress + '%';
                if (barEl) barEl.style.width = data.progress + '%';
            }
        });
    }
}

function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('APP_THEME', theme);
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

function switchTab(tabName) {
    if (tabName === 'browser') {
        handleBrowserClick();
        return;
    }
    if (tabName === 'tasks') {
        tabName = 'focus-tasks';
    }

    if (isFocusSessionActive && tabName !== 'focus') {
        alert('Focus Session Active! সেশন চলাকালীন অন্য ট্যাবে যাওয়া নিষিদ্ধ।');
        tabName = 'focus';
    }

    currentTab = tabName;
    document.querySelectorAll('.app-nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabName);
    });

    const content = document.getElementById('app-content-area');
    if (!content) return;

    if (tabName === 'home') {
        content.innerHTML = renderHomeDashboard();
        bindHomeEvents();
    } else if (tabName === 'focus') {
        content.innerHTML = renderFocusTab();
        bindFocusTabEvents();
    } else if (tabName === 'streak') {
        content.innerHTML = renderStreakTab();
        bindStreakTabEvents();
    } else if (tabName === 'routine') {
        content.innerHTML = renderRoutineTab();
        bindRoutineTabEvents();
    } else if (tabName === 'settings') {
        content.innerHTML = renderSettingsTab();
        bindSettingsTabEvents();
    } else if (tabName === 'social-control') {
        content.innerHTML = renderSocialControlTab();
        bindSocialControlEvents();
    } else if (tabName === 'network-control') {
        content.innerHTML = renderNetworkControlTab();
        bindNetworkControlEvents();
    } else if (tabName === 'focus-tasks') {
        content.innerHTML = renderFocusTasksTab();
        bindFocusTasksEvents();
    }

    window.scrollTo(0, 0);
}

function renderBottomNav() {
    return `
        <nav id="app-bottom-nav">
            <div class="app-nav-item active" data-tab="home">
                <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                <span>${currentLang === 'bn' ? 'হোম' : 'Home'}</span>
            </div>
            <div class="app-nav-item" data-tab="focus-tasks">
                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>${currentLang === 'bn' ? 'টাস্ক' : 'Tasks'}</span>
            </div>
            <div class="app-nav-item" data-tab="streak">
                <svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
                <span>${currentLang === 'bn' ? 'স্ট্রিক' : 'Streak'}</span>
            </div>
            <div class="app-nav-item" data-tab="routine">
                <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zm0-4a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zm0-4a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 13 6.5z"/></svg>
                <span>${currentLang === 'bn' ? 'রুটিন' : 'Routine'}</span>
            </div>
            <div class="app-nav-item" data-tab="browser">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                <span>${currentLang === 'bn' ? 'ব্রাউজার' : 'Browser'}</span>
            </div>
            <div class="app-nav-item" data-tab="settings">
                <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                <span>${currentLang === 'bn' ? 'সেটিংস' : 'Settings'}</span>
            </div>
        </nav>
    `;
}

function renderModalsAndOverlays() {
    return `
        <!-- Panic SOS Modal -->
        <div class="modal-overlay" id="panic-modal">
            <div class="modal-card" style="border-color: #EF5350;">
                <div style="font-family:'Kalpurush'; font-size:22px; font-weight:700; color:#EF5350; margin-bottom:10px;">
                    শান্ত হোন ও চোখ বন্ধ করুন!
                </div>
                <p style="font-size: 13px; color: #E2E8F0; line-height: 1.6; margin-bottom: 18px; text-align: left;">
                    ১. ফোনটি হাত থেকে নামিয়ে রাখুন।<br>
                    ২. ৪ সেকেন্ড নাক দিয়ে শ্বাস নিন, ৭ সেকেন্ড ধরে রাখুন এবং ৮ সেকেন্ড মুখ দিয়ে ছাড়ুন।<br>
                    ৩. ঠান্ডা পানি দিয়ে মুখ ধুয়ে আসুন। এই তাড়না মাত্র ৩-৫ মিনিট থাকবে, তারপর মিলিয়ে যাবে।
                </p>
                <button class="btn-primary-focus" id="btn-close-panic" style="background:#EF5350; color:#FFF; margin-bottom:0;">
                    আমি নিজেকে নিয়ন্ত্রণ করেছি
                </button>
            </div>
        </div>

        <!-- Relapse Modal -->
        <div class="modal-overlay" id="relapse-modal">
            <div class="modal-card">
                <h3 style="font-family:'Kalpurush'; color:var(--danger); margin-bottom:10px; font-size:20px;">রিসেট নিশ্চিতকরণ</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;">কারণ বা সমস্যা লিখে রাখুন (অপশনাল):</p>
                <textarea id="relapse-reason-input" class="input-dark" style="height:70px;" placeholder="যেমন: রাতে দেরি করে ঘুমানো, স্ট্রেস..."></textarea>
                <div class="modal-btn-row">
                    <button class="btn-modal" style="background:rgba(128,128,128,0.2); color:var(--text-color);" id="btn-modal-cancel-relapse">বাতিল</button>
                    <button class="btn-modal" style="background:var(--danger); color:#FFF;" id="btn-modal-confirm-relapse">রিসেট করুন</button>
                </div>
            </div>
        </div>

        <!-- Audio Category & Offline Library Modal -->
        <div class="modal-overlay" id="audio-category-modal-overlay">
            <div class="modal-card" style="max-height: 85vh; overflow-y: auto; text-align: left;">
                <h3 style="color:var(--accent-green); font-size:18px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    অডিও লাইব্রেরি (Supabase)
                </h3>
                <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">এক ক্লিকে ক্যাশ করে অফলাইনে শুনুন:</p>
                <div id="audio-categories-list-container"></div>
                <button class="btn-modal" id="btn-close-audio-modal" style="width:100%; margin-top:10px; background:#263238; color:#FFF;">সম্পন্ন / বন্ধ করুন</button>
            </div>
        </div>

        <!-- Target Customization Modal -->
        <div class="modal-overlay" id="target-custom-modal">
            <div class="modal-card" style="text-align: left; max-width: 360px;">
                <h3 style="font-family:'Kalpurush'; color:var(--accent-green); margin-bottom:12px; font-size:18px;">ডেইলি টার্গেট কাস্টমাইজ</h3>

                <label style="font-size: 11px; color: var(--text-muted);">শিরোনাম বা শব্দ</label>
                <input type="text" id="target-title-input" class="input-dark" placeholder="যেমন: দরূদ শরীফ">
                <label style="font-size: 11px; color: var(--text-muted);">উচ্চারণ / অর্থ</label>
                <input type="text" id="target-meaning-input" class="input-dark" placeholder="যেমন: আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ">
                <label style="font-size: 11px; color: var(--text-muted);">লক্ষ্যমাত্রা (সংখ্যা)</label>
                <input type="number" id="target-goal-input" class="input-dark" min="1" max="1000" placeholder="100">
                <label style="font-size: 11px; color: var(--text-muted);">কাস্টম অডিও ফাইল (অপশনাল)</label>
                <input type="file" id="target-audio-file" accept="audio/*" style="font-size:12px; color:var(--text-muted); margin-bottom:12px; width:100%;">
                <div class="modal-btn-row">
                    <button class="btn-modal" style="background:#263238; color:#FFF;" id="btn-close-target-modal">বাতিল</button>
                    <button class="btn-modal" style="background:var(--accent-green); color:#000;" id="btn-save-target-custom">সংরক্ষণ</button>
                </div>
            </div>
        </div>

        <!-- Unlock Alert (Unlock Guard) Config Modal -->
        <div class="modal-overlay" id="unlock-alert-modal">
            <div class="modal-card" style="text-align: left; border: 1.5px solid rgba(239, 68, 68, 0.4); max-width: 360px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--card-border); padding-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:20px; height:20px; color:#f87171; flex-shrink:0;"><path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6zM18 20H6V10h12v10z"/></svg>
                        <span style="font-weight:800; font-size:16px; color:#ffffff;">আনলক অ্যালার্ট</span>
                    </div>
                    <label class="alarm-switch">
                        <input type="checkbox" id="modal-guard-toggle-chk">
                        <span class="switch-slider"></span>
                    </label>
                </div>

                <!-- সাউন্ড নির্বাচন সেকশন -->
                <div style="margin-bottom:16px;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                        <span>আনলক সাউন্ড সিলেক্ট করুন:</span>
                    </label>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; cursor:pointer;">
                            <input type="radio" name="modal-guard-sound-choice" value="durood_sharif" style="accent-color:var(--accent-green);">
                            <div>
                                <div style="font-size:13px; font-weight:700; color:#fff;">দরূদ শরীফ (ডিফল্ট)</div>
                                <div style="font-size:11px; color:var(--text-muted);">ফোন আনলকে স্বয়ংক্রিয়ভাবে দরূদ পাঠ হবে</div>
                            </div>
                        </label>

                        <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; cursor:pointer;">
                            <input type="radio" name="modal-guard-sound-choice" value="custom" style="accent-color:var(--accent-green);">
                            <div style="flex:1; overflow:hidden;">
                                <div style="font-size:13px; font-weight:700; color:#fff;">নিজের পছন্দের অডিও</div>
                                <div id="modal-guard-custom-audio-label" style="font-size:11px; color:var(--accent-green); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ফোন থেকে অডিও দিন
                                </div>
                            </div>

                            <button type="button" id="modal-btn-pick-custom-audio" style="background:#1565C0; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; flex-shrink:0; display:flex; align-items:center; gap:4px;">
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                                <span>অডিও</span>
                            </button>
                        </label>
                    </div>

                    <input type="file" id="modal-guard-audio-file-input" accept="audio/*" style="display:none;" />
                </div>

                <!-- ঐচ্ছিক পপ-আপ মেসেজ -->
                <div style="margin-bottom:18px;">
                    <label style="font-size:11px; color:var(--text-muted); font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                        <span>আনলক স্ক্রিন বার্তা (ঐচ্ছিক):</span>
                    </label>
                    <input type="text" id="modal-guard-caution-text" class="input-dark" style="height:42px; margin-bottom:0; font-size:14px;" placeholder="صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ" value="صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ" />
                </div>

                <div class="modal-btn-row">
                    <button class="btn-modal" style="background:#263238; color:#FFF;" id="btn-close-unlock-guard-modal">বাতিল</button>
                    <button class="btn-modal" style="background:#22c55e; color:#000; font-weight:bold;" id="btn-save-unlock-guard-modal">সংরক্ষণ (Save)</button>
                </div>
            </div>
        </div>

        <!-- Feature Guide Modal -->
        <div class="modal-overlay" id="about-apps-modal" style="display: none;">
            <div class="modal-card" style="text-align: left; border: 1.5px solid rgba(16, 185, 129, 0.4); max-width: 420px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; padding: 18px 16px; box-sizing: border-box; background: #0b1326; border-radius: 20px;">

                <!-- Modal Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 12px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 22px; height: 22px; color: #10b981; flex-shrink: 0;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <div>
                            <span style="font-weight: 800; font-size: 16px; color: #ffffff;">ফিচার গাইড</span>
                            <p style="font-size: 11px; color: #94a3b8; margin-top: 1px;">Helpniche অ্যাপের মূল ফিচার ও ব্যবহার নির্দেশিকা</p>
                        </div>
                    </div>
                    <button id="btn-close-about-apps-modal" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 6px 10px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>

                <!-- Scrollable Content -->
                <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px;">

                    <!-- Point 1: Core Protection -->
                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #34d399; flex-shrink: 0;"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                            <span style="font-weight: 700; font-size: 13px; color: #34d399;">১. কোর প্রটেকশন (পর্নো ও অ্যাডাল্ট কনটент ফিল্টার)</span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
                            ফ্যামিলি ডিএনএস (Family DNS) এবং স্ট্রিক্ট ফিল্টারিং প্রযুক্তির মাধ্যমে আপনার ডিভাইসের সকল ব্রাউজারে পর্নোগ্রাফি ও অ্যাডাল্ট কনটেন্ট স্বয়ংক্রিয়ভাবে ব্লক থাকে। এটি সার্বক্ষণিকভাবে সচল থেকে আপনার চোখ ও মনকে পবিত্র রাখতে সাহায্য করে।
                        </p>
                    </div>

                    <!-- Point 2: Social Control -->
                    <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #38bdf8; flex-shrink: 0;"><path fill="currentColor" d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                            <span style="font-weight: 700; font-size: 13px; color: #38bdf8;">২. সোশ্যাল কন্ট্রোল</span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
                            ফেসবুক, ইউটিউব, ইনস্টাগ্রাম, টিকটক ইত্যাদি সোশ্যাল মিডিয়া ও শর্টস/রিলসের অতিরিক্ত আসক্তি রুখতে নির্দিষ্ট সময়সীমা নির্ধারণ করে লক করে রাখা যায়। সময় শেষ হলে অ্যাপ স্বয়ংক্রিয়ভাবে স্ক্রিন আটকে দেয়।
                        </p>
                    </div>

                    <!-- Point 3: Deep Focus Session -->
                    <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #c084fc; flex-shrink: 0;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            <span style="font-weight: 700; font-size: 13px; color: #c084fc;">৩. ডিপ ফোকাস সেশন</span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
                            পড়াশোনা, কাজ বা ইবাদতের সময় ফোকাস লক চালুর মাধ্যমে নির্ধারিত সময়ের জন্য পুরো ফোনকে বিভ্রান্তিমুক্ত রাখা যায়। এটি ইচ্ছাশক্তি দুর্বল হলেও ডিজিটাল ডিস্ট্র্যাকশন থেকে আপনাকে মুক্ত রাখবে।
                        </p>
                    </div>

                    <!-- Point 4: Streak & Protection Counter -->
                    <div style="background: rgba(251, 146, 60, 0.08); border: 1px solid rgba(251, 146, 60, 0.25); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #fb923c; flex-shrink: 0;"><path fill="currentColor" d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>
                            <span style="font-weight: 700; font-size: 13px; color: #fb923c;">৪. স্ট্রাইক ও প্রটেকশন কাউন্টার</span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
                            আপনার আত্মনিয়ন্ত্রণ ও লক্ষ্যমাত্রা পূরণের ধারাবাহিকতা ট্র্যাকিং হয়। অ্যাপ ব্যবহারের কতদিন এবং কত ঘণ্টা সুরক্ষিত আছেন তার লাইভ হিসাব এবং ইসলামিক পদবী অর্জনের অগ্রগতি দেখায়।
                        </p>
                    </div>

                    <!-- Point 5: Routine, Unlock Guard & Tasbih -->
                    <div style="background: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #facc15; flex-shrink: 0;"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/></svg>
                            <span style="font-weight: 700; font-size: 13px; color: #facc15;">৫. রুটিন, আনলক গার্ড ও তাসবিহ</span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
                            দৈনন্দিন ১০০ বার দরূদ শরীফ পাঠের ডেইলি টার্গেট, শক্তিশালী অ্যালার্ম এবং ফোন আনলক করলেই দরূদ পাঠের স্মারক ও ভাইব্রেশনাল সচেতনতা কার্যকর থাকে। সাথে রয়েছে ডিজিটাল তাসবিহ ও তাসবিহ-ই-ফাতিমি মোড।
                        </p>
                    </div>

                    <!-- Point 6: Settings & Anti-Tampering -->
                    <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #fb7185; flex-shrink: 0;"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                            <span style="font-weight: 700; font-size: 13px; color: #fb7185;">৬. সেটিংস ও অ্যান্টি-ট্যাম্পারিং (আনইনস্টল গার্ড)</span>
                        </div>
                        <p style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">
                            আবেগের বশে অ্যাপ আনইনস্টল বা বন্ধ করা রোধ করতে ডিভাইস অ্যাডমিন এবং অ্যাক্সেসিবিলিটি সার্ভিস গুরুত্বপূর্ণ ভূমিকা পালন করে। টেলিগ্রাম অ্যাডমিন মাস্টার কোড ছাড়া অ্যাপ সরানো অসম্ভব।
                        </p>
                    </div>

                </div>

                <button class="btn-primary-focus" id="btn-understand-about-apps" style="margin-top: 12px; margin-bottom: 0; background: #10b981; color: #000; font-weight: bold; flex-shrink: 0;">
                    ঠিক আছে
                </button>

            </div>
        </div>
                </button>

            </div>
        </div>

        <!-- Feature & Permission Guide Modal -->
        <div class="modal-overlay" id="permission-guide-modal" style="display: none; z-index: 100005;">
            <div class="modal-card" style="text-align: left; border: 1px solid rgba(255, 255, 255, 0.1); max-width: 440px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; padding: 18px 16px; box-sizing: border-box; background: #0d1527; border-radius: 18px; box-shadow: 0 16px 40px rgba(0,0,0,0.8);">

                <!-- Modal Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 14px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px; color: #38bdf8;"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/></svg>
                        </div>
                        <div>
                            <span style="font-weight: 700; font-size: 15px; color: #ffffff; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">সুরক্ষা সেটিংস</span>
                            <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">আপনার সুবিধামতো নিয়ন্ত্রণগুলো সক্রিয় রাখুন</p>
                        </div>
                    </div>
                    <button id="btn-close-permission-guide-modal" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 5px 8px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px;"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>

                <!-- Scrollable Content -->
                <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 2px;">

                    <!-- Reels & Shorts Blocker -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">শর্টস ও রিলস প্রতিরোধ</span>
                            <button id="btn-perm-accessibility" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ফেসবুক ও ইউটিউবের রিলস স্বয়ংক্রিয়ভাবে বন্ধ রেখে মনোযোগ ধরে রাখে।
                        </p>
                    </div>

                    <!-- Anti-Uninstall Guard -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">অ্যাপ মুছে ফেলা প্রতিরোধ</span>
                            <button id="btn-perm-admin" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            হুট করে বা সাময়িক দুর্বল মুহূর্তে অ্যাপ ডিলিট করা রোধ করে সুরক্ষা দেয়।
                        </p>
                    </div>

                    <!-- Ad Controller & Content Filter -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">অনাকাঙ্ক্ষিত ওয়েবসাইট ও বিজ্ঞাপন ফিল্টার</span>
                            <button id="btn-perm-vpn" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ব্রাউজারে ক্ষতিকর ওয়েবসাইট এবং বিভ্রান্তিকর বিজ্ঞাপন আটকে দেয়।
                        </p>
                    </div>

                    <!-- Battery Optimization Bypass -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">ব্যাকগ্রাউন্ডে সচল রাখা</span>
                            <button id="btn-perm-battery" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ফোন স্লিপ মোডে থাকলেও সব অ্যালার্ম ও সুরক্ষা নিরবচ্ছিন্ন রাখে।
                        </p>
                    </div>

                    <!-- Android 13+ Restricted Settings (if needed) -->
                    <div id="row-perm-restricted" style="display: none; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">অতিরিক্ত নিয়ন্ত্রণ ছাড়পত্র (অ্যান্ড্রয়েড ১৩+)</span>
                            <button id="btn-perm-restricted" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            নতুন অ্যান্ড্রয়েড সিস্টেমে ব্লকার সার্ভিস সক্রিয় রাখতে এই অনুমতি প্রয়োজন।
                        </p>
                    </div>

                    <!-- Overlay: Display over other apps (alarm + floating unlock bubble) -->
                    <div id="row-perm-overlay" style="display: none; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">অন্য অ্যাপের ওপরে দেখানো</span>
                            <button id="btn-perm-overlay" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            লকস্ক্রিনে অ্যালার্ম ও আনলক কাউন্টডাউন বাবল দেখাতে এই অনুমতি প্রয়োজন।
                        </p>
                    </div>

                    <!-- Exact alarm: Alarms & reminders (Android 12+) -->
                    <div id="row-perm-exact-alarm" style="display: none; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">সঠিক সময়ে অ্যালার্ম (অ্যান্ড্রয়েড ১২+)</span>
                            <button id="btn-perm-exact-alarm" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            নির্ধারিত সময়ে হুবহু অ্যালার্ম বাজাতে এই অনুমতি দিন।
                        </p>
                    </div>

                    <!-- Full-screen intent (Android 14+) -->
                    <div id="row-perm-fullscreen-intent" style="display: none; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                            <span style="font-weight: 700; font-size: 13.5px; color: #f1f5f9; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">লকস্ক্রিনে অ্যালার্ম পপ-আপ (অ্যান্ড্রয়েড ১৪+)</span>
                            <button id="btn-perm-fullscreen-intent" style="padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; outline: none; border: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></button>
                        </div>
                        <p style="font-size: 11.5px; color: #94a3b8; line-height: 1.45; margin: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ফোন লক থাকা অবস্থায় অ্যালার্ম স্ক্রিনে ভেসে উঠতে এই অনুমতি প্রয়োজন।
                        </p>
                    </div>

                </div>

                <!-- Footer & Trust Line -->
                <div style="margin-top: 12px; flex-shrink: 0; text-align: center;">
                    <p style="font-size: 11px; color: #64748b; margin: 0 0 10px 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">আপনার তথ্য শুধুমাত্র আপনার ডিভাইসেই সুরক্ষিত থাকে</p>
                    <button id="btn-close-permission-guide-bottom" style="width: 100%; background: #1e293b; color: #f1f5f9; font-weight: 700; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; font-size: 13px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                        ঠিক আছে
                    </button>
                </div>

            </div>
        </div>

        <!-- New Alarm Modal -->
        <div class="modal-overlay" id="alarm-modal">
            <div class="modal-card" style="text-align: left; max-width: 360px;">
                <h3 style="font-family:'Kalpurush'; color:var(--accent-green); margin-bottom:12px; font-size:18px;">নতুন অ্যালার্ম</h3>
                <input type="time" id="new-alarm-time" class="input-dark" style="font-size:22px; text-align:center;" value="12:00">
                <input type="text" id="new-alarm-title" class="input-dark" placeholder="শিরোনাম (যেমন: তাহাজ্জুদ সালাত)">

                <!-- রিপিট মোড ও কাস্টম দিন সিলেকশন -->
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">রিপিট অপশন:</label>
                    <select id="new-alarm-repeat-mode" class="input-dark" style="height:38px; padding:6px 10px; font-size:13px; font-weight:bold; margin-bottom:8px;" onchange="
                        const customBox = document.getElementById('alarm-custom-days-box');
                        if (customBox) customBox.style.display = (this.value === 'custom') ? 'flex' : 'none';
                    ">
                        <option value="everyday">প্রতিদিন (Everyday)</option>
                        <option value="once">একবার (Once)</option>
                        <option value="custom">নির্দিষ্ট দিন (Custom Days)</option>
                    </select>

                    <div id="alarm-custom-days-box" style="display:none; flex-wrap:wrap; gap:8px; margin-top:6px; background:rgba(255,255,255,0.05); padding:8px; border-radius:8px;">
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="7" checked> শনি</label>
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="1" checked> রবি</label>
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="2" checked> সোম</label>
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="3" checked> মঙ্গল</label>
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="4" checked> বুধ</label>
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="5" checked> বৃহস্পতি</label>
                        <label style="font-size:11px; color:#fff; display:flex; align-items:center; gap:3px;"><input type="checkbox" class="chk-alarm-day" value="6" checked> শুক্র</label>
                    </div>
                </div>

                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <button class="btn-modal" style="background:#1E293B; color:#E2E8F0; padding:8px;" id="btn-browse-alarm-audio">অডিও বাছুন</button>
                    <span style="font-size:12px; color:var(--text-muted);" id="new-alarm-audio-name">ডিফল্ট ভয়েস</span>
                </div>
                <input type="file" id="new-alarm-audio-file" accept="audio/*" style="display:none;">
                <div class="modal-btn-row">
                    <button class="btn-modal" style="background:#263238; color:#FFF;" id="btn-close-alarm-modal">বাতিল</button>
                    <button class="btn-modal" style="background:var(--accent-green); color:#000;" id="btn-save-alarm">সংরক্ষণ</button>
                </div>
            </div>
        </div>


        <!-- Fullscreen Alarm Takeover -->
        <div id="fullscreen-alarm-screen" class="fullscreen-takeover">
            <div style="font-size: 52px; font-weight: 800; color: #00E676;" id="fs-alarm-time">00:00</div>
            <div style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin-top: 10px;" id="fs-alarm-title">নির্ধারিত সময় হয়েছে</div>
            <button class="btn-primary-focus" id="btn-dismiss-fs-alarm" style="width:auto; padding:14px 40px; margin-top:24px; background:#00E676;">
                সম্পন্ন / বন্ধ করুন
            </button>
        </div>

        <!-- Fullscreen Blocked App Lockout Takeover -->
        <div id="fullscreen-blocked-app-overlay" class="fullscreen-takeover">
            <div style="background:#FF1744; color:#FFF; font-size:11px; font-weight:800; padding:6px 16px; border-radius:20px; letter-spacing:1px; margin-bottom:14px; display:inline-flex; align-items:center; gap:6px;">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:currentColor;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                <span>অ্যাপ ব্লকড (STRICT MODE)</span>
            </div>

            <!-- Dynamic Bangla Heading -->
            <div id="fs-blocked-heading" style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 10px; max-width: 310px; text-align: center; line-height: 1.4;">
                অ্যাপ দেখার জন্য অপেক্ষা করুন
            </div>

            <!-- Dynamic Subtitle -->
            <div id="fs-blocked-subtext" style="font-size: 13px; color: #CBD5E1; margin-bottom: 24px; max-width: 290px; text-align: center; line-height: 1.5;">
                নির্ধারিত ব্লক সময় শেষ না হওয়া পর্যন্ত এই অ্যাপটি খোলা সম্ভব হবে না।
            </div>

            <!-- Live Countdown Display -->
            <div style="background: rgba(255, 23, 68, 0.12); border: 2px solid rgba(255, 23, 68, 0.4); border-radius: 16px; padding: 16px 28px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; color: #FF8A80; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase;">
                    অবশিষ্ট ব্লক সময়
                </div>
                <div style="font-size: 30px; font-weight: 800; color: #FF1744; font-family: system-ui, sans-serif; letter-spacing: 1px;" id="fs-blocked-timer">
                    ০০ মিনিট ০০ সেকেন্ড
                </div>
            </div>

            <button class="btn-primary-focus" id="btn-close-blocked-app-fs" style="background:#FF1744; color:#FFF; width:auto; padding:14px 40px; box-shadow:0 4px 14px rgba(255,23,68,0.4);">
                হোম স্ক্রিনে ফিরে যান
            </button>
        </div>
    `;
}

function bindGlobalEvents() {
    const btnCloseBrowser = document.getElementById('btn-close-browser-modal');
    if (btnCloseBrowser) btnCloseBrowser.onclick = hideBrowserModal;
    const btnStartBrowser = document.getElementById('btn-start-browser-download');
    if (btnStartBrowser) btnStartBrowser.onclick = startBrowserDownloadAndInstall;
    document.querySelectorAll('.app-nav-item').forEach(el => {
        el.onclick = () => switchTab(el.dataset.tab);
    });

    // Fullscreen Penalty Lock Overlay Tap & AutoPlay Event Listeners
    let lastPenaltyTapTime = 0;
    // Panic Modal
    const btnClosePanic = document.getElementById('btn-close-panic');
    if (btnClosePanic) {
        btnClosePanic.onclick = () => {
            document.getElementById('panic-modal').style.display = 'none';
        };
    }

    // Relapse Modal
    const btnCancelRelapse = document.getElementById('btn-modal-cancel-relapse');
    if (btnCancelRelapse) {
        btnCancelRelapse.onclick = () => {
            document.getElementById('relapse-modal').style.display = 'none';
        };
    }

    const btnConfirmRelapse = document.getElementById('btn-modal-confirm-relapse');
    if (btnConfirmRelapse) {
        btnConfirmRelapse.onclick = () => {
            const reasonInput = document.getElementById('relapse-reason-input');
            const reason = reasonInput ? reasonInput.value.trim() : '';
            const totalDays = Math.floor((Date.now() - streakStartTime) / (1000 * 24 * 3600));
            const history = JSON.parse(localStorage.getItem('STREAK_HISTORY') || '[]');
            history.push({
                days: totalDays,
                startDate: new Date(streakStartTime).toLocaleDateString(),
                endDate: new Date().toLocaleDateString(),
                comment: reason
            });
            localStorage.setItem('STREAK_HISTORY', JSON.stringify(history));

            streakStartTime = Date.now();
            localStorage.setItem('STREAK_START_TIME', streakStartTime.toString());
            selectedTrackingRankIndex = -1;
            if (reasonInput) reasonInput.value = '';
            document.getElementById('relapse-modal').style.display = 'none';
            updateStreakDisplays();
            switchTab('streak');
        };
    }

    // Audio Category Modal Close
    const btnCloseAudio = document.getElementById('btn-close-audio-modal');
    if (btnCloseAudio) {
        btnCloseAudio.onclick = () => {
            document.getElementById('audio-category-modal-overlay').style.display = 'none';
        };
    }

    // Target Modal Handlers
    let tempTargetAudio = null;
    const targetAudioFileEl = document.getElementById('target-audio-file');
    if (targetAudioFileEl) {
        targetAudioFileEl.onchange = (e) => {
            const f = e.target.files[0];
            if (f) {
                const r = new FileReader();
                r.onload = (evt) => { tempTargetAudio = evt.target.result; };
                r.readAsDataURL(f);
            }
        };
    }

    const btnCloseTargetModal = document.getElementById('btn-close-target-modal');
    if (btnCloseTargetModal) {
        btnCloseTargetModal.onclick = () => {
            document.getElementById('target-custom-modal').style.display = 'none';
        };
    }

    const btnSaveTargetCustom = document.getElementById('btn-save-target-custom');
    if (btnSaveTargetCustom) {
        btnSaveTargetCustom.onclick = () => {
            const titleInp = document.getElementById('target-title-input');
            const meanInp = document.getElementById('target-meaning-input');
            const goalInp = document.getElementById('target-goal-input');

            dailyTarget.title = (titleInp && titleInp.value.trim()) || 'ডেইলি টার্গেট';
            dailyTarget.meaning = meanInp ? meanInp.value.trim() : '';
            dailyTarget.goal = (goalInp && parseInt(goalInp.value, 10)) || 100;

            if (tempTargetAudio) dailyTarget.audioData = tempTargetAudio;
            localStorage.setItem('DAILY_TARGET_CONFIG', JSON.stringify(dailyTarget));

            document.getElementById('target-custom-modal').style.display = 'none';
            switchTab('routine');
        };
    }

    // Alarm Modal Handlers
    let alarmAudioData = null;
    let alarmAudioName = '';
    const btnBrowseAlarmAudio = document.getElementById('btn-browse-alarm-audio');
    if (btnBrowseAlarmAudio) {
        btnBrowseAlarmAudio.onclick = () => {
            const fileInp = document.getElementById('new-alarm-audio-file');
            if (fileInp) fileInp.click();
        };
    }

    const alarmAudioFileEl = document.getElementById('new-alarm-audio-file');
    if (alarmAudioFileEl) {
        alarmAudioFileEl.onchange = (e) => {
            const f = e.target.files[0];
            if (f) {
                alarmAudioName = f.name;
                const nameEl = document.getElementById('new-alarm-audio-name');
                if (nameEl) nameEl.innerText = f.name;
                const r = new FileReader();
                r.onload = (evt) => { alarmAudioData = evt.target.result; };
                r.readAsDataURL(f);
            }
        };
    }

    const btnCloseAlarmModal = document.getElementById('btn-close-alarm-modal');
    if (btnCloseAlarmModal) {
        btnCloseAlarmModal.onclick = () => {
            document.getElementById('alarm-modal').style.display = 'none';
        };
    }

    const btnSaveAlarm = document.getElementById('btn-save-alarm');
    if (btnSaveAlarm) {
        btnSaveAlarm.onclick = () => {
            const timeInp = document.getElementById('new-alarm-time');
            const titleInp = document.getElementById('new-alarm-title');
            const repeatModeEl = document.getElementById('new-alarm-repeat-mode');
            const time = timeInp ? timeInp.value : '12:00';
            const title = (titleInp && titleInp.value.trim()) || 'নির্ধারিত সময়';
            const repeatMode = repeatModeEl ? repeatModeEl.value : 'everyday';

            const selectedDays = [];
            document.querySelectorAll('.chk-alarm-day:checked').forEach(chk => {
                selectedDays.push(parseInt(chk.value, 10));
            });

            const alarmId = Math.abs(Date.now() % 2147483647);
            const parts = time.split(':');
            const h = parseInt(parts[0], 10) || 12;
            const m = parseInt(parts[1], 10) || 0;

            const alarmObj = {
                id: alarmId,
                time: time,
                title: title,
                enabled: true,
                hour: h,
                minute: m,
                repeatMode: repeatMode,
                repeatDays: selectedDays.length > 0 ? selectedDays : [1,2,3,4,5,6,7],
                audioData: alarmAudioData,
                audioName: alarmAudioName || 'ডিফল্ট ভয়েস'
            };

            alarms.push(alarmObj);
            localStorage.setItem('CUSTOM_ALARMS', JSON.stringify(alarms));

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin) {
                try {
                    window.Capacitor.Plugins.UnlockPlugin.scheduleAlarm({
                        id: alarmId,
                        title: title,
                        timeStr: time,
                        hour: h,
                        minute: m,
                        enabled: true,
                        audioType: 'alarm',
                        repeatMode: repeatMode,
                        repeatDays: selectedDays.length > 0 ? selectedDays : [1,2,3,4,5,6,7]
                    });
                } catch (e) {
                    console.error('Error scheduling native alarm:', e);
                }
            }

            document.getElementById('alarm-modal').style.display = 'none';
            switchTab('routine');
        };
    }

    // Fullscreen Alarm Dismiss
    const btnDismissAlarm = document.getElementById('btn-dismiss-fs-alarm');
    if (btnDismissAlarm) {
        btnDismissAlarm.onclick = () => {
            document.getElementById('fullscreen-alarm-screen').style.display = 'none';
            if (alarmAudioPlayer) {
                alarmAudioPlayer.pause();
                alarmAudioPlayer.currentTime = 0;
            }
        };
    }

    // H18 FIX: removed dead "Penalty Manual Tap" handler — #btn-penalty-manual-tap,
    // #penalty-remaining-count and #fullscreen-penalty-lock markup do not exist
    // anywhere in the app and nothing ever shows the overlay, so the handler
    // could never run. (CSS + dailyTarget.penaltyLockEnabled scaffolding kept.)


    // Dismiss Blocked App Takeover Overlay
    const btnDismissBlockedApp = document.getElementById('btn-close-blocked-app-fs');
    if (btnDismissBlockedApp) {
        btnDismissBlockedApp.onclick = () => {
            if (blockedAppCountdownInterval) {
                clearInterval(blockedAppCountdownInterval);
                blockedAppCountdownInterval = null;
            }
            document.getElementById('fullscreen-blocked-app-overlay').style.display = 'none';
            switchTab('home');
        };
    }

    // About Apps Modal Event Bindings
    const btnCloseAboutAppsModal = document.getElementById('btn-close-about-apps-modal');
    if (btnCloseAboutAppsModal) {
        btnCloseAboutAppsModal.onclick = () => {
            document.getElementById('about-apps-modal').style.display = 'none';
        };
    }

    const btnUnderstandAboutApps = document.getElementById('btn-understand-about-apps');
    if (btnUnderstandAboutApps) {
        btnUnderstandAboutApps.onclick = () => {
            document.getElementById('about-apps-modal').style.display = 'none';
        };
    }

    // Unlock Guard Modal Handlers
    const btnCloseGuardModal = document.getElementById('btn-close-unlock-guard-modal');
    if (btnCloseGuardModal) {
        btnCloseGuardModal.onclick = () => {
            document.getElementById('unlock-alert-modal').style.display = 'none';
        };
    }

    const btnPickGuardAudio = document.getElementById('modal-btn-pick-custom-audio');
    if (btnPickGuardAudio) {
        btnPickGuardAudio.onclick = () => {
            const fileInp = document.getElementById('modal-guard-audio-file-input');
            if (fileInp) fileInp.click();
        };
    }

    const guardAudioFileInp = document.getElementById('modal-guard-audio-file-input');
    if (guardAudioFileInp) {
        guardAudioFileInp.onchange = (e) => {
            const f = e.target.files[0];
            if (f) {
                const r = new FileReader();
                r.onload = (evt) => {
                    unlockGuard.customAudioName = f.name;
                    unlockGuard.customAudioBase64 = evt.target.result;
                    const label = document.getElementById('modal-guard-custom-audio-label');
                    if (label) label.innerText = f.name;
                    const customRadio = document.querySelector('input[name="modal-guard-sound-choice"][value="custom"]');
                    if (customRadio) customRadio.checked = true;
                };
                r.readAsDataURL(f);
            }
        };
    }

    const btnSaveGuardModal = document.getElementById('btn-save-unlock-guard-modal');
    if (btnSaveGuardModal) {
        btnSaveGuardModal.onclick = () => {
            const chk = document.getElementById('modal-guard-toggle-chk');
            const txt = document.getElementById('modal-guard-caution-text');
            const selectedRadio = document.querySelector('input[name="modal-guard-sound-choice"]:checked');

            unlockGuard.enabled = chk ? chk.checked : false;
            let enteredText = txt ? txt.value.trim() : '';
            if (!enteredText) {
                enteredText = 'صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ';
            }
            unlockGuard.text = enteredText;
            unlockGuard.audioType = selectedRadio ? selectedRadio.value : 'durood_sharif';

            if (unlockGuard.audioType === 'custom' && !unlockGuard.customAudioBase64) {
                alert('অনুগ্রহ করে অডিও ফাইল নির্বাচন করুন!');
                return;
            }

            localStorage.setItem('UNLOCK_GUARD', JSON.stringify(unlockGuard));

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin) {
                try {
                    window.Capacitor.Plugins.UnlockPlugin.setUnlockReminder({
                        enabled: unlockGuard.enabled,
                        text: unlockGuard.text,
                        audioType: unlockGuard.audioType,
                        customAudioBase64: unlockGuard.customAudioBase64 || '',
                        customAudioName: unlockGuard.customAudioName || ''
                    });
                } catch (err) {
                    console.error('Error syncing unlock guard to native:', err);
                }
            }

            document.getElementById('unlock-alert-modal').style.display = 'none';
            switchTab('home');
            alert(`সংরক্ষিত হয়েছে!\nস্ট্যাটাস: ${unlockGuard.enabled ? 'চালু (ON)' : 'বন্ধ (OFF)'}`);
        };
    }
}

window.openUnlockGuardModal = function() {
    const modal = document.getElementById('unlock-alert-modal');
    if (!modal) return;

    const chk = document.getElementById('modal-guard-toggle-chk');
    if (chk) chk.checked = !!unlockGuard.enabled;

    const txt = document.getElementById('modal-guard-caution-text');
    if (txt) {
        txt.value = (unlockGuard.text && unlockGuard.text.trim()) ? unlockGuard.text.trim() : 'صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّমَ';
    }

    const curType = unlockGuard.audioType || 'durood_sharif';
    const radio = document.querySelector(`input[name="modal-guard-sound-choice"][value="${curType}"]`);
    if (radio) radio.checked = true;

    const label = document.getElementById('modal-guard-custom-audio-label');
    if (label) {
        label.innerText = unlockGuard.customAudioName ? unlockGuard.customAudioName : 'ফোন থেকে অডিও দিন';
    }

    modal.style.display = 'flex';
};

// Global Live Countdown Manager for Blocked Apps
let blockedAppCountdownInterval = null;

function formatBanglaRemainingTime(totalSeconds) {
    if (totalSeconds <= 0) return "০০ সেকেন্ড";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const toBanglaDigits = (num) => {
        const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().padStart(2, '0').replace(/\d/g, (digit) => banglaDigits[parseInt(digit, 10)]);
    };

    if (minutes > 0 && seconds > 0) {
        return `${toBanglaDigits(minutes)} মিনিট ${toBanglaDigits(seconds)} সেকেন্ড`;
    } else if (minutes > 0) {
        return `${toBanglaDigits(minutes)} মিনিট`;
    } else {
        return `${toBanglaDigits(seconds)} সেকেন্ড`;
    }
}

window.showBlockedAppTakeoverOverlay = function(appName, remainingSeconds, packageName) {
    const overlayEl = document.getElementById('fullscreen-blocked-app-overlay');
    const headingEl = document.getElementById('fs-blocked-heading');
    const subtextEl = document.getElementById('fs-blocked-subtext');
    const timerEl = document.getElementById('fs-blocked-timer');

    if (!overlayEl) return;

    const safeAppName = appName && appName.trim() ? appName.trim() : "অ্যাপ";
    let secsLeft = Math.max(0, parseInt(remainingSeconds, 10) || 0);

    if (blockedAppCountdownInterval) {
        clearInterval(blockedAppCountdownInterval);
        blockedAppCountdownInterval = null;
    }

    const updateUI = () => {
        const timeText = formatBanglaRemainingTime(secsLeft);
        if (headingEl) {
            headingEl.innerText = `${safeAppName} দেখার জন্য ${timeText} অপেক্ষা করুন`;
        }
        if (subtextEl) {
            subtextEl.innerText = `নির্ধারিত ব্লক সময় শেষ না হওয়া পর্যন্ত ${safeAppName} খোলা সম্ভব হবে না।`;
        }
        if (timerEl) {
            timerEl.innerText = timeText;
        }
    };

    updateUI();
    overlayEl.style.display = 'flex';

    blockedAppCountdownInterval = setInterval(() => {
        secsLeft--;
        if (secsLeft <= 0) {
            clearInterval(blockedAppCountdownInterval);
            blockedAppCountdownInterval = null;
            overlayEl.style.display = 'none';
            alert(`সময় শেষ! আপনি এখন ${safeAppName} ব্যবহার করতে পারবেন।`);
        } else {
            updateUI();
        }
    }, 1000);
};

// ==========================================================================
// ABOUT APPS (FEATURE GUIDE) MODAL FUNCTION
// ==========================================================================

window.openAboutAppsModal = function() {
    const modal = document.getElementById('about-apps-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.openUnlockGuardModal = function() {
    const modal = document.getElementById('unlock-alert-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

/* ==========================================================================
   ONBOARDING PERMISSION WIZARD STATE MANAGER (ZERO EMOJI POLICY - SVG ONLY)
   ========================================================================== */

let onboardingPermissionStatus = {
    vpnGranted: false,
    adminActive: false,
    restrictedSettingsDone: false,
    accessibilityEnabled: false,
    batteryBypassed: false,
    overlayGranted: true,
    exactAlarmGranted: true,
    fullScreenIntentGranted: true,
    sdkInt: 33
};

const onboardingStepsConfig = {
    1: {
        stepKey: 'vpnGranted',
        title: 'ধাপ ১: ব্রাউজার সুরক্ষা ও ভিপিএন পারমিশন',
        desc: 'ক্ষতিকর ওয়েবসাইট স্বয়ংক্রিয়ভাবে ব্লক রাখতে এবং নিরাপদ ডিএনএস ফিল্টারিং সচল করতে ভিপিএন অনুমতি দিন।',
        btnText: 'অপশন চালু করুন',
        iconSvg: '<svg class="svg-icon" viewBox="0 0 24 24" style="width:32px; height:32px; fill:#34d399; filter:drop-shadow(0 0 6px rgba(52,211,153,0.4));"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/></svg>'
    },
    2: {
        stepKey: 'adminActive',
        title: 'ধাপ ২: ডিভাইস অ্যাডমিন সক্রিয়করণ',
        desc: 'অনাকাঙ্ক্ষিত আনইনস্টল রদ করতে এবং অ্যাপের নিরাপত্তা প্রাচীর সুদৃঢ় রাখতে ডিভাইস পলিসি সক্রিয় করুন।',
        btnText: 'ডিভাইস অ্যাডমিন অন করুন',
        iconSvg: '<svg class="svg-icon" viewBox="0 0 24 24" style="width:32px; height:32px; fill:#38bdf8; filter:drop-shadow(0 0 6px rgba(56,189,248,0.4));"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l7.59-7.59L20 7l-9 9z"/></svg>'
    },
    3: {
        stepKey: 'restrictedSettingsDone',
        title: 'ধাপ ৩: রেস্ট্রিক্টেড সেটিং রিমুভ',
        desc: 'অ্যান্ড্রয়েড ১৩+ ডিভাইসে পারমিশন চালুর বাধা সরাতে অ্যাপ ইনফো পেজ থেকে \'Allow restricted settings\' অপশন অন করুন।',
        btnText: 'সেটিংস পেজে যান',
        iconSvg: '<svg class="svg-icon" viewBox="0 0 24 24" style="width:32px; height:32px; fill:#fb923c; filter:drop-shadow(0 0 6px rgba(251,146,60,0.4));"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>'
    },
    4: {
        stepKey: 'accessibilityEnabled',
        title: 'ধাপ ৪: অ্যাক্সেসিবিলিটি সার্ভিস',
        desc: 'ব্লকিং ফিল্টার ও সিকিউরিটি শিল্ড ব্যাকগ্রাউন্ডে কার্যকর রাখতে \'Helpniche\' অ্যাক্সেসিবিলিটি সার্ভিস চালু করুন।',
        btnText: 'অ্যাক্সেসিবিলিটি চালু করুন',
        iconSvg: '<svg class="svg-icon" viewBox="0 0 24 24" style="width:32px; height:32px; fill:#a855f7; filter:drop-shadow(0 0 6px rgba(168,85,247,0.4));"><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>'
    },
    5: {
        stepKey: 'batteryBypassed',
        title: 'ধাপ ৫: ব্যাকগ্রাউন্ড ব্যাটারি অপটিমাইজেশন',
        desc: 'ব্যাকগ্রাউন্ডে সার্ভিস সচল রাখতে এবং অপটিমাইজেশন বাইপাস করতে ব্যাটারি সেটিংস আনরেস্ট্রিক্টেড করুন।',
        btnText: 'ব্যাটারি অপটিমাইজেশন সরান',
        iconSvg: '<svg class="svg-icon" viewBox="0 0 24 24" style="width:32px; height:32px; fill:#facc15; filter:drop-shadow(0 0 6px rgba(250,204,21,0.4));"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z"/></svg>'
    }
};

function toBengaliNum(num) {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bengaliDigits[d]);
}

function computeOnboardingProgress() {
    let completedCount = 0;
    const totalSteps = 5;

    if (onboardingPermissionStatus.vpnGranted) completedCount++;
    if (onboardingPermissionStatus.adminActive) completedCount++;
    if (onboardingPermissionStatus.restrictedSettingsDone) completedCount++;
    if (onboardingPermissionStatus.accessibilityEnabled) completedCount++;
    if (onboardingPermissionStatus.batteryBypassed) completedCount++;

    let nextStep = 0;
    if (!onboardingPermissionStatus.vpnGranted) {
        nextStep = 1;
    } else if (!onboardingPermissionStatus.adminActive) {
        nextStep = 2;
    } else if (!onboardingPermissionStatus.restrictedSettingsDone) {
        nextStep = 3;
    } else if (!onboardingPermissionStatus.accessibilityEnabled) {
        nextStep = 4;
    } else if (!onboardingPermissionStatus.batteryBypassed) {
        nextStep = 5;
    } else {
        nextStep = 6;
    }

    return { completedCount, totalSteps, nextStep };
}

window.syncOnboardingPermissionStatus = function(status) {
    if (status) {
        onboardingPermissionStatus = { ...onboardingPermissionStatus, ...status };
    }
    updatePermissionGuideUI();
    if (typeof updateSettingsShieldUI === 'function') {
        updateSettingsShieldUI(onboardingPermissionStatus);
    }
};

function fetchOnboardingStatusFromNative() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.getOnboardingStatus) {
        window.Capacitor.Plugins.UnlockPlugin.getOnboardingStatus().then(res => {
            if (res) {
                window.syncOnboardingPermissionStatus(res);
            }
        }).catch(err => console.log('Error fetching onboarding status:', err));
    }
}

window.openPermissionGuideModal = function() {
    const modal = document.getElementById('permission-guide-modal');
    if (modal) {
        modal.style.display = 'flex';
        updatePermissionGuideUI();
    }
};

window.closePermissionGuideModal = function() {
    const modal = document.getElementById('permission-guide-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

function closePermissionGuideModal() {
    const modal = document.getElementById('permission-guide-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updatePermissionGuideUI() {
    const { completedCount, totalSteps } = computeOnboardingProgress();

    // 1. Accessibility Button
    const btnAccessibility = document.getElementById('btn-perm-accessibility');
    if (btnAccessibility) {
        if (onboardingPermissionStatus.accessibilityEnabled) {
            btnAccessibility.innerText = 'চালু আছে';
            btnAccessibility.style.background = 'rgba(34, 197, 94, 0.12)';
            btnAccessibility.style.color = '#4ade80';
            btnAccessibility.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnAccessibility.onclick = null;
        } else {
            btnAccessibility.innerText = 'চালু করুন';
            btnAccessibility.style.background = '#0284c7';
            btnAccessibility.style.color = '#ffffff';
            btnAccessibility.style.border = 'none';
            btnAccessibility.onclick = () => executePermissionRequestStep(4);
        }
    }

    // 2. Device Admin Button
    const btnAdmin = document.getElementById('btn-perm-admin');
    if (btnAdmin) {
        if (onboardingPermissionStatus.adminActive) {
            btnAdmin.innerText = 'চালু আছে';
            btnAdmin.style.background = 'rgba(34, 197, 94, 0.12)';
            btnAdmin.style.color = '#4ade80';
            btnAdmin.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnAdmin.onclick = null;
        } else {
            btnAdmin.innerText = 'চালু করুন';
            btnAdmin.style.background = '#0284c7';
            btnAdmin.style.color = '#ffffff';
            btnAdmin.style.border = 'none';
            btnAdmin.onclick = () => executePermissionRequestStep(2);
        }
    }

    // 3. VPN Button
    const btnVpn = document.getElementById('btn-perm-vpn');
    if (btnVpn) {
        if (onboardingPermissionStatus.vpnGranted) {
            btnVpn.innerText = 'চালু আছে';
            btnVpn.style.background = 'rgba(34, 197, 94, 0.12)';
            btnVpn.style.color = '#4ade80';
            btnVpn.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnVpn.onclick = null;
        } else {
            btnVpn.innerText = 'চালু করুন';
            btnVpn.style.background = '#0284c7';
            btnVpn.style.color = '#ffffff';
            btnVpn.style.border = 'none';
            btnVpn.onclick = () => executePermissionRequestStep(1);
        }
    }

    // 4. Battery Button
    const btnBattery = document.getElementById('btn-perm-battery');
    if (btnBattery) {
        if (onboardingPermissionStatus.batteryBypassed) {
            btnBattery.innerText = 'চালু আছে';
            btnBattery.style.background = 'rgba(34, 197, 94, 0.12)';
            btnBattery.style.color = '#4ade80';
            btnBattery.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnBattery.onclick = null;
        } else {
            btnBattery.innerText = 'চালু করুন';
            btnBattery.style.background = '#0284c7';
            btnBattery.style.color = '#ffffff';
            btnBattery.style.border = 'none';
            btnBattery.onclick = () => executePermissionRequestStep(5);
        }
    }

    // 5. Restricted Settings (Android 13+)
    const rowRestricted = document.getElementById('row-perm-restricted');
    const btnRestricted = document.getElementById('btn-perm-restricted');
    if (rowRestricted && btnRestricted) {
        const isAndroid13Plus = (onboardingPermissionStatus.sdkInt || 33) >= 33;
        if (isAndroid13Plus && !onboardingPermissionStatus.restrictedSettingsDone) {
            rowRestricted.style.display = 'block';
            btnRestricted.innerText = 'চালু করুন';
            btnRestricted.style.background = '#0284c7';
            btnRestricted.style.color = '#ffffff';
            btnRestricted.style.border = 'none';
            btnRestricted.onclick = () => executePermissionRequestStep(3);
        } else if (isAndroid13Plus && onboardingPermissionStatus.restrictedSettingsDone) {
            rowRestricted.style.display = 'block';
            btnRestricted.innerText = 'চালু আছে';
            btnRestricted.style.background = 'rgba(34, 197, 94, 0.12)';
            btnRestricted.style.color = '#4ade80';
            btnRestricted.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnRestricted.onclick = null;
        } else {
            rowRestricted.style.display = 'none';
        }
    }

    // H15: Overlay permission (step 6) — needed for alarm popup + floating bubble
    const rowOverlay = document.getElementById('row-perm-overlay');
    const btnOverlay = document.getElementById('btn-perm-overlay');
    if (rowOverlay && btnOverlay) {
        if (!onboardingPermissionStatus.overlayGranted) {
            rowOverlay.style.display = 'block';
            btnOverlay.innerText = 'চালু করুন';
            btnOverlay.style.background = '#0284c7';
            btnOverlay.style.color = '#ffffff';
            btnOverlay.style.border = 'none';
            btnOverlay.onclick = () => executePermissionRequestStep(6);
        } else if (onboardingPermissionStatus.overlayGranted) {
            rowOverlay.style.display = 'block';
            btnOverlay.innerText = 'চালু আছে';
            btnOverlay.style.background = 'rgba(34, 197, 94, 0.12)';
            btnOverlay.style.color = '#4ade80';
            btnOverlay.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnOverlay.onclick = null;
        } else {
            rowOverlay.style.display = 'none';
        }
    }

    // H15: Exact alarm permission (step 7, Android 12+)
    const rowExactAlarm = document.getElementById('row-perm-exact-alarm');
    const btnExactAlarm = document.getElementById('btn-perm-exact-alarm');
    if (rowExactAlarm && btnExactAlarm) {
        const isAndroid12Plus = (onboardingPermissionStatus.sdkInt || 33) >= 31;
        if (isAndroid12Plus && !onboardingPermissionStatus.exactAlarmGranted) {
            rowExactAlarm.style.display = 'block';
            btnExactAlarm.innerText = 'চালু করুন';
            btnExactAlarm.style.background = '#0284c7';
            btnExactAlarm.style.color = '#ffffff';
            btnExactAlarm.style.border = 'none';
            btnExactAlarm.onclick = () => executePermissionRequestStep(7);
        } else if (isAndroid12Plus && onboardingPermissionStatus.exactAlarmGranted) {
            rowExactAlarm.style.display = 'block';
            btnExactAlarm.innerText = 'চালু আছে';
            btnExactAlarm.style.background = 'rgba(34, 197, 94, 0.12)';
            btnExactAlarm.style.color = '#4ade80';
            btnExactAlarm.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnExactAlarm.onclick = null;
        } else {
            rowExactAlarm.style.display = 'none';
        }
    }

    // H15: Full-screen intent permission (step 8, Android 14+)
    const rowFsi = document.getElementById('row-perm-fullscreen-intent');
    const btnFsi = document.getElementById('btn-perm-fullscreen-intent');
    if (rowFsi && btnFsi) {
        const isAndroid14Plus = (onboardingPermissionStatus.sdkInt || 33) >= 34;
        if (isAndroid14Plus && !onboardingPermissionStatus.fullScreenIntentGranted) {
            rowFsi.style.display = 'block';
            btnFsi.innerText = 'চালু করুন';
            btnFsi.style.background = '#0284c7';
            btnFsi.style.color = '#ffffff';
            btnFsi.style.border = 'none';
            btnFsi.onclick = () => executePermissionRequestStep(8);
        } else if (isAndroid14Plus && onboardingPermissionStatus.fullScreenIntentGranted) {
            rowFsi.style.display = 'block';
            btnFsi.innerText = 'চালু আছে';
            btnFsi.style.background = 'rgba(34, 197, 94, 0.12)';
            btnFsi.style.color = '#4ade80';
            btnFsi.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            btnFsi.onclick = null;
        } else {
            rowFsi.style.display = 'none';
        }
    }

    // Update Home Screen Card Badge if present
    const homePermBadge = document.getElementById('home-perm-badge');
    if (homePermBadge) {
        if (completedCount >= 4) {
            homePermBadge.innerText = 'সম্পূর্ণ সক্রিয়';
            homePermBadge.style.background = 'rgba(34, 197, 94, 0.15)';
            homePermBadge.style.color = '#4ade80';
            homePermBadge.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        } else {
            homePermBadge.innerText = `${toBengaliNum(completedCount)}/৪ সক্রিয়`;
            homePermBadge.style.background = 'rgba(56, 189, 248, 0.12)';
            homePermBadge.style.color = '#38bdf8';
            homePermBadge.style.border = '1px solid rgba(56, 189, 248, 0.3)';
        }
    }
}

// Bind close buttons for permission guide modal
document.addEventListener('DOMContentLoaded', () => {
    const btnCloseTop = document.getElementById('btn-close-permission-guide-modal');
    if (btnCloseTop) btnCloseTop.onclick = closePermissionGuideModal;

    const btnCloseBtm = document.getElementById('btn-close-permission-guide-bottom');
    if (btnCloseBtm) btnCloseBtm.onclick = closePermissionGuideModal;

    const modal = document.getElementById('permission-guide-modal');
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closePermissionGuideModal();
        };
    }
});

function executePermissionRequestStep(step) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.requestPermissionStep) {
        window.Capacitor.Plugins.UnlockPlugin.requestPermissionStep({ step: step }).catch(err => {
            console.log('Error requesting permission step:', err);
        });
    }
}

window.addEventListener('focus', () => {
    fetchOnboardingStatusFromNative();
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        fetchOnboardingStatusFromNative();
    }
});