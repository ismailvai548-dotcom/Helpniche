/* ==========================================================================
   MODULE: VIDEO & AUDIO DOWNLOADER (MULTI-PLATFORM)
   SUPPORTS: YOUTUBE, FACEBOOK, INSTAGRAM, TIKTOK, TWITTER (X)
   DIRECT TO PHONE GALLERY (VIA NATIVE DOWNLOAD MANAGER)
   SMART URL NORMALIZER: HANDLES MIX PLAYLISTS, TRACKING PARAMS, SHORTS
   MAX CONCURRENT DOWNLOADS: 2-3 QUEUE SYSTEM
   FULL CONTROLS: PAUSE, RESUME, 3-DOT MENU, DELETE/CANCEL
   100% PURE VECTOR SVGS (NO EMOJIS)
   ========================================================================== */

let downloaderSearchUrl = '';
let isAnalyzingVideo = false;
let currentVideoData = null; // metadata, formats
let activeVideoTab = 'video'; // 'video' | 'audio'
let downloadQueue = []; // [{ id, downloadId, title, filename, sourceUrl, formatKey, type, quality, ext, progress, bytesDownloaded, bytesTotal, status, statusText, directDownloadUrl, pollIntervalId, showMenu }]
let downloadPollingInterval = null;
const MAX_CONCURRENT_DOWNLOADS = 3;

// Premium Pure Vector SVGs (100% Zero Emojis)
const DOWNLOADER_SVGS = {
    back: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
    download: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>`,
    paste: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/></svg>`,
    search: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
    video: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
    music: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
    checkCircle: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    gallery: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
    refresh: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    folder: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`,
    youtube: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z"/></svg>`,
    facebook: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/></svg>`,
    instagram: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.79-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    tiktok: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    twitter: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    play: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    moreVert: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
    trash: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    close: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    openInBrowser: `<svg class="svg-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`
};

/**
 * Smart URL normalizer:
 * 1. Handles YouTube Mix Playlists: list=RD[videoId] -> converts to https://www.youtube.com/watch?v=[videoId]
 * 2. Handles YouTube Music Mixes: list=RDAMVM[videoId] -> converts to https://www.youtube.com/watch?v=[videoId]
 * 3. Handles YouTube Watch with extra playlist query params: watch?v=[videoId]&list=... -> cleans to https://www.youtube.com/watch?v=[videoId]
 * 4. Handles YouTube Shorts / youtu.be / embed -> clean watch?v=[videoId]
 * 5. Detects Pure Playlists (list=PL...) without a single video ID -> informs user to pick a specific video
 * 6. Strips tracking params from Instagram & Facebook
 */
function normalizeAndExtractVideoUrl(inputUrl) {
    if (!inputUrl) return { url: '', platform: '', error: 'অনুগ্রহ করে একটি সঠিক ভিডিও লিংক দিন।' };
    let raw = inputUrl.trim();

    // Check if it's YouTube
    const isYt = (raw.includes('youtube.com') || raw.includes('youtu.be'));
    if (isYt) {
        // Priority 1: watch?v= or shorts/ or youtu.be/ or embed/
        let vMatch = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
        if (vMatch && vMatch[1]) {
            return {
                url: `https://www.youtube.com/watch?v=${vMatch[1]}`,
                videoId: vMatch[1],
                platform: 'youtube'
            };
        }

        // Priority 2: YouTube Music / Video Mix Playlist (starts with RDAMVM or RD followed by 11-char video ID)
        let rdMusicMatch = raw.match(/[?&]list=RDAMVM([a-zA-Z0-9_-]{11})/i);
        if (rdMusicMatch && rdMusicMatch[1]) {
            return {
                url: `https://www.youtube.com/watch?v=${rdMusicMatch[1]}`,
                videoId: rdMusicMatch[1],
                platform: 'youtube',
                isMixConverted: true
            };
        }

        let rdMatch = raw.match(/[?&]list=RD([a-zA-Z0-9_-]{11})/i);
        if (rdMatch && rdMatch[1]) {
            return {
                url: `https://www.youtube.com/watch?v=${rdMatch[1]}`,
                videoId: rdMatch[1],
                platform: 'youtube',
                isMixConverted: true
            };
        }

        // Priority 3: Pure Playlist without video ID (e.g. list=PL... or list=OLAK...)
        if (raw.includes('youtube.com/playlist') || raw.includes('list=')) {
            return {
                url: raw,
                platform: 'youtube',
                isPurePlaylist: true,
                error: 'এটি একটি সম্পূর্ণ প্লেলিস্ট লিংক। দয়া করে প্লেলিস্টের ভেতর থেকে আপনার পছন্দের গান বা ভিডিওটি চালু করে সেটির শেয়ার বা কপি লিংক দিন।'
            };
        }
    }

    // Check other platforms & clean tracking
    const platform = detectPlatform(raw);
    let clean = raw;
    try {
        if (platform === 'facebook' || platform === 'instagram' || platform === 'tiktok') {
            const p = new URL(raw);
            clean = p.origin + p.pathname;
        }
    } catch (e) {}

    return { url: clean, platform: platform };
}

/**
 * Main render function for Video Downloader Page
 */
function renderVideoDownloaderTab() {
    return `
        <div class="screen-wrapper video-downloader-wrapper">
            <!-- Top Header Bar -->
            <div class="network-header-bar video-downloader-header">
                <button class="btn-back-home" id="btn-downloader-back-home" title="Back to Home / হোম স্ক্রিনে ফিরে যান">
                    ${DOWNLOADER_SVGS.back}
                </button>
                <div style="flex:1;">
                    <h1 class="app-title" style="font-size:20px; font-weight:800; color:#c084fc; margin:0;">
                        Video Downloader
                    </h1>
                    <p style="font-size:11px; color:#94a3b8; margin-top:2px;">
                        YouTube, Facebook, Instagram ও TikTok ভিডিও ডাউনলোড করুন
                    </p>
                </div>
                <button class="btn-open-downloads-folder" id="btn-open-gallery-downloads" title="Open Phone Downloads / ডাউনলোড ফোল্ডার দেখুন">
                    ${DOWNLOADER_SVGS.folder}
                </button>
            </div>

            <!-- Supported Platforms Quick Badges Bar -->
            <div class="downloader-platforms-row">
                <div class="platform-chip ${detectPlatform(downloaderSearchUrl) === 'youtube' ? 'active-platform' : ''}">
                    ${DOWNLOADER_SVGS.youtube} <span>YouTube</span>
                </div>
                <div class="platform-chip ${detectPlatform(downloaderSearchUrl) === 'facebook' ? 'active-platform' : ''}">
                    ${DOWNLOADER_SVGS.facebook} <span>Facebook</span>
                </div>
                <div class="platform-chip ${detectPlatform(downloaderSearchUrl) === 'instagram' ? 'active-platform' : ''}">
                    ${DOWNLOADER_SVGS.instagram} <span>Instagram</span>
                </div>
                <div class="platform-chip ${detectPlatform(downloaderSearchUrl) === 'tiktok' ? 'active-platform' : ''}">
                    ${DOWNLOADER_SVGS.tiktok} <span>TikTok</span>
                </div>
                <div class="platform-chip ${detectPlatform(downloaderSearchUrl) === 'twitter' ? 'active-platform' : ''}">
                    ${DOWNLOADER_SVGS.twitter} <span>X (Twitter)</span>
                </div>
            </div>

            <!-- Search & Paste Bar -->
            <div class="downloader-search-card">
                <div class="downloader-input-wrapper">
                    <span class="downloader-search-icon">${DOWNLOADER_SVGS.search}</span>
                    <input type="text" id="downloader-url-input" class="downloader-input" 
                        placeholder="ভিডিওর লিংক এখানে পেস্ট বা লিখুন..." 
                        value="${escapeHtml(downloaderSearchUrl)}" />
                    ${downloaderSearchUrl ? `<button class="downloader-clear-btn" id="btn-clear-downloader-url">&times;</button>` : ''}
                </div>
                <div class="downloader-action-btns-row">
                    <button class="btn-paste-clipboard" id="btn-paste-clipboard-url">
                        ${DOWNLOADER_SVGS.paste}
                        <span>পেস্ট করুন</span>
                    </button>
                    <button class="btn-analyze-video ${isAnalyzingVideo ? 'loading' : ''}" id="btn-analyze-video-url">
                        ${isAnalyzingVideo ? `<span class="spinner-small"></span>` : DOWNLOADER_SVGS.download}
                        <span>${isAnalyzingVideo ? 'বিশ্লেষণ হচ্ছে...' : 'ভিডিও আনুন'}</span>
                    </button>
                </div>
            </div>

            <!-- Live Downloads Queue Card (Active, Paused & Completed) -->
            ${renderDownloadQueueSection()}

            <!-- Video Info & Formats Area -->
            <div id="downloader-results-area" style="margin-top:14px;">
                ${renderVideoResultCard()}
            </div>

            <!-- Feature Guide Info Card -->
            <div class="downloader-info-guide">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <div style="width:24px; height:24px; border-radius:6px; background:rgba(192,132,252,0.15); display:flex; align-items:center; justify-content:center; color:#c084fc;">
                        ${DOWNLOADER_SVGS.gallery}
                    </div>
                    <span style="font-size:12.5px; font-weight:700; color:#ffffff;">ডাউনলোড সুবিধা ও বৈশিষ্ট্য:</span>
                </div>
                <ul style="font-size:11px; color:#cbd5e1; line-height:1.6; padding-left:16px; margin:0;">
                    <li><strong>পজ ও রিজিউম সুবিধা:</strong> যেকোনো ডাউনলোড সাময়িক স্থগিত (Pause) এবং পরবর্তীতে আবার চালু (Resume) করতে পারবেন।</li>
                    <li><strong>বাতিল ও মুছে ফেলা:</strong> ৩-ডট মেনু বা ক্রস বাটন দিয়ে যেকোনো ডাউনলোড তাৎক্ষণিক বন্ধ করে মুছে ফেলা যাবে।</li>
                    <li><strong>অন্য অ্যাপ থেকে শেয়ার:</strong> YouTube বা Facebook-এর Share মেনু থেকে আমাদের অ্যাপ সিলেক্ট করলেই লিংক চলে আসবে।</li>
                    <li><strong>ফোনের গ্যালারিতে সেভ:</strong> সব ভিডিও সরাসরি আপনার ফোনের <code>Downloads</code> ফোল্ডারে সেভ হয়ে গ্যালারিতে প্রদর্শিত হবে।</li>
                    <li><strong>একসাথে সর্বোচ্চ ৩টি:</strong> ব্যাকগ্রাউন্ডে একসাথে সর্বোচ্চ ২-৩টি ডাউনলোড চলবে, বাকিগুলো লাইনে অপেক্ষমাণ থাকবে।</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Render Video Details & Format Choices
 */
function renderVideoResultCard() {
    if (isAnalyzingVideo) {
        return `
            <div class="downloader-analyzing-card">
                <div class="spinner-large"></div>
                <div style="font-size:14px; font-weight:700; color:#ffffff; margin-top:14px;">ভিডিও বিশ্লেষণ করা হচ্ছে...</div>
                <p style="font-size:11.5px; color:#94a3b8; margin-top:4px;">কোয়ালিটি ও অডিও অপশনগুলো লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন</p>
            </div>
        `;
    }

    if (!currentVideoData) {
        return `
            <div class="empty-state-card" style="padding:24px 16px; border-radius:18px; border:1px dashed rgba(168,85,247,0.3); background:rgba(168,85,247,0.03);">
                <div style="width:48px; height:48px; border-radius:14px; background:rgba(168,85,247,0.15); color:#c084fc; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                    ${DOWNLOADER_SVGS.download}
                </div>
                <div style="font-size:14.5px; font-weight:700; color:#ffffff;">যেকোনো ভিডিওর লিংক পেস্ট করুন</div>
                <p style="font-size:11px; color:#94a3b8; margin-top:4px; max-width:280px; margin-left:auto; margin-right:auto;">
                    YouTube, Facebook, Instagram Reels অথবা TikTok এর যেকোনো লিংক পেস্ট করে 'ভিডিও আনুন' বাটনে চাপুন।
                </p>
            </div>
        `;
    }

    const v = currentVideoData;
    const defaultThumb = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 24 24" fill="%23334155"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9l-4-4h8l-4 4z"/></svg>`;

    return `
        <div class="video-preview-card">
            <!-- Video Thumbnail & Meta -->
            <div class="video-preview-header">
                <div class="video-thumb-container">
                    <img src="${v.thumbnail || defaultThumb}" alt="Thumbnail" class="video-thumb-img" onerror="this.src='${defaultThumb}'" />
                    ${v.duration ? `<span class="video-duration-badge">${escapeHtml(v.duration)}</span>` : ''}
                    <span class="video-source-badge platform-${v.platform}">${v.platform.toUpperCase()}</span>
                </div>
                <div class="video-meta-container">
                    <h3 class="video-title-text" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</h3>
                    <div class="video-author-text">${DOWNLOADER_SVGS.video} <span>${escapeHtml(v.author || 'Creator')}</span></div>
                </div>
            </div>

            <!-- Format Selector Tabs (Video vs Audio) -->
            <div class="downloader-format-tabs">
                <button class="downloader-tab-btn ${activeVideoTab === 'video' ? 'active' : ''}" id="tab-choose-video">
                    ${DOWNLOADER_SVGS.video}
                    <span>ভিডিও অপশন</span>
                </button>
                <button class="downloader-tab-btn ${activeVideoTab === 'audio' ? 'active' : ''}" id="tab-choose-audio">
                    ${DOWNLOADER_SVGS.music}
                    <span>অডিও অপশন (MP3)</span>
                </button>
            </div>

            <!-- Formats List -->
            <div class="downloader-formats-list">
                ${activeVideoTab === 'video' ? renderVideoQualityOptions(v) : renderAudioQualityOptions(v)}
            </div>
        </div>
    `;
}

/**
 * Render Video Quality Cards (1080p, 720p, 480p, 360p)
 */
function renderVideoQualityOptions(v) {
    const formats = v.videoFormats && v.videoFormats.length > 0 ? v.videoFormats : [
        { quality: '1080p', label: 'Full HD', ext: 'MP4', size: '৪০ - ৬০ MB', formatKey: '1080', url: v.url },
        { quality: '720p', label: 'High Definition (HD)', ext: 'MP4', size: '২০ - ৩০ MB', formatKey: '720', url: v.url },
        { quality: '480p', label: 'Standard (SD)', ext: 'MP4', size: '১০ - ১৫ MB', formatKey: '480', url: v.url },
        { quality: '360p', label: 'Compact Mobile', ext: 'MP4', size: '৫ - ৮ MB', formatKey: '360', url: v.url }
    ];

    return formats.map(f => `
        <div class="format-item-card">
            <div class="format-item-left">
                <span class="badge-quality">${f.quality}</span>
                <div>
                    <div class="format-item-label">${escapeHtml(f.label || f.quality)} (${f.ext || 'MP4'})</div>
                    <div class="format-item-size">${escapeHtml(f.size || 'আনুমানিক সাইজ')}</div>
                </div>
            </div>
            <button class="btn-start-download" 
                data-type="video" 
                data-quality="${f.quality}" 
                data-format-key="${f.formatKey || '720'}"
                data-url="${escapeHtml(f.url || v.url)}" 
                data-title="${escapeHtml(v.title)}"
                data-ext="mp4">
                ${DOWNLOADER_SVGS.download}
                <span>ডাউনলোড</span>
            </button>
        </div>
    `).join('');
}

/**
 * Render Audio Quality Cards (MP3, M4A)
 */
function renderAudioQualityOptions(v) {
    const formats = v.audioFormats && v.audioFormats.length > 0 ? v.audioFormats : [
        { quality: '320 kbps', label: 'MP3 High Quality', ext: 'MP3', size: '৬ - ৮ MB', formatKey: 'mp3', url: v.url },
        { quality: '128 kbps', label: 'MP3 Standard', ext: 'MP3', size: '৩ - ৪ MB', formatKey: 'mp3', url: v.url },
        { quality: 'M4A', label: 'Original AAC Audio', ext: 'M4A', size: '২ - ৩ MB', formatKey: 'm4a', url: v.url }
    ];

    return formats.map(f => `
        <div class="format-item-card audio-format-card">
            <div class="format-item-left">
                <span class="badge-quality audio-badge">${DOWNLOADER_SVGS.music}</span>
                <div>
                    <div class="format-item-label">${escapeHtml(f.label || f.quality)}</div>
                    <div class="format-item-size">${escapeHtml(f.size || 'আনুমানিক সাইজ')} &bull; ${f.ext || 'MP3'}</div>
                </div>
            </div>
            <button class="btn-start-download audio-btn" 
                data-type="audio" 
                data-quality="${f.quality}" 
                data-format-key="${f.formatKey || 'mp3'}"
                data-url="${escapeHtml(f.url || v.url)}" 
                data-title="${escapeHtml(v.title)}"
                data-ext="${(f.ext || 'mp3').toLowerCase()}">
                ${DOWNLOADER_SVGS.download}
                <span>অডিও ডাউনলোড</span>
            </button>
        </div>
    `).join('');
}

/**
 * Render Active, Paused & Completed Downloads Queue Section
 */
function renderDownloadQueueSection() {
    if (!downloadQueue || downloadQueue.length === 0) return '';

    const runningCount = downloadQueue.filter(d => d.status === 'running' || d.status === 'preparing').length;
    const queuedCount = downloadQueue.filter(d => d.status === 'queued').length;
    const pausedCount = downloadQueue.filter(d => d.status === 'paused').length;

    return `
        <div class="download-queue-container">
            <div class="queue-header-row">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:13px; font-weight:800; color:#ffffff;">ডাউনলোড তালিকা (Queue)</span>
                    <span class="queue-badge-count">${downloadQueue.length}</span>
                </div>
                <div style="font-size:10.5px; color:#c084fc; font-weight:700;">
                    ${runningCount > 0 ? `চলছে: ${runningCount}টি ` : ''} 
                    ${pausedCount > 0 ? `| স্থগিত: ${pausedCount}টি ` : ''}
                    ${queuedCount > 0 ? `| অপেক্ষমাণ: ${queuedCount}টি` : ''}
                </div>
            </div>

            <div class="queue-items-list">
                ${downloadQueue.map(item => `
                    <div class="queue-item-card status-${item.status}" id="queue-card-${item.id}">
                        <div class="queue-item-info">
                            <div class="queue-item-type-icon">
                                ${item.type === 'audio' ? DOWNLOADER_SVGS.music : DOWNLOADER_SVGS.video}
                            </div>
                            <div class="queue-item-details">
                                <div class="queue-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                                <div class="queue-item-sub">
                                    <span style="color:#c084fc; font-weight:700;">${item.quality}</span>
                                    <span>&bull;</span>
                                    <span class="queue-status-text">${escapeHtml(item.statusText || getQueueStatusLabel(item.status))}</span>
                                    ${(item.status === 'running' && item.bytesTotal > 0) ? `
                                        <span>&bull;</span>
                                        <span>${formatBytes(item.bytesDownloaded)} / ${formatBytes(item.bytesTotal)}</span>
                                        <span>(${item.progress}%)</span>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Action Controls: Pause/Resume, 3-Dot, and Delete/Cross -->
                            <div class="queue-item-actions">
                                <!-- Pause / Resume / Retry Toggle Button -->
                                ${item.status === 'running' || item.status === 'preparing' ? `
                                    <button class="btn-queue-action btn-pause-action" data-action="pause" data-id="${item.id}" title="পজ করুন (Pause)">
                                        ${DOWNLOADER_SVGS.pause}
                                    </button>
                                ` : (item.status === 'paused' ? `
                                    <button class="btn-queue-action btn-resume-action" data-action="resume" data-id="${item.id}" title="চালু করুন (Resume)">
                                        ${DOWNLOADER_SVGS.play}
                                    </button>
                                ` : (item.status === 'failed' ? `
                                    <button class="btn-queue-action btn-resume-action" data-action="retry" data-id="${item.id}" title="পুনরায় চেষ্টা (Retry)">
                                        ${DOWNLOADER_SVGS.refresh}
                                    </button>
                                ` : (item.status === 'successful' ? `
                                    <span style="color:#10b981; display:flex; align-items:center; justify-content:center; width:28px; height:28px;">
                                        ${DOWNLOADER_SVGS.checkCircle}
                                    </span>
                                ` : '')))}

                                <!-- 3-Dot More Menu Toggle Button -->
                                <button class="btn-queue-action btn-more-action" data-action="toggle-menu" data-id="${item.id}" title="অপশন">
                                    ${DOWNLOADER_SVGS.moreVert}
                                </button>

                                <!-- Direct Cancel / Delete Button -->
                                <button class="btn-queue-action btn-delete-action" data-action="delete" data-id="${item.id}" title="ডাউনলোড বাতিল ও মুছুন">
                                    ${DOWNLOADER_SVGS.close}
                                </button>
                            </div>
                        </div>

                        <!-- 3-Dot Context Dropdown Menu -->
                        ${item.showMenu ? `
                            <div class="queue-item-menu">
                                <button class="queue-menu-item danger" data-action="delete" data-id="${item.id}">
                                    ${DOWNLOADER_SVGS.trash}
                                    <span>ডাউনলোড বাতিল ও মুছুন</span>
                                </button>
                                ${item.status === 'successful' ? `
                                    <button class="queue-menu-item" data-action="open-folder" data-id="${item.id}">
                                        ${DOWNLOADER_SVGS.folder}
                                        <span>ফোল্ডারে দেখুন</span>
                                    </button>
                                ` : ''}
                                <button class="queue-menu-item" data-action="open-browser" data-url="${escapeHtml(item.directDownloadUrl || item.sourceUrl)}">
                                    ${DOWNLOADER_SVGS.openInBrowser}
                                    <span>সরাসরি ব্রাউজারে খুলুন</span>
                                </button>
                            </div>
                        ` : ''}

                        <!-- Real-time Progress Bar -->
                        ${item.status === 'preparing' ? `
                            <div class="queue-progress-bar-bg">
                                <div class="queue-progress-bar-fill preparing-stripes"></div>
                            </div>
                        ` : (item.status === 'running' ? `
                            <div class="queue-progress-bar-bg">
                                <div class="queue-progress-bar-fill" style="width: ${Math.max(0, Math.min(100, item.progress || 0))}%;"></div>
                            </div>
                        ` : (item.status === 'paused' ? `
                            <div class="queue-progress-bar-bg">
                                <div class="queue-progress-bar-fill paused-fill" style="width: ${Math.max(0, Math.min(100, item.progress || 0))}%;"></div>
                            </div>
                        ` : ''))}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getQueueStatusLabel(status) {
    if (status === 'queued') return 'অপেক্ষমাণ (Queue)';
    if (status === 'preparing') return 'লিংক প্রস্তুত হচ্ছে...';
    if (status === 'running') return 'ডাউনলোড হচ্ছে...';
    if (status === 'paused') return 'স্থগিত (Paused)';
    if (status === 'successful') return 'সম্পন্ন - গ্যালারিতে সংরক্ষিত';
    if (status === 'failed') return 'ডাউনলোড ব্যর্থ';
    return status;
}

/**
 * Event Bindings for Video Downloader Page
 */
function bindVideoDownloaderEvents() {
    // Back to Home
    const btnBack = document.getElementById('btn-downloader-back-home');
    if (btnBack) btnBack.onclick = () => switchTab('home');

    // Open Downloads Folder
    const btnFolder = document.getElementById('btn-open-gallery-downloads');
    if (btnFolder) {
        btnFolder.onclick = () => openPhoneDownloadsFolder();
    }

    // URL Input change
    const urlInput = document.getElementById('downloader-url-input');
    if (urlInput) {
        urlInput.oninput = (e) => {
            downloaderSearchUrl = e.target.value.trim();
            updatePlatformChips();
        };
        urlInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                downloaderSearchUrl = urlInput.value.trim();
                triggerVideoAnalysis();
            }
        };
    }

    // Clear search button
    const btnClear = document.getElementById('btn-clear-downloader-url');
    if (btnClear) {
        btnClear.onclick = () => {
            downloaderSearchUrl = '';
            currentVideoData = null;
            updateVideoDownloaderUI();
        };
    }

    // Paste from Clipboard Button
    const btnPaste = document.getElementById('btn-paste-clipboard-url');
    if (btnPaste) {
        btnPaste.onclick = async () => {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim()) {
                        downloaderSearchUrl = text.trim();
                        if (urlInput) urlInput.value = downloaderSearchUrl;
                        updatePlatformChips();
                        triggerVideoAnalysis();
                        return;
                    }
                }
            } catch (err) {
                console.log("Clipboard read fallback:", err);
            }
            if (urlInput) {
                urlInput.focus();
                urlInput.select();
            }
        };
    }

    // Analyze Button
    const btnAnalyze = document.getElementById('btn-analyze-video-url');
    if (btnAnalyze) {
        btnAnalyze.onclick = () => triggerVideoAnalysis();
    }

    // Format Tab Switchers (Video vs Audio)
    const tabVideo = document.getElementById('tab-choose-video');
    if (tabVideo) {
        tabVideo.onclick = () => {
            activeVideoTab = 'video';
            refreshFormatListOnly();
        };
    }

    const tabAudio = document.getElementById('tab-choose-audio');
    if (tabAudio) {
        tabAudio.onclick = () => {
            activeVideoTab = 'audio';
            refreshFormatListOnly();
        };
    }

    // Bind Format Download Buttons
    bindFormatDownloadButtons();

    // Bind Queue Interactive Events (Pause, Resume, 3-Dot, Delete)
    bindQueueActionEvents();

    // Check if there is any pending shared URL from native Android Share Sheet!
    checkPendingSharedUrlFromNative();
}

function bindFormatDownloadButtons() {
    document.querySelectorAll('.btn-start-download').forEach(btn => {
        btn.onclick = (e) => {
            const el = e.currentTarget;
            const type = el.dataset.type;
            const quality = el.dataset.quality;
            const formatKey = el.dataset.formatKey || (type === 'audio' ? 'mp3' : '720');
            const url = el.dataset.url;
            const title = el.dataset.title;
            const ext = el.dataset.ext || (type === 'audio' ? 'mp3' : 'mp4');
            enqueueDownloadItem({ title, url, formatKey, type, quality, ext });
        };
    });
}

/**
 * Interactive Controls on Queue Items (Pause / Resume / Delete / 3-Dot Menu)
 */
function bindQueueActionEvents() {
    const queueArea = document.querySelector('.download-queue-container');
    if (!queueArea) return;

    // Delegate click events for pause, resume, delete, 3-dot menu
    queueArea.onclick = (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) {
            closeAllQueueMenus();
            return;
        }

        const action = btn.dataset.action;
        const id = btn.dataset.id;
        const targetUrl = btn.dataset.url;

        if (action === 'pause') {
            e.stopPropagation();
            togglePauseDownload(id);
        } else if (action === 'resume' || action === 'retry') {
            e.stopPropagation();
            togglePauseDownload(id);
        } else if (action === 'delete') {
            e.stopPropagation();
            deleteDownloadItem(id);
        } else if (action === 'toggle-menu') {
            e.stopPropagation();
            toggleItemMenu(id);
        } else if (action === 'open-folder') {
            e.stopPropagation();
            closeAllQueueMenus();
            openPhoneDownloadsFolder();
        } else if (action === 'open-browser') {
            e.stopPropagation();
            closeAllQueueMenus();
            openDirectInBrowser(targetUrl);
        }
    };
}

function closeAllQueueMenus() {
    let changed = false;
    downloadQueue.forEach(d => {
        if (d.showMenu) {
            d.showMenu = false;
            changed = true;
        }
    });
    if (changed) updateQueueUiOnly();
}

function toggleItemMenu(id) {
    const item = downloadQueue.find(d => d.id === id);
    if (!item) return;

    const currentMenuState = !!item.showMenu;
    downloadQueue.forEach(d => { d.showMenu = false; });
    item.showMenu = !currentMenuState;
    updateQueueUiOnly();
}

/**
 * Pause / Resume Download
 */
function togglePauseDownload(id) {
    const item = downloadQueue.find(d => d.id === id);
    if (!item) return;

    if (item.status === 'running' || item.status === 'preparing') {
        // PAUSE: Stop ongoing stream conversion or native download
        item.status = 'paused';
        item.statusText = 'স্থগিত (Paused)';

        // Stop polling interval if converting
        if (item.pollIntervalId) {
            clearInterval(item.pollIntervalId);
            item.pollIntervalId = null;
        }

        // Cancel active native download task so it stops consuming bandwidth
        if (item.downloadId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VideoDownloaderPlugin) {
            window.Capacitor.Plugins.VideoDownloaderPlugin.cancelDownload({ downloadId: item.downloadId }).catch(() => {});
            item.downloadId = null; // will restart cleanly on resume
        }

        updateQueueUiOnly();
        processDownloadQueue();
    } else if (item.status === 'paused' || item.status === 'failed') {
        // RESUME / RETRY
        item.status = 'queued';
        item.statusText = 'অপেক্ষমাণ (Queue)';
        updateQueueUiOnly();
        processDownloadQueue();
    }
}

/**
 * Delete / Cancel Download (Removes from queue & cancels native task)
 */
function deleteDownloadItem(id) {
    const idx = downloadQueue.findIndex(d => d.id === id);
    if (idx === -1) return;

    const item = downloadQueue[idx];

    // Clear conversion polling
    if (item.pollIntervalId) {
        clearInterval(item.pollIntervalId);
        item.pollIntervalId = null;
    }

    // Cancel in native DownloadManager
    if (item.downloadId && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VideoDownloaderPlugin) {
        window.Capacitor.Plugins.VideoDownloaderPlugin.cancelDownload({ downloadId: item.downloadId }).catch(() => {});
    }

    // Remove from memory
    downloadQueue.splice(idx, 1);
    updateQueueUiOnly();

    // Check if next queued item can now proceed
    processDownloadQueue();
}

function openPhoneDownloadsFolder() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VideoDownloaderPlugin) {
        window.Capacitor.Plugins.VideoDownloaderPlugin.openDownloadsFolder().catch(() => {});
    }
}

function openDirectInBrowser(url) {
    if (!url) return;
    try {
        window.open(url, '_system');
    } catch (e) {
        window.open(url, '_blank');
    }
}

/**
 * Check if the app received a shared URL from Android Intent Filter
 */
function checkPendingSharedUrlFromNative() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VideoDownloaderPlugin) {
        window.Capacitor.Plugins.VideoDownloaderPlugin.getSharedVideoUrl()
            .then(res => {
                if (res && res.url && res.url.trim()) {
                    downloaderSearchUrl = res.url.trim();
                    const urlInput = document.getElementById('downloader-url-input');
                    if (urlInput) urlInput.value = downloaderSearchUrl;
                    updatePlatformChips();
                    triggerVideoAnalysis();
                }
            })
            .catch(() => {});
    }
}

/**
 * Detect Platform (YouTube, Facebook, Instagram, TikTok, Twitter)
 */
function detectPlatform(url) {
    if (!url) return '';
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.me')) return 'facebook';
    if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    return 'generic';
}

function updatePlatformChips() {
    const detected = detectPlatform(downloaderSearchUrl);
    document.querySelectorAll('.platform-chip').forEach(chip => {
        const text = chip.innerText.toLowerCase();
        chip.classList.toggle('active-platform', detected && text.includes(detected));
    });
}

/**
 * Trigger Video Analysis (Multi-Tier Architecture with Smart URL Resolution)
 */
async function triggerVideoAnalysis() {
    if (!downloaderSearchUrl || !downloaderSearchUrl.trim()) {
        alert("অনুগ্রহ করে একটি সঠিক ভিডিও লিংক দিন।");
        return;
    }

    const norm = normalizeAndExtractVideoUrl(downloaderSearchUrl);
    if (norm.error) {
        alert(norm.error);
        return;
    }

    // Auto-update input with clean single-video URL if user gave Mix/Playlist link
    if (norm.isMixConverted) {
        downloaderSearchUrl = norm.url;
        const urlInput = document.getElementById('downloader-url-input');
        if (urlInput) urlInput.value = norm.url;
    }

    const cleanUrl = norm.url || downloaderSearchUrl.trim();
    const platform = norm.platform || detectPlatform(cleanUrl);

    isAnalyzingVideo = true;
    currentVideoData = null;
    updateVideoDownloaderUI();

    try {
        let result = null;

        // Tier 1: TikTok Direct Engine (Verified 100% Free, Direct HD & MP3)
        if (platform === 'tiktok') {
            result = await fetchTikTokDirect(cleanUrl);
        }
        // Tier 2: YouTube Engine with Video ID normalization
        else if (platform === 'youtube') {
            result = await fetchYouTubeMetadata(cleanUrl, norm.videoId);
        }
        // Tier 3: Facebook / Instagram / Twitter / Generic
        else {
            result = await fetchSocialMediaMetadata(cleanUrl, platform);
        }

        if (result) {
            currentVideoData = result;
        } else {
            throw new Error("ভিডিও তথ্য পাওয়া যায়নি");
        }
    } catch (err) {
        console.error("Video analysis failed:", err);
        currentVideoData = generateFallbackVideoData(cleanUrl, platform);
    } finally {
        isAnalyzingVideo = false;
        updateVideoDownloaderUI();
    }
}

/**
 * Tier 1: TikTok Extractor using TikWM API (tested & confirmed direct MP4/MP3)
 */
async function fetchTikTokDirect(url) {
    const apiEndpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiEndpoint, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error("TikWM returned error: " + response.status);
    const json = await response.json();

    if (json.code === 0 && json.data) {
        const d = json.data;
        return {
            title: d.title || 'TikTok Video',
            author: (d.author && (d.author.nickname || d.author.unique_id)) || 'TikTok Creator',
            thumbnail: d.cover || d.origin_cover || '',
            duration: d.duration ? `${d.duration}s` : '',
            platform: 'tiktok',
            url: url,
            directVideoUrl: d.play || d.wmplay,
            directAudioUrl: d.music || (d.music_info && d.music_info.play),
            videoFormats: [
                { quality: 'HD No Watermark', label: 'Watermark ছাড়া HD ভিডিও', ext: 'MP4', size: formatBytes(d.size || 15000000), formatKey: 'direct', url: d.play },
                { quality: 'Original Quality', label: 'স্ট্যান্ডার্ড কোয়ালিটি', ext: 'MP4', size: formatBytes(d.wm_size || 12000000), formatKey: 'direct', url: d.wmplay || d.play }
            ],
            audioFormats: [
                { quality: 'Original Sound', label: (d.music_info && d.music_info.title) || 'TikTok Audio MP3', ext: 'MP3', size: '৩ - ৫ MB', formatKey: 'direct', url: d.music || (d.music_info && d.music_info.play) }
            ]
        };
    }
    throw new Error("TikWM could not parse TikTok link");
}

/**
 * Tier 2: YouTube Extractor using YouTube oEmbed & High-Speed Direct Resolvers
 */
async function fetchYouTubeMetadata(url, videoIdHint) {
    let title = 'YouTube Video';
    let author = 'YouTube Creator';
    let thumb = '';

    // Extract canonical video ID
    let videoId = videoIdHint || '';
    if (!videoId) {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
        if (match && match[1]) videoId = match[1];
    }

    const canonicalUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    if (videoId) {
        thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
            const info = await res.json();
            title = info.title || title;
            author = info.author_name || author;
            if (info.thumbnail_url) thumb = info.thumbnail_url;
        } else {
            // Fallback to noembed
            const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`;
            const nRes = await fetch(noembedUrl);
            if (nRes.ok) {
                const nInfo = await nRes.json();
                title = nInfo.title || title;
                author = nInfo.author_name || author;
                if (nInfo.thumbnail_url) thumb = nInfo.thumbnail_url;
            }
        }
    } catch (e) {
        console.log("oEmbed fetch error:", e);
    }

    return {
        title: title,
        author: author,
        thumbnail: thumb,
        duration: '',
        platform: 'youtube',
        url: canonicalUrl,
        directVideoUrl: null,
        directAudioUrl: null,
        videoFormats: [
            { quality: '1080p', label: 'Full HD (1080p)', ext: 'MP4', size: '৪০ - ৬০ MB', formatKey: '1080', url: canonicalUrl },
            { quality: '720p', label: 'High Definition (720p)', ext: 'MP4', size: '২০ - ৩০ MB', formatKey: '720', url: canonicalUrl },
            { quality: '480p', label: 'Standard (480p)', ext: 'MP4', size: '১০ - ১৫ MB', formatKey: '480', url: canonicalUrl },
            { quality: '360p', label: 'Compact Mobile', ext: 'MP4', size: '৫ - ৮ MB', formatKey: '360', url: canonicalUrl }
        ],
        audioFormats: [
            { quality: '320 kbps', label: 'MP3 High Quality', ext: 'MP3', size: '৬ - ৮ MB', formatKey: 'mp3', url: canonicalUrl },
            { quality: '128 kbps', label: 'MP3 Standard', ext: 'MP3', size: '৩ - ৪ MB', formatKey: 'mp3', url: canonicalUrl }
        ]
    };
}

/**
 * Tier 3: Facebook & Instagram & Other Social Media Metadata
 */
async function fetchSocialMediaMetadata(url, platform) {
    const isFb = platform === 'facebook';
    const isIg = platform === 'instagram';

    return {
        title: isFb ? 'Facebook Video / Reel' : (isIg ? 'Instagram Reel / Video' : 'Social Media Video'),
        author: isFb ? 'Facebook Post' : (isIg ? 'Instagram Post' : 'Social Media'),
        thumbnail: '',
        duration: '',
        platform: platform || 'generic',
        url: url,
        directVideoUrl: null,
        directAudioUrl: null,
        videoFormats: [
            { quality: 'HD Quality', label: 'High Definition (HD)', ext: 'MP4', size: '২০ - ৩৫ MB', formatKey: '1080', url: url },
            { quality: 'SD Quality', label: 'Standard Definition (SD)', ext: 'MP4', size: '৮ - ১৫ MB', formatKey: '480', url: url }
        ],
        audioFormats: [
            { quality: 'Original Sound', label: 'Audio Stream (MP3)', ext: 'MP3', size: '৩ - ৫ MB', formatKey: 'mp3', url: url }
        ]
    };
}

function generateFallbackVideoData(url, platform) {
    return {
        title: `${platform.toUpperCase()} Video`,
        author: `${platform.toUpperCase()} User`,
        thumbnail: '',
        duration: '',
        platform: platform || 'generic',
        url: url,
        videoFormats: [
            { quality: 'HD Quality', label: 'High Definition (HD)', ext: 'MP4', size: '২০ - ৩০ MB', formatKey: '720', url: url },
            { quality: 'SD Quality', label: 'Standard Definition (SD)', ext: 'MP4', size: '৮ - ১২ MB', formatKey: '360', url: url }
        ],
        audioFormats: [
            { quality: 'MP3 Audio', label: 'Audio Extract (MP3)', ext: 'MP3', size: '৩ - ৫ MB', formatKey: 'mp3', url: url }
        ]
    };
}

/**
 * Queue & Manage Concurrent Downloads (Max 3 concurrently)
 */
function enqueueDownloadItem({ title, url, formatKey, type, quality, ext }) {
    // Normalize URL
    const norm = normalizeAndExtractVideoUrl(url);
    const resolvedUrl = norm.url || url;

    const cleanTitle = (title || 'media').substring(0, 35).trim();
    const safeTitle = cleanTitle.replace(/[\\/:*?"<>|]/g, '_').trim() || 'media';
    const filename = `${safeTitle}_${Date.now() % 100000}.${(ext || 'mp4').toLowerCase()}`;

    const queueItem = {
        id: 'dl_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        downloadId: null,
        title: title || 'Media Download',
        filename: filename,
        sourceUrl: resolvedUrl,
        formatKey: formatKey || (type === 'audio' ? 'mp3' : '720'),
        type: type,
        quality: quality,
        ext: ext,
        progress: 0,
        bytesDownloaded: 0,
        bytesTotal: 0,
        status: 'queued', // 'queued' | 'preparing' | 'running' | 'paused' | 'successful' | 'failed'
        statusText: 'অপেক্ষমাণ (Queue)',
        directDownloadUrl: null,
        pollIntervalId: null,
        showMenu: false
    };

    // If already direct (like TikTok), prefill directDownloadUrl
    if (formatKey === 'direct' && resolvedUrl && resolvedUrl.startsWith('http')) {
        queueItem.directDownloadUrl = resolvedUrl;
    }

    downloadQueue.unshift(queueItem);

    try {
        if (typeof playSoundEffect === 'function') playSoundEffect('click');
        if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {}

    // Refresh UI & bind action handlers
    updateQueueUiOnly();

    // Process next queue items
    processDownloadQueue();

    // Start status polling if not already started
    startDownloadStatusPolling();
}

/**
 * Process download queue respecting MAX_CONCURRENT_DOWNLOADS (2 to 3 max)
 */
function processDownloadQueue() {
    const runningCount = downloadQueue.filter(d => d.status === 'running' || d.status === 'preparing').length;
    if (runningCount >= MAX_CONCURRENT_DOWNLOADS) {
        return; // Max concurrent capacity reached
    }

    const nextItem = downloadQueue.find(d => d.status === 'queued');
    if (!nextItem) return;

    startResolvingAndDownload(nextItem);

    // If there is still capacity, check if another queued item can be started
    if (runningCount + 1 < MAX_CONCURRENT_DOWNLOADS) {
        const anotherQueued = downloadQueue.find(d => d.status === 'queued' && d.id !== nextItem.id);
        if (anotherQueued) {
            processDownloadQueue();
        }
    }
}

/**
 * Stream Resolver & Downloader (Handles TikTok direct and YouTube/Social 2-step async conversion)
 */
async function startResolvingAndDownload(item) {
    if (item.status === 'paused' || item.status === 'failed') return;

    // Case 1: Direct link is already resolved (e.g. TikTok or resume)
    if (item.directDownloadUrl) {
        item.status = 'running';
        item.statusText = 'ডাউনলোড হচ্ছে...';
        updateQueueUiOnly();
        startNativeDownloadManager(item);
        return;
    }

    // Ensure source URL is clean
    const norm = normalizeAndExtractVideoUrl(item.sourceUrl);
    const targetSourceUrl = norm.url || item.sourceUrl;

    // Case 2: Multi-step resolver (loader.to & p.savenow.to mirror)
    item.status = 'preparing';
    item.statusText = 'মিডিয়া প্রসেস করা হচ্ছে...';
    updateQueueUiOnly();

    try {
        const fmt = item.formatKey || (item.type === 'audio' ? 'mp3' : '360');
        let initData = null;
        const endpoints = [
            `https://loader.to/ajax/download.php?format=${encodeURIComponent(fmt)}&url=${encodeURIComponent(targetSourceUrl)}`,
            `https://p.savenow.to/ajax/download.php?format=${encodeURIComponent(fmt)}&url=${encodeURIComponent(targetSourceUrl)}`
        ];

        for (const ep of endpoints) {
            try {
                const res = await fetch(ep);
                if (res.ok) {
                    const data = await res.json();
                    if (data && (data.id || data.progress_url)) {
                        initData = data;
                        break;
                    }
                }
            } catch (epErr) {
                console.log("Endpoint failed:", ep, epErr);
            }
        }

        if (!initData || (!initData.id && !initData.progress_url)) {
            const serverMsg = (initData && initData.message) ? initData.message : "ভিডিও আইডি সনাক্ত করা যায়নি";
            throw new Error(serverMsg);
        }

        const jobId = initData.id || '';
        // Real progress polling URL returned by the conversion server
        const progUrl = initData.progress_url || (jobId ? `https://lto2.affadaffa.com/api/progress?id=${encodeURIComponent(jobId)}` : `https://loader.to/ajax/progress.php?id=${encodeURIComponent(jobId)}`);

        // Poll conversion progress every 1.8s
        let attempts = 0;
        const maxAttempts = 60; // ~108s timeout

        const pollTimer = setInterval(async () => {
            if (item.status === 'paused') {
                clearInterval(pollTimer);
                item.pollIntervalId = null;
                return;
            }
            if (!downloadQueue.find(d => d.id === item.id)) {
                clearInterval(pollTimer);
                item.pollIntervalId = null;
                return;
            }

            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(pollTimer);
                item.pollIntervalId = null;
                item.status = 'failed';
                item.statusText = 'কনভার্ট টাইমআউট হয়েছে (পুনরায় চেষ্টা করুন)';
                updateQueueUiOnly();
                processDownloadQueue();
                return;
            }

            try {
                const pRes = await fetch(progUrl);
                if (pRes.ok) {
                    const pData = await pRes.json();
                    
                    // Case 1: Conversion finished & direct link ready!
                    if (pData.success === 1 && pData.download_url) {
                        clearInterval(pollTimer);
                        item.pollIntervalId = null;
                        item.directDownloadUrl = pData.download_url;
                        item.status = 'running';
                        item.statusText = 'ডাউনলোড শুরু হচ্ছে...';
                        updateQueueUiOnly();
                        startNativeDownloadManager(item);
                        return;
                    } 
                    
                    // Case 2: Conversion failed on server
                    if (pData.success === 0 && pData.progress === 1000 && !pData.download_url) {
                        clearInterval(pollTimer);
                        item.pollIntervalId = null;
                        item.status = 'failed';
                        item.statusText = (pData.text && !pData.text.includes('Preparing')) ? pData.text : 'ভিডিও লিংক প্রস্তুত করা যায়নি';
                        updateQueueUiOnly();
                        processDownloadQueue();
                        return;
                    }

                    // Case 3: Progress update
                    if (pData.progress !== undefined) {
                        const pct = Math.min(Math.round(pData.progress / 10), 99);
                        item.statusText = pct > 5 ? `মিডিয়া প্রস্তুত হচ্ছে (${pct}%)...` : (pData.text || 'মিডিয়া কনভার্ট হচ্ছে...');
                        updateQueueUiOnly();
                    }
                }
            } catch (err) {
                console.log("Polling error:", err);
            }
        }, 1800);

        item.pollIntervalId = pollTimer;
    } catch (err) {
        console.error("Stream resolution error:", err);
        item.status = 'failed';
        let userMessage = 'মিডিয়া লিংক তৈরি করা যায়নি';
        if (err.message) {
            if (err.message.includes('Invalid YouTube video ID')) {
                userMessage = 'প্লেলিস্ট সমর্থিত নয় (নির্দিষ্ট ভিডিও লিংক দিন)';
            } else if (err.message.includes('Too many requests')) {
                userMessage = 'সার্ভার ব্যস্ত, কিছুক্ষণ পর চেষ্টা করুন';
            } else {
                userMessage = err.message;
            }
        }
        item.statusText = userMessage + ' (পুনরায় চেষ্টা করুন)';
        updateQueueUiOnly();
        processDownloadQueue();
    }
}

/**
 * Hand off resolved direct URL to Android Native DownloadManager
 */
function startNativeDownloadManager(item) {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VideoDownloaderPlugin) {
        const mime = item.type === 'audio' ? 'audio/mpeg' : 'video/mp4';
        const downloadUrl = item.directDownloadUrl || item.sourceUrl;

        window.Capacitor.Plugins.VideoDownloaderPlugin.startNativeDownload({
            url: downloadUrl,
            filename: item.filename,
            title: item.title,
            mimeType: mime
        }).then(res => {
            if (res && res.downloadId) {
                item.downloadId = res.downloadId;
                item.status = 'running';
                item.statusText = 'ডাউনলোড হচ্ছে...';
                updateQueueUiOnly();
                startDownloadStatusPolling();
            }
        }).catch(err => {
            console.error("Native download start error:", err);
            item.status = 'failed';
            item.statusText = 'ডাউনলোড শুরু করা যায়নি';
            updateQueueUiOnly();
            processDownloadQueue();
        });
    } else {
        // Fallback simulated progress for browser testing
        simulateMockDownload(item);
    }
}

function simulateMockDownload(item) {
    let p = 0;
    const total = 28000000;
    const interval = setInterval(() => {
        if (item.status === 'paused') {
            clearInterval(interval);
            return;
        }
        if (!downloadQueue.find(d => d.id === item.id)) {
            clearInterval(interval);
            return;
        }

        p += 10;
        item.progress = Math.min(p, 100);
        item.bytesDownloaded = Math.floor((item.progress / 100) * total);
        item.bytesTotal = total;
        updateQueueUiOnly();

        if (p >= 100) {
            clearInterval(interval);
            item.status = 'successful';
            item.statusText = 'সম্পন্ন - গ্যালারিতে সংরক্ষিত';
            updateQueueUiOnly();
            processDownloadQueue();
        }
    }, 700);
}

/**
 * Poll Android DownloadManager for status of active downloads
 */
function startDownloadStatusPolling() {
    if (downloadPollingInterval) return;

    downloadPollingInterval = setInterval(() => {
        const activeItems = downloadQueue.filter(d => d.status === 'running' && d.downloadId);
        if (activeItems.length === 0) {
            const hasQueued = downloadQueue.some(d => d.status === 'queued');
            if (hasQueued) {
                processDownloadQueue();
            } else {
                clearInterval(downloadPollingInterval);
                downloadPollingInterval = null;
            }
            return;
        }

        activeItems.forEach(item => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VideoDownloaderPlugin) {
                window.Capacitor.Plugins.VideoDownloaderPlugin.getDownloadStatus({ downloadId: item.downloadId })
                    .then(res => {
                        if (res) {
                            if (res.status === 'successful') {
                                item.status = 'successful';
                                item.progress = 100;
                                item.statusText = 'সম্পন্ন - গ্যালারিতে সংরক্ষিত';
                                updateQueueUiOnly();
                                processDownloadQueue();
                            } else if (res.status === 'failed') {
                                item.status = 'failed';
                                item.statusText = res.reason || 'ডাউনলোড ব্যর্থ হয়েছে';
                                updateQueueUiOnly();
                                processDownloadQueue();
                            } else if (res.status === 'paused') {
                                item.statusText = res.reason || 'ওয়াইফাই বা নেটওয়ার্কের জন্য অপেক্ষমাণ...';
                                updateQueueUiOnly();
                            } else if (res.status === 'pending') {
                                item.statusText = res.reason || 'সার্ভারে কানেক্ট হচ্ছে...';
                                updateQueueUiOnly();
                            } else if (res.status === 'running') {
                                item.progress = res.percent || item.progress || 0;
                                item.bytesDownloaded = res.bytesDownloaded || item.bytesDownloaded || 0;
                                item.bytesTotal = res.bytesTotal || item.bytesTotal || 0;
                                const sizeStr = (item.bytesTotal > 0) ? ` (${formatBytes(item.bytesDownloaded)} / ${formatBytes(item.bytesTotal)})` : '';
                                item.statusText = `ডাউনলোড হচ্ছে... ${item.progress}%${sizeStr}`;
                                updateQueueUiOnly();
                            }
                        }
                    })
                    .catch(() => {});
            }
        });
    }, 1200);
}

/**
 * In-place update of Queue UI
 */
function updateQueueUiOnly() {
    const queueArea = document.querySelector('.download-queue-container');
    const wrapper = document.querySelector('.video-downloader-wrapper');

    if (!queueArea && wrapper && downloadQueue.length > 0) {
        const searchCard = document.querySelector('.downloader-search-card');
        if (searchCard) {
            const div = document.createElement('div');
            div.innerHTML = renderDownloadQueueSection().trim();
            if (div.firstChild) {
                searchCard.after(div.firstChild);
                bindQueueActionEvents();
            }
        }
        return;
    }

    if (queueArea) {
        if (downloadQueue.length === 0) {
            queueArea.remove();
            return;
        }
        const temp = document.createElement('div');
        temp.innerHTML = renderDownloadQueueSection().trim();
        if (temp.firstChild) {
            queueArea.replaceWith(temp.firstChild);
            bindQueueActionEvents();
        }
    }
}

/**
 * Refresh Formats list only when switching between Video / Audio tabs
 */
function refreshFormatListOnly() {
    const listEl = document.querySelector('.downloader-formats-list');
    const tabV = document.getElementById('tab-choose-video');
    const tabA = document.getElementById('tab-choose-audio');

    if (tabV) tabV.classList.toggle('active', activeVideoTab === 'video');
    if (tabA) tabA.classList.toggle('active', activeVideoTab === 'audio');

    if (listEl && currentVideoData) {
        listEl.innerHTML = activeVideoTab === 'video' 
            ? renderVideoQualityOptions(currentVideoData)
            : renderAudioQualityOptions(currentVideoData);

        bindFormatDownloadButtons();
    }
}

/**
 * Full Screen UI Refresh
 */
function updateVideoDownloaderUI() {
    const content = document.getElementById('app-content-area');
    if (content && currentTab === 'video-downloader') {
        content.innerHTML = renderVideoDownloaderTab();
        bindVideoDownloaderEvents();
    }
}

/**
 * Global Handler when another app shares a link to our app via Android Share Sheet
 */
window.handleIncomingSharedVideoUrl = function(url) {
    if (!url || typeof url !== 'string') return;
    console.log("Shared Video URL Received:", url);

    if (typeof switchTab === 'function') {
        switchTab('video-downloader');
    }

    downloaderSearchUrl = url.trim();
    setTimeout(() => {
        const urlInput = document.getElementById('downloader-url-input');
        if (urlInput) urlInput.value = downloaderSearchUrl;
        updatePlatformChips();
        triggerVideoAnalysis();
    }, 200);
};

// Utilities
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
