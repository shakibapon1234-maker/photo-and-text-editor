/**
 * presentation-html-import-patch.js
 * HTML Slideshow → JSON Import Patch
 * Upgrades the Load Project handler to support .html files via greedy bracket parsing.
 */
(function() {
  'use strict';

  function extractSlidesFromHtml(text) {
    let extracted = null;

    // Pattern 1: Fast regex (works for smaller HTML)
    const m = text.match(/let\s+slides\s*=\s*(\[[\s\S]*?\]);/);
    if (m) {
      try { extracted = JSON.parse(m[1]); } catch (_) {}
    }

    // Pattern 2: Greedy bracket-depth counter (robust for large HTML)
    if (!extracted) {
      const si = text.indexOf('let slides = [');
      if (si !== -1) {
        let depth = 0, i = si + 'let slides = '.length, start = -1;
        for (; i < text.length; i++) {
          const ch = text[i];
          if (ch === '[') { if (depth === 0) start = i; depth++; }
          else if (ch === ']') {
            depth--;
            if (depth === 0 && start !== -1) {
              try { extracted = JSON.parse(text.slice(start, i + 1)); } catch (_) {}
              break;
            }
          }
        }
      }
    }

    // Pattern 3: window.slides = [...] fallback
    if (!extracted) {
      const m2 = text.match(/window\.slides\s*=\s*(\[[\s\S]*?\]);/);
      if (m2) { try { extracted = JSON.parse(m2[1]); } catch (_) {} }
    }

    return (Array.isArray(extracted) && extracted.length > 0) ? extracted : null;
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

      rd.onload = function() {
        const text = rd.result;
        let loadedSlides = null;

        try {
          // HTML file
          if (isHtml) {
            loadedSlides = extractSlidesFromHtml(text);
            if (!loadedSlides) {
              alert('X এই HTML ফাইলে কোনো Presentation ডেটা পাওয়া যায়নি!\n\nশুধুমাত্র এই অ্যাপের "Download Slideshow (.html)" দিয়ে তৈরি ফাইল লোড করা যাবে।');
              input.value = '';
              return;
            }
          } else {
            // JSON file
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

          if (!loadedSlides || !loadedSlides.length) throw new Error('No slides found in file');

          // Apply to editor
          window.slides = loadedSlides;
          try { slides.length = 0; loadedSlides.forEach(s => slides.push(s)); } catch (_) {}
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
          if (typeof window.showPresentationToast === 'function') {
            window.showPresentationToast('OK ' + loadedSlides.length + 'টি স্লাইড সফলভাবে লোড হয়েছে!');
          } else {
            alert('OK ' + loadedSlides.length + 'টি স্লাইড সফলভাবে লোড হয়েছে!\n\n"Save Project (JSON)" দিয়ে JSON ফাইলে সেভ করুন।');
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
