/* ==========================================================================
   TAB 3: STREAK (IRON WILL) & TARGET COUNTDOWN TRACKER
   ========================================================================== */

function getCurrentRank(days) {
    let cur = RANKS_DATA[0];
    for (let r of RANKS_DATA) {
        if (days >= r.days) cur = r;
        else break;
    }
    return cur;
}

// টার্গেট ডাটা ম্যানেজমেন্ট ফাংশনসমূহ
function getActiveTarget() {
    try {
        const raw = localStorage.getItem('HELPNICHE_STREAK_TARGET');
        if (!raw) return null;
        const target = JSON.parse(raw);
        if (target && target.isActive) {
            return target;
        }
    } catch (e) {
        console.error("Error reading active target:", e);
    }
    return null;
}

function syncTargetDataNative(target) {
    const diffDays = Math.floor((Date.now() - streakStartTime) / (1000 * 24 * 3600));
    const currentRank = getCurrentRank(diffDays);

    if (window.Capacitor?.Plugins?.UnlockPlugin?.syncTargetData) {
        try {
            window.Capacitor.Plugins.UnlockPlugin.syncTargetData({
                title: target ? target.title : "",
                days: target ? target.days : 0,
                startTime: target ? target.startTime : 0,
                endTime: target ? target.endTime : 0,
                isActive: !!(target && target.isActive),
                streakDays: diffDays,
                rankTitle: currentRank.title
            });
        } catch (e) {
            console.error("Error syncing target to native:", e);
        }
    }
}

function dispatchMilestoneNotification(title, message) {
    if (window.Capacitor?.Plugins?.UnlockPlugin?.showSystemNotification) {
        try {
            window.Capacitor.Plugins.UnlockPlugin.showSystemNotification({
                title: title,
                message: message
            });
        } catch (e) {}
    }
}

function checkAndTriggerMilestones(target) {
    if (!target || !target.isActive || target.days <= 3) return;
    const now = Date.now();
    const totalDuration = target.endTime - target.startTime;
    const elapsed = now - target.startTime;
    const fraction = elapsed / totalDuration;

    if (!Array.isArray(target.notifiedMilestones)) {
        target.notifiedMilestones = [];
    }

    let remainingDays = Math.max(1, Math.ceil((target.endTime - now) / (24 * 3600 * 1000)));
    let newlyNotified = false;

    // মাইলস্টোন ১: ২৫% সময় পার হলে
    if (fraction >= 0.25 && !target.notifiedMilestones.includes(1)) {
        target.notifiedMilestones.push(1);
        newlyNotified = true;
        dispatchMilestoneNotification(target.title, `${target.title} সফল হতে আর মাত্র ${remainingDays} দিন বাকি আছে। আপনার যাত্রা অব্যাহত রাখুন!`);
    }

    // মাইলস্টোন ২: ৫০% সময় পার হলে
    if (fraction >= 0.50 && !target.notifiedMilestones.includes(2)) {
        target.notifiedMilestones.push(2);
        newlyNotified = true;
        dispatchMilestoneNotification(target.title, `${target.title} অর্ধেকের বেশি সময় পার হয়েছে! আর মাত্র ${remainingDays} দিন বাকি আছে। দৃঢ় থাকুন!`);
    }

    // মাইলস্টোন ৩: ৭৫% সময় পার হলে
    if (fraction >= 0.75 && !target.notifiedMilestones.includes(3)) {
        target.notifiedMilestones.push(3);
        newlyNotified = true;
        dispatchMilestoneNotification(target.title, `${target.title} লক্ষ্য অর্জনের খুব কাছাকাছি! আর মাত্র ${remainingDays} দিন বাকি আছে। চালিয়ে যান!`);
    }

    if (newlyNotified) {
        localStorage.setItem('HELPNICHE_STREAK_TARGET', JSON.stringify(target));
    }
}

function startNewTarget(title, days) {
    const cleanTitle = (title && title.trim()) ? title.trim() : `${days} দিনের চ্যালেঞ্জ`;
    const numDays = Math.max(1, parseInt(days, 10) || 1);
    const now = Date.now();
    const endTime = now + (numDays * 24 * 3600 * 1000);

    const target = {
        title: cleanTitle,
        days: numDays,
        startTime: now,
        endTime: endTime,
        isActive: true,
        notifiedMilestones: []
    };

    localStorage.setItem('HELPNICHE_STREAK_TARGET', JSON.stringify(target));
    syncTargetDataNative(target);
    switchTab('streak');
}

function cancelCurrentTarget() {
    const target = getActiveTarget();
    if (target) {
        target.isActive = false;
        target.status = 'cancelled';
        localStorage.setItem('HELPNICHE_STREAK_TARGET', JSON.stringify(target));

        const history = JSON.parse(localStorage.getItem('HELPNICHE_TARGET_HISTORY') || '[]');
        history.push({
            ...target,
            cancelledAt: Date.now()
        });
        localStorage.setItem('HELPNICHE_TARGET_HISTORY', JSON.stringify(history));

        syncTargetDataNative(null);
    }
    switchTab('streak');
}

function completeCurrentTarget(target) {
    if (!target) return;
    target.isActive = false;
    target.status = 'completed';
    localStorage.setItem('HELPNICHE_STREAK_TARGET', JSON.stringify(target));

    const history = JSON.parse(localStorage.getItem('HELPNICHE_TARGET_HISTORY') || '[]');
    history.push({
        ...target,
        completedAt: Date.now()
    });
    localStorage.setItem('HELPNICHE_TARGET_HISTORY', JSON.stringify(history));

    syncTargetDataNative(null);
    dispatchMilestoneNotification("টার্গেট সম্পন্ন!", `অভিনন্দন! আপনার ${target.title} সফলভাবে সম্পন্ন হয়েছে!`);

    const celebrateModal = document.getElementById('target-celebrate-modal-overlay');
    const celebrateTitle = document.getElementById('target-celebrate-name');
    if (celebrateTitle) celebrateTitle.innerText = target.title;
    if (celebrateModal) celebrateModal.style.display = 'flex';
}

// এইচটিএমএল রেন্ডারিং অংশ
function renderStreakTrackerSection() {
    return `
        <div class="tracker-section" id="streak-tracker-section">
            <div class="circle-wrapper">
                <svg class="progress-svg" viewBox="0 0 240 240">
                    <circle class="circle-bg" cx="120" cy="120" r="110"></circle>
                    <circle id="progress-circle" class="circle-bar" cx="120" cy="120" r="110"></circle>
                </svg>
                <div style="text-align:center; z-index:2;">
                    <div class="days-count" id="streak-days-display">0 days</div>
                    <div class="time-count" id="streak-timer-display">00:00:00</div>
                </div>
            </div>

            <div class="current-rank-badge" id="btn-streak-badge">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <span id="rank-badge-name">সংগ্রামী পথিক</span>
            </div>

            <div class="floating-reset-btn" id="btn-open-relapse-modal">
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            </div>
        </div>
    `;
}

function renderActiveTargetHeroCard(target) {
    return `
        <div class="active-target-hero-card" style="margin: 8px 0 16px 0; background: linear-gradient(145deg, #0f2744 0%, #081726 100%); border: 2px solid #38bdf8; border-radius: 20px; padding: 16px 14px; box-shadow: 0 8px 25px rgba(56, 189, 248, 0.22), inset 0 0 14px rgba(56, 189, 248, 0.08); position: relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <div>
                    <div style="display:inline-flex; align-items:center; gap:5px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.35); border-radius:12px; padding:2px 8px; margin-bottom:5px;">
                        <span style="width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
                        <span style="font-size:10px; font-weight:800; color:#38bdf8; letter-spacing:0.5px;">চলমান টার্গেট</span>
                    </div>
                    <h2 id="active-target-title" style="margin:0; font-size:16.5px; font-weight:900; color:#ffffff;">${target.title}</h2>
                </div>
                <button id="btn-manage-active-target" style="background:#1e293b; border:1px solid #475569; border-radius:8px; padding:6px 10px; color:#cbd5e1; font-size:11px; font-weight:700; cursor:pointer;">
                    পরিবর্তন / বাতিল
                </button>
            </div>

            <!-- উল্টো কাউন্টডাউন টাইমার গ্রিড -->
            <div style="background:rgba(2, 6, 23, 0.7); border:1px solid rgba(56,189,248,0.25); border-radius:14px; padding:12px 10px; margin-bottom:12px;">
                <div style="font-size:11px; color:#94a3b8; text-align:center; margin-bottom:8px; font-weight:600;">টার্গেট সফল হতে বাকি সময় (উল্টো গণনা):</div>
                <div style="display:flex; justify-content:center; align-items:center; gap:6px;">
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:6px 8px; min-width:48px; text-align:center;">
                        <span id="target-count-days" style="font-size:22px; font-weight:900; color:#38bdf8; display:block; line-height:1.1;">00</span>
                        <span style="font-size:9.5px; color:#94a3b8; font-weight:700;">দিন</span>
                    </div>
                    <span style="font-size:18px; font-weight:900; color:#38bdf8;">:</span>
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:6px 8px; min-width:44px; text-align:center;">
                        <span id="target-count-hrs" style="font-size:22px; font-weight:900; color:#ffffff; display:block; line-height:1.1;">00</span>
                        <span style="font-size:9.5px; color:#94a3b8; font-weight:700;">ঘণ্টা</span>
                    </div>
                    <span style="font-size:18px; font-weight:900; color:#38bdf8;">:</span>
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:6px 8px; min-width:44px; text-align:center;">
                        <span id="target-count-mins" style="font-size:22px; font-weight:900; color:#ffffff; display:block; line-height:1.1;">00</span>
                        <span style="font-size:9.5px; color:#94a3b8; font-weight:700;">মিনিট</span>
                    </div>
                    <span style="font-size:18px; font-weight:900; color:#38bdf8;">:</span>
                    <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:6px 8px; min-width:44px; text-align:center;">
                        <span id="target-count-secs" style="font-size:22px; font-weight:900; color:#f43f5e; display:block; line-height:1.1;">00</span>
                        <span style="font-size:9.5px; color:#94a3b8; font-weight:700;">সেকেন্ড</span>
                    </div>
                </div>
            </div>

            <!-- প্রগ্রেস বার -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:5px;">
                    <span style="color:#cbd5e1; font-weight:600;">অগ্রগতি:</span>
                    <span id="target-percent-text" style="color:#38bdf8; font-weight:800;">0% সম্পন্ন</span>
                </div>
                <div style="width:100%; height:8px; background:#1e293b; border-radius:10px; overflow:hidden;">
                    <div id="target-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #0284c7, #38bdf8); border-radius:10px; transition:width 0.4s ease;"></div>
                </div>
            </div>
        </div>
    `;
}

function renderTargetSetupCta() {
    return `
        <div id="btn-open-target-modal" style="margin: 14px 0 10px 0; background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(2, 132, 199, 0.05) 100%); border: 1.5px dashed rgba(56, 189, 248, 0.45); border-radius: 16px; padding: 13px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:38px; height:38px; border-radius:12px; background:rgba(56, 189, 248, 0.15); border:1px solid rgba(56, 189, 248, 0.35); display:flex; align-items:center; justify-content:center;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:20px; height:20px; color:#38bdf8;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </div>
                <div>
                    <span style="font-size:13.5px; font-weight:800; color:#ffffff; display:block;">টার্গেট ফিক্স করুন</span>
                    <span style="font-size:11px; color:#94a3b8; display:block; margin-top:2px;">উল্টো কাউন্টডাউনসহ নির্দিষ্ট লক্ষ্য নির্ধারণ করুন</span>
                </div>
            </div>
            <div style="width:30px; height:30px; border-radius:50%; background:#0ea5e9; display:flex; align-items:center; justify-content:center; color:#fff;">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </div>
        </div>
    `;
}

function renderStreakTab() {
    if (currentStreakView === 'rank') return renderRanksSubView();
    if (currentStreakView === 'history') return renderHistorySubView();

    const activeTarget = getActiveTarget();
    syncTargetDataNative(activeTarget);

    let mainSectionsHtml = '';
    if (activeTarget) {
        // টার্গেট সক্রিয়: টার্গেট কার্ড সবার উপরে, আর আয়রন উইল সার্কেল নিচে!
        mainSectionsHtml = `
            ${renderActiveTargetHeroCard(activeTarget)}
            <div style="display:flex; align-items:center; gap:8px; margin: 12px 0 4px 0;">
                <span style="font-size:12px; font-weight:800; color:#cbd5e1;">আয়রন উইল (সার্বিক স্ট্রিক):</span>
                <div style="flex:1; height:1px; background:#334155;"></div>
            </div>
            ${renderStreakTrackerSection()}
        `;
    } else {
        // টার্গেট সক্রিয় নেই: স্বাভাবিক আয়রন উইল উপরে, টার্গেট সেট করার প্লাস বাটন নিচে!
        mainSectionsHtml = `
            ${renderStreakTrackerSection()}
            ${renderTargetSetupCta()}
        `;
    }

    return `
        <div class="screen-wrapper">
            <div class="top-header-streak">
                <div class="app-title">Iron Will</div>
                <div class="menu-dots" id="btn-streak-menu">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </div>
                <div class="dropdown-menu" id="streak-dropdown-menu">
                    <div class="dropdown-item" id="btn-toggle-theme-mode">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path fill="currentColor" d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
                        <span>থিম পরিবর্তন</span>
                    </div>
                </div>
            </div>

            <!-- ডায়নামিক হায়ারার্কি: টার্গেট ও আয়রন উইল -->
            ${mainSectionsHtml}

            <!-- Add to home বাটন -->
            <div style="display:flex; justify-content:center; margin: 10px 0 14px 0;">
                <button id="btn-add-to-home" style="display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border:1.5px solid #00E676; border-radius:12px; padding:10px 20px; color:#ffffff; font-size:13px; font-weight:800; cursor:pointer; box-shadow:0 4px 15px rgba(0,230,118,0.18);">
                    <svg viewBox="0 0 24 24" style="width:17px; height:17px; fill:#00E676;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    <span>Add to home</span>
                </button>
            </div>

            <div class="motivation-container" id="motivation-box">
                <div class="quote-text" id="quote-display">“শক্তি শারীরিক সক্ষমতা থেকে আসে না। এটি আসে এক অদম্য ইচ্ছাশক্তি থেকে।”</div>
                <div class="quote-author" id="author-display">- মহাত্মা গান্ধী</div>
            </div>

            <div class="bottom-actions-streak">
                <div class="action-item" id="btn-nav-ranks">
                    <div class="action-btn-box">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    </div>
                    <span class="action-label">My Rank</span>
                </div>

                <div class="action-item" id="btn-nav-history">
                    <div class="action-btn-box">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
                    </div>
                    <span class="action-label">History</span>
                </div>
            </div>

            <!-- মডাল ১: নতুন টার্গেট সেটআপ ডায়ালগ -->
            <div id="target-setup-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99995; justify-content:center; align-items:center; backdrop-filter:blur(5px); padding:16px; box-sizing:border-box;">
                <div style="background:#1e293b; border:1px solid #38bdf8; border-radius:18px; max-width:380px; width:100%; padding:20px; color:#fff; box-shadow:0 12px 30px rgba(0,0,0,0.6);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
                        <div style="width:36px; height:36px; border-radius:10px; background:rgba(56,189,248,0.2); display:flex; align-items:center; justify-content:center;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:20px; height:20px; color:#38bdf8;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:16px; font-weight:800;">নতুন টার্গেট ফিক্স করুন</h3>
                            <span style="font-size:11px; color:#94a3b8;">নির্দিষ্ট সময়ের সংকল্প ও উল্টো গণনা</span>
                        </div>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block; font-size:11.5px; font-weight:700; color:#cbd5e1; margin-bottom:5px;">টার্গেটের নাম:</label>
                        <input type="text" id="input-target-title" placeholder="যেমন: ১০ দিনের আত্মশুদ্ধি চ্যালেঞ্জ" value="১০ দিনের চ্যালেঞ্জ" style="width:100%; box-sizing:border-box; padding:9px 12px; background:#0f172a; border:1px solid #475569; border-radius:8px; color:#fff; font-size:13px; font-weight:600; outline:none;" />
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block; font-size:11.5px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">সময়সীমা নির্বাচন করুন (দিন):</label>
                        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
                            <button class="target-day-chip" data-days="1" style="flex:1; min-width:45px; padding:7px 4px; background:#334155; border:1px solid #475569; color:#cbd5e1; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">১ দিন</button>
                            <button class="target-day-chip" data-days="3" style="flex:1; min-width:45px; padding:7px 4px; background:#334155; border:1px solid #475569; color:#cbd5e1; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">৩ দিন</button>
                            <button class="target-day-chip" data-days="7" style="flex:1; min-width:45px; padding:7px 4px; background:#334155; border:1px solid #475569; color:#cbd5e1; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">৭ দিন</button>
                            <button class="target-day-chip selected" data-days="10" style="flex:1; min-width:45px; padding:7px 4px; background:#0ea5e9; border:1px solid #38bdf8; color:#fff; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">১০ দিন</button>
                            <button class="target-day-chip" data-days="15" style="flex:1; min-width:45px; padding:7px 4px; background:#334155; border:1px solid #475569; color:#cbd5e1; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">১৫ দিন</button>
                            <button class="target-day-chip" data-days="30" style="flex:1; min-width:45px; padding:7px 4px; background:#334155; border:1px solid #475569; color:#cbd5e1; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">৩০ দিন</button>
                        </div>
                        <input type="number" id="input-target-days" min="1" max="365" value="10" placeholder="কাস্টম দিন লিখুন" style="width:100%; box-sizing:border-box; padding:8px 12px; background:#0f172a; border:1px solid #475569; border-radius:8px; color:#38bdf8; font-size:13px; font-weight:700; outline:none;" />
                    </div>

                    <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:9px 12px; margin-bottom:14px;">
                        <span style="font-size:11px; color:#94a3b8; line-height:1.4; display:block;">
                            ৩ দিনের বেশি দীর্ঘমেয়াদী টার্গেট হলে সমদূরত্বে ৩ বার স্বয়ংক্রিয় অনুপ্রেরণামূলক নোটিফিকেশন প্রদান করা হবে।
                        </span>
                    </div>

                    <div style="display:flex; gap:8px;">
                        <button id="btn-cancel-target-modal" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">বাতিল</button>
                        <button id="btn-submit-target-modal" style="flex:1; padding:10px; background:#0ea5e9; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">টার্গেট শুরু করুন</button>
                    </div>
                </div>
            </div>

            <!-- মডাল ২: টার্গেট পরিবর্তন / বাতিল ব্যবস্থাপনা -->
            <div id="target-manage-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99996; justify-content:center; align-items:center; backdrop-filter:blur(5px); padding:16px; box-sizing:border-box;">
                <div style="background:#1e293b; border:1px solid #475569; border-radius:18px; max-width:360px; width:100%; padding:20px; color:#fff; text-align:center;">
                    <h3 style="margin:0 0 8px 0; font-size:16px; font-weight:800;">চলমান টার্গেট পরিচালনা</h3>
                    <p style="font-size:12px; color:#94a3b8; margin:0 0 16px 0;">আপনি এই টার্গেটটি কীভাবে সম্পন্ন বা পরিবর্তন করতে চান?</p>

                    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
                        <button id="btn-complete-target-early" style="padding:11px; background:#10b981; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">টার্গেট সফল সমাপ্তি ঘোষণা করুন</button>
                        <button id="btn-cancel-target-early" style="padding:11px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">টার্গেট বাতিল করুন</button>
                        <button id="btn-close-target-manage" style="padding:10px; background:#334155; color:#cbd5e1; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">ফিরে যান</button>
                    </div>
                </div>
            </div>

            <!-- মডাল ৩: সফল সমাপ্তি সেলিব্রেশন ডায়ালগ -->
            <div id="target-celebrate-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.88); z-index:99997; justify-content:center; align-items:center; backdrop-filter:blur(6px); padding:16px; box-sizing:border-box;">
                <div style="background:#0f172a; border:2px solid #10b981; border-radius:20px; max-width:360px; width:100%; padding:24px 18px; color:#fff; text-align:center; box-shadow:0 15px 35px rgba(16,185,129,0.3);">
                    <div style="width:56px; height:56px; border-radius:50%; background:rgba(16,185,129,0.2); border:2px solid #10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:30px; height:30px; color:#10b981;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <h2 style="margin:0 0 6px 0; font-size:20px; font-weight:900; color:#34d399;">অভিনন্দন!</h2>
                    <h4 id="target-celebrate-name" style="margin:0 0 10px 0; font-size:15px; font-weight:700; color:#ffffff;">টার্গেট সফল হয়েছে</h4>
                    <p style="font-size:12.5px; color:#cbd5e1; line-height:1.5; margin:0 0 18px 0;">
                        আপনার নির্ধারিত সংকল্প ও টার্গেটটি সফলভাবে সম্পন্ন হয়েছে। আপনার অদম্য ইচ্ছাশক্তিকে অভিবাদন!
                    </p>
                    <button id="btn-dismiss-celebrate-modal" style="width:100%; padding:11px; background:#10b981; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer;">
                        ধন্যবাদ ও সমাপ্ত করুন
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderRanksSubView() {
    const diffDays = Math.floor((Date.now() - streakStartTime) / (1000 * 24 * 3600));
    return `
        <div class="screen-wrapper">
            <div class="header-row">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div id="btn-back-streak" style="cursor:pointer;">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </div>
                    <h2 style="font-size:20px;">My Ranks</h2>
                </div>
            </div>
            <div>
                ${RANKS_DATA.map((r, idx) => {
                    const isCurrent = diffDays >= r.days && (idx === RANKS_DATA.length - 1 || diffDays < RANKS_DATA[idx+1].days);
                    const isUnlocked = diffDays >= r.days;
                    return `
                        <div class="rank-card ${isCurrent ? 'active-rank' : ''}" onclick="window.selectRankForTracking(${idx})">
                            <div class="rank-title">${r.title}</div>
                            <div class="rank-days-desc">${r.desc}</div>
                            <div class="rank-status-tag ${isCurrent ? 'active' : (isUnlocked ? 'done' : 'locked')}">
                                ${isCurrent ? 'চলমান পদবী' : (isUnlocked ? 'অর্জিত' : 'লকড')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderHistorySubView() {
    const history = JSON.parse(localStorage.getItem('STREAK_HISTORY') || '[]');
    const targetHistory = JSON.parse(localStorage.getItem('HELPNICHE_TARGET_HISTORY') || '[]');

    return `
        <div class="screen-wrapper">
            <div class="header-row">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div id="btn-back-streak" style="cursor:pointer;">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </div>
                    <h2 style="font-size:20px;">হিস্ট্রি ও অর্জন</h2>
                </div>
            </div>

            <!-- সম্পন্ন হওয়া টার্গেট সেকশন -->
            <div style="margin-bottom:20px;">
                <h3 style="font-size:14px; font-weight:800; color:#38bdf8; margin:0 0 8px 0;">টার্গেট সমাপ্তির ইতিহাস</h3>
                ${targetHistory.length === 0 ? `
                    <div style="font-size:12px; color:var(--text-muted); padding:8px 0;">এখনো কোনো টার্গেট হিস্টোরি তৈরি হয়নি।</div>
                ` : targetHistory.slice().reverse().map(item => `
                    <div class="history-item" style="border-left: 3px solid ${item.status === 'completed' ? '#10b981' : '#f43f5e'};">
                        <div class="history-days-title">${item.title} (${item.days} দিন)</div>
                        <div class="history-date-range" style="color:${item.status === 'completed' ? '#34d399' : '#f87171'}; font-weight:700;">
                            ${item.status === 'completed' ? 'সফলভাবে সম্পন্ন' : 'বাতিল করা হয়েছে'}
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- স্ট্রিক রিসেট ইতিহাস -->
            <div>
                <h3 style="font-size:14px; font-weight:800; color:#cbd5e1; margin:0 0 8px 0;">আয়রন উইল স্ট্রিক ইতিহাস</h3>
                ${history.length === 0 ? `
                    <div style="text-align:center; color:var(--text-muted); margin-top:20px;">এখনো কোনো স্ট্রিক হিস্টোরি তৈরি হয়নি।</div>
                ` : history.slice().reverse().map(item => `
                    <div class="history-item">
                        <div class="history-days-title">${item.days} Days Clean</div>
                        <div class="history-date-range">${item.startDate} &rarr; ${item.endDate}</div>
                        <div class="history-comment">${item.comment || 'কোনো মন্তব্য নেই'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.selectRankForTracking = function(index) {
    selectedTrackingRankIndex = index;
    currentStreakView = 'home';
    switchTab('streak');
};

function bindStreakTabEvents() {
    const backBtn = document.getElementById('btn-back-streak');
    if (backBtn) {
        backBtn.onclick = () => {
            currentStreakView = 'home';
            switchTab('streak');
        };
        return;
    }

    const btnMenu = document.getElementById('btn-streak-menu');
    const menuDropdown = document.getElementById('streak-dropdown-menu');
    if (btnMenu) {
        btnMenu.onclick = (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
        };
    }

    document.addEventListener('click', () => {
        if (menuDropdown) menuDropdown.classList.remove('show');
    });

    const btnThemeToggle = document.getElementById('btn-toggle-theme-mode');
    if (btnThemeToggle) {
        btnThemeToggle.onclick = () => {
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        };
    }

    const btnRanks = document.getElementById('btn-nav-ranks');
    if (btnRanks) btnRanks.onclick = () => { currentStreakView = 'rank'; switchTab('streak'); };

    const btnBadge = document.getElementById('btn-streak-badge');
    if (btnBadge) btnBadge.onclick = () => { currentStreakView = 'rank'; switchTab('streak'); };

    const btnHistory = document.getElementById('btn-nav-history');
    if (btnHistory) btnHistory.onclick = () => { currentStreakView = 'history'; switchTab('streak'); };

    const btnRelapse = document.getElementById('btn-open-relapse-modal');
    if (btnRelapse) {
        btnRelapse.onclick = () => {
            document.getElementById('relapse-modal').style.display = 'flex';
        };
    }

    const btnMotiv = document.getElementById('motivation-box');
    if (btnMotiv) {
        btnMotiv.onclick = () => cycleBengaliMotivation();
    }

    // Add to home বাটন ক্লিক হ্যান্ডলার
    const btnAddToHome = document.getElementById('btn-add-to-home');
    if (btnAddToHome) {
        btnAddToHome.onclick = async () => {
            if (window.Capacitor?.Plugins?.UnlockPlugin?.pinStreakWidget) {
                try {
                    const res = await window.Capacitor.Plugins.UnlockPlugin.pinStreakWidget();
                    if (!res.supported) {
                        alert("আপনার ফোনে হোম স্ক্রিনে সরাসরি পিন করার সুবিধা সাপোর্ট করে না। দয়া করে ফোনের হোম স্ক্রিনে চেপে ধরে উইজেট যুক্ত করুন।");
                    }
                } catch (e) {
                    console.error("Pin widget error", e);
                }
            } else {
                alert("হোম স্ক্রিনের খালি জায়গায় চেপে ধরে Widgets থেকে Helpniche নির্বাচন করে যুক্ত করুন।");
            }
        };
    }

    // টার্গেট সেটআপ মডাল ইভেন্ট
    const btnOpenTargetModal = document.getElementById('btn-open-target-modal');
    const targetSetupModal = document.getElementById('target-setup-modal-overlay');
    const btnCancelTargetModal = document.getElementById('btn-cancel-target-modal');
    const btnSubmitTargetModal = document.getElementById('btn-submit-target-modal');
    const inputTargetTitle = document.getElementById('input-target-title');
    const inputTargetDays = document.getElementById('input-target-days');

    if (btnOpenTargetModal && targetSetupModal) {
        btnOpenTargetModal.onclick = () => {
            targetSetupModal.style.display = 'flex';
        };
    }

    if (btnCancelTargetModal && targetSetupModal) {
        btnCancelTargetModal.onclick = () => {
            targetSetupModal.style.display = 'none';
        };
    }

    // চিপস ক্লিকে দিন নির্বাচন
    const dayChips = document.querySelectorAll('.target-day-chip');
    dayChips.forEach(chip => {
        chip.onclick = (e) => {
            dayChips.forEach(c => {
                c.style.background = '#334155';
                c.style.borderColor = '#475569';
                c.style.color = '#cbd5e1';
            });
            chip.style.background = '#0ea5e9';
            chip.style.borderColor = '#38bdf8';
            chip.style.color = '#fff';
            const days = chip.getAttribute('data-days');
            if (inputTargetDays) inputTargetDays.value = days;
        };
    });

    if (btnSubmitTargetModal) {
        btnSubmitTargetModal.onclick = () => {
            const title = inputTargetTitle ? inputTargetTitle.value.trim() : '';
            const days = inputTargetDays ? parseInt(inputTargetDays.value, 10) : 10;
            if (targetSetupModal) targetSetupModal.style.display = 'none';
            startNewTarget(title, days);
        };
    }

    // টার্গেট ম্যানেজ মডাল ইভেন্ট
    const btnManageActiveTarget = document.getElementById('btn-manage-active-target');
    const targetManageModal = document.getElementById('target-manage-modal-overlay');
    const btnCompleteTargetEarly = document.getElementById('btn-complete-target-early');
    const btnCancelTargetEarly = document.getElementById('btn-cancel-target-early');
    const btnCloseTargetManage = document.getElementById('btn-close-target-manage');

    if (btnManageActiveTarget && targetManageModal) {
        btnManageActiveTarget.onclick = () => {
            targetManageModal.style.display = 'flex';
        };
    }

    if (btnCloseTargetManage && targetManageModal) {
        btnCloseTargetManage.onclick = () => {
            targetManageModal.style.display = 'none';
        };
    }

    if (btnCompleteTargetEarly) {
        btnCompleteTargetEarly.onclick = () => {
            if (targetManageModal) targetManageModal.style.display = 'none';
            const target = getActiveTarget();
            if (target) completeCurrentTarget(target);
        };
    }

    if (btnCancelTargetEarly) {
        btnCancelTargetEarly.onclick = () => {
            if (confirm("আপনি কি নিশ্চিতভাবে এই টার্গেটটি বাতিল করতে চান?")) {
                if (targetManageModal) targetManageModal.style.display = 'none';
                cancelCurrentTarget();
            }
        };
    }

    // সেলিব্রেশন মডাল বন্ধ
    const btnDismissCelebrate = document.getElementById('btn-dismiss-celebrate-modal');
    const celebrateModal = document.getElementById('target-celebrate-modal-overlay');
    if (btnDismissCelebrate && celebrateModal) {
        btnDismissCelebrate.onclick = () => {
            celebrateModal.style.display = 'none';
            switchTab('streak');
        };
    }

    updateStreakDisplays();
}

function cycleBengaliMotivation() {
    const rand = BENGALI_MOTIVATIONS[Math.floor(Math.random() * BENGALI_MOTIVATIONS.length)];
    const q = document.getElementById('quote-display');
    const a = document.getElementById('author-display');
    if (q && a) {
        q.innerText = `“${rand.quote}”`;
        a.innerText = `- ${rand.author}`;
    }
}

function updateStreakDisplays() {
    if (currentTab !== 'streak' || currentStreakView !== 'home') return;
    const now = Date.now();

    // ১. সাধারণ আয়রন উইল স্ট্রিক আপডেট
    const diffMs = Math.max(0, now - streakStartTime);
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / (24 * 3600));
    const remSecs = totalSecs % (24 * 3600);
    const hrs = Math.floor(remSecs / 3600);
    const mins = Math.floor((remSecs % 3600) / 60);
    const secs = remSecs % 60;

    const daysEl = document.getElementById('streak-days-display');
    const timerEl = document.getElementById('streak-timer-display');
    const badgeEl = document.getElementById('rank-badge-name');
    const circleBar = document.getElementById('progress-circle');

    if (daysEl) daysEl.innerText = `${days} days`;
    if (timerEl) timerEl.innerText = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;

    const rank = getCurrentRank(days);
    if (badgeEl) badgeEl.innerText = rank.title;

    if (circleBar) {
        const circ = 2 * Math.PI * 110;
        let ratio = (totalSecs % (24 * 3600)) / (24 * 3600);
        if (selectedTrackingRankIndex !== -1) {
            const target = RANKS_DATA[selectedTrackingRankIndex];
            ratio = Math.min(1, totalSecs / (target.days * 24 * 3600));
        }
        circleBar.style.strokeDashoffset = circ - (ratio * circ);
    }

    // ২. সক্রিয় টার্গেট উল্টো কাউন্টডাউন ও প্রগ্রেস বার আপডেট
    const activeTarget = getActiveTarget();
    if (activeTarget && activeTarget.isActive) {
        const remainingMs = activeTarget.endTime - now;

        if (remainingMs <= 0) {
            // টার্গেট সম্পন্ন!
            completeCurrentTarget(activeTarget);
            return;
        }

        const remTotalSecs = Math.floor(remainingMs / 1000);
        const remDays = Math.floor(remTotalSecs / (24 * 3600));
        const remSecsInDay = remTotalSecs % (24 * 3600);
        const remHrs = Math.floor(remSecsInDay / 3600);
        const remMins = Math.floor((remSecsInDay % 3600) / 60);
        const remSecsVal = remSecsInDay % 60;

        const countDaysEl = document.getElementById('target-count-days');
        const countHrsEl = document.getElementById('target-count-hrs');
        const countMinsEl = document.getElementById('target-count-mins');
        const countSecsEl = document.getElementById('target-count-secs');

        if (countDaysEl) countDaysEl.innerText = remDays.toString().padStart(2, '0');
        if (countHrsEl) countHrsEl.innerText = remHrs.toString().padStart(2, '0');
        if (countMinsEl) countMinsEl.innerText = remMins.toString().padStart(2, '0');
        if (countSecsEl) countSecsEl.innerText = remSecsVal.toString().padStart(2, '0');

        // প্রগ্রেস বার
        const totalDuration = activeTarget.endTime - activeTarget.startTime;
        const elapsed = now - activeTarget.startTime;
        const pct = Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)));

        const progressBarEl = document.getElementById('target-progress-bar');
        const percentTextEl = document.getElementById('target-percent-text');

        if (progressBarEl) progressBarEl.style.width = `${pct}%`;
        if (percentTextEl) percentTextEl.innerText = `${pct}% সম্পন্ন`;

        // মাইলস্টোন অ্যালার্ট পরীক্ষা (যদি ৩ দিনের বেশি হয়)
        checkAndTriggerMilestones(activeTarget);
    }
}
