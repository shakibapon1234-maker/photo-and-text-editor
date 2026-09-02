(() => {
  const $ = id => document.getElementById(id);

  // ── Helper: Preload images for canvas rendering ──────────────────────────────
  const imageCache = new Map();

  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = src;
    });
  }

  // ── Helper: Convert SVG string to Image ──────────────────────────────────────
  function loadSvg(svgStr, fill, stroke, strokeWidth) {
    let s = svgStr || '';
    if (fill) s = s.replace(/var\(--sf[^)]*\)/g, fill);
    if (stroke) s = s.replace(/var\(--ss[^)]*\)/g, stroke);
    if (strokeWidth !== undefined) s = s.replace(/var\(--sl[^)]*\)/g, strokeWidth + 'px');
    const key = 'svg:' + s;
    if (imageCache.has(key)) return Promise.resolve(imageCache.get(key));

    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        imageCache.set(key, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }

  // ── SVG Shapes Map ──────────────────────────────────────────────────────────
  function getShapeSvgCode(shape) {
    if (window.getShapeSvg) {
      try { return window.getShapeSvg(shape); } catch (_) {}
    }
    const s = shape || 'rect';
    switch (s) {
      case 'line':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" preserveAspectRatio="none" style="width:100%;height:100%"><line x1="0" y1="10" x2="100" y2="10" stroke="var(--sf, #4f8df7)" stroke-width="var(--sl, 4px)" stroke-linecap="round" /></svg>';
      case 'arrowLineRight':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" preserveAspectRatio="none" style="width:100%;height:100%"><line x1="0" y1="10" x2="86" y2="10" stroke="var(--sf, #4f8df7)" stroke-width="var(--sl, 4px)" stroke-linecap="round" /><polygon points="84,2 100,10 84,18" fill="var(--sf, #4f8df7)" /></svg>';
      case 'arrowRight':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:100%"><polygon points="0,15 62,15 62,0 100,25 62,50 62,35 0,35" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>';
      case 'arrowLeft':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:100%"><polygon points="38,0 38,15 100,15 100,35 38,35 38,50 0,25" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>';
      case 'round':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><rect x="2" y="2" width="96" height="56" rx="14" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>';
      case 'oval':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><ellipse cx="50" cy="30" rx="48" ry="28" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>';
      case 'diamond':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><polygon points="50,2 98,30 50,58 2,30" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>';
      case 'triangle':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><polygon points="50,2 98,58 2,58" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>';
      case 'star5':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><polygon points="50,2 61,22 84,22 65,36 72,58 50,44 28,58 35,36 16,22 39,22" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>';
      case 'heart':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><path d="M50 55 C20 40, 2 25, 2 14 C2 5, 14 2, 24 2 C35 2, 45 10, 50 16 C55 10, 65 2, 76 2 C86 2, 98 5, 98 14 C98 25, 80 40, 50 55 Z" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>';
      default:
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%"><rect x="2" y="2" width="96" height="56" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>';
    }
  }

  // ── Inject UI Modal Styles & HTML ──────────────────────────────────────────
  const modalCss = `
    .video-export-backdrop {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(4, 8, 18, 0.85); backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; font-family: Inter, Arial, "Noto Sans Bengali", sans-serif;
    }
    .video-export-dialog {
      background: #111a2e; border: 1px solid #2e4166; border-radius: 16px;
      width: 100%; max-width: 480px; padding: 24px; color: #edf3ff;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
    }
    .video-export-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; border-bottom: 1px solid #223352; padding-bottom: 12px;
    }
    .video-export-title { font-size: 18px; font-weight: 800; color: #ffd166; display: flex; align-items: center; gap: 8px; }
    .video-export-close { background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer; }
    .video-export-close:hover { color: #fff; }
    .video-field-group { margin-bottom: 14px; }
    .video-field-label { display: block; font-size: 12px; font-weight: 700; color: #98a8c4; margin-bottom: 6px; }
    .video-select, .video-input {
      width: 100%; padding: 10px; background: #0b1220; border: 1px solid #2e4166;
      border-radius: 8px; color: #fff; font: inherit; font-size: 13px; box-sizing: border-box;
    }
    .video-checkbox-label {
      display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer; color: #dbe6fe; margin-top: 6px;
    }
    .video-checkbox-label input { width: 16px; height: 16px; accent-color: #ffb11b; cursor: pointer; }
    .video-progress-box {
      margin-top: 18px; padding: 14px; background: #0a1120; border-radius: 10px; border: 1px solid #1e2c45;
    }
    .video-progress-bar-bg {
      height: 12px; background: #1b283f; border-radius: 6px; overflow: hidden; margin-top: 8px;
    }
    .video-progress-bar-fill {
      height: 100%; width: 0%; background: linear-gradient(90deg, #ff9f1c, #ffb11b, #22c55e); transition: width 0.15s ease;
    }
    .video-status-text { font-size: 12px; color: #93c5fd; font-weight: 600; margin-top: 6px; }
    .video-btn-row { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
    .video-btn {
      padding: 10px 18px; border-radius: 8px; border: 1px solid #3b82f6; background: #1d4ed8;
      color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.15s;
    }
    .video-btn:hover { background: #2563eb; transform: translateY(-1px); }
    .video-btn-primary { background: #d97706; border-color: #f59e0b; color: #fff; }
    .video-btn-primary:hover { background: #b45309; }
    .video-btn-secondary { background: #1e293b; border-color: #475569; color: #cbd5e1; }
    .video-btn-secondary:hover { background: #334155; }
  `;

  document.head.insertAdjacentHTML('beforeend', `<style>${modalCss}</style>`);

  const modalHtml = `
    <div id="videoExportModal" class="video-export-backdrop hidden">
      <div class="video-export-dialog">
        <div class="video-export-header">
          <div class="video-export-title">🎥 Export Presentation to Video (.webm)</div>
          <button class="video-export-close" id="closeVideoModal">×</button>
        </div>
        
        <div id="videoExportForm">
          <div class="video-field-group">
            <label class="video-field-label">Resolution / Quality</label>
            <select id="videoResSelect" class="video-select">
              <option value="1920x1080" selected>1080p Full HD (1920 × 1080) - Recommended</option>
              <option value="1280x720">720p HD (1280 × 720) - Faster</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="video-field-group">
              <label class="video-field-label">Frame Rate (FPS)</label>
              <select id="videoFpsSelect" class="video-select">
                <option value="30" selected>30 FPS (Standard)</option>
                <option value="60">60 FPS (Ultra Smooth)</option>
              </select>
            </div>
            <div class="video-field-group">
              <label class="video-field-label">Default Slide Duration</label>
              <input id="videoDefaultDuration" class="video-input" type="number" min="1" max="60" value="4" suffix="sec">
            </div>
          </div>

          <div class="video-field-group">
            <label class="video-checkbox-label">
              <input id="videoIncludeAudio" type="checkbox" checked>
              Include Soundtrack / Audio (If uploaded)
            </label>
            <p id="videoAudioStatus" style="font-size: 11px; color: #a0aec0; margin-left: 26px; margin-top: 3px;">Checking soundtrack status...</p>
          </div>

          <div class="video-btn-row">
            <button class="video-btn video-btn-secondary" id="cancelVideoExport">Cancel</button>
            <button class="video-btn video-btn-primary" id="startVideoExport">🎬 Start Video Export</button>
          </div>
        </div>

        <div id="videoExportProgress" class="video-progress-box hidden">
          <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700;">
            <span style="color:#ffd166">Rendering Video...</span>
            <span id="videoProgressPct" style="color:#22c55e">0%</span>
          </div>
          <div class="video-progress-bar-bg">
            <div id="videoProgressBarFill" class="video-progress-bar-fill"></div>
          </div>
          <div id="videoStatusText" class="video-status-text">Initializing canvas engine...</div>
          <button class="video-btn video-btn-secondary" id="abortVideoExport" style="margin-top:12px; width:100%;">Stop / Cancel Export</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // ── Open / Close Modal Logic ──────────────────────────────────────────────
  let isExporting = false;
  let abortRequested = false;

  async function checkSoundtrackStatus() {
    const statusEl = $('videoAudioStatus');
    let soundtrack = null;
    if (window.getPresentationSoundtrack) {
      soundtrack = await window.getPresentationSoundtrack();
    }

    if (statusEl) {
      if (soundtrack && soundtrack.src) {
        statusEl.textContent = `🎵 Selected soundtrack: "${soundtrack.name || 'Audio file'}" (${soundtrack.volume || 30}% volume)`;
        statusEl.style.color = '#34d399';
        $('videoIncludeAudio').checked = true;
      } else {
        statusEl.textContent = 'ℹ️ No soundtrack selected. You can add sound using "♫ Soundtrack" button.';
        statusEl.style.color = '#94a3b8';
        $('videoIncludeAudio').checked = false;
      }
    }
  }

  function openVideoModal() {
    checkSoundtrackStatus();
    $('videoExportForm').classList.remove('hidden');
    $('videoExportProgress').classList.add('hidden');
    $('videoExportModal').classList.remove('hidden');
  }

  function closeVideoModal() {
    if (isExporting) {
      if (!confirm('Video recording is in progress. Are you sure you want to cancel?')) return;
      abortRequested = true;
    }
    $('videoExportModal').classList.add('hidden');
  }

  $('closeVideoModal').onclick = closeVideoModal;
  $('cancelVideoExport').onclick = closeVideoModal;

  // Expose opener on window
  window.openVideoExportModal = openVideoModal;

  // ── Canvas Renderer Engine ────────────────────────────────────────────────
  const themesMap = {
    fashion: 'linear-gradient(135deg, #170b32, #192d58)',
    luxury: 'linear-gradient(135deg, #1d1307, #76500a)',
    ocean: 'linear-gradient(135deg, #06203d, #0c5d86)',
    royal: 'linear-gradient(135deg, #2b1055, #7597de)',
    blush: 'linear-gradient(135deg, #5e1938, #f06292)',
    emerald: 'linear-gradient(135deg, #063b36, #16a085)',
    sunset: 'linear-gradient(135deg, #5b1a13, #f59e0b)',
    clean: '#f8fafc'
  };

  function parseGradient(ctx, width, height, str) {
    if (!str || !str.startsWith('linear-gradient')) {
      return str || '#17233c';
    }
    const grad = ctx.createLinearGradient(0, 0, width, height);
    const colors = str.match(/#(?:[0-9a-fA-F]{3}){1,2}/g);
    if (colors && colors.length >= 2) {
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      return grad;
    }
    return '#17233c';
  }

  async function preloadSlideResources(slidesList) {
    const promises = [];
    slidesList.forEach(slide => {
      (slide.elements || []).forEach(el => {
        if (el.type === 'image' && el.src) {
          promises.push(loadImage(el.src));
        }
        if (el.type === 'shape') {
          if (el.shapeImage) {
            promises.push(loadImage(el.shapeImage));
          } else {
            const svgCode = getShapeSvgCode(el.shape);
            const fillVal = el.fill || el.fillColor || el.bgColor || el.color || '#4f8df7';
            const strokeVal = el.stroke || el.borderColor || el.lineColor || '#ffffff';
            const lineVal = el.line !== undefined ? Number(el.line) : (el.borderWidth !== undefined ? Number(el.borderWidth) : 2);
            promises.push(loadSvg(svgCode, fillVal, strokeVal, lineVal));
          }
        }
      });
    });
    await Promise.all(promises);
  }

  function drawBackground(ctx, width, height, slide, frameIndex) {
    ctx.save();
    const bgType = slide.background || 'fashion';
    const bgVal = bgType === 'custom' ? (slide.bgColor || '#17233c') : (themesMap[bgType] || '#17233c');
    ctx.fillStyle = parseGradient(ctx, width, height, bgVal);
    ctx.fillRect(0, 0, width, height);

    // Optional B-Roll / Animated Background effects on Canvas
    const broll = slide.broll || slide.animatedPreset || '';
    if (broll === 'space' || broll === 'stars') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 99 + frameIndex * 0.02) * 0.5 + 0.5) * width;
        const y = (Math.cos(i * 33 + frameIndex * 0.015) * 0.5 + 0.5) * height;
        const r = (i % 3) + 1;
        ctx.globalAlpha = Math.sin(frameIndex * 0.05 + i) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    } else if (broll === 'aurora') {
      const grad = ctx.createRadialGradient(
        width * (0.3 + Math.sin(frameIndex * 0.02) * 0.2),
        height * (0.4 + Math.cos(frameIndex * 0.02) * 0.2),
        10,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  function drawElements(ctx, width, height, slide, progressInSlide) {
    (slide.elements || []).forEach(el => {
      ctx.save();
      const x = (el.x / 100) * width;
      const y = (el.y / 100) * height;
      const w = (el.w / 100) * width;
      const h = (el.h / 100) * height;
      const rot = (Number(el.rotation) || 0) * Math.PI / 180;

      // Calculate Entrance Animation transform & opacity
      let alpha = 1.0;
      let animX = 0;
      let animY = 0;
      let animScale = 1.0;

      const anim = el.animation || 'fade';
      const animDelay = Number(el.animationDelay) || 0;
      const animDur = Number(el.animationDuration) || 0.6;
      const elapsedTime = progressInSlide * ((slide.autoDuration || 4));

      if (elapsedTime < animDelay) {
        alpha = 0;
      } else if (elapsedTime < animDelay + animDur) {
        const p = (elapsedTime - animDelay) / animDur;
        if (anim === 'fade' || anim === 'appear') {
          alpha = p;
        } else if (anim === 'slideLeft') {
          alpha = p; animX = -90 * (1 - p);
        } else if (anim === 'slideRight') {
          alpha = p; animX = 90 * (1 - p);
        } else if (anim === 'slideUp') {
          alpha = p; animY = 70 * (1 - p);
        } else if (anim === 'slideDown') {
          alpha = p; animY = -70 * (1 - p);
        } else if (anim === 'zoom' || anim === 'pop') {
          alpha = p; animScale = 0.2 + 0.8 * p;
        }
      }

      ctx.globalAlpha = alpha;

      // Transform center point
      const cx = x + w / 2 + animX;
      const cy = y + h / 2 + animY;
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      if (animScale !== 1.0) ctx.scale(animScale, animScale);

      // Draw Element Types
      if (el.type === 'text') {
        const txtColor = el.color || '#ffffff';
        const txtSize = (Number(el.size) || 36) * (width / 960);
        const txtWeight = el.weight || '700';
        const fontFamily = el.fontFamily || 'Inter, Arial, "Noto Sans Bengali", sans-serif';
        const align = el.textAlign || 'center';

        // Draw Box Background if specified
        const boxBg = el.boxBg || el.backgroundColor || el.bgColor;
        if (boxBg && boxBg !== 'transparent') {
          ctx.fillStyle = boxBg;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        }

        ctx.font = `${txtWeight} ${txtSize}px ${fontFamily}`;
        ctx.fillStyle = txtColor;
        ctx.textBaseline = 'middle';

        if (align === 'left') {
          ctx.textAlign = 'left';
        } else if (align === 'right') {
          ctx.textAlign = 'right';
        } else {
          ctx.textAlign = 'center';
        }

        // Multiline Text Support
        const lines = (el.text || '').split('\n');
        const lineHeight = txtSize * 1.25;
        const startY = -(lines.length - 1) * lineHeight / 2;

        lines.forEach((lineText, idx) => {
          let drawX = 0;
          if (align === 'left') drawX = -w / 2 + 10;
          if (align === 'right') drawX = w / 2 - 10;
          ctx.fillText(lineText, drawX, startY + idx * lineHeight);
        });

      } else if (el.type === 'image') {
        const img = imageCache.get(el.src);
        if (img) {
          if (el.borderRadius) {
            ctx.beginPath();
            ctx.roundRect(-w / 2, -h / 2, w, h, (Number(el.borderRadius) || 0) * (width / 960));
            ctx.clip();
          }
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }

      } else if (el.type === 'shape') {
        if (el.shapeImage) {
          const img = imageCache.get(el.shapeImage);
          if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          const svgCode = getShapeSvgCode(el.shape);
          const fillVal = el.fill || el.fillColor || el.bgColor || el.color || '#4f8df7';
          const strokeVal = el.stroke || el.borderColor || el.lineColor || '#ffffff';
          const lineVal = el.line !== undefined ? Number(el.line) : 2;
          const key = 'svg:' + svgCode.replace(/var\(--sf[^)]*\)/g, fillVal).replace(/var\(--ss[^)]*\)/g, strokeVal).replace(/var\(--sl[^)]*\)/g, lineVal + 'px');
          const img = imageCache.get(key);
          if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }

        if (el.text) {
          const txtColor = el.textColor || el.color || '#ffffff';
          const txtSize = (Number(el.textSize || el.size || 18)) * (width / 960);
          const txtWeight = el.textWeight || el.weight || '700';
          ctx.font = `${txtWeight} ${txtSize}px Inter, Arial, "Noto Sans Bengali", sans-serif`;
          ctx.fillStyle = txtColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, 0, 0);
        }
      }

      ctx.restore();
    });
  }

  // ── Render Single Full Slide or Transition ──────────────────────────────────
  function renderFrame(ctx, width, height, slideCurrent, slideNext, transitionProgress, progressInSlide, frameIndex) {
    if (!slideNext || transitionProgress <= 0) {
      drawBackground(ctx, width, height, slideCurrent, frameIndex);
      drawElements(ctx, width, height, slideCurrent, progressInSlide);
      return;
    }

    const type = slideCurrent.transition || 'fade';
    if (type === 'fade') {
      drawBackground(ctx, width, height, slideCurrent, frameIndex);
      drawElements(ctx, width, height, slideCurrent, progressInSlide);

      ctx.save();
      ctx.globalAlpha = transitionProgress;
      drawBackground(ctx, width, height, slideNext, frameIndex);
      drawElements(ctx, width, height, slideNext, 0);
      ctx.restore();

    } else if (type === 'slide') {
      ctx.save();
      ctx.translate(-width * transitionProgress, 0);
      drawBackground(ctx, width, height, slideCurrent, frameIndex);
      drawElements(ctx, width, height, slideCurrent, progressInSlide);
      ctx.restore();

      ctx.save();
      ctx.translate(width * (1 - transitionProgress), 0);
      drawBackground(ctx, width, height, slideNext, frameIndex);
      drawElements(ctx, width, height, slideNext, 0);
      ctx.restore();

    } else {
      drawBackground(ctx, width, height, slideCurrent, frameIndex);
      drawElements(ctx, width, height, slideCurrent, progressInSlide);
    }
  }

  // ── Main Video Recording & Audio Processing ─────────────────────────────
  $('startVideoExport').onclick = async () => {
    const slidesList = window.slides || [];
    if (!slidesList.length) {
      alert('No slides to export.');
      return;
    }

    const resVal = $('videoResSelect').value;
    const [width, height] = resVal.split('x').map(Number);
    const fps = Number($('videoFpsSelect').value) || 30;
    const defaultDuration = Number($('videoDefaultDuration').value) || 4;
    const includeAudio = $('videoIncludeAudio').checked;

    // Switch UI to progress
    $('videoExportForm').classList.add('hidden');
    $('videoExportProgress').classList.remove('hidden');
    isExporting = true;
    abortRequested = false;

    const updateProgress = (pct, text) => {
      $('videoProgressPct').textContent = Math.round(pct) + '%';
      $('videoProgressBarFill').style.width = Math.round(pct) + '%';
      $('videoStatusText').textContent = text;
    };

    updateProgress(2, 'Preloading fonts & image assets...');
    await preloadSlideResources(slidesList);

    // Prepare Offscreen Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Prepare Stream & MediaRecorder
    const canvasStream = canvas.captureStream(fps);

    // Audio Setup
    let audioCtx = null;
    let audioSourceNode = null;
    let audioDestNode = null;

    if (includeAudio && window.getPresentationSoundtrack) {
      const soundtrack = await window.getPresentationSoundtrack();
      if (soundtrack && soundtrack.src) {
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioDestNode = audioCtx.createMediaStreamDestination();

          const audioEl = new Audio();
          audioEl.crossOrigin = 'anonymous';
          audioEl.src = soundtrack.src;
          audioEl.volume = (soundtrack.volume || 30) / 100;
          audioEl.loop = soundtrack.loop !== false;

          audioSourceNode = audioCtx.createMediaElementSource(audioEl);
          audioSourceNode.connect(audioDestNode);
          audioSourceNode.connect(audioCtx.destination);

          const audioTrack = audioDestNode.stream.getAudioTracks()[0];
          if (audioTrack) {
            canvasStream.addTrack(audioTrack);
          }
          await audioEl.play();
        } catch (err) {
          console.warn('Audio setup error:', err);
        }
      }
    }

    // Determine MediaRecorder MimeType
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 6000000 });

    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.start();

    // Total Duration & Frames Calculation
    const transitionDuration = 0.8;
    let totalFrames = 0;

    const slideFrameCounts = slidesList.map(s => {
      const dur = s.autoDuration > 0 ? s.autoDuration : defaultDuration;
      return Math.round(dur * fps);
    });

    const transitionFrameCount = Math.round(transitionDuration * fps);
    totalFrames = slideFrameCounts.reduce((a, b) => a + b, 0);

    let currentFrame = 0;
    const frameInterval = 1000 / fps;

    updateProgress(5, `Starting recording (${slidesList.length} slides, ${totalFrames} frames)...`);

    // Frame-by-Frame Loop
    for (let sIdx = 0; sIdx < slidesList.length; sIdx++) {
      if (abortRequested) break;

      const currentSlide = slidesList[sIdx];
      const nextSlide = slidesList[sIdx + 1] || null;
      const slideFrames = slideFrameCounts[sIdx];

      for (let f = 0; f < slideFrames; f++) {
        if (abortRequested) break;

        const progressInSlide = f / slideFrames;
        let transitionProgress = 0;

        if (nextSlide && f >= (slideFrames - transitionFrameCount)) {
          transitionProgress = (f - (slideFrames - transitionFrameCount)) / transitionFrameCount;
        }

        renderFrame(ctx, width, height, currentSlide, nextSlide, transitionProgress, progressInSlide, currentFrame);

        currentFrame++;
        const pct = (currentFrame / totalFrames) * 90 + 5;
        updateProgress(pct, `Rendering Slide ${sIdx + 1} of ${slidesList.length} (Frame ${currentFrame}/${totalFrames})`);

        await new Promise(r => setTimeout(r, frameInterval));
      }
    }

    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (abortRequested) {
      isExporting = false;
      closeVideoModal();
      return;
    }

    updateProgress(98, 'Finalizing video file download...');

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `presentation-video-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);

      updateProgress(100, 'Export complete! Video file downloaded.');
      isExporting = false;

      setTimeout(() => {
        closeVideoModal();
      }, 1500);
    };
  };

  $('abortVideoExport').onclick = () => {
    abortRequested = true;
  };
})();
