/* ==========================================================================
   TAB 2: DEEP FOCUS MODE & MINIMAL AUDIO MANAGEMENT
   ========================================================================== */

let currentAudioTab = 'library'; // 'library' or 'device'
let previewAudioInstance = null;
let currentPreviewUrl = null;

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
                    <p class="app-subtitle" style="margin:0; font-family:'Kalpurush', sans-serif;">${currentLang === 'bn' ? 'অডিও ও ফোকাস টাইমার সেশন' : 'Minimal Audio & Focus Session'}</p>
                </div>
            </div>
            ${isFocusSessionActive ? renderActiveHypnoticFocus() : renderFocusDashboard()}
        </div>
    `;
}

function renderActiveHypnoticFocus() {
    const trackTitle = selectedAudioName || 'Focus Background Sound';
    const isMuted = audioEngine && audioEngine.isMuted;

    return `
        <div class="hypnotic-focus-card">
            <div class="hypnotic-canvas-wrapper">
                <canvas id="hypnotic-spiral-canvas" width="280" height="260"></canvas>
            </div>
            <div class="hypnotic-subtext">Focus on the circle simulation.</div>
            <div class="hypnotic-timer-digits" id="hypnotic-timer-digits">00:00</div>

            <!-- Audio Title & Interactive Mute/Unmute Toggle Button -->
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:12px;">
                <div style="font-size: 11px; color: #38bdf8; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    <span>${escapeHtml(trackTitle)}</span>
                </div>

                <button id="btn-focus-mute-toggle" style="background:rgba(255,255,255,0.06); border:1.5px solid ${isMuted ? '#ef4444' : '#10b981'}; color:${isMuted ? '#f87171' : '#34d399'}; padding:7px 16px; border-radius:20px; font-size:12px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.2s; outline:none;">
                    ${isMuted ? `
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor;"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                        <span>Muted (নিঃশব্দ)</span>
                    ` : `
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width:16px; height:16px; fill:currentColor;"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        <span>Sound On</span>
                    `}
                </button>
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
                <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; border:1px solid ${isSelected ? '#38bdf8' : '#1e293b'}; padding:10px 12px; border-radius:8px;">
                    <div style="overflow:hidden; padding-right:8px;">
                        <div style="font-size:12px; font-weight:bold; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(track.title)}</div>
                        <div style="font-size:10px; color:${track.isRaw ? '#4ade80' : '#94a3b8'}; margin-top:2px; display:flex; align-items:center; gap:4px;">
                            ${track.isRaw ? `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:10px; height:10px; color:#4ade80;"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Offline Ready</span>
                            ` : `
                                <span>Cloud Stream</span>
                            `}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                        <!-- Play Preview Button -->
                        <button class="btn-preview-track" data-url="${escapeHtml(track.url)}" title="Play Preview" style="background:#1e293b; color:#ffffff; border:1px solid #334155; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                            ${isPreviewing ? `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            `}
                        </button>

                        <!-- Download / Offline Cache Button -->
                        ${!track.isRaw ? `
                            <button class="btn-download-track" data-url="${escapeHtml(track.url)}" title="Download for Offline Use" style="background:#1e293b; color:#ffffff; border:1px solid #334155; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                            </button>
                        ` : ''}

                        <!-- Select Track Button -->
                        <button class="btn-select-library-track" data-url="${escapeHtml(track.url)}" data-name="${escapeHtml(track.title)}" style="background:${isSelected ? '#16a34a' : '#1e293b'}; color:#ffffff; border:1px solid ${isSelected ? '#16a34a' : '#334155'}; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px;">
                            ${isSelected ? 'Selected' : 'Select'}
                        </button>
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';
    return html;
}

function renderLibraryTabPlaceholder() {
    return renderLibraryTabSync();
}

async function renderLibraryTabContent() {
    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';

    for (let cat of SUPABASE_AUDIO_CATEGORIES) {
        html += `<div style="font-size:11px; font-weight:bold; color:#38bdf8; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(cat.category)}</div>`;
        for (let track of cat.tracks) {
            const isSelected = selectedAudioType === 'library' && selectedAudioUrl === track.url;
            const isCached = await isAudioCached(track.url);
            const isPreviewing = currentPreviewUrl === track.url;

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; border:1px solid ${isSelected ? '#38bdf8' : '#1e293b'}; padding:10px 12px; border-radius:8px;">
                    <div style="overflow:hidden; padding-right:8px;">
                        <div style="font-size:12px; font-weight:bold; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(track.title)}</div>
                        <div style="font-size:10px; color:${isCached ? '#4ade80' : '#94a3b8'}; margin-top:2px; display:flex; align-items:center; gap:4px;">
                            ${isCached ? `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:10px; height:10px; color:#4ade80;"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Offline Ready</span>
                            ` : `
                                <span>Cloud Stream</span>
                            `}
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                        <!-- Play Preview Button -->
                        <button class="btn-preview-track" data-url="${escapeHtml(track.url)}" title="Play Preview" style="background:#1e293b; color:#ffffff; border:1px solid #334155; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                            ${isPreviewing ? `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; color:#38bdf8;"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            `}
                        </button>

                        <!-- Download / Offline Cache Button -->
                        ${!isCached && !track.isRaw ? `
                            <button class="btn-download-track" data-url="${escapeHtml(track.url)}" title="Download for Offline Use" style="background:#1e293b; color:#ffffff; border:1px solid #334155; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                                <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px;"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                            </button>
                        ` : ''}

                        <!-- Select Track Button -->
                        <button class="btn-select-library-track" data-url="${escapeHtml(track.url)}" data-name="${escapeHtml(track.title)}" style="background:${isSelected ? '#16a34a' : '#1e293b'}; color:#ffffff; border:1px solid ${isSelected ? '#16a34a' : '#334155'}; border-radius:6px; padding:6px 10px; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px;">
                            ${isSelected ? 'Selected' : 'Select'}
                        </button>
                    </div>
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
        <div style="background:#0f172a; border:1px dashed #334155; border-radius:10px; padding:18px; text-align:center;">
            <div style="display:flex; justify-content:center; margin-bottom:10px;">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:36px; height:36px; color:#38bdf8;"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
            </div>
            <div style="font-size:13px; font-weight:bold; color:#ffffff; margin-bottom:4px;">Select Local Device Audio</div>
            <p style="font-size:11px; color:#94a3b8; line-height:1.5; margin-bottom:14px;">
                Pick any MP3, WAV, AAC or custom audio track stored on your phone.
            </p>

            <button id="btn-pick-device-audio" style="width:100%; padding:12px; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:#ffffff; border:none; border-radius:8px; font-size:13px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                <svg class="svg-icon" viewBox="0 0 24 24" style="width:18px; height:18px;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                <span>Browse Phone Storage</span>
            </button>

            ${isDevice ? `
                <div style="margin-top:12px; background:#16a34a22; border:1px solid #16a34a; border-radius:6px; padding:10px; font-size:11px; color:#4ade80; text-align:left; display:flex; align-items:center; gap:6px;">
                    <svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; flex-shrink:0;"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    <span>Selected: <strong>${escapeHtml(selectedAudioName)}</strong></span>
                </div>
            ` : ''}
        </div>
    `;
}

async function refreshLibraryTabUI() {
    const container = document.getElementById('library-async-container');
    if (container) {
        container.innerHTML = await renderLibraryTabContent();
        bindLibraryEvents();
    }
}

function bindLibraryEvents() {
    // Play Preview Button Handlers
    document.querySelectorAll('.btn-preview-track').forEach(btn => {
        btn.onclick = async () => {
            const url = btn.dataset.url;
            if (previewAudioInstance && currentPreviewUrl === url) {
                previewAudioInstance.pause();
                previewAudioInstance = null;
                currentPreviewUrl = null;
                refreshLibraryTabUI();
                return;
            }

            if (previewAudioInstance) {
                try {
                    previewAudioInstance.pause();
                    previewAudioInstance.src = '';
                } catch (e) {}
                previewAudioInstance = null;
                currentPreviewUrl = null;
            }

            const playUrl = await getAudioPlaybackUrl(url);
            previewAudioInstance = new Audio(playUrl);
            currentPreviewUrl = url;
            previewAudioInstance.play().catch(e => console.error("Preview play error:", e));
            previewAudioInstance.onended = () => {
                previewAudioInstance = null;
                currentPreviewUrl = null;
                refreshLibraryTabUI();
            };
            refreshLibraryTabUI();
        };
    });

    // Download Track Handlers
    document.querySelectorAll('.btn-download-track').forEach(btn => {
        btn.onclick = async () => {
            const url = btn.dataset.url;
            btn.disabled = true;
            btn.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24" style="width:14px; height:14px; animation:spin 1s linear infinite;"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 7 2.69 7 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C20.54 15.02 21 13.57 21 12c0-4.97-4.03-9-9-9z"/></svg>`;
            await downloadAndCacheAudio(url);
            refreshLibraryTabUI();
        };
    });

    // Library Track Select Handlers
    document.querySelectorAll('.btn-select-library-track').forEach(btn => {
        btn.onclick = async () => {
            if (previewAudioInstance) {
                previewAudioInstance.pause();
                previewAudioInstance = null;
                currentPreviewUrl = null;
            }

            const url = btn.dataset.url;
            const name = btn.dataset.name;

            selectedAudioType = 'library';
            selectedAudioUrl = url;
            selectedAudioName = name;

            localStorage.setItem('SELECTED_FOCUS_AUDIO_TYPE', 'library');
            localStorage.setItem('SELECTED_SUPABASE_AUDIO_URL', url);
            localStorage.setItem('SELECTED_FOCUS_AUDIO_NAME', name);

            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FocusAudioPlugin) {
                try {
                    await window.Capacitor.Plugins.FocusAudioPlugin.setSelectedAudio({
                        audioType: 'library',
                        audioUri: url,
                        audioName: name
                    });
                } catch (e) { console.error('Set selected audio plugin error:', e); }
            }

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

    // Interactive Mute/Unmute Button Handler for Active Focus Session
    const btnMuteToggle = document.getElementById('btn-focus-mute-toggle');
    if (btnMuteToggle) {
        btnMuteToggle.onclick = () => {
            if (audioEngine) {
                audioEngine.toggleMute();
            }
            switchTab('focus');
        };
    }

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
        startHypnoticBallSimulation();
        startFocusTimerLoop();
    }
}

function startFocusSession(mins) {
    if (previewAudioInstance) {
        previewAudioInstance.pause();
        previewAudioInstance = null;
        currentPreviewUrl = null;
    }

    focusSessionEndTime = Date.now() + (mins * 60 * 1000);
    localStorage.setItem('FOCUS_SESSION_END_TIME', focusSessionEndTime.toString());
    // H17 FIX: do NOT credit the full session here. Persist session start +
    // planned minutes so elapsed minutes are credited incrementally by the
    // timer tick (and settled on boot if the app was killed mid-session).
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
            // H17: credit only elapsed whole minutes as the session runs.
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
            isFocusSessionActive = false;
            // H17: final credit (covers the last partial minute up to the
            // planned total), then clear all session state.
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

function isAngleInGateArc(angle, gateCenter, halfWidth) {
    let diff = Math.abs(angle - gateCenter);
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= halfWidth;
}

function startHypnoticBallSimulation() {
    const canvas = document.getElementById('hypnotic-spiral-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const circleRadius = Math.min(width, height) / 2 - 22;

    const gateAngleCenter = -Math.PI / 2;
    const gateHalfWidth = (10 * Math.PI) / 180;
    const gateStartAngle = gateAngleCenter - gateHalfWidth;
    const gateEndAngle = gateAngleCenter + gateHalfWidth;

    const colorPalette = ['#FFD700', '#00FFFF', '#FF5722', '#E91E63', '#9C27B0', '#4CAF50', '#00BCD4', '#FFEB3B', '#FF4081', '#00E676', '#7C4DFF', '#FF9100'];
    const numBalls = 16;

    class BouncingBall {
        constructor(id, color, exitTime) {
            this.id = id;
            this.color = color;
            this.radius = 6.5;
            this.exited = false;
            this.exitTime = exitTime;
            this.targetedForExit = false;

            const spawnRadius = Math.random() * (circleRadius * 0.45);
            const spawnAngle = Math.random() * Math.PI * 2;
            this.x = cx + Math.cos(spawnAngle) * spawnRadius;
            this.y = cy + Math.sin(spawnAngle) * spawnRadius;

            this.speed = 2.4;
            const dir = Math.random() * Math.PI * 2;
            this.vx = Math.cos(dir) * this.speed;
            this.vy = Math.sin(dir) * this.speed;
        }

        update(nowSecs) {
            if (this.exited) {
                this.x += this.vx;
                this.y += this.vy;
                return;
            }

            this.x += this.vx;
            this.y += this.vy;

            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist + this.radius >= circleRadius) {
                const angle = Math.atan2(dy, dx);
                const inGate = isAngleInGateArc(angle, gateAngleCenter, gateHalfWidth);

                if (inGate && nowSecs >= this.exitTime) {
                    this.exited = true;
                    if (this.vy > 0) this.vy = -this.vy;
                    return;
                }

                const nx = dx / dist;
                const ny = dy / dist;
                this.x = cx + nx * (circleRadius - this.radius);
                this.y = cy + ny * (circleRadius - this.radius);

                const dot = this.vx * nx + this.vy * ny;
                this.vx -= 2 * dot * nx;
                this.vy -= 2 * dot * ny;

                if (nowSecs >= this.exitTime && !this.targetedForExit) {
                    const gateX = cx + Math.cos(gateAngleCenter) * circleRadius;
                    const gateY = cy + Math.sin(gateAngleCenter) * circleRadius;
                    const angleToGate = Math.atan2(gateY - this.y, gateX - this.x);
                    this.vx = Math.cos(angleToGate) * this.speed;
                    this.vy = Math.sin(angleToGate) * this.speed;
                    this.targetedForExit = true;
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 0;
            ctx.fill();
        }
    }

    const balls = [];
    const startTimeSecs = Math.floor(Date.now() / 1000);
    const endTimeSecs = Math.floor(focusSessionEndTime / 1000);
    const finalExitTime = Math.max(startTimeSecs + 1, endTimeSecs - 1);
    const availableDuration = Math.max(1, finalExitTime - startTimeSecs);
    const step = availableDuration / (numBalls - 1);

    for (let i = 0; i < numBalls; i++) {
        const color = colorPalette[i % colorPalette.length];
        const exitTime = i === numBalls - 1 ? finalExitTime : startTimeSecs + Math.floor((i + 1) * step);
        balls.push(new BouncingBall(i + 1, color, exitTime));
    }

    if (spiralAnimInterval) clearInterval(spiralAnimInterval);

    spiralAnimInterval = setInterval(() => {
        if (!document.getElementById('hypnotic-spiral-canvas')) {
            clearInterval(spiralAnimInterval);
            return;
        }

        const nowSecs = Math.floor(Date.now() / 1000);
        ctx.fillStyle = '#0B3C2B';
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#E6F4EA';
        ctx.beginPath();
        ctx.arc(cx, cy, circleRadius, gateEndAngle, gateStartAngle + Math.PI * 2);
        ctx.stroke();

        const gx1 = cx + Math.cos(gateStartAngle) * circleRadius;
        const gy1 = cy + Math.sin(gateStartAngle) * circleRadius;
        const gx2 = cx + Math.cos(gateEndAngle) * circleRadius;
        const gy2 = cy + Math.sin(gateEndAngle) * circleRadius;

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(gx1, gy1, 3.5, 0, Math.PI * 2);
        ctx.arc(gx2, gy2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        for (let b of balls) {
            b.update(nowSecs);
            b.draw();
        }
    }, 1000 / 60);
}
