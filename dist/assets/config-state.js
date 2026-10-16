/* ==========================================================================
   CONFIG & GLOBAL APP STATE
   ========================================================================== */
var currentTab = 'home';
var currentStreakView = 'home';
var currentRoutineTab = 'menu';

// Language State & Real-time Translation Manager (Default: Bangla)
var currentLang = localStorage.getItem('APP_LANGUAGE') || 'bn';

function setAppLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('APP_LANGUAGE', lang);
    if (typeof switchTab === 'function') {
        switchTab(currentTab || 'home');
    }
}

var i18n = {
    bn: {
        appSubtitle: 'আপনার মনোযোগ ও মানসিক সচেতনতা রক্ষা করুন',
        protected: 'সুরক্ষিত',
        cleanDays: 'দিন ক্লিন',
        currentRank: 'বর্তমান পদবী',
        details: 'ডিটেইলস',
        socialControl: 'সোশ্যাল কন্ট্রোল',
        networkControl: 'নেটওয়ার্ক কন্ট্রোল',
        networkControlSub: 'ওয়াইফাই ও ডাটা নিয়ন্ত্রণ',
        wifi: 'ওয়াইফাই',
        mobileData: 'মোবাইল ডাটা',
        firewall: 'ফায়ারওয়াল',
        manage: 'ম্যানেজ করুন',
        unlockAlert: 'আনলক অ্যালার্ট',
        focusTimeToday: 'Focus Time Today',
        focusTimeSub: 'আজকের মোট ফোকাস টাইম',
        protectionDuration: 'Protection Duration',
        protectionSub: 'মোট সুরক্ষিত সময়কাল',
        startFocusSession: 'Start Deep Focus Session',
        focusSessionRunning: 'ফোকাস সেশন চলমান...',
        panicSos: 'খারাপ চিন্তা বা তাড়না আসলে চাপুন (Panic SOS)',
        featureGuide: 'ফিচার গাইড',
        featureGuideSub: 'অ্যাপের মূল ব্যবহার নির্দেশিকা',
        view: 'দেখুন',
        days: 'দিন',
        hours: 'ঘণ্টা',
        videoDownloader: 'ভিডিও ডাউনলোডার',
        videoDownloaderSub: 'YouTube, Facebook, Insta, TikTok ভিডিও ও অডিও ডাউনলোড',
        navTasks: 'টাস্ক',
        deepFocus: 'ডিপ ফোকাস',
        deepFocusSub: 'মনোযোগ ও পড়াশোনার ফোকাস টাইমার সেশন'
    },
    en: {
        appSubtitle: 'Protect your attention & mental clarity',
        protected: 'PROTECTED',
        cleanDays: 'Days Clean',
        currentRank: 'Current Rank',
        details: 'Details',
        socialControl: 'Social Control',
        networkControl: 'Network Control',
        networkControlSub: 'Wi-Fi & Data Firewall',
        wifi: 'Wi-Fi',
        mobileData: 'Mobile Data',
        firewall: 'Firewall',
        manage: 'Manage',
        unlockAlert: 'Unlock Alert',
        focusTimeToday: 'Focus Time Today',
        focusTimeSub: 'Total focus time today',
        protectionDuration: 'Protection Duration',
        protectionSub: 'Total protected duration',
        startFocusSession: 'Start Deep Focus Session',
        focusSessionRunning: 'Focus Session Active...',
        panicSos: 'Panic SOS (Tap on Urge)',
        featureGuide: 'Feature Guide',
        featureGuideSub: 'App usage & feature guide',
        view: 'View',
        days: 'Days',
        hours: 'Hours',
        videoDownloader: 'Video Downloader',
        videoDownloaderSub: 'Download YouTube, Facebook, Insta, TikTok Videos & Audio',
        navTasks: 'Tasks',
        deepFocus: 'Deep Focus',
        deepFocusSub: 'Distraction-free focus timer session'
    }
};

function t(key) {
    const lang = currentLang || 'bn';
    if (i18n[lang] && i18n[lang][key]) {
        return i18n[lang][key];
    }
    return (i18n.bn && i18n.bn[key]) || key;
}

// Core Metrics & State
var focusMinutes = parseInt(localStorage.getItem('FOCUS_TIME_MINS') || '0', 10);
var streakStartTime = parseInt(localStorage.getItem('STREAK_START_TIME') || Date.now().toString(), 10);
if (!localStorage.getItem('STREAK_START_TIME')) {
    localStorage.setItem('STREAK_START_TIME', streakStartTime.toString());
}
if (!localStorage.getItem('APP_INSTALL_TIMESTAMP')) {
    localStorage.setItem('APP_INSTALL_TIMESTAMP', streakStartTime.toString());
}

// Today Focus Time Helper Functions (রিয়েল-টাইম দৈনিক ফোকাস টাইম হিসাব)
function getTodayFocusMinutes() {
    const todayKey = 'FOCUS_MINS_' + new Date().toISOString().split('T')[0];
    return parseInt(localStorage.getItem(todayKey) || '0', 10);
}

function addTodayFocusMinutes(mins) {
    if (!mins || mins <= 0) return getTodayFocusMinutes();
    const todayKey = 'FOCUS_MINS_' + new Date().toISOString().split('T')[0];
    const current = getTodayFocusMinutes();
    const updated = current + mins;
    localStorage.setItem(todayKey, updated.toString());

    var totalMins = parseInt(localStorage.getItem('FOCUS_TIME_MINS') || '0', 10) + mins;
    localStorage.setItem('FOCUS_TIME_MINS', totalMins.toString());
    focusMinutes = totalMins;
    return updated;
}

// Protection Duration Helper Function (অ্যাপ ইনস্টল/সেটআপের পর থেকে মোট দিন ও ঘণ্টার রিয়েল-টাইম কাউন্ট)
function getProtectionDurationText() {
    let installTime = parseInt(localStorage.getItem('APP_INSTALL_TIMESTAMP') || '0', 10);
    if (!installTime || isNaN(installTime)) {
        installTime = parseInt(localStorage.getItem('STREAK_START_TIME') || Date.now().toString(), 10);
        localStorage.setItem('APP_INSTALL_TIMESTAMP', installTime.toString());
    }
    const diffMs = Math.max(0, Date.now() - installTime);
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    const daysLabel = currentLang === 'en' ? 'Days' : 'দিন';
    const hoursLabel = currentLang === 'en' ? 'Hours' : 'ঘণ্টা';

    if (days > 0) {
        return `${days} ${daysLabel} ${hours} ${hoursLabel}`;
    } else {
        return `${hours} ${hoursLabel}`;
    }
}

// Focus Session State
var focusSessionEndTime = parseInt(localStorage.getItem('FOCUS_SESSION_END_TIME') || '0', 10);
var isFocusSessionActive = focusSessionEndTime > Date.now();
var focusTimerInterval = null;
var spiralAnimInterval = null;
var speechPromptInterval = null;

// Theme Management
var currentTheme = localStorage.getItem('APP_THEME') || 'dark';

// System Ranks Data
var RANKS_DATA = [
    { days: 1,   title: "সংগ্রামী পথিক",    desc: "Reach 1 day" },
    { days: 3,   title: "ধৈর্যশীল সাধক",    desc: "Reach 3 days" },
    { days: 5,   title: "অটল প্রহরী",      desc: "Reach 5 days" },
    { days: 7,   title: "নবীন বীর",        desc: "Reach 7 days" },
    { days: 10,  title: "ইস্পাত সংকল্প",    desc: "Reach 10 days" },
    { days: 14,  title: "দৃঢ়চেতা যোদ্ধা",   desc: "Reach 14 days" },
    { days: 21,  title: "আত্মজয়ী সাধক",    desc: "Reach 21 days" },
    { days: 30,  title: "লৌহমানব",         desc: "Reach 30 days" },
    { days: 60,  title: "নির্ভীক অগ্রনায়ক",  desc: "Reach 60 days" },
    { days: 90,  title: "অদম্য সেনাপতি",    desc: "Reach 90 days" },
    { days: 120, title: "মর্যাদাবান বীর",   desc: "Reach 120 days" },
    { days: 150, title: "প্রশান্ত অধিনায়ক",  desc: "Reach 150 days" },
    { days: 200, title: "মহাবীর",           desc: "Reach 200 days" },
    { days: 220, title: "অটল ব্যক্তিত্ব",   desc: "Reach 220 days" },
    { days: 250, title: "আত্মনিয়ন্ত্রণ প্রধান", desc: "Reach 250 days" },
    { days: 300, title: "বিজয়ী পুরুষ",     desc: "Reach 300 days" },
    { days: 365, title: "লৌহদৃঢ় জীবনাদর্শ", desc: "Reach 365 days" }
];

// Motivational Quotes Data
var BENGALI_MOTIVATIONS = [
    { quote: "শক্তি শারীরিক সক্ষমতা থেকে আসে না। এটি আসে এক অদম্য ইচ্ছাশক্তি থেকে।", author: "মহাত্মা গান্ধী" },
    { quote: "যে নিজের মন ও প্রবৃত্তি জয় করেছে, সে প্রকৃত স্বাধীন ও শক্তিশালী।", author: "হিতোপদেশ" },
    { quote: "সাময়িক আরাম আপনার ভবিষ্যতের মর্যাদা ও আত্মসম্মানকে ধ্বংস করে দেয়।", author: "আইরন উইল বার্তা" },
    { quote: "আত্মনিয়ন্ত্রণ হলো আসল শক্তি। শান্ত থাকাই হলো আসল শ্রেষ্ঠত্ব।", author: "লিলিয়ান হুইটিং" },
    { quote: "নিজের কামনা-বাসনার দাসত্ব করার চেয়ে বড় বন্দিদশা আর হতে পারে না।", author: "আত্মশুদ্ধি বার্তা" },
    { quote: "কঠিন প্রলোভনের সাথে যুদ্ধেই সবচেয়ে চরিত্রবান ও যোগ্য মানুষের জন্ম হয়।", author: "এপিকটেটাস" },
    { quote: "অনুতাপের যন্ত্রণার চেয়ে শৃঙ্খলার যন্ত্রণা অনেক বেশি সহনীয় ও সম্মানজনক।", author: "জিম রন" },
    { quote: "আপনার সবচেয়ে বড় প্রতিপক্ষ অন্য কেউ নয়; আপনার নিজের মনের দুর্বল চিন্তা।", author: "আইরন উইল বার্তা" },
    { quote: "প্রতিটি প্রলোভনকে 'না' বলা মানে আপনার মহান লক্ষ্যকে 'হ্যাঁ' বলা।", author: "স্টিভ জবস" },
    { quote: "ভুল করা কোনো স্থায়ী পরাজয় নয়, হাল ছেড়ে দেওয়া আসল পতন।", author: "কনফুসিয়াস" },
    { quote: "ধৈর্য একটি তিক্ত পথ, কিন্তু এর ফল সবসময় সুমিষ্ট হয়।", author: "রুশো" },
    { quote: "যে ব্যক্তি নিজের চোখকে সংযত রাখে, তার অন্তরে অনাবিল প্রশান্তি থাকে।", author: "ইসলামিক হিতোপদেশ" }
];

// Daily Target & Alarm States
var dailyTarget = JSON.parse(localStorage.getItem('DAILY_TARGET_CONFIG') || JSON.stringify({
    title: 'দরূদ শরীফ',
    meaning: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ (আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ)',
    goal: 100,
    completedCount: 0,
    lastTrackedDate: new Date().toDateString(),
    audioData: null
}));

var alarms = JSON.parse(localStorage.getItem('CUSTOM_ALARMS') || '[]');
var unlockGuard = JSON.parse(localStorage.getItem('UNLOCK_GUARD') || JSON.stringify({
    enabled: false,
    text: 'সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম',
    audioType: 'durood_sharif'
}));

// Smart Tasbih & Lifetime Zikr State
var tasbihMode = localStorage.getItem('TASBIH_MODE') || 'general'; // 'general' or 'fatimi'
var tasbihCount = parseInt(localStorage.getItem('TASBIH_COUNT') || '0', 10);

function getLifetimeZikrCount() {
    return parseInt(localStorage.getItem('LIFETIME_ZIKR_COUNT') || '0', 10);
}

function incrementLifetimeZikrCount(by) {
    var step = (typeof by === 'number' && !isNaN(by)) ? by : 1;
    var current = getLifetimeZikrCount();
    var updated = current + step;
    localStorage.setItem('LIFETIME_ZIKR_COUNT', updated.toString());
    return updated;
}

var isAutoPlaying = false;
var selectedTrackingRankIndex = -1;
var targetAudioPlayer = null;
var alarmAudioPlayer = null;
