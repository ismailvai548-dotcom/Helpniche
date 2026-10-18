/* ==========================================================================
   TAB 1: HOME DASHBOARD (Minimal Circular UI & Focus Portal)
   ========================================================================== */
function renderHomeDashboard() {
    const todayMins = getTodayFocusMinutes();
    const h = Math.floor(todayMins / 60);
    const m = todayMins % 60;

    const durationText = getProtectionDurationText();

    const diffDays = Math.floor((Date.now() - streakStartTime) / (1000 * 24 * 3600));
    const currentRank = getCurrentRank(diffDays);
    const isBn = (currentLang === 'bn');

    return `
        <div class="screen-wrapper">
            <!-- Top App Bar with Premium Language Toggle -->
            <div class="header-row" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div>
                    <h1 class="app-title">Helpniche</h1>
                    <p class="app-subtitle">${t('appSubtitle')}</p>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                    <!-- Premium Rounded Language Toggle Switch -->
                    <button id="btn-language-toggle" style="background:#0f172a; border:1px solid #1e293b; border-radius:20px; padding:3px 5px; display:flex; align-items:center; gap:3px; cursor:pointer; outline:none; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.3);" title="Change Language / ভাষা পরিবর্তন">
                        <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:14px; background:${isBn ? '#10b981' : 'transparent'}; color:${isBn ? '#000000' : '#94a3b8'}; transition:all 0.2s;">
                            বাংলা
                        </span>
                        <span style="font-size:10px; font-weight:800; padding:3px 8px; border-radius:14px; background:${!isBn ? '#10b981' : 'transparent'}; color:${!isBn ? '#000000' : '#94a3b8'}; transition:all 0.2s;">
                            EN
                        </span>
                    </button>

                    <div class="badge-protected">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                        <span>${t('protected')}</span>
                    </div>
                </div>
            </div>

            <!-- Streak Banner -->
            <div class="streak-mini-banner" id="btn-open-streak-banner">
                <div>
                    <span class="streak-mini-days">${diffDays} ${t('cleanDays')}</span>
                    <span class="streak-mini-rank">${t('currentRank')}: ${currentRank.title}</span>
                </div>
                <div class="streak-mini-action">
                    <span>${t('details')}</span>
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
            </div>

            <!-- Dual Entry Points: Social Control (Left) & Network Control (Right) -->
            <div class="dual-control-container" style="display:flex; justify-content:center; align-items:stretch; gap:12px; margin: 20px 0 16px 0; width:100%;">
                <!-- Left: Social Control -->
                <button class="btn-circular-control btn-social-portal" id="btn-enter-social-control" style="flex:1; max-width:160px; min-height:148px; border-radius: 24px; background: linear-gradient(145deg, #0d3b2e 0%, #041f17 100%); border: 2.5px solid #00E676; box-shadow: 0 6px 20px rgba(0, 230, 118, 0.25), inset 0 0 14px rgba(0, 230, 118, 0.12); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; outline: none; padding: 14px 8px; text-align: center; position: relative;">

                    <div style="width:46px; height:46px; border-radius:50%; background:rgba(0, 230, 118, 0.15); display:flex; align-items:center; justify-content:center; margin-bottom:8px; border:1px solid rgba(0, 230, 118, 0.35);">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 24px; height: 24px; color: #00E676; filter: drop-shadow(0 2px 4px rgba(0,230,118,0.4));">
                            <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/>
                        </svg>
                    </div>

                    <span style="font-size: 13.5px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.3;">
                        ${t('socialControl')}
                    </span>

                    <span style="font-size: 9.5px; color: #34d399; font-weight: 700; margin-top: 6px; background: rgba(52, 211, 153, 0.15); padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(52, 211, 153, 0.3);">
                        ${t('manage')}
                    </span>
                </button>

                <!-- Right: Network Control -->
                <button class="btn-circular-control btn-network-portal" id="btn-enter-network-control" style="flex:1; max-width:160px; min-height:148px; border-radius: 24px; background: linear-gradient(145deg, #0c2a42 0%, #051421 100%); border: 2.5px solid #38bdf8; box-shadow: 0 6px 20px rgba(56, 189, 248, 0.25), inset 0 0 14px rgba(56, 189, 248, 0.12); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; outline: none; padding: 14px 8px; text-align: center; position: relative;">

                    <div style="width:46px; height:46px; border-radius:50%; background:rgba(56, 189, 248, 0.15); display:flex; align-items:center; justify-content:center; margin-bottom:8px; border:1px solid rgba(56, 189, 248, 0.35);">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 24px; height: 24px; color: #38bdf8; filter: drop-shadow(0 2px 4px rgba(56,189,248,0.4));">
                            <path fill="currentColor" d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A16.88 16.88 0 0 0 12 4zm0 2.9c3.7 0 7.07 1.43 9.61 3.79L12 19.31 2.39 10.69C4.93 8.33 8.3 6.9 12 6.9z"/>
                        </svg>
                    </div>

                    <span style="font-size: 13.5px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px; line-height: 1.3;">
                        ${t('networkControl')}
                    </span>

                    <span style="font-size: 9.5px; color: #38bdf8; font-weight: 700; margin-top: 6px; background: rgba(56, 189, 248, 0.15); padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(56, 189, 248, 0.3);">
                        ${t('firewall')}
                    </span>
                </button>
            </div>

            <!-- VPN Protection On/Off Control Card -->
            <div class="dash-card home-vpn-control-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%); border: 1.5px solid #10b981; border-radius: 16px; padding: 14px 16px; margin: 0 0 14px 0; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 22px; height: 22px; color: #10b981;">
                            <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/>
                        </svg>
                    </div>
                    <div>
                        <span id="home-vpn-title" style="font-size: 14.5px; font-weight: 800; color: #ffffff; display: block; letter-spacing: 0.2px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            অ্যাড কন্ট্রোলার
                        </span>
                        <span id="home-vpn-desc" style="font-size: 11.5px; color: #34d399; font-weight: 600; display: block; margin-top: 2px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            সক্রিয় (অন)
                        </span>
                    </div>
                </div>

                <!-- On/Off Toggle Switch -->
                <div id="btn-home-toggle-vpn" style="width: 50px; height: 28px; background: #10b981; border-radius: 20px; position: relative; cursor: pointer; transition: background 0.3s ease; flex-shrink: 0;">
                    <div id="home-vpn-knob" style="width: 22px; height: 22px; background: #ffffff; border-radius: 50%; position: absolute; top: 3px; left: 25px; transition: left 0.3s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
                </div>
            </div>

            <!-- UNLOCK ALERT CARD -->
            <div class="dash-card unlock-alert-card" id="btn-open-unlock-guard-card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px 16px; margin: 0 0 16px 0; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width: 20px; height: 20px; color: #f87171; flex-shrink: 0;"><path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6zM18 20H6V10h12v10z"/></svg>
                    <span style="font-size: 14px; font-weight: 700; color: #ffffff;">${t('unlockAlert')}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: ${unlockGuard.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)'}; color: ${unlockGuard.enabled ? '#4ade80' : '#94a3b8'}; border: 1px solid ${unlockGuard.enabled ? '#22c55e' : '#64748b'};">
                        ${unlockGuard.enabled ? 'ON' : 'OFF'}
                    </span>
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #94a3b8;"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
            </div>

            <!-- Time Metrics Row -->
            <div class="metric-grid">
                <div class="metric-box">
                    <div class="metric-label">${t('focusTimeToday')}</div>
                    <div class="metric-value">${h > 0 ? h + 'h ' : ''}${m}m</div>
                    <div class="metric-sub">${t('focusTimeSub')}</div>
                </div>
                <div class="metric-box">
                    <div class="metric-label">${t('protectionDuration')}</div>
                    <div class="metric-value" style="color:var(--accent-green);">${durationText}</div>
                    <div class="metric-sub">${t('protectionSub')}</div>
                </div>
            </div>

            <!-- Deep Focus Session CTA -->
            <div class="dash-card home-deep-focus-card" id="btn-home-deep-focus" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%); border: 1.5px solid #a855f7; border-radius: 16px; padding: 14px 16px; margin: 0 0 14px 0; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 6px 20px rgba(168, 85, 247, 0.15); transition: transform 0.2s;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 22px; height: 22px; color: #c084fc;">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                        </svg>
                    </div>
                    <div>
                        <span style="font-size: 15px; font-weight: 800; color: #ffffff; display: block; letter-spacing: 0.2px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ${t('deepFocus')}
                        </span>
                        <span style="font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-top: 2px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ${isFocusSessionActive ? (currentLang === 'bn' ? 'সেশন চলমান...' : 'Session in progress...') : t('deepFocusSub')}
                        </span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 10px; background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                        ${isFocusSessionActive ? (currentLang === 'bn' ? 'চলমান' : 'Active') : (currentLang === 'bn' ? 'টাইমার' : 'Timer')}
                    </span>
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width: 16px; height: 16px; color: #94a3b8;"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </div>
            </div>

            <!-- Panic SOS Button -->
            <button class="btn-panic-sos" id="btn-open-panic-modal">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                ${t('panicSos')}
            </button>

            <!-- PERMISSIONS & FEATURE PROTECTION CARD -->
            <div class="dash-card permission-guide-card" id="btn-open-permission-guide" style="background: rgba(56, 189, 248, 0.06); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 12px 14px; margin: 10px 0 12px 0; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px; color: #38bdf8;"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/></svg>
                    </div>
                    <div style="text-align: left;">
                        <span style="font-size: 13.5px; font-weight: 700; color: #ffffff; display: block; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">সুরক্ষা সেটিংস</span>
                        <p style="font-size: 11px; color: #94a3b8; margin: 2px 0 0 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">প্রয়োজনীয় নিয়ন্ত্রণগুলো সক্রিয় রাখুন</p>
                    </div>
                </div>
                <div id="home-perm-badge" style="background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; flex-shrink: 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    যাচাই হচ্ছে
                </div>
            </div>

            <!-- FEATURE GUIDE CARD -->
            <div class="dash-card about-apps-card" id="btn-open-about-apps-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.06) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 12px 16px; margin: 0 0 16px 0; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s; box-shadow: 0 2px 10px rgba(16, 185, 129, 0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px; color: #10b981;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    </div>
                    <div style="text-align: left;">
                        <span style="font-size: 14px; font-weight: 700; color: #ffffff;">${t('featureGuide')}</span>
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 1px;">${t('featureGuideSub')}</p>
                    </div>
                </div>
                <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 11px; font-weight: 700; padding: 6px 12px; border-radius: 8px; flex-shrink: 0;">
                    ${t('view')}
                </div>
            </div>
        </div>
    `;
}

function bindHomeEvents() {
    const btnLangToggle = document.getElementById('btn-language-toggle');
    if (btnLangToggle) {
        btnLangToggle.onclick = () => {
            const nextLang = currentLang === 'bn' ? 'en' : 'bn';
            setAppLanguage(nextLang);
        };
    }

    const btnStreak = document.getElementById('btn-open-streak-banner');
    if (btnStreak) btnStreak.onclick = () => switchTab('streak');



    const btnDeepFocus = document.getElementById('btn-home-deep-focus');
    if (btnDeepFocus) btnDeepFocus.onclick = () => switchTab('focus');

    const btnPanic = document.getElementById('btn-open-panic-modal');
    if (btnPanic) {
        btnPanic.onclick = () => {
            document.getElementById('panic-modal').style.display = 'flex';
        };
    }

    const btnSocial = document.getElementById('btn-enter-social-control');
    if (btnSocial) btnSocial.onclick = () => switchTab('social-control');

    const btnNetwork = document.getElementById('btn-enter-network-control');
    if (btnNetwork) btnNetwork.onclick = () => switchTab('network-control');

    // Home VPN On/Off Toggle Handler
    let isHomeVpnEnabled = localStorage.getItem('system_wide_adblock_enabled') !== 'false';
    const btnHomeToggleVpn = document.getElementById('btn-home-toggle-vpn');
    const homeVpnKnob = document.getElementById('home-vpn-knob');
    const homeVpnTitle = document.getElementById('home-vpn-title');
    const homeVpnDesc = document.getElementById('home-vpn-desc');

    function updateHomeVpnUI(enabled, isRunning) {
        if (!btnHomeToggleVpn || !homeVpnKnob) return;
        if (enabled) {
            btnHomeToggleVpn.style.background = '#10b981';
            homeVpnKnob.style.left = '25px';
            if (homeVpnTitle) homeVpnTitle.innerText = 'অ্যাড কন্ট্রোলার';
            if (homeVpnDesc) {
                if (typeof isRunning === 'boolean' && !isRunning) {
                    homeVpnDesc.innerText = 'অন (ভিপিএন সংযোগ অপেক্ষমাণ)';
                    homeVpnDesc.style.color = '#f59e0b';
                } else {
                    homeVpnDesc.innerText = 'সক্রিয় (অন)';
                    homeVpnDesc.style.color = '#34d399';
                }
            }
        } else {
            btnHomeToggleVpn.style.background = '#334155';
            homeVpnKnob.style.left = '3px';
            if (homeVpnTitle) homeVpnTitle.innerText = 'অ্যাড কন্ট্রোলার';
            if (homeVpnDesc) {
                homeVpnDesc.innerText = 'বন্ধ (অফ)';
                homeVpnDesc.style.color = '#94a3b8';
            }
        }
    }

    let isHomeVpnRunning = null;

    if (window.Capacitor?.Plugins?.UnlockPlugin?.getSystemWideAdBlockStatus) {
        window.Capacitor.Plugins.UnlockPlugin.getSystemWideAdBlockStatus().then(res => {
            if (res && typeof res.enabled === 'boolean') {
                isHomeVpnEnabled = res.enabled;
                isHomeVpnRunning = typeof res.isVpnRunning === 'boolean' ? res.isVpnRunning : null;
                localStorage.setItem('system_wide_adblock_enabled', isHomeVpnEnabled ? 'true' : 'false');
                updateHomeVpnUI(isHomeVpnEnabled, isHomeVpnRunning);
            }
        }).catch(() => {});
    }
    updateHomeVpnUI(isHomeVpnEnabled, isHomeVpnRunning);

    if (btnHomeToggleVpn) {
        btnHomeToggleVpn.onclick = async () => {
            isHomeVpnEnabled = !isHomeVpnEnabled;
            localStorage.setItem('system_wide_adblock_enabled', isHomeVpnEnabled ? 'true' : 'false');
            updateHomeVpnUI(isHomeVpnEnabled, isHomeVpnRunning);
            if (window.Capacitor?.Plugins?.UnlockPlugin?.setSystemWideAdBlock) {
                try {
                    await window.Capacitor.Plugins.UnlockPlugin.setSystemWideAdBlock({ enabled: isHomeVpnEnabled });
                    // রিফ্রেশ স্ট্যাটাস
                    const refreshed = await window.Capacitor.Plugins.UnlockPlugin.getSystemWideAdBlockStatus();
                    if (refreshed && typeof refreshed.isVpnRunning === 'boolean') {
                        isHomeVpnRunning = refreshed.isVpnRunning;
                        updateHomeVpnUI(isHomeVpnEnabled, isHomeVpnRunning);
                    }
                } catch(e) {
                    console.error("Failed to toggle home VPN:", e);
                }
            }
        };
    }

    const btnUnlockGuardCard = document.getElementById('btn-open-unlock-guard-card');
    if (btnUnlockGuardCard) {
        btnUnlockGuardCard.onclick = () => {
            if (typeof openUnlockGuardModal === 'function') {
                openUnlockGuardModal();
            } else {
                switchTab('routine');
            }
        };
    }

    const btnAboutAppsCard = document.getElementById('btn-open-about-apps-card');
    if (btnAboutAppsCard) {
        btnAboutAppsCard.onclick = () => {
            if (typeof openAboutAppsModal === 'function') {
                openAboutAppsModal();
            }
        };
    }

    const btnOpenPermGuide = document.getElementById('btn-open-permission-guide');
    if (btnOpenPermGuide) {
        btnOpenPermGuide.onclick = () => {
            if (typeof window.openPermissionGuideModal === 'function') {
                window.openPermissionGuideModal();
            }
        };
    }

    if (typeof updatePermissionGuideUI === 'function') {
        updatePermissionGuideUI();
    }
}
