(() => {
  // Videos are binary assets, not slide JSON. Keeping them in IndexedDB avoids
  // huge base64 strings freezing the editor while still surviving a refresh.
  const MEDIA_DB = 'presentation-studio-media-v1', MEDIA_STORE = 'backgrounds';
  let mediaDbPromise;
  const resolvedMediaSlides = new WeakSet();
  const openMediaDb = () => mediaDbPromise || (mediaDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MEDIA_STORE)) request.result.createObjectStore(MEDIA_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
  const putMedia = async blob => {
    const id = crypto.randomUUID(); const db = await openMediaDb();
    await new Promise((resolve, reject) => { const tx = db.transaction(MEDIA_STORE, 'readwrite'); tx.objectStore(MEDIA_STORE).put(blob, id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    return id;
  };
  const getMedia = async id => {
    const db = await openMediaDb();
    return new Promise((resolve, reject) => { const tx = db.transaction(MEDIA_STORE, 'readonly'); const req = tx.objectStore(MEDIA_STORE).get(id); req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(req.error); });
  };
  window.PresentationBackgroundMediaStore = {
    async saveVideo(file, slide) {
      const id = await putMedia(file);
      if (slide.bgMediaObjURL) URL.revokeObjectURL(slide.bgMediaObjURL);
      slide.bgMediaAssetId = id;
      slide.bgMediaObjURL = URL.createObjectURL(file);
      resolvedMediaSlides.add(slide);
      // Do not serialize the video into every autosave/server write.
      delete slide.bgMedia;
      return id;
    },
    async resolveVideo(slide) {
      if (!slide?.bgMediaAssetId) return null;
      if (slide.bgMediaObjURL && resolvedMediaSlides.has(slide)) return slide.bgMediaObjURL;
      const blob = await getMedia(slide.bgMediaAssetId).catch(() => null);
      if (!blob) return null;
      slide.bgMediaObjURL = URL.createObjectURL(blob);
      resolvedMediaSlides.add(slide);
      return slide.bgMediaObjURL;
    }
  };
  const $ = id => document.getElementById(id);
  const input = $('backgroundImageInput');
  if (input) input.accept = 'image/*,video/mp4,video/webm,video/ogg';
  const holder = $('backgroundUpload');
  if (holder) {
    const label = holder.querySelector('.file-label');
    if (label && label.childNodes[0]) label.childNodes[0].textContent = 'Upload GIF / Video Background';
    if (!$('mediaBackgroundControls')) {
      holder.insertAdjacentHTML('beforeend', `
        <div id="mediaBackgroundControls" class="hidden">
          <label class="field">Video speed
            <select id="bgPlaybackRate">
              <option value="0.5">0.5x</option>
              <option value="1">1x Normal</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </label>
          <div class="row">
            <label class="field">Overlay<input id="bgOverlayColor" type="color" value="#000000"></label>
            <label class="field">Overlay opacity<input id="bgOverlayOpacity" type="number" min="0" max="100" value="10"></label>
          </div>
          <div class="row">
            <label class="field">Media opacity<input id="bgMediaOpacity" type="number" min="0" max="100" value="100"></label>
            <label class="field">Blur<input id="bgMediaBlur" type="number" min="0" max="30" value="0"></label>
          </div>
        </div>
      `);
    }
  }

  // ── Critical CSS: isolate video layer repaint from the rest of the slide ──
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      #animatedBackgroundLayer {
        position: absolute;
        inset: 0;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        overflow: hidden;
        pointer-events: none;
        /* GPU compositing layer — isolated from slide element repaints */
        transform: translateZ(0);
        will-change: opacity, filter;
        contain: strict;
        isolation: isolate;
      }
      #animatedBackgroundLayer img, #animatedBackgroundLayer video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transform: translateZ(0);
        will-change: transform;
        backface-visibility: hidden;
      }
      /* Pause visual feedback when dragging to reduce GPU pressure */
      #slide.is-dragging #animatedBackgroundLayer video {
        animation-play-state: paused;
      }
      .slide > .element { z-index: 5 !important; }
      .slide > .drop-note { z-index: 10 !important; }
    </style>
  `);

  function normalize(s) {
    s.bgPlaybackRate = Number(s.bgPlaybackRate || 1);
    s.bgOverlayColor = s.bgOverlayColor || '#000000';
    s.bgOverlayOpacity = Number(s.bgOverlayOpacity ?? 10);
    s.bgMediaOpacity = Number(s.bgMediaOpacity ?? 100);
    s.bgMediaBlur = Number(s.bgMediaBlur ?? 0);
  }

  // ── Layer state cache — avoid re-applying identical values ────────────────
  let _layerCache = '';

  function layer(force = false) {
    const s = active(), slide = $('slide');
    if (!slide) return;
    normalize(s);

    if (!s.bgMedia && !s.bgMediaAssetId) {
      const l = $('animatedBackgroundLayer');
      if (l) l.remove();
      if ($('mediaBackgroundControls')) $('mediaBackgroundControls').classList.add('hidden');
      _layerCache = '';
      return;
    }

    // When custom video / media is active, clean any conflicting broll layer
    const broll = $('brollLayer');
    if (broll) broll.remove();

    // Build a lightweight cache key from props without cloning large base64 strings
    const mediaKey = s.bgMediaAssetId || ((typeof s.bgMedia === 'string') ? (s.bgMedia.slice(0, 48) + '_' + s.bgMedia.length) : '');
    const cacheKey = [mediaKey, s.bgMediaType, s.bgPlaybackRate,
      s.bgOverlayColor, s.bgOverlayOpacity, s.bgMediaOpacity, s.bgMediaBlur].join('|');

    // Skip work if nothing changed and not forced
    if (!force && cacheKey === _layerCache) {
      // Ensure existing video is playing
      const existingVideo = $('animatedBackgroundLayer')?.querySelector('video');
      if (existingVideo && existingVideo.paused) {
        existingVideo.play().catch(() => {});
      }
      return;
    }
    _layerCache = cacheKey;

    if ($('mediaBackgroundControls')) $('mediaBackgroundControls').classList.remove('hidden');

    let l = $('animatedBackgroundLayer');
    if (!l) {
      l = document.createElement('div');
      l.id = 'animatedBackgroundLayer';
      slide.insertBefore(l, slide.firstChild);
    }

    const tag = s.bgMediaType === 'video' ? 'video' : 'img';
    let media = l.querySelector('video, img');

    // Use the stored object URL if available, otherwise fall back to bgMedia
    const mediaSrc = s.bgMediaObjURL || s.bgMedia;

    // One-time migration for videos saved by the previous data-URL version.
    // It preserves the user's existing background while moving it to the fast
    // persistent Blob store.
    if (s.bgMediaType === 'video' && typeof s.bgMedia === 'string' && s.bgMedia.startsWith('data:') && !s.bgMediaAssetId) {
      if (s.bgMediaPoster) l.style.background = 'center / cover no-repeat url("' + s.bgMediaPoster.replace(/"/g, '\\"') + '")';
      fetch(s.bgMedia).then(response => response.blob()).then(blob => window.PresentationBackgroundMediaStore.saveVideo(blob, s)).then(() => {
        _layerCache = ''; render();
        if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
      }).catch(() => {});
      return;
    }

    // Restored video assets resolve asynchronously. Show its poster meanwhile
    // instead of leaving the slide black, then redraw once the Blob URL exists.
    if (!mediaSrc && s.bgMediaAssetId) {
      if (s.bgMediaPoster) {
        l.style.background = 'center / cover no-repeat url("' + s.bgMediaPoster.replace(/"/g, '\\"') + '")';
      }
      window.PresentationBackgroundMediaStore.resolveVideo(s).then(url => {
        if (url) { _layerCache = ''; render(); }
      });
      return;
    }

    if (!media || media.tagName.toLowerCase() !== tag || media.dataset.srcKey !== (s.bgMediaObjURL || '').slice(-32) + (s.bgMedia || '').slice(0, 16)) {
      l.innerHTML = '';
      media = document.createElement(tag);
      media.src = mediaSrc;
      media.dataset.srcKey = (s.bgMediaObjURL || '').slice(-32) + (s.bgMedia || '').slice(0, 16);
      if (tag === 'video') {
        media.autoplay = true;
        media.loop = true;
        media.muted = true;
        media.playsInline = true;
        media.playbackRate = s.bgPlaybackRate;
        media.style.width = '100%';
        media.style.height = '100%';
        media.style.objectFit = 'cover';
        media.style.display = 'block';
        media.addEventListener('canplay', () => {
          media.play().catch(() => {});
        }, { once: true });
        media.play().catch(() => {});
      }
      l.appendChild(media);

      // Overlay: separate div so it never blocks the media element
      const ov = document.createElement('div');
      ov.className = 'bg-overlay-layer';
      ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
      l.appendChild(ov);
    }

    if (tag === 'video') {
      if (media.playbackRate !== s.bgPlaybackRate) {
        media.playbackRate = s.bgPlaybackRate;
      }
      if (media.paused) {
        media.play().catch(() => {});
      }
    }

    // Apply visual properties to media element (not the container)
    media.style.opacity = s.bgMediaOpacity / 100;
    media.style.filter = s.bgMediaBlur ? ('blur(' + s.bgMediaBlur + 'px) scale(1.04)') : 'none';
    l.style.opacity = '';
    l.style.filter = '';
    l.style.background = 'transparent';

    // Apply overlay color to the overlay div
    const ovEl = l.querySelector('.bg-overlay-layer');
    if (ovEl) {
      const hex = Math.round((s.bgOverlayOpacity / 100) * 255).toString(16).padStart(2, '0');
      ovEl.style.background = s.bgOverlayColor + hex;
    }
  }

  // ── Pause video during live drags to free up GPU bandwidth ───────────────
  let _dragPaused = false;

  function pauseVideosForDrag() {
    if (_dragPaused) return;
    _dragPaused = true;
    const l = $('animatedBackgroundLayer');
    const vid = l && l.querySelector('video');
    if (vid && !vid.paused) vid.pause();
    const broll = $('brollLayer');
    if (broll) broll.style.animationPlayState = 'paused';
    $('slide')?.classList.add('is-dragging');
  }

  function resumeVideosAfterDrag() {
    if (!_dragPaused) return;
    _dragPaused = false;
    const l = $('animatedBackgroundLayer');
    const vid = l && l.querySelector('video');
    if (vid && vid.paused) vid.play().catch(() => {});
    const broll = $('brollLayer');
    if (broll) broll.style.animationPlayState = '';
    $('slide')?.classList.remove('is-dragging');
  }

  // Hook into drag lifecycle flags set by presentation-studio.html
  const origPointermove = window.__bgMedia_pointermoveInstalled;
  if (!origPointermove) {
    window.__bgMedia_pointermoveInstalled = true;
    window.addEventListener('pointermove', () => {
      if (window.__presentationLiveDrag) pauseVideosForDrag();
    }, { passive: true });
    window.addEventListener('pointerup', () => {
      resumeVideosAfterDrag();
    }, { passive: true });
    window.addEventListener('pointercancel', () => {
      resumeVideosAfterDrag();
    }, { passive: true });
    window.addEventListener('presentation:texteditstart', () => {
      pauseVideosForDrag();
    });
    window.addEventListener('presentation:texteditend', () => {
      resumeVideosAfterDrag();
    });
    document.addEventListener('focusin', e => {
      if (e.target && (e.target.id === 'textValue' || e.target.isContentEditable || e.target.closest?.('.text-content'))) {
        pauseVideosForDrag();
      }
    });
    document.addEventListener('focusout', e => {
      if (e.target && (e.target.id === 'textValue' || e.target.isContentEditable || e.target.closest?.('.text-content'))) {
        resumeVideosAfterDrag();
      }
    });
  }

  // ── styleSlide hook — skip layer() during live drags ─────────────────────
  const baseStyle = styleSlide;
  styleSlide = function () {
    baseStyle();
    const s = active();
    if (s && s.bgMedia) {
      const slide = $('slide');
      if (slide) {
        slide.style.backgroundImage = 'none';
        slide.style.background = '#000';
      }
    }
    // Skip video layer update during drags — video is paused anyway
    if (!window.__presentationLiveDrag) {
      layer();
    }
  };

  if (input) {
    input.onchange = e => {
      const f = e.target.files[0];
      if (!f || !(f.type.startsWith('image/') || f.type.startsWith('video/'))) return;
      const s = active();
      if (f.type.startsWith('video/')) {
        window.PresentationBackgroundMediaStore.saveVideo(f, s).then(() => {
          s.background = 'media';
          s.bgMediaType = 'video';
          s.brollPreset = 'none';
          delete s.bgImage;
          normalize(s);
          _layerCache = '';
          render();
          if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
        }).catch(() => {});
      } else {
        // Images: use FileReader (small enough for base64)
        const r = new FileReader();
        r.onload = () => {
          s.background = 'media';
          s.bgMedia = r.result;
          delete s.bgMediaObjURL;
          s.bgMediaType = 'image';
          s.brollPreset = 'none';
          delete s.bgImage;
          normalize(s);
          _layerCache = '';
          render();
        };
        r.readAsDataURL(f);
      }
    };
  }

  if ($('clearBackgroundImage')) {
    $('clearBackgroundImage').onclick = () => {
      const s = active();
      if (s.bgMediaObjURL) URL.revokeObjectURL(s.bgMediaObjURL);
      delete s.bgMedia; delete s.bgMediaObjURL; delete s.bgMediaAssetId; delete s.bgMediaType; delete s.bgImage;
      delete s.bgMediaPoster;
      s.brollPreset = 'none';
      s.background = 'fashion';
      _layerCache = '';
      render();
    };
  }

  ['bgPlaybackRate', 'bgOverlayColor', 'bgOverlayOpacity', 'bgMediaOpacity', 'bgMediaBlur'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.oninput = () => {
      const s = active();
      if (!s.bgMedia) return;
      s.bgPlaybackRate = +$('bgPlaybackRate').value || 1;
      s.bgOverlayColor = $('bgOverlayColor').value;
      s.bgOverlayOpacity = Math.max(0, Math.min(100, +$('bgOverlayOpacity').value || 0));
      s.bgMediaOpacity = Math.max(0, Math.min(100, +$('bgMediaOpacity').value || 0));
      s.bgMediaBlur = Math.max(0, +$('bgMediaBlur').value || 0);
      _layerCache = ''; // force re-apply on next layer() call
      layer(true);
    };
  });

  const inspect = renderInspector;
  renderInspector = function () {
    inspect();
    const s = active();
    normalize(s);
    if ($('mediaBackgroundControls')) $('mediaBackgroundControls').classList.toggle('hidden', !s.bgMedia);
    if (s.bgMedia) {
      if ($('bgPlaybackRate')) $('bgPlaybackRate').value = s.bgPlaybackRate;
      if ($('bgOverlayColor')) $('bgOverlayColor').value = s.bgOverlayColor;
      if ($('bgOverlayOpacity')) $('bgOverlayOpacity').value = s.bgOverlayOpacity;
      if ($('bgMediaOpacity')) $('bgMediaOpacity').value = s.bgMediaOpacity;
      if ($('bgMediaBlur')) $('bgMediaBlur').value = s.bgMediaBlur;
    }
  };
})();
