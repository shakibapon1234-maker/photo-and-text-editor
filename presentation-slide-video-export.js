/**
 * Presentation Studio — Slides to Video Export
 * =============================================
 * Adds an "🎬 Export as Video (WebM)" button to the Export ▾ menu.
 *
 * HOW IT WORKS:
 * 1. Opens a hidden presentation player popup (same as Present mode)
 * 2. Captures the popup's <canvas>/<stage> via MediaRecorder + captureStream()
 * 3. Each slide is shown for its configured autoDuration (or 3 s default)
 * 4. Animations run automatically; clicks are not needed
 * 5. Output is a WebM video downloaded to the user's machine
 *
 * LIMITATIONS:
 * - Requires Chrome/Edge (MediaRecorder + captureStream)
 * - Cross-origin images inside slides may be tainted (use local/base64 images)
 * - Video codec: VP9/WebM (native browser recording)
 */

(() => {
  const $ = id => document.getElementById(id);

  // ── Create the "Export Video" button ─────────────────────────────────────
  function ensureVideoExportBtn() {
    if ($('exportVideo')) return;

    const btn = document.createElement('button');
    btn.id = 'exportVideo';
    btn.type = 'button';
    btn.innerHTML = '🎬 Export as Video (.webm)';
    btn.title = 'সমস্ত স্লাইড একসাথে WebM ভিডিও হিসেবে ডাউনলোড করুন';
    btn.style.cssText = 'background:#1e0a3c;border:1px solid #a855f7;color:#d8b4fe;font-weight:800;white-space:nowrap;';
    btn.onclick = startSlideVideoExport;

    // Insert near the downloadSlideshow button
    const dlBtn = $('downloadSlideshow');
    if (dlBtn && dlBtn.parentNode) {
      dlBtn.parentNode.insertBefore(btn, dlBtn.nextSibling);
    } else {
      const top = document.querySelector('.top');
      if (top) top.appendChild(btn);
    }
  }

  // ── Export Logic ─────────────────────────────────────────────────────────
  async function startSlideVideoExport() {
    const btn = $('exportVideo');

    // Browser capability check
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') {
      alert('❌ আপনার ব্রাউজার ভিডিও রেকর্ডিং সাপোর্ট করে না।\nChrome বা Edge ব্যবহার করুন।');
      return;
    }

    if (!slides || !slides.length) {
      alert('কোনো স্লাইড পাওয়া যায়নি।');
      return;
    }

    // Ask user for per-slide duration
    const defDur = 4;
    const inputDur = prompt(
      `প্রতিটি স্লাইড কতক্ষণ ভিডিওতে থাকবে (সেকেন্ড)?\n` +
      `(স্লাইডে Auto-play সেকেন্ড সেট থাকলে সেটাই ব্যবহার হবে)\n` +
      `ডিফল্ট: ${defDur} সেকেন্ড`,
      String(defDur)
    );
    if (inputDur === null) return; // cancelled
    const fallbackDur = Math.max(1, parseFloat(inputDur) || defDur);

    btn.disabled = true;
    btn.innerHTML = '⏳ প্রস্তুত হচ্ছে... (0%)';

    try {
      await recordSlidesToVideo(slides, fallbackDur, (pct, msg) => {
        btn.innerHTML = `⏳ রেকর্ডিং... ${pct}% — ${msg}`;
      });
      btn.innerHTML = '✅ Video Downloaded!';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '🎬 Export as Video (.webm)';
      }, 3000);
    } catch (err) {
      console.error('Slide video export error:', err);
      alert('ভিডিও তৈরিতে সমস্যা হয়েছে:\n' + err.message);
      btn.disabled = false;
      btn.innerHTML = '🎬 Export as Video (.webm)';
    }
  }

  // ── Core Recording Engine ─────────────────────────────────────────────────
  async function recordSlidesToVideo(allSlides, fallbackDur, onProgress) {
    const W = 1280, H = 720;
    const FPS = 30;
    const MIME = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    // Render each slide to an OffscreenCanvas / regular Canvas
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Start recording
    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME,
      videoBitsPerSecond: 6_000_000
    });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    recorder.start(100); // collect every 100 ms

    const total = allSlides.length;

    for (let i = 0; i < total; i++) {
      const slide = allSlides[i];
      const dur = Math.max(1, Number(slide.autoDuration) || fallbackDur);

      onProgress(Math.round((i / total) * 100), `স্লাইড ${i + 1}/${total}`);

      // Render slide to canvas
      await renderSlideToCanvas(ctx, slide, W, H);

      // Hold this frame for `dur` seconds
      await wait(dur * 1000);
    }

    onProgress(99, 'ফিনিশিং...');
    recorder.stop();

    // Wait for recorder to flush
    await new Promise(resolve => { recorder.onstop = resolve; });

    // Download
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation-video-' + Date.now() + '.webm';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    onProgress(100, 'সম্পন্ন!');
  }

  // ── Slide → Canvas Renderer ───────────────────────────────────────────────
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // non-fatal: skip image on error
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
        // Parse simple two-stop gradient
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
    // 1. Background colour/gradient
    fillBackground(ctx, slide, W, H);

    // 2. Background image/video poster
    if (slide.bgMedia || slide.bgImage) {
      const src = slide.bgMedia || slide.bgImage;
      // Only images/base64 are possible here (videos can't be drawn directly)
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

    // 3. Overlay
    if (slide.bgOverlayOpacity) {
      ctx.globalAlpha = Math.max(0, Math.min(100, slide.bgOverlayOpacity)) / 100;
      ctx.fillStyle = slide.bgOverlayColor || '#000000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // 4. Elements (text + images)
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

    // Rotation
    const rot = ((Number(el.rotation) || 0) * Math.PI) / 180;
    if (rot !== 0) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rot);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    // Opacity
    if (el.opacity !== undefined) {
      ctx.globalAlpha = Math.max(0, Math.min(100, Number(el.opacity))) / 100;
    }

    if (el.type === 'image' && el.src) {
      const img = await loadImage(el.src);
      if (img) ctx.drawImage(img, x, y, w, h);
    } else if (el.type === 'text' || el.type === 'shape') {
      // Box background
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

      // Text rendering
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

  // ── Boot: inject the button after scripts have loaded ───────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(ensureVideoExportBtn, 400));
  } else {
    setTimeout(ensureVideoExportBtn, 400);
  }
})();
