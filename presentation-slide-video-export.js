/**
 * presentation-slide-video-export.js
 * Presentation Studio — Slides to Video Export
 * =============================================
 * Converts all slides into a WebM video with custom timing and resolution.
 * Includes interactive modal, real-time progress bar, and instant download.
 */

(() => {
  const $ = id => document.getElementById(id);

  // ── Inject Modal CSS ──────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', `<style id="slideVideoExportStyles">
    #slideVideoExportModal {
      position: fixed;
      inset: 0;
      background: rgba(4, 8, 18, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    #slideVideoExportModal.open {
      opacity: 1;
      pointer-events: auto;
    }
    #veBox {
      background: #101827;
      border: 1px solid #384b6e;
      border-radius: 14px;
      padding: 24px 28px 22px;
      width: min(92vw, 460px);
      box-shadow: 0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(168, 85, 247, 0.15);
      animation: veScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      color: #e2ecff;
    }
    @keyframes veScaleIn {
      from { transform: scale(0.94); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    #veBox h3 {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 800;
      color: #c084fc;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ve-close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .ve-close-btn:hover { color: #fff; }
    .ve-desc {
      font-size: 12px;
      color: #98a8c4;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .ve-field {
      margin-bottom: 14px;
    }
    .ve-field label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #cbdcf7;
      margin-bottom: 6px;
    }
    .ve-field input, .ve-field select {
      width: 100%;
      padding: 9px 12px;
      background: #182338;
      border: 1px solid #2e4368;
      border-radius: 7px;
      color: #fff;
      font: 700 13px inherit;
      box-sizing: border-box;
      outline: none;
    }
    .ve-field input:focus, .ve-field select:focus {
      border-color: #c084fc;
    }
    .ve-field small {
      display: block;
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .ve-progress-wrap {
      margin: 16px 0 10px;
      display: none;
    }
    .ve-progress-bar {
      height: 10px;
      background: #182338;
      border: 1px solid #2e4368;
      border-radius: 6px;
      overflow: hidden;
      margin-top: 6px;
    }
    .ve-progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #9333ea, #c084fc);
      transition: width 0.15s ease;
    }
    .ve-status-text {
      font-size: 12px;
      font-weight: 700;
      color: #ffd166;
      display: flex;
      justify-content: space-between;
    }
    .ve-actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }
    .ve-start-btn {
      flex: 1;
      padding: 11px;
      background: linear-gradient(90deg, #7e22ce, #9333ea);
      border: 1.5px solid #c084fc;
      border-radius: 8px;
      color: #fff;
      font: 800 13px inherit;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .ve-start-btn:hover { opacity: 0.9; }
    .ve-start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ve-cancel-btn {
      padding: 11px 18px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #94a3b8;
      font: 700 12px inherit;
      cursor: pointer;
    }
    .ve-cancel-btn:hover { color: #fff; background: #334155; }
  </style>`);

  // ── Build Modal DOM ───────────────────────────────────────────────────────
  const modal = document.createElement('div');
  modal.id = 'slideVideoExportModal';
  modal.innerHTML = `
    <div id="veBox">
      <h3>
        <span>🎬 Export Slides as Video (.webm)</span>
        <button class="ve-close-btn" id="veCloseBtn" title="বন্ধ করুন">✕</button>
      </h3>
      <p class="ve-desc">
        সমস্ত স্লাইড একসাথে একটি উচ্চ মানের WebM ভিডিও ফাইল হিসেবে ডাউনলোড হবে।
      </p>

      <div class="ve-field">
        <label>⏱️ প্রতিটি স্লাইডের প্রদর্শন সময় (সেকেন্ড প্রতি স্লাইড):</label>
        <input id="veSlideDur" type="number" min="1" max="60" step="0.5" value="4">
        <small>💡 স্লাইডে নিজস্ব Auto Duration সেট থাকলে সেটিই স্বয়ংক্রিয়ভাবে ব্যবহার হবে।</small>
      </div>

      <div class="ve-field">
        <label>📺 ভিডিও রেজোলিউশন (Resolution):</label>
        <select id="veResolution">
          <option value="720" selected>HD 720p (1280 × 720) — দ্রুত ও অপ্টিমাইজড</option>
          <option value="1080">Full HD 1080p (1920 × 1080) — সর্বোচ্চ মান</option>
        </select>
      </div>

      <div class="ve-progress-wrap" id="veProgressWrap">
        <div class="ve-status-text">
          <span id="veStatusMsg">⏳ প্রস্তুত হচ্ছে...</span>
          <span id="veStatusPct">0%</span>
        </div>
        <div class="ve-progress-bar">
          <div class="ve-progress-fill" id="veProgressFill"></div>
        </div>
      </div>

      <div class="ve-actions">
        <button class="ve-start-btn" id="veStartBtn">🎬 ভিডিও এক্সপোর্ট শুরু করুন</button>
        <button class="ve-cancel-btn" id="veCancelBtn">বাতিল</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let isExporting = false;

  function openModal() {
    modal.classList.add('open');
    $('veProgressWrap').style.display = 'none';
    $('veStartBtn').disabled = false;
    $('veStartBtn').textContent = '🎬 ভিডিও এক্সপোর্ট শুরু করুন';
  }

  function closeModal() {
    if (isExporting) return; // prevent closing while actively recording
    modal.classList.remove('open');
  }

  $('veCloseBtn').onclick = closeModal;
  $('veCancelBtn').onclick = closeModal;
  modal.addEventListener('pointerdown', e => {
    if (e.target === modal && !isExporting) closeModal();
  });
  $('veBox').addEventListener('pointerdown', e => e.stopPropagation());

  // ── Button Trigger in Export Menu ─────────────────────────────────────────
  function ensureVideoExportBtn() {
    let btn = $('exportVideo');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'exportVideo';
      btn.type = 'button';
      btn.innerHTML = '🎬 Export as Video (.webm)';
      btn.title = 'সমস্ত স্লাইড একসাথে WebM ভিডিও হিসেবে ডাউনলোড করুন';
      btn.style.cssText = 'background:#1e0a3c;border:1px solid #a855f7;color:#d8b4fe;font-weight:800;white-space:nowrap;';

      const exportMenu = document.querySelector('.toolbar-menu[data-menu="export"]');
      if (exportMenu) {
        exportMenu.appendChild(btn);
      } else {
        const dlBtn = $('downloadSlideshow');
        if (dlBtn && dlBtn.parentNode) dlBtn.parentNode.insertBefore(btn, dlBtn.nextSibling);
      }
    }

    if (btn) {
      btn.onclick = (e) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        document.querySelectorAll('#toolbarGroups .toolbar-group.open').forEach(g => g.classList.remove('open'));
        openModal();
      };
    }
  }

  // ── Core Recording Engine ─────────────────────────────────────────────────
  $('veStartBtn').onclick = async () => {
    if (isExporting) return;

    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') {
      alert('❌ আপনার সিস্টেমে MediaRecorder সাপোর্ট পাওয়া যায়নি।');
      return;
    }

    if (!slides || !slides.length) {
      alert('কোনো স্লাইড পাওয়া যায়নি।');
      return;
    }

    const fallbackDur = Math.max(1, parseFloat($('veSlideDur').value) || 4);
    const resVal = $('veResolution').value;
    const W = resVal === '1080' ? 1920 : 1280;
    const H = resVal === '1080' ? 1080 : 720;

    isExporting = true;
    $('veStartBtn').disabled = true;
    $('veCancelBtn').disabled = true;
    $('veProgressWrap').style.display = 'block';
    $('veStatusFill') && ($('veStatusFill').style.width = '0%');
    $('veProgressFill').style.width = '0%';
    $('veStatusMsg').textContent = '⏳ ভিডিও রেকর্ডিং প্রস্তুত হচ্ছে...';
    $('veStatusPct').textContent = '0%';

    try {
      await recordSlidesToVideo(slides, fallbackDur, W, H, (pct, msg) => {
        $('veProgressFill').style.width = pct + '%';
        $('veStatusMsg').textContent = msg;
        $('veStatusPct').textContent = pct + '%';
      });

      $('veProgressFill').style.width = '100%';
      $('veStatusMsg').textContent = '✅ ভিডিও তৈরি সম্পন্ন! ডাউনলোড হচ্ছে...';
      $('veStatusPct').textContent = '100%';
      $('veStartBtn').textContent = '✅ সম্পন্ন!';

      setTimeout(() => {
        isExporting = false;
        $('veCancelBtn').disabled = false;
        closeModal();
      }, 2200);
    } catch (err) {
      console.error('Slide video export error:', err);
      alert('ভিডিও তৈরিতে সমস্যা হয়েছে:\n' + err.message);
      isExporting = false;
      $('veStartBtn').disabled = false;
      $('veCancelBtn').disabled = false;
      $('veStartBtn').textContent = '🎬 আবার চেষ্টা করুন';
    }
  };

  // ── Asset & SVG Caching ───────────────────────────────────────────────────
  const imgCache = new Map();
  async function preloadImage(src) {
    if (!src) return null;
    if (imgCache.has(src)) return imgCache.get(src);
    const img = await loadImage(src);
    if (img) imgCache.set(src, img);
    return img;
  }

  const svgImgCache = new Map();
  async function preloadShapeSvg(el) {
    const shape = el.shape || 'rect';
    const sf = el.fill || el.fillColor || el.bgColor || el.boxBg || el.color || '#4f8df7';
    const ss = el.stroke || el.borderColor || el.lineColor || 'transparent';
    const sl = (el.line !== undefined ? el.line : (el.borderWidth !== undefined ? el.borderWidth : 2)) + 'px';
    const key = `${shape}_${sf}_${ss}_${sl}`;
    if (svgImgCache.has(key)) return svgImgCache.get(key);

    let svg = '';
    if (shape === 'pill') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="56" rx="28" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
    } else if (typeof window.getShapeSvg === 'function') {
      svg = window.getShapeSvg(shape) || '';
    }
    if (!svg) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="56" rx="14" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
    }
    if (!svg.includes('xmlns=')) {
      svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    svg = svg.replace(/var\(--sf,\s*[^)]+\)/g, sf)
             .replace(/var\(--ss,\s*[^)]+\)/g, ss)
             .replace(/var\(--sl,\s*[^)]+\)/g, sl);

    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = await loadImage(uri);
    if (img) svgImgCache.set(key, img);
    return img;
  }

  // ── Animated B-Roll Canvas Renderer ───────────────────────────────────────
  function drawBrollBackground(ctx, preset, t, W, H) {
    if (!preset || preset === 'none') return false;

    if (preset === 'night') {
      // 1. Sky gradient
      const grad = ctx.createLinearGradient(0, 0, W * 0.8, H);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.6, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 2. Twinkling Stars
      const starCount = 75;
      for (let s = 0; s < starCount; s++) {
        const sx = ((s * 137.5 + s * s * 13) % W);
        const sy = ((s * 93.7 + s * 29) % (H * 0.65));
        const sz = (s % 3 === 0) ? 2.2 * (H / 540) : 1.3 * (H / 540);
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.5 + s * 1.7));
        ctx.fillStyle = s % 4 === 0 ? `rgba(253, 224, 71, ${twinkle})` : `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. City skyline silhouette along bottom
      ctx.save();
      const cityH = H * 0.38;
      const baseY = H - cityH;
      const poly = [
        [0, 0.32], [0.08, 0.17], [0.16, 0.37], [0.23, 0.05], [0.32, 0.25],
        [0.41, 0.12], [0.49, 0.35], [0.60, 0.04], [0.70, 0.30], [0.79, 0.10],
        [0.89, 0.32], [1.0, 0.13], [1.0, 1.0], [0, 1.0]
      ];
      ctx.beginPath();
      ctx.moveTo(poly[0][0] * W, baseY + poly[0][1] * cityH);
      for (let p = 1; p < poly.length; p++) {
        ctx.lineTo(poly[p][0] * W, baseY + poly[p][1] * cityH);
      }
      ctx.closePath();
      ctx.fillStyle = '#090d16';
      ctx.fill();

      // Building vertical windows/stripes
      ctx.clip();
      const stripeW = 28 * (W / 960);
      for (let bx = 0; bx < W; bx += stripeW * 1.5) {
        ctx.fillStyle = (Math.floor(bx / stripeW) % 2 === 0) ? '#131d2e' : '#0a101d';
        ctx.fillRect(bx, baseY, stripeW, cityH);
      }
      ctx.restore();
      return true;
    } else if (preset === 'space') {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) / 1.3);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const neb1 = ctx.createRadialGradient(W * 0.7, H * 0.25, 5, W * 0.7, H * 0.25, W * 0.25);
      neb1.addColorStop(0, 'rgba(255, 209, 102, 0.4)');
      neb1.addColorStop(0.5, 'rgba(255, 140, 0, 0.15)');
      neb1.addColorStop(1, 'transparent');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);

      const neb2 = ctx.createRadialGradient(W * 0.2, H * 0.8, 5, W * 0.2, H * 0.8, W * 0.3);
      neb2.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
      neb2.addColorStop(0.6, 'rgba(49, 46, 129, 0.15)');
      neb2.addColorStop(1, 'transparent');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);

      for (let s = 0; s < 80; s++) {
        const sx = ((s * 153.2 + t * 4) % W);
        const sy = ((s * 87.1 + t * 2) % H);
        const sz = (s % 4 === 0) ? 2 * (H / 540) : 1.2 * (H / 540);
        ctx.fillStyle = s % 3 === 0 ? '#93c5fd' : '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    } else if (preset === 'aurora') {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      const aShift = Math.sin(t * 0.8) * 0.08 * W;
      const g1 = ctx.createRadialGradient(W * 0.25 + aShift, H * 0.7, 10, W * 0.25 + aShift, H * 0.7, W * 0.45);
      g1.addColorStop(0, 'rgba(16, 185, 129, 0.65)');
      g1.addColorStop(0.6, 'rgba(16, 185, 129, 0.1)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W * 0.7 - aShift, H * 0.35, 10, W * 0.7 - aShift, H * 0.35, W * 0.45);
      g2.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
      g2.addColorStop(0.6, 'rgba(56, 189, 248, 0.1)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      return true;
    } else if (preset === 'sky') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.45, '#38bdf8');
      grad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      return true;
    } else if (preset === 'sunset' || preset === 'cloudSunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#4c0519');
      grad.addColorStop(0.35, '#be123c');
      grad.addColorStop(0.65, '#f97316');
      grad.addColorStop(0.9, '#fde047');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      return true;
    } else if (preset === 'water') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(0.45, '#0284c7');
      grad.addColorStop(1, '#075985');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      return true;
    }
    return false;
  }

  function drawCanvasRoundRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  }

  // ── Record Slides Loop with 30 FPS Animation & Audio Track ────────────────
  async function recordSlidesToVideo(allSlides, fallbackDur, W, H, onProgress) {
    const FPS = 30;
    const MIME = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    onProgress(2, 'উপাদান ও ইমেজ প্রিলোড হচ্ছে...');

    // 1. Preload all slide images and shape SVGs
    for (const slide of allSlides) {
      if (slide.bgMedia || slide.bgImage) {
        await preloadImage(slide.bgMedia || slide.bgImage);
      }
      for (const el of (slide.elements || [])) {
        if (el.type === 'image' && el.src) {
          await preloadImage(el.src);
        } else if (el.type === 'shape') {
          await preloadShapeSvg(el);
        }
      }
    }

    // 2. Audio stream & soundtrack setup
    let soundtrackAudio = null;
    let audioContext = null;
    let audioTrack = null;

    try {
      if (typeof window.getPresentationSoundtrack === 'function') {
        const snd = await window.getPresentationSoundtrack();
        if (snd && snd.src) {
          soundtrackAudio = new Audio(snd.src);
          soundtrackAudio.crossOrigin = 'anonymous';
          soundtrackAudio.volume = (snd.volume !== undefined ? snd.volume : 60) / 100;
          soundtrackAudio.loop = snd.loop !== false;

          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const sourceNode = audioContext.createMediaElementSource(soundtrackAudio);
          const destNode = audioContext.createMediaStreamDestination();
          sourceNode.connect(destNode);
          sourceNode.connect(audioContext.destination);

          const aTracks = destNode.stream.getAudioTracks();
          if (aTracks.length > 0) {
            audioTrack = aTracks[0];
          }
        }
      }
    } catch (aErr) {
      console.warn('Audio soundtrack attach skipped:', aErr);
    }

    // 3. Create Canvas and MediaStream
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const canvasStream = canvas.captureStream(FPS);
    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...(audioTrack ? [audioTrack] : [])
    ];
    const combinedStream = new MediaStream(combinedTracks);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: MIME,
      videoBitsPerSecond: W > 1280 ? 9_000_000 : 5_000_000
    });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    recorder.start(100);

    if (soundtrackAudio) {
      soundtrackAudio.currentTime = 0;
      soundtrackAudio.play().catch(() => {});
    }

    const total = allSlides.length;
    const frameIntervalMs = 1000 / FPS;

    // 4. Render Slides Frame-by-Frame
    for (let i = 0; i < total; i++) {
      const slide = allSlides[i];
      const dur = Math.max(1, Number(slide.autoDuration) || fallbackDur);
      const frameCount = Math.round(dur * FPS);
      const elements = slide.elements || [];

      for (let f = 0; f < frameCount; f++) {
        const t = f / FPS;

        // Draw slide background (B-Roll animation or theme/gradient)
        const drewBroll = slide.brollPreset && slide.brollPreset !== 'none'
          ? drawBrollBackground(ctx, slide.brollPreset, t, W, H)
          : false;
        if (!drewBroll) {
          fillBackground(ctx, slide, W, H);
        }

        if (slide.bgMedia || slide.bgImage) {
          const img = await preloadImage(slide.bgMedia || slide.bgImage);
          if (img) {
            const opacity = Math.max(0, Math.min(100, slide.bgMediaOpacity ?? 100)) / 100;
            ctx.globalAlpha = opacity;
            ctx.drawImage(img, 0, 0, W, H);
            ctx.globalAlpha = 1;
          }
        }

        if (slide.bgOverlayOpacity) {
          ctx.globalAlpha = Math.max(0, Math.min(100, slide.bgOverlayOpacity)) / 100;
          ctx.fillStyle = slide.bgOverlayColor || '#000000';
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }

        // Render each element with animation calculation
        for (const el of elements) {
          let progress = 1;
          if (el.animation && el.animation !== 'none') {
            const delay = Number(el.animationDelay) || 0;
            const animDur = Math.max(0.1, Number(el.animationDuration) || 0.6);
            if (t < delay) {
              progress = 0;
            } else if (t < delay + animDur) {
              progress = (t - delay) / animDur;
            } else {
              progress = 1;
            }
          }
          if (progress > 0) {
            await renderElement(ctx, el, W, H, progress);
          }
        }

        // Update progress UI every 10 frames
        if (f % 10 === 0 || f === frameCount - 1) {
          const overallPct = Math.min(95, Math.round(((i + f / frameCount) / total) * 95));
          onProgress(overallPct, `স্লাইড ${i + 1}/${total} অ্যানিমেশন রেন্ডারিং হচ্ছে (${Math.round((f / frameCount) * 100)}%)...`);
        }

        await wait(frameIntervalMs);
      }
    }

    // 5. Clean up Audio
    if (soundtrackAudio) {
      try {
        soundtrackAudio.pause();
        soundtrackAudio.currentTime = 0;
      } catch (_) {}
    }
    if (audioContext && audioContext.state !== 'closed') {
      try { audioContext.close(); } catch (_) {}
    }

    onProgress(98, 'ভিডিও ফাইল ফাইনাল করা হচ্ছে...');
    recorder.stop();

    await new Promise(resolve => { recorder.onstop = resolve; });

    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation-video-' + Date.now() + '.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 4000);

    onProgress(100, 'ডাউনলোড সম্পন্ন!');
  }

  // ── Slide → Canvas Renderer ───────────────────────────────────────────────
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  const THEME_COLORS = {
    fashion: 'linear-gradient(135deg,#1a0533,#0a1628)',
    luxury:  'linear-gradient(135deg,#1a1200,#2d1f00)',
    ocean:   'linear-gradient(135deg,#001233,#023e8a)',
    clean:   '#ffffff',
    dark:    '#0f172a',
    custom:  null
  };

  function fillBackground(ctx, slide, W, H) {
    let bg = slide.background === 'custom'
      ? (slide.bgColor || '#0f172a')
      : (THEME_COLORS[slide.background] || slide.bgColor || '#0f172a');
    if (!bg) bg = '#0f172a';

    if (bg.includes('radial-gradient')) {
      const stops = [...bg.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g)].map(m => m[0]);
      const rad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) / 1.35);
      if (stops.length >= 2) {
        stops.forEach((c, idx) => rad.addColorStop(idx / (stops.length - 1), c));
        ctx.fillStyle = rad;
      } else {
        ctx.fillStyle = stops[0] || '#17233c';
      }
      ctx.fillRect(0, 0, W, H);
    } else if (bg.includes('linear-gradient')) {
      const stops = [...bg.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g)].map(m => m[0]);
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (stops.length >= 2) {
        stops.forEach((c, idx) => grad.addColorStop(idx / (stops.length - 1), c));
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = stops[0] || '#17233c';
      }
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  async function renderSlideToCanvas(ctx, slide, W, H, t = 0) {
    const drewBroll = slide.brollPreset && slide.brollPreset !== 'none'
      ? drawBrollBackground(ctx, slide.brollPreset, t, W, H)
      : false;
    if (!drewBroll) {
      fillBackground(ctx, slide, W, H);
    }

    if (slide.bgMedia || slide.bgImage) {
      const src = slide.bgMedia || slide.bgImage;
      if (!src.startsWith('data:video') && !src.includes('.mp4') && !src.includes('.webm')) {
        const img = await preloadImage(src);
        if (img) {
          const opacity = Math.max(0, Math.min(100, slide.bgMediaOpacity ?? 100)) / 100;
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0, W, H);
          ctx.globalAlpha = 1;
        }
      }
    }

    if (slide.bgOverlayOpacity) {
      ctx.globalAlpha = Math.max(0, Math.min(100, slide.bgOverlayOpacity)) / 100;
      ctx.fillStyle = slide.bgOverlayColor || '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    const elements = slide.elements || [];
    for (const el of elements) {
      await renderElement(ctx, el, W, H, 1);
    }
  }

  async function renderElement(ctx, el, W, H, animProgress = 1) {
    if (animProgress <= 0) return;

    const x = (el.x / 100) * W;
    const y = (el.y / 100) * H;
    const w = (el.w / 100) * W;
    const h = (el.h / 100) * H;

    ctx.save();

    // Base opacity
    let alpha = (el.opacity !== undefined ? Math.max(0, Math.min(100, Number(el.opacity))) / 100 : 1);

    // Easing curve: ease-out cubic
    const eased = animProgress < 1 ? (1 - Math.pow(1 - animProgress, 3)) : 1;
    alpha *= eased;

    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);

    // Rotation
    const rot = ((Number(el.rotation) || 0) * Math.PI) / 180;
    if (rot !== 0) ctx.rotate(rot);

    // Entrance animation transforms
    if (animProgress < 1 && el.animation && el.animation !== 'none') {
      const anim = el.animation;
      const resScale = H / 540;
      if (anim === 'slideDown') {
        ctx.translate(0, -60 * resScale * (1 - eased));
      } else if (anim === 'slideUp') {
        ctx.translate(0, 60 * resScale * (1 - eased));
      } else if (anim === 'slideLeft') {
        ctx.translate(-80 * resScale * (1 - eased), 0);
      } else if (anim === 'slideRight') {
        ctx.translate(80 * resScale * (1 - eased), 0);
      } else if (anim === 'zoom') {
        const sc = 0.2 + 0.8 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'pop') {
        const sc = animProgress < 0.7
          ? 0.2 + 1.25 * (animProgress / 0.7)
          : 1.45 - 0.45 * ((animProgress - 0.7) / 0.3);
        ctx.scale(sc, sc);
      } else if (anim === 'bounce' || anim === 'bounceDrop' || anim === 'elasticDrop') {
        const sc = 0.4 + 0.6 * eased;
        ctx.scale(sc, sc);
      }
    }

    ctx.translate(-cx, -cy);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // ── Draw Shapes (Cards, Badges, Boxes, Lines, SVGs) ──────────────────────
    if (el.type === 'shape') {
      const shape = el.shape || 'rect';
      const fillVal = el.fill || el.fillColor || el.bgColor || el.boxBg || el.color || '#4f8df7';
      const strokeVal = el.stroke || el.borderColor || el.lineColor || 'transparent';
      const lineVal = (el.line !== undefined ? Number(el.line) : (el.borderWidth !== undefined ? Number(el.borderWidth) : 2));
      const lineWidth = lineVal * (H / 540);

      if (shape === 'round' || shape === 'rect' || shape === 'pill') {
        const rad = shape === 'round' ? Math.min(18 * (H / 540), w * 0.14, h * 0.28)
                  : shape === 'pill' ? Math.min(w, h) / 2
                  : 0;

        if (fillVal && fillVal !== 'transparent' && fillVal !== 'none') {
          ctx.fillStyle = fillVal;
          drawCanvasRoundRect(ctx, x, y, w, h, rad);
          ctx.fill();
        }
        if (strokeVal && strokeVal !== 'transparent' && strokeVal !== 'none' && lineWidth > 0) {
          ctx.strokeStyle = strokeVal;
          ctx.lineWidth = lineWidth;
          drawCanvasRoundRect(ctx, x, y, w, h, rad);
          ctx.stroke();
        }
      } else if (shape === 'circle') {
        const rx = w / 2;
        const ry = h / 2;
        ctx.beginPath();
        ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2);
        if (fillVal && fillVal !== 'transparent' && fillVal !== 'none') {
          ctx.fillStyle = fillVal;
          ctx.fill();
        }
        if (strokeVal && strokeVal !== 'transparent' && strokeVal !== 'none' && lineWidth > 0) {
          ctx.strokeStyle = strokeVal;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      } else {
        const svgImg = await preloadShapeSvg(el);
        if (svgImg) {
          ctx.drawImage(svgImg, x, y, w, h);
        }
      }

      // Draw Shape Text
      if (el.text) {
        const fontSize = Math.round((Number(el.textSize || el.size) || 18) * (H / 540));
        const fontWeight = el.textWeight || el.weight || '700';
        const fontFamily = el.fontFamily || 'Arial, "Noto Sans Bengali", sans-serif';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = el.textColor || el.color || '#ffffff';
        ctx.textAlign = el.textAlign === 'left' ? 'left' : el.textAlign === 'right' ? 'right' : 'center';
        ctx.textBaseline = 'middle';

        const lines = String(el.text).split('\n');
        const lineH = fontSize * 1.3;
        const totalTextH = lines.length * lineH;
        let startY = y + (h - totalTextH) / 2 + lineH / 2;
        const textX = el.textAlign === 'left' ? x + 14 : el.textAlign === 'right' ? x + w - 14 : x + w / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, textX, startY + i * lineH, Math.max(10, w - 16));
        });
      }
    } else if (el.type === 'text') {
      const boxBg = el.boxBg || el.backgroundColor || el.bgColor;
      if (boxBg && boxBg !== 'transparent') {
        const boxOpacity = el.boxOpacity !== undefined
          ? (Number(el.boxOpacity) > 1 ? Number(el.boxOpacity) / 100 : Number(el.boxOpacity))
          : 1;
        ctx.save();
        ctx.globalAlpha *= boxOpacity;
        ctx.fillStyle = boxBg;
        drawCanvasRoundRect(ctx, x, y, w, h, 6 * (H / 540));
        ctx.fill();
        ctx.restore();
      }

      if (el.text) {
        const fontSize = Math.round((Number(el.size) || 18) * (H / 540));
        const fontWeight = el.weight || el.textWeight || '700';
        const fontFamily = el.fontFamily || 'Arial, "Noto Sans Bengali", sans-serif';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = el.color || el.textColor || '#ffffff';
        ctx.textAlign = el.textAlign === 'left' ? 'left' : el.textAlign === 'right' ? 'right' : 'center';
        ctx.textBaseline = 'middle';

        const lines = String(el.text).split('\n');
        const lineH = fontSize * 1.25;
        const totalTextH = lines.length * lineH;
        let startY = y + (h - totalTextH) / 2 + lineH / 2;
        const textX = el.textAlign === 'left' ? x + 8 : el.textAlign === 'right' ? x + w - 8 : x + w / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, textX, startY + i * lineH, Math.max(10, w - 8));
        });
      }
    } else if (el.type === 'image' && el.src) {
      const img = await preloadImage(el.src);
      if (img) ctx.drawImage(img, x, y, w, h);
    }

    ctx.restore();
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(ensureVideoExportBtn, 400));
  } else {
    setTimeout(ensureVideoExportBtn, 400);
  }

  window.startSlideVideoExport = openModal;
  window.openSlideVideoExportModal = openModal;
})();
