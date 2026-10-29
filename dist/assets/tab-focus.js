/* ==========================================================================
   TAB 2: DEEP FOCUS MODE & 3D HYPNOTIC INFINITE ZOOM ENGINE
   ========================================================================== */

let currentAudioTab = 'library'; // 'library' or 'device'
let previewAudioInstance = null;
let currentPreviewUrl = null;

// 3D Infinite Zoom Themes
const FOCUS_THEMES = [
    {
        id: 'cosmic',
        nameBn: 'কসমিক ওয়ার্মহোল',
        nameEn: 'Cosmic Galaxy Wormhole',
        color: '#818cf8',
        tag: 'মহাকাশ',
        subBn: 'অনন্ত নক্ষত্রপুঞ্জ ও গ্যালাক্সির ভেতর দিয়ে মহাজাগতিক যাত্রা'
    },
    {
        id: 'geometry',
        nameBn: 'পবিত্র জ্যামিতি ফ্র্যাক্টাল',
        nameEn: 'Sacred Geometry Fractal',
        color: '#fbbf24',
        tag: 'ফ্র্যাক্টাল',
        subBn: 'স্বর্ণালী জ্যামিতিক চক্র ও ম্যান্ডালার অন্তহীন প্রস্ফুটন'
    },
    {
        id: 'cyber',
        nameBn: 'সাইবার নিওন টানেল',
        nameEn: 'Cyberpunk Neon Hyperspace',
        color: '#38bdf8',
        tag: 'নিওন',
        subBn: 'ফিউচারিস্টিক নিওন থ্রিডি টানেল ও হাইপারস্পেস গ্রিড'
    },
    {
        id: 'ocean',
        nameBn: 'ডিপ ওশেনিক অ্যাবিস',
        nameEn: 'Deep Oceanic Abyss',
        color: '#2dd4bf',
        tag: 'সমুদ্র',
        subBn: 'সমুদ্রের অতল শান্ত নীল জলরাশি ও আলোক তরঙ্গের প্রবাহ'
    },
    {
        id: 'quantum',
        nameBn: 'কোয়ান্টাম লাইট পোর্টাল',
        nameEn: 'Quantum Light Portal',
        color: '#c084fc',
        tag: 'পোর্টাল',
        subBn: 'রঙের রূপবদল ও ঘূর্ণায়মান আলোর অন্তহীন কোয়ান্টাম বলয়'
    }
];

let selectedFocusTheme = localStorage.getItem('FOCUS_THEME_CHOICE') || 'auto';
let activeFocusThemeIndex = 0;
let hypnoticAnimId = null;
let zoomAnimTime = 0;

function getActiveThemeObj() {
    return FOCUS_THEMES[activeFocusThemeIndex] || FOCUS_THEMES[0];
}

function renderFocusTab() {
    return `
        <div class="screen-wrapper">
            <div class="header-row" style="display:flex; align-items:center; gap:12px;">
                ${!isFocusSessionActive ? `
                    <button id="btn-back-to-home-focus" style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; cursor: pointer; outline: none;">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                ` : ''}
                <div>
                    <h1 class="app-title" style="margin:0; font-family:'Kalpurush', sans-serif;">${currentLang === 'bn' ? 'ডিপ ফোকাস' : 'Deep Focus'}</h1>
                    <p class="app-subtitle" style="margin:0; font-family:'Kalpurush', sans-serif;">${currentLang === 'bn' ? '৩ডি ইনফিনিট জুম ও অডিও সেশন' : '3D Infinite Zoom & Focus Session'}</p>
                </div>
            </div>
            ${isFocusSessionActive ? renderActiveHypnoticFocus() : renderFocusDashboard()}
        </div>
    `;
}

function renderActiveHypnoticFocus() {
    const trackTitle = selectedAudioName || 'Focus Background Sound';
    const isMuted = audioEngine && audioEngine.isMuted;
    const curTheme = getActiveThemeObj();

    return `
        <div class="hypnotic-focus-card">
            <!-- Top Theme Switcher Bar -->
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:12px; padding:0 2px;">
                <button id="btn-theme-prev" style="background:rgba(255,255,255,0.08); border:1px solid #334155; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#cbd5e1; cursor:pointer; outline:none;" title="পূর্ববর্তী থিম">
                    <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
                
                <div id="btn-theme-cycle" style="display:flex; flex-direction:column; align-items:center; cursor:pointer; flex:1; padding:0 8px;" title="ট্যাপ করে থিম পরিবর্তন করুন">
                    <div style="font-size:12.5px; font-weight:800; color:${curTheme.color}; display:flex; align-items:center; gap:6px;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${curTheme.color}; box-shadow:0 0 8px ${curTheme.color};"></span>
                        <span id="active-theme-name-label">${curTheme.nameBn}</span>
                    </div>
                    <span id="active-theme-sub-label" style="font-size:9.5px; color:#94a3b8; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px;">
                        ${curTheme.subBn}
                    </span>
                </div>

                <button id="btn-theme-next" style="background:rgba(255,255,255,0.08); border:1px solid #334155; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#cbd5e1; cursor:pointer; outline:none;" title="পরবর্তী থিম">
                    <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
            </div>

            <!-- 3D Infinite Zoom Canvas -->
            <div class="hypnotic-canvas-wrapper">
                <canvas id="hypnotic-spiral-canvas" width="300" height="290"></canvas>
            </div>

            <div class="hypnotic-subtext">অনন্ত ৩ডি ইনফিনিট জুমের কেন্দ্রে দৃষ্টি নিবদ্ধ রাখুন</div>
            <div class="hypnotic-timer-digits" id="hypnotic-timer-digits">00:00</div>

            <!-- Audio Title & Interactive Mute/Unmute Toggle Button -->
            <div style="display:flex; flex-direction:column; align-items:center; gap:10px; margin-top:14px;">
                <div style="font-size: 11px; color: #38bdf8; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <span>${escapeHtml(trackTitle)}</span>
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                    <button id="btn-focus-mute-toggle" style="background:rgba(255,255,255,0.06); border:1.5px solid ${isMuted ? '#ef4444' : '#10b981'}; color:${isMuted ? '#f87171' : '#34d399'}; padding:7px 16px; border-radius:20px; font-size:12px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s; outline:none;">
                        ${isMuted ? `
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor;"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                            <span>Muted (নিঃশব্দ)</span>
                        ` : `
                            <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor;"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            <span>Sound On</span>
                        `}
                    </button>

                    <button id="btn-stop-focus-early" style="background:rgba(239, 68, 68, 0.15); border:1.5px solid rgba(239, 68, 68, 0.4); color:#f87171; padding:7px 14px; border-radius:20px; font-size:12px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all 0.2s; outline:none;">
                        <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:currentColor;"><path d="M6 6h12v12H6z"/></svg>
                        <span>সেশন বন্ধ করুন</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderFocusDashboard() {
    const isDevice = selectedAudioType === 'device';
    const displayAudioName = selectedAudioName || 'Durood Sharif (Preset)';

    return `
        <!-- Main Minimal Dashboard Card -->
        <div class="dash-card" style="padding: 20px 16px; margin-bottom:16px;">
            <!-- Currently Selected Audio Banner -->
            <div style="background:#0f172a; border:1px solid #1e293b; border-radius:10px; padding:12px 14px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:20px; height:20px; color:#38bdf8; flex-shrink:0;"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <div style="overflow:hidden;">
                        <div style="font-size:10px; color:#94a3b8; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">
                            ${isDevice ? 'Device Audio Source' : 'Library Audio Source'}
                        </div>
                        <div style="font-size:13px; font-weight:bold; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" id="focus-selected-audio-label">
                            ${escapeHtml(displayAudioName)}
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:4px; font-size:11px; background:#16a34a22; border:1px solid #16a34a; color:#4ade80; padding:4px 8px; border-radius:12px; font-weight:bold; flex-shrink:0;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:12px; height:12px;"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    <span>Selected</span>
                </div>
            </div>

            <!-- Primary 2-Option Cards (Library Audio vs Device Audio) -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:16px;">
                <button id="btn-tab-audio-library" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:14px 10px; border-radius:10px; cursor:pointer; transition:all 0.2s; border:1px solid ${currentAudioTab === 'library' ? '#38bdf8' : '#1e293b'}; background:${currentAudioTab === 'library' ? '#1e293b' : '#0f172a'}; color:${currentAudioTab === 'library' ? '#38bdf8' : '#94a3b8'};">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:24px; height:24px; margin-bottom:6px;"><path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                    <span style="font-size:13px; font-weight:bold;">Library Audio</span>
                    <span style="font-size:10px; opacity:0.7; margin-top:2px;">Cloud & Presets</span>
                </button>

                <button id="btn-tab-audio-device" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:14px 10px; border-radius:10px; cursor:pointer; transition:all 0.2s; border:1px solid ${currentAudioTab === 'device' ? '#38bdf8' : '#1e293b'}; background:${currentAudioTab === 'device' ? '#1e293b' : '#0f172a'}; color:${currentAudioTab === 'device' ? '#38bdf8' : '#94a3b8'};">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:24px; height:24px; margin-bottom:6px;"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                    <span style="font-size:13px; font-weight:bold;">Device Audio</span>
                    <span style="font-size:10px; opacity:0.7; margin-top:2px;">Local Storage</span>
                </button>
            </div>

            <!-- Tab Dynamic Content -->
            <div id="audio-selection-content-area" style="margin-bottom:20px;">
                ${currentAudioTab === 'library' ? renderLibraryTabSync() : renderDeviceTabContent()}
            </div>

            <!-- 3D Infinite Zoom Theme Selector Section -->
            <div style="border-top:1px solid #1e293b; padding-top:16px; margin-bottom:18px;">
                <div style="font-size:13px; font-weight:800; color:#ffffff; margin-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; color:#c084fc;"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    <span>৩ডি ইনফিনিট জুম ভিজ্যুয়াল থিম</span>
                </div>
                <p style="font-size:11px; color:#94a3b8; text-align:center; margin:0 0 10px 0;">সেশন চলাকালীন যে থিমটি প্রদর্শিত হবে তা বেছে নিন</p>
                <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">
                    <button class="focus-theme-chip ${selectedFocusTheme === 'auto' ? 'active' : ''}" data-theme="auto">
                        স্বয়ংক্রিয় (প্রতিবার নতুন)
                    </button>
                    ${FOCUS_THEMES.map(th => `
                        <button class="focus-theme-chip ${selectedFocusTheme === th.id ? 'active' : ''}" data-theme="${th.id}">
                            ${th.nameBn}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Focus Session Timer Selection -->
            <div style="border-top:1px solid #1e293b; padding-top:16px;">
                <div style="font-size:14px; font-weight:bold; color:#ffffff; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; color:#38bdf8;"><path fill="currentColor" d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                    <span>Set Focus Duration</span>
                </div>

                <div class="focus-preset-grid">
                    <button class="focus-preset-btn" data-mins="1">1 Min</button>
                    <button class="focus-preset-btn" data-mins="5">5 Mins</button>
                    <button class="focus-preset-btn" data-mins="25">25 Mins</button>
                    <button class="focus-preset-btn" data-mins="60">60 Mins</button>
                </div>

                <div style="display:flex; margin-top:10px; gap:8px;">
                    <input type="number" id="custom-mins-input" class="input-dark" placeholder="Custom Minutes" min="1" max="300" style="margin-bottom:0; text-align:center; flex:1;">
                    <button class="btn-primary-focus" id="btn-start-custom-mins" style="width:auto; padding:10px 20px; margin-bottom:0; background:#16a34a; color:#fff; font-weight:bold; display:flex; align-items:center; gap:6px;">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                        <span>Start</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderLibraryTabSync() {
    let html = '<div id="library-async-container" style="display:flex; flex-direction:column; gap:8px;">';

    for (let cat of SUPABASE_AUDIO_CATEGORIES) {
        html += `<div style="font-size:11px; font-weight:bold; color:#38bdf8; margin-top:8px; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(cat.category)}</div>`;
        for (let track of cat.tracks) {
            const isSelected = selectedAudioType === 'library' && selectedAudioUrl === track.url;
            const isPreviewing = currentPreviewUrl === track.url;

            html += `
                <div class="audio-track-item" style="background:#0f172a; border:1px solid ${isSelected ? '#38bdf8' : '#1e293b'}; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s;">
                    <div style="display:flex; align-items:center; gap:10px; overflow:hidden; flex:1;">
                        <button class="btn-preview-track" data-url="${escapeHtml(track.url)}" style="background:${isPreviewing ? '#38bdf8' : '#1e293b'}; border:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:${isPreviewing ? '#0f172a' : '#cbd5e1'}; cursor:pointer; flex-shrink:0;">
                            ${isPreviewing ? `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            `}
                        </button>
                        <div style="overflow:hidden;">
                            <div style="font-size:12px; font-weight:bold; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(track.name)}</div>
                            <div style="font-size:10px; color:#94a3b8;">${escapeHtml(track.duration || 'Preset')}</div>
                        </div>
                    </div>
                    <button class="btn-select-library-track" data-url="${escapeHtml(track.url)}" data-name="${escapeHtml(track.name)}" style="background:${isSelected ? '#16a34a' : 'transparent'}; border:1px solid ${isSelected ? '#16a34a' : '#334155'}; color:${isSelected ? '#ffffff' : '#cbd5e1'}; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:6px; cursor:pointer; flex-shrink:0;">
                        ${isSelected ? 'Selected' : 'Use'}
                    </button>
                </div>
            `;
        }
    }

    html += '</div>';
    return html;
}

function renderLibraryTabPlaceholder() {
    return '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">Syncing audio tracks...</div>';
}

async function renderLibraryTabContent() {
    if (typeof fetchDynamicSupabaseAudios === 'function') {
        const liveCategories = await fetchDynamicSupabaseAudios();
        if (liveCategories && liveCategories.length > 0) {
            SUPABASE_AUDIO_CATEGORIES = liveCategories;
        }
    }

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';

    for (let cat of SUPABASE_AUDIO_CATEGORIES) {
        html += `<div style="font-size:11px; font-weight:bold; color:#38bdf8; margin-top:8px; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(cat.category)}</div>`;
        for (let track of cat.tracks) {
            const isSelected = selectedAudioType === 'library' && selectedAudioUrl === track.url;
            const isPreviewing = currentPreviewUrl === track.url;

            html += `
                <div class="audio-track-item" style="background:#0f172a; border:1px solid ${isSelected ? '#38bdf8' : '#1e293b'}; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s;">
                    <div style="display:flex; align-items:center; gap:10px; overflow:hidden; flex:1;">
                        <button class="btn-preview-track" data-url="${escapeHtml(track.url)}" style="background:${isPreviewing ? '#38bdf8' : '#1e293b'}; border:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:${isPreviewing ? '#0f172a' : '#cbd5e1'}; cursor:pointer; flex-shrink:0;">
                            ${isPreviewing ? `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            `}
                        </button>
                        <div style="overflow:hidden;">
                            <div style="font-size:12px; font-weight:bold; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(track.name)}</div>
                            <div style="font-size:10px; color:#94a3b8;">${escapeHtml(track.duration || 'Preset')}</div>
                        </div>
                    </div>
                    <button class="btn-select-library-track" data-url="${escapeHtml(track.url)}" data-name="${escapeHtml(track.name)}" style="background:${isSelected ? '#16a34a' : 'transparent'}; border:1px solid ${isSelected ? '#16a34a' : '#334155'}; color:${isSelected ? '#ffffff' : '#cbd5e1'}; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:6px; cursor:pointer; flex-shrink:0;">
                        ${isSelected ? 'Selected' : 'Use'}
                    </button>
                </div>
            `;
        }
    }

    html += '</div>';
    return html;
}

function renderDeviceTabContent() {
    const isDevice = selectedAudioType === 'device';

    return `
        <div style="background:#0f172a; border:1px dashed #334155; border-radius:10px; padding:20px; text-align:center;">
            <svg class="svg-icon" viewBox="0 0 24 24" style="width:36px; height:36px; color:#38bdf8; margin-bottom:10px;"><path fill="currentColor" d="M12 3v9.28a4.39 4.39 0 0 0-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>
            <div style="font-size:14px; font-weight:bold; color:#ffffff; margin-bottom:6px;">Select Audio from Device</div>
            <div style="font-size:11px; color:#94a3b8; margin-bottom:16px;">Pick any offline MP3, M4A, or WAV file from your phone storage</div>

            <button id="btn-pick-device-audio" class="btn-primary-focus" style="margin-bottom:0; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:10px 20px; width:auto;">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px;"><path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                <span>Browse Phone Storage</span>
            </button>

            ${isDevice ? `
                <div style="margin-top:16px; font-size:11px; color:#4ade80; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    <span>Currently Active: ${escapeHtml(selectedAudioName)}</span>
                </div>
            ` : ''}
        </div>
    `;
}

async function refreshLibraryTabUI() {
    const container = document.getElementById('library-async-container');
    if (!container) return;

    if (typeof fetchDynamicSupabaseAudios === 'function') {
        const liveCategories = await fetchDynamicSupabaseAudios();
        if (liveCategories && liveCategories.length > 0) {
            SUPABASE_AUDIO_CATEGORIES = liveCategories;
            const parent = document.getElementById('audio-selection-content-area');
            if (parent && currentAudioTab === 'library') {
                parent.innerHTML = renderLibraryTabSync();
                bindLibraryEvents();
            }
        }
    }
}

function bindLibraryEvents() {
    document.querySelectorAll('.btn-preview-track').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;

            if (currentPreviewUrl === url && previewAudioInstance) {
                previewAudioInstance.pause();
                previewAudioInstance = null;
                currentPreviewUrl = null;
                switchTab('focus');
                return;
            }

            if (previewAudioInstance) {
                previewAudioInstance.pause();
                previewAudioInstance = null;
            }

            currentPreviewUrl = url;
            previewAudioInstance = new Audio(url);
            previewAudioInstance.onended = () => {
                currentPreviewUrl = null;
                previewAudioInstance = null;
                switchTab('focus');
            };
            previewAudioInstance.play().catch(err => {
                console.error('Preview error:', err);
                currentPreviewUrl = null;
                previewAudioInstance = null;
                switchTab('focus');
            });

            switchTab('focus');
        };
    });

    document.querySelectorAll('.btn-select-library-track').forEach(btn => {
        btn.onclick = () => {
            const url = btn.dataset.url;
            const name = btn.dataset.name;

            if (previewAudioInstance) {
                previewAudioInstance.pause();
                previewAudioInstance = null;
                currentPreviewUrl = null;
            }

            selectedAudioType = 'library';
            selectedAudioUrl = url;
            selectedAudioName = name;

            localStorage.setItem('SELECTED_FOCUS_AUDIO_TYPE', 'library');
            localStorage.setItem('SELECTED_SUPABASE_AUDIO_URL', url);
            localStorage.setItem('SELECTED_FOCUS_AUDIO_NAME', name);

            switchTab('focus');
        };
    });
}

function bindFocusTabEvents() {
    // Back to Home Button
    const btnBackFocus = document.getElementById('btn-back-to-home-focus');
    if (btnBackFocus) {
        btnBackFocus.onclick = () => switchTab('home');
    }

    // Active Focus Session: Stop Early Button
    const btnStopEarly = document.getElementById('btn-stop-early');
    const btnStopFocusEarly = document.getElementById('btn-stop-focus-early');
    const stopEarlyHandler = () => {
        if (confirm('আপনি কি ফোকাস সেশনটি এখনই সমাপ্ত করতে চান?')) {
            if (focusTimerInterval) clearInterval(focusTimerInterval);
            if (spiralAnimInterval) clearInterval(spiralAnimInterval);
            if (hypnoticAnimId) cancelAnimationFrame(hypnoticAnimId);
            isFocusSessionActive = false;
            creditElapsedFocusMinutes();
            localStorage.removeItem('FOCUS_SESSION_END_TIME');
            clearFocusSessionCreditState();
            setNativeFocusLock(false);
            if (audioEngine) audioEngine.stop(true);
            switchTab('focus');
        }
    };
    if (btnStopEarly) btnStopEarly.onclick = stopEarlyHandler;
    if (btnStopFocusEarly) btnStopFocusEarly.onclick = stopEarlyHandler;

    // Interactive Mute/Unmute Button Handler
    const btnMuteToggle = document.getElementById('btn-focus-mute-toggle');
    if (btnMuteToggle) {
        btnMuteToggle.onclick = () => {
            if (audioEngine) {
                audioEngine.toggleMute();
            }
            switchTab('focus');
        };
    }

    // Active Focus Session: Theme Switching Buttons (<, >, tap title)
    const btnThemePrev = document.getElementById('btn-theme-prev');
    const btnThemeNext = document.getElementById('btn-theme-next');
    const btnThemeCycle = document.getElementById('btn-theme-cycle');

    const changeActiveTheme = (delta) => {
        activeFocusThemeIndex = (activeFocusThemeIndex + delta + FOCUS_THEMES.length) % FOCUS_THEMES.length;
        const cur = getActiveThemeObj();
        const lbl = document.getElementById('active-theme-name-label');
        const subLbl = document.getElementById('active-theme-sub-label');
        if (lbl) {
            lbl.innerText = cur.nameBn;
            lbl.parentElement.style.color = cur.color;
            const dot = lbl.previousElementSibling;
            if (dot) {
                dot.style.background = cur.color;
                dot.style.boxShadow = `0 0 8px ${cur.color}`;
            }
        }
        if (subLbl) subLbl.innerText = cur.subBn;
    };

    if (btnThemePrev) btnThemePrev.onclick = () => changeActiveTheme(-1);
    if (btnThemeNext) btnThemeNext.onclick = () => changeActiveTheme(1);
    if (btnThemeCycle) btnThemeCycle.onclick = () => changeActiveTheme(1);

    // Dashboard Theme Chip Selector Handlers
    document.querySelectorAll('.focus-theme-chip').forEach(chip => {
        chip.onclick = () => {
            const themeChoice = chip.dataset.theme;
            selectedFocusTheme = themeChoice;
            localStorage.setItem('FOCUS_THEME_CHOICE', themeChoice);
            document.querySelectorAll('.focus-theme-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        };
    });

    // Primary Tab Option Cards
    const btnTabLib = document.getElementById('btn-tab-audio-library');
    const btnTabDev = document.getElementById('btn-tab-audio-device');

    if (btnTabLib) {
        btnTabLib.onclick = () => {
            currentAudioTab = 'library';
            switchTab('focus');
        };
    }

    if (btnTabDev) {
        btnTabDev.onclick = () => {
            currentAudioTab = 'device';
            switchTab('focus');
        };
    }

    if (currentAudioTab === 'library') {
        bindLibraryEvents();
        refreshLibraryTabUI();
    }

    // Device Audio Picker Handler
    const btnPickDevice = document.getElementById('btn-pick-device-audio');
    if (btnPickDevice) {
        btnPickDevice.onclick = async () => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FocusAudioPlugin) {
                try {
                    btnPickDevice.disabled = true;

                    const res = await window.Capacitor.Plugins.FocusAudioPlugin.selectDeviceAudio();
                    if (res && res.success && res.uri) {
                        selectedAudioType = 'device';
                        selectedAudioUrl = res.uri;
                        selectedAudioName = res.fileName || 'Custom Local Audio';

                        localStorage.setItem('SELECTED_FOCUS_AUDIO_TYPE', 'device');
                        localStorage.setItem('SELECTED_SUPABASE_AUDIO_URL', res.uri);
                        localStorage.setItem('SELECTED_FOCUS_AUDIO_NAME', selectedAudioName);

                        switchTab('focus');
                    }
                } catch (err) {
                    console.error('Device audio pick error:', err);
                } finally {
                    if (btnPickDevice) {
                        btnPickDevice.disabled = false;
                    }
                }
            } else {
                alert('Device picker is available on native Android.');
            }
        };
    }

    // Preset Time Selector Handlers
    document.querySelectorAll('.focus-preset-btn').forEach(btn => {
        btn.onclick = () => {
            const mins = parseInt(btn.dataset.mins, 10);
            startFocusSession(mins);
        };
    });

    const btnCustomStart = document.getElementById('btn-start-custom-mins');
    if (btnCustomStart) {
        btnCustomStart.onclick = () => {
            const input = document.getElementById('custom-mins-input');
            const mins = parseInt(input ? input.value : 0, 10);
            if (isNaN(mins) || mins < 1) {
                alert('Please enter at least 1 minute');
                return;
            }
            startFocusSession(mins);
        };
    }

    if (isFocusSessionActive) {
        startHypnoticInfiniteZoom();
        startFocusTimerLoop();
    }
}

function startFocusSession(mins) {
    if (previewAudioInstance) {
        previewAudioInstance.pause();
        previewAudioInstance = null;
        currentPreviewUrl = null;
    }

    // Resolve which theme to use for this session
    if (selectedFocusTheme === 'auto') {
        const lastIdx = parseInt(localStorage.getItem('FOCUS_LAST_AUTO_THEME') || '-1', 10);
        activeFocusThemeIndex = (lastIdx + 1) % FOCUS_THEMES.length;
        localStorage.setItem('FOCUS_LAST_AUTO_THEME', activeFocusThemeIndex.toString());
    } else {
        const found = FOCUS_THEMES.findIndex(t => t.id === selectedFocusTheme);
        activeFocusThemeIndex = found >= 0 ? found : 0;
    }

    focusSessionEndTime = Date.now() + (mins * 60 * 1000);
    localStorage.setItem('FOCUS_SESSION_END_TIME', focusSessionEndTime.toString());
    focusSessionStartTime = Date.now();
    localStorage.setItem('FOCUS_SESSION_START_TIME', focusSessionStartTime.toString());
    localStorage.setItem('FOCUS_SESSION_PLANNED_MINS', mins.toString());
    localStorage.setItem('FOCUS_SESSION_CREDITED_MINS', '0');
    isFocusSessionActive = true;
    setNativeFocusLock(true);

    switchTab('focus');
}

function startFocusTimerLoop() {
    audioEngine.start();
    if (focusTimerInterval) clearInterval(focusTimerInterval);

    focusTimerInterval = setInterval(() => {
        const now = Date.now();
        if (focusSessionEndTime > now) {
            creditElapsedFocusMinutes();
            const diffSecs = Math.floor((focusSessionEndTime - now) / 1000);
            const m = Math.floor(diffSecs / 60);
            const s = diffSecs % 60;
            const timerEl = document.getElementById('hypnotic-timer-digits');
            if (timerEl) {
                timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        } else {
            clearInterval(focusTimerInterval);
            if (spiralAnimInterval) clearInterval(spiralAnimInterval);
            if (hypnoticAnimId) cancelAnimationFrame(hypnoticAnimId);
            isFocusSessionActive = false;
            creditElapsedFocusMinutes();
            localStorage.removeItem('FOCUS_SESSION_END_TIME');
            clearFocusSessionCreditState();
            setNativeFocusLock(false);
            audioEngine.stop(true);
            switchTab('focus');
        }
    }, 1000);
}

function setNativeFocusLock(locked) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.setFocusLock) {
        window.Capacitor.Plugins.UnlockPlugin.setFocusLock({ locked: locked });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ==========================================================================
   3D HYPNOTIC INFINITE ZOOM ENGINE
   High-performance 60 FPS Procedural Canvas Architecture
   ========================================================================== */

// Preallocated starfield and particle memory pools (Zero Garbage Collection)
const COSMIC_STARS = [];
for (let i = 0; i < 160; i++) {
    COSMIC_STARS.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: Math.random() * 600 + 1,
        pz: 600,
        size: Math.random() * 2 + 1,
        color: i % 5 === 0 ? '#818cf8' : (i % 7 === 0 ? '#c084fc' : '#ffffff')
    });
}

const OCEAN_SPORES = [];
for (let i = 0; i < 50; i++) {
    OCEAN_SPORES.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: Math.random() * 500 + 10,
        size: Math.random() * 3 + 1.2,
        driftSpeed: Math.random() * 0.4 + 0.2,
        phase: Math.random() * Math.PI * 2
    });
}

function startHypnoticInfiniteZoom() {
    const canvas = document.getElementById('hypnotic-spiral-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    if (spiralAnimInterval) clearInterval(spiralAnimInterval);
    if (hypnoticAnimId) cancelAnimationFrame(hypnoticAnimId);

    zoomAnimTime = 0;

    function renderFrame() {
        if (!document.getElementById('hypnotic-spiral-canvas')) {
            if (hypnoticAnimId) cancelAnimationFrame(hypnoticAnimId);
            return;
        }

        zoomAnimTime += 0.016;
        const currentTheme = getActiveThemeObj();

        switch (currentTheme.id) {
            case 'cosmic':
                drawCosmicWormhole(ctx, width, height, cx, cy, zoomAnimTime);
                break;
            case 'geometry':
                drawSacredGeometry(ctx, width, height, cx, cy, zoomAnimTime);
                break;
            case 'cyber':
                drawCyberTunnel(ctx, width, height, cx, cy, zoomAnimTime);
                break;
            case 'ocean':
                drawOceanAbyss(ctx, width, height, cx, cy, zoomAnimTime);
                break;
            case 'quantum':
                drawQuantumPortal(ctx, width, height, cx, cy, zoomAnimTime);
                break;
            default:
                drawCosmicWormhole(ctx, width, height, cx, cy, zoomAnimTime);
                break;
        }

        hypnoticAnimId = requestAnimationFrame(renderFrame);
    }

    hypnoticAnimId = requestAnimationFrame(renderFrame);
}

// --------------------------------------------------------------------------
// THEME 1: COSMIC GALAXY WORMHOLE (মহাজাগতিক ওয়ার্মহোল)
// --------------------------------------------------------------------------
function drawCosmicWormhole(ctx, width, height, cx, cy, t) {
    // Deep Space Background
    ctx.fillStyle = '#030511';
    ctx.fillRect(0, 0, width, height);

    // Dynamic Starfield with 3D Z-Depth
    const starSpeed = 3.6;
    for (let s of COSMIC_STARS) {
        s.pz = s.z;
        s.z -= starSpeed;
        if (s.z <= 2) {
            s.z = 600;
            s.pz = 600;
            s.x = (Math.random() - 0.5) * 600;
            s.y = (Math.random() - 0.5) * 600;
        }

        const k = 220 / s.z;
        const px = cx + s.x * k;
        const py = cy + s.y * k;

        const pk = 220 / s.pz;
        const prevPx = cx + s.x * pk;
        const prevPy = cy + s.y * pk;

        const alpha = Math.min(1, Math.max(0, (1 - s.z / 600) * 1.3));
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(0.8, (1 - s.z / 600) * s.size);

        ctx.beginPath();
        ctx.moveTo(prevPx, prevPy);
        ctx.lineTo(px, py);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Concentric Logarithmic Swirling Wormhole Rings
    const numRings = 9;
    const ringSpeed = 0.55;
    for (let i = 0; i < numRings; i++) {
        const phase = ((t * ringSpeed + i) % numRings);
        const radius = 6 * Math.exp(phase * 0.44);
        if (radius > Math.max(width, height) * 0.95) continue;

        const alpha = Math.sin((phase / numRings) * Math.PI) * 0.85;
        const rot = t * 0.4 + i * 0.25;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.88, 0, 0, Math.PI * 2);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = i % 2 === 0 ? `rgba(129, 140, 248, ${alpha})` : `rgba(192, 132, 252, ${alpha})`;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.restore();
    }

    // Glowing Central Accretion Horizon
    const corePulse = 18 + Math.sin(t * 3.5) * 4;
    const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, corePulse * 2.2);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, '#818cf8');
    coreGrad.addColorStop(0.7, '#4338ca');
    coreGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, corePulse * 2.2, 0, Math.PI * 2);
    ctx.fill();
}

// --------------------------------------------------------------------------
// THEME 2: SACRED GEOMETRY FRACTAL ZOOM (পবিত্র জ্যামিতি ফ্র্যাক্টাল)
// --------------------------------------------------------------------------
function drawSacredGeometry(ctx, width, height, cx, cy, t) {
    // Rich Obsidian Black & Emerald Backdrop
    ctx.fillStyle = '#020b08';
    ctx.fillRect(0, 0, width, height);

    // Continuous Logarithmic Scaling Zoom
    const period = 1.0;
    const progress = (t * 0.28) % period;
    const numLayers = 7;
    const scaleFactor = 2.15;

    for (let k = 0; k < numLayers; k++) {
        const layerPower = k + progress - 2.5;
        const scale = Math.pow(scaleFactor, layerPower);
        const radius = 34 * scale;

        // Smooth alpha envelope to prevent pop-in at center or edges
        const norm = (k + progress) / numLayers;
        const alpha = Math.sin(norm * Math.PI) * 0.9;
        if (alpha <= 0.01) continue;

        const rotation = (t * 0.18 + k * 0.15) * (k % 2 === 0 ? 1 : -1);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);

        // Gold & Emerald Sacred Strokes
        const strokeColor = k % 2 === 0 ? `rgba(251, 191, 36, ${alpha})` : `rgba(52, 211, 153, ${alpha})`;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.min(2.5, Math.max(1, scale * 0.8));
        ctx.shadowColor = k % 2 === 0 ? '#fbbf24' : '#34d399';
        ctx.shadowBlur = 8;

        // Outer Bound Ring
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 6 Interlocking Circles (Seed of Life Geometry)
        for (let p = 0; p < 6; p++) {
            const ang = (p * Math.PI) / 3;
            const px = Math.cos(ang) * (radius * 0.58);
            const py = Math.sin(ang) * (radius * 0.58);
            ctx.beginPath();
            ctx.arc(px, py, radius * 0.58, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Inner Sacred Hexagram Star
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
            const starAng = (s * Math.PI) / 3;
            const rStar = (s % 2 === 0 ? radius * 0.45 : radius * 0.22);
            const sx = Math.cos(starAng) * rStar;
            const sy = Math.sin(starAng) * rStar;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    // Radiant Central Golden Jewel
    const jewelPulse = 9 + Math.sin(t * 4) * 2.5;
    const jGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, jewelPulse * 2.5);
    jGrad.addColorStop(0, '#ffffff');
    jGrad.addColorStop(0.3, '#fef08a');
    jGrad.addColorStop(0.6, '#fbbf24');
    jGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = jGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, jewelPulse * 2.5, 0, Math.PI * 2);
    ctx.fill();
}

// --------------------------------------------------------------------------
// THEME 3: CYBERPUNK NEON HYPERSPACE TUNNEL (সাইবার নিওন টানেল)
// --------------------------------------------------------------------------
function drawCyberTunnel(ctx, width, height, cx, cy, t) {
    // Dark Matrix Midnight Base
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, width, height);

    const numFrames = 13;
    const tunnelLength = 540;
    const speed = 120;

    // Corner Rails from Center to Viewport Edges
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1.2;
    const corners = [
        [0, 0], [width, 0], [width, height], [0, height],
        [width / 2, 0], [width / 2, height], [0, height / 2], [width, height / 2]
    ];
    for (let c of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(c[0], c[1]);
        ctx.stroke();
    }

    // 3D Perspective Tunnel Frames Rushing Forward
    for (let i = 0; i < numFrames; i++) {
        let z = ((i * 42 - t * speed) % tunnelLength + tunnelLength) % tunnelLength + 8;
        const scale = 230 / z;
        const fw = 135 * scale;
        const fh = 105 * scale;

        if (fw > width * 1.5) continue;

        const alpha = Math.min(1, Math.max(0, (1 - z / tunnelLength) * 1.4));
        const isNeonCyan = (i % 2 === 0);
        const neonColor = isNeonCyan ? `rgba(56, 189, 248, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;

        ctx.strokeStyle = neonColor;
        ctx.lineWidth = Math.min(3, Math.max(1, (1 - z / tunnelLength) * 2.8));
        ctx.shadowColor = isNeonCyan ? '#38bdf8' : '#f43f5e';
        ctx.shadowBlur = 10;

        // Draw Octagonal Cyber Frame
        const cut = 16 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - fw / 2 + cut, cy - fh / 2);
        ctx.lineTo(cx + fw / 2 - cut, cy - fh / 2);
        ctx.lineTo(cx + fw / 2, cy - fh / 2 + cut);
        ctx.lineTo(cx + fw / 2, cy + fh / 2 - cut);
        ctx.lineTo(cx + fw / 2 - cut, cy + fh / 2);
        ctx.lineTo(cx - fw / 2 + cut, cy + fh / 2);
        ctx.lineTo(cx - fw / 2, cy + fh / 2 - cut);
        ctx.lineTo(cx - fw / 2, cy - fh / 2 + cut);
        ctx.closePath();
        ctx.stroke();
    }

    // Hyper Speed Hyperspace Center Core
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

// --------------------------------------------------------------------------
// THEME 4: DEEP OCEANIC ABYSS (ডিপ ওশেনিক অ্যাবিস)
// --------------------------------------------------------------------------
function drawOceanAbyss(ctx, width, height, cx, cy, t) {
    // Oceanic Gradient Background
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.7);
    bgGrad.addColorStop(0, '#042f2e');
    bgGrad.addColorStop(0.5, '#02181e');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Expanding Organic Bioluminescent Caustic Waves
    const numRipples = 8;
    for (let i = 0; i < numRipples; i++) {
        const phase = ((t * 0.45 + i) % numRipples);
        const baseR = 8 * Math.exp(phase * 0.42);
        if (baseR > width * 0.85) continue;

        const alpha = Math.sin((phase / numRipples) * Math.PI) * 0.75;
        ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#2dd4bf';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        const steps = 48;
        for (let s = 0; s <= steps; s++) {
            const angle = (s / steps) * Math.PI * 2;
            const undulation = Math.sin(angle * 5 + t * 2.2 + i) * (baseR * 0.08) + Math.cos(angle * 3 - t) * (baseR * 0.04);
            const r = baseR + undulation;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // Drifting Glowing Deep-Sea Plankton Spores in 3D
    for (let p of OCEAN_SPORES) {
        p.z -= p.driftSpeed * 2.8;
        if (p.z <= 5) {
            p.z = 500;
            p.x = (Math.random() - 0.5) * 400;
            p.y = (Math.random() - 0.5) * 400;
        }

        const k = 200 / p.z;
        const driftX = Math.sin(t * 1.5 + p.phase) * 12;
        const px = cx + (p.x + driftX) * k;
        const py = cy + p.y * k;

        const alpha = Math.min(1, Math.max(0, (1 - p.z / 500) * 1.2));
        ctx.fillStyle = `rgba(94, 234, 212, ${alpha})`;
        ctx.shadowColor = '#5eead4';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, (1 - p.z / 500) * p.size * 2), 0, Math.PI * 2);
        ctx.fill();
    }

    // Soft Luminescent Aqua Abyss Core
    const corePulse = 14 + Math.sin(t * 2.5) * 3;
    const aGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, corePulse * 2.2);
    aGrad.addColorStop(0, '#ffffff');
    aGrad.addColorStop(0.3, '#2dd4bf');
    aGrad.addColorStop(0.7, '#0f766e');
    aGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = aGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, corePulse * 2.2, 0, Math.PI * 2);
    ctx.fill();
}

// --------------------------------------------------------------------------
// THEME 5: QUANTUM LIGHT PORTAL (কোয়ান্টাম লাইট পোর্টাল)
// --------------------------------------------------------------------------
function drawQuantumPortal(ctx, width, height, cx, cy, t) {
    // Quantum Void Midnight Background
    ctx.fillStyle = '#060312';
    ctx.fillRect(0, 0, width, height);

    // 130 Chromatic Energy Stream Filaments
    const numStreams = 130;
    const maxR = Math.min(width, height) * 0.48;

    for (let i = 0; i < numStreams; i++) {
        const loopNorm = (((i * 1.35 + t * 24) % maxR) / maxR);
        const r = maxR * Math.pow(loopNorm, 1.85);

        const baseAngle = i * (Math.PI * 2 / numStreams);
        const vortexAngle = baseAngle + t * 1.5 + (r * 0.038);

        const x = cx + Math.cos(vortexAngle) * r;
        const y = cy + Math.sin(vortexAngle) * r;

        // Dynamic Chromatic Hue Shift
        const hue = Math.floor((t * 50 + r * 1.4 + i * 2) % 360);
        const alpha = Math.sin(loopNorm * Math.PI) * 0.95;

        ctx.fillStyle = `hsla(${hue}, 95%, 68%, ${alpha})`;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
        ctx.shadowBlur = 8;

        const pSize = Math.max(1, loopNorm * 3.6);
        ctx.beginPath();
        ctx.arc(x, y, pSize, 0, Math.PI * 2);
        ctx.fill();

        // Trail Filament toward vortex center
        if (loopNorm > 0.15) {
            const prevR = r * 0.88;
            const prevAngle = vortexAngle - 0.12;
            const px = cx + Math.cos(prevAngle) * prevR;
            const py = cy + Math.sin(prevAngle) * prevR;

            ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${alpha * 0.45})`;
            ctx.lineWidth = pSize * 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(px, py);
            ctx.stroke();
        }
    }

    // Central Singularity with Chromatic Aura
    const singR = 12 + Math.sin(t * 3.8) * 2;
    const singGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, singR * 2.6);
    singGrad.addColorStop(0, '#ffffff');
    singGrad.addColorStop(0.35, '#c084fc');
    singGrad.addColorStop(0.7, '#7c3aed');
    singGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = singGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, singR * 2.6, 0, Math.PI * 2);
    ctx.fill();
}
