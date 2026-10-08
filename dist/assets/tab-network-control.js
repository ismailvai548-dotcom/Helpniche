/* ==========================================================================
   MODULE: NETWORK CONTROL FIREWALL (PER-APP WI-FI & MOBILE DATA BLOCKER)
   PURE SVG & ICON-ONLY ACTION BUTTONS (NO EMOJIS)
   ========================================================================== */

let networkAppsList = [];
let isFetchingNetworkApps = false;
let networkSearchQuery = '';
let networkFilterTab = 'all'; // 'all', 'blocked', 'social'
let activeNetworkTransport = 'wifi'; // 'wifi', 'cellular', 'none'
let isVpnShieldRunning = false;
let isVpnPermGranted = false;

// Shared SVGs
const SVG_ICONS = {
    wifiOn: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:22px; height:22px;"><path fill="currentColor" d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4zm0 2.9c3.7 0 7.07 1.43 9.61 3.79L12 19.31 2.39 10.69C4.93 8.33 8.3 6.9 12 6.9z"/></svg>`,
    wifiOff: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:22px; height:22px;"><path fill="currentColor" d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.8.2-3.95.53l2.84 2.84C11.33 6.13 11.67 6.1 12 6.1c5.21 0 9.04 2.77 9.6 3.2L12 21.41 9.4 18.2l-1.42 1.42 2.6 3.21c.38.47 1.11.47 1.49 0l11.57-14.28c.38-.47.38-1.18 0-1.55zM2.81 2.81L1.39 4.22l2.39 2.39C2.28 7.37 1.3 8.16.36 8.98c-.48.42-.48 1.14 0 1.56L12 22.41l3.52-4.34 4.26 4.26 1.41-1.41L2.81 2.81zM5.56 8.39l2.25 2.25C6.46 11.23 5.3 12 4.41 12.72L2.52 10.4c1-.84 2.05-1.53 3.04-2.01z"/></svg>`,
    dataOn: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:22px; height:22px;"><path fill="currentColor" d="M17 4h3v16h-3V4zM12 8h3v12h-3V8zM7 12h3v8H7v-8zM2 16h3v4H2v-4z"/></svg>`,
    dataOff: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:22px; height:22px;"><path fill="currentColor" d="M17 4h3v10.17l2 2V2H17v2zm-5 4h3v6.17l2 2V6h-5v2zm-5 4h3v2.17l2 2V10H7v2zm14.19 11.41L2.81 2.81 1.39 4.22l5.61 5.61V20h3v-7.17l2 2V20h3v-3.17l4.39 4.39 1.41-1.41zM2 16h3v4H2v-4z"/></svg>`,
    shieldCheck: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:13px; height:13px;"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`,
    blockCircle: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:13px; height:13px;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>`,
    heartSocial: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:13px; height:13px;"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    infoHelp: `<svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; color:#38bdf8;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
};

/**
 * Main render function for Network Control Page
 */
function renderNetworkControlTab() {
    return `
        <div class="screen-wrapper network-control-wrapper">
            <!-- Top Header Bar with Back Button -->
            <div class="network-header-bar">
                <button class="btn-back-home" id="btn-network-back-home" title="Back to Home / হোম স্ক্রিনে ফিরে যান">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h1 class="app-title network-title" style="font-size:20px; font-weight:800; color:#38bdf8; margin:0;">
                            ${t('networkControl')}
                        </h1>
                        <span class="badge-firewall-live">FIREWALL</span>
                    </div>
                    <p style="font-size:11px; color:#94a3b8; margin-top:2px;">
                        ${t('networkControlSub')}
                    </p>
                </div>
            </div>

            <!-- Active Network Status Card -->
            <div class="network-status-banner">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:34px; height:34px; border-radius:10px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.25); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${renderActiveTransportSvg()}
                    </div>
                    <div>
                        <span style="font-size:12.5px; font-weight:700; color:#ffffff;">
                            ${renderActiveTransportLabel()}
                        </span>
                        <p style="font-size:10.5px; color:#94a3b8; margin-top:1px;">
                            ${renderActiveTransportSub()}
                        </p>
                    </div>
                </div>
                ${!isVpnPermGranted ? `
                    <button class="btn-grant-vpn-chip" id="btn-request-vpn-perm">
                        ভিপিএন চালু করুন
                    </button>
                ` : `
                    <div style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:800; color:#10b981; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:12px;">
                        ${SVG_ICONS.shieldCheck}
                        <span>সুরক্ষিত</span>
                    </div>
                `}
            </div>

            <!-- Search Box -->
            <div class="search-box-container" style="margin-top:14px; margin-bottom:10px;">
                <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" id="network-app-search-input" class="search-input" placeholder="অ্যাপের নাম বা প্যাকেজ লিখে খুঁজুন..." value="${networkSearchQuery}">
                ${networkSearchQuery ? `<button class="search-clear-btn" id="btn-clear-network-search">&times;</button>` : ''}
            </div>

            <!-- Filter Chips & Counts -->
            <div class="network-filter-chips-row">
                <button class="filter-chip-btn ${networkFilterTab === 'all' ? 'active' : ''}" data-filter="all">
                    সকল অ্যাপ (${networkAppsList.length})
                </button>
                <button class="filter-chip-btn ${networkFilterTab === 'blocked' ? 'active' : ''}" data-filter="blocked">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        ${SVG_ICONS.blockCircle}
                        <span>ব্লকড অ্যাপ (${getBlockedAppsCount()})</span>
                    </span>
                </button>
                <button class="filter-chip-btn ${networkFilterTab === 'social' ? 'active' : ''}" data-filter="social">
                    <span style="display:inline-flex; align-items:center; gap:4px;">
                        ${SVG_ICONS.heartSocial}
                        <span>সোশ্যাল অ্যাপ (${getSocialAppsCount()})</span>
                    </span>
                </button>
            </div>

            <!-- Summary Stats Bar -->
            <div class="network-stats-grid">
                <div class="network-stat-box">
                    <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#10b981;"><path fill="currentColor" d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4zm0 2.9c3.7 0 7.07 1.43 9.61 3.79L12 19.31 2.39 10.69C4.93 8.33 8.3 6.9 12 6.9z"/></svg>
                        <span class="stat-num" style="color:#10b981;">${getWifiBlockedCount()}</span>
                    </div>
                    <span class="stat-lbl">ওয়াইফাই বন্ধ</span>
                </div>
                <div class="network-stat-box">
                    <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M17 4h3v16h-3V4zM12 8h3v12h-3V8zM7 12h3v8H7v-8zM2 16h3v4H2v-4z"/></svg>
                        <span class="stat-num" style="color:#38bdf8;">${getDataBlockedCount()}</span>
                    </div>
                    <span class="stat-lbl">মোবাইল ডাটা বন্ধ</span>
                </div>
                <div class="network-stat-box">
                    <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#f43f5e;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
                        <span class="stat-num" style="color:#f43f5e;">${getBothBlockedCount()}</span>
                    </div>
                    <span class="stat-lbl">সম্পূর্ণ বন্ধ</span>
                </div>
            </div>

            <!-- App List Area -->
            <div id="network-apps-content-area" style="margin-top:14px;">
                ${renderNetworkAppsList()}
            </div>

            <!-- Explanatory Help Guide Card -->
            <div class="network-help-card">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    ${SVG_ICONS.infoHelp}
                    <span style="font-size:13px; font-weight:800; color:#ffffff;">নেটওয়ার্ক কন্ট্রোল নির্দেশিকা:</span>
                </div>
                <ul style="font-size:11.5px; color:#cbd5e1; line-height:1.65; padding-left:18px; margin:0;">
                    <li><strong>ওয়াইফাই বাটন:</strong> আইকন লাল থাকলে ওয়াইফাই সংযোগে ওই অ্যাপে ইন্টারনেট চলবে না।</li>
                    <li><strong>মোবাইল ডাটা বাটন:</strong> আইকন লাল থাকলে মোবাইল ডাটায় (MB) ওই অ্যাপে ইন্টারনেট চলবে না।</li>
                    <li><strong>দুটিই বন্ধ:</strong> অ্যাপটির জন্য ইন্টারনেট সম্পূর্ণ ব্লক থাকবে। আইকনে চাপ দিয়ে যেকোনো সময় সক্রিয় ও নিষ্ক্রিয় করা যাবে।</li>
                </ul>
            </div>
        </div>
    `;
}

function renderActiveTransportSvg() {
    if (activeNetworkTransport === 'wifi') {
        return `<svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; color:#10b981;"><path fill="currentColor" d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4zm0 2.9c3.7 0 7.07 1.43 9.61 3.79L12 19.31 2.39 10.69C4.93 8.33 8.3 6.9 12 6.9z"/></svg>`;
    } else if (activeNetworkTransport === 'cellular') {
        return `<svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; color:#38bdf8;"><path fill="currentColor" d="M17 4h3v16h-3V4zM12 8h3v12h-3V8zM7 12h3v8H7v-8zM2 16h3v4H2v-4z"/></svg>`;
    } else {
        return `<svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; color:#94a3b8;"><path fill="currentColor" d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.8.2-3.95.53l2.84 2.84C11.33 6.13 11.67 6.1 12 6.1c5.21 0 9.04 2.77 9.6 3.2L12 21.41 9.4 18.2l-1.42 1.42 2.6 3.21c.38.47 1.11.47 1.49 0l11.57-14.28c.38-.47.38-1.18 0-1.55zM2.81 2.81L1.39 4.22l2.39 2.39C2.28 7.37 1.3 8.16.36 8.98c-.48.42-.48 1.14 0 1.56L12 22.41l3.52-4.34 4.26 4.26 1.41-1.41L2.81 2.81zM5.56 8.39l2.25 2.25C6.46 11.23 5.3 12 4.41 12.72L2.52 10.4c1-.84 2.05-1.53 3.04-2.01z"/></svg>`;
    }
}

function renderActiveTransportLabel() {
    if (activeNetworkTransport === 'wifi') {
        return 'ওয়াইফাই সংযোগ সক্রিয়';
    } else if (activeNetworkTransport === 'cellular') {
        return 'মোবাইল ডাটা সংযোগ সক্রিয়';
    } else {
        return 'ইন্টারনেট সংযোগ পাওয়া যায়নি';
    }
}

function renderActiveTransportSub() {
    if (activeNetworkTransport === 'wifi') {
        return 'ওয়াইফাই বন্ধ থাকা অ্যাপগুলো এখন ইন্টারনেট পাবে না';
    } else if (activeNetworkTransport === 'cellular') {
        return 'মোবাইল ডাটা বন্ধ থাকা অ্যাপগুলো এখন ইন্টারনেট পাবে না';
    } else {
        return 'কোনো নেটওয়ার্কে যুক্ত হলে রুলগুলো স্বয়ংক্রিয়ভাবে কার্যকর হবে';
    }
}

function getWifiBlockedCount() {
    return networkAppsList.filter(a => a.wifiBlocked).length;
}

function getDataBlockedCount() {
    return networkAppsList.filter(a => a.dataBlocked).length;
}

function getBothBlockedCount() {
    return networkAppsList.filter(a => a.wifiBlocked && a.dataBlocked).length;
}

function getBlockedAppsCount() {
    return networkAppsList.filter(a => a.wifiBlocked || a.dataBlocked).length;
}

function getSocialAppsCount() {
    return networkAppsList.filter(a => a.isSocialMedia).length;
}

/**
 * Render the apps list based on active search and filter
 */
function renderNetworkAppsList() {
    if (isFetchingNetworkApps) {
        return `
            <div class="skeleton-loader-container">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            </div>
        `;
    }

    if (!networkAppsList || networkAppsList.length === 0) {
        return `
            <div class="empty-state-card">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:48px; height:48px; color:var(--text-muted); margin-bottom:12px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <div style="font-size:16px; font-weight:700; color:var(--text-color);">কোনো অ্যাপ পাওয়া যায়নি</div>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">রিফ্রেশ বা পুনরায় ফেচ করুন</p>
                <button class="btn-primary-focus" id="btn-retry-fetch-network-apps" style="width:auto; padding:8px 24px; margin:16px auto 0 auto; font-size:13px;">
                    পুনরায় ফেচ করুন
                </button>
            </div>
        `;
    }

    const q = networkSearchQuery.trim().toLowerCase();
    let filtered = networkAppsList.filter(app => {
        if (!q) return true;
        const nameMatch = app.appName && app.appName.toLowerCase().includes(q);
        const pkgMatch = app.packageName && app.packageName.toLowerCase().includes(q);
        return nameMatch || pkgMatch;
    });

    if (networkFilterTab === 'blocked') {
        filtered = filtered.filter(a => a.wifiBlocked || a.dataBlocked);
    } else if (networkFilterTab === 'social') {
        filtered = filtered.filter(a => a.isSocialMedia);
    }

    if (filtered.length === 0) {
        return `
            <div class="empty-state-card" style="padding:28px 16px;">
                <div style="font-size:15px; font-weight:700; color:#ffffff;">কোনো অ্যাপ মেলেনি</div>
                <p style="font-size:12px; color:#94a3b8; margin-top:4px;">অন্য কোনো ফিল্টার বা নাম দিয়ে চেষ্টা করুন</p>
            </div>
        `;
    }

    return `
        <div class="app-list-grid">
            ${filtered.map(app => renderNetworkAppCard(app)).join('')}
        </div>
    `;
}

/**
 * Render individual app item with clean centered SVG icon buttons (No emojis, No text inside buttons)
 */
function renderNetworkAppCard(app) {
    const defaultIcon = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="%238B949E"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>`;
    const iconSrc = app.icon ? app.icon : defaultIcon;

    const isBothBlocked = app.wifiBlocked && app.dataBlocked;
    const isWifiBlocked = app.wifiBlocked;
    const isDataBlocked = app.dataBlocked;

    let cardStatusClass = '';
    if (isBothBlocked) {
        cardStatusClass = 'card-both-blocked';
    } else if (isWifiBlocked) {
        cardStatusClass = 'card-wifi-blocked';
    } else if (isDataBlocked) {
        cardStatusClass = 'card-data-blocked';
    }

    return `
        <div class="network-app-card ${cardStatusClass}" id="card-pkg-${escapePkgId(app.packageName)}" data-pkg="${escapeHtml(app.packageName)}">
            <div class="network-app-main-row">
                <!-- App Information Column (Left) -->
                <div class="app-item-left">
                    <img class="app-icon-img" src="${iconSrc}" alt="${escapeHtml(app.appName)}" onerror="this.src='${defaultIcon}'" />
                    <div class="app-info-col">
                        <div class="app-name-title">${escapeHtml(app.appName)}</div>
                        <div class="app-package-sub">${escapeHtml(app.packageName)}</div>
                    </div>
                </div>

                <!-- Right Side Centered Icon Action Buttons (No Text) -->
                <div class="network-toggle-actions">
                    <!-- Wi-Fi Centered Icon Button -->
                    <button class="btn-net-toggle btn-toggle-wifi ${isWifiBlocked ? 'blocked' : 'allowed'}" data-pkg="${escapeHtml(app.packageName)}" title="${isWifiBlocked ? 'ওয়াইফাই বন্ধ (ক্লিক করে চালু করুন)' : 'ওয়াইফাই চালু (ক্লিক করে বন্ধ করুন)'}">
                        ${isWifiBlocked ? SVG_ICONS.wifiOff : SVG_ICONS.wifiOn}
                    </button>

                    <!-- Mobile Data Centered Icon Button -->
                    <button class="btn-net-toggle btn-toggle-data ${isDataBlocked ? 'blocked' : 'allowed'}" data-pkg="${escapeHtml(app.packageName)}" title="${isDataBlocked ? 'মোবাইল ডাটা বন্ধ (ক্লিক করে চালু করুন)' : 'মোবাইল ডাটা চালু (ক্লিক করে বন্ধ করুন)'}">
                        ${isDataBlocked ? SVG_ICONS.dataOff : SVG_ICONS.dataOn}
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Event Listeners & Interactive Handlers
 */
function bindNetworkControlEvents() {
    // Back to home button
    const btnBack = document.getElementById('btn-network-back-home');
    if (btnBack) btnBack.onclick = () => switchTab('home');

    // Request VPN permission button
    const btnVpnPerm = document.getElementById('btn-request-vpn-perm');
    if (btnVpnPerm) {
        btnVpnPerm.onclick = () => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NetworkControlPlugin) {
                window.Capacitor.Plugins.NetworkControlPlugin.requestVpnPermission()
                    .then(res => {
                        if (res && res.granted) {
                            isVpnPermGranted = true;
                            isVpnShieldRunning = true;
                            updateNetworkControlUI();
                        }
                    });
            } else {
                isVpnPermGranted = true;
                updateNetworkControlUI();
            }
        };
    }

    // Search input
    const searchInp = document.getElementById('network-app-search-input');
    if (searchInp) {
        searchInp.oninput = (e) => {
            networkSearchQuery = e.target.value;
            refreshNetworkAppListOnly();
        };
    }

    // Clear search
    const btnClearSearch = document.getElementById('btn-clear-network-search');
    if (btnClearSearch) {
        btnClearSearch.onclick = () => {
            networkSearchQuery = '';
            updateNetworkControlUI();
        };
    }

    // Filter Chips
    document.querySelectorAll('.filter-chip-btn').forEach(btn => {
        btn.onclick = (e) => {
            const f = e.currentTarget.dataset.filter;
            if (f) {
                networkFilterTab = f;
                updateNetworkControlUI();
            }
        };
    });

    // Retry fetch button
    const btnRetry = document.getElementById('btn-retry-fetch-network-apps');
    if (btnRetry) btnRetry.onclick = () => fetchNetworkControlApps();

    // Attach Wi-Fi toggle buttons
    document.querySelectorAll('.btn-toggle-wifi').forEach(btn => {
        btn.onclick = (e) => {
            const pkg = e.currentTarget.dataset.pkg;
            toggleAppWifiBlock(pkg);
        };
    });

    // Attach Mobile Data toggle buttons
    document.querySelectorAll('.btn-toggle-data').forEach(btn => {
        btn.onclick = (e) => {
            const pkg = e.currentTarget.dataset.pkg;
            toggleAppDataBlock(pkg);
        };
    });

    // Fetch device apps if not loaded yet
    if (networkAppsList.length === 0 && !isFetchingNetworkApps) {
        fetchNetworkControlApps();
    }
}

/**
 * Toggle Wi-Fi block for a specific package
 */
function toggleAppWifiBlock(packageName) {
    const app = networkAppsList.find(a => a.packageName === packageName);
    if (!app) return;

    app.wifiBlocked = !app.wifiBlocked;

    // Haptic/audio feedback
    try {
        if (typeof playSoundEffect === 'function') playSoundEffect('click');
        if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {}

    // Send to native plugin
    syncAppNetworkRuleWithNative(packageName, app.wifiBlocked, app.dataBlocked);

    // Save in local storage backup
    saveNetworkBlockStateToLocalStorage();

    // Fast in-place UI update of this specific card
    refreshAppCardInPlace(app);
    updateStatsGridOnly();
}

/**
 * Toggle Mobile Data block for a specific package
 */
function toggleAppDataBlock(packageName) {
    const app = networkAppsList.find(a => a.packageName === packageName);
    if (!app) return;

    app.dataBlocked = !app.dataBlocked;

    // Haptic/audio feedback
    try {
        if (typeof playSoundEffect === 'function') playSoundEffect('click');
        if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {}

    // Send to native plugin
    syncAppNetworkRuleWithNative(packageName, app.wifiBlocked, app.dataBlocked);

    // Save in local storage backup
    saveNetworkBlockStateToLocalStorage();

    // Fast in-place UI update of this specific card
    refreshAppCardInPlace(app);
    updateStatsGridOnly();
}

/**
 * Sync individual rule to native plugin
 */
function syncAppNetworkRuleWithNative(packageName, wifiBlocked, dataBlocked) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NetworkControlPlugin) {
        window.Capacitor.Plugins.NetworkControlPlugin.setAppNetworkRule({
            packageName: packageName,
            wifiBlocked: wifiBlocked,
            dataBlocked: dataBlocked
        }).catch(err => {
            console.error("Failed to sync network rule with native:", err);
        });
    }
}

/**
 * In-place update of a single app card without re-rendering entire screen
 */
function refreshAppCardInPlace(app) {
    const cardEl = document.getElementById(`card-pkg-${escapePkgId(app.packageName)}`);
    if (!cardEl) {
        refreshNetworkAppListOnly();
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderNetworkAppCard(app).trim();
    const newCard = tempDiv.firstChild;

    if (newCard) {
        cardEl.replaceWith(newCard);

        // Re-bind click events for this card
        const btnWifi = newCard.querySelector('.btn-toggle-wifi');
        if (btnWifi) {
            btnWifi.onclick = () => toggleAppWifiBlock(app.packageName);
        }

        const btnData = newCard.querySelector('.btn-toggle-data');
        if (btnData) {
            btnData.onclick = () => toggleAppDataBlock(app.packageName);
        }
    }
}

/**
 * Update stats numbers without full screen reload
 */
function updateStatsGridOnly() {
    const gridEl = document.querySelector('.network-stats-grid');
    if (gridEl) {
        gridEl.innerHTML = `
            <div class="network-stat-box">
                <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#10b981;"><path fill="currentColor" d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4zm0 2.9c3.7 0 7.07 1.43 9.61 3.79L12 19.31 2.39 10.69C4.93 8.33 8.3 6.9 12 6.9z"/></svg>
                    <span class="stat-num" style="color:#10b981;">${getWifiBlockedCount()}</span>
                </div>
                <span class="stat-lbl">ওয়াইফাই বন্ধ</span>
            </div>
            <div class="network-stat-box">
                <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M17 4h3v16h-3V4zM12 8h3v12h-3V8zM7 12h3v8H7v-8zM2 16h3v4H2v-4z"/></svg>
                    <span class="stat-num" style="color:#38bdf8;">${getDataBlockedCount()}</span>
                </div>
                <span class="stat-lbl">মোবাইল ডাটা বন্ধ</span>
            </div>
            <div class="network-stat-box">
                <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#f43f5e;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
                    <span class="stat-num" style="color:#f43f5e;">${getBothBlockedCount()}</span>
                </div>
                <span class="stat-lbl">সম্পূর্ণ বন্ধ</span>
            </div>
        `;
    }

    // Also update filter chips count
    const chipBlocked = document.querySelector('[data-filter="blocked"]');
    if (chipBlocked) {
        chipBlocked.innerHTML = `
            <span style="display:inline-flex; align-items:center; gap:4px;">
                ${SVG_ICONS.blockCircle}
                <span>ব্লকড অ্যাপ (${getBlockedAppsCount()})</span>
            </span>
        `;
    }
}

/**
 * Refresh only the apps list area
 */
function refreshNetworkAppListOnly() {
    const area = document.getElementById('network-apps-content-area');
    if (area) {
        area.innerHTML = renderNetworkAppsList();
        // Rebind buttons
        area.querySelectorAll('.btn-toggle-wifi').forEach(btn => {
            btn.onclick = (e) => {
                const pkg = e.currentTarget.dataset.pkg;
                toggleAppWifiBlock(pkg);
            };
        });
        area.querySelectorAll('.btn-toggle-data').forEach(btn => {
            btn.onclick = (e) => {
                const pkg = e.currentTarget.dataset.pkg;
                toggleAppDataBlock(pkg);
            };
        });
    }
}

/**
 * Full UI refresh
 */
function updateNetworkControlUI() {
    const content = document.getElementById('app-content-area');
    if (content && currentTab === 'network-control') {
        content.innerHTML = renderNetworkControlTab();
        bindNetworkControlEvents();
    }
}

/**
 * Fetch installed apps from native Capacitor plugin
 */
function fetchNetworkControlApps() {
    isFetchingNetworkApps = true;
    updateNetworkControlUI();

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NetworkControlPlugin) {
        window.Capacitor.Plugins.NetworkControlPlugin.getInstalledApps()
            .then(result => {
                isFetchingNetworkApps = false;
                if (result && Array.isArray(result.apps)) {
                    networkAppsList = result.apps;
                    if (result.activeNetwork) activeNetworkTransport = result.activeNetwork;
                    isVpnShieldRunning = !!result.isVpnRunning;
                    isVpnPermGranted = !!result.isVpnPermissionGranted;
                    syncNetworkBlocksFromLocalStorage();
                } else {
                    networkAppsList = [];
                }
                updateNetworkControlUI();
            })
            .catch(err => {
                console.error("Failed to fetch installed apps from NetworkControlPlugin:", err);
                isFetchingNetworkApps = false;
                loadMockNetworkApps();
            });
    } else {
        setTimeout(() => loadMockNetworkApps(), 400);
    }
}

function saveNetworkBlockStateToLocalStorage() {
    const wifiBlocked = networkAppsList.filter(a => a.wifiBlocked).map(a => a.packageName);
    const dataBlocked = networkAppsList.filter(a => a.dataBlocked).map(a => a.packageName);
    localStorage.setItem('LOCAL_NET_BLOCKED_WIFI', JSON.stringify(wifiBlocked));
    localStorage.setItem('LOCAL_NET_BLOCKED_DATA', JSON.stringify(dataBlocked));
}

function syncNetworkBlocksFromLocalStorage() {
    try {
        const wifiBlocked = new Set(JSON.parse(localStorage.getItem('LOCAL_NET_BLOCKED_WIFI') || '[]'));
        const dataBlocked = new Set(JSON.parse(localStorage.getItem('LOCAL_NET_BLOCKED_DATA') || '[]'));

        networkAppsList.forEach(app => {
            if (wifiBlocked.has(app.packageName)) app.wifiBlocked = true;
            if (dataBlocked.has(app.packageName)) app.dataBlocked = true;
        });
    } catch (e) {}
}

/**
 * Mock data for browser testing
 */
function loadMockNetworkApps() {
    isFetchingNetworkApps = false;
    isVpnPermGranted = true;
    isVpnShieldRunning = true;
    activeNetworkTransport = 'wifi';

    networkAppsList = [
        { appName: 'Facebook', packageName: 'com.facebook.katana', icon: '', isSocialMedia: true, isSystemApp: false, wifiBlocked: false, dataBlocked: false },
        { appName: 'YouTube', packageName: 'com.google.android.youtube', icon: '', isSocialMedia: true, isSystemApp: true, wifiBlocked: false, dataBlocked: false },
        { appName: 'Instagram', packageName: 'com.instagram.android', icon: '', isSocialMedia: true, isSystemApp: false, wifiBlocked: false, dataBlocked: false },
        { appName: 'TikTok', packageName: 'com.zhiliaoapp.musically', icon: '', isSocialMedia: true, isSystemApp: false, wifiBlocked: false, dataBlocked: false },
        { appName: 'WhatsApp', packageName: 'com.whatsapp', icon: '', isSocialMedia: true, isSystemApp: false, wifiBlocked: false, dataBlocked: false },
        { appName: 'Messenger', packageName: 'com.facebook.orca', icon: '', isSocialMedia: true, isSystemApp: false, wifiBlocked: false, dataBlocked: false },
        { appName: 'Chrome', packageName: 'com.android.chrome', icon: '', isSocialMedia: false, isSystemApp: true, wifiBlocked: false, dataBlocked: false },
        { appName: 'Telegram', packageName: 'org.telegram.messenger', icon: '', isSocialMedia: true, isSystemApp: false, wifiBlocked: false, dataBlocked: false }
    ];

    syncNetworkBlocksFromLocalStorage();
    updateNetworkControlUI();
}

function escapePkgId(pkg) {
    if (!pkg) return 'unknown';
    return pkg.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
