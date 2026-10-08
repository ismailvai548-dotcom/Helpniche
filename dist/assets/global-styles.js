/* ==========================================================================
   GLOBAL STYLESHEET INJECTION
   ========================================================================== */
function injectGlobalStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.maateen.me/kalpurush/font.css');

        :root {
            --bg-color: #000000;
            --text-color: #FFFFFF;
            --text-muted: #8B949E;
            --card-bg: #0E1317;
            --card-border: #1C242B;
            --accent-green: #00E676;
            --accent-green-dim: #14241B;
            --circle-bg: #1B2E24;
            --circle-bar: #00E676;
            --time-color: #A0A0A0;
            --menu-bg: #161B22;
            --border-subtle: #24292E;
            --quote-color: #D1D5DB;
            --danger: #EF5350;
            --danger-dim: rgba(239, 83, 80, 0.12);
            --nav-bg: #0E1317;
            --nav-border: #1C242B;
        }

        body.light-theme {
            --bg-color: #F8F9FA;
            --text-color: #202124;
            --text-muted: #5F6368;
            --card-bg: #FFFFFF;
            --card-border: #E8EAED;
            --accent-green: #137333;
            --accent-green-dim: #E6F4EA;
            --circle-bg: #E6F4EA;
            --circle-bar: #34A853;
            --time-color: #5F6368;
            --menu-bg: #FFFFFF;
            --border-subtle: #E8EAED;
            --quote-color: #3C4043;
            --danger: #D93025;
            --danger-dim: rgba(217, 48, 37, 0.1);
            --nav-bg: #FFFFFF;
            --nav-border: #E8EAED;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        body, html {
            min-height: 100%;
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Hind Siliguri', 'Inter', sans-serif;
            overflow-x: hidden;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        #app-container {
            max-width: 440px;
            min-height: 100vh;
            margin: 0 auto;
            position: relative;
            display: flex;
            flex-direction: column;
            background-color: var(--bg-color);
            padding-bottom: 76px;
        }

        #app-content-area {
            flex: 1;
        }

        .screen-wrapper {
            padding: 16px 16px 24px 16px;
        }

        .svg-icon {
            width: 18px;
            height: 18px;
            fill: currentColor;
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
        }

        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-top: 6px;
        }

        .app-title {
            font-family: 'Inter', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: var(--accent-green);
            letter-spacing: -0.5px;
        }

        .app-subtitle {
            font-size: 13px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .badge-protected {
            background: var(--accent-green-dim);
            color: var(--accent-green);
            border: 1px solid var(--accent-green);
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 20px;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .dash-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 18px;
            padding: 16px;
            margin-bottom: 14px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        }

        .shield-card {
            border-left: 4px solid var(--accent-green);
        }

        .card-header-flex {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .shield-title {
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            font-weight: 800;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-tag {
            font-size: 12px;
            font-weight: 700;
            color: var(--accent-green);
        }

        .shield-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .shield-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
        }

        .shield-label {
            color: var(--text-muted);
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .shield-val {
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 12px;
            color: var(--accent-green);
        }

        .streak-mini-banner {
            background: linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 50, 25, 0.4) 100%);
            border: 1px solid var(--accent-green);
            border-radius: 16px;
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            cursor: pointer;
        }

        .streak-mini-days {
            font-family: 'Kalpurush', serif;
            font-size: 20px;
            font-weight: 800;
            color: #FFFFFF;
        }

        body.light-theme .streak-mini-days {
            color: #111827;
        }

        .streak-mini-rank {
            font-size: 12px;
            color: var(--accent-green);
            font-weight: 600;
            display: block;
        }

        .streak-mini-action {
            font-size: 12px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .metric-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 14px;
        }

        .metric-box {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 14px;
            text-align: center;
        }

        .metric-label {
            font-size: 12px;
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: 4px;
        }

        .metric-value {
            font-family: 'Inter', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: var(--text-color);
            line-height: 1.1;
        }

        .metric-sub {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
        }

        .btn-primary-focus {
            width: 100%;
            background: var(--accent-green);
            color: #000000;
            border: none;
            border-radius: 16px;
            padding: 15px;
            font-size: 15px;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(0, 230, 118, 0.25);
            margin-bottom: 12px;
            transition: transform 0.1s ease;
        }

        .btn-primary-focus:active {
            transform: scale(0.98);
        }

        .btn-panic-sos {
            width: 100%;
            background: var(--danger-dim);
            color: var(--danger);
            border: 1px solid rgba(239, 83, 80, 0.35);
            border-radius: 16px;
            padding: 13px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .btn-panic-sos:active {
            background: rgba(239, 83, 80, 0.25);
            transform: scale(0.98);
        }

        /* Hypnotic Focus Simulation */
        .hypnotic-focus-card {
            text-align: center;
            padding: 20px 16px;
            background: #0B3C2B;
            color: #FFFFFF;
            border-radius: 20px;
            border: 1px solid #145941;
            margin: 0 auto;
            max-width: 340px;
        }

        .hypnotic-canvas-wrapper {
            display: flex;
            justify-content: center;
            margin-bottom: 10px;
        }

        #hypnotic-spiral-canvas {
            border-radius: 12px;
            background: #0B3C2B;
        }

        .hypnotic-subtext {
            font-size: 13px;
            font-weight: 600;
            color: #E6F4EA;
            margin-bottom: 6px;
        }

        .hypnotic-timer-digits {
            font-family: 'Inter', monospace;
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 2px;
            color: #FFFFFF;
        }

        .focus-preset-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 14px;
        }

        .focus-preset-btn {
            background: var(--card-bg);
            color: var(--accent-green);
            border: 1px solid var(--card-border);
            padding: 14px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
        }

        .focus-preset-btn:active {
            background: var(--accent-green-dim);
        }

        /* Iron Will (Streak) */
        .top-header-streak {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            margin-bottom: 12px;
        }

        .menu-dots {
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 8px;
        }

        .dropdown-menu {
            position: absolute;
            top: 40px;
            right: 0;
            background: var(--menu-bg);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            display: none;
            flex-direction: column;
            z-index: 50;
            min-width: 150px;
            overflow: hidden;
        }

        .dropdown-menu.show { display: flex; }

        .dropdown-item {
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-color);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tracker-section {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin: 10px 0;
        }

        .circle-wrapper {
            position: relative;
            width: 230px;
            height: 230px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .progress-svg {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            transform: rotate(-90deg);
        }

        .circle-bg {
            fill: none;
            stroke: var(--circle-bg);
            stroke-width: 8;
        }

        .circle-bar {
            fill: none;
            stroke: var(--circle-bar);
            stroke-width: 8;
            stroke-linecap: round;
            stroke-dasharray: 691.15;
            stroke-dashoffset: 691.15;
            transition: stroke-dashoffset 0.8s ease;
        }

        .days-count {
            font-family: 'Inter', sans-serif;
            font-size: 34px;
            font-weight: 800;
            color: var(--text-color);
        }

        .time-count {
            font-family: 'Inter', monospace;
            font-size: 15px;
            color: var(--time-color);
            font-weight: 600;
        }

        .current-rank-badge {
            margin-top: 14px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--accent-green-dim);
            border: 1px solid var(--accent-green);
            color: var(--accent-green);
            font-family: 'Hind Siliguri', sans-serif;
            font-size: 14px;
            font-weight: 700;
            padding: 6px 16px;
            border-radius: 14px;
            cursor: pointer;
        }

        .floating-reset-btn {
            position: absolute;
            right: -16px;
            top: 160px;
            width: 46px;
            height: 42px;
            background-color: var(--danger);
            border-top-left-radius: 18px;
            border-bottom-left-radius: 18px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(239, 83, 80, 0.4);
        }

        .floating-reset-btn svg {
            fill: #FFFFFF;
            width: 18px;
            height: 18px;
        }

        .motivation-container {
            text-align: center;
            padding: 8px;
            min-height: 75px;
            cursor: pointer;
            margin-bottom: 10px;
        }

        .quote-text {
            font-style: italic;
            font-size: 14px;
            color: var(--quote-color);
            line-height: 1.5;
            margin-bottom: 4px;
        }

        .quote-author {
            font-size: 12px;
            color: var(--text-muted);
            font-weight: 600;
        }

        .bottom-actions-streak {
            display: flex;
            justify-content: center;
            gap: 40px;
        }

        .action-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
        }

        .action-btn-box {
            width: 50px;
            height: 50px;
            border: 1.5px solid var(--card-border);
            background: var(--card-bg);
            border-radius: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 6px;
        }

        .action-btn-box svg {
            width: 22px;
            height: 22px;
            fill: #7C4DFF;
        }

        .action-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
        }

        .rank-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 14px;
            text-align: center;
            margin-bottom: 10px;
            cursor: pointer;
        }

        .rank-card.active-rank {
            border: 2px solid var(--accent-green);
            background-color: var(--accent-green-dim);
        }

        .rank-card .rank-title {
            font-family: 'Kalpurush', serif;
            font-size: 18px;
            font-weight: 700;
            color: var(--text-color);
            margin-bottom: 4px;
        }

        .rank-days-desc {
            font-size: 12px;
            color: var(--text-muted);
        }

        .rank-status-tag {
            font-size: 11px;
            margin-top: 4px;
            font-weight: 700;
        }

        .rank-status-tag.active { color: var(--accent-green); }
        .rank-status-tag.done { color: #66BB6A; }
        .rank-status-tag.locked { color: #546E7A; }

        .history-item {
            padding: 12px 4px;
            border-bottom: 1px solid var(--border-subtle);
        }

        .history-days-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-color);
            margin-bottom: 2px;
        }

        .history-date-range {
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 4px;
        }

        .history-comment {
            font-size: 13px;
            color: var(--quote-color);
        }

        /* Sub Tab Bar */
        .tab-bar-sub {
            display: flex;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 14px;
            padding: 4px;
            margin-bottom: 16px;
            gap: 4px;
        }

        .tab-sub-item {
            flex: 1;
            padding: 8px 4px;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            color: var(--text-muted);
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }

        .tab-sub-item.active {
            background: var(--accent-green-dim);
            color: var(--accent-green);
            border: 1px solid var(--accent-green);
        }

        .target-card-full {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 18px;
            padding: 20px 16px;
            text-align: center;
            cursor: pointer;
        }

        .tasbeeh-circle-wrap {
            position: relative;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden; /* Boundary restriction */
            user-select: none;
            cursor: pointer;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(11, 19, 38, 0.95) 100%);
            border: 3px solid #10b981;
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.25), inset 0 0 15px rgba(16, 185, 129, 0.15);
            margin: 16px auto;
            transition: transform 0.1s ease, box-shadow 0.15s ease;
        }

        .tasbeeh-circle-wrap:active {
            transform: scale(0.97);
        }

        .tasbeeh-ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(52, 211, 153, 0.35);
            transform: scale(0);
            animation: tasbih-wave 0.5s ease-out;
            pointer-events: none;
        }

        @keyframes tasbih-wave {
            to {
                transform: scale(2.5);
                opacity: 0;
            }
        }

        .tasbeeh-svg {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            transform: rotate(-90deg);
        }

        .tasbeeh-bg {
            fill: none;
            stroke: var(--circle-bg);
            stroke-width: 9;
        }

        .tasbeeh-bar {
            fill: none;
            stroke: var(--accent-green);
            stroke-width: 9;
            stroke-linecap: round;
            stroke-dasharray: 502.65;
            stroke-dashoffset: 502.65;
            transition: stroke-dashoffset 0.2s ease;
        }

        .tasbeeh-current-num {
            font-family: 'Inter', sans-serif;
            font-size: 48px;
            font-weight: 800;
            color: var(--text-color);
            line-height: 1;
        }

        .target-actions-row {
            display: flex;
            gap: 10px;
            margin-top: 14px;
        }

        .btn-target-secondary {
            flex: 1;
            background: #161D24;
            color: #E2E8F0;
            border: 1px solid #263238;
            border-radius: 12px;
            padding: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .alarm-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 14px;
            padding: 14px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .alarm-time {
            font-family: 'Inter', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: var(--text-color);
        }

        .alarm-switch {
            position: relative;
            width: 42px;
            height: 22px;
            display: inline-block;
        }

        .alarm-switch input { opacity: 0; width: 0; height: 0; }

        .switch-slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background-color: #263238; transition: .3s; border-radius: 22px;
        }

        .switch-slider:before {
            position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
            background-color: white; transition: .3s; border-radius: 50%;
        }

        input:checked + .switch-slider { background-color: var(--accent-green); }
        input:checked + .switch-slider:before { transform: translateX(20px); background-color: #000; }

        /* App Bottom Nav */
        #app-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            max-width: 440px;
            margin: 0 auto;
            background: var(--nav-bg);
            border-top: 1px solid var(--nav-border);
            display: flex;
            justify-content: space-around;
            padding: 8px 0;
            z-index: 9999;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
        }

        .app-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            color: var(--text-muted);
            font-size: 11px;
            font-weight: 700;
            flex: 1;
            gap: 4px;
            transition: color 0.2s;
        }

        .app-nav-item svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }

        .app-nav-item.active {
            color: var(--accent-green);
        }

        /* Modals & Fullscreens */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(4px);
            z-index: 100000;
            display: none;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .modal-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 20px;
            width: 100%;
            max-width: 380px;
            box-sizing: border-box;
            text-align: center;
        }

        /* Onboarding Wizard Card Styling (Feature Guide & Unlock Alert Style) */
        .onboarding-wizard-card {
            background: #0b1326 !important;
            border: 1.5px solid rgba(16, 185, 129, 0.4) !important;
            border-radius: 24px !important;
            padding: 22px 20px !important;
            max-width: 380px !important;
            width: 92% !important;
            text-align: center !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(16, 185, 129, 0.15) !important;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .onboarding-header {
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
        }

        .onboarding-title-row {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .onboarding-title {
            font-size: 17px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.3px;
        }

        .onboarding-counter {
            font-size: 12.5px;
            font-weight: 700;
            color: #34d399;
            background: rgba(16, 185, 129, 0.12);
            padding: 5px 10px;
            border-radius: 8px;
            border: 1px solid rgba(16, 185, 129, 0.25);
            display: inline-block;
            align-self: flex-start;
        }

        .onboarding-progress-track {
            width: 100%;
            height: 10px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .onboarding-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #38bdf8 100%);
            border-radius: 10px;
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        .onboarding-focus-step {
            background: rgba(16, 185, 129, 0.06);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 18px;
            padding: 20px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .onboarding-step-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.3);
            margin-bottom: 4px;
        }

        .onboarding-step-title {
            font-size: 15px;
            font-weight: 800;
            color: #ffffff;
            margin: 0;
            line-height: 1.3;
        }

        .onboarding-step-desc {
            font-size: 12px;
            color: #cbd5e1;
            line-height: 1.5;
            margin: 0;
        }

        .onboarding-action-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            border-radius: 14px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
            transition: transform 0.15s ease, opacity 0.2s ease, background 0.2s ease;
        }

        .onboarding-action-btn:active {
            transform: scale(0.98);
            opacity: 0.9;
        }

        .input-dark {
            width: 100%;
            background: #141C24;
            border: 1px solid #263238;
            border-radius: 12px;
            padding: 10px;
            color: #FFFFFF;
            font-family: inherit;
            font-size: 13px;
            margin-bottom: 12px;
            outline: none;
            box-sizing: border-box;
        }

        .modal-btn-row {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }

        .btn-modal {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            border: none;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
        }

        .fullscreen-takeover {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 9999999;
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 24px;
            box-sizing: border-box;
        }

        #fullscreen-alarm-screen {
            background: radial-gradient(circle, #0B3C2B 0%, #000000 90%);
        }

        #fullscreen-penalty-lock {
            background: radial-gradient(circle, #380C0C 0%, #000000 95%);
        }

        /* ==========================================================================
           SOCIAL MEDIA CONTROL MODULE STYLES
           ========================================================================== */
        .social-control-card {
            border-left: 4px solid #FF1744 !important;
            background: linear-gradient(135deg, rgba(255, 23, 68, 0.08) 0%, var(--card-bg) 100%);
        }

        .btn-enter-social-control {
            width: 100%;
            background: linear-gradient(135deg, #FF1744 0%, #D50000 100%);
            color: #FFFFFF;
            border: none;
            border-radius: 14px;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .btn-enter-social-control:active {
            transform: scale(0.98);
        }

        .social-header-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-top: 4px;
        }

        .btn-back-home {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            color: var(--text-color);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: background-color 0.2s;
        }

        .btn-back-home:active {
            background: var(--border-subtle);
        }

        .social-title {
            font-size: 20px;
            line-height: 1.2;
            color: #FF2A55;
        }

        .search-box-container {
            position: relative;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
        }

        .search-icon {
            position: absolute;
            left: 14px;
            width: 18px;
            height: 18px;
            fill: var(--text-muted);
            pointer-events: none;
        }

        .search-input {
            width: 100%;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 14px;
            padding: 12px 38px 12px 42px;
            font-size: 13px;
            color: var(--text-color);
            outline: none;
            transition: border-color 0.2s;
        }

        .search-input:focus {
            border-color: #FF1744;
        }

        .search-clear-btn {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 20px;
            cursor: pointer;
            padding: 0 4px;
        }

        .apps-section-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 18px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .social-highlight-card {
            border: 1px solid rgba(255, 23, 68, 0.3);
            background: linear-gradient(180deg, rgba(255, 23, 68, 0.05) 0%, var(--card-bg) 100%);
        }

        .section-title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .text-social-gradient {
            color: #FF2A55;
        }

        .badge-count {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            background: rgba(139, 148, 158, 0.15);
            padding: 3px 8px;
            border-radius: 10px;
        }

        .social-badge-count {
            color: #FF1744;
            background: rgba(255, 23, 68, 0.15);
        }

        .app-list-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .app-item-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--card-border);
            border-radius: 14px;
            transition: background 0.2s;
        }

        .social-item-highlight {
            border-color: rgba(255, 23, 68, 0.25);
            background: rgba(255, 23, 68, 0.04);
        }

        .app-item-left {
            display: flex;
            align-items: center;
            gap: 12px;
            overflow: hidden;
            flex: 1;
        }

        .app-icon-img {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            object-fit: contain;
            flex-shrink: 0;
            background: #1A202C;
        }

        .app-info-col {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .app-name-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-color);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .app-package-sub {
            font-size: 11px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: monospace;
        }

        .app-item-right {
            margin-left: 8px;
            flex-shrink: 0;
        }

        .badge-social-tag {
            font-size: 10px;
            font-weight: 800;
            color: #FF1744;
            background: rgba(255, 23, 68, 0.15);
            border: 1px solid rgba(255, 23, 68, 0.3);
            padding: 3px 8px;
            border-radius: 8px;
        }

        .badge-app-tag {
            font-size: 10px;
            font-weight: 700;
            color: var(--text-muted);
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--card-border);
            padding: 3px 8px;
            border-radius: 8px;
        }

        /* Skeleton Loading Animation */
        .skeleton-loader-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .skeleton-header {
            height: 24px;
            width: 60%;
            background: linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite;
            border-radius: 6px;
        }

        .skeleton-card {
            height: 62px;
            width: 100%;
            background: linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite;
            border-radius: 14px;
        }

        @keyframes skeleton-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .empty-state-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 18px;
            padding: 32px 16px;
            text-align: center;
        }

        /* App Blocker UI Additions */
        .btn-trigger-block {
            background: linear-gradient(135deg, #FF1744 0%, #C62828 100%);
            color: #FFFFFF;
            border: none;
            border-radius: 10px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(255, 23, 68, 0.3);
            transition: transform 0.1s ease;
        }

        .btn-trigger-block:active {
            transform: scale(0.95);
        }

        .app-card-blocked {
            border-color: #FF1744 !important;
            background: rgba(255, 23, 68, 0.08) !important;
        }

        .blocked-active-badge {
            background: rgba(255, 23, 68, 0.2);
            color: #FF1744;
            border: 1px solid rgba(255, 23, 68, 0.4);
            border-radius: 10px;
            padding: 5px 10px;
            font-family: monospace;
            font-size: 12px;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .lock-icon-pulse {
            animation: pulse-lock 1.5s infinite;
        }

        @keyframes pulse-lock {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }

        .block-setup-modal-card {
            text-align: left !important;
            max-width: 400px;
        }

        .modal-app-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--card-border);
            margin-bottom: 14px;
        }

        .modal-app-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            object-fit: contain;
            background: #1A202C;
        }

        .modal-app-title {
            font-size: 16px;
            font-weight: 800;
            color: var(--text-color);
        }

        .modal-app-pkg {
            font-size: 11px;
            color: var(--text-muted);
            font-family: monospace;
        }

        .modal-block-title {
            font-size: 16px;
            font-weight: 800;
            color: var(--text-color);
            margin-bottom: 4px;
        }

        .modal-block-desc {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.4;
            margin-bottom: 14px;
        }

        .block-unit-tabs {
            display: flex;
            background: #141C24;
            border: 1px solid #263238;
            border-radius: 12px;
            padding: 3px;
            margin-bottom: 12px;
            gap: 4px;
        }

        .unit-tab-btn {
            flex: 1;
            background: none;
            border: none;
            color: var(--text-muted);
            padding: 8px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .unit-tab-btn.active {
            background: #FF1744;
            color: #FFFFFF;
        }

        .preset-pills-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 14px;
        }

        .preset-pill-btn {
            background: #141C24;
            border: 1px solid #263238;
            color: var(--text-color);
            padding: 6px 12px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }

        .preset-pill-btn:active, .preset-pill-btn.selected {
            background: rgba(255, 23, 68, 0.2);
            border-color: #FF1744;
            color: #FF1744;
        }

        .strict-warning-banner {
            background: rgba(255, 23, 68, 0.1);
            border: 1px solid rgba(255, 23, 68, 0.3);
            border-radius: 12px;
            padding: 10px;
            font-size: 11px;
            color: #FF8A80;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 14px;
            line-height: 1.4;
        }

        .btn-confirm-block {
            background: linear-gradient(135deg, #FF1744 0%, #D50000 100%) !important;
            color: #FFFFFF !important;
            box-shadow: 0 4px 12px rgba(255, 23, 68, 0.3);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes shimmerWave {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        .shimmer-text {
            background: linear-gradient(90deg, #38bdf8 0%, #ffffff 50%, #38bdf8 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmerWave 2s linear infinite;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.5px;
        }
        /* ==========================================================================
           NETWORK CONTROL FIREWALL STYLES
           ========================================================================== */
        .btn-circular-control {
            border: none;
            cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .btn-circular-control:active {
            transform: scale(0.96);
        }

        .network-header-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            padding-top: 4px;
        }

        .badge-firewall-live {
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.15);
            border: 1px solid rgba(56, 189, 248, 0.35);
            padding: 2px 7px;
            border-radius: 6px;
        }

        .network-status-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: 14px;
            padding: 12px 14px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .network-status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #38bdf8;
            box-shadow: 0 0 8px #38bdf8;
            flex-shrink: 0;
        }

        .btn-grant-vpn-chip {
            background: #38bdf8;
            color: #031525;
            border: none;
            border-radius: 12px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(56, 189, 248, 0.35);
            transition: transform 0.15s;
        }

        .btn-grant-vpn-chip:active {
            transform: scale(0.95);
        }

        .network-filter-chips-row {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
            margin-bottom: 12px;
            scrollbar-width: none;
        }

        .network-filter-chips-row::-webkit-scrollbar {
            display: none;
        }

        .filter-chip-btn {
            background: #111827;
            border: 1px solid #1f2937;
            color: #94a3b8;
            border-radius: 20px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .filter-chip-btn.active {
            background: #38bdf8;
            color: #031525;
            border-color: #38bdf8;
            box-shadow: 0 2px 8px rgba(56, 189, 248, 0.25);
        }

        .network-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }

        .network-stat-box {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .stat-num {
            font-size: 16px;
            font-weight: 800;
            line-height: 1.2;
        }

        .stat-lbl {
            font-size: 9.5px;
            font-weight: 600;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .network-app-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--card-border);
            border-left: 3.5px solid transparent;
            border-radius: 14px;
            padding: 10px 12px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .network-app-card.card-both-blocked {
            border-left: 3.5px solid #ef4444;
            border-color: rgba(239, 68, 68, 0.35);
            background: rgba(239, 68, 68, 0.05);
        }

        .network-app-card.card-wifi-blocked {
            border-left: 3.5px solid #f59e0b;
            border-color: rgba(245, 158, 11, 0.3);
            background: rgba(245, 158, 11, 0.03);
        }

        .network-app-card.card-data-blocked {
            border-left: 3.5px solid #38bdf8;
            border-color: rgba(56, 189, 248, 0.3);
            background: rgba(56, 189, 248, 0.03);
        }

        .network-app-main-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        .network-toggle-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .btn-net-toggle {
            width: 42px;
            height: 42px;
            min-width: 42px;
            min-height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border-radius: 12px;
            cursor: pointer;
            border: 1.5px solid transparent;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
            box-sizing: border-box;
        }

        .btn-net-toggle:active {
            transform: scale(0.92);
        }

        .btn-toggle-wifi.allowed {
            color: #34d399;
            border-color: rgba(52, 211, 153, 0.3);
            background: rgba(52, 211, 153, 0.09);
            box-shadow: 0 2px 6px rgba(52, 211, 153, 0.08);
        }

        .btn-toggle-data.allowed {
            color: #38bdf8;
            border-color: rgba(56, 189, 248, 0.3);
            background: rgba(56, 189, 248, 0.09);
            box-shadow: 0 2px 6px rgba(56, 189, 248, 0.08);
        }

        .btn-net-toggle.blocked {
            background: rgba(239, 68, 68, 0.16);
            color: #ef4444;
            border-color: #ef4444;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);
        }

        .network-help-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(56, 189, 248, 0.2);
            border-radius: 14px;
            padding: 12px 14px;
            margin-top: 18px;
            margin-bottom: 24px;
        }

        /* ==========================================================================
           VIDEO DOWNLOADER STYLES
           ========================================================================== */
        .video-downloader-wrapper {
            padding-bottom: 90px;
        }

        .badge-downloader-free {
            font-size: 9px;
            font-weight: 800;
            background: linear-gradient(90deg, #a855f7, #6366f1);
            color: #ffffff;
            padding: 2px 8px;
            border-radius: 10px;
            letter-spacing: 0.5px;
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
        }

        .btn-open-downloads-folder {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            background: rgba(168, 85, 247, 0.12);
            border: 1px solid rgba(168, 85, 247, 0.3);
            color: #c084fc;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            outline: none;
        }

        .btn-open-downloads-folder:active {
            transform: scale(0.92);
        }

        .downloader-platforms-row {
            display: flex;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
            padding: 4px 2px 10px 2px;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        .downloader-platforms-row::-webkit-scrollbar {
            display: none;
        }

        .platform-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid #1e293b;
            color: #94a3b8;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .platform-chip .svg-icon {
            width: 14px;
            height: 14px;
        }

        .platform-chip.active-platform {
            border-color: #a855f7;
            background: rgba(168, 85, 247, 0.15);
            color: #c084fc;
            box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);
        }

        .downloader-search-card {
            background: rgba(15, 23, 42, 0.8);
            border: 1.5px solid rgba(168, 85, 247, 0.35);
            border-radius: 18px;
            padding: 12px 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 14px rgba(168, 85, 247, 0.08);
            margin-top: 6px;
        }

        .downloader-input-wrapper {
            display: flex;
            align-items: center;
            background: #090e1a;
            border: 1px solid #1e293b;
            border-radius: 14px;
            padding: 2px 10px;
            gap: 8px;
        }

        .downloader-search-icon {
            color: #94a3b8;
            display: flex;
            align-items: center;
        }

        .downloader-search-icon .svg-icon {
            width: 18px;
            height: 18px;
        }

        .downloader-input {
            flex: 1;
            background: transparent;
            border: none;
            color: #ffffff;
            font-size: 12.5px;
            padding: 10px 4px;
            outline: none;
        }

        .downloader-input::placeholder {
            color: #64748b;
        }

        .downloader-clear-btn {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 18px;
            cursor: pointer;
            padding: 0 4px;
        }

        .downloader-action-btns-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
        }

        .btn-paste-clipboard {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #334155;
            color: #cbd5e1;
            padding: 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            outline: none;
        }

        .btn-paste-clipboard:active {
            transform: scale(0.95);
        }

        .btn-analyze-video {
            flex: 1.4;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
            border: none;
            color: #ffffff;
            padding: 10px;
            border-radius: 12px;
            font-size: 12.5px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            outline: none;
            box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35);
        }

        .btn-analyze-video:active {
            transform: scale(0.95);
        }

        .btn-analyze-video.loading {
            opacity: 0.8;
            pointer-events: none;
        }

        .downloader-analyzing-card {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(168, 85, 247, 0.25);
            border-radius: 18px;
            padding: 32px 16px;
            text-align: center;
        }

        .spinner-large {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(168, 85, 247, 0.2);
            border-top-color: #c084fc;
            border-radius: 50%;
            margin: 0 auto;
            animation: spin 0.8s linear infinite;
        }

        .spinner-small {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .video-preview-card {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 18px;
            padding: 14px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .video-preview-header {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .video-thumb-container {
            width: 120px;
            height: 72px;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
            background: #0f172a;
            flex-shrink: 0;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .video-thumb-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .video-duration-badge {
            position: absolute;
            bottom: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.8);
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
        }

        .video-source-badge {
            position: absolute;
            top: 4px;
            left: 4px;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 5px;
            border-radius: 4px;
            color: #ffffff;
            background: rgba(0, 0, 0, 0.7);
        }

        .video-source-badge.platform-youtube { background: #ef4444; }
        .video-source-badge.platform-facebook { background: #1877f2; }
        .video-source-badge.platform-instagram { background: #e1306c; }
        .video-source-badge.platform-tiktok { background: #000000; border: 1px solid #334155; }
        .video-source-badge.platform-twitter { background: #0f172a; }

        .video-meta-container {
            flex: 1;
            min-width: 0;
        }

        .video-title-text {
            font-size: 13.5px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 4px 0;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .video-author-text {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            color: #94a3b8;
        }

        .video-author-text .svg-icon {
            width: 13px;
            height: 13px;
            color: #c084fc;
        }

        .downloader-format-tabs {
            display: flex;
            background: #090e1a;
            border-radius: 12px;
            padding: 4px;
            margin-top: 14px;
            gap: 4px;
            border: 1px solid #1e293b;
        }

        .downloader-tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 700;
            padding: 8px 4px;
            border-radius: 9px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .downloader-tab-btn.active {
            background: rgba(168, 85, 247, 0.2);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.4);
        }

        .downloader-formats-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 12px;
        }

        .format-item-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 10px 12px;
            transition: all 0.18s;
        }

        .format-item-card:hover {
            border-color: rgba(168, 85, 247, 0.4);
        }

        .format-item-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .badge-quality {
            font-size: 10.5px;
            font-weight: 800;
            background: rgba(168, 85, 247, 0.18);
            border: 1px solid rgba(168, 85, 247, 0.35);
            color: #c084fc;
            padding: 4px 8px;
            border-radius: 8px;
            min-width: 44px;
            text-align: center;
        }

        .badge-quality.audio-badge {
            background: rgba(56, 189, 248, 0.15);
            border-color: rgba(56, 189, 248, 0.3);
            color: #38bdf8;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            padding: 0;
        }

        .badge-quality.audio-badge .svg-icon {
            width: 16px;
            height: 16px;
        }

        .format-item-label {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
        }

        .format-item-size {
            font-size: 10.5px;
            color: #94a3b8;
            margin-top: 1px;
        }

        .btn-start-download {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #10b981;
            border: none;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 7px 12px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            outline: none;
        }

        .btn-start-download:active {
            transform: scale(0.93);
        }

        .btn-start-download .svg-icon {
            width: 14px;
            height: 14px;
        }

        .btn-start-download.audio-btn {
            background: #0284c7;
        }

        .download-queue-container {
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 16px;
            padding: 12px 14px;
            margin-top: 12px;
        }

        .queue-header-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .queue-badge-count {
            font-size: 10px;
            font-weight: 800;
            background: rgba(168, 85, 247, 0.2);
            color: #c084fc;
            padding: 2px 7px;
            border-radius: 8px;
        }

        .queue-items-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .queue-item-card {
            background: #090e1a;
            border: 1px solid #1e293b;
            border-radius: 12px;
            padding: 9px 11px;
            position: relative;
            transition: all 0.2s;
        }

        .queue-item-card.status-running {
            border-color: rgba(168, 85, 247, 0.4);
            box-shadow: 0 2px 8px rgba(168, 85, 247, 0.08);
        }

        .queue-item-card.status-preparing {
            border-color: rgba(56, 189, 248, 0.4);
            box-shadow: 0 2px 8px rgba(56, 189, 248, 0.08);
        }

        .queue-item-card.status-paused {
            border-color: rgba(245, 158, 11, 0.4);
        }

        .queue-item-card.status-successful {
            border-color: rgba(16, 185, 129, 0.4);
        }

        .queue-item-card.status-failed {
            border-color: rgba(239, 68, 68, 0.4);
        }

        .queue-item-info {
            display: flex;
            align-items: center;
            gap: 9px;
        }

        .queue-item-type-icon {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            background: rgba(168, 85, 247, 0.15);
            color: #c084fc;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .queue-item-type-icon .svg-icon {
            width: 15px;
            height: 15px;
        }

        .queue-item-details {
            flex: 1;
            min-width: 0;
        }

        .queue-item-title {
            font-size: 11.5px;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .queue-item-sub {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
            flex-wrap: wrap;
        }

        .queue-item-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }

        .btn-queue-action {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            outline: none;
            transition: all 0.18s;
            padding: 0;
        }

        .btn-queue-action:active {
            transform: scale(0.92);
        }

        .btn-queue-action .svg-icon {
            width: 14px;
            height: 14px;
        }

        .btn-queue-action.btn-pause-action:hover,
        .btn-queue-action.btn-pause-action:active {
            background: rgba(245, 158, 11, 0.18);
            border-color: rgba(245, 158, 11, 0.4);
            color: #fbbf24;
        }

        .btn-queue-action.btn-resume-action:hover,
        .btn-queue-action.btn-resume-action:active {
            background: rgba(16, 185, 129, 0.18);
            border-color: rgba(16, 185, 129, 0.4);
            color: #34d399;
        }

        .btn-queue-action.btn-delete-action:hover,
        .btn-queue-action.btn-delete-action:active {
            background: rgba(239, 68, 68, 0.18);
            border-color: rgba(239, 68, 68, 0.4);
            color: #f87171;
        }

        .btn-queue-action.btn-more-action:hover,
        .btn-queue-action.btn-more-action:active {
            background: rgba(168, 85, 247, 0.18);
            border-color: rgba(168, 85, 247, 0.4);
            color: #c084fc;
        }

        /* 3-Dot Dropdown Menu */
        .queue-item-menu {
            position: absolute;
            right: 10px;
            top: 40px;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 10px;
            padding: 4px;
            z-index: 100;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.65);
            min-width: 160px;
            animation: fadeInDown 0.15s ease-out;
        }

        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .queue-menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 10px;
            font-size: 11.5px;
            font-weight: 600;
            color: #e2e8f0;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s;
            width: 100%;
            background: transparent;
            border: none;
            text-align: left;
        }

        .queue-menu-item:hover, .queue-menu-item:active {
            background: rgba(255, 255, 255, 0.08);
        }

        .queue-menu-item.danger {
            color: #f87171;
        }

        .queue-menu-item.danger:hover, .queue-menu-item.danger:active {
            background: rgba(239, 68, 68, 0.15);
        }

        .queue-menu-item .svg-icon {
            width: 13px;
            height: 13px;
            flex-shrink: 0;
        }

        .queue-item-card.status-successful .queue-status-text {
            color: #10b981;
            font-weight: 700;
        }

        .queue-item-card.status-failed .queue-status-text {
            color: #ef4444;
            font-weight: 700;
        }

        .queue-item-card.status-paused .queue-status-text {
            color: #f59e0b;
            font-weight: 700;
        }

        .queue-item-card.status-preparing .queue-status-text {
            color: #38bdf8;
            font-weight: 700;
        }

        .queue-progress-bar-bg {
            width: 100%;
            height: 4.5px;
            background: #1e293b;
            border-radius: 3px;
            margin-top: 7px;
            overflow: hidden;
            position: relative;
        }

        .queue-progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #a855f7, #38bdf8);
            border-radius: 3px;
            transition: width 0.3s;
        }

        .queue-progress-bar-fill.paused-fill {
            background: #f59e0b !important;
        }

        @keyframes queueStripe {
            0% { background-position: 0 0; }
            100% { background-position: 30px 0; }
        }

        .queue-progress-bar-fill.preparing-stripes {
            width: 100% !important;
            background: linear-gradient(
                45deg,
                rgba(168, 85, 247, 0.75) 25%,
                rgba(56, 189, 248, 0.85) 25%,
                rgba(56, 189, 248, 0.85) 50%,
                rgba(168, 85, 247, 0.75) 50%,
                rgba(168, 85, 247, 0.75) 75%,
                rgba(56, 189, 248, 0.85) 75%,
                rgba(56, 189, 248, 0.85) 100%
            );
            background-size: 30px 30px;
            animation: queueStripe 1s linear infinite;
        }

        .downloader-info-guide {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(168, 85, 247, 0.2);
            border-radius: 14px;
            padding: 12px 14px;
            margin-top: 18px;
            margin-bottom: 24px;
        }
    `;
    document.head.appendChild(style);
}
