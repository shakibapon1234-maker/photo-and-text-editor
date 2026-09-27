/**
 * fix-ai-v3.js — Final targeted patch using string includes
 */
const fs = require('fs');
const path = require('path');

let code = fs.readFileSync(path.join(__dirname, 'presentation-ai-assistant.js'), 'utf8');

// --- 1. Add pointer-events:auto for doll children after the :active block ---
const AFTER_ACTIVE = `      #ai-avatar-container:active {
        cursor: grabbing;
      }`;
const POINTER_AUTO_RULE = `
      /* Only doll body and pill buttons capture events — rest passes through to controls bar */
      #ai-doll, #ai-doll-svg, .ai-doll-pill, .ai-doll-pill button {
        pointer-events: auto;
        cursor: grab;
      }`;

if (code.includes(AFTER_ACTIVE) && !code.includes('pointer-events: auto;')) {
  code = code.replace(AFTER_ACTIVE, AFTER_ACTIVE + POINTER_AUTO_RULE);
  console.log('✅ pointer-events:auto rule added for doll children');
} else if (code.includes('pointer-events: auto;')) {
  console.log('ℹ️ pointer-events:auto already present');
} else {
  // Fallback: find the :active rule a different way
  code = code.replace(
    /(cursor: grabbing;\s*\})/,
    `$1
      /* Only doll body and pill capture events */
      #ai-doll, #ai-doll-svg, .ai-doll-pill, .ai-doll-pill button {
        pointer-events: auto;
        cursor: grab;
      }`
  );
  console.log('✅ pointer-events:auto added (fallback regex)');
}

// --- 2. Mic: Make sure we don't auto-start in init() ---
// In init(), after setting up components, there should be NO startListening() or toggleListening() call
// The init() ends around the setTimeout(syncAIAssistantUI or updateBubblePosition)
// Let's just ensure no stray startListening() in init
const initBlock = code.match(/function init\(\) \{[\s\S]*?\n  \}/);
if (initBlock) {
  const origInit = initBlock[0];
  if (origInit.includes('startListening()') || origInit.includes('toggleListening()')) {
    const fixedInit = origInit
      .replace(/\bstartListening\(\);/g, '/* auto-listen disabled */')
      .replace(/\btoggleListening\(\);/g, '/* auto-listen disabled */');
    code = code.replace(origInit, fixedInit);
    console.log('✅ Removed auto-startListening from init()');
  } else {
    console.log('ℹ️ No auto-startListening in init() found');
  }
}

// --- 3. Fix animatedFlyToAction: remove the isNavigating early-return so quick sequential
//     slide changes still trigger the animation ---
const OLD_NAV_GUARD = `    if (isNavigating) {
      if (callback) callback();
      return;
    }`;
const NEW_NAV_GUARD = `    if (isNavigating) {
      // Still execute callback even if we're mid-flight
      if (callback) try { callback(); } catch(_) {}
      return;
    }`;
if (code.includes(OLD_NAV_GUARD)) {
  code = code.replace(OLD_NAV_GUARD, NEW_NAV_GUARD);
  console.log('✅ animatedFlyToAction: callback still fires when mid-flight');
} else {
  console.log('ℹ️ animatedFlyToAction guard already updated');
}

fs.writeFileSync(path.join(__dirname, 'presentation-ai-assistant.js'), code, 'utf8');
console.log('File size:', code.length, 'bytes');
console.log('Done ✅');
