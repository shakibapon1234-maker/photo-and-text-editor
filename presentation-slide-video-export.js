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

  async function recordSlidesToVideo(allSlides, fallbackDur, W, H, onProgress) {
    const FPS = 30;
    const MIME = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME,
      videoBitsPerSecond: W > 1280 ? 9_000_000 : 5_000_000
    });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    recorder.start(100);

    const total = allSlides.length;

    for (let i = 0; i < total; i++) {
      const slide = allSlides[i];
      const dur = Math.max(1, Number(slide.autoDuration) || fallbackDur);
      const startPct = Math.round((i / total) * 100);

      onProgress(startPct, `স্লাইড ${i + 1}/${total} রেন্ডারিং হচ্ছে...`);

      await renderSlideToCanvas(ctx, slide, W, H);
      await wait(dur * 1000);
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
    if (slide.background === 'custom') {
      ctx.fillStyle = slide.bgColor || '#17233c';
      ctx.fillRect(0, 0, W, H);
    } else {
      const gradStr = THEME_COLORS[slide.background];
      if (gradStr && gradStr.startsWith('linear-gradient')) {
        const stops = [...gradStr.matchAll(/#[0-9a-fA-F]{3,8}/g)].map(m => m[0]);
        const grad = ctx.createLinearGradient(0, 0, W, H);
        if (stops.length >= 2) {
          grad.addColorStop(0, stops[0]);
          grad.addColorStop(1, stops[1]);
        } else {
          grad.addColorStop(0, '#17233c');
          grad.addColorStop(1, '#090d17');
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = gradStr || '#17233c';
      }
      ctx.fillRect(0, 0, W, H);
    }
  }

  async function renderSlideToCanvas(ctx, slide, W, H) {
    fillBackground(ctx, slide, W, H);

    if (slide.bgMedia || slide.bgImage) {
      const src = slide.bgMedia || slide.bgImage;
      if (!src.startsWith('data:video') && !src.includes('.mp4') && !src.includes('.webm')) {
        const img = await loadImage(src);
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
      await renderElement(ctx, el, W, H);
    }
  }

  async function renderElement(ctx, el, W, H) {
    const x = (el.x / 100) * W;
    const y = (el.y / 100) * H;
    const w = (el.w / 100) * W;
    const h = (el.h / 100) * H;

    ctx.save();

    const rot = ((Number(el.rotation) || 0) * Math.PI) / 180;
    if (rot !== 0) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rot);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    if (el.opacity !== undefined) {
      ctx.globalAlpha = Math.max(0, Math.min(100, Number(el.opacity))) / 100;
    }

    if (el.type === 'image' && el.src) {
      const img = await loadImage(el.src);
      if (img) ctx.drawImage(img, x, y, w, h);
    } else if (el.type === 'text' || el.type === 'shape') {
      const boxBg = el.boxBg || el.backgroundColor || el.bgColor;
      if (boxBg && boxBg !== 'transparent') {
        const boxOpacity = el.boxOpacity !== undefined
          ? (Number(el.boxOpacity) > 1 ? Number(el.boxOpacity) / 100 : Number(el.boxOpacity))
          : 1;
        ctx.globalAlpha *= boxOpacity;
        ctx.fillStyle = boxBg;
        const r = 6;
        ctx.beginPath();
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
        ctx.fill();
        ctx.globalAlpha = el.opacity !== undefined ? Math.max(0, Math.min(100, Number(el.opacity))) / 100 : 1;
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

        const textX = el.textAlign === 'left' ? x + 6 : el.textAlign === 'right' ? x + w - 6 : x + w / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, textX, startY + i * lineH, w - 8);
        });
      }
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
