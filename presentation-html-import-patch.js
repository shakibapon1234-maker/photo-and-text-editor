/**
 * presentation-html-import-patch.js
 * HTML Slideshow → JSON Import Patch
 * Upgrades the Load Project handler to support .html files via greedy bracket parsing.
 */
(function() {
  'use strict';

  function extractSlidesFromHtml(text) {
    let extracted = null;

    // Pattern 1: Fast regex for clean JSON blocks
    const m = text.match(/let\s+slides\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
    if (m) {
      try { extracted = JSON.parse(m[1]); } catch (_) {}
    }

    // Pattern 2: String-aware bracket depth parser (handles brackets inside text content)
    if (!extracted) {
      const markers = ['let slides = [', 'window.slides = [', 'DEFAULT_RECOVERED_SLIDES = ['];
      for (const marker of markers) {
        const si = text.indexOf(marker);
        if (si === -1) continue;

        let depth = 0;
        let start = si + marker.length - 1; // index of opening '['
        let inString = false;
        let escapeNext = false;

        for (let i = start; i < text.length; i++) {
          const ch = text[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (ch === '\\' && inString) {
            escapeNext = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (inString) continue;

          if (ch === '[') depth++;
          else if (ch === ']') {
            depth--;
            if (depth === 0) {
              try {
                const jsonCandidate = text.slice(start, i + 1);
                const parsed = JSON.parse(jsonCandidate);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  extracted = parsed;
                  break;
                }
              } catch (_) {}
            }
          }
        }
        if (extracted) break;
      }
    }

    // Validate extracted slide objects
    if (Array.isArray(extracted) && extracted.length > 0) {
      const validSlides = extracted.filter(s => s && typeof s === 'object' && Array.isArray(s.elements));
      return validSlides.length > 0 ? validSlides : null;
    }
    return null;
  }

  const ALLOWED_ELEMENT_TYPES = new Set(['text', 'image', 'shape', 'video', 'table', 'chart']);
  function isSafeElementSrc(src) {
    if (typeof src !== 'string') return false;
    const s = src.trim();
    return /^(data:image\/[a-zA-Z0-9+.-]+;base64,|blob:|https?:\/\/|\/)/i.test(s);
  }

  function validateDeckSchema(deck) {
    if (!Array.isArray(deck) || deck.length === 0) return null;
    return deck.map(s => {
      if (!s || typeof s !== 'object') {
        return { background: 'fashion', bgColor: '#17233c', elements: [] };
      }
      return {
        ...s,
        elements: Array.isArray(s.elements) ? s.elements.filter(e => {
          if (!e || typeof e !== 'object' || !e.id) return false;
          if (e.type && !ALLOWED_ELEMENT_TYPES.has(e.type)) return false;
          if (e.type === 'image' && e.src && !isSafeElementSrc(e.src)) return false;
          return true;
        }) : []
      };
    });
  }

  function patchProjectInput() {
    const input = document.getElementById('projectInput');
    if (!input) return;

    // Make sure HTML files are accepted
    input.accept = '.json,application/json,.html,text/html';

    // Override with robust handler
    input.onchange = function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const isHtml = file.name.toLowerCase().endsWith('.html');
      const rd = new FileReader();

      rd.onload = async function() {
        const text = rd.result;
        let loadedSlides = null;
        let embeddedSoundtrack = null;
        let soundtrackRestored = null;

        try {
          if (isHtml) {
            loadedSlides = extractSlidesFromHtml(text);
            const audioMatch = text.match(/initSoundtrackEngine\(("data:audio\/[^\"]+"),\s*([^,]+),\s*(true|false),\s*("(?:\\.|[^\"])*")\)/);
            if (audioMatch) {
              try {
                embeddedSoundtrack = {
                  dataUrl: JSON.parse(audioMatch[1]),
                  volume: Number(audioMatch[2]),
                  loop: audioMatch[3] === 'true',
                  name: JSON.parse(audioMatch[4])
                };
              } catch (_) {}
            }
            if (!loadedSlides) {
              alert('❌ এই HTML ফাইলে কোনো Presentation ডেটা পাওয়া যায়নি!\n\nশুধুমাত্র এই অ্যাপের "Download Slideshow (.html)" দিয়ে তৈরি ফাইল লোড করা যাবে।');
              input.value = '';
              return;
            }
          } else {
            const d = JSON.parse(text);
            if (Array.isArray(d)) {
              loadedSlides = d;
            } else if (d && Array.isArray(d.slides)) {
              loadedSlides = d.slides;
            } else if (d && typeof d === 'object') {
              const arr = Object.values(d).filter(v => v && typeof v === 'object' && Array.isArray(v.elements));
              if (arr.length > 0) loadedSlides = arr;
            }
          }

          loadedSlides = validateDeckSchema(loadedSlides);
          if (!loadedSlides || !loadedSlides.length) throw new Error('No valid slides found in file');

          // Confirmation before replacing current presentation
          if (window.slides && Array.isArray(window.slides) && window.slides.length > 0) {
            const confirmed = confirm(`বর্তমান প্রজেক্টের স্থানে "${file.name}" থেকে ${loadedSlides.length}টি স্লাইড লোড হবে। আপনি কি নিশ্চিত?`);
            if (!confirmed) {
              input.value = '';
              return;
            }
          }

          // Apply to editor with full synchronization
          if (typeof window.setSlides === 'function') {
            window.setSlides(loadedSlides);
          } else {
            window.slides = loadedSlides;
          }
          if (typeof window.setCurrent === 'function') window.setCurrent(0);
          else window.current = 0;
          try { current = 0; } catch(_) {}
          try { selected = null; } catch(_) {}

          if (typeof render === 'function') render();
          if (typeof window.syncEditorElementLayers === 'function') window.syncEditorElementLayers();
          if (typeof window.applySlideFitting === 'function') window.applySlideFitting();

          // Auto-extract video posters for thumbnail display
          loadedSlides.forEach((s, idx) => {
            if (s.bgMediaType === 'video' && s.bgMedia && !s.bgMediaPoster && typeof window.captureVideoPoster === 'function') {
              window.captureVideoPoster(s, idx);
            }
          });

          if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
          if (embeddedSoundtrack && typeof window.importPresentationSoundtrack === 'function') {
            try {
              soundtrackRestored = await window.importPresentationSoundtrack(
                embeddedSoundtrack.dataUrl,
                embeddedSoundtrack.volume,
                embeddedSoundtrack.loop,
                embeddedSoundtrack.name
              );
            } catch (audioErr) {
              console.warn('[HTML Import Patch] Embedded soundtrack could not be restored:', audioErr);
              if (typeof window.showPresentationToast === 'function') {
                window.showPresentationToast('Slides loaded, but embedded soundtrack could not be restored.');
              }
            }
          }
          if (typeof window.showPresentationToast === 'function') {
            const audioStatus = soundtrackRestored === true
              ? ' Background music restored.'
              : soundtrackRestored === false
                ? ' Background music could not be restored.'
                : '';
            window.showPresentationToast('✅ ' + loadedSlides.length + 'টি স্লাইড সফলভাবে লোড হয়েছে!' + audioStatus);
          } else {
            alert('✅ ' + loadedSlides.length + 'টি স্লাইড সফলভাবে লোড হয়েছে!\n\n"Save Project (JSON)" দিয়ে JSON ফাইলে সেভ করুন।');
          }
        } catch (err) {
          alert('Invalid presentation file.\n\nDetails: ' + err.message);
        }
        input.value = '';
      };

      rd.readAsText(file);
    };

    console.log('[HTML Import Patch] Load Project handler upgraded - HTML files supported.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchProjectInput);
  } else {
    setTimeout(patchProjectInput, 300);
  }
})();
