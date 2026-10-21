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
        <label>⏱️ প্রতিটি উপাদানের অ্যানিমেশন বিরতি (Delay between elements):</label>
        <input id="veElementDelay" type="number" min="0.5" max="10" step="0.5" value="2">
        <small>💡 একটি উপাদানের পর পরবর্তী উপাদান কত সেকেন্ড পর পর আসবে (ডিফল্ট: ২ সেকেন্ড)।</small>
      </div>

      <div class="ve-field">
        <label>⏳ সমস্ত উপাদান আসার পর স্লাইড দেখার সময় (Hold Duration):</label>
        <input id="veSlideDur" type="number" min="1" max="60" step="0.5" value="2">
        <small>💡 সব উপাদান স্ক্রিনে আসার পর পরবর্তী স্লাইডে যাওয়ার আগে স্লাইডটি কত সেকেন্ড থাকবে।</small>
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

    const elementDelay = Math.max(0.4, parseFloat($('veElementDelay')?.value) || 2);
    const fallbackDur = Math.max(1, parseFloat($('veSlideDur')?.value) || 2);
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
      await recordSlidesToVideo(slides, fallbackDur, elementDelay, W, H, (pct, msg) => {
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

  const videoCache = new Map();
  async function preloadVideo(src) {
    if (!src) return null;
    if (videoCache.has(src)) return videoCache.get(src);
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.playsInline = true;
      v.autoplay = false;
      v.preload = 'auto';
      v.src = src;
      v.onloadeddata = () => {
        videoCache.set(src, v);
        resolve(v);
      };
      v.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 5000);
    });
  }

  function isVideoMedia(slide, src) {
    if (slide && slide.bgMediaType === 'video') return true;
    if (!src) return false;
    if (src.startsWith('data:video')) return true;
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(src)) return true;
    if (slide && slide.bgMediaAssetId) return true;
    return false;
  }

  const svgImgCache = new Map();
  async function preloadShapeSvg(el) {
    const shape = el.shape || 'rect';
    const sf = el.fill || el.fillColor || el.bgColor || el.boxBg || el.color || '#4f8df7';
    const ss = el.stroke || el.borderColor || el.lineColor || 'transparent';
    const sl = (el.line !== undefined ? el.line : (el.borderWidth !== undefined ? el.borderWidth : 2)) + 'px';
    // Also key on gradient so gradient shapes render differently
    const gradKey = el.gradient ? `_g_${el.gradientTo || ''}_${el.gradientAngle ?? 135}` : '';
    const key = `${shape}_${sf}_${ss}_${sl}${gradKey}`;
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

    // If element has a gradient, inject a linearGradient def and use it as fill
    let resolvedFill = sf;
    if (el.gradient && el.gradientTo) {
      const angle = el.gradientAngle ?? 135;
      const rad = (angle * Math.PI) / 180;
      const x1 = Math.round(50 - Math.cos(rad) * 50);
      const y1 = Math.round(50 - Math.sin(rad) * 50);
      const x2 = Math.round(50 + Math.cos(rad) * 50);
      const y2 = Math.round(50 + Math.sin(rad) * 50);
      const gradId = 'g' + Math.abs(key.length * 31 + (sf.length + ss.length) * 7);
      const gradDef = `<defs><linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${sf}"/><stop offset="100%" stop-color="${el.gradientTo}"/></linearGradient></defs>`;
      // Insert defs after opening <svg...> tag
      svg = svg.replace(/(<svg[^>]*>)/, `$1${gradDef}`);
      resolvedFill = `url(#${gradId})`;
    }

    svg = svg.replace(/var\(--sf,\s*[^)]+\)/g, resolvedFill)
             .replace(/var\(--ss,\s*[^)]+\)/g, ss)
             .replace(/var\(--sl,\s*[^)]+\)/g, sl);

    const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = await loadImage(uri);
    if (img) svgImgCache.set(key, img);
    return img;
  }

  // ── Animated B-Roll Canvas Renderer (30 FPS Dynamic Motion) ──────────────
  function drawBrollBackground(ctx, preset, t, W, H) {
    if (!preset || preset === 'none') return false;

    if (preset === 'space') {
      // 1. Deep cosmic gradient
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.max(W, H) / 1.2);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 2. Cosmic Nebulae (pulsing and drifting with time)
      const n1x = W * 0.72 + Math.sin(t * 0.4) * (W * 0.03);
      const n1y = H * 0.24 + Math.cos(t * 0.35) * (H * 0.03);
      const n1r = W * 0.3 * (1 + 0.12 * Math.sin(t * 0.8));
      const neb1 = ctx.createRadialGradient(n1x, n1y, 4, n1x, n1y, n1r);
      neb1.addColorStop(0, 'rgba(255, 209, 102, 0.45)');
      neb1.addColorStop(0.35, 'rgba(255, 140, 0, 0.22)');
      neb1.addColorStop(1, 'transparent');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);

      const n2x = W * 0.20 + Math.cos(t * 0.3) * (W * 0.04);
      const n2y = H * 0.80 + Math.sin(t * 0.4) * (H * 0.04);
      const n2r = W * 0.36 * (1 + 0.1 * Math.cos(t * 0.6));
      const neb2 = ctx.createRadialGradient(n2x, n2y, 4, n2x, n2y, n2r);
      neb2.addColorStop(0, 'rgba(99, 102, 241, 0.55)');
      neb2.addColorStop(0.4, 'rgba(139, 92, 246, 0.25)');
      neb2.addColorStop(1, 'transparent');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);

      // Center violet pulsing ring
      const centerPulse = 0.9 + 0.15 * Math.sin(t * 0.5);
      const nebCenter = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.1 * centerPulse, W * 0.5, H * 0.5, W * 0.4 * centerPulse);
      nebCenter.addColorStop(0, 'transparent');
      nebCenter.addColorStop(0.5, 'rgba(139, 92, 246, 0.20)');
      nebCenter.addColorStop(1, 'transparent');
      ctx.fillStyle = nebCenter;
      ctx.fillRect(0, 0, W, H);

      // 3. Rotating Starfield: 360° spin over 25 seconds with twinkle & drift
      ctx.save();
      ctx.translate(W / 2, H / 2);
      const rotAngle = (t / 25) * Math.PI * 2;
      ctx.rotate(rotAngle);
      const driftX = Math.sin(t * 0.5) * 25;
      const driftY = Math.cos(t * 0.5) * 25;
      ctx.translate(driftX, driftY);

      const maxR = Math.hypot(W, H) / 2 + 100;
      for (let s = 0; s < 135; s++) {
        const seed = (s * 8191 + 104729) % 100000;
        const rad = Math.sqrt(((seed % 1000) / 1000)) * maxR;
        const theta = ((seed * 17) % 6283) / 1000;
        const sx = rad * Math.cos(theta);
        const sy = rad * Math.sin(theta);
        const sz = (s % 5 === 0) ? 2.6 * (H / 540) : (s % 2 === 0 ? 1.7 * (H / 540) : 1.1 * (H / 540));
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3.2 + s * 1.4));
        const col = (s % 3 === 0) ? `rgba(147, 197, 253, ${twinkle})`
                  : (s % 7 === 0) ? `rgba(253, 224, 71, ${twinkle})`
                  : `rgba(255, 255, 255, ${twinkle})`;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    } else if (preset === 'night') {
      // 1. Sky gradient
      const grad = ctx.createLinearGradient(0, 0, W * 0.8, H);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.6, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 2. Twinkling Stars with subtle drift
      const starCount = 85;
      for (let s = 0; s < starCount; s++) {
        const sx = ((s * 137.5 + s * s * 13 + t * 4) % W);
        const sy = ((s * 93.7 + s * 29) % (H * 0.62));
        const sz = (s % 3 === 0) ? 2.2 * (H / 540) : 1.3 * (H / 540);
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.8 + s * 1.7));
        ctx.fillStyle = s % 4 === 0 ? `rgba(253, 224, 71, ${twinkle})` : `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. City skyline silhouette with smooth continuous panning
      ctx.save();
      const panX = Math.sin((t / 12) * Math.PI * 2) * (W * 0.04);
      ctx.translate(panX, 0);

      const cityH = H * 0.38;
      const baseY = H - cityH;
      const poly = [
        [-0.05, 0.32], [0, 0.32], [0.08, 0.17], [0.16, 0.37], [0.23, 0.05], [0.32, 0.25],
        [0.41, 0.12], [0.49, 0.35], [0.60, 0.04], [0.70, 0.30], [0.79, 0.10],
        [0.89, 0.32], [1.0, 0.13], [1.05, 0.13], [1.05, 1.0], [-0.05, 1.0]
      ];
      ctx.beginPath();
      ctx.moveTo(poly[0][0] * W, baseY + poly[0][1] * cityH);
      for (let p = 1; p < poly.length; p++) {
        ctx.lineTo(poly[p][0] * W, baseY + poly[p][1] * cityH);
      }
      ctx.closePath();
      ctx.fillStyle = '#090d16';
      ctx.fill();

      // Building vertical windows/stripes with twinkling yellow windows
      ctx.clip();
      const stripeW = 28 * (W / 960);
      for (let bx = -stripeW * 2; bx < W + stripeW * 2; bx += stripeW * 1.5) {
        ctx.fillStyle = (Math.floor(bx / stripeW) % 2 === 0) ? '#131d2e' : '#0a101d';
        ctx.fillRect(bx, baseY, stripeW, cityH);
      }
      for (let wIdx = 0; wIdx < 35; wIdx++) {
        const wx = ((wIdx * 53) % W);
        const wy = baseY + cityH * 0.35 + ((wIdx * 37) % (cityH * 0.55));
        const wTwinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.0 + wIdx * 2.3));
        ctx.fillStyle = `rgba(253, 224, 71, ${wTwinkle})`;
        ctx.fillRect(wx, wy, 3 * (H / 540), 4 * (H / 540));
      }
      ctx.restore();
      return true;
    } else if (preset === 'aurora') {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);

      const aShift = Math.sin(t * 0.8) * 0.08 * W;
      const g1 = ctx.createRadialGradient(W * 0.25 + aShift, H * 0.7, 10, W * 0.25 + aShift, H * 0.7, W * 0.48 * (1 + 0.1 * Math.sin(t * 0.6)));
      g1.addColorStop(0, 'rgba(16, 185, 129, 0.7)');
      g1.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W * 0.70 - aShift, H * 0.35, 10, W * 0.70 - aShift, H * 0.35, W * 0.48 * (1 + 0.1 * Math.cos(t * 0.7)));
      g2.addColorStop(0, 'rgba(56, 189, 248, 0.65)');
      g2.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      const g3 = ctx.createRadialGradient(W * 0.90 + aShift * 0.5, H * 0.7, 10, W * 0.90 + aShift * 0.5, H * 0.7, W * 0.38);
      g3.addColorStop(0, 'rgba(168, 85, 247, 0.55)');
      g3.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);
      return true;
    } else if (preset === 'sky') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.45, '#38bdf8');
      grad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Drifting clouds
      const drawCloud = (cx, cy, r, alpha) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.7, cy - r * 0.2, r * 0.8, 0, Math.PI * 2);
        ctx.arc(cx + r * 1.4, cy, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      };
      const c1x = ((W * 0.15 + t * 24) % (W + 300)) - 150;
      drawCloud(c1x, H * 0.32, 45 * (H / 540), 0.6);
      const c2x = ((W * 0.65 + t * 38) % (W + 400)) - 200;
      drawCloud(c2x, H * 0.55, 60 * (H / 540), 0.5);

      // Flying airplane
      const pProg = (t / 12) % 1;
      const px = -60 + pProg * (W + 120);
      const py = H * 0.45 - pProg * (H * 0.25);
      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 * (H / 540), 4 * (H / 540), -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    } else if (preset === 'sunset' || preset === 'cloudSunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#7c1328');
      grad.addColorStop(0.35, '#be123c');
      grad.addColorStop(0.65, '#f97316');
      grad.addColorStop(0.9, '#fde047');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Sunset drifting cloud puffs
      const shift = Math.sin((t / 16) * Math.PI * 2) * (W * 0.08);
      ctx.fillStyle = 'rgba(255, 199, 108, 0.4)';
      ctx.beginPath();
      ctx.arc(W * 0.2 + shift, H * 0.72, 70 * (H / 540), 0, Math.PI * 2);
      ctx.arc(W * 0.55 - shift * 0.8, H * 0.76, 85 * (H / 540), 0, Math.PI * 2);
      ctx.arc(W * 0.85 + shift * 0.5, H * 0.65, 65 * (H / 540), 0, Math.PI * 2);
      ctx.fill();
      return true;
    } else if (preset === 'water') {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0369a1');
      grad.addColorStop(0.45, '#0284c7');
      grad.addColorStop(1, '#075985');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Water ripple
      const rip = 1 + 0.12 * Math.sin(t * 1.6);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.95, W * 0.45 * rip, H * 0.18 * rip, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shimmer sweep
      const shimX = ((t * 90) % (W * 1.6)) - W * 0.3;
      const shimGrad = ctx.createLinearGradient(shimX, 0, shimX + W * 0.35, H);
      shimGrad.addColorStop(0, 'transparent');
      shimGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.35)');
      shimGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shimGrad;
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

  function getBestMimeType(hasAudio) {
    const list = hasAudio
      ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
      : ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'];
    for (const m of list) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return 'video/webm';
  }

  // ── Element Staggered Animation Scheduler for Video ───────────────────────
  // Returns: { schedule: Map<el, {start, duration}>, effectiveDur: number }
  function buildSlideAnimationSchedule(elements, holdDur, elementStepDelay = 2.0) {
    const schedule = new Map();
    if (!elements || elements.length === 0) return { schedule, effectiveDur: Math.max(2, holdDur) };

    const stepDelay = Math.max(0.4, Number(elementStepDelay) || 2.0);

    // 1. Ensure all elements have entrance animations for video export
    // If elements were imported from templates or lack animation, auto-assign smart entrance animations!
    elements.forEach((el, idx) => {
      if (!el.animation || el.animation === 'none') {
        const isBgCard = (Number(el.w) >= 65 && Number(el.h) >= 65) || (Number(el.w) >= 80 && (Number(el.y) || 0) <= 15);
        if (isBgCard) {
          el.animation = 'zoom';
          el.animationDuration = 0.6;
        } else if ((Number(el.y) || 0) < 30 && el.type === 'text') {
          el.animation = 'slideDown';
          el.animationDuration = 0.6;
        } else if (el.type === 'shape') {
          el.animation = 'slideUp';
          el.animationDuration = 0.6;
        } else if (el.type === 'text' && (Number(el.size) <= 16 || (Number(el.y) || 0) > 65)) {
          el.animation = 'fade';
          el.animationDuration = 0.5;
        } else {
          el.animation = 'slideUp';
          el.animationDuration = 0.6;
        }
      }
    });

    // 2. Sort elements into sequential entrance order:
    // Large background container cards (w >= 70 && h >= 70) should enter first.
    // Other elements sort by explicit animationOrder (if set) or top-to-bottom Y, left-to-right X.
    const sorted = [...elements].sort((a, b) => {
      const aIsContainer = (Number(a.w) >= 70 && Number(a.h) >= 70);
      const bIsContainer = (Number(b.w) >= 70 && Number(b.h) >= 70);
      if (aIsContainer && !bIsContainer) return -1;
      if (!aIsContainer && bIsContainer) return 1;

      if (a.animationOrder !== undefined && b.animationOrder !== undefined) {
        return Number(a.animationOrder) - Number(b.animationOrder);
      }
      const dy = (Number(a.y) || 0) - (Number(b.y) || 0);
      return Math.abs(dy) > 3 ? dy : (Number(a.x) || 0) - (Number(b.x) || 0);
    });

    const N = sorted.length;
    const animDurPerEl = 0.6;

    // 3. Stagger each element by exactly stepDelay (e.g. 2.0s)
    // First element starts at t = 0.3s
    sorted.forEach((el, k) => {
      const start = 0.3 + k * stepDelay;
      const duration = Math.min(0.8, Math.max(0.4, Number(el.animationDuration) || animDurPerEl));
      schedule.set(el, { start, duration });
    });

    // 4. Effective slide duration:
    // Last element starts at 0.3 + (N - 1) * stepDelay, runs for duration,
    // and then the entire slide holds for holdDur (e.g. 2.0s) before advancing!
    const lastAnimEnd = 0.3 + (N - 1) * stepDelay + animDurPerEl;
    const effectiveDur = lastAnimEnd + Math.max(1.5, holdDur);

    return { schedule, effectiveDur };
  }

  // ── Record Slides Loop with 30 FPS Animation & Audio Track ────────────────
  async function recordSlidesToVideo(allSlides, fallbackDur, elementDelay, W, H, onProgress) {
    const FPS = 30;

    onProgress(2, 'উপাদান ও ইমেজ প্রিলোড হচ্ছে...');

    // 1. Preload all slide images, shape SVGs, and video backgrounds
    for (const slide of allSlides) {
      if (!slide.bgMedia && slide.bgMediaAssetId && window.PresentationBackgroundMediaStore) {
        try {
          slide.bgMedia = await window.PresentationBackgroundMediaStore.resolveVideo(slide);
        } catch (_) {}
      }

      if (slide.bgMedia || slide.bgImage) {
        const bgSrc = slide.bgMedia || slide.bgImage;
        if (isVideoMedia(slide, bgSrc)) {
          await preloadVideo(bgSrc);
        } else {
          await preloadImage(bgSrc);
        }
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
          soundtrackAudio = new Audio();
          soundtrackAudio.crossOrigin = 'anonymous';
          soundtrackAudio.src = snd.src;
          soundtrackAudio.volume = (snd.volume !== undefined ? snd.volume : 60) / 100;
          soundtrackAudio.loop = snd.loop !== false;

          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
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
      audioTrack = null;
      if (audioContext) {
        try { audioContext.close(); } catch (_) {}
        audioContext = null;
      }
    }

    // 3. Create Canvas in DOM and initialize MediaStream
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;opacity:0;z-index:-1;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Pre-paint initial frame so stream compositor is active immediately
    if (allSlides.length > 0) {
      await renderSlideToCanvas(ctx, allSlides[0], W, H, 0);
    }

    const canvasStream = canvas.captureStream(FPS);
    const videoTrack = canvasStream.getVideoTracks()[0];

    const combinedTracks = [
      videoTrack,
      ...(audioTrack ? [audioTrack] : [])
    ].filter(Boolean);
    const combinedStream = new MediaStream(combinedTracks);

    const MIME = getBestMimeType(Boolean(audioTrack));
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: MIME,
      videoBitsPerSecond: W > 1280 ? 8_000_000 : 4_500_000
    });
    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = e => {
      console.error('MediaRecorder error event:', e);
    };

    recorder.start(100);

    if (soundtrackAudio) {
      soundtrackAudio.currentTime = 0;
      soundtrackAudio.play().catch(() => {});
    }

    const total = allSlides.length;
    const frameIntervalMs = 1000 / FPS;

    try {
      // 4. Render Slides Frame-by-Frame
      for (let i = 0; i < total; i++) {
        const slide = allSlides[i];
        const dur = Math.max(1, Number(slide.autoDuration) || fallbackDur);
        const elements = slide.elements || [];

        // Build sequential staggered animation schedule for this slide's elements
        // effectiveDur may be LONGER than dur if needed to fit all animations
        const { schedule: animSchedule, effectiveDur } = buildSlideAnimationSchedule(elements, dur, elementDelay);
        const frameCount = Math.round(effectiveDur * FPS);

        for (let f = 0; f < frameCount; f++) {
          const frameStart = performance.now();
          const t = f / FPS;

          // Draw slide background (B-Roll animation or theme/gradient)
          const drewBroll = slide.brollPreset && slide.brollPreset !== 'none'
            ? drawBrollBackground(ctx, slide.brollPreset, t, W, H)
            : false;
          if (!drewBroll) {
            fillBackground(ctx, slide, W, H);
          }

          if (slide.bgMedia || slide.bgImage) {
            const bgSrc = slide.bgMedia || slide.bgImage;
            const opacity = Math.max(0, Math.min(100, slide.bgMediaOpacity ?? 100)) / 100;
            ctx.globalAlpha = opacity;

            if (isVideoMedia(slide, bgSrc)) {
              const vid = videoCache.get(bgSrc);
              if (vid && vid.readyState >= 2) {
                const pbRate = Number(slide.bgPlaybackRate) || 1;
                const vDur = vid.duration || 1;
                vid.currentTime = (t * pbRate) % vDur;
                ctx.drawImage(vid, 0, 0, W, H);
              }
            } else {
              const img = await preloadImage(bgSrc);
              if (img) {
                ctx.drawImage(img, 0, 0, W, H);
              }
            }
            ctx.globalAlpha = 1;
          }

          if (slide.bgOverlayOpacity) {
            ctx.globalAlpha = Math.max(0, Math.min(100, slide.bgOverlayOpacity)) / 100;
            ctx.fillStyle = slide.bgOverlayColor || '#000000';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
          }

          // Render each element according to its staggered sequential schedule
          for (const el of elements) {
            const sched = animSchedule.get(el) || { start: 0, duration: 0 };
            let progress = 1;
            if (sched.duration > 0) {
              if (t < sched.start) {
                progress = 0; // Not visible yet!
              } else if (t < sched.start + sched.duration) {
                progress = (t - sched.start) / sched.duration; // actively entering!
              } else {
                progress = 1; // fully entered!
              }
            }
            if (progress > 0) {
              await renderElement(ctx, el, W, H, progress);
            }
          }

          // Explicitly push frame to video track
          if (videoTrack && typeof videoTrack.requestFrame === 'function') {
            try { videoTrack.requestFrame(); } catch (_) {}
          }

          // Update progress UI every 10 frames
          if (f % 10 === 0 || f === frameCount - 1) {
            const overallPct = Math.min(95, Math.round(((i + f / frameCount) / total) * 95));
            onProgress(overallPct, `স্লাইড ${i + 1}/${total} অ্যানিমেশন রেন্ডারিং হচ্ছে (${Math.round((f / frameCount) * 100)}%)...`);
          }

          // Use precise timing: wait ONLY the remaining time for this frame interval
          // to prevent jitter from setTimeout drift accumulating over many frames.
          const frameDeadline = frameStart + frameIntervalMs;
          const now = performance.now();
          const sleepMs = Math.max(0, frameDeadline - now);
          if (sleepMs > 1) await wait(sleepMs);
        }
      }
    } finally {
      // Clean up Audio
      if (soundtrackAudio) {
        try {
          soundtrackAudio.pause();
          soundtrackAudio.currentTime = 0;
        } catch (_) {}
      }
      if (audioContext && audioContext.state !== 'closed') {
        try { audioContext.close(); } catch (_) {}
      }
    }

    onProgress(97, 'ভিডিও ফাইল ফাইনাল করা হচ্ছে...');

    if (recorder.state === 'recording') {
      try { recorder.requestData(); } catch (_) {}
    }
    recorder.stop();

    await new Promise(resolve => { recorder.onstop = resolve; });

    // Remove offscreen canvas from DOM
    canvas.remove();

    const totalSize = chunks.reduce((acc, c) => acc + c.size, 0);
    if (totalSize === 0) {
      throw new Error('রেকর্ডারে কোনো ভিডিও ফ্রেম পাওয়া যায়নি (0 KB)। অনুগ্রহ করে আরেকবার চেষ্টা করুন।');
    }

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

    const sizeDisplay = totalSize > 1024 * 1024
      ? (totalSize / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.round(totalSize / 1024) + ' KB';

    onProgress(100, `ডাউনলোড সম্পন্ন! (${sizeDisplay})`);
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

  // ── Smart Multi-Line Canvas Text Word-Wrapper ─────────────────────────────
  function wrapCanvasText(ctx, text, maxW) {
    if (!text) return [];
    const paragraphs = String(text).split('\n');
    const lines = [];
    for (const para of paragraphs) {
      if (!para) {
        lines.push('');
        continue;
      }
      const words = para.split(/\s+/);
      let cur = '';
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const test = cur ? (cur + ' ' + word) : word;
        if (ctx.measureText(test).width > maxW && cur) {
          lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
    }
    return lines;
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
      if (!isVideoMedia(slide, src)) {
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

      if (anim === 'slideDown' || anim === 'backInDown') {
        ctx.translate(0, -70 * resScale * (1 - eased));
      } else if (anim === 'slideUp' || anim === 'backInUp') {
        ctx.translate(0, 70 * resScale * (1 - eased));
      } else if (anim === 'slideLeft' || anim === 'lightSpeed') {
        ctx.translate(-90 * resScale * (1 - eased), 0);
      } else if (anim === 'slideRight') {
        ctx.translate(90 * resScale * (1 - eased), 0);
      } else if (anim === 'slideSkewLeft') {
        ctx.translate(-80 * resScale * (1 - eased), 0);
        ctx.rotate(-0.08 * (1 - eased));
      } else if (anim === 'slideSkewRight') {
        ctx.translate(80 * resScale * (1 - eased), 0);
        ctx.rotate(0.08 * (1 - eased));
      } else if (anim === 'cinematicDrop') {
        const dropDist = 120 * resScale * Math.pow(1 - eased, 2);
        ctx.translate(0, -dropDist);
        const sc = 1.15 - 0.15 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'lensZoom') {
        const sc = 2.0 - 1.0 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'zoom' || anim === 'glowExpand') {
        const sc = 0.25 + 0.75 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'zoomRotate') {
        const sc = 0.25 + 0.75 * eased;
        ctx.scale(sc, sc);
        ctx.rotate((1 - eased) * 0.4);
      } else if (anim === 'pop' || anim === 'rubberBandIn' || anim === 'tada') {
        const sc = animProgress < 0.7
          ? 0.2 + 1.25 * (animProgress / 0.7)
          : 1.45 - 0.45 * ((animProgress - 0.7) / 0.3);
        ctx.scale(sc, sc);
      } else if (anim === 'bounce' || anim === 'bounceDrop' || anim === 'elasticDrop') {
        const bounceOvershoot = Math.sin(animProgress * Math.PI * 1.5) * (1 - animProgress) * 20 * resScale;
        ctx.translate(0, -60 * resScale * (1 - eased) + bounceOvershoot);
        const sc = 0.5 + 0.5 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'flipX' || anim === 'rotate3dFlip') {
        const scX = Math.max(0.02, Math.abs(Math.cos((1 - eased) * Math.PI * 0.5)));
        ctx.scale(scX, 1);
      } else if (anim === 'flipY') {
        const scY = Math.max(0.02, Math.abs(Math.cos((1 - eased) * Math.PI * 0.5)));
        ctx.scale(1, scY);
      } else if (anim === 'rollIn' || anim === 'spiralIn') {
        ctx.translate(-100 * resScale * (1 - eased), 0);
        ctx.rotate((1 - eased) * -1.8);
        const sc = 0.3 + 0.7 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'stamp') {
        const sc = 2.4 - 1.4 * eased;
        ctx.scale(sc, sc);
      } else if (anim === 'swing' || anim === 'swingDown') {
        ctx.translate(0, -40 * resScale * (1 - eased));
        ctx.rotate(Math.sin((1 - animProgress) * Math.PI * 2) * 0.25 * (1 - animProgress));
      } else if (anim === 'waveIn') {
        ctx.translate(Math.sin((1 - eased) * Math.PI * 2) * 25 * resScale, -40 * resScale * (1 - eased));
      } else if (anim === 'wipeDown' || anim === 'curtainWipe') {
        ctx.scale(1, Math.max(0.02, eased));
      } else if (anim === 'wipeLeft') {
        ctx.translate(-40 * resScale * (1 - eased), 0);
        ctx.scale(Math.max(0.02, eased), 1);
      } else if (anim === 'wipeRight') {
        ctx.translate(40 * resScale * (1 - eased), 0);
        ctx.scale(Math.max(0.02, eased), 1);
      } else {
        // fade, appear, blurFadeIn
        const sc = 0.94 + 0.06 * eased;
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
      // Scale line width proportionally — editor renders at ~960x540 typical slide px
      const lineWidth = lineVal * (H / 540);

      // Build fill style: gradient or solid
      let fillStyle;
      if (el.gradient && el.gradientTo) {
        const angle = ((el.gradientAngle ?? 135) * Math.PI) / 180;
        const dx = Math.cos(angle) * w * 0.5;
        const dy = Math.sin(angle) * h * 0.5;
        const grd = ctx.createLinearGradient(x + w / 2 - dx, y + h / 2 - dy, x + w / 2 + dx, y + h / 2 + dy);
        grd.addColorStop(0, fillVal);
        grd.addColorStop(1, el.gradientTo);
        fillStyle = grd;
      } else {
        fillStyle = fillVal;
      }

      // Apply shadow before drawing shape
      if (el.shadow) {
        const sBlur = (el.shadowBlur ?? 14) * (H / 540);
        const sX = (el.shadowX ?? 5) * (H / 540);
        const sY = (el.shadowY ?? 7) * (H / 540);
        const sColor = el.shadowColor || '#000000';
        ctx.shadowColor = sColor + '88';
        ctx.shadowBlur = sBlur;
        ctx.shadowOffsetX = sX;
        ctx.shadowOffsetY = sY;
      }

      if (shape === 'round' || shape === 'rect' || shape === 'pill') {
        // Use much larger corner radius to match the editor's rounded card look
        const rad = shape === 'round'
          ? Math.min(w * 0.12, h * 0.12, 40 * (H / 540))
          : shape === 'pill'
          ? Math.min(w, h) / 2
          : 0;

        if (fillStyle && fillStyle !== 'transparent' && fillStyle !== 'none') {
          ctx.fillStyle = fillStyle;
          drawCanvasRoundRect(ctx, x, y, w, h, rad);
          ctx.fill();
        }

        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

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
        if (fillStyle && fillStyle !== 'transparent' && fillStyle !== 'none') {
          ctx.fillStyle = fillStyle;
          ctx.fill();
        }
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        if (strokeVal && strokeVal !== 'transparent' && strokeVal !== 'none' && lineWidth > 0) {
          ctx.strokeStyle = strokeVal;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      } else {
        // All other SVG shapes — resolve CSS vars in SVG and draw via Image
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        const svgImg = await preloadShapeSvg(el);
        if (svgImg) {
          ctx.drawImage(svgImg, x, y, w, h);
        }
      }

      // Reset shadow for subsequent draws
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

      // Draw Shape Text (with automatic word wrap, lineSpacing and padding support)
      if (el.text) {
        const fontSize = Math.round((Number(el.textSize || el.size) || 18) * (H / 540));
        const fontWeight = el.textWeight || el.weight || '700';
        const fontFamily = el.fontFamily || 'Arial, "Noto Sans Bengali", sans-serif';
        const fontStyle = el.fontStyle || 'normal';
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = el.textColor || el.color || '#ffffff';
        ctx.textAlign = el.textAlign === 'left' ? 'left' : el.textAlign === 'right' ? 'right' : 'center';
        ctx.textBaseline = 'middle';

        const pad = (el.padding ?? 8) * (H / 540);
        const maxW = Math.max(10, w - pad * 2);
        const lines = wrapCanvasText(ctx, el.text, maxW);
        const lineSpacing = Number(el.lineSpacing) || 1.25;
        const lineH = fontSize * lineSpacing;
        const totalTextH = lines.length * lineH;
        let startY = y + (h - totalTextH) / 2 + lineH / 2;
        const textX = el.textAlign === 'left' ? x + pad + 4
                    : el.textAlign === 'right' ? x + w - pad - 4
                    : x + w / 2;

        // Optional text decoration (underline)
        if (el.textDecoration === 'underline') {
          ctx.save();
          lines.forEach((line, i) => {
            const ty = startY + i * lineH;
            const metrics = ctx.measureText(line);
            const tw = metrics.width;
            let ulX = el.textAlign === 'left' ? x + pad + 4
                    : el.textAlign === 'right' ? x + w - pad - 4 - tw
                    : x + w / 2 - tw / 2;
            ctx.strokeStyle = el.textColor || el.color || '#ffffff';
            ctx.lineWidth = Math.max(1, fontSize * 0.06);
            ctx.beginPath();
            ctx.moveTo(ulX, ty + fontSize * 0.55);
            ctx.lineTo(ulX + tw, ty + fontSize * 0.55);
            ctx.stroke();
          });
          ctx.restore();
        }

        lines.forEach((line, i) => {
          ctx.fillText(line, textX, startY + i * lineH);
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
        const fontStyle = el.fontStyle || 'normal';
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = el.color || el.textColor || '#ffffff';
        ctx.textAlign = el.textAlign === 'left' ? 'left' : el.textAlign === 'right' ? 'right' : 'center';
        ctx.textBaseline = 'middle';

        const maxW = Math.max(10, w - 8);
        const lines = wrapCanvasText(ctx, el.text, maxW);
        const lineSpacing = Number(el.lineSpacing) || 1.25;
        const lineH = fontSize * lineSpacing;
        const totalTextH = lines.length * lineH;
        let startY = y + (h - totalTextH) / 2 + lineH / 2;
        const textX = el.textAlign === 'left' ? x + 4 : el.textAlign === 'right' ? x + w - 4 : x + w / 2;

        if (el.textDecoration === 'underline') {
          ctx.save();
          lines.forEach((line, i) => {
            const ty = startY + i * lineH;
            const metrics = ctx.measureText(line);
            const tw = metrics.width;
            let ulX = el.textAlign === 'left' ? x + 4
                    : el.textAlign === 'right' ? x + w - 4 - tw
                    : x + w / 2 - tw / 2;
            ctx.strokeStyle = el.color || el.textColor || '#ffffff';
            ctx.lineWidth = Math.max(1, fontSize * 0.06);
            ctx.beginPath();
            ctx.moveTo(ulX, ty + fontSize * 0.55);
            ctx.lineTo(ulX + tw, ty + fontSize * 0.55);
            ctx.stroke();
          });
          ctx.restore();
        }

        lines.forEach((line, i) => {
          ctx.fillText(line, textX, startY + i * lineH);
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
