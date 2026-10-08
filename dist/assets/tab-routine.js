/* ==========================================================================
   TAB 4: ROUTINE, ALARMS & DAILY TARGET (With Clean Smart Tasbih)
   ========================================================================== */

function triggerHaptic(type) {
    try {
        if (type === 'double') {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
                window.Capacitor.Plugins.Haptics.vibrate({ duration: 300 });
            } else if ('vibrate' in navigator) {
                navigator.vibrate([150, 100, 150]);
            }
        } else {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
                window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
            } else if ('vibrate' in navigator) {
                navigator.vibrate(40);
            }
        }
    } catch (e) {
        console.log('Haptic error:', e);
    }
}

function createTasbihRipple(e, container) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'tasbeeh-ripple';

    const size = Math.max(rect.width, rect.height);
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;

    let clientX = e ? e.clientX : null;
    let clientY = e ? e.clientY : null;

    if ((!clientX || clientX === 0) && e && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    if (!clientX || clientX === 0) {
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
    }

    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    container.appendChild(ripple);
    setTimeout(() => {
        if (ripple && ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 500);
}

function renderRoutineTab() {
    return `
        <div class="screen-wrapper">
            <div class="header-row">
                <h1 class="app-title">Routine & Tasks</h1>
                <button class="btn-primary-focus" id="btn-routine-header-action" style="width:auto; padding:6px 14px; font-size:12px; margin-bottom:0; display:${(currentRoutineTab === 'guard' || currentRoutineTab === 'tasbih' || currentRoutineTab === 'vibrate') ? 'none' : 'flex'};">
                    ${currentRoutineTab === 'target' ? 'কাস্টমাইজ' : 'যোগ করুন'}
                </button>
            </div>

            <div class="tab-bar-sub">
                <div class="tab-sub-item ${currentRoutineTab === 'target' ? 'active' : ''}" data-sub="target">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    ডেইলি টার্গেট
                </div>
                <div class="tab-sub-item ${currentRoutineTab === 'tasbih' ? 'active' : ''}" data-sub="tasbih">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/></svg>
                    তাসবিহ
                </div>
                <div class="tab-sub-item ${currentRoutineTab === 'alarms' ? 'active' : ''}" data-sub="alarms">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path d="M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                    অ্যালার্ম
                </div>
                <div class="tab-sub-item ${currentRoutineTab === 'vibrate' ? 'active' : ''}" data-sub="vibrate">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M0 15h2V9H0v6zm3 2h2V7H3v10zm19-8v6h2V9h-2zm-3 8h2V7h-2v10zM16.5 3h-9C6.67 3 6 3.67 6 4.5v15c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zM16 19H8V5h8v14z"/></svg>
                    অটো ভাইব্রেট
                </div>
                <div class="tab-sub-item ${currentRoutineTab === 'guard' ? 'active' : ''}" data-sub="guard">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    আনলক গার্ড
                </div>
            </div>

            <div id="routine-subview-container">
                ${currentRoutineTab === 'target' ? renderTargetSection() : (currentRoutineTab === 'tasbih' ? renderTasbihSection() : (currentRoutineTab === 'alarms' ? renderAlarmsSection() : (currentRoutineTab === 'vibrate' ? renderAutoVibrateSection() : renderGuardSection())))}
            </div>
        </div>
    `;
}

function renderTargetSection() {
    const circ = 2 * Math.PI * 80;
    const ratio = Math.min(1, dailyTarget.completedCount / dailyTarget.goal);
    const offset = circ - (ratio * circ);

    return `
        <div class="target-card-full" id="target-tap-area">
            <div style="font-family:'Kalpurush'; font-size:24px; color:var(--accent-green); font-weight:700;">${dailyTarget.title}</div>
            <div style="font-size:13px; color:var(--text-muted); font-style:italic; margin-top:4px;">${dailyTarget.meaning}</div>

            <div class="tasbeeh-circle-wrap" style="pointer-events:none;">
                <svg class="tasbeeh-svg" viewBox="0 0 180 180">
                    <circle class="tasbeeh-bg" cx="90" cy="90" r="80"/>
                    <circle id="tasbeeh-bar-fill" class="tasbeeh-bar" cx="90" cy="90" r="80" style="stroke-dashoffset:${offset};"/>
                </svg>
                <div style="z-index:2; text-align:center;">
                    <div class="tasbeeh-current-num" id="tasbeeh-number-val">${dailyTarget.completedCount}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">লক্ষ্য: ${dailyTarget.goal}</div>
                </div>
            </div>

            <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">স্ক্রিনের যেকোনো খালি জায়গায় স্পর্শ করে কাউন্ট করুন</div>

            <div class="target-actions-row">
                <button class="btn-target-secondary" id="btn-target-autoplay">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    ${isAutoPlaying ? 'পজ' : 'অটো প্লে'}
                </button>
                <button class="btn-target-secondary" id="btn-target-pause">পজ / পরে করব</button>
            </div>

            <!-- পরিচ্ছন্ন 'তাসবিহ' এন্ট্রি বাটন -->
            <div style="margin-top: 16px; border-top: 1px solid var(--card-border); padding-top: 14px; width: 100%;">
                <button class="btn-primary-focus" id="btn-goto-tasbih-from-target" style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: #ffffff; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 0;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/></svg>
                    <span>তাসবিহ</span>
                </button>
            </div>
        </div>
    `;
}

// মূল তাসবিহ পেজ UI (সেন্টারিং, জিরো ইমোজি, রিপল অ্যানিমেশন)
function renderTasbihSection() {
    const lifetimeTotal = getLifetimeZikrCount();

    let zikrTitle = 'সাধারণ জিকির মোড';
    let zikrArabic = 'سُبْحَانَ ٱللَّٰهِ';
    let isCompleted = false;

    if (tasbihMode === 'fatimi') {
        if (tasbihCount < 33) {
            zikrArabic = 'سُبْحَانَ ٱللَّٰهِ';
            zikrTitle = 'সুবহানাল্লাহ (১–৩৩)';
        } else if (tasbihCount < 66) {
            zikrArabic = 'ٱلْحَمْدُ لِلَّٰهِ';
            zikrTitle = 'আলহামদুলিল্লাহ (৩৪–৬৬)';
        } else if (tasbihCount < 100) {
            zikrArabic = 'ٱللَّٰهُ أَكْبَرُ';
            zikrTitle = 'আল্লাহু আকবার (৬৭–১০০)';
        } else {
            zikrArabic = 'مَا شَاءَ ٱللَّٰهُ';
            zikrTitle = '১০০ বার সম্পূর্ণ';
            isCompleted = true;
        }
    } else {
        zikrArabic = 'سُبْحَانَ ٱللَّٰهِ';
        zikrTitle = 'সাধারণ জিকির মোড';
    }

    return `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">

            <!-- লাইফটাইম টোটাল জিকির কাউন্টার (আজীবনের স্থায়ী হিসাব) -->
            <div style="width: 100%; background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 12px; text-align: center; box-sizing: border-box;">
                <span style="font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 2px;">সর্বমোট পঠিত জিকির</span>
                <span style="font-size: 18px; font-weight: 800; color: #34d399;">
                    <span id="tasbih-lifetime-val" style="color: #ffffff; font-size: 22px;">${lifetimeTotal}</span> বার
                </span>
            </div>

            <!-- মোড সিলেক্টর (শুধুমাত্র দুটি পরিষ্কার অপশন) -->
            <div style="display: flex; background: #111c38; border: 1px solid #1e293b; border-radius: 12px; padding: 3px; width: 100%; box-sizing: border-box; gap: 4px;">
                <button id="btn-mode-general" style="flex: 1; padding: 10px 6px; border: none; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${tasbihMode === 'general' ? '#10b981' : 'transparent'}; color: ${tasbihMode === 'general' ? '#000000' : '#94a3b8'};">
                    সাধারণ মোড
                </button>
                <button id="btn-mode-fatimi" style="flex: 1; padding: 10px 6px; border: none; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${tasbihMode === 'fatimi' ? '#10b981' : 'transparent'}; color: ${tasbihMode === 'fatimi' ? '#000000' : '#94a3b8'};">
                    তাসবিহ-ই-ফাতিমি (৩৩+৩৩+৩৪)
                </button>
            </div>

            <!-- সেন্টার্ড গোল কাউন্টার সার্কেল (রিপল অ্যানিমেশন সহ) -->
            <div class="tasbeeh-circle-wrap" id="tasbih-interactive-circle" style="margin: 20px auto;">

                <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%; height: 100%; padding: 12px; box-sizing: border-box;">

                    <!-- জিকিরের আরবি টেক্সট (Absolute Center) -->
                    <div id="tasbih-arabic-display" style="font-family: 'Kalpurush', 'Amiri', serif; font-size: 26px; color: #34d399; font-weight: 700; text-shadow: 0 0 10px rgba(52, 211, 153, 0.4); line-height: 1.2;">
                        ${zikrArabic}
                    </div>

                    <!-- সংখ্যা (বড় ও কেন্দ্রস্থ) -->
                    <div id="tasbih-current-num-val" style="font-family: 'Inter', sans-serif; font-size: 46px; font-weight: 800; color: #ffffff; line-height: 1; margin: 6px 0 2px 0;">
                        ${tasbihCount}
                    </div>

                    <!-- ধাপ/টাইটেল (কেন্দ্রস্থ) -->
                    <div id="tasbih-title-display" style="font-size: 11px; color: #94a3b8; font-weight: 600;">
                        ${zikrTitle}
                    </div>

                </div>

            </div>

            <!-- ১০০ বার সম্পন্ন হওয়ার পর বার্তা -->
            ${isCompleted ? `
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 12px; padding: 10px 14px; width: 100%; text-align: center; box-sizing: border-box;">
                    <div style="font-size: 13.5px; font-weight: bold; color: #34d399;">মাশাআল্লাহ! ১০০ বার পাঠ সম্পূর্ণ হয়েছে।</div>
                    <p style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">আল্লাহ আপনার জিকির কবুল করুন।</p>
                </div>
            ` : ''}

            <!-- রিসেট বাটন -->
            <button id="btn-reset-tasbih-count" style="background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px 20px; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                <span>রিসেট</span>
            </button>

        </div>
    `;
}

var prayerAlarms = JSON.parse(localStorage.getItem('PRAYER_ALARMS_CONFIG') || JSON.stringify([
    { key: 'fajr', name: 'ফজর (Fajr)', title: 'এখন ফজরের সময়', time: '05:15', enabled: false, audioPath: 'public/audio/prayer/fajr.mp3', id: 9001 },
    { key: 'dhuhr', name: 'যোহর (Dhuhr)', title: 'এখন যোহরের সময়', time: '13:15', enabled: false, audioPath: 'public/audio/prayer/dhuhr.mp3', id: 9002 },
    { key: 'asr', name: 'আসর (Asr)', title: 'এখন আসরের সময়', time: '16:30', enabled: false, audioPath: 'public/audio/prayer/asr.mp3', id: 9003 },
    { key: 'maghrib', name: 'মাগরিব (Maghrib)', title: 'এখন মাগরিবের সময়', time: '18:15', enabled: false, audioPath: 'public/audio/prayer/maghrib.mp3', id: 9004 },
    { key: 'isha', name: 'এশা (Isha)', title: 'এখন এশার সময়', time: '19:45', enabled: false, audioPath: 'public/audio/prayer/isha.mp3', id: 9005 }
]));

window.updatePrayerAlarmTime = function(index, newTime) {
    if (prayerAlarms[index]) {
        prayerAlarms[index].time = newTime;
        localStorage.setItem('PRAYER_ALARMS_CONFIG', JSON.stringify(prayerAlarms));
        if (prayerAlarms[index].enabled) {
            syncPrayerAlarmToNative(prayerAlarms[index]);
        }
    }
};

window.togglePrayerAlarm = function(index, isChecked) {
    if (prayerAlarms[index]) {
        prayerAlarms[index].enabled = isChecked;
        localStorage.setItem('PRAYER_ALARMS_CONFIG', JSON.stringify(prayerAlarms));
        syncPrayerAlarmToNative(prayerAlarms[index]);
    }
};

function syncPrayerAlarmToNative(item) {
    if (!item || !item.time) return;
    const parts = item.time.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h)) h = 5;
    if (isNaN(m)) m = 0;

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.scheduleAlarm) {
        try {
            window.Capacitor.Plugins.UnlockPlugin.scheduleAlarm({
                id: item.id,
                title: item.title,
                timeStr: item.time,
                hour: h,
                minute: m,
                enabled: item.enabled,
                audioType: 'prayer_' + item.key,
                audioUri: item.audioPath,
                repeatMode: 'everyday',
                repeatDays: '[1,2,3,4,5,6,7]'
            });
        } catch (e) {
            console.error('Error scheduling prayer alarm native:', e);
        }
    }
}

function renderPrayerAlarmsSection() {
    return `
        <div style="margin-top:20px; border-top:1px solid #1e293b; padding-top:16px;">
            <div style="font-size:15px; font-weight:800; color:#38bdf8; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5zm0-4a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5zm0-4a1.5 1.5 0 1 1-1.5-1.5A1.5 1.5 0 0 1 13 6.5z"/></svg>
                <span>নামাজের অ্যালার্ম (Prayer Alarms)</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
                ${prayerAlarms.map((p, idx) => `
                    <div style="background:#0f172a; border:1px solid #1e293b; padding:12px 16px; border-radius:14px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:14px; font-weight:800; color:#34d399;">${p.name}</div>
                            <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">${p.title}</div>
                        </div>

                        <div style="display:flex; align-items:center; gap:10px;">
                            <input
                                type="time"
                                value="${p.time}"
                                onchange="window.updatePrayerAlarmTime(${idx}, this.value)"
                                style="background:#1e293b; border:1px solid #334155; color:#38bdf8; padding:6px 10px; border-radius:8px; font-size:14px; font-weight:bold; outline:none;"
                            />

                            <label class="alarm-switch">
                                <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="window.togglePrayerAlarm(${idx}, this.checked)">
                                <span class="switch-slider"></span>
                            </label>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderAlarmsSection() {
    const dayNames = { 7: 'শনি', 1: 'রবি', 2: 'সোম', 3: 'মঙ্গল', 4: 'বুধ', 5: 'বৃহস্পতি', 6: 'শুক্র' };
    return `
        <div>
            <div style="font-size:14px; font-weight:800; color:#ffffff; margin-bottom:10px;">সাধারণ কাস্টম অ্যালার্ম</div>
            ${alarms.length === 0 ? `
                <div style="text-align:center; color:var(--text-muted); margin:20px 0; font-size:12.5px;">কোনো কাস্টম অ্যালার্ম সেট করা নেই। ওপরে 'যোগ করুন' বাটনে চাপুন।</div>
            ` : alarms.map((al, idx) => {
                let repeatBadge = 'প্রতিদিন';
                if (al.repeatMode === 'once') repeatBadge = 'একবার';
                else if (al.repeatMode === 'custom' && Array.isArray(al.repeatDays)) {
                    repeatBadge = al.repeatDays.map(d => dayNames[d] || d).join(', ');
                }
                return `
                <div class="alarm-card" style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; border:1px solid #1e293b; padding:12px 16px; border-radius:14px; margin-bottom:10px;">
                    <div>
                        <div class="alarm-time" style="font-size:20px; font-weight:800; color:#10b981;">${al.time}</div>
                        <div style="font-size:13px; color:#ffffff; font-weight:700;">${al.title}</div>
                        <div style="font-size:11px; color:#38bdf8; margin-top:2px; display:flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:currentColor;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg><span>${repeatBadge}</span></div>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <label class="alarm-switch">
                            <input type="checkbox" ${al.enabled ? 'checked' : ''} onchange="window.toggleAlarmItem(${idx})">
                            <span class="switch-slider"></span>
                        </label>
                        <div onclick="window.deleteAlarmItem(${idx})" style="cursor:pointer; color:var(--danger, #ef4444);">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:20px; height:20px;"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}

            ${renderPrayerAlarmsSection()}
        </div>
    `;
}

let autoVibrateConfig = JSON.parse(localStorage.getItem('AUTO_VIBRATE_CONFIG') || 'null');
if (!autoVibrateConfig) {
    autoVibrateConfig = {
        enabled: false,
        slots: [
            { id: 'fajr', name: 'ফজর (Fajr)', startTime: '05:15', endTime: '05:45', enabled: true },
            { id: 'zohr', name: 'জোহর (Zohr)', startTime: '13:15', endTime: '13:45', enabled: true },
            { id: 'asr', name: 'আসর (Asr)', startTime: '16:30', endTime: '17:00', enabled: true },
            { id: 'maghrib', name: 'মাগরিব (Maghrib)', startTime: '18:05', endTime: '18:35', enabled: true },
            { id: 'isha', name: 'এশা (Isha)', startTime: '20:00', endTime: '20:30', enabled: true }
        ]
    };
}
let isAutoVibrateActiveNow = false;
let isDndGrantedInApp = true;

function fetchAutoVibrateNativeStatus() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.getAutoVibrateConfig) {
        window.Capacitor.Plugins.UnlockPlugin.getAutoVibrateConfig().then(res => {
            if (res) {
                isAutoVibrateActiveNow = !!res.isCurrentlyVibrating;
                isDndGrantedInApp = res.isDndGranted !== false;
                if (res.configJson) {
                    try {
                        const parsed = JSON.parse(res.configJson);
                        if (parsed && Array.isArray(parsed.slots)) {
                            autoVibrateConfig = parsed;
                            localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));
                        }
                    } catch(e) {}
                }
                const statusBadge = document.getElementById('auto-vibrate-status-badge');
                if (statusBadge) {
                    if (autoVibrateConfig.enabled && isAutoVibrateActiveNow) {
                        statusBadge.innerText = 'বর্তমানে ভাইব্রেট মোড সক্রিয় আছে (কোনো রিংটোন বাজবে না)';
                        statusBadge.style.color = '#4ade80';
                        statusBadge.style.borderColor = '#22c55e';
                        statusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
                    } else if (autoVibrateConfig.enabled) {
                        statusBadge.innerText = 'শিডিউল সক্রিয় (বর্তমানে স্বাভাবিক সাউন্ড মোড)';
                        statusBadge.style.color = '#38bdf8';
                        statusBadge.style.borderColor = '#0284c7';
                        statusBadge.style.background = 'rgba(56, 189, 248, 0.15)';
                    } else {
                        statusBadge.innerText = 'অটো ভাইব্রেট বন্ধ রয়েছে';
                        statusBadge.style.color = '#94a3b8';
                        statusBadge.style.borderColor = '#64748b';
                        statusBadge.style.background = 'rgba(148, 163, 184, 0.15)';
                    }
                }
                const dndNotice = document.getElementById('vibrate-dnd-notice');
                if (dndNotice) {
                    dndNotice.style.display = (!isDndGrantedInApp && autoVibrateConfig.enabled) ? 'flex' : 'none';
                }
            }
        }).catch(() => {});
    }
}

function renderAutoVibrateSection() {
    fetchAutoVibrateNativeStatus();

    return `
        <div class="dash-card" style="text-align: left;">
            <!-- Header with Master Toggle -->
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; border-bottom:1px solid var(--card-border); padding-bottom:12px;">
                <div style="flex:1; min-width:0;">
                    <span style="font-weight:800; font-size:15px; color:var(--accent-green); display:block;">অটো ভাইব্রেট মোড (Auto Vibrate)</span>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:3px; line-height:1.4;">নামাজের সময় বা গুরুত্বপূর্ণ কাজে নির্দিষ্ট সময়ে ফোন স্বয়ংক্রিয়ভাবে ভাইব্রেট মোডে যাবে</p>
                </div>
                <div id="btn-toggle-auto-vibrate-master" style="width:48px; height:26px; background:${autoVibrateConfig.enabled ? '#10b981' : '#334155'}; border-radius:20px; position:relative; cursor:pointer; transition:background 0.25s ease; flex-shrink:0;">
                    <div id="auto-vibrate-master-knob" style="width:20px; height:20px; background:#ffffff; border-radius:50%; position:absolute; top:3px; left:${autoVibrateConfig.enabled ? '25px' : '3px'}; transition:left 0.25s ease; box-shadow:0 2px 5px rgba(0,0,0,0.35);"></div>
                </div>
            </div>

            <!-- Live Status Pill -->
            <div style="margin-bottom:14px;">
                <span id="auto-vibrate-status-badge" style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; border:1px solid ${autoVibrateConfig.enabled ? (isAutoVibrateActiveNow ? '#22c55e' : '#0284c7') : '#64748b'}; color:${autoVibrateConfig.enabled ? (isAutoVibrateActiveNow ? '#4ade80' : '#38bdf8') : '#94a3b8'}; background:${autoVibrateConfig.enabled ? (isAutoVibrateActiveNow ? 'rgba(34,197,94,0.15)' : 'rgba(56,189,248,0.15)') : 'rgba(148,163,184,0.15)'}; display:inline-block;">
                    ${autoVibrateConfig.enabled ? (isAutoVibrateActiveNow ? 'বর্তমানে ভাইব্রেট মোড সক্রিয় আছে (কোনো রিংটোন বাজবে না)' : 'শিডিউল সক্রিয় (বর্তমানে স্বাভাবিক সাউন্ড মোড)') : 'অটো ভাইব্রেট বন্ধ রয়েছে'}
                </span>
            </div>

            <!-- DND Permission notice if needed -->
            <div id="vibrate-dnd-notice" style="display:${(!isDndGrantedInApp && autoVibrateConfig.enabled) ? 'flex' : 'none'}; background:rgba(234, 179, 8, 0.12); border:1px solid rgba(234, 179, 8, 0.35); border-radius:10px; padding:10px; margin-bottom:14px; align-items:center; justify-content:space-between; gap:10px;">
                <div style="font-size:11px; color:#fef08a; line-height:1.4; flex:1;">
                    <b>ডু-নট-ডিস্টার্ব অনুমতি প্রয়োজন:</b><br/>
                    রিংগার মোড পরিবর্তনের জন্য ফোনের DND অনুমতি দিন।
                </div>
                <button type="button" id="btn-grant-dnd" style="background:#eab308; color:#000; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; flex-shrink:0;">অনুমতি দিন</button>
            </div>

            <!-- Slots Header with Add Button -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;">
                <span style="font-size:13px; font-weight:700; color:#fff; flex:1; min-width:0;">নির্ধারিত সময়সূচি (Prayer & Focus Slots)</span>
                <button type="button" id="btn-add-vibrate-slot" style="background:rgba(16, 185, 129, 0.2); border:1px solid #10b981; color:#34d399; font-size:11px; font-weight:700; padding:5px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:4px; flex-shrink:0;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    <span>স্লট যোগ করুন</span>
                </button>
            </div>

            <!-- Slots List -->
            <div id="vibrate-slots-list" style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                ${autoVibrateConfig.slots.map((slot, idx) => `
                    <div style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                            <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; flex-shrink:0; color:${slot.enabled ? '#34d399' : '#64748b'};"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                <input type="text" class="vibrate-slot-name" data-idx="${idx}" value="${escapeHtml(slot.name)}" style="background:transparent; border:none; color:#fff; font-size:13px; font-weight:700; width:100%; outline:none;" placeholder="স্লটের নাম" />
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                                <div class="vibrate-slot-toggle" data-idx="${idx}" style="width:38px; height:22px; background:${slot.enabled ? '#10b981' : '#334155'}; border-radius:14px; position:relative; cursor:pointer; transition:background 0.2s ease;">
                                    <div style="width:16px; height:16px; background:#ffffff; border-radius:50%; position:absolute; top:3px; left:${slot.enabled ? '19px' : '3px'}; transition:left 0.2s ease; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                </div>
                                <button type="button" class="btn-delete-vibrate-slot" data-idx="${idx}" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px; display:flex; align-items:center;">
                                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:15px; height:15px;"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#cbd5e1;">
                            <div style="display:flex; align-items:center; gap:4px; flex:1;">
                                <span style="color:#94a3b8; font-size:11px;">শুরু:</span>
                                <input type="time" class="vibrate-slot-start input-dark" data-idx="${idx}" value="${slot.startTime}" style="padding:4px 6px; font-size:12px; height:32px; flex:1; margin-bottom:0;" />
                            </div>
                            <span style="color:#64748b;">-</span>
                            <div style="display:flex; align-items:center; gap:4px; flex:1;">
                                <span style="color:#94a3b8; font-size:11px;">শেষ:</span>
                                <input type="time" class="vibrate-slot-end input-dark" data-idx="${idx}" value="${slot.endTime}" style="padding:4px 6px; font-size:12px; height:32px; flex:1; margin-bottom:0;" />
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Save Button -->
            <button class="btn-primary-focus" id="btn-save-auto-vibrate" style="margin-bottom:0; background:var(--accent-green); color:#000; font-weight:bold;">
                সংরক্ষণ করুন (Save Auto Vibrate)
            </button>
        </div>
    `;
}

function renderGuardSection() {
    const curAudio = unlockGuard.audioType || 'durood_sharif';
    const customAudioName = unlockGuard.customAudioName || 'কোনো কাস্টম অডিও নেই';
    const defaultText = (unlockGuard.text && unlockGuard.text.trim()) ? unlockGuard.text.trim() : 'صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ';

    return `
        <div class="dash-card" style="text-align: left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--card-border); padding-bottom:10px;">
                <div>
                    <span style="font-weight:800; font-size:15px; color:var(--accent-green);">ফোন আনলক সতর্কতা (Unlock Guard)</span>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">ফোন আনলক করলে দরূদ বা আপনার পছন্দের অডিও বেজে উঠবে</p>
                </div>
                <label class="alarm-switch">
                    <input type="checkbox" id="guard-toggle-chk" ${unlockGuard.enabled ? 'checked' : ''}>
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
                    <!-- অপশন ১: ডিফল্ট দরূদ শরীফ -->
                    <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; cursor:pointer;">
                        <input type="radio" name="guard-sound-choice" value="durood_sharif" ${curAudio === 'durood_sharif' ? 'checked' : ''} style="accent-color:var(--accent-green);">
                        <div>
                            <div style="font-size:13px; font-weight:700; color:#fff;">দরূদ শরীফ (ডিফল্ট)</div>
                            <div style="font-size:11px; color:var(--text-muted);">ফোন আনলকে স্বয়ংক্রিয়ভাবে দরূদ পাঠ হবে</div>
                        </div>
                    </label>

                    <!-- অপশন ২: কাস্টম অডিও ফাইল (+ বাটন) -->
                    <label style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:10px 12px; border-radius:8px; cursor:pointer;">
                        <input type="radio" name="guard-sound-choice" value="custom" ${curAudio === 'custom' ? 'checked' : ''} style="accent-color:var(--accent-green);">
                        <div style="flex:1;">
                            <div style="font-size:13px; font-weight:700; color:#fff;">নিজের পছন্দের অডিও / ভয়েস</div>
                            <div id="guard-custom-audio-label" style="font-size:11px; color:var(--accent-green); margin-top:2px;">
                                ${unlockGuard.customAudioName ? unlockGuard.customAudioName : 'ফোন থেকে অডিও যোগ করুন'}
                            </div>
                        </div>

                        <!-- প্লাস (+) বাটন -->
                        <button type="button" id="btn-pick-custom-audio" style="background:#1565C0; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px;">
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            <span>অডিও দিন</span>
                        </button>
                    </label>
                </div>

                <input type="file" id="guard-audio-file-input" accept="audio/*" style="display:none;" />
            </div>

            <!-- ঐচ্ছিক পপ-আপ মেসেজ -->
            <div style="margin-bottom:16px;">
                <label style="font-size:11px; color:var(--text-muted); font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                    <span>আনলক স্ক্রিন বার্তা (ঐচ্ছিক):</span>
                </label>
                <input type="text" id="guard-caution-text" class="input-dark" style="height:40px; margin-bottom:0;" placeholder="صَلَّىٰ ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ" value="${defaultText}" />
            </div>

            <button class="btn-primary-focus" id="btn-save-guard" style="margin-bottom:0; background:var(--accent-green); color:#000; font-weight:bold;">
                সংরক্ষণ করুন (Save Guard)
            </button>
        </div>
    `;
}

window.toggleAlarmItem = function(idx) {
    const item = alarms[idx];
    if (!item) return;
    item.enabled = !item.enabled;
    localStorage.setItem('CUSTOM_ALARMS', JSON.stringify(alarms));

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin) {
        const parts = (item.time || '05:30').split(':');
        const h = item.hour !== undefined ? item.hour : (parseInt(parts[0], 10) || 5);
        const m = item.minute !== undefined ? item.minute : (parseInt(parts[1], 10) || 30);
        window.Capacitor.Plugins.UnlockPlugin.scheduleAlarm({
            id: item.id || (idx + 1000),
            title: item.title || 'Helpniche অ্যালার্ম',
            timeStr: item.time,
            hour: h,
            minute: m,
            enabled: item.enabled,
            audioType: 'alarm',
            repeatMode: item.repeatMode || 'everyday',
            repeatDays: item.repeatDays || [1,2,3,4,5,6,7]
        });
    }

    switchTab('routine');
};

window.deleteAlarmItem = function(idx) {
    const item = alarms[idx];
    if (item && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin) {
        window.Capacitor.Plugins.UnlockPlugin.cancelAlarm({ id: item.id || (idx + 1000) });
    }
    alarms.splice(idx, 1);
    localStorage.setItem('CUSTOM_ALARMS', JSON.stringify(alarms));
    switchTab('routine');
};

function bindRoutineTabEvents() {
    document.querySelectorAll('.tab-sub-item').forEach(el => {
        el.onclick = () => {
            currentRoutineTab = el.dataset.sub;
            switchTab('routine');
        };
    });

    const btnHeader = document.getElementById('btn-routine-header-action');
    if (btnHeader) {
        btnHeader.onclick = () => {
            if (currentRoutineTab === 'target') {
                document.getElementById('target-title-input').value = dailyTarget.title;
                document.getElementById('target-meaning-input').value = dailyTarget.meaning;
                document.getElementById('target-goal-input').value = dailyTarget.goal;
                const penaltyChk = document.getElementById('target-penalty-toggle-chk');
                if (penaltyChk) penaltyChk.checked = dailyTarget.penaltyLockEnabled || false;
                document.getElementById('target-custom-modal').style.display = 'flex';
            } else if (currentRoutineTab === 'alarms') {
                document.getElementById('alarm-modal').style.display = 'flex';
            }
        };
    }

    const tapArea = document.getElementById('target-tap-area');
    if (tapArea) {
        tapArea.onclick = (e) => {
            if (e.target.closest('.target-actions-row') || e.target.closest('#btn-goto-tasbih-from-target')) return;
            incrementTargetCount();
        };
    }

    // --- TASBIH EVENT HANDLERS ---
    const btnGotoTasbih = document.getElementById('btn-goto-tasbih-from-target');
    if (btnGotoTasbih) {
        btnGotoTasbih.onclick = (e) => {
            e.stopPropagation();
            currentRoutineTab = 'tasbih';
            switchTab('routine');
        };
    }

    const btnModeGeneral = document.getElementById('btn-mode-general');
    if (btnModeGeneral) {
        btnModeGeneral.onclick = (e) => {
            e.stopPropagation();
            tasbihMode = 'general';
            localStorage.setItem('TASBIH_MODE', 'general');
            switchTab('routine');
        };
    }

    const btnModeFatimi = document.getElementById('btn-mode-fatimi');
    if (btnModeFatimi) {
        btnModeFatimi.onclick = (e) => {
            e.stopPropagation();
            tasbihMode = 'fatimi';
            localStorage.setItem('TASBIH_MODE', 'fatimi');
            switchTab('routine');
        };
    }

    const btnResetTasbih = document.getElementById('btn-reset-tasbih-count');
    if (btnResetTasbih) {
        btnResetTasbih.onclick = (e) => {
            e.stopPropagation();
            tasbihCount = 0;
            localStorage.setItem('TASBIH_COUNT', '0');
            switchTab('routine');
        };
    }

    const tasbihCircle = document.getElementById('tasbih-interactive-circle');
    if (tasbihCircle) {
        tasbihCircle.onclick = (e) => {
            // Ripple wave effect inside circle boundary
            createTasbihRipple(e, tasbihCircle);

            tasbihCount++;
            localStorage.setItem('TASBIH_COUNT', tasbihCount.toString());

            incrementLifetimeZikrCount(1);

            // Vibration feedback logic
            if (tasbihMode === 'fatimi') {
                if (tasbihCount === 33 || tasbihCount === 66 || tasbihCount === 100) {
                    triggerHaptic('double');
                } else {
                    triggerHaptic('single');
                }
            } else {
                triggerHaptic('single');
            }

            switchTab('routine');
        };
    }

    const btnAutoPlay = document.getElementById('btn-target-autoplay');
    if (btnAutoPlay) {
        btnAutoPlay.onclick = (e) => {
            e.stopPropagation();
            if (!dailyTarget.audioData) {
                alert('কোনো অডিও নেই! কাস্টমাইজ থেকে অডিও যোগ করুন।');
                return;
            }
            if (isAutoPlaying) {
                stopTargetAutoPlay();
            } else {
                startTargetAutoPlay();
            }
        };
    }

    const btnPause = document.getElementById('btn-target-pause');
    if (btnPause) {
        btnPause.onclick = (e) => {
            e.stopPropagation();
            stopTargetAutoPlay();
        };
    }

    // --- UNLOCK GUARD EVENT HANDLERS ---
    const guardChk = document.getElementById('guard-toggle-chk');
    if (guardChk) {
        guardChk.onchange = () => {
            const status = guardChk.checked ? 'সক্রিয় (ON)' : 'নিষ্ক্রিয় (OFF)';
            console.log('Unlock Guard toggled:', status);
        };
    }

    const btnPickAudio = document.getElementById('btn-pick-custom-audio');
    const audioFileInput = document.getElementById('guard-audio-file-input');
    const customAudioLabel = document.getElementById('guard-custom-audio-label');

    if (btnPickAudio && audioFileInput) {
        btnPickAudio.onclick = (e) => {
            e.preventDefault();
            audioFileInput.click();
        };

        audioFileInput.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    unlockGuard.customAudioName = file.name;
                    unlockGuard.customAudioBase64 = evt.target.result;
                    if (customAudioLabel) {
                        customAudioLabel.innerText = f.name;
                    }
                    const customRadio = document.querySelector('input[name="guard-sound-choice"][value="custom"]');
                    if (customRadio) customRadio.checked = true;

                    alert(`অডিও সিলেক্ট করা হয়েছে: ${file.name}\nসেভ করার জন্য নিচে 'সংরক্ষণ করুন' বাটনে চাপ দিন।`);
                };
                reader.readAsDataURL(file);
            }
        };
    }

    const btnSaveGuard = document.getElementById('btn-save-guard');
    if (btnSaveGuard) {
        btnSaveGuard.onclick = () => {
            const chk = document.getElementById('guard-toggle-chk');
            const txt = document.getElementById('guard-caution-text');
            const selectedRadio = document.querySelector('input[name="guard-sound-choice"]:checked');

            unlockGuard.enabled = chk ? chk.checked : false;
            unlockGuard.text = txt ? txt.value.trim() : '';
            unlockGuard.audioType = selectedRadio ? selectedRadio.value : 'durood_sharif';

            if (unlockGuard.audioType === 'custom' && !unlockGuard.customAudioBase64) {
                alert('অনুগ্রহ করে একটি অডিও ফাইল নির্বাচন করুন!');
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
                } catch (e) {
                    console.error('Error syncing unlock guard to native:', e);
                }
            }

            const soundName = unlockGuard.audioType === 'custom' ? unlockGuard.customAudioName : 'দরূদ শরীফ';
            alert(`সংরক্ষিত হয়েছে!\nস্ট্যাটাস: ${unlockGuard.enabled ? 'চালু (ON)' : 'বন্ধ (OFF)'}\nসাউন্ড: ${soundName}`);
        };
    }

    const btnPenaltyAutoPlay = document.getElementById('btn-penalty-autoplay');
    if (btnPenaltyAutoPlay) {
        btnPenaltyAutoPlay.onclick = (e) => {
            e.stopPropagation();
            if (isPenaltyAutoPlaying) {
                stopPenaltyAutoPlay();
            } else {
                startPenaltyAutoPlay();
            }
        };
    }

    // --- AUTO VIBRATE EVENT HANDLERS ---
    const btnAddVibrateSlot = document.getElementById('btn-add-vibrate-slot');
    if (btnAddVibrateSlot) {
        btnAddVibrateSlot.onclick = async (e) => {
            e.stopPropagation();
            const newId = 'slot_' + Date.now();
            autoVibrateConfig.slots.push({
                id: newId,
                name: 'নতুন সময়সূচি',
                startTime: '13:00',
                endTime: '13:30',
                enabled: true
            });
            localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig) {
                try {
                    const res = await window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig({
                        configJson: JSON.stringify(autoVibrateConfig)
                    });
                    if (res) isAutoVibrateActiveNow = !!res.isCurrentlyVibrating;
                } catch(e) {}
            }
            switchTab('routine');
        };
    }

    document.querySelectorAll('.btn-delete-vibrate-slot').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx, 10);
            if (!isNaN(idx) && idx >= 0 && idx < autoVibrateConfig.slots.length) {
                if (autoVibrateConfig.slots.length <= 1) {
                    alert('কমপক্ষে একটি সময়সূচি থাকা প্রয়োজন।');
                    return;
                }
                autoVibrateConfig.slots.splice(idx, 1);
                localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig) {
                    try {
                        const res = await window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig({
                            configJson: JSON.stringify(autoVibrateConfig)
                        });
                        if (res) isAutoVibrateActiveNow = !!res.isCurrentlyVibrating;
                    } catch(e) {}
                }
                switchTab('routine');
            }
        };
    });

    const btnToggleMaster = document.getElementById('btn-toggle-auto-vibrate-master');
    if (btnToggleMaster) {
        btnToggleMaster.onclick = async () => {
            const willEnable = !autoVibrateConfig.enabled;

            if (willEnable) {
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin) {
                    try {
                        const status = await window.Capacitor.Plugins.UnlockPlugin.getAutoVibrateConfig();
                        if (status && status.isDndGranted === false) {
                            localStorage.setItem('PENDING_AUTO_VIBRATE_ENABLE', 'true');
                            alert('অটো ভাইব্রেট চালু করার জন্য ফোনের ডু-নট-ডিস্টার্ব (DND) অনুমতি প্রয়োজন। দয়া করে সেটিংস পেজে গিয়ে অ্যাপটির জন্য পারমিশন অন করুন।');
                            if (window.Capacitor.Plugins.UnlockPlugin.openDndSettings) {
                                await window.Capacitor.Plugins.UnlockPlugin.openDndSettings();
                            }
                            return;
                        }
                    } catch (err) {
                        console.error('Error checking DND permission:', err);
                    }
                }
                autoVibrateConfig.enabled = true;
            } else {
                autoVibrateConfig.enabled = false;
                localStorage.removeItem('PENDING_AUTO_VIBRATE_ENABLE');
            }

            localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig) {
                try {
                    const res = await window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig({
                        configJson: JSON.stringify(autoVibrateConfig)
                    });
                    if (res) isAutoVibrateActiveNow = !!res.isCurrentlyVibrating;
                } catch(e) {}
            }

            switchTab('routine');
        };
    }

    document.querySelectorAll('.vibrate-slot-toggle').forEach(el => {
        el.onclick = async (e) => {
            e.stopPropagation();
            const idx = parseInt(el.dataset.idx, 10);
            if (!isNaN(idx) && autoVibrateConfig.slots[idx]) {
                autoVibrateConfig.slots[idx].enabled = !autoVibrateConfig.slots[idx].enabled;
                localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig) {
                    try {
                        const res = await window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig({
                            configJson: JSON.stringify(autoVibrateConfig)
                        });
                        if (res) isAutoVibrateActiveNow = !!res.isCurrentlyVibrating;
                    } catch(e) {}
                }
                switchTab('routine');
            }
        };
    });

    const btnGrantDnd = document.getElementById('btn-grant-dnd');
    if (btnGrantDnd) {
        btnGrantDnd.onclick = () => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.openDndSettings) {
                window.Capacitor.Plugins.UnlockPlugin.openDndSettings();
            }
        };
    }

    const btnSaveAutoVibrate = document.getElementById('btn-save-auto-vibrate');
    if (btnSaveAutoVibrate) {
        btnSaveAutoVibrate.onclick = async () => {
            document.querySelectorAll('.vibrate-slot-name').forEach(inp => {
                const idx = parseInt(inp.dataset.idx, 10);
                if (autoVibrateConfig.slots[idx]) {
                    autoVibrateConfig.slots[idx].name = inp.value.trim() || 'সময়সূচি';
                }
            });

            document.querySelectorAll('.vibrate-slot-start').forEach(inp => {
                const idx = parseInt(inp.dataset.idx, 10);
                if (autoVibrateConfig.slots[idx]) {
                    const val = (inp.value && inp.value.includes(':')) ? inp.value.trim() : '13:00';
                    autoVibrateConfig.slots[idx].startTime = val;
                }
            });

            document.querySelectorAll('.vibrate-slot-end').forEach(inp => {
                const idx = parseInt(inp.dataset.idx, 10);
                if (autoVibrateConfig.slots[idx]) {
                    const val = (inp.value && inp.value.includes(':')) ? inp.value.trim() : '13:30';
                    autoVibrateConfig.slots[idx].endTime = val;
                }
            });

            localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig) {
                try {
                    const res = await window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig({
                        configJson: JSON.stringify(autoVibrateConfig)
                    });
                    if (res) {
                        isAutoVibrateActiveNow = !!res.isCurrentlyVibrating;
                    }
                } catch (e) {
                    console.error('Error saving Auto Vibrate config to native:', e);
                }
            }

            alert(`অটো ভাইব্রেট শিডিউল সংরক্ষিত হয়েছে!\nমোড: ${autoVibrateConfig.enabled ? 'সক্রিয় (ON)' : 'বন্ধ (OFF)'}\nমোট স্লট: ${autoVibrateConfig.slots.length}টি`);
            switchTab('routine');
        };
    }

    if (!window._vibrateResumeBound) {
        window._vibrateResumeBound = true;
        const checkDndPending = async () => {
            if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.UnlockPlugin) return;
            try {
                const res = await window.Capacitor.Plugins.UnlockPlugin.getAutoVibrateConfig();
                if (res) {
                    isDndGrantedInApp = res.isDndGranted !== false;
                    const wasPending = localStorage.getItem('PENDING_AUTO_VIBRATE_ENABLE') === 'true';
                    if (isDndGrantedInApp && wasPending) {
                        localStorage.removeItem('PENDING_AUTO_VIBRATE_ENABLE');
                        autoVibrateConfig.enabled = true;
                        localStorage.setItem('AUTO_VIBRATE_CONFIG', JSON.stringify(autoVibrateConfig));
                        try {
                            const saveRes = await window.Capacitor.Plugins.UnlockPlugin.saveAutoVibrateConfig({
                                configJson: JSON.stringify(autoVibrateConfig)
                            });
                            if (saveRes) isAutoVibrateActiveNow = !!saveRes.isCurrentlyVibrating;
                        } catch(e) {}
                        alert('ডু-নট-ডিস্টার্ব অনুমতি সম্পন্ন হয়েছে। অটো ভাইব্রেট মোড এখন সক্রিয় (ON)।');
                        if (typeof currentRoutineTab !== 'undefined' && currentRoutineTab === 'vibrate') {
                            switchTab('routine');
                        }
                    } else {
                        const dndNotice = document.getElementById('vibrate-dnd-notice');
                        if (dndNotice) {
                            dndNotice.style.display = (!isDndGrantedInApp && autoVibrateConfig.enabled) ? 'flex' : 'none';
                        }
                    }
                }
            } catch(e) {}
        };

        window.addEventListener('focus', checkDndPending);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkDndPending();
        });
    }
}

function incrementTargetCount() {
    if (dailyTarget.completedCount < dailyTarget.goal) {
        dailyTarget.completedCount++;
        localStorage.setItem('DAILY_TARGET_CONFIG', JSON.stringify(dailyTarget));
        const numEl = document.getElementById('tasbeeh-number-val');
        const barEl = document.getElementById('tasbeeh-bar-fill');
        if (numEl) numEl.innerText = dailyTarget.completedCount;
        if (barEl) {
            const circ = 2 * Math.PI * 80;
            const ratio = Math.min(1, dailyTarget.completedCount / dailyTarget.goal);
            barEl.style.strokeDashoffset = circ - (ratio * circ);
        }
        triggerHaptic('single');
        if (dailyTarget.completedCount >= dailyTarget.goal) {
            alert('আলহামদুলিল্লাহ! আপনার আজকের লক্ষ্য সম্পন্ন হয়েছে।');
            stopTargetAutoPlay();
        }
    }
}

function startTargetAutoPlay() {
    if (dailyTarget.completedCount >= dailyTarget.goal) return;
    isAutoPlaying = true;
    targetAudioPlayer.src = dailyTarget.audioData || '/durood.mp3';
    targetAudioPlayer.play().catch(() => {});
    targetAudioPlayer.onended = () => {
        incrementTargetCount();
        if (dailyTarget.completedCount < dailyTarget.goal && isAutoPlaying) {
            targetAudioPlayer.play().catch(() => {});
        } else {
            stopTargetAutoPlay();
        }
    };
    switchTab('routine');
}

function stopTargetAutoPlay() {
    isAutoPlaying = false;
    targetAudioPlayer.pause();
    switchTab('routine');
}

function startAlarmCheckerLoop() {
    // Disabled duplicate web interval checker to prevent ghost audio re-trigger on app launch.
    // Native AlarmManager handles exact alarm scheduling.
}

function triggerAlarm(timeStr, title, audioData) {
    document.getElementById('fs-alarm-time').innerText = timeStr;
    document.getElementById('fs-alarm-title').innerText = title;
    document.getElementById('fullscreen-alarm-screen').style.display = 'flex';

    if (audioData) {
        alarmAudioPlayer.src = audioData;
        alarmAudioPlayer.play().catch(() => {});
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(title);
        utter.lang = 'bn-BD';
        window.speechSynthesis.speak(utter);
    }
}
