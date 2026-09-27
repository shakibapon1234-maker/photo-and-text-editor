/**
 * fix-ai-embed-force.js — Force re-embed patched AI assistant into presentation-player.html
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;

const aiCode = fs.readFileSync(path.join(root, 'presentation-ai-assistant.js'), 'utf8');

// Read the original player HTML template (without inline AI - restore external tag first by reading backup or stripping)
let playerHtml = fs.readFileSync(path.join(root, 'presentation-player.html'), 'utf8');

// Remove OLD inline AI assistant block (from /* Embedded AI Assistant Doll */ to end of its </script>)
const AI_START = '<script>\n/* Embedded AI Assistant Doll */\n';
const AI_END_MARKER = '</script>';

const aiStart = playerHtml.indexOf(AI_START);
if (aiStart !== -1) {
  const aiEnd = playerHtml.indexOf(AI_END_MARKER, aiStart + AI_START.length);
  if (aiEnd !== -1) {
    const before = playerHtml.substring(0, aiStart);
    const after = playerHtml.substring(aiEnd + AI_END_MARKER.length);
    // Replace with fresh patched AI code
    playerHtml = before + AI_START + aiCode + '\n' + AI_END_MARKER + after;
    console.log('✅ AI Assistant re-embedded with patched version');
  }
} else {
  // AI not yet inline - inject before </body>
  playerHtml = playerHtml.replace(
    '</body>',
    `<script>\n/* Embedded AI Assistant Doll */\n${aiCode}\n</script>\n</body>`
  );
  console.log('✅ AI Assistant injected before </body>');
}

fs.writeFileSync(path.join(root, 'presentation-player.html'), playerHtml, 'utf8');
console.log('presentation-player.html size:', playerHtml.length, 'bytes');

// Sync masterPlayerHtml in presentation-exports.js
let exportsJs = fs.readFileSync(path.join(root, 'presentation-exports.js'), 'utf8');
const masterRegex = /const masterPlayerHtml = "[\s\S]*?(?<!\\)"(?=;)/;
if (masterRegex.test(exportsJs)) {
  const escaped = JSON.stringify(playerHtml).slice(1, -1);
  exportsJs = exportsJs.replace(masterRegex, 'const masterPlayerHtml = "' + escaped + '"');
  fs.writeFileSync(path.join(root, 'presentation-exports.js'), exportsJs, 'utf8');
  console.log('✅ presentation-exports.js masterPlayerHtml synced. Size:', exportsJs.length, 'bytes');
} else {
  console.warn('⚠️ Could not find masterPlayerHtml in presentation-exports.js');
}

// Verify
const verify = fs.readFileSync(path.join(root, 'presentation-player.html'), 'utf8');
console.log('\n=== Verification ===');
console.log('Has pointer-events:none on container:', verify.includes('pointer-events: none'));
console.log('Has pointer-events:auto on doll:', verify.includes('pointer-events: auto'));
console.log('Has setupSlideNavigationHooks:', verify.includes('setupSlideNavigationHooks'));
console.log('Has __PresentationAIAssistantLoaded:', verify.includes('__PresentationAIAssistantLoaded'));
console.log('\nAll done! ✅');
