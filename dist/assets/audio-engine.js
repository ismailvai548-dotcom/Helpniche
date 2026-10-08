/* ==========================================================================
   SUPABASE AUDIO ENGINE, OFFLINE CACHE & FOCUS AUDIO INTEGRATION
   ========================================================================== */
var CACHE_NAME = 'focus-audio-cache';
var SUPABASE_AUDIO_CATEGORIES = [
    {
        id: 'durood_builtin',
        category: 'দুরূদ শরীফ (Built-in Audio)',
        tracks: [
            { id: 'durood_1', title: 'দুরূদ শরীফ (অফলাইন সাউন্ড)', url: 'raw/durood', isRaw: true }
        ]
    },
    {
        id: 'motivation',
        category: 'মোটিভেশন (Motivation)',
        tracks: [
            { id: 'mot_1', title: 'মোটিভেশনাল স্পিচ ১', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/motivation.mp3' },
            { id: 'mot_2', title: 'মোটিভেশনাল স্পিচ ২', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/motivational.mp3' }
        ]
    },
    {
        id: 'rain_sound',
        category: 'বৃষ্টির শব্দ (Rain Sound)',
        tracks: [
            { id: 'rain_1', title: 'শান্ত নিঝুম বৃষ্টির শব্দ (৩০ মিনিট)', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/Rain_Sounds_ASMR_Heavy_Rain_on_Window_30_Minute_Rain_Sounds_for.mp3' }
        ]
    },
    {
        id: 'gojol',
        category: 'গজল (Gojol / Nasheed)',
        tracks: [
            { id: 'gojol_1', title: 'আর কত কাল আমি কাঁদবো', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/r%20koto%20kal%20ami%20kadbo.mp3' },
            { id: 'gojol_2', title: 'মুস্তফা মুস্তফা আপ খাইরুল বাশার', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/New_Heart_Touching_Naat_Mustafa_Mustafa_Ap_Khair_Ul_Bashar_Muhammad.mp3' },
            { id: 'gojol_3', title: 'ভো শহর-ই-মোহাব্বত', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/Wo_Shehr_e_Mohabbat_Beautiful_Naat_Sharif_Zohaib_AshrafiMP3_70K.mp3' },
            { id: 'gojol_4', title: 'মনোমুগ্ধকর ইসলামিক গজল', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/gojol.mp3' },
            { id: 'gojol_5', title: 'ভো মেরা নবী হ্যায়', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/Woh_Mera_Nabi_Hai_Syed_Hassan_Ullah_Hussaini_Muhammad_Shaffan_Muhammad.mp3' },
            { id: 'gojol_6', title: 'ভালোবাসার দাবি', url: 'https://dlxmzzvcpoysoouakadt.supabase.co/storage/v1/object/public/helpniche/valobashar%20dabi.mp3' }
        ]
    }
];

var selectedAudioUrl = localStorage.getItem('SELECTED_SUPABASE_AUDIO_URL') || 'raw/durood';
var selectedAudioType = localStorage.getItem('SELECTED_FOCUS_AUDIO_TYPE') || 'library';
var selectedAudioName = localStorage.getItem('SELECTED_FOCUS_AUDIO_NAME') || 'দুরূদ শরীফ (Durood Sharif)';

async function isAudioCached(url) {
    if (!url || url.startsWith('raw/') || url.startsWith('content://')) return true;
    if (!('caches' in window)) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(url);
        return !!response;
    } catch (e) { return false; }
}

async function isCategoryFullyCached(cat) {
    for (let track of cat.tracks) {
        const cached = await isAudioCached(track.url);
        if (!cached) return false;
    }
    return true;
}

async function downloadAndCacheAudio(url) {
    if (!url || url.startsWith('raw/') || url.startsWith('content://')) return url;
    if (!('caches' in window)) return url;
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response.clone());
    } catch (e) { console.error('Cache error:', e); }
}

async function getAudioPlaybackUrl(url) {
    if (!url || url.startsWith('raw/') || url.startsWith('content://')) return url;
    if (!('caches' in window)) return url;
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(url);
        if (response) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
    } catch (e) {}
    return url;
}

class FocusAudioEngine {
    constructor() {
        this.bgAudio = new Audio();
        this.bgAudio.crossOrigin = 'anonymous';
        this.bgAudio.loop = true;
        this.bgAudio.volume = 0.7;
        this.isPlaying = false;
        this.isMuted = false;
        this.useSynthFallback = false;
        this.audioCtx = null;
        this.masterGain = null;
        this.oscs = [];
        this.motivationalQuotes = [
            "আপনার মনোযোগ বজায় রাখুন। প্রতিটি মুহূর্ত আপনার নতুন বিজয়ের সূচনা করছে।",
            "ধৈর্য ও আত্মনিয়ন্ত্রণই সফলতার মূল চাবিকাঠি।",
            "সাময়িক প্রলোভন আপনার ভবিষ্যৎ বা মনকে নষ্ট করতে পারবে না।",
            "মনোযোগ ধরে রাখুন, আপনার ভেতরের শক্তি যেকোনো তাড়নার চেয়ে শক্তিশালী।"
        ];
        this.quoteIndex = 0;
    }

    setMuted(muted) {
        this.isMuted = !!muted;
        if (this.bgAudio) {
            this.bgAudio.muted = this.isMuted;
        }
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FocusAudioPlugin && window.Capacitor.Plugins.FocusAudioPlugin.setMuted) {
            try {
                window.Capacitor.Plugins.FocusAudioPlugin.setMuted({ muted: this.isMuted });
            } catch (e) {}
        }
    }

    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    async start() {
        if (this.isPlaying) return;

        // Try playing via Native FocusAudioPlugin (Supports Foreground Service & Local SAF Content URIs)
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FocusAudioPlugin) {
            try {
                const info = await window.Capacitor.Plugins.FocusAudioPlugin.getSelectedAudio();
                const uriToPlay = info.audioUri || selectedAudioUrl;
                const typeToPlay = info.audioType || selectedAudioType;
                const nameToPlay = info.audioName || selectedAudioName;

                await window.Capacitor.Plugins.FocusAudioPlugin.playAudio({
                    audioUri: uriToPlay,
                    audioType: typeToPlay,
                    audioName: nameToPlay
                });
                this.isPlaying = true;
                this.startVoicePrompts();
                return;
            } catch (e) {
                console.error("FocusAudioPlugin play failed, falling back to Web Audio:", e);
            }
        }

        // Web Audio Fallback
        const playUrl = await getAudioPlaybackUrl(selectedAudioUrl);
        this.bgAudio.src = playUrl;

        this.bgAudio.play().then(() => {
            this.isPlaying = true;
            this.startVoicePrompts();
        }).catch(() => {
            this.useSynthFallback = true;
            this.startSynth();
            this.isPlaying = true;
            this.startVoicePrompts();
        });
    }

    stop(isCompleted = false) {
        if (!this.isPlaying) return;

        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FocusAudioPlugin) {
            try {
                window.Capacitor.Plugins.FocusAudioPlugin.stopAudio();
            } catch (e) {}
        }

        try {
            this.bgAudio.pause();
            this.bgAudio.currentTime = 0;
        } catch (e) {}

        if (this.useSynthFallback) this.stopSynth();
        if (speechPromptInterval) clearInterval(speechPromptInterval);
        this.isPlaying = false;

        if (isCompleted) {
            this.speakPrompt("আলহামদুলিল্লাহ! আপনার ফোকাস সেশন সফলভাবে সম্পন্ন হয়েছে।");
        }
    }

    startVoicePrompts() {
        if (speechPromptInterval) clearInterval(speechPromptInterval);
        setTimeout(() => { if (this.isPlaying) this.speakNext(); }, 10000);
        speechPromptInterval = setInterval(() => { if (this.isPlaying) this.speakNext(); }, 90000);
    }

    speakNext() {
        const text = this.motivationalQuotes[this.quoteIndex % this.motivationalQuotes.length];
        this.quoteIndex++;
        this.speakPrompt(text);
    }

    speakPrompt(text) {
        if (!('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'bn-BD';
            utter.rate = 0.9;
            window.speechSynthesis.speak(utter);
        } catch (e) {}
    }

    startSynth() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
            this.masterGain.gain.exponentialRampToValueAtTime(0.15, this.audioCtx.currentTime + 3);

            [432, 540, 648].forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
                gain.gain.setValueAtTime(0.06 / (idx + 1), this.audioCtx.currentTime);
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start();
                this.oscs.push({ osc, gain });
            });
            this.masterGain.connect(this.audioCtx.destination);
        } catch (e) {}
    }

    stopSynth() {
        if (!this.audioCtx || !this.masterGain) return;
        try {
            this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1);
            setTimeout(() => {
                this.oscs.forEach(o => { try { o.osc.stop(); } catch(e){} });
                this.oscs = [];
                if (this.audioCtx) this.audioCtx.close();
            }, 1200);
        } catch (e) {}
    }
}

var audioEngine = new FocusAudioEngine();
