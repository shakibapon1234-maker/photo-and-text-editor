/**
 * Presentation Studio & Player — AI Floating Fairy Doll Assistant
 * Inspired by Wings Fly AI Assistant (v4.0 Cinematic Angel Doll)
 * 
 * Features:
 *  - Pure SVG + CSS animated floating fairy doll with glowing halo, flapping wings, and neon magic ring.
 *  - Fully draggable across the screen (mouse & touch) with persistent position memory.
 *  - Voice Recognition (Web Speech API) supporting English & Bengali commands.
 *  - Slide Navigation: Next, Previous, First, Last, Go to slide N.
 *  - Voice Readback: "Read slide" / "পড়ে শোনাও" reads the current slide content aloud!
 *  - Presentation Tools: Fullscreen, Laser pointer, Blank screen, Start presentation.
 *  - Speech Synthesis (TTS) with real-time lip sync & bounce animation.
 *  - Works seamlessly in both Presentation Studio (Editor) and Presentation Player / Standalone HTML!
 */

(function () {
  if (window.__PresentationAIAssistantLoaded) return;
  window.__PresentationAIAssistantLoaded = true;

  // ── Configuration & State ────────────────────────────────────────────────
  const STORAGE_KEY_POS = 'presentation_ai_doll_pos';
  const STORAGE_KEY_ENABLED = 'presentation_ai_doll_enabled';
  
  let isListening = false;
  let isSpeaking = false;
  let shouldKeepListening = false;
  let isRestarting = false;
  let recognition = null;
  let synth = typeof window.speechSynthesis !== 'undefined' ? window.speechSynthesis : null;
  let selectedVoice = null;
  let currentLang = 'bn-BD'; // Support both English and Bengali seamlessly
  
  let container = null;
  let dollEl = null;
  let bubbleEl = null;
  let bubbleTextEl = null;
  let bubbleTimeout = null;

  // ── Pure CSS Styles ───────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('presentation-ai-doll-styles')) return;
    const style = document.createElement('style');
    style.id = 'presentation-ai-doll-styles';
    style.textContent = `
      /* ── AI Avatar Container ── */
      #ai-avatar-container {
        position: fixed;
        bottom: 24px;
        right: 28px;
        width: 140px;
        height: 195px;
        z-index: 99999;
        cursor: grab;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
        filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
      }
      #ai-avatar-container:active {
        cursor: grabbing;
      }
      #ai-avatar-container.minimized {
        transform: scale(0.38) translate(80px, 80px);
        opacity: 0.55;
      }
      #ai-avatar-container.minimized:hover {
        transform: scale(0.65) translate(20px, 20px);
        opacity: 1;
      }
      #ai-avatar-container.hidden-doll {
        display: none !important;
      }

      /* ── Doll Floating Animation ── */
      #ai-doll {
        position: relative;
        width: 140px;
        height: 195px;
        animation: doll-float 4s ease-in-out infinite;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      @keyframes doll-float {
        0%, 100% { transform: translateY(0px) rotateY(-4deg); }
        50%       { transform: translateY(-15px) rotateY(4deg); }
      }

      #ai-doll-svg {
        width: 140px;
        height: 190px;
        overflow: visible;
        filter: drop-shadow(0 6px 20px rgba(180, 60, 255, 0.5));
      }

      /* ── Wings Flapping ── */
      #ai-wing-left {
        transform-origin: 42px 115px;
        animation: wing-left 2.8s ease-in-out infinite alternate;
      }
      #ai-wing-right {
        transform-origin: 118px 115px;
        animation: wing-right 2.8s ease-in-out infinite alternate;
      }
      @keyframes wing-left {
        from { transform: rotate(-6deg) scaleX(1); }
        to   { transform: rotate(14deg) scaleX(1.12); }
      }
      @keyframes wing-right {
        from { transform: rotate(6deg) scaleX(1); }
        to   { transform: rotate(-14deg) scaleX(1.12); }
      }

      /* ── Halo Pulsing ── */
      #ai-halo {
        animation: halo-glow 2.5s ease-in-out infinite;
      }
      @keyframes halo-glow {
        0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 4px #ffd700); }
        50%      { opacity: 1;    filter: drop-shadow(0 0 16px #ffe96a); }
      }

      /* ── Eye Blink ── */
      #ai-eye-l, #ai-eye-r {
        animation: eye-blink 4.2s ease-in-out infinite;
        transform-origin: center;
      }
      @keyframes eye-blink {
        0%, 88%, 100% { transform: scaleY(1); }
        92%           { transform: scaleY(0.08); }
      }

      /* ── Dress Panels Shimmer ── */
      #ai-panel-2 { animation: shimmer 3.8s infinite ease-in-out; }
      #ai-panel-3 { animation: shimmer 3.8s infinite ease-in-out 1s; }
      #ai-panel-4 { animation: shimmer 3.8s infinite ease-in-out 2s; }
      @keyframes shimmer {
        0%, 100% { opacity: 0.25; }
        50%      { opacity: 0.8; }
      }

      /* ── Neon Magic Base Ring ── */
      #ai-base-ring {
        animation: ring-spin 6s linear infinite;
        transform-origin: 80px 213px;
      }
      @keyframes ring-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      /* ── Sparkles ── */
      .ai-float-sparkle {
        position: absolute;
        font-size: 13px;
        pointer-events: none;
        user-select: none;
        animation: sparkle-float 3s ease-in-out infinite;
      }
      .ai-float-sparkle:nth-child(1) { top: 18px; left: -10px; animation-delay: 0s; color: #ffd700; }
      .ai-float-sparkle:nth-child(2) { top: 52px; right: -12px; animation-delay: 1.1s; color: #f472e8; }
      .ai-float-sparkle:nth-child(3) { top: 5px;  right: 12px;  animation-delay: 2.1s; color: #00e5ff; }
      @keyframes sparkle-float {
        0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
        50%      { opacity: 1; transform: translateY(-14px) scale(1.3); }
      }

      /* ── LISTENING STATE ── */
      #ai-avatar-container.listening #ai-base-ring {
        stroke: #00ff88 !important;
        filter: drop-shadow(0 0 12px #00ff88) !important;
        animation: ring-spin 1.8s linear infinite !important;
      }
      #ai-avatar-container.listening #ai-doll {
        animation: listening-pulse 0.9s ease-in-out infinite alternate !important;
      }
      @keyframes listening-pulse {
        from { filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.4)); transform: translateY(-4px) scale(1); }
        to   { filter: drop-shadow(0 0 26px rgba(0, 255, 136, 0.95)); transform: translateY(-18px) scale(1.04); }
      }

      /* ── TALKING STATE ── */
      #ai-avatar-container.talking #ai-doll {
        animation: doll-talk-bounce 0.3s ease-in-out infinite alternate !important;
      }
      @keyframes doll-talk-bounce {
        from { transform: translateY(-12px) scale(1); }
        to   { transform: translateY(-18px) scale(1.03); }
      }
      #ai-avatar-container.talking #ai-wing-left {
        animation: wing-talk 0.35s ease-in-out infinite alternate !important;
      }
      #ai-avatar-container.talking #ai-wing-right {
        animation: wing-talk 0.35s ease-in-out infinite alternate-reverse !important;
      }
      @keyframes wing-talk {
        from { transform: rotate(-8deg) scaleX(1); }
        to   { transform: rotate(22deg) scaleX(1.25); }
      }
      #ai-avatar-container.talking #ai-mouth-path {
        animation: mouth-talk 0.22s ease-in-out infinite alternate !important;
      }
      @keyframes mouth-talk {
        from { d: path("M74 102 Q80 106 86 102"); }
        to   { d: path("M74 102 Q80 114 86 102"); }
      }

      /* ── Speech Bubble ── */
      #ai-speech-bubble {
        position: fixed;
        background: linear-gradient(135deg, rgba(16, 8, 36, 0.95), rgba(38, 12, 70, 0.95));
        border: 1.5px solid rgba(200, 128, 255, 0.65);
        border-radius: 16px 16px 4px 16px;
        padding: 9px 15px;
        max-width: 250px;
        min-width: 80px;
        font-size: 13px;
        font-weight: 500;
        color: #f5e8ff;
        z-index: 100000;
        opacity: 0;
        transform: scale(0.85) translateY(10px);
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        box-shadow: 0 8px 32px rgba(160, 80, 255, 0.4), inset 0 0 12px rgba(255, 255, 255, 0.08);
        line-height: 1.4;
        backdrop-filter: blur(8px);
        font-family: system-ui, -apple-system, sans-serif;
      }
      #ai-speech-bubble.visible {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      #ai-speech-bubble::after {
        content: '';
        position: absolute;
        bottom: -7px;
        right: 20px;
        border: 7px solid transparent;
        border-top-color: rgba(38, 12, 70, 0.95);
        border-bottom: none;
      }

      /* ── Quick Control Pill on Hover ── */
      .ai-doll-pill {
        position: absolute;
        top: -10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 20px;
        padding: 3px 8px;
        display: flex;
        gap: 6px;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: auto;
        z-index: 100001;
      }
      #ai-avatar-container:hover .ai-doll-pill {
        opacity: 1;
        transform: translateY(0);
      }
      .ai-doll-pill button {
        background: none;
        border: none;
        color: #fff;
        font-size: 11px;
        cursor: pointer;
        padding: 1px 3px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .ai-doll-pill button:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  // ── SVG Artwork Generator ─────────────────────────────────────────────────
  function buildDollHTML() {
    return `
      <div class="ai-doll-pill" id="ai-doll-pill">
        <button id="aiDollMicBtn" title="Click to speak (English/বাংলা)">🎙️ Talk</button>
        <button id="aiDollMinBtn" title="Minimize / Sleep">💤</button>
      </div>
      <div id="ai-doll">
        <span class="ai-float-sparkle">✦</span>
        <span class="ai-float-sparkle">✨</span>
        <span class="ai-float-sparkle">★</span>
        <svg id="ai-doll-svg" viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="wfa-skin" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#fce4cc"/>
              <stop offset="100%" stop-color="#f5c5a0"/>
            </radialGradient>
            <radialGradient id="wfa-dress" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stop-color="#f472e8"/>
              <stop offset="100%" stop-color="#9b40e8"/>
            </radialGradient>
            <radialGradient id="wfa-wing" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stop-color="rgba(230,190,255,0.92)"/>
              <stop offset="100%" stop-color="rgba(160,90,230,0.38)"/>
            </radialGradient>
          </defs>

          <!-- Wings -->
          <ellipse id="ai-wing-left"  cx="42"  cy="115" rx="40" ry="26" fill="url(#wfa-wing)" stroke="#c880ff" stroke-width="0.8" opacity="0.88"/>
          <ellipse id="ai-wing-right" cx="118" cy="115" rx="40" ry="26" fill="url(#wfa-wing)" stroke="#c880ff" stroke-width="0.8" opacity="0.88"/>
          <ellipse cx="38"  cy="132" rx="26" ry="16" fill="url(#wfa-wing)" stroke="#c880ff" stroke-width="0.6" opacity="0.68"/>
          <ellipse cx="122" cy="132" rx="26" ry="16" fill="url(#wfa-wing)" stroke="#c880ff" stroke-width="0.6" opacity="0.68"/>

          <!-- Glow -->
          <ellipse cx="80" cy="210" rx="44" ry="8" fill="rgba(180,60,255,0.18)"/>

          <!-- Skirt -->
          <path d="M44 138 Q38 175 36 198 Q80 212 124 198 Q122 175 116 138 Z" fill="url(#wfa-dress)"/>
          <path id="ai-panel-2" d="M52 140 Q48 168 46 192 Q62 200 78 202 Q66 175 60 145 Z" fill="#ffeaa7" opacity="0.3"/>
          <path id="ai-panel-3" d="M108 140 Q112 168 114 192 Q98 200 82 202 Q94 175 100 145 Z" fill="#55efc4" opacity="0.3"/>
          <path id="ai-panel-4" d="M65 195 Q80 210 95 195 Q88 205 80 207 Q72 205 65 195 Z" fill="#81ecec" opacity="0.3"/>
          <circle class="ai-skirt-dot" cx="62" cy="168" r="3" fill="#ffccff" opacity="0.9"/>
          <circle class="ai-skirt-dot" cx="80" cy="178" r="3.5" fill="#ff99ee" opacity="0.85"/>
          <circle class="ai-skirt-dot" cx="98" cy="166" r="3" fill="#ccaaff" opacity="0.9"/>
          <path d="M73 148 Q73 144 80 148 Q87 144 87 148 Q87 154 80 159 Q73 154 73 148Z" fill="#ff80d0" opacity="0.9"/>

          <!-- Body -->
          <rect x="63" y="108" width="34" height="34" rx="8" fill="url(#wfa-skin)"/>
          <path d="M56 122 Q80 113 104 122 L108 138 Q80 128 52 138 Z" fill="url(#wfa-dress)"/>

          <!-- Arms -->
          <path id="ai-arm-left"  d="M63 118 Q48 124 44 134" stroke="#f5c6a0" stroke-width="7" stroke-linecap="round" fill="none"/>
          <path id="ai-arm-right" d="M97 118 Q112 124 116 134" stroke="#f5c6a0" stroke-width="7" stroke-linecap="round" fill="none"/>
          <circle cx="43" cy="135" r="5.5" fill="#fce4cc"/>
          <circle cx="117" cy="135" r="5.5" fill="#fce4cc"/>

          <!-- Head -->
          <ellipse cx="80" cy="84" rx="26" ry="28" fill="url(#wfa-skin)"/>
          <ellipse cx="80" cy="72" rx="28" ry="24" fill="#c0521a"/>
          <path d="M54 78 Q57 54 80 52 Q103 54 106 78 Q98 64 80 62 Q62 64 54 78Z" fill="#d4611a"/>
          <path d="M54 80 Q48 98 50 112 Q57 102 60 88" fill="#c0521a"/>
          <path d="M106 80 Q112 98 110 112 Q103 102 100 88" fill="#c0521a"/>

          <!-- Eyes -->
          <ellipse cx="71" cy="85" rx="4.5" ry="5" fill="#fff"/>
          <ellipse cx="89" cy="85" rx="4.5" ry="5" fill="#fff"/>
          <ellipse id="ai-eye-l" cx="71" cy="86" rx="3.2" ry="3.8" fill="#4a90d9"/>
          <ellipse id="ai-eye-r" cx="89" cy="86" rx="3.2" ry="3.8" fill="#4a90d9"/>
          <circle cx="72" cy="85" r="1.4" fill="#1a3a6a"/>
          <circle cx="90" cy="85" r="1.4" fill="#1a3a6a"/>
          <circle cx="72.8" cy="84.2" r="0.9" fill="#fff"/>
          <circle cx="90.8" cy="84.2" r="0.9" fill="#fff"/>
          <line x1="68" y1="81" x2="66" y2="78" stroke="#3a2010" stroke-width="0.9" stroke-linecap="round"/>
          <line x1="71" y1="80" x2="70" y2="77" stroke="#3a2010" stroke-width="0.9" stroke-linecap="round"/>
          <line x1="75" y1="81" x2="75" y2="78" stroke="#3a2010" stroke-width="0.9" stroke-linecap="round"/>
          <line x1="86" y1="81" x2="86" y2="78" stroke="#3a2010" stroke-width="0.9" stroke-linecap="round"/>
          <line x1="89" y1="80" x2="90" y2="77" stroke="#3a2010" stroke-width="0.9" stroke-linecap="round"/>
          <line x1="93" y1="81" x2="95" y2="78" stroke="#3a2010" stroke-width="0.9" stroke-linecap="round"/>
          <ellipse cx="64" cy="91" rx="5.5" ry="3.5" fill="#ffaacc" opacity="0.5"/>
          <ellipse cx="96" cy="91" rx="5.5" ry="3.5" fill="#ffaacc" opacity="0.5"/>
          <path d="M78 92 Q80 95 82 92" stroke="#d4935a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <path id="ai-mouth-path" d="M74 100 Q80 106 86 100" stroke="#e06090" stroke-width="1.8" fill="none" stroke-linecap="round"/>

          <!-- Halo -->
          <ellipse id="ai-halo" cx="80" cy="53" rx="19" ry="5" fill="none" stroke="#ffd700" stroke-width="2.4" opacity="0.9"/>
          <ellipse cx="80" cy="52" rx="19" ry="5" fill="none" stroke="#ffe96a" stroke-width="1" opacity="0.4"/>

          <!-- Legs -->
          <rect id="ai-leg-left"  x="68" y="188" width="11" height="24" rx="5" fill="url(#wfa-skin)"/>
          <rect id="ai-leg-right" x="81" y="188" width="11" height="24" rx="5" fill="url(#wfa-skin)"/>

          <!-- Base ring -->
          <ellipse id="ai-base-ring" cx="80" cy="213" rx="52" ry="10"
            fill="none" stroke="rgba(0,229,255,0.6)" stroke-width="2.5"
            stroke-dasharray="8 4"
            style="filter:drop-shadow(0 0 8px rgba(0,229,255,0.7))"/>
        </svg>
      </div>`;
  }

  // ── Speech Bubble Display ─────────────────────────────────────────────────
  function showBubble(text, autoHideMs = 4000) {
    if (!bubbleEl || !bubbleTextEl) return;
    clearTimeout(bubbleTimeout);
    bubbleTextEl.innerHTML = text;
    updateBubblePosition();
    bubbleEl.classList.add('visible');
    if (autoHideMs > 0) {
      bubbleTimeout = setTimeout(hideBubble, autoHideMs);
    }
  }

  function hideBubble() {
    if (bubbleEl) bubbleEl.classList.remove('visible');
  }

  function updateBubblePosition() {
    if (!container || !bubbleEl) return;
    const r = container.getBoundingClientRect();
    const bubbleW = bubbleEl.offsetWidth || 200;
    const bubbleH = bubbleEl.offsetHeight || 50;

    let left = r.left - bubbleW + 30;
    let top = r.top - bubbleH - 12;

    if (left < 10) left = r.right + 10;
    if (top < 10) top = r.bottom + 10;

    bubbleEl.style.left = left + 'px';
    bubbleEl.style.top = top + 'px';
  }

  // ── Speech Synthesis (TTS) ────────────────────────────────────────────────
  function initTTS() {
    if (!synth) return;
    function pickVoice() {
      const voices = synth.getVoices() || [];
      // Prefer friendly female English or Bengali voice
      selectedVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google UK English Female')) && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0] || null;
    }
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = pickVoice;
    }
    pickVoice();
  }

  function speak(text, onComplete) {
    if (!synth || !text) {
      if (onComplete) onComplete();
      return;
    }
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = 1.05;
      utterance.pitch = 1.18; // Sweet, cheerful fairy pitch

      utterance.onstart = () => {
        isSpeaking = true;
        container?.classList.add('talking');
      };
      const finishSpeaking = () => {
        isSpeaking = false;
        container?.classList.remove('talking');
        if (shouldKeepListening && isListening && recognition) {
          try { recognition.start(); } catch (_) {}
        }
        if (onComplete) onComplete();
      };
      utterance.onend = finishSpeaking;
      utterance.onerror = finishSpeaking;

      synth.speak(utterance);
    } catch (e) {
      console.warn('[AI Doll TTS] Error:', e);
      isSpeaking = false;
      container?.classList.remove('talking');
      if (onComplete) onComplete();
    }
  }

  // ── Drag & Drop Handling ──────────────────────────────────────────────────
  function setupDraggable() {
    if (!container) return;

    // Restore saved position
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          // Verify it's within viewport bounds
          const maxLeft = window.innerWidth - 150;
          const maxTop = window.innerHeight - 200;
          const cl = Math.max(10, Math.min(pos.x, maxLeft));
          const ct = Math.max(10, Math.min(pos.y, maxTop));
          container.style.left = cl + 'px';
          container.style.top = ct + 'px';
          container.style.right = 'auto';
          container.style.bottom = 'auto';
        }
      }
    } catch (_) {}

    let isDragging = false;
    let startX, startY, origLeft, origTop;
    let dragThreshold = 5;
    let hasMoved = false;

    function onPointerDown(e) {
      // Don't drag if clicking buttons inside pill
      if (e.target.closest('#ai-doll-pill')) return;
      isDragging = true;
      hasMoved = false;
      const rect = container.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;

      container.setPointerCapture(e.pointerId);
      container.style.transition = 'none';
      e.stopPropagation();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.hypot(dx, dy) > dragThreshold) {
        hasMoved = true;
      }

      const newLeft = Math.max(10, Math.min(origLeft + dx, window.innerWidth - container.offsetWidth - 10));
      const newTop = Math.max(10, Math.min(origTop + dy, window.innerHeight - container.offsetHeight - 10));

      container.style.left = newLeft + 'px';
      container.style.top = newTop + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';

      updateBubblePosition();
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      container.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

      if (hasMoved) {
        // Save position
        const rect = container.getBoundingClientRect();
        try {
          localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x: rect.left, y: rect.top }));
        } catch (_) {}
      } else {
        // Was a simple click on the doll! Toggle listening
        toggleListening();
      }
    }

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);
  }

  // ── Speech Recognition Engine ─────────────────────────────────────────────
  function setupSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[AI Doll] SpeechRecognition is not supported in this browser.');
      return;
    }

    try {
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'bn-BD'; // Seamless Bengali & English recognition

      recognition.onstart = () => {
        isListening = true;
        container?.classList.add('listening');
        showBubble('✨ <b>Listening...</b><br>Say "Next", "Back", or "Read slide"', 0);
      };

      recognition.onresult = (e) => {
        if (isSpeaking) return; // Don't trigger on doll's own voice
        let transcript = '';
        for (let i = e.results.length - 1; i >= 0; i--) {
          if (e.results[i].isFinal) {
            transcript = e.results[i][0].transcript.trim();
            break;
          }
        }
        if (transcript) {
          console.log('[AI Doll] Recognized:', transcript);
          showBubble(`🗣️ "<b>${escapeHtml(transcript)}</b>"`, 2500);
          handleVoiceCommand(transcript);
        }
      };

      recognition.onerror = (e) => {
        console.warn('[AI Doll Recognition Error]:', e.error);
        if (e.error === 'not-allowed') {
          shouldKeepListening = false;
          stopListeningUI();
          showBubble('🔒 Mic access blocked. Please allow microphone in browser.', 4000);
        }
        // Transient errors like 'no-speech' or 'audio-capture' are ignored in continuous mode
      };

      recognition.onend = () => {
        // Continuous mode: keep listening without asking for permission again!
        if (shouldKeepListening && isListening && !isSpeaking) {
          if (isRestarting) return;
          isRestarting = true;
          setTimeout(() => {
            isRestarting = false;
            if (shouldKeepListening && isListening && !isSpeaking) {
              try {
                recognition.start();
                container?.classList.add('listening');
              } catch (_) {}
            }
          }, 300);
        } else if (!shouldKeepListening) {
          stopListeningUI();
        }
      };
    } catch (e) {
      console.error('[AI Doll] Setup recognition failed:', e);
    }
  }

  function startListening() {
    if (!recognition) {
      showBubble('⚠️ Voice recognition not supported on this browser/protocol.', 4000);
      return;
    }
    shouldKeepListening = true;
    if (isListening) return;
    try {
      recognition.start();
      isListening = true;
    } catch (e) {
      console.warn('[AI Doll] Start failed:', e);
    }
  }

  function stopListening() {
    shouldKeepListening = false;
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
    }
    stopListeningUI();
  }

  function stopListeningUI() {
    isListening = false;
    container?.classList.remove('listening');
  }

  function toggleListening() {
    if (shouldKeepListening && isListening) {
      stopListening();
      showBubble('💤 Stopped listening', 2000);
    } else {
      if (container?.classList.contains('minimized')) {
        container.classList.remove('minimized');
      }
      startListening();
    }
  }

  // ── Presentation Command Processor ────────────────────────────────────────
  function handleVoiceCommand(raw) {
    const text = raw.toLowerCase().trim();

    // 1. Next Slide (English & Bengali)
    if (/\b(next|forward|right|samne|porer|poroborti|advance)\b|পরের|পরবর্তী|পরের স্লাইড|পরবর্তী স্লাইড|সামনে|নেক্সট|নেক্সড|পরেরটা|আগাও|এগিয়ে/i.test(text)) {
      triggerSlideNext();
      speak('Moving to next slide!');
      return;
    }

    // 2. Previous Slide (English & Bengali including ব্যাক, ব্যাকে, বেক, পিছে, ইত্যাদি)
    if (/\b(prev|previous|back|left|peshone|ager|reverse|return)\b|আগের|আগের স্লাইড|পেছনে|পিছনে|প্রিভিয়াস|প্রিভিয়াস|পিছনে যাও|আগেরটা|ব্যাক|ব্যাকে|বেক|বেগ|পিছে|পূর্বে|পূর্ববর্তী|পিছাও/i.test(text)) {
      triggerSlidePrev();
      speak('Going back to previous slide!');
      return;
    }

    // 3. First Slide
    if (/\b(first|first slide|beginning|start|প্রথম|শুরু|প্রথম স্লাইড|শুরুতে যাও)\b/i.test(text)) {
      triggerGoToSlide(0);
      speak('Going to the first slide!');
      return;
    }

    // 4. Last Slide
    if (/\b(last|last slide|end|finish|শেষ|শেষ স্লাইড|ফাইনালে যাও)\b/i.test(text)) {
      triggerGoToSlide(-1);
      speak('Going to the last slide!');
      return;
    }

    // 5. Specific Slide number (e.g. "slide 3", "৩ নম্বর স্লাইড")
    const slideMatch = text.match(/\b(?:slide|number|স্লাইড|নম্বর)\s*(\d+)/i) || text.match(/(\d+)\s*(?:st|nd|rd|th)?\s*slide/i);
    if (slideMatch) {
      const num = parseInt(slideMatch[1], 10);
      if (num > 0) {
        triggerGoToSlide(num - 1);
        speak(`Going to slide ${num}!`);
        return;
      }
    }

    // 6. Read / Explain Current Slide
    if (/\b(read|read slide|explain|tell me|speak|পড়|পড়ো|পড়ে শোনাও|বল|কি আছে|কী লেখা আছে)\b/i.test(text)) {
      readCurrentSlide();
      return;
    }

    // 7. Fullscreen Toggle
    if (/\b(fullscreen|full screen|ফুলস্ক্রিন|বড় পর্দা|বড় কর|maximize)\b/i.test(text)) {
      triggerFullscreen();
      speak('Toggling fullscreen mode!');
      return;
    }

    // 8. Laser Pointer
    if (/\b(laser|pointer|লেজার|পয়েন্টার)\b/i.test(text)) {
      triggerLaserPointer();
      speak('Toggling laser pointer!');
      return;
    }

    // 9. Black / Blank screen
    if (/\b(black|blank|dark|dark screen|কালো পর্দা|ফ্রিজ|অন্ধকার)\b/i.test(text)) {
      triggerBlackout();
      speak('Blanking presentation screen.');
      return;
    }

    // 10. Start Presentation / Present mode (in Studio)
    if (/\b(present|presentation|slideshow|start slideshow|প্লে|স্লাইড শো শুরু)\b/i.test(text)) {
      triggerStartPresentation();
      speak('Starting presentation!');
      return;
    }

    // 11. Sleep / Minimize / Hide
    if (/\b(sleep|hide|vanish|bye|goodbye|ঘুমাও|যাও|লুকিয়ে যাও|বন্ধ হও|মিনিমাইজ)\b/i.test(text)) {
      container?.classList.add('minimized');
      speak('Going to sleep. Tap me whenever you need me!');
      showBubble('💤 Fairy is asleep. Tap to wake up.', 3000);
      return;
    }

    // 12. Stop Talking / Quiet
    if (/\b(stop|quiet|silence|shh|shut up|চুপ|থামো|বন্ধ করো)\b/i.test(text)) {
      if (synth) synth.cancel();
      container?.classList.remove('talking');
      hideBubble();
      return;
    }

    // 13. Identity / Hello
    if (/\b(who are you|hello|hi|hey|কে তুমি|তোমার পরিচয়|হ্যালো|হাই)\b/i.test(text)) {
      const msg = 'Hello! I am your AI Presentation Assistant doll. Say "next slide", "previous slide", or "read slide" to control your show!';
      showBubble('🧚 ' + msg, 6000);
      speak(msg);
      return;
    }

    // Default: Couldn't understand
    showBubble(`❓ Command not recognized: "${escapeHtml(raw)}"<br><small>Try: "Next slide", "Previous slide", "Read slide"</small>`, 4000);
    speak('Sorry, I did not catch that. Say next slide, or read slide.');
  }

  // ── Presentation Action Handlers ──────────────────────────────────────────
  function triggerSlideNext() {
    // 1. Check Player mode
    if (typeof window.advanceNext === 'function') {
      window.advanceNext();
      return;
    }
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.click();
      return;
    }
    // 2. Check Studio mode
    if (typeof window.slides !== 'undefined' && Array.isArray(window.slides) && typeof window.current === 'number') {
      window.current = (window.current + 1) % window.slides.length;
      if (typeof window.render === 'function') window.render();
      return;
    }
    // 3. Fallback ArrowRight
    dispatchKey('ArrowRight');
  }

  function triggerSlidePrev() {
    // 1. Check Player mode
    if (typeof window.advancePrev === 'function') {
      window.advancePrev();
      return;
    }
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn && !prevBtn.disabled) {
      prevBtn.click();
      return;
    }
    // 2. Check Studio mode
    if (typeof window.slides !== 'undefined' && Array.isArray(window.slides) && typeof window.current === 'number') {
      window.current = (window.current - 1 + window.slides.length) % window.slides.length;
      if (typeof window.render === 'function') window.render();
      return;
    }
    // 3. Fallback ArrowLeft
    dispatchKey('ArrowLeft');
  }

  function triggerGoToSlide(targetIndex) {
    // In Player
    if (typeof window.slides !== 'undefined' && Array.isArray(window.slides)) {
      const total = window.slides.length;
      let idx = targetIndex;
      if (idx === -1) idx = total - 1;
      idx = Math.max(0, Math.min(idx, total - 1));

      if (typeof window.currentIndex === 'number' && typeof window.drawSlide === 'function') {
        window.currentIndex = idx;
        if (typeof window.currentStepIdx === 'number') window.currentStepIdx = 0;
        window.drawSlide();
        return;
      }
      // In Studio
      if (typeof window.current === 'number' && typeof window.render === 'function') {
        window.current = idx;
        window.render();
        return;
      }
    }
  }

  function triggerFullscreen() {
    const fsBtn = document.getElementById('fsBtn');
    if (fsBtn) {
      fsBtn.click();
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function triggerLaserPointer() {
    const laserBtn = document.getElementById('laserBtn');
    if (laserBtn) {
      laserBtn.click();
    } else {
      dispatchKey('l');
    }
  }

  function triggerBlackout() {
    const blankBtn = document.getElementById('blackoutBtn') || document.getElementById('blankBtn');
    if (blankBtn) {
      blankBtn.click();
    } else {
      dispatchKey('b');
    }
  }

  function triggerStartPresentation() {
    const presentBtn = document.getElementById('presentBtn');
    if (presentBtn) {
      presentBtn.click();
    }
  }

  function readCurrentSlide() {
    // Extract text from current slide in Player or Studio
    let texts = [];

    // Player mode
    if (typeof window.slides !== 'undefined' && Array.isArray(window.slides)) {
      let curIdx = typeof window.currentIndex === 'number' ? window.currentIndex : (typeof window.current === 'number' ? window.current : 0);
      const curSlide = window.slides[curIdx];
      if (curSlide && Array.isArray(curSlide.elements)) {
        curSlide.elements.forEach(el => {
          if (el && el.type === 'text' && el.text) {
            const clean = el.text.trim();
            if (clean) texts.push(clean);
          }
        });
      }
    }

    // Also look in DOM stage/slide if empty
    if (!texts.length) {
      const stage = document.getElementById('stage') || document.getElementById('slide');
      if (stage) {
        stage.querySelectorAll('.text-content, .text-el').forEach(el => {
          const t = el.textContent?.trim();
          if (t) texts.push(t);
        });
      }
    }

    if (!texts.length) {
      const msg = 'This slide does not contain any readable text elements.';
      showBubble(msg, 3000);
      speak(msg);
      return;
    }

    const fullNarration = texts.join('. ');
    showBubble('📖 <b>Reading slide:</b><br>' + escapeHtml(fullNarration.slice(0, 90)) + (fullNarration.length > 90 ? '...' : ''), 8000);
    speak(fullNarration);
  }

  function dispatchKey(key) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // ── Global Toggle & Studio Button ─────────────────────────────────────────
  function setupStudioControls() {
    // Add "🧚 AI Assistant" toggle button into the Studio top bar if not already present
    const topBar = document.querySelector('.top-nav, .top-bar, .toolbar, #toolbar, header');
    if (!topBar || document.getElementById('toggleAiDollStudioBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'toggleAiDollStudioBtn';
    btn.className = 'btn-secondary';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.25));border:1px solid rgba(216,180,254,0.4);border-radius:6px;color:#f3e8ff;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-left:6px;';
    btn.innerHTML = '<span>🧚</span> <span>AI Doll</span>';
    btn.title = 'Toggle Floating AI Fairy Assistant (Voice & Slideshow Control)';

    btn.onclick = () => {
      if (!container) return;
      if (container.classList.contains('hidden-doll')) {
        container.classList.remove('hidden-doll');
        container.classList.remove('minimized');
        btn.style.borderColor = '#c084fc';
        btn.style.background = 'linear-gradient(135deg,rgba(168,85,247,0.4),rgba(236,72,153,0.4))';
        showBubble('✨ Hello Shakib Sir! I am here to assist your presentation!', 4000);
        speak('Hello! I am ready to help you with your presentation.');
      } else {
        container.classList.add('hidden-doll');
        btn.style.borderColor = 'rgba(255,255,255,0.2)';
        btn.style.background = 'rgba(255,255,255,0.06)';
      }
    };

    // Insert right next to presentBtn or shortcutsBtn
    const presentBtn = document.getElementById('presentBtn');
    if (presentBtn && presentBtn.parentNode) {
      presentBtn.parentNode.insertBefore(btn, presentBtn.nextSibling);
    } else {
      topBar.appendChild(btn);
    }
  }

  // ── Initialization ────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    // Create avatar container
    container = document.createElement('div');
    container.id = 'ai-avatar-container';
    container.title = 'AI Assistant Doll — Click to speak or drag to move';
    container.innerHTML = buildDollHTML();
    document.body.appendChild(container);

    // Create speech bubble
    bubbleEl = document.createElement('div');
    bubbleEl.id = 'ai-speech-bubble';
    bubbleEl.innerHTML = '<span id="ai-bubble-text"></span>';
    document.body.appendChild(bubbleEl);
    bubbleTextEl = document.getElementById('ai-bubble-text');

    // Controls inside doll pill
    document.getElementById('aiDollMicBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleListening();
    });

    document.getElementById('aiDollMinBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.toggle('minimized');
      if (container.classList.contains('minimized')) {
        showBubble('💤 Sleeping...', 2000);
      } else {
        showBubble('✨ Awake! Ready for commands.', 2000);
      }
    });

    // Keyboard shortcut 'V' for quick mic activation (when not inside inputs)
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      if (e.key === 'v' || e.key === 'V') {
        // Toggle listening via V
        toggleListening();
      }
      if (e.key === 'Escape') {
        if (isListening) stopListening();
        hideBubble();
      }
    });

    setupDraggable();
    initTTS();
    setupSpeechRecognition();
    setupStudioControls();

    // Friendly initial greeting after load
    setTimeout(() => {
      updateBubblePosition();
    }, 800);
  }

  // Auto boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API globally
  window.PresentationAIAssistant = {
    startListening,
    stopListening,
    toggleListening,
    speak,
    showBubble,
    hideBubble,
    readCurrentSlide
  };
})();
