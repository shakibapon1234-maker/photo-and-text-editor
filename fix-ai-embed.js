/**
 * fix-ai-embed.js
 * Embeds presentation-ai-assistant.js inline into presentation-player.html
 * and syncs masterPlayerHtml in presentation-exports.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;

// Read source files
const aiCode = fs.readFileSync(path.join(root, 'presentation-ai-assistant.js'), 'utf8');
let playerHtml = fs.readFileSync(path.join(root, 'presentation-player.html'), 'utf8');

console.log('=== Status before fix ===');
console.log('Has external QR tag:', playerHtml.includes('src="vendor/qrcode.min.js"'));
console.log('Has external AI tag:', playerHtml.includes('src="presentation-ai-assistant.js"'));
console.log('Has inline AI code:', playerHtml.includes('__PresentationAIAssistantLoaded'));

// --- Step 1: Embed QR code inline if it's still external ---
if (playerHtml.includes('src="vendor/qrcode.min.js"')) {
  try {
    const qrCode = fs.readFileSync(path.join(root, 'vendor', 'qrcode.min.js'), 'utf8');
    playerHtml = playerHtml.replace(
      '<script src="vendor/qrcode.min.js"></script>',
      '<script>\n/* Embedded Offline QR Generator */\n' + qrCode + '\n</script>'
    );
    console.log('✅ QR code embedded inline');
  } catch (e) {
    console.warn('⚠️ Could not read vendor/qrcode.min.js:', e.message);
  }
}

// --- Step 2: Replace external AI script tag with inline code ---
const externalAiTag = '<script src="presentation-ai-assistant.js"></script>';
if (playerHtml.includes(externalAiTag)) {
  playerHtml = playerHtml.replace(
    externalAiTag,
    '<script>\n/* Embedded AI Assistant Doll */\n' + aiCode + '\n</script>'
  );
  console.log('✅ AI Assistant embedded inline (was external tag)');
} else if (!playerHtml.includes('__PresentationAIAssistantLoaded')) {
  // AI code is missing completely - inject before </body>
  playerHtml = playerHtml.replace(
    '</body>',
    '<script>\n/* Embedded AI Assistant Doll */\n' + aiCode + '\n</script>\n</body>'
  );
  console.log('✅ AI Assistant injected before </body>');
} else {
  console.log('ℹ️ AI Assistant is already inline');
}

// Write updated player HTML
fs.writeFileSync(path.join(root, 'presentation-player.html'), playerHtml, 'utf8');
console.log('✅ presentation-player.html saved. Size:', playerHtml.length, 'bytes');

// --- Step 3: Sync masterPlayerHtml in presentation-exports.js ---
let exportsJs = fs.readFileSync(path.join(root, 'presentation-exports.js'), 'utf8');

// The masterPlayerHtml line starts with: const masterPlayerHtml = "...";
const masterRegex = /const masterPlayerHtml = "[\s\S]*?(?<!\\)"(?=;)/;
if (masterRegex.test(exportsJs)) {
  const escaped = JSON.stringify(playerHtml).slice(1, -1); // remove surrounding quotes
  exportsJs = exportsJs.replace(masterRegex, 'const masterPlayerHtml = "' + escaped + '"');
  fs.writeFileSync(path.join(root, 'presentation-exports.js'), exportsJs, 'utf8');
  console.log('✅ presentation-exports.js masterPlayerHtml synced. Size:', exportsJs.length, 'bytes');
} else {
  console.warn('⚠️ Could not find masterPlayerHtml pattern in presentation-exports.js');
}

console.log('\n=== Status after fix ===');
const final = fs.readFileSync(path.join(root, 'presentation-player.html'), 'utf8');
console.log('Has external QR tag:', final.includes('src="vendor/qrcode.min.js"'));
console.log('Has external AI tag:', final.includes('src="presentation-ai-assistant.js"'));
console.log('Has inline AI code:', final.includes('__PresentationAIAssistantLoaded'));
console.log('\nDone! ✅');
