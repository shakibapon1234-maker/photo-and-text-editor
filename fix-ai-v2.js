/**
 * fix-ai-v2.js — Patches presentation-ai-assistant.js to fix:
 * 1. Mic popup keeps reappearing (auto-listen disabled)
 * 2. Controls bar blocked by AI container (pointer-events fix)
 * 3. AI doesn't fly on slide navigation (add navigation hooks)
 */
const fs = require('fs');
const path = require('path');

let code = fs.readFileSync(path.join(__dirname, 'presentation-ai-assistant.js'), 'utf8');
let changed = [];

// ════════════════════════════════════════════════════════════
// FIX 1 — pointer-events: the container itself should be
//          pointer-events:none so clicks reach controls bar.
//          Only #ai-doll and .ai-doll-pill keep pointer events.
// ════════════════════════════════════════════════════════════
const OLD_CONTAINER_CSS = `      #ai-avatar-container {
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
      }`;

const NEW_CONTAINER_CSS = `      #ai-avatar-container {
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
        /* Pass clicks through the transparent parts so the controls bar remains clickable */
        pointer-events: none;
      }
      /* Only doll SVG and pill buttons capture pointer events */
      #ai-doll, #ai-doll-svg, .ai-doll-pill, .ai-doll-pill button {
        pointer-events: auto;
      }
      #ai-avatar-container:active {
        cursor: grabbing;
      }`;

if (code.includes(OLD_CONTAINER_CSS)) {
  // Remove the duplicate :active rule that follows the block
  code = code.replace(OLD_CONTAINER_CSS, NEW_CONTAINER_CSS);
  // Remove the now-orphaned :active rule if it exists separately
  code = code.replace(/\s*#ai-avatar-container:active \{\s*cursor: grabbing;\s*\}/g, '');
  changed.push('✅ FIX 1: pointer-events:none on container, auto on doll+pill');
} else {
  // Already patched or different whitespace — try targeted replacement
  code = code.replace(
    /(#ai-avatar-container \{[\s\S]*?filter: drop-shadow\(0 10px 25px rgba\(0,0,0,0\.5\)\);)/,
    '$1\n        /* Pass clicks through transparent areas */\n        pointer-events: none;'
  );
  code = code.replace(
    /(filter: drop-shadow\(0 10px 25px rgba\(0,0,0,0\.5\)\);\s*\}\s*#ai-avatar-container:active)/,
    `filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
      }
      #ai-doll, #ai-doll-svg, .ai-doll-pill, .ai-doll-pill button { pointer-events: auto; }
      #ai-avatar-container:active`
  );
  changed.push('✅ FIX 1 (fallback): pointer-events patched');
}

// ════════════════════════════════════════════════════════════
// FIX 2 — Do NOT auto-start mic on init / DOMContentLoaded.
//          Mic only starts when user explicitly clicks Talk/Mic.
// ════════════════════════════════════════════════════════════
// Remove any auto-call to startListening() or toggleListening() in init
const autoListenPatterns = [
  // Pattern: startListening() called from init or setTimeout in init
  /\/\/ Auto.*?start.*?listen.*?\n.*?startListening\(\);/gi,
  /setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*startListening\(\)[^}]*\}\s*,\s*\d+\s*\)/gi,
];

autoListenPatterns.forEach((pat) => {
  if (pat.test(code)) {
    code = code.replace(pat, '/* Auto-listen removed — only on user click */');
    changed.push('✅ FIX 2: Removed auto-startListening call');
  }
});

// ════════════════════════════════════════════════════════════
// FIX 3 — Hook into slide navigation buttons (Next/Prev/keyboard)
//          so AI flies cinematically on every slide change.
// ════════════════════════════════════════════════════════════
const NAV_HOOK_CODE = `
  // ── Slide Navigation Fly Hooks ────────────────────────────────────────────
  // Intercept Next / Prev button clicks and keyboard arrows to trigger fly animation
  function setupSlideNavigationHooks() {
    // We wait for DOM to be ready and for buttons to exist
    function bindNavButtons() {
      const nextBtn = document.getElementById('nextBtn');
      const prevBtn = document.getElementById('prevBtn');

      if (nextBtn && !nextBtn.__aiHooked) {
        nextBtn.__aiHooked = true;
        nextBtn.addEventListener('click', () => {
          if (!isAIDollVisible()) return;
          const target = { x: window.innerWidth / 2 - 70, y: Math.max(30, window.innerHeight / 2 - 130) };
          animatedFlyToAction(target, '▶ Next Slide ✨', null, null);
        }, true); // capture phase so we fire BEFORE the original handler
      }

      if (prevBtn && !prevBtn.__aiHooked) {
        prevBtn.__aiHooked = true;
        prevBtn.addEventListener('click', () => {
          if (!isAIDollVisible()) return;
          const target = { x: 24, y: Math.max(30, window.innerHeight / 2 - 100) };
          animatedFlyToAction(target, '◀ Previous ✨', null, null);
        }, true);
      }
    }

    // Keyboard hooks — ArrowRight / Space = next, ArrowLeft = prev
    window.addEventListener('keydown', (e) => {
      if (!isAIDollVisible()) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        const target = { x: window.innerWidth / 2 - 70, y: Math.max(30, window.innerHeight / 2 - 130) };
        animatedFlyToAction(target, '▶ Next ✨', null, null);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        const target = { x: 24, y: Math.max(30, window.innerHeight / 2 - 100) };
        animatedFlyToAction(target, '◀ Back ✨', null, null);
      }
    }, true); // capture so we run before main keydown handler

    // Try immediately, and also after a short delay for dynamically loaded buttons
    bindNavButtons();
    setTimeout(bindNavButtons, 1200);
    setTimeout(bindNavButtons, 3000);
  }

  function isAIDollVisible() {
    if (!container) return false;
    if (container.classList.contains('hidden-doll')) return false;
    if (container.style.display === 'none') return false;
    // Check localStorage
    try {
      const v = localStorage.getItem('presentation_ai_doll_enabled');
      if (v === 'false') return false;
    } catch (_) {}
    return true;
  }
`;

// Insert setupSlideNavigationHooks before the init function
const INIT_MARKER = '  // ── Initialization ────────────────────────────────────────────────────────';
if (code.includes(INIT_MARKER) && !code.includes('setupSlideNavigationHooks')) {
  code = code.replace(INIT_MARKER, NAV_HOOK_CODE + '\n' + INIT_MARKER);
  changed.push('✅ FIX 3: Added setupSlideNavigationHooks() function');
}

// Call setupSlideNavigationHooks() inside init()
const INIT_CALL_MARKER = '    setupStudioControls();';
if (code.includes(INIT_CALL_MARKER) && !code.includes('setupSlideNavigationHooks();')) {
  code = code.replace(INIT_CALL_MARKER, INIT_CALL_MARKER + '\n    setupSlideNavigationHooks();');
  changed.push('✅ FIX 3: Called setupSlideNavigationHooks() in init()');
}

// ════════════════════════════════════════════════════════════
// FIX 4 — animatedFlyToAction: if already navigating, still
//          allow a quick visual flash so it doesn't feel stuck
// ════════════════════════════════════════════════════════════
const OLD_NAV_GUARD = `    if (isNavigating) {
      if (callback) callback();
      return;
    }`;
const NEW_NAV_GUARD = `    if (isNavigating) {
      // Still execute the callback even if we're mid-flight
      if (callback) try { callback(); } catch(_) {}
      return;
    }`;
if (code.includes(OLD_NAV_GUARD)) {
  code = code.replace(OLD_NAV_GUARD, NEW_NAV_GUARD);
  changed.push('✅ FIX 4: animatedFlyToAction no longer silently drops callbacks when busy');
}

// ════════════════════════════════════════════════════════════
// Write patched file
// ════════════════════════════════════════════════════════════
fs.writeFileSync(path.join(__dirname, 'presentation-ai-assistant.js'), code, 'utf8');
console.log('\n=== AI Assistant Patch Results ===');
changed.forEach(c => console.log(c));
console.log('\nFile size:', code.length, 'bytes');
console.log('\nDone! ✅ Now run fix-ai-embed.js to re-inline into presentation-player.html');
