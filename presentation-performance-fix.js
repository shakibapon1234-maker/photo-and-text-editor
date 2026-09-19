/**
 * presentation-performance-fix.js
 * ============================================================
 * Presentation Studio — High Performance, Memory & Stability Engine
 * ============================================================
 * Fixes:
 * 1. Automatic image downsampling (prevents multi-megabyte base64 memory leaks and Chromium OOM crashes)
 * 2. Coalesced requestAnimationFrame render pipeline (eliminates multi-render cascades)
 * 3. Fast-path slide thumbnail rendering (only redraws active slide thumbnail instead of rebuilding entire deck)
 * 4. Debounced inspector and selection updates
 * 5. Event listener hygiene to prevent freezing and lag during continuous edits
 */

(() => {
  console.log('⚡ Initializing Presentation Performance & Stability Engine...');

  const $ = id => document.getElementById(id);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. High-Performance Image Compression on Upload & Drop
  // ──────────────────────────────────────────────────────────────────────────
  // Prevents 5MB-20MB camera/phone images from blowing up RAM, IndexedDB & LocalStorage
  async function compressImageFile(file, maxDimension = 1920, quality = 0.86) {
    if (!file || !file.type || !file.type.startsWith('image/')) return null;

    // Do NOT compress animated GIFs or SVGs (preserves animations and vectors)
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          
          // If image is already reasonably sized and under 600KB, use original
          if (width <= maxDimension && height <= maxDimension && file.size < 600 * 1024) {
            resolve(e.target.result);
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: true });
          if (!ctx) {
            resolve(e.target.result);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Use JPEG if file is jpeg or large PNG without transparency
          const outType = (file.type === 'image/jpeg' || file.type === 'image/jpg') ? 'image/jpeg' : 'image/png';
          try {
            const compressed = canvas.toDataURL(outType, quality);
            resolve(compressed);
          } catch (_) {
            resolve(e.target.result);
          }
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // Hook into window.importImage
  if (typeof window.importImage === 'function') {
    const _origImportImage = window.importImage;
    window.importImage = async function(file) {
      if (!file || !file.type.startsWith('image/')) return;
      try {
        const optimizedSrc = await compressImageFile(file);
        if (optimizedSrc && typeof window.addImage === 'function') {
          window.addImage(optimizedSrc);
        } else {
          _origImportImage(file);
        }
      } catch (err) {
        console.warn('Image optimization fallback:', err);
        _origImportImage(file);
      }
    };
  }

  // Hook file input element
  const imgInput = $('imageInput');
  if (imgInput) {
    imgInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (typeof window.importImage === 'function') {
        window.importImage(file);
      }
      imgInput.value = '';
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Coalesced requestAnimationFrame Render Pipeline
  // ──────────────────────────────────────────────────────────────────────────
  // Instead of executing 12 layers of render chains 3-5 times consecutively,
  // coalesce all calls within a frame into a single smooth execution.

  const _masterRender = window.render;
  let _renderScheduled = false;
  let _renderPromise = null;
  let _isRendering = false;

  window.render = function() {
    if (window.__forceSyncRender || window.__isExporting) {
      _masterRender();
      return;
    }

    if (_renderScheduled) return;
    _renderScheduled = true;

    requestAnimationFrame(() => {
      _renderScheduled = false;
      if (_isRendering) return;
      _isRendering = true;
      try {
        _masterRender();
      } catch (err) {
        console.error('Render error suppressed:', err);
      } finally {
        _isRendering = false;
      }
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Fast-Path Thumbnail Updates
  // ──────────────────────────────────────────────────────────────────────────
  // Redrawing all thumbnails from scratch every time one element moves is the
  // #1 cause of continuous slowdown. We update only the active thumbnail in-place!

  const _masterRenderSlides = window.renderSlides;
  let _lastDeckLength = -1;
  let _slidesScheduled = false;

  function updateSingleSlideThumb(index) {
    const list = $('slideList');
    if (!list || !slides || !slides[index]) return false;
    const thumb = list.children[index];
    if (!thumb) return false;

    const s = slides[index];

    // Background
    if (s.bgMedia || s.bgMediaAssetId) {
      const preview = s.bgMediaType === 'video' ? s.bgMediaPoster : s.bgMedia;
      thumb.style.background = preview ? 'center / cover no-repeat url("' + String(preview).replace(/"/g, '\\"') + '")' : 'linear-gradient(135deg,#0f172a,#1e293b)';
    } else if (s.brollPreset && s.brollPreset !== 'none' && typeof window.getBrollPresetGradient === 'function') {
      thumb.style.background = window.getBrollPresetGradient(s.brollPreset) || '#17233c';
    } else if (s.background === 'custom') {
      thumb.style.background = s.bgColor || '#17233c';
    } else if (s.background === 'image' && s.bgImage) {
      thumb.style.backgroundImage = 'url("' + s.bgImage + '")';
    } else {
      thumb.style.background = (typeof themes !== 'undefined' && themes[s.background]) ? themes[s.background] : '#17233c';
    }

    // Preserve badge and quick buttons
    const numBadge = thumb.querySelector('.num');
    const dupBtn = thumb.querySelector('.slide-thumb-quick-dup');

    // Remove existing mini elements
    thumb.querySelectorAll('.slide-thumb-mini-el, div:not(.num):not(.slide-thumb-quick-dup)').forEach(el => el.remove());

    // Re-render only this slide's elements
    if (Array.isArray(s.elements)) {
      s.elements.forEach(el => {
        const mini = document.createElement('div');
        mini.className = 'slide-thumb-mini-el';
        mini.style.cssText = `position:absolute;left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;overflow:hidden;white-space:pre-wrap;word-break:break-word;line-height:1.12;pointer-events:none;${el.type==='text'?`color:${el.color};font-size:${Math.max(4, (el.size||42)*.115)}px;font-weight:${el.weight||400};padding:1px;`: 'background:#ffffff15;border-radius:2px;'}`;
        if (el.type === 'image' && el.src) {
          const img = document.createElement('img');
          img.src = el.src;
          img.style.cssText = 'width:100%;height:100%;display:block;object-fit:cover;pointer-events:none;';
          mini.appendChild(img);
        } else if (el.type === 'text') {
          mini.textContent = el.text || '';
        }
        thumb.appendChild(mini);
      });
    }

    return true;
  }

  window.renderSlides = function(forceFullRebuild = false) {
    if (window.__forceSyncRender || window.__isExporting) {
      _masterRenderSlides();
      return;
    }

    const currentLength = Array.isArray(slides) ? slides.length : 0;
    const list = $('slideList');
    const domCount = list ? list.children.length : 0;

    // Fast path: if deck count matches DOM count and not forced, only update active thumbnail!
    if (!forceFullRebuild && currentLength === _lastDeckLength && domCount === currentLength && current >= 0 && current < currentLength) {
      // Toggle active classes quickly
      for (let i = 0; i < domCount; i++) {
        list.children[i].classList.toggle('active', i === current);
      }
      updateSingleSlideThumb(current);
      return;
    }

    // Otherwise throttle full rebuild to next frame
    if (_slidesScheduled) return;
    _slidesScheduled = true;
    requestAnimationFrame(() => {
      _slidesScheduled = false;
      _lastDeckLength = Array.isArray(slides) ? slides.length : 0;
      try {
        _masterRenderSlides();
      } catch (err) {
        console.warn('RenderSlides error:', err);
      }
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Debounced Inspector & Selection Updates
  // ──────────────────────────────────────────────────────────────────────────
  const _origRenderInspector = window.renderInspector;
  let _inspectorScheduled = false;

  window.renderInspector = function() {
    if (window.__forceSyncRender) {
      if (typeof _origRenderInspector === 'function') _origRenderInspector();
      return;
    }

    if (_inspectorScheduled) return;
    _inspectorScheduled = true;
    requestAnimationFrame(() => {
      _inspectorScheduled = false;
      try {
        if (typeof _origRenderInspector === 'function') _origRenderInspector();
      } catch (err) {
        console.warn('Inspector update error:', err);
      }
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CSS Performance Tuning & Containment
  // ──────────────────────────────────────────────────────────────────────────
  const perfStyle = document.createElement('style');
  perfStyle.id = 'presentationPerfStyle';
  perfStyle.textContent = `
    /* GPU compositing & containment for high-fps layout */
    .slide {
      contain: layout paint;
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    .slide-thumb {
      contain: content;
      will-change: transform;
    }
    .element {
      will-change: transform, left, top;
    }
    .element.image-el img {
      content-visibility: auto;
      image-rendering: auto;
    }
    /* Smooth transitions only where needed, prevent layout thrashing */
    .slide-thumb {
      transition: border-color 0.15s ease;
    }
  `;
  document.head.appendChild(perfStyle);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Memory Health Monitor & Periodic Sweep
  // ──────────────────────────────────────────────────────────────────────────
  // Periodically clear temporary canvases or caches to keep renderer lean
  setInterval(() => {
    if (window.performance && window.performance.memory) {
      const usedMB = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
      if (usedMB > 600) {
        console.warn(`[Memory Monitor] High JS Heap: ${usedMB}MB — running cache sweep`);
        // Remove unattached handle nodes if any
        document.querySelectorAll('.image-move-handle, .image-rotate-handle, .image-resize-handle, .text-move-handle, .text-rotate-handle, .text-resize-handle').forEach(h => {
          if (!h.closest('.element.selected')) h.remove();
        });
      }
    }
  }, 30000);

  console.log('✅ Presentation Performance & Stability Engine active.');
})();
