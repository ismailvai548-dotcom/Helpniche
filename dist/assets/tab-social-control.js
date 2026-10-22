/* ==========================================================================
   MODULE: SOCIAL MEDIA CONTROL WITH STRICT TIMER APP BLOCKER
   ========================================================================== */

let installedAppsList = [];
let isFetchingApps = false;
let appSearchQuery = '';
let activeBlockTargetApp = null;
let blockUnitMode = 'minutes'; // 'minutes' or 'hours'
let blockTimerInterval = null;

/**
 * Main render function for Social Media Control Page
 */
function renderSocialControlTab() {
    startBlockTimerLoop();

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
