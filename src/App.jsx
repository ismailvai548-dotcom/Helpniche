import React, { useState, useEffect, useRef } from 'react';
import {
  checkDailyStatus,
  incrementDuroodCount,
  setSnooze,
  isSnoozed,
  getAppSettings,
  toggleShortsGuard,
  unlockAdminWithSecretCode,
  TELEGRAM_ADMIN_LINK,
  addCustomBlockSite,
  removeCustomBlockSite,
  checkIsUrlBlocked,
  getLifetimeZikrCount,
  incrementLifetimeZikrCount,
} from './storage';

export default function App() {
  const [tab, setTab] = useState('home'); // 'home', 'focus', 'social', 'streak', 'routine', 'settings'
  const [routineSubTab, setRoutineSubTab] = useState('daily'); // 'daily', 'tasbih', 'alarm', 'guard'
  const [lang, setLang] = useState('bn'); // 'bn' | 'en'

  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });
  const [showUnlockPopup, setShowUnlockPopup] = useState(false);

  const [settings, setSettings] = useState(getAppSettings());
  const [cooldownCountdown, setCooldownCountdown] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showFeatureGuideModal, setShowFeatureGuideModal] = useState(false);
  const [showUnlockAlertModal, setShowUnlockAlertModal] = useState(false);
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);

  const [newSiteInput, setNewSiteInput] = useState('');
  const [testUrlInput, setTestUrlInput] = useState('');
  const [blockCheckResult, setBlockCheckResult] = useState(null);

  // Smart Tasbih State
  const [tasbihMode, setTasbihMode] = useState(localStorage.getItem('TASBIH_MODE') || 'general');
  const [tasbihCount, setTasbihCount] = useState(parseInt(localStorage.getItem('TASBIH_COUNT') || '0', 10));
  const [lifetimeZikr, setLifetimeZikr] = useState(getLifetimeZikrCount());

  // Onboarding Permissions State
  const [onboardingStatus, setOnboardingStatus] = useState({
    vpnGranted: false,
    adminActive: false,
    restrictedSettingsDone: localStorage.getItem('RESTRICTED_SETTINGS_PROMPTED') === 'true',
    accessibilityEnabled: false,
    batteryBypassed: false
  });
  const [showOnboardingModal, setShowOnboardingModal] = useState(true);

  // VPN System-Wide vs Smart On-Demand Mode State
  const [vpnSystemWide, setVpnSystemWide] = useState(true);

  // Focus Session State
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [customMinutesInput, setCustomMinutesInput] = useState('');

  const audioRef = useRef(null);
  const target = 100;

  useEffect(() => {
    checkDailyStatus();
    refreshData();

    window.syncOnboardingPermissionStatus = (status) => {
      if (status) {
        setOnboardingStatus(prev => ({
          ...prev,
          ...status,
          restrictedSettingsDone: (status.restrictedSettingsDone || localStorage.getItem('RESTRICTED_SETTINGS_PROMPTED') === 'true')
        }));
      }
    };

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.getOnboardingStatus) {
      window.Capacitor.Plugins.UnlockPlugin.getOnboardingStatus().then(res => {
        if (res) {
          setOnboardingStatus(prev => ({
            ...prev,
            ...res,
            restrictedSettingsDone: (res.restrictedSettingsDone || localStorage.getItem('RESTRICTED_SETTINGS_PROMPTED') === 'true')
          }));
        }
      }).catch(() => {});
    }

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.getSystemWideAdBlockStatus) {
      window.Capacitor.Plugins.UnlockPlugin.getSystemWideAdBlockStatus().then(res => {
        if (res && typeof res.enabled === 'boolean') {
          setVpnSystemWide(res.enabled);
        }
      }).catch(() => {});
    }

    const timer = setInterval(() => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);

      const diff = midnight - now;
      const h = String(Math.max(0, Math.floor(diff / (1000 * 60 * 60)))).padStart(2, '0');
      const m = String(Math.max(0, Math.floor((diff / (1000 * 60)) % 60))).padStart(2, '0');
      const s = String(Math.max(0, Math.floor((diff / 1000) % 60))).padStart(2, '0');

      setTimeLeft({ h, m, s });

      const currentSettings = getAppSettings();
      if (currentSettings.cooldownUntil > Date.now()) {
        const remaining = Math.ceil((currentSettings.cooldownUntil - Date.now()) / 1000);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setCooldownCountdown(`${mins}মি. ${secs}সে.`);
      } else {
        setCooldownCountdown('');
      }

      if (diff <= 1000) {
        checkDailyStatus();
        refreshData();
      }
    }, 1000);

    checkBrowserInstalled();
    const handleVisChange = () => {
      if (document.visibilityState === 'visible') {
        checkBrowserInstalled();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);

    let browserProgressSub = null;
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.addListener) {
      window.Capacitor.Plugins.UnlockPlugin.addListener('browserDownloadProgress', (data) => {
        if (data && typeof data.progress === 'number') {
          setBrowserDownloadProgress(data.progress);
        }
      }).then(sub => {
        browserProgressSub = sub;
      }).catch(() => {});
    }

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisChange);
      if (browserProgressSub && typeof browserProgressSub.remove === 'function') {
        browserProgressSub.remove();
      }
    };
  }, []);

  const checkBrowserInstalled = () => {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled) {
      window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled().then(res => {
        if (res && typeof res.installed === 'boolean') {
          setIsBrowserInstalled(res.installed);
        }
      }).catch(() => {});
    }
  };

  const handleBrowserClick = () => {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled) {
      window.Capacitor.Plugins.UnlockPlugin.isBrowserInstalled().then(res => {
        if (res && res.installed) {
          setIsBrowserInstalled(true);
          window.Capacitor.Plugins.UnlockPlugin.openBrowser().catch(err => {
            console.log('Open browser err:', err);
          });
        } else {
          setIsBrowserInstalled(false);
          setShowBrowserInstallModal(true);
        }
      }).catch(() => {
        setShowBrowserInstallModal(true);
      });
    } else {
      setShowBrowserInstallModal(true);
    }
  };

  const handleStartBrowserDownload = () => {
    setBrowserDownloading(true);
    setBrowserDownloadProgress(0);
    setBrowserDownloadError('');

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.downloadAndInstallBrowser) {
      window.Capacitor.Plugins.UnlockPlugin.downloadAndInstallBrowser({
        url: 'https://github.com/ismailvai548-dotcom/helpniche-web/releases/download/v1.0.1/Helpniche.Browser.apk'
      }).then(res => {
        setBrowserDownloading(false);
        setBrowserDownloadProgress(100);
        setShowBrowserInstallModal(false);
      }).catch(err => {
        setBrowserDownloading(false);
        setBrowserDownloadError(typeof err === 'string' ? err : (err?.message || 'ডাউনলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।'));
      });
    } else {
      window.open('https://github.com/ismailvai548-dotcom/helpniche-web/releases/download/v1.0.1/Helpniche.Browser.apk', '_blank');
      setBrowserDownloading(false);
    }
  };

  const refreshData = () => {
    setCount(parseInt(localStorage.getItem('durood_count') || '0', 10));
    setSettings(getAppSettings());
    setLifetimeZikr(getLifetimeZikrCount());
  };

  const triggerHaptic = (type = 'single') => {
    try {
      if (type === 'double') {
        if ('vibrate' in navigator) navigator.vibrate([150, 100, 150]);
      } else {
        if ('vibrate' in navigator) navigator.vibrate(40);
      }
    } catch (e) {}
  };

  const playDuroodAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleRead = () => {
    const updated = incrementDuroodCount();
    setCount(updated);
    const updatedLifetime = incrementLifetimeZikrCount(1);
    setLifetimeZikr(updatedLifetime);
    triggerHaptic('single');
  };

  const handleTasbihTap = () => {
    const nextCount = tasbihCount + 1;
    setTasbihCount(nextCount);
    localStorage.setItem('TASBIH_COUNT', nextCount.toString());

    const newLifetime = incrementLifetimeZikrCount(1);
    setLifetimeZikr(newLifetime);

    if (tasbihMode === 'fatimi' && (nextCount === 33 || nextCount === 66 || nextCount === 100)) {
      triggerHaptic('double');
    } else {
      triggerHaptic('single');
    }
  };

  const handleResetTasbih = (e) => {
    if (e) e.stopPropagation();
    setTasbihCount(0);
    localStorage.setItem('TASBIH_COUNT', '0');
  };

  const handleSwitchTasbihMode = (mode) => {
    setTasbihMode(mode);
    localStorage.setItem('TASBIH_MODE', mode);
  };

  const handleSnooze = () => {
    setSnooze(1);
    setShowUnlockPopup(false);
    alert('১ ঘণ্টার জন্য পজ করা হয়েছে।');
  };

  const handleToggleShorts = () => {
    const res = toggleShortsGuard();
    if (!res.success) {
      alert(res.message);
    } else {
      setSettings(getAppSettings());
    }
  };

  const handleAdminCodeSubmit = (e) => {
    e.preventDefault();
    if (unlockAdminWithSecretCode(secretCodeInput)) {
      setSettings(getAppSettings());
      setShowTelegramModal(false);
      setSecretCodeInput('');
      setCodeError(false);
      alert('সফল হয়েছে! ডিভাইস অ্যাডমিন গার্ড সাময়িকভাবে বন্ধ করা হয়েছে।');
    } else {
      setCodeError(true);
    }
  };

  const handleAddSite = (e) => {
    e.preventDefault();
    if (!newSiteInput) return;
    addCustomBlockSite(newSiteInput);
    setNewSiteInput('');
    setSettings(getAppSettings());
  };

  const handleRemoveSite = (site) => {
    removeCustomBlockSite(site);
    setSettings(getAppSettings());
  };

  const handleTestUrl = (e) => {
    e.preventDefault();
    if (!testUrlInput) return;
    const res = checkIsUrlBlocked(testUrlInput);
    setBlockCheckResult(res);
  };

  // Fatimi details calculation
  let fatimiArabic = 'سُبْحَانَ ٱللَّٰهِ';
  let fatimiTitle = 'সুবহানাল্লাহ (১–৩৩)';

  if (tasbihMode === 'fatimi') {
    if (tasbihCount < 33) {
      fatimiArabic = 'سُبْحَانَ ٱللَّٰهِ';
      fatimiTitle = 'সুবহানাল্লাহ (১–৩৩)';
    } else if (tasbihCount < 66) {
      fatimiArabic = 'ٱلْحَمْدُ لِلَّٰهِ';
      fatimiTitle = 'আলহামদুলিল্লাহ (৩৪–৬৬)';
    } else if (tasbihCount < 100) {
      fatimiArabic = 'ٱللَّٰهُ أَكْبَرُ';
      fatimiTitle = 'আল্লাহু আকবার (৬৭–১০০)';
    } else {
      fatimiArabic = 'مَا شَاءَ ٱللَّٰهُ';
      fatimiTitle = '১০০ বার সম্পূর্ণ';
    }
  }

  let completedOnboardingCount = 0;
  if (onboardingStatus.vpnGranted) completedOnboardingCount++;
  if (onboardingStatus.adminActive) completedOnboardingCount++;
  if (onboardingStatus.restrictedSettingsDone) completedOnboardingCount++;
  if (onboardingStatus.accessibilityEnabled) completedOnboardingCount++;
  if (onboardingStatus.batteryBypassed) completedOnboardingCount++;

  let activeOnboardingStep = 0;
  if (!onboardingStatus.vpnGranted) activeOnboardingStep = 1;
  else if (!onboardingStatus.adminActive) activeOnboardingStep = 2;
  else if (!onboardingStatus.restrictedSettingsDone) activeOnboardingStep = 3;
  else if (!onboardingStatus.accessibilityEnabled) activeOnboardingStep = 4;
  else if (!onboardingStatus.batteryBypassed) activeOnboardingStep = 5;
  else activeOnboardingStep = 6;

  const toBengaliDigit = (num) => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bengaliDigits[d]);
  };

  const handleExecuteOnboardingStep = (step) => {
    if (step === 3) {
      localStorage.setItem('RESTRICTED_SETTINGS_PROMPTED', 'true');
      setOnboardingStatus(prev => ({ ...prev, restrictedSettingsDone: true }));
    }
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.requestPermissionStep) {
      window.Capacitor.Plugins.UnlockPlugin.requestPermissionStep({ step: step }).catch(err => console.log('Step err:', err));
    }
  };

  const handleToggleVpnSystemWide = (newVal) => {
    setVpnSystemWide(newVal);
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnlockPlugin && window.Capacitor.Plugins.UnlockPlugin.setSystemWideAdBlock) {
      window.Capacitor.Plugins.UnlockPlugin.setSystemWideAdBlock({ enabled: newVal }).catch(err => console.log('Toggle VPN err:', err));
    }
  };

  return (
    <div style={styles.page}>
      <audio ref={audioRef} src="/durood.mp3" preload="auto" />

      <div style={styles.phoneBody}>

        {/* অনবোর্ডিং পারমিশন উইজার্ড কার্ড মডাল */}
        {showOnboardingModal && localStorage.getItem('HELPNICHE_ONBOARDING_DONE') !== 'true' && completedOnboardingCount < 5 && activeOnboardingStep >= 1 && activeOnboardingStep <= 6 && (
          <div style={styles.pinModalOverlay}>
            <div style={{ ...styles.pinModalCard, padding: '22px 20px', background: '#0b1326', border: '1.5px solid rgba(16, 185, 129, 0.4)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', fill: '#10b981', flexShrink: 0 }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    <span style={{ fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>Helpniche সেটআপ উইজার্ড</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-block', alignSelf: 'flex-start' }}>
                    প্রয়োজনীয় পারমিশন: {toBengaliDigit(completedOnboardingCount)}/৫ সম্পন্ন ({toBengaliDigit(Math.round((completedOnboardingCount / 5) * 100))}%)
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('HELPNICHE_ONBOARDING_DONE', 'true');
                    setShowOnboardingModal(false);
                  }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '0 4px', lineHeight: '1', fontWeight: 'bold' }}
                  title="বন্ধ করুন"
                >
                  X
                </button>
              </div>

              {/* প্রগ্রেস বার */}
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', width: `${(completedOnboardingCount / 5) * 100}%`, background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
              </div>

              {/* ৫টি ধাপের সিলেক্টর */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', width: '100%' }}>
                {[
                  { step: 1, label: 'ভিপিএন', done: onboardingStatus.vpnGranted },
                  { step: 2, label: 'অ্যাডমিন', done: onboardingStatus.adminActive },
                  { step: 3, label: 'সেটিংস', done: onboardingStatus.restrictedSettingsDone },
                  { step: 4, label: 'সার্ভিস', done: onboardingStatus.accessibilityEnabled },
                  { step: 5, label: 'ব্যাটারি', done: onboardingStatus.batteryBypassed }
                ].map(item => (
                  <button
                    key={item.step}
                    onClick={() => handleExecuteOnboardingStep(item.step)}
                    style={{
                      padding: '6px 2px',
                      fontSize: '10px',
                      fontWeight: '700',
                      borderRadius: '8px',
                      border: item.done ? '1px solid #10b981' : (activeOnboardingStep === item.step ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)'),
                      background: item.done ? 'rgba(16, 185, 129, 0.2)' : (activeOnboardingStep === item.step ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)'),
                      color: item.done ? '#34d399' : (activeOnboardingStep === item.step ? '#38bdf8' : '#94a3b8'),
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.done ? '[OK] ' : ''}{item.label}
                  </button>
                ))}
              </div>

              {/* সেন্ট্রাল ফোকাস কার্ড */}
              {activeOnboardingStep <= 5 ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '18px', padding: '18px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {activeOnboardingStep === 1 && <svg viewBox="0 0 24 24" style={{ width: '30px', height: '32px', fill: '#34d399' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/></svg>}
                    {activeOnboardingStep === 2 && <svg viewBox="0 0 24 24" style={{ width: '30px', height: '32px', fill: '#38bdf8' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l7.59-7.59L20 7l-9 9z"/></svg>}
                    {activeOnboardingStep === 3 && <svg viewBox="0 0 24 24" style={{ width: '30px', height: '32px', fill: '#fb923c' }}><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>}
                    {activeOnboardingStep === 4 && <svg viewBox="0 0 24 24" style={{ width: '30px', height: '32px', fill: '#a855f7' }}><path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/></svg>}
                    {activeOnboardingStep === 5 && <svg viewBox="0 0 24 24" style={{ width: '30px', height: '32px', fill: '#facc15' }}><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM11 20v-5.5H9L13 7v5.5h2L11 20z"/></svg>}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    {activeOnboardingStep === 1 && 'ধাপ ১: ব্রাউজার সুরক্ষা ও ভিপিএন পারমিশন'}
                    {activeOnboardingStep === 2 && 'ধাপ ২: ডিভাইস অ্যাডমিন সক্রিয়করণ'}
                    {activeOnboardingStep === 3 && 'ধাপ ৩: রেস্ট্রিক্টেড সেটিং রিমুভ'}
                    {activeOnboardingStep === 4 && 'ধাপ ৪: অ্যাক্সেসিবিলিটি সার্ভিস'}
                    {activeOnboardingStep === 5 && 'ধাপ ৫: ব্যাকগ্রাউন্ড ব্যাটারি অপটিমাইজেশন'}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
                    {activeOnboardingStep === 1 && 'ক্ষতিকর ওয়েবসাইট স্বয়ংক্রিয়ভাবে ব্লক রাখতে এবং নিরাপদ ডিএনএস ফিল্টারিং সচল করতে ভিপিএন অনুমতি দিন।'}
                    {activeOnboardingStep === 2 && 'অনাকাঙ্ক্ষিত আনইনস্টল রদ করতে এবং অ্যাপের নিরাপত্তা প্রাচীর সুদৃঢ় রাখতে ডিভাইস পলিসি সক্রিয় করুন।'}
                    {activeOnboardingStep === 3 && 'অ্যান্ড্রয়েড ১৩+ ডিভাইসে পারমিশন চালুর বাধা সরাতে অ্যাপ ইনফো পেজ থেকে \'Allow restricted settings\' অপশন অন করুন।'}
                    {activeOnboardingStep === 4 && 'ব্লকিং ফিল্টার ও সিকিউরিটি শিল্ড ব্যাকগ্রাউন্ডে কার্যকর রাখতে \'Helpniche\' অ্যাক্সেসিবিলিটি সার্ভিস চালু করুন।'}
                    {activeOnboardingStep === 5 && 'ব্যাকগ্রাউন্ডে সার্ভিস সচল রাখতে এবং অপটিমাইজেশন বাইপাস করতে ব্যাটারি সেটিংস আনরেস্ট্রিক্টেড করুন।'}
                  </p>

                  {activeOnboardingStep === 3 && (
                    <div style={{ textAlign: 'left', background: 'rgba(245, 158, 11, 0.08)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '11px', color: '#fef08a', marginTop: '4px', lineHeight: '1.5' }}>
                      <b>অ্যান্ড্রয়েড ১৩+ ডিভাইসে অ্যাক্সেসিবিলিটি চালুর নিয়ম:</b><br/>
                      ১. নিচের বাটনে চাপ দিয়ে অ্যাপ সেটিংস পেজে যান<br/>
                      ২. ওপরের ডানদিকের ৩-ডট (⋮) অপশনে চাপুন<br/>
                      ৩. <b>'Allow restricted settings'</b> এ চাপ দিয়ে পিন/ফিঙ্গারপ্রিন্ট দিন<br/>
                      ৪. এরপর ফিরে এসে ধাপ ৪ এ অ্যাক্সেসিবিলিটি অন করুন
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '18px', padding: '20px 14px', textAlign: 'center' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '36px', height: '36px', fill: '#10b981', marginBottom: '8px' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', margin: '0 0 4px 0' }}>সকল পারমিশন সফলভাবে সম্পন্ন!</h3>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>Helpniche সুরক্ষা এখন ১০০% সচল ও কার্যকর। আপনার নিরাপদ ডিজিটাল জীবনের জন্য প্রস্তুত।</p>
                </div>
              )}

              {/* ওয়ান-ক্লিক বাটন */}
              <button
                onClick={() => {
                  if (activeOnboardingStep <= 5) {
                    handleExecuteOnboardingStep(activeOnboardingStep);
                  } else {
                    localStorage.setItem('HELPNICHE_ONBOARDING_DONE', 'true');
                    setShowOnboardingModal(false);
                  }
                }}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '14px', color: '#ffffff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
              >
                <span>
                  {activeOnboardingStep === 1 && 'অপশন চালু করুন'}
                  {activeOnboardingStep === 2 && 'ডিভাইস অ্যাডমিন অন করুন'}
                  {activeOnboardingStep === 3 && 'সেটিংস পেজে যান'}
                  {activeOnboardingStep === 4 && 'অ্যাক্সেসিবিলিটি চালু করুন'}
                  {activeOnboardingStep === 5 && 'ব্যাটারি অপটিমাইজেশন সরান'}
                  {activeOnboardingStep === 6 && 'হোমপেজে প্রবেশ করুন'}
                </span>
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z"/></svg>
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('HELPNICHE_ONBOARDING_DONE', 'true');
                  setShowOnboardingModal(false);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: '2px', textDecoration: 'underline' }}
              >
                আপাতত এড়িয়ে যান (পরে সেটিংস থেকে দিতে পারবেন)
              </button>
            </div>
          </div>
        )}

        {/* টেলিগ্রাম অ্যাডমিন আনলক মডাল */}
        {showTelegramModal && (
          <div style={styles.pinModalOverlay}>
            <div style={styles.pinModalCard}>
              <div style={{ width: '40px', height: '40px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', fill: '#0284c7' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.01-.38-1.58-.75-.89-.58-1.39-.94-2.25-1.51-1-.66-.35-1.02.22-1.6.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.9-2.12 5.88-2.53 2.8-.1.17 3.38.1.17z"/></svg></div>
              <h4 style={{ color: '#f8fafc', margin: '8px 0 4px 0' }}>অ্যাডমিন পারমিশন প্রয়োজন</h4>
              <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4', margin: '0 0 12px 0' }}>
                আনইনস্টল করতে টেলিগ্রামে অ্যাডমিনকে নক দিয়ে স্পেশাল সিক্রেট কোড সংগ্রহ করুন।
              </p>

              <a
                href={TELEGRAM_ADMIN_LINK}
                target="_blank"
                rel="noreferrer"
                style={styles.telegramLinkBtn}
              >
                টেলিগ্রামে অ্যাডমিনকে নক দিন
              </a>

              <form onSubmit={handleAdminCodeSubmit} style={{ marginTop: '12px' }}>
                <input
                  type="password"
                  placeholder="অ্যাডমিনের দেওয়া কোড দিন"
                  value={secretCodeInput}
                  onChange={(e) => setSecretCodeInput(e.target.value)}
                  style={{ ...styles.pinInputField, borderColor: codeError ? '#ef4444' : '#334155' }}
                  autoFocus
                />
                {codeError && <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px' }}>ভুল কোড! অ্যাডমিনের কোড মিলছে না।</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowTelegramModal(false)}>বাতিল</button>
                  <button type="submit" style={styles.confirmPinBtn}>আনলক করুন</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ফিচার গাইড মডাল */}
        {showFeatureGuideModal && (
          <div style={styles.pinModalOverlay}>
            <div style={{ ...styles.pinModalCard, textAlign: 'left', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '10px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#10b981' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                  <span>ফিচার গাইড</span>
                </div>
                <button onClick={() => setShowFeatureGuideModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>X</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <b style={{ color: '#34d399' }}>১. কোর প্রটেকশন (পর্নো ফিল্টার):</b><br />
                  ফ্যামিলি ডিএনএস এবং স্ট্রিক্ট ফিল্টারিং স্বয়ংক্রিয়ভাবে ব্রাউজারে সক্রিয় হয়ে পর্নো সাইট ব্লক করে চোখ ও মনকে পবিত্র রাখে।
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <b style={{ color: '#38bdf8' }}>২. সোশ্যাল কন্ট্রোল:</b><br />
                  সোশ্যাল মিডিয়া অ্যাপগুলোর অতিরিক্ত ব্যবহার রুখতে সময় নির্ধারণ করে লক/নিয়ন্ত্রণ করা যায়।
                </div>

                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <b style={{ color: '#c084fc' }}>৩. ডিপ ফোকাস সেশন:</b><br />
                  নির্দিষ্ট সময়ের জন্য ফোকাস লক কার্যকর করে পুরো ফোনকে বিভ্রান্তিমুক্ত ও পড়ালেখামুখী রাখা যায়।
                </div>

                <div style={{ background: 'rgba(251, 146, 60, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
                  <b style={{ color: '#fb923c' }}>৪. স্ট্রাইক ও প্রটেকশন কাউন্টার:</b><br />
                  ধারাবাহিকতা বজায় রাখার স্ট্রাইক এবং কতদিন-ঘণ্টা ধরে অ্যাপের প্রটেকশনে আছেন তা সার্বক্ষণিক ট্র্যাকিং হয়।
                </div>

                <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <b style={{ color: '#facc15' }}>৫. রুটিন ও আনলক গার্ড:</b><br />
                  ডেইলি ১০০ দরূদ টার্গেট, অ্যালার্ম এবং ফোন আনলক করলেই দরূদ বার্তা ও ভাইব্রেশনাল সচেতনতা কার্যকর থাকে।
                </div>

                <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <b style={{ color: '#fb7185' }}>৬. সেটিংস ও অ্যান্টি-ট্যাম্পারিং:</b><br />
                  আনইনস্টল রোধে ডিভাইস অ্যাডমিন এবং অ্যাক্সেসিবিলিটি সার্ভিস মূল ভূমিকা পালন করে।
                </div>
              </div>

              <button onClick={() => setShowFeatureGuideModal(false)} style={{ ...styles.primaryBtn, marginTop: '14px', marginBottom: 0 }}>
                ঠিক আছে
              </button>
            </div>
          </div>
        )}

                {/* হেল্পনিশ ব্রাউজার ইনস্টল ও ডাউনলোড মডাল */}
        {showBrowserInstallModal && (
          <div style={styles.pinModalOverlay}>
            <div style={styles.pinModalCard}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', fill: '#38bdf8' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: '0 0 8px 0' }}>Helpniche ব্রাউজার</h3>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                বিজ্ঞাপনমুক্ত ও নিরাপদ ইন্টারনেট ব্যবহারের জন্য একবার Helpniche ব্রাউজার ইনস্টল করুন। এতে রয়েছে নিজস্ব শক্তিশালী অ্যাড-ব্লকার ও ক্ষতিকর কন্টেন্ট প্রতিরোধ ব্যবস্থা।
              </p>

              {browserDownloading ? (
                <div style={{ width: '100%', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#38bdf8', fontWeight: '700', marginBottom: '6px' }}>
                    <span>ডাউনলোড হচ্ছে...</span>
                    <span>{browserDownloadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: ${browserDownloadProgress}%, height: '100%', background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)', transition: 'width 0.2s ease' }}></div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>ডাউনলোড সম্পন্ন হলে স্বয়ংক্রিয়ভাবে ইনস্টলেশন শুরু হবে</p>
                </div>
              ) : (
                <>
                  {browserDownloadError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px', color: '#f87171', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }}>
                      {browserDownloadError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setShowBrowserInstallModal(false)}
                      style={{ flex: 1, padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      পরে করব
                    </button>
                    <button
                      type="button"
                      onClick={handleStartBrowserDownload}
                      style={{ flex: 1.5, padding: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)' }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                      <span>ডাউনলোড ও ইনস্টল</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
{/* আনলক অ্যালার্ট কনফিগার মডাল */}
        {showUnlockAlertModal && (
          <div style={styles.pinModalOverlay}>
            <div style={{ ...styles.pinModalCard, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#10b981' }}>আনলক অ্যালার্ট কনফিগারেশন</h3>
                <button onClick={() => setShowUnlockAlertModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>X</button>
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                ফোন আনলক করলে দরূদ শরীফের অডিও অটোমেটিক চালু হবে এবং দরূদ পড়ার রিমাইন্ডার দিবে।
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => { alert('আনলক অ্যালার্ট সক্রিয় করা হয়েছে!'); setShowUnlockAlertModal(false); }} style={{ padding: '12px', background: '#10b981', border: 'none', borderRadius: '12px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                  অ্যালার্ট সক্রিয় করুন
                </button>
                <button onClick={() => setShowUnlockAlertModal(false)} style={{ padding: '12px', background: '#334155', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer' }}>
                  বন্ধ রাখুন
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={styles.appContainer}>

          {/* ==========================================================================
             TAB 1: HOME DASHBOARD (Matching Official Screenshot 100%)
             ========================================================================== */}
          {tab === 'home' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '14px' }}>
              {/* Top App Bar */}
              <div style={styles.headerRow}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: 0, letterSpacing: '-0.5px' }}>Helpniche</h1>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: '500' }}>
                    {lang === 'bn' ? 'আপনার মনোযোগ ও মানসিক সচেতনতা রক্ষা করুন' : 'Protect your attention & mental clarity'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Browser Direct Button */}
                  <button
                    onClick={handleBrowserClick}
                    style={{
                      background: 'rgba(14, 165, 233, 0.15)',
                      border: '1px solid #0ea5e9',
                      color: '#38bdf8',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'currentColor' }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <span>ব্রাউজার</span>
                  </button>

                  {/* Language Switcher Toggle Pill */}
                  <div
                    onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '16px',
                      padding: '2px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  >
                    <span style={{ color: lang === 'bn' ? '#34d399' : '#64748b' }}>বাংলা</span>
                    <span style={{ color: '#475569' }}>|</span>
                    <span style={{ color: lang === 'en' ? '#34d399' : '#64748b' }}>EN</span>
                  </div>

                  {/* Status Badge */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    {lang === 'bn' ? 'সুরক্ষিত' : 'PROTECTED'}
                  </div>
                </div>
              </div>

              {/* 1. Streak Mini Banner */}
              <div onClick={() => setTab('streak')} style={{ width: '100%', background: '#0f172a', border: '1.5px solid #10b981', borderRadius: '18px', padding: '16px 18px', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>14 দিন ক্লিন</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    ডিটেইলস &gt;
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: '#34d399', fontWeight: '700' }}>বর্তমান পদবী: দৃঢ়চেতা যোদ্ধা</span>
              </div>

              {/* 2. Central Circular Social Control Portal */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <div
                  onClick={() => setTab('social')}
                  style={{
                    width: '190px',
                    height: '190px',
                    borderRadius: '50%',
                    border: '3.5px solid #10b981',
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    boxShadow: '0 0 35px rgba(16, 185, 129, 0.4), inset 0 0 20px rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '42px', height: '42px', fill: '#10b981', filter: 'drop-shadow(0 2px 8px rgba(16,185,129,0.6))' }}>
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/>
                  </svg>
                  <span style={{ fontSize: '19px', fontWeight: '800', color: '#ffffff', marginTop: '6px' }}>
                    সোশ্যাল কন্ট্রোল
                  </span>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', padding: '3px 14px', borderRadius: '12px', marginTop: '6px' }}>
                    ম্যানেজ করুন
                  </span>
                </div>
              </div>

                            {/* 2.5 Browser Dedicated Launch Card */}
              <div
                onClick={handleBrowserClick}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  border: '1.5px solid #0ea5e9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 15px rgba(14, 165, 233, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.2)', border: '1px solid rgba(14, 165, 233, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', fill: '#38bdf8' }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'block' }}>ব্রাউজার</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      {isBrowserInstalled ? 'নিরাপদ ও অ্যাডমুক্ত ইন্টারনেট ব্রাউজার খুলুন' : 'অ্যাডমুক্ত ব্রাউজার ইনস্টল করুন'}
                    </span>
                  </div>
                </div>
                <div style={{ background: isBrowserInstalled ? '#10b981' : '#0284c7', color: '#ffffff', fontSize: '12px', fontWeight: '800', padding: '5px 14px', borderRadius: '10px' }}>
                  {isBrowserInstalled ? 'ওপেন' : 'ইনস্টল'}
                </div>
              </div>

              {/* 3. Unlock Alert Card */}
              <div onClick={() => setShowUnlockAlertModal(true)} style={{ width: '100%', background: 'rgba(239, 68, 68, 0.08)', border: '1.5px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '14px 16px', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: '#f87171', flexShrink: 0 }}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>আনলক অ্যালার্ট</span>
                </div>
                <div style={{ background: 'rgba(148, 163, 184, 0.15)', border: '1px solid #64748b', color: '#cbd5e1', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '12px' }}>
                  OFF &gt;
                </div>
              </div>

              {/* 4. Two-Column Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Focus Time Today</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', margin: '6px 0 2px 0' }}>0m</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>আজকের মোট ফোকাস টাইম</div>
                </div>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Protection Duration</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399', margin: '6px 0 2px 0' }}>14 দিন ১৮ ঘণ্টা</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>মোট সুরক্ষিত সময়কাল</div>
                </div>
              </div>

              {/* 5. Main Action Button */}
              <button onClick={() => setTab('focus')} style={{ width: '100%', padding: '16px', background: '#10b981', border: 'none', borderRadius: '16px', color: '#000000', fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
                <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span>Start Deep Focus Session</span>
              </button>

              {/* 6. Panic SOS Button */}
              <button onClick={() => alert('শান্ত হোন ও চোখ বন্ধ করুন! ৪ সেকেন্ড শ্বাস নিন, ৭ সেকেন্ড ধরে রাখুন, ৮ সেকেন্ড ছাড়ুন।')} style={{ width: '100%', padding: '13px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: '16px', color: '#f87171', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#ef4444' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <span>খারাপ চিন্তা বা তাড়না আসলে চাপুন (Panic SOS)</span>
              </button>

              {/* 7. Feature Guide Card */}
              <div onClick={() => setShowFeatureGuideModal(true)} style={{ width: '100%', background: 'rgba(16, 185, 129, 0.08)', border: '1.5px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '14px 16px', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#10b981' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'block' }}>ফিচার গাইড</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>আপনার মূল ব্যবহার নির্দেশিকা</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '12px', fontWeight: '700', padding: '6px 14px', borderRadius: '10px' }}>
                  দেখুন
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
             TAB 2: FOCUS
             ========================================================================== */}
          {tab === 'focus' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '12px' }}>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: 0 }}>Deep Focus</h1>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>Minimal Audio & Focus Session</p>
              </div>

              {/* Selected Audio Source Card */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: '#38bdf8' }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>LIBRARY AUDIO SOURCE</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', display: 'block', marginTop: '2px' }}>দরূদ শরীফ (Durood Sharif)</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '12px' }}>
                  Selected
                </div>
              </div>

              {/* Audio Source Buttons Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                <div style={{ background: '#0f172a', border: '1.5px solid #38bdf8', borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', fill: '#38bdf8', marginBottom: '6px' }}><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#38bdf8' }}>Library Audio</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Cloud & Presets</div>
                </div>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', fill: '#94a3b8', marginBottom: '6px' }}><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>Device Audio</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Local Storage</div>
                </div>
              </div>

              {/* Audio Categories Section */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#10b981', textAlign: 'left' }}>দরূদ শরীফ (BUILT-IN AUDIO)</span>
                <div style={{ background: '#0f172a', border: '1.5px solid #10b981', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>দরূদ শরীফ (অফলাইন সা...</div>
                    <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>Offline Ready</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={playDuroodAudio} style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}>Play</button>
                    <span style={{ background: '#10b981', color: '#000', fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '8px' }}>Selected</span>
                  </div>
                </div>

                <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', textAlign: 'left', marginTop: '6px' }}>মোটিভেশন (MOTIVATION)</span>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>মোটিভেশনাল স্পিচ ১</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Cloud Stream</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}>Play</button>
                    <button style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}>Save</button>
                    <button style={{ background: '#334155', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', border: 'none' }}>Select</button>
                  </div>
                </div>

                <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', textAlign: 'left', marginTop: '6px' }}>বৃষ্টির শব্দ (RAIN SOUND)</span>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>শান্ত নিঝুম বৃষ্টির শব্দ (৩০...</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Cloud Stream</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}>Play</button>
                    <button style={{ background: '#1e293b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}>Save</button>
                    <button style={{ background: '#334155', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', border: 'none' }}>Select</button>
                  </div>
                </div>
              </div>

              {/* Set Focus Duration Section */}
              <div style={{ width: '100%', marginTop: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: '#38bdf8' }}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                  Set Focus Duration
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  {[1, 5, 25, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSelectedDuration(mins)}
                      style={{
                        padding: '14px',
                        background: '#0f172a',
                        border: selectedDuration === mins ? '1.5px solid #10b981' : '1px solid #1e293b',
                        borderRadius: '14px',
                        color: selectedDuration === mins ? '#34d399' : '#ffffff',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      {mins === 1 ? '1 Min' : `${mins} Mins`}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder="Custom Minutes"
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '12px', color: '#fff', fontSize: '13px', outline: 'none', textAlign: 'center' }}
                  />
                  <button onClick={() => alert(`${selectedDuration} মিনিটের ফোকাস সেশন শুরু হয়েছে!`)} style={{ flex: 1, padding: '12px', background: '#10b981', border: 'none', borderRadius: '14px', color: '#000', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Start
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
             TAB 3: SOCIAL CONTROL (DEDICATED SOCIAL CONTROL VIEW!)
             ========================================================================== */}
          {tab === 'social' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '14px' }}>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: 0 }}>Social Control</h1>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>শর্টস, রিলস ও অনাকাঙ্ক্ষিত ওয়েবসাইট ব্লক ম্যানেজমেন্ট</p>
              </div>

              {/* Card 1: Shorts & Reels Guard Toggle */}
              <div style={{ width: '100%', background: '#0f172a', border: '1.5px solid #10b981', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: '#38bdf8' }}><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    <span>Shorts & Reels Guard</span>
                  </div>
                  <button
                    onClick={handleToggleShorts}
                    style={{
                      padding: '8px 16px',
                      background: settings.blockShorts ? '#10b981' : '#334155',
                      border: 'none',
                      borderRadius: '20px',
                      color: settings.blockShorts ? '#000' : '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {settings.blockShorts ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
                  YouTube Shorts, Facebook Reels, Instagram Stories & TikTok স্বয়ংক্রিয়ভাবে ব্লক করে। একবার পরিবর্তন করলে ৩০ মিনিট কুলডাউন থাকবে।
                </p>
                {cooldownCountdown && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#fb923c', fontWeight: '700' }}>
                    ⏳ কুলডাউন বাকি: {cooldownCountdown}
                  </div>
                )}
              </div>

              {/* Card 2: Automatic Core Safety Shield */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#ef4444' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  <span>পর্নো ও জুয়া অটো ফিল্টার</span>
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                  পর্নোগ্রাফি, এডাল্ট সাইট ও জুয়ার প্ল্যাটফর্ম চিরতরে স্বয়ংক্রিয়ভাবে ব্লকড।
                </p>
                <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '4px 10px', borderRadius: '10px', fontWeight: '800' }}>
                  Always Active Shield
                </span>
              </div>

              {/* Card 3: Custom Website Blocker */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
                  কাস্টম ওয়েবসাইট ব্লকলিস্ট
                </div>
                <form onSubmit={handleAddSite} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="e.g. facebook.com"
                    value={newSiteInput}
                    onChange={(e) => setNewSiteInput(e.target.value)}
                    style={{ flex: 1, background: '#111c38', border: '1px solid #334155', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '12px', outline: 'none' }}
                  />
                  <button type="submit" style={{ padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    + যোগ করুন
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {settings.customSites && settings.customSites.length > 0 ? (
                    settings.customSites.map((site) => (
                      <div key={site} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                        <span>{site}</span>
                        <button onClick={() => handleRemoveSite(site)} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}>
                          মুছুন
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>কোনো কাস্টম সাইট যুক্ত করা হয়নি।</div>
                  )}
                </div>
              </div>

              {/* Card 4: URL Block Tester */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
                  ইউআরএল ফিল্টার টেস্ট করুন
                </div>
                <form onSubmit={handleTestUrl} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="যেকোনো ওয়েবসাইট টাইপ করুন"
                    value={testUrlInput}
                    onChange={(e) => setTestUrlInput(e.target.value)}
                    style={{ flex: 1, background: '#111c38', border: '1px solid #334155', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '12px', outline: 'none' }}
                  />
                  <button type="submit" style={{ padding: '10px 16px', background: '#38bdf8', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    যাচাই করুন
                  </button>
                </form>

                {blockCheckResult && (
                  <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: blockCheckResult.blocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: blockCheckResult.blocked ? '1px solid #ef4444' : '1px solid #10b981', color: blockCheckResult.blocked ? '#f87171' : '#34d399', fontSize: '12px', fontWeight: 'bold' }}>
                    {blockCheckResult.blocked ? `ব্লকড: ${blockCheckResult.reason}` : 'অনুমোদিত (Allowed)'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================================================
             TAB 4: STREAK (Live Dynamic Countdown!)
             ========================================================================== */}
          {tab === 'streak' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '16px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: 0 }}>Iron Will</h1>
                <span style={{ fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>⋮</span>
              </div>

              {/* Large Circular Countdown Ring */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0', position: 'relative' }}>
                <div
                  style={{
                    width: '210px',
                    height: '210px',
                    borderRadius: '50%',
                    border: '4px solid #10b981',
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(11, 19, 38, 0.95) 100%)',
                    boxShadow: '0 0 35px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '38px', fontWeight: '900', color: '#ffffff', lineHeight: '1' }}>14 days</span>
                  <span style={{ fontSize: '16px', color: '#38bdf8', fontWeight: '700', marginTop: '6px' }}>
                    {timeLeft.h}:{timeLeft.m}:{timeLeft.s}
                  </span>
                </div>
                <button onClick={refreshData} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(239,68,68,0.4)' }}>
                  ↻
                </button>
              </div>

              {/* Rank Pill Badge */}
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', color: '#34d399', fontSize: '14px', fontWeight: '800', padding: '8px 24px', borderRadius: '20px', display: 'inline-block' }}>
                দৃঢ়চেতা যোদ্ধা
              </div>

              {/* Quote Section */}
              <div style={{ padding: '0 10px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#cbd5e1', fontStyle: 'italic', lineHeight: '1.6', margin: '0 0 6px 0' }}>
                  “শক্তি শারীরিক সক্ষমতা থেকে আসে না। এটি আসে এক অদম্য ইচ্ছাশক্তি থেকে।”
                </p>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>- মহাত্মা গান্ধী</span>
              </div>

              {/* Two Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginTop: '10px' }}>
                <button style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  My Rank
                </button>
                <button style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  History
                </button>
              </div>
            </div>
          )}

          {/* ==========================================================================
             TAB 5: ROUTINE
             ========================================================================== */}
          {tab === 'routine' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '12px' }}>
              {/* Header */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: 0 }}>Routine & Tasks</h1>
                <button style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '12px', fontWeight: '800', padding: '6px 14px', borderRadius: '16px', cursor: 'pointer' }}>
                  কাস্টমাইজ
                </button>
              </div>

              {/* Sub-Tab Bar */}
              <div style={{ display: 'flex', width: '100%', background: '#0f172a', borderRadius: '14px', padding: '4px', gap: '4px', boxSizing: 'border-box' }}>
                <button onClick={() => setRoutineSubTab('daily')} style={{ flex: 1, padding: '8px 4px', border: routineSubTab === 'daily' ? '1.5px solid #10b981' : 'none', background: routineSubTab === 'daily' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: routineSubTab === 'daily' ? '#34d399' : '#94a3b8', fontSize: '11px', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' }}>
                  ডেইলি টার্গেট
                </button>
                <button onClick={() => setRoutineSubTab('tasbih')} style={{ flex: 1, padding: '8px 4px', border: routineSubTab === 'tasbih' ? '1.5px solid #10b981' : 'none', background: routineSubTab === 'tasbih' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: routineSubTab === 'tasbih' ? '#34d399' : '#94a3b8', fontSize: '11px', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' }}>
                  তাসবিহ
                </button>
                <button onClick={() => setRoutineSubTab('alarm')} style={{ flex: 1, padding: '8px 4px', border: routineSubTab === 'alarm' ? '1.5px solid #10b981' : 'none', background: routineSubTab === 'alarm' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: routineSubTab === 'alarm' ? '#34d399' : '#94a3b8', fontSize: '11px', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' }}>
                  ⏰ অ্যালার্ম
                </button>
                <button onClick={() => setRoutineSubTab('guard')} style={{ flex: 1, padding: '8px 4px', border: routineSubTab === 'guard' ? '1.5px solid #10b981' : 'none', background: routineSubTab === 'guard' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: routineSubTab === 'guard' ? '#34d399' : '#94a3b8', fontSize: '11px', fontWeight: '800', borderRadius: '10px', cursor: 'pointer' }}>
                  আনলক গার্ড
                </button>
              </div>

              {/* Sub-Tab Content: 1. Daily Target */}
              {routineSubTab === 'daily' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: 0 }}>দরূদ শরীফ</h2>
                    <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0 0 0' }}>اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ (আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ)</p>
                  </div>

                  {/* Glowing Green Counter Ring */}
                  <div
                    onClick={handleRead}
                    style={{
                      width: '190px',
                      height: '190px',
                      borderRadius: '50%',
                      border: '3.5px solid #10b981',
                      background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
                      boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontSize: '52px', fontWeight: '900', color: '#ffffff', lineHeight: '1' }}>{count}</span>
                    <span style={{ fontSize: '13px', color: '#34d399', fontWeight: '700', marginTop: '6px' }}>লক্ষ্য: {target}</span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>ট্যাপ করে দরূদ কাউন্ট করুন</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                    <button onClick={playDuroodAudio} style={{ padding: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      অটো প্লে
                    </button>
                    <button onClick={handleSnooze} style={{ padding: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      পজ / পরে করব
                    </button>
                  </div>

                  <button onClick={() => setRoutineSubTab('tasbih')} style={{ width: '100%', padding: '14px', background: '#10b981', border: 'none', borderRadius: '16px', color: '#000000', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>
                    তাসবিহ এ যান
                  </button>
                </div>
              )}

              {/* Sub-Tab Content: 2. Tasbih */}
              {routineSubTab === 'tasbih' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '100%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '12px', padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>সর্বমোট পঠিত জিকির</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#34d399' }}>
                      <b style={{ color: '#fff', fontSize: '16px' }}>{lifetimeZikr}</b> বার
                    </span>
                  </div>

                  <div style={{ display: 'flex', width: '100%', background: '#0f172a', borderRadius: '10px', padding: '2px', gap: '2px' }}>
                    <button onClick={() => handleSwitchTasbihMode('general')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: tasbihMode === 'general' ? '#10b981' : 'transparent', color: tasbihMode === 'general' ? '#000' : '#94a3b8' }}>
                      সাধারণ মোড
                    </button>
                    <button onClick={() => handleSwitchTasbihMode('fatimi')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', background: tasbihMode === 'fatimi' ? '#10b981' : 'transparent', color: tasbihMode === 'fatimi' ? '#000' : '#94a3b8' }}>
                      ‘তাসবিহ-ই-ফাতিমি’
                    </button>
                  </div>

                  <div onClick={handleTasbihTap} style={{ width: '190px', height: '190px', borderRadius: '50%', border: '3.5px solid #10b981', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(15,23,42,0.95) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '14px auto' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#34d399' }}>{tasbihMode === 'fatimi' ? fatimiArabic : 'سُبْحَانَ ٱللَّٰهِ'}</div>
                    <div style={{ fontSize: '42px', fontWeight: '800', color: '#fff', margin: '4px 0' }}>{tasbihCount}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tasbihMode === 'fatimi' ? fatimiTitle : 'সাধারণ জিকির মোড'}</div>
                  </div>

                  <button onClick={handleResetTasbih} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', padding: '8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                    রিসেট
                  </button>
                </div>
              )}

              {/* Sub-Tab Content: 3. Alarm */}
              {routineSubTab === 'alarm' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>অ্যালার্ম লিস্ট</span>
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>05:30 AM</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>ফজরের অ্যালার্ম</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
                      <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: '#10b981', borderRadius: '24px' }}>
                        <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: '24px', bottom: '3px', background: '#fff', borderRadius: '50%' }} />
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Sub-Tab Content: 4. Unlock Guard */}
              {routineSubTab === 'guard' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>আনলক গার্ড সেটিংস</span>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                    ফোন আনলক করার পর স্বয়ংক্রিয়ভাবে অডিও নোটিফিকেশন বেজে উঠবে।
                  </p>
                  <button onClick={() => setShowUnlockAlertModal(true)} style={{ padding: '12px', background: '#10b981', border: 'none', borderRadius: '12px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                    আনলক অ্যালার্ট কনফিগার করুন
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==========================================================================
             TAB 6: SETTINGS
             ========================================================================== */}
          {tab === 'settings' && (
            <div style={{ ...styles.tabContent, justifyContent: 'flex-start', gap: '14px' }}>
              {/* Header */}
              <div style={styles.headerRow}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: 0 }}>নিরাপত্তা ও সেটিংস</h1>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'currentColor' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  PROTECTED
                </div>
              </div>
              {/* Card 0: Onboarding Permissions Setup */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', display: 'block' }}>পারমিশন সেটআপ উইজার্ড</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                      প্রয়োজনীয় পারমিশন: {toBengaliDigit(completedOnboardingCount)}/৫ সম্পন্ন
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('HELPNICHE_ONBOARDING_DONE');
                      setShowOnboardingModal(true);
                    }}
                    style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', fontSize: '12px', fontWeight: '700', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    সেটআপ খুলুন
                  </button>
                </div>
              </div>

              {/* Card 1: VPN Mode Control (System-Wide vs Smart On-Demand) */}
              <div style={{ width: '100%', background: '#0f172a', border: '1.5px solid #10b981', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#10b981' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/></svg>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>ভিপিএন ফিল্টারিং মোড</span>
                  </div>
                  {/* Toggle Switch */}
                  <div
                    onClick={() => handleToggleVpnSystemWide(!vpnSystemWide)}
                    style={{
                      width: '48px',
                      height: '26px',
                      background: vpnSystemWide ? '#10b981' : '#334155',
                      borderRadius: '20px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.3s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        background: '#ffffff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '3px',
                        left: vpnSystemWide ? '25px' : '3px',
                        transition: 'left 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '13px', fontWeight: '700', color: vpnSystemWide ? '#34d399' : '#38bdf8' }}>
                  {vpnSystemWide ? 'সার্বক্ষণিক সিস্টেম-ওয়াইড মোড (২৪ ঘণ্টা অন)' : 'স্মার্ট অন-ডিমান্ড মোড (শুধুমাত্র ব্রাউজারে অন)'}
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  {vpnSystemWide
                    ? 'ফোনের সমস্ত অ্যাপে সার্বক্ষণিক ভিপিএন চালু থেকে বিজ্ঞাপন ও পর্নোগ্রাফিক সাইট ব্লক রাখবে।'
                    : 'সাধারণ অ্যাপ ব্যবহারের সময় ভিপিএন বন্ধ থাকবে যাতে নেট সম্পূর্ণ রিল্যাক্স থাকে। ক্রোম বা ব্রাউজারে ঢোকা মাত্রই অটোমেটিক ভিপিএন চালু হয়ে পর্ন ও বিজ্ঞাপন ব্লক করবে।'}
                </p>

                {/* AI Bypass Tag */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: '#38bdf8' }}><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
                    <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>AI অ্যাপস (ChatGPT, Gemini, Claude)</span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    ফিল্টারের বাইরে (Bypassed)
                  </span>
                </div>
              </div>

              {/* Card 2: System Shield & Protection */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#10b981' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                  সিস্টেম শিল্ড স্ট্যাটাস
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>পর্নোগ্রাফিক ও এডাল্ট কনটেন্ট ফিল্টার</span>
                    <span style={{ color: '#34d399', fontWeight: '700' }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>Accessibility Guard</span>
                    <span style={{ color: '#34d399', fontWeight: '700' }}>Guarding</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>Strict Focus Lock</span>
                    <span style={{ color: '#34d399', fontWeight: '700' }}>Active</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Unlock & Admin Center */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#38bdf8' }}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  আনলক ও অ্যাডমিন সেন্টার
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                  জরুরি প্রয়োজনে সাময়িক আনলক করতে অ্যাডমিন কোড প্রদান করুন:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => setShowTelegramModal(true)} style={{ width: '100%', padding: '12px', background: '#0284c7', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    Enter Your Code
                  </button>
                  <a
                    href={TELEGRAM_ADMIN_LINK}
                    target="_blank"
                    rel="noreferrer"
                    style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0088cc 0%, #005580 100%)', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
                  >
                    কোড পেতে ক্লিক করুন
                  </a>
                </div>
              </div>

              {/* Card 3: Update & Contact */}
              <div style={{ width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '18px', padding: '16px', boxSizing: 'border-box', textAlign: 'left', marginTop: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: '#38bdf8' }}><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  আপডেট ও যোগাযোগ
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                  অফিসিয়াল আপডেট পেতে ও সরাসরি যোগাযোগ করতে:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a
                    href="https://t.me/Helpniche"
                    target="_blank"
                    rel="noreferrer"
                    style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0088cc 0%, #005580 100%)', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.01-.38-1.58-.75-.89-.58-1.39-.94-2.25-1.51-1-.66-.35-1.02.22-1.6.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.94-1.28 4.9-2.12 5.88-2.53 2.8-.1.17 3.38.1.17z"/></svg>
                    <span>আপডেট চ্যানেল (Telegram)</span>
                  </a>
                  <a
                    href="https://t.me/RM_Rasel_Hossain?text=%E0%A6%86%E0%A6%B8%E0%A6%B8%E0%A6%BE%E0%A6%B2%E0%A6%BE%E0%A6%AE%E0%A7%81%20%E0%A6%86%E0%A6%B2%E0%A6%BE%E0%A6%87%E0%A6%95%E0%A7%81%E0%A6%AE%20%E0%A6%AD%E0%A6%BE%E0%A6%87%2C%20Helpniche%20%E0%A6%85%E0%A7%8D%E0%A6%AF%E0%A6%AA%E0%A6%B8%20%E0%A6%A5%E0%A7%87%E0%A6%95%E0%A7%87%20%E0%A6%AF%E0%A7%8B%E0%A6%97%E0%A6%BE%E0%A6%AF%E0%A7%8B%E0%A6%97%20%E0%A6%95%E0%A6%B0%E0%A6%A4%E0%A7%87%E0%A6%9B%E0%A6%BF%E0%A5%A4"
                    target="_blank"
                    rel="noreferrer"
                    style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #0f766e 0%, #0f5132 100%)', border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', fill: 'currentColor' }}><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                    <span>ডেভেলপার (Inbox)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ==========================================================================
           BOTTOM NAVIGATION BAR
           ========================================================================== */}
        <div style={styles.tabBar}>
          <button style={{ ...styles.tabBtn, color: tab === 'home' ? '#10b981' : '#64748b' }} onClick={() => setTab('home')}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>Home</span>
          </button>
          <button style={{ ...styles.tabBtn, color: tab === 'focus' ? '#10b981' : '#64748b' }} onClick={() => setTab('focus')}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            <span>Focus</span>
          </button>
          <button style={{ ...styles.tabBtn, color: tab === 'social' ? '#10b981' : '#64748b' }} onClick={() => setTab('social')}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8s0 0 0 0z"/></svg>
            <span>Social</span>
          </button>
          <button style={{ ...styles.tabBtn, color: tab === 'streak' ? '#10b981' : '#64748b' }} onClick={() => setTab('streak')}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>
            <span>Streak</span>
          </button>
          <button style={{ ...styles.tabBtn, color: tab === 'routine' ? '#10b981' : '#64748b' }} onClick={() => setTab('routine')}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zm0-4a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zm0-4a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 13 6.5z"/></svg>
            <span>Routine</span>
          </button>
                    <button style={{ ...styles.tabBtn, color: '#38bdf8' }} onClick={handleBrowserClick}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span>Browser</span>
          </button>
          <button style={{ ...styles.tabBtn, color: tab === 'settings' ? '#10b981' : '#64748b' }} onClick={() => setTab('settings')}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'currentColor' }}><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            <span>Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    background: '#020617',
    color: '#fff',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '0',
    boxSizing: 'border-box'
  },
  phoneBody: {
    width: '100%',
    maxWidth: '520px',
    minHeight: '100vh',
    background: '#080e1a',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)',
    boxSizing: 'border-box'
  },
  appContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 16px 80px 16px',
    overflowY: 'auto'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  tabBar: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '520px',
    display: 'flex',
    background: '#040914',
    borderTop: '1px solid #1e293b',
    padding: '8px 4px',
    boxSizing: 'border-box',
    zIndex: 1000
  },
  tabBtn: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    cursor: 'pointer'
  },
  tabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%'
  },
  pinModalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.92)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 99999
  },
  pinModalCard: {
    background: '#0e1830',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '20px',
    padding: '20px',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box'
  },
  telegramLinkBtn: {
    display: 'inline-block',
    background: '#0284c7',
    color: '#fff',
    textDecoration: 'none',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  pinInputField: {
    width: '180px',
    textAlign: 'center',
    fontSize: '16px',
    background: '#111c38',
    color: '#fff',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '8px',
    outline: 'none',
    margin: '0 auto',
    display: 'block'
  },
  cancelBtn: {
    flex: 1,
    background: '#334155',
    color: '#cbd5e1',
    border: 'none',
    padding: '8px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  confirmPinBtn: {
    flex: 1,
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '8px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: '#10b981',
    border: 'none',
    borderRadius: '14px',
    color: '#000',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '8px'
  }
};
