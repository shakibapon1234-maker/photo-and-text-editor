(() => {
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

    if (!s.bgMedia) {
      const l = $('animatedBackgroundLayer');
      if (l) l.remove();
      if ($('mediaBackgroundControls')) $('mediaBackgroundControls').classList.add('hidden');
      _layerCache = '';
      return;
    }

    // When custom video / media is active, clean any conflicting broll layer
    const broll = $('brollLayer');
    if (broll) broll.remove();

    // Build a cache key from all relevant props
    const cacheKey = [s.bgMedia, s.bgMediaType, s.bgPlaybackRate,
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

    if (!media || media.tagName.toLowerCase() !== tag || media.dataset.src !== s.bgMedia) {
      // Remove previous media while keeping overlay intact if present
      const overlayEl = l.querySelector('.animated-editor-overlay');
      l.innerHTML = '';
      media = document.createElement(tag);
      media.src = s.bgMedia;
      media.dataset.src = s.bgMedia;
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
      if (overlayEl) l.appendChild(overlayEl);
    }

    if (tag === 'video') {
      if (media.playbackRate !== s.bgPlaybackRate) {
        media.playbackRate = s.bgPlaybackRate;
      }
      if (media.paused) {
        media.play().catch(() => {});
      }
    }

    // Apply visual properties only (no layout changes)
    l.style.opacity = s.bgMediaOpacity / 100;
    l.style.filter = s.bgMediaBlur ? ('blur(' + s.bgMediaBlur + 'px) scale(1.04)') : 'none';
    const hex = Math.round((s.bgOverlayOpacity / 100) * 255).toString(16).padStart(2, '0');
    l.style.background = 'linear-gradient(' + s.bgOverlayColor + hex + ',' + s.bgOverlayColor + hex + ')';
  }

  // ── Pause video during live drags to free up GPU bandwidth ───────────────
  let _dragPaused = false;

  function pauseVideosForDrag() {
    if (_dragPaused) return;
    _dragPaused = true;
    const l = $('animatedBackgroundLayer');
    const vid = l && l.querySelector('video');
    if (vid && !vid.paused) vid.pause();
    $('slide')?.classList.add('is-dragging');
  }

  function resumeVideosAfterDrag() {
    if (!_dragPaused) return;
    _dragPaused = false;
    const l = $('animatedBackgroundLayer');
    const vid = l && l.querySelector('video');
    if (vid && vid.paused) vid.play().catch(() => {});
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
      const r = new FileReader();
      r.onload = () => {
        const s = active();
        s.background = 'media';
        s.bgMedia = r.result;
        s.bgMediaType = f.type.startsWith('video/') ? 'video' : 'image';
        s.brollPreset = 'none';
        delete s.bgImage;
        normalize(s);
        _layerCache = ''; // force re-apply
        render();
      };
      r.readAsDataURL(f);
    };
  }

  if ($('clearBackgroundImage')) {
    $('clearBackgroundImage').onclick = () => {
      const s = active();
      delete s.bgMedia; delete s.bgMediaType; delete s.bgImage;
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
