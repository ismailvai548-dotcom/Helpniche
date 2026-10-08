/* ==========================================================================
   TAB: FOCUS TASKS (ফোকাস টাস্ক - Minimal Google Tasks Style with Recurring Schedule)
   ========================================================================== */

const STORAGE_KEY_FOCUS_TASKS = 'HELPNICHE_FOCUS_TASKS';
let showCompletedTasksList = false;

const BANGLA_DAYS_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const BANGLA_DAYS_FULL = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFocusTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_FOCUS_TASKS);
        let tasks = raw ? JSON.parse(raw) : [];
        let updated = false;
        const todayStr = getTodayDateString();

        tasks.forEach(t => {
            if ((t.repeatType === 'daily' || t.repeatType === 'custom') && t.completed && t.lastCompletedDate !== todayStr) {
                t.completed = false;
                updated = true;
            }
        });

        if (updated) {
            localStorage.setItem(STORAGE_KEY_FOCUS_TASKS, JSON.stringify(tasks));
        }
        return tasks;
    } catch (e) {
        return [];
    }
}

function saveFocusTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY_FOCUS_TASKS, JSON.stringify(tasks));
    } catch (e) {
        console.error("Failed to save focus tasks", e);
    }
}

function getFocusTasksSummaryText() {
    const tasks = getFocusTasks();
    const active = tasks.filter(t => !t.completed);
    if (active.length === 0) return 'সব কাজ সম্পন্ন';
    return `${toBanglaNumber(active.length)}টি কাজ বাকি আছে`;
}

function toBanglaNumber(num) {
    if (num === null || num === undefined) return '';
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, d => bengaliDigits[Number(d)]);
}

function formatTimeBengali(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return '';
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
    const h12 = h % 12 || 12;
    return `${toBanglaNumber(h12)}:${toBanglaNumber(m)} ${ampm}`;
}

function formatTaskDueDateTime(dueTimestamp) {
    if (!dueTimestamp) return '';
    const date = new Date(dueTimestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = (date.toDateString() === now.toDateString());
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = (date.toDateString() === tomorrow.toDateString());

    const hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'অপরাহ্ন' : 'পূর্বাহ্ন';
    const formattedHours = hours % 12 || 12;
    const timeStr = `${toBanglaNumber(formattedHours)}:${toBanglaNumber(mins)} ${ampm}`;

    if (isToday) {
        return `আজ, ${timeStr}`;
    } else if (isTomorrow) {
        return `আগামীকাল, ${timeStr}`;
    } else {
        const day = toBanglaNumber(date.getDate());
        const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
        const month = months[date.getMonth()];
        return `${day} ${month}, ${timeStr}`;
    }
}

function renderTaskScheduleBadge(task) {
    if (task.repeatType === 'daily') {
        const timeFormatted = task.dueTimeStr ? formatTimeBengali(task.dueTimeStr) : '';
        const badgeLabel = timeFormatted ? `প্রতিদিন • ${timeFormatted}` : 'প্রতিদিন';
        return `
            <div style="display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 2px 8px; border-radius: 8px; background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc;">
                <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: currentColor;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                <span style="font-size: 11.5px; font-weight: 700; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    ${badgeLabel}
                </span>
            </div>
        `;
    }

    if (task.repeatType === 'custom') {
        const daysText = (task.repeatDays || [])
            .slice()
            .sort((a, b) => a - b)
            .map(d => BANGLA_DAYS_SHORT[d])
            .join(', ');
        const timeFormatted = task.dueTimeStr ? formatTimeBengali(task.dueTimeStr) : '';
        const badgeLabel = timeFormatted ? `${daysText} • ${timeFormatted}` : (daysText || 'নির্দিষ্ট দিন');
        return `
            <div style="display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 2px 8px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8;">
                <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: currentColor;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                <span style="font-size: 11.5px; font-weight: 700; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    ${badgeLabel}
                </span>
            </div>
        `;
    }

    if (task.dueTimestamp) {
        const dueText = formatTaskDueDateTime(task.dueTimestamp);
        const isOverdue = task.dueTimestamp < Date.now();
        return `
            <div style="display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 2px 8px; border-radius: 8px; background: ${isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)'}; border: 1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'}; color: ${isOverdue ? '#ef4444' : '#38bdf8'};">
                <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: currentColor;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span style="font-size: 11.5px; font-weight: 700; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    ${dueText}
                </span>
            </div>
        `;
    }

    return '';
}

function calculateNextTriggerMs(task) {
    const now = new Date();
    const timeStr = task.dueTimeStr || '';
    let h = 9;
    let min = 0;
    const hasTime = Boolean(timeStr);
    if (hasTime) {
        const parts = timeStr.split(':');
        h = parseInt(parts[0], 10);
        min = parseInt(parts[1], 10);
    }

    if (task.repeatType === 'daily') {
        if (!hasTime) return null;
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min, 0, 0);
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        return target.getTime();
    }

    if (task.repeatType === 'custom') {
        const days = task.repeatDays || [];
        if (days.length === 0 || !hasTime) return null;
        for (let offset = 0; offset <= 7; offset++) {
            const check = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, min, 0, 0);
            if (days.includes(check.getDay())) {
                if (offset === 0 && check.getTime() <= now.getTime()) {
                    continue;
                }
                return check.getTime();
            }
        }
        return null;
    }

    return task.dueTimestamp || null;
}

function scheduleNotificationForTask(task) {
    const triggerMs = calculateNextTriggerMs(task);
    if (triggerMs && triggerMs > Date.now()) {
        if (window.Capacitor?.Plugins?.UnlockPlugin?.scheduleTaskNotification) {
            try {
                window.Capacitor.Plugins.UnlockPlugin.scheduleTaskNotification({
                    id: task.id % 1000000,
                    title: task.title,
                    details: task.details || 'আপনার ফোকাস টাস্কের সময় হয়েছে!',
                    triggerAtMs: triggerMs
                });
            } catch (err) {
                console.error("Failed to schedule task notification", err);
            }
        }
    }
}

function cancelNotificationForTask(task) {
    if (window.Capacitor?.Plugins?.UnlockPlugin?.cancelTaskNotification) {
        try {
            window.Capacitor.Plugins.UnlockPlugin.cancelTaskNotification({
                id: task.id % 1000000
            });
        } catch (err) {}
    }
}

function renderFocusTasksTab() {
    const tasks = getFocusTasks();
    const activeTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    let activeListHtml = '';
    if (activeTasks.length === 0) {
        activeListHtml = `
            <div style="text-align: center; padding: 48px 20px; color: #94a3b8;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(56, 189, 248, 0.1); border: 1.5px solid rgba(56, 189, 248, 0.25); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" style="width: 32px; height: 32px; fill: #38bdf8;">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">কোনো টাস্ক বাকি নেই</h3>
                <p style="font-size: 12.5px; color: #64748b; margin: 0; line-height: 1.5; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    নতুন কাজ যোগ করতে নিচের প্লাস (+) বাটনে ট্যাপ করুন।
                </p>
            </div>
        `;
    } else {
        activeListHtml = activeTasks.map(task => {
            const scheduleBadge = renderTaskScheduleBadge(task);
            return `
                <div class="focus-task-item" style="display: flex; align-items: flex-start; gap: 12px; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 14px 14px; margin-bottom: 10px; transition: all 0.2s;">
                    <!-- Circular Checkbox -->
                    <button class="btn-toggle-task" data-id="${task.id}" style="width: 22px; height: 22px; border-radius: 50%; border: 2px solid #64748b; background: transparent; cursor: pointer; flex-shrink: 0; margin-top: 2px; padding: 0; outline: none; transition: all 0.15s; display: flex; align-items: center; justify-content: center;"></button>
                    
                    <!-- Content -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.35; word-break: break-word; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            ${escapeHtml(task.title)}
                        </div>
                        ${task.details ? `
                            <div style="font-size: 12.5px; color: #94a3b8; margin-top: 4px; line-height: 1.4; word-break: break-word; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                ${escapeHtml(task.details)}
                            </div>
                        ` : ''}
                        ${scheduleBadge}
                    </div>

                    <!-- Delete Button -->
                    <button class="btn-delete-task" data-id="${task.id}" style="background: transparent; border: none; padding: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; outline: none;" title="মুছে ফেলুন">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
        }).join('');
    }

    let completedListHtml = '';
    if (completedTasks.length > 0) {
        completedListHtml = `
            <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #1e293b;">
                <button id="btn-toggle-completed-section" style="width: 100%; display: flex; align-items: center; justify-content: space-between; background: transparent; border: none; padding: 8px 0; color: #94a3b8; font-size: 13.5px; font-weight: 700; cursor: pointer; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                    <span>সম্পন্ন হয়েছে (${toBanglaNumber(completedTasks.length)})</span>
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor; transform: ${showCompletedTasksList ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                </button>

                <div id="completed-tasks-container" style="display: ${showCompletedTasksList ? 'block' : 'none'}; margin-top: 8px;">
                    ${completedTasks.map(task => {
                        const isRecurring = (task.repeatType === 'daily' || task.repeatType === 'custom');
                        return `
                            <div class="focus-task-item" style="display: flex; align-items: flex-start; gap: 12px; background: rgba(15, 23, 42, 0.5); border: 1px solid #1e293b; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px; opacity: 0.75;">
                                <!-- Completed Checked Circle -->
                                <button class="btn-toggle-task" data-id="${task.id}" style="width: 22px; height: 22px; border-radius: 50%; border: none; background: #00E676; cursor: pointer; flex-shrink: 0; margin-top: 2px; padding: 0; outline: none; display: flex; align-items: center; justify-content: center;">
                                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: #000000;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                                </button>
                                
                                <!-- Strikethrough Content -->
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 14.5px; font-weight: 600; color: #64748b; text-decoration: line-through; line-height: 1.35; word-break: break-word; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                        ${escapeHtml(task.title)}
                                    </div>
                                    ${isRecurring ? `
                                        <div style="font-size: 11px; color: #10b981; margin-top: 3px; font-weight: 700; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                            (আজকের জন্য সম্পন্ন)
                                        </div>
                                    ` : ''}
                                </div>

                                <!-- Delete Button -->
                                <button class="btn-delete-task" data-id="${task.id}" style="background: transparent; border: none; padding: 4px; color: #64748b; cursor: pointer; flex-shrink: 0; outline: none;" title="মুছে ফেলুন">
                                    <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    return `
        <div class="screen-wrapper" style="padding-bottom: 80px;">
            <!-- Top Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid #1e293b;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="btn-back-to-home-tasks" style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; cursor: pointer; outline: none;">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <div>
                        <h1 style="font-size: 18px; font-weight: 900; color: #ffffff; margin: 0; line-height: 1.2; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">ফোকাস টাস্ক</h1>
                        <span style="font-size: 11.5px; color: #94a3b8; font-weight: 600; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">দৈনন্দিন কাজের সহজ ও গোছানো তালিকা</span>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                        ${toBanglaNumber(activeTasks.length)}টি বাকি
                    </span>
                </div>
            </div>

            <!-- Active Task List -->
            <div id="active-tasks-container">
                ${activeListHtml}
            </div>

            <!-- Completed Section -->
            ${completedListHtml}

            <!-- Floating Action Button (+ New Task) -->
            <div style="position: fixed; bottom: 74px; right: 20px; z-index: 100;">
                <button id="btn-open-add-task-modal" style="width: 54px; height: 54px; border-radius: 50%; background: #00E676; border: none; box-shadow: 0 8px 24px rgba(0, 230, 118, 0.45); display: flex; align-items: center; justify-content: center; cursor: pointer; outline: none; transition: transform 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 26px; height: 26px; fill: #000000;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
            </div>

            <!-- New Task Modal (Clean Bottom Sheet) -->
            <div id="modal-add-focus-task" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); z-index: 100005; align-items: flex-end; justify-content: center;">
                <div style="background: #0f172a; border-top: 2px solid #38bdf8; border-radius: 24px 24px 0 0; padding: 22px 18px 36px 18px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-sizing: border-box; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6); animation: slideUpSheet 0.25s ease-out;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <span style="font-size: 16px; font-weight: 800; color: #ffffff; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">নতুন টাস্ক</span>
                        <button id="btn-close-task-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px; outline: none;">&times;</button>
                    </div>

                    <!-- Task Title Input -->
                    <input id="input-task-title" type="text" placeholder="কাজের নাম লিখুন..." style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1.5px solid #334155; border-radius: 12px; padding: 12px 14px; font-size: 15px; color: #ffffff; outline: none; margin-bottom: 12px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;" />

                    <!-- Details Input -->
                    <textarea id="input-task-details" rows="2" placeholder="বিস্তারিত নোট (ঐচ্ছিক)..." style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1.5px solid #334155; border-radius: 12px; padding: 10px 14px; font-size: 13.5px; color: #cbd5e1; outline: none; margin-bottom: 14px; resize: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;"></textarea>

                    <!-- Repeat Type Selector -->
                    <div style="margin-bottom: 14px;">
                        <label style="font-size: 11.5px; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 6px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">কাজের পুনরাবৃত্তি / সময়সূচি:</label>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" class="btn-repeat-option active" data-repeat="once" style="flex: 1; padding: 9px 4px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1.5px solid #38bdf8; background: rgba(56, 189, 248, 0.15); color: #38bdf8; outline: none; transition: all 0.2s; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                শুধু একবার
                            </button>
                            <button type="button" class="btn-repeat-option" data-repeat="daily" style="flex: 1; padding: 9px 4px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1.5px solid #334155; background: #1e293b; color: #94a3b8; outline: none; transition: all 0.2s; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                প্রতিদিন
                            </button>
                            <button type="button" class="btn-repeat-option" data-repeat="custom" style="flex: 1; padding: 9px 4px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1.5px solid #334155; background: #1e293b; color: #94a3b8; outline: none; transition: all 0.2s; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                                নির্দিষ্ট দিন
                            </button>
                        </div>
                    </div>

                    <!-- Specific Days Selector (Hidden by default, shown for custom) -->
                    <div id="wrapper-custom-days" style="display: none; margin-bottom: 14px; background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 10px;">
                        <label style="font-size: 11px; color: #cbd5e1; font-weight: 700; display: block; margin-bottom: 8px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">বার নির্বাচন করুন (একাধিক নির্বাচন করা যাবে):</label>
                        <div style="display: flex; gap: 5px; justify-content: space-between;">
                            <button type="button" class="btn-day-chip" data-day="0" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">রবি</button>
                            <button type="button" class="btn-day-chip" data-day="1" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">সোম</button>
                            <button type="button" class="btn-day-chip" data-day="2" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">মঙ্গল</button>
                            <button type="button" class="btn-day-chip" data-day="3" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">বুধ</button>
                            <button type="button" class="btn-day-chip" data-day="4" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">বৃহঃ</button>
                            <button type="button" class="btn-day-chip" data-day="5" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">শুক্র</button>
                            <button type="button" class="btn-day-chip" data-day="6" style="flex: 1; padding: 7px 0; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; outline: none; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">শনি</button>
                        </div>
                    </div>

                    <!-- Date & Time Row -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <div id="wrapper-task-date" style="flex: 1;">
                            <label style="font-size: 11px; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 4px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">তারিখ:</label>
                            <input id="input-task-date" type="date" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px; font-size: 13px; color: #ffffff; outline: none; color-scheme: dark; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;" />
                        </div>
                        <div style="flex: 1;">
                            <label id="label-task-time" style="font-size: 11px; color: #94a3b8; font-weight: 700; display: block; margin-bottom: 4px; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">সময় (ঐচ্ছিক):</label>
                            <input id="input-task-time" type="time" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px; font-size: 13px; color: #ffffff; outline: none; color-scheme: dark; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;" />
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 10px;">
                        <button id="btn-cancel-add-task" style="flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; color: #cbd5e1; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            বাতিল
                        </button>
                        <button id="btn-save-task" style="flex: 2; background: #00E676; border: none; border-radius: 12px; padding: 12px; color: #000000; font-size: 14.5px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 230, 118, 0.3); font-family: 'Kalpurush', 'SolaimanLipi', sans-serif;">
                            সংরক্ষণ করুন
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function bindFocusTasksEvents() {
    let currentRepeatType = 'once';
    let currentSelectedDays = [];

    // Back to Home
    const btnBack = document.getElementById('btn-back-to-home-tasks');
    if (btnBack) {
        btnBack.onclick = () => switchTab('home');
    }

    // Toggle completed list accordion
    const btnToggleCompleted = document.getElementById('btn-toggle-completed-section');
    if (btnToggleCompleted) {
        btnToggleCompleted.onclick = () => {
            showCompletedTasksList = !showCompletedTasksList;
            const container = document.getElementById('completed-tasks-container');
            if (container) {
                container.style.display = showCompletedTasksList ? 'block' : 'none';
            }
            const svg = btnToggleCompleted.querySelector('svg');
            if (svg) {
                svg.style.transform = showCompletedTasksList ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        };
    }

    // Task Checkbox Toggle Click
    document.querySelectorAll('.btn-toggle-task').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const taskId = Number(btn.dataset.id);
            toggleFocusTaskStatus(taskId);
        };
    });

    // Task Delete Click
    document.querySelectorAll('.btn-delete-task').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const taskId = Number(btn.dataset.id);
            deleteFocusTask(taskId);
        };
    });

    // Elements for Modal
    const btnOpenModal = document.getElementById('btn-open-add-task-modal');
    const modal = document.getElementById('modal-add-focus-task');
    const inputTitle = document.getElementById('input-task-title');
    const inputDetails = document.getElementById('input-task-details');
    const inputDate = document.getElementById('input-task-date');
    const inputTime = document.getElementById('input-task-time');
    const wrapperCustomDays = document.getElementById('wrapper-custom-days');
    const wrapperTaskDate = document.getElementById('wrapper-task-date');
    const labelTaskTime = document.getElementById('label-task-time');
    const repeatButtons = document.querySelectorAll('.btn-repeat-option');
    const dayChips = document.querySelectorAll('.btn-day-chip');

    const updateRepeatModeUI = (mode) => {
        currentRepeatType = mode;
        repeatButtons.forEach(btn => {
            if (btn.dataset.repeat === mode) {
                btn.style.background = 'rgba(56, 189, 248, 0.15)';
                btn.style.borderColor = '#38bdf8';
                btn.style.color = '#38bdf8';
            } else {
                btn.style.background = '#1e293b';
                btn.style.borderColor = '#334155';
                btn.style.color = '#94a3b8';
            }
        });

        if (mode === 'once') {
            if (wrapperCustomDays) wrapperCustomDays.style.display = 'none';
            if (wrapperTaskDate) wrapperTaskDate.style.display = 'block';
            if (labelTaskTime) labelTaskTime.textContent = 'সময় (ঐচ্ছিক):';
        } else if (mode === 'daily') {
            if (wrapperCustomDays) wrapperCustomDays.style.display = 'none';
            if (wrapperTaskDate) wrapperTaskDate.style.display = 'none';
            if (labelTaskTime) labelTaskTime.textContent = 'প্রতিদিনের সময় (ঐচ্ছিক):';
        } else if (mode === 'custom') {
            if (wrapperCustomDays) wrapperCustomDays.style.display = 'block';
            if (wrapperTaskDate) wrapperTaskDate.style.display = 'none';
            if (labelTaskTime) labelTaskTime.textContent = 'নির্ধারিত সময় (ঐচ্ছিক):';
        }
    };

    // Repeat option buttons click
    repeatButtons.forEach(btn => {
        btn.onclick = () => {
            updateRepeatModeUI(btn.dataset.repeat);
        };
    });

    // Day chip buttons click
    dayChips.forEach(chip => {
        chip.onclick = () => {
            const dayNum = parseInt(chip.dataset.day, 10);
            const idx = currentSelectedDays.indexOf(dayNum);
            if (idx > -1) {
                currentSelectedDays.splice(idx, 1);
                chip.style.background = '#0f172a';
                chip.style.borderColor = '#334155';
                chip.style.color = '#94a3b8';
                chip.style.fontWeight = '700';
            } else {
                currentSelectedDays.push(dayNum);
                chip.style.background = '#38bdf8';
                chip.style.borderColor = '#38bdf8';
                chip.style.color = '#0f172a';
                chip.style.fontWeight = '800';
            }
        };
    });

    // Open Modal
    if (btnOpenModal && modal) {
        btnOpenModal.onclick = () => {
            if (inputTitle) inputTitle.value = '';
            if (inputDetails) inputDetails.value = '';
            if (inputDate) {
                const today = new Date().toISOString().split('T')[0];
                inputDate.value = today;
            }
            if (inputTime) inputTime.value = '';

            // Reset repeat selection
            currentSelectedDays = [];
            dayChips.forEach(chip => {
                chip.style.background = '#0f172a';
                chip.style.borderColor = '#334155';
                chip.style.color = '#94a3b8';
                chip.style.fontWeight = '700';
            });
            updateRepeatModeUI('once');

            modal.style.display = 'flex';
            setTimeout(() => { if (inputTitle) inputTitle.focus(); }, 150);
        };
    }

    // Close Modal
    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };

    const btnCloseModal = document.getElementById('btn-close-task-modal');
    if (btnCloseModal) btnCloseModal.onclick = closeModal;

    const btnCancel = document.getElementById('btn-cancel-add-task');
    if (btnCancel) btnCancel.onclick = closeModal;

    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    // Save Task
    const btnSave = document.getElementById('btn-save-task');
    if (btnSave) {
        btnSave.onclick = () => {
            const title = (inputTitle?.value || '').trim();
            if (!title) {
                alert('দয়া করে কাজের একটি নাম লিখুন।');
                if (inputTitle) inputTitle.focus();
                return;
            }

            if (currentRepeatType === 'custom' && currentSelectedDays.length === 0) {
                alert('দয়া করে সপ্তাহের অন্তত একটি দিন নির্বাচন করুন।');
                return;
            }

            const details = (inputDetails?.value || '').trim();
            const dateStr = (currentRepeatType === 'once') ? (inputDate?.value || '') : '';
            const timeStr = inputTime?.value || '';

            let dueTimestamp = null;
            if (currentRepeatType === 'once' && dateStr) {
                const parts = dateStr.split('-');
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                let h = 23;
                let min = 59;
                if (timeStr) {
                    const tParts = timeStr.split(':');
                    h = parseInt(tParts[0], 10);
                    min = parseInt(tParts[1], 10);
                }
                const targetDate = new Date(y, m, d, h, min, 0, 0);
                dueTimestamp = targetDate.getTime();
            }

            const tasks = getFocusTasks();
            const newTask = {
                id: Date.now(),
                title: title,
                details: details,
                repeatType: currentRepeatType,
                repeatDays: currentRepeatType === 'custom' ? [...currentSelectedDays] : [],
                dueTimeStr: timeStr,
                dueTimestamp: dueTimestamp,
                completed: false,
                lastCompletedDate: null,
                createdAt: Date.now()
            };

            tasks.unshift(newTask);
            saveFocusTasks(tasks);

            // নোটিফিকেশন অ্যালার্ম শিডিউল করা
            scheduleNotificationForTask(newTask);

            closeModal();
            switchTab('focus-tasks');
        };
    }
}

function toggleFocusTaskStatus(taskId) {
    const tasks = getFocusTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isRecurring = (task.repeatType === 'daily' || task.repeatType === 'custom');

    if (!task.completed) {
        task.completed = true;
        task.lastCompletedDate = getTodayDateString();

        if (isRecurring) {
            cancelNotificationForTask(task);
            scheduleNotificationForTask(task);
        } else {
            cancelNotificationForTask(task);
        }
    } else {
        task.completed = false;
        task.lastCompletedDate = null;
        scheduleNotificationForTask(task);
    }

    saveFocusTasks(tasks);
    switchTab('focus-tasks');
}

function deleteFocusTask(taskId) {
    let tasks = getFocusTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        cancelNotificationForTask(task);
    }

    tasks = tasks.filter(t => t.id !== taskId);
    saveFocusTasks(tasks);
    switchTab('focus-tasks');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
