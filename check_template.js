const fs = require('fs');
const content = fs.readFileSync('presentation-exports.js', 'utf8');
const startIdx = content.indexOf('const masterPlayerHtml = ');
const endIdx = content.indexOf('async function exportStandaloneSlideshow');

if (startIdx !== -1 && endIdx !== -1) {
  const html = content.slice(startIdx + 'const masterPlayerHtml = "'.length, endIdx);
  console.log('Template HTML length:', html.length);
  ['fetch', 'parent', 'top', 'frame', 'location', 'XMLHttpRequest'].forEach(k => {
    let idx = 0;
    while ((idx = html.indexOf(k, idx)) !== -1) {
      console.log(k, 'at', idx, '-->', html.slice(Math.max(0, idx - 30), idx + 60).replace(/\\n/g, ' '));
      idx += k.length;
    }
  });
} else {
  console.log('Could not find start/end of masterPlayerHtml', startIdx, endIdx);
}
