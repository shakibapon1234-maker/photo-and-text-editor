(() => {
  const $ = id => document.getElementById(id);
  const backupUrl = 'FINAL.html';
  function extractSlides(html) {
    const markerAt = html.indexOf('let slides = [');
    if (markerAt < 0) throw new Error('Backup slide data পাওয়া যায়নি।');
    const start = html.indexOf('[', markerAt); let quote = false, escaped = false, depth = 0, end = -1;
    for (let i = start; i < html.length; i++) { const c = html.charCodeAt(i); if (quote) { if (escaped) escaped = false; else if (c === 92) escaped = true; else if (c === 34) quote = false; } else if (c === 34) quote = true; else if (c === 91) depth++; else if (c === 93 && --depth === 0) { end = i; break; } }
    if (end < 0) throw new Error('Backup data অসম্পূর্ণ।'); return JSON.parse(html.slice(start, end + 1));
  }
  async function importBackgrounds() {
    const button = $('importFinalBackgroundsBtn');
    if (!window.PresentationBackgroundMediaStore?.saveVideo) return alert('Background storage এখনও প্রস্তুত হয়নি। কয়েক সেকেন্ড পরে চেষ্টা করুন।');
    button.disabled = true; button.textContent = '⏳ Backup থেকে background আনা হচ্ছে…';
    try {
      const response = await fetch(backupUrl + '?t=' + Date.now()); if (!response.ok) throw new Error('FINAL.html পাওয়া যায়নি।');
      const sourceSlides = extractSlides(await response.text()); let imported = 0;
      for (let index = 0; index < Math.min(sourceSlides.length, slides.length); index++) {
        // Copy preset/colour backgrounds as well as the embedded video files.
        // The media branch below overwrites the preset with the saved video.
        const visualSource = sourceSlides[index], visualTarget = slides[index];
        visualTarget.background = visualSource.background || visualTarget.background;
        visualTarget.bgColor = visualSource.bgColor || visualTarget.bgColor;
        visualTarget.brollPreset = visualSource.brollPreset || 'none';
        visualTarget.brollSpeed = visualSource.brollSpeed || 'normal';
        visualTarget.bgPlaybackRate = Number(visualSource.bgPlaybackRate || 1);
        visualTarget.bgOverlayColor = visualSource.bgOverlayColor || '#000000';
        visualTarget.bgOverlayOpacity = Number(visualSource.bgOverlayOpacity ?? 10);
        visualTarget.bgMediaOpacity = Number(visualSource.bgMediaOpacity ?? 100);
        visualTarget.bgMediaBlur = Number(visualSource.bgMediaBlur ?? 0);
        const source = sourceSlides[index], target = slides[index], media = String(source.bgMedia || ''); if (!media.startsWith('data:video/')) continue;
        button.textContent = '⏳ Slide ' + (index + 1) + ' background সেভ হচ্ছে…'; const blob = await fetch(media).then(r => r.blob());
        await window.PresentationBackgroundMediaStore.saveVideo(blob, target); target.background = 'media'; target.bgMediaType = 'video'; target.bgPlaybackRate = Number(source.bgPlaybackRate || 1); target.bgOverlayColor = source.bgOverlayColor || '#000000'; target.bgOverlayOpacity = Number(source.bgOverlayOpacity ?? 10); target.bgMediaOpacity = Number(source.bgMediaOpacity ?? 100); target.bgMediaBlur = Number(source.bgMediaBlur ?? 0); target.brollPreset = 'none'; delete target.bgImage; imported++;
      }
      if (!imported) throw new Error('এই backup-এ import করার মতো embedded video background নেই।'); if (typeof render === 'function') render(); if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow(); fetch('/api/delete-final-backup', { method: 'POST' }).catch(() => {}); button.textContent = '✅ ' + imported + 'টি background import হয়েছে'; alert('✅ ' + imported + 'টি ভিডিও background স্থায়ীভাবে import হয়েছে। FINAL.html এখন মুছে দেওয়া হয়েছে।');
    } catch (error) { console.error('Final background import failed', error); button.disabled = false; button.textContent = '📥 FINAL backup থেকে backgrounds আনুন'; alert('Background import করা যায়নি: ' + error.message); }
  }
  function install() { const holder = $('backgroundUpload'); if (!holder || $('importFinalBackgroundsBtn')) return; const btn = document.createElement('button'); btn.id = 'importFinalBackgroundsBtn'; btn.type = 'button'; btn.textContent = '📥 FINAL backup থেকে backgrounds আনুন'; btn.style.cssText = 'width:100%;margin-top:8px;background:#075985;border-color:#38bdf8;color:#fff;font-weight:800;'; btn.onclick = importBackgrounds; holder.appendChild(btn); }
  window.addEventListener('load', () => setTimeout(install, 500)); setTimeout(install, 1000);
})();
