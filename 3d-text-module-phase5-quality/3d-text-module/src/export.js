// 3D Text Module — Phase 4: Export Pipeline
//
// Two export paths, both reusing the *live* renderer/scene/camera from
// main.js (rather than standing up a second renderer) so exported output can
// never drift from what the preview shows — same materials, same lights,
// same camera framing the user left it at.
//
//   - exportWebM: real-time capture via canvas.captureStream() + MediaRecorder.
//     This has to run in real time — MediaRecorder is a live-capture API,
//     there's no way to feed it frames on a virtual/faster-than-realtime
//     clock and still get a correct output duration out the other end.
//     Alpha-channel WebM export is a Chromium/VP9-only capability at the
//     time of writing (see README "Browser support" — not standardized,
//     Firefox/Safari do not currently produce an alpha-carrying WebM here).
//
//   - exportPngSequence: NOT real time. Steps through frames on a virtual
//     clock (frame i -> t = i/fps), so frame count and per-frame content are
//     exact regardless of how fast this machine renders each frame — no
//     dropped-frame jitter the way live capture can have. This is the
//     format the plan calls the "fallback" for exactly that reason: it
//     works the same on a fast or slow machine, and every browser that can
//     render WebGL + canvas.toBlob('image/png') can produce it (alpha in a
//     PNG is universally supported, unlike alpha in WebM).
//
//   - exportGif: also NOT real time — reuses the exact same virtual-clock
//     frame loop as exportPngSequence (frame i -> t = i/fps), but feeds each
//     frame into a `gif.js` GIF encoder (Web Worker-based, runs entirely
//     client-side, no server) instead of zipping PNGs. See PLAN_3 §4.
//     GIF has no real alpha channel — a pixel is either fully opaque or
//     fully transparent (1-bit), never soft/anti-aliased like PNG/WebM
//     (PLAN_3 §4.3). So instead of feeding gif.js the renderer's raw
//     transparent canvas (which it would just flatten to opaque black),
//     every frame is first composited onto a solid "key color" backing
//     canvas, and — when transparency is requested — that exact key color
//     is registered with gif.js as the one transparent palette index
//     (chroma-key transparency, the standard technique for this format).
//     When transparency is *not* requested, the same compositing step is
//     reused with a user-chosen visible background color instead (PLAN_3
//     §7 open decision 4 — both options are offered, chroma-key transparent
//     is the default).
//
// Both temporarily resize the existing canvas/renderer to the requested
// export resolution, capture, then restore the on-screen size — see
// `withExportResolution` at the bottom.

import GIF from 'gif.js';

function supportedWebmMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null;
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp09.00.10.08',
    'video/webm',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function isWebMExportSupported() {
  return (
    typeof window !== 'undefined' &&
    !!supportedWebmMimeType() &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function'
  );
}

// ---------- shared resolution swap ----------
// Renders at exactly {width, height} device pixels: pixelRatio is forced to
// 1 so the export dimensions aren't silently multiplied by the display's
// devicePixelRatio the way the live preview intentionally is (see main.js
// handleResize). `updateStyle=false` on setSize leaves canvas.style
// untouched, so the on-screen box doesn't visibly jump — only the backing
// buffer resolution (and therefore the captured frame resolution) changes.
function beginExportResolution(deps, width, height) {
  deps.renderer.setPixelRatio(1);
  deps.renderer.setSize(width, height, false);
  deps.camera.aspect = width / height;
  deps.camera.updateProjectionMatrix();
}

function endExportResolution(deps) {
  deps.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  deps.handleResize();
}

// The studio preview intentionally has its own backdrop (the default is the
// dark-blue studio).  An export advertised as "transparent" must never inherit
// that preview-only backdrop, otherwise a valid PNG/WebM/GIF is produced but
// every transparent pixel has already been painted opaque.  Keep this concern
// inside the export pipeline so users do not have to change their preview
// background before every download.
function beginTransparentExport(deps) {
  const previousBackground = deps.scene.background;
  const previousClearColor = deps.renderer.getClearColor(new deps.THREE.Color()).clone();
  const previousClearAlpha = deps.renderer.getClearAlpha();

  deps.scene.background = null;
  deps.renderer.setClearColor(0x000000, 0);

  return () => {
    deps.scene.background = previousBackground;
    deps.renderer.setClearColor(previousClearColor, previousClearAlpha);
  };
}

// ---------- WebM (real-time, live scene) ----------
// deps: { renderer, camera, canvas, scene, animState, state,
//         handleResize, resetMeshToBaseTransform }
// opts: { width, height, fps, presetId, durationMs, delayMs, autoRotate,
//         noPresetDurationMs }
export async function exportWebM(deps, opts, callbacks = {}) {
  const { onProgress, onStatus } = callbacks;
  const mimeType = supportedWebmMimeType();
  if (!mimeType) {
    throw new Error(
      'এই ব্রাউজারে transparent WebM রেকর্ডিং সাপোর্টেড না — PNG Sequence ব্যবহার করুন।'
    );
  }

  const restoreTransparentSurface = beginTransparentExport(deps);
  beginExportResolution(deps, opts.width, opts.height);

  const stream = deps.canvas.captureStream(opts.fps);
  // Rough constant-quality target for VP9 screen-content-ish output; tuned
  // for legibility of thin extruded-text edges rather than photographic
  // content, which is why it's higher than a typical talking-head preset.
  const videoBitsPerSecond = Math.round(opts.width * opts.height * opts.fps * 0.12);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (e) => reject(e.error || new Error('MediaRecorder error'));
  });

  const totalMs = opts.presetId !== 'none' ? opts.delayMs + opts.durationMs : opts.noPresetDurationMs;

  onStatus?.('রেকর্ডিং শুরু হয়েছে…');
  recorder.start(100); // 100ms timeslice so ondataavailable fires incrementally

  if (opts.presetId !== 'none') {
    deps.animState.presetId = opts.presetId;
    deps.animState.durationMs = opts.durationMs;
    deps.animState.delayMs = opts.delayMs;
    deps.animState.loop = false;
    deps.animState.playing = true;
    deps.animState.startTime = performance.now();
  }
  // If presetId === 'none', autoRotate (if on) is already being driven every
  // frame by the existing main render loop reading deps.state.autoRotate —
  // nothing extra to start here. If both are off, the clip is intentionally
  // a static-frame video for `noPresetDurationMs` milliseconds.

  const startedAt = performance.now();
  await new Promise((resolve) => {
    function poll() {
      const elapsed = performance.now() - startedAt;
      onProgress?.(Math.min(1, totalMs > 0 ? elapsed / totalMs : 1));
      if (elapsed >= totalMs) {
        resolve();
        return;
      }
      requestAnimationFrame(poll);
    }
    poll();
  });

  deps.animState.playing = false;
  onStatus?.('রেকর্ডিং শেষ হচ্ছে…');
  recorder.stop();
  await stopped;

  deps.resetMeshToBaseTransform();
  endExportResolution(deps);
  restoreTransparentSurface();

  const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
  return { blob, mimeType, width: opts.width, height: opts.height, durationMs: totalMs };
}

// ---------- PNG sequence (deterministic virtual clock) ----------
// deps: { renderer, camera, canvas, scene, state, getTextMesh,
//         ANIMATION_PRESETS, EASINGS, applyPresetOffset,
//         resetMeshToBaseTransform, handleResize, JSZip }
// opts: { width, height, fps, presetId, durationMs, delayMs, easing,
//         autoRotate, noPresetDurationMs }
export async function exportPngSequence(deps, opts, callbacks = {}) {
  const { onProgress, onStatus } = callbacks;
  const { renderer, camera, scene, canvas } = deps;

  const restoreTransparentSurface = beginTransparentExport(deps);
  beginExportResolution(deps, opts.width, opts.height);

  const isAnimated = opts.presetId !== 'none';
  const isTurntable = !isAnimated && opts.autoRotate;
  // A fully static shot (no preset, no auto-rotate) has nothing that differs
  // frame to frame, so exporting N identical PNGs would just be dead weight
  // in the ZIP — one frame is the honest output for that case.
  const totalMs = isAnimated ? opts.durationMs + opts.delayMs : opts.noPresetDurationMs;
  const frameCount = isAnimated || isTurntable
    ? Math.max(1, Math.round((totalMs / 1000) * opts.fps))
    : 1;

  const zip = new deps.JSZip();
  const pad = String(frameCount).length;
  const preset = deps.ANIMATION_PRESETS[opts.presetId] || deps.ANIMATION_PRESETS.none;
  const easingFn = preset.continuous
    ? deps.EASINGS.linear
    : (deps.EASINGS[opts.easing] || deps.EASINGS.linear);
  const baseRotYRad = (deps.state.rotY * Math.PI) / 180;

  for (let i = 0; i < frameCount; i++) {
    const tMs = frameCount > 1 ? (i / (frameCount - 1)) * totalMs : totalMs;

    if (isAnimated) {
      const elapsed = tMs - opts.delayMs;
      const rawT = elapsed < 0 ? 0 : Math.min(1, opts.durationMs > 0 ? elapsed / opts.durationMs : 1);
      deps.applyPresetOffset(preset, easingFn(rawT));
    } else if (isTurntable) {
      const mesh = deps.getTextMesh();
      if (mesh) {
        const frac = totalMs > 0 ? tMs / totalMs : 0;
        mesh.rotation.y = baseRotYRad + frac * Math.PI * 2;
      }
    }

    renderer.render(scene, camera);
    // eslint-disable-next-line no-await-in-loop -- must serialize: each
    // frame's canvas content would be overwritten by the next render() call
    // otherwise, since there's only one shared canvas/backbuffer.
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG frame তৈরি করা যায়নি—আবার চেষ্টা করুন।');
    zip.file(`frame_${String(i + 1).padStart(pad, '0')}.png`, blob);

    onProgress?.(((i + 1) / frameCount) * 0.75);
    onStatus?.(`ফ্রেম ${i + 1}/${frameCount} ক্যাপচার হচ্ছে…`);
  }

  deps.resetMeshToBaseTransform();
  endExportResolution(deps);
  restoreTransparentSurface();

  onStatus?.('ZIP প্যাক করা হচ্ছে…');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    // PNG frames are already compressed. Re-compressing them is slow and
    // gives almost no size benefit, especially for 1080p exports.
    compression: 'STORE',
  }, (metadata) => {
    const percent = Math.max(0, Math.min(100, metadata.percent || 0));
    onProgress?.(0.75 + percent / 100 * 0.25);
    onStatus?.(`ZIP প্যাক করা হচ্ছে… ${Math.round(percent)}%`);
  });

  return { blob: zipBlob, frameCount, width: opts.width, height: opts.height };
}

// ---------- GIF frame-count / size guardrail (PLAN_3 §4.4 Phase C6) ----------
// A rough, cheap-to-compute estimate shown in the UI *before* the (slow,
// worker-based) encode starts, so a person can back off resolution/fps/
// duration first rather than discover a huge file only after waiting. Not a
// hard cap — GIF has no fixed compression ratio to predict exactly, so this
// is intentionally a same-order-of-magnitude estimate, not a promise.
export function estimateGifFrameCount(totalMs, fps, isAnimatedOrTurntable) {
  return isAnimatedOrTurntable ? Math.max(1, Math.round((totalMs / 1000) * fps)) : 1;
}

// Very rough bytes-per-frame heuristic (empirically GIFs of typical
// text/badge content — a few flat-ish colors, not photographic — tend to
// land in this ballpark at quality 10). Deliberately conservative
// (over-estimates a little) since warning too early is a much smaller
// annoyance than promising a small file and delivering a big one.
export function estimateGifSizeBytes(width, height, frameCount) {
  return Math.round(width * height * 0.28 * frameCount);
}

// GIF supports just one transparent palette entry, not partial alpha. Before
// adding a transparent frame, turn alpha into an ordered-dither pattern so a
// soft black shadow never gets blended into the magenta chroma key.
const GIF_ALPHA_DITHER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function prepareTransparentGifFrame(ctx, width, height, keyRgb) {
  const frame = ctx.getImageData(0, 0, width, height);
  const { data } = frame;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const threshold = GIF_ALPHA_DITHER_4X4[((Math.floor(pixel / width) & 3) * 4) + (pixel & 3)] * 16;
    if (data[i + 3] <= threshold) {
      data[i] = keyRgb[0];
      data[i + 1] = keyRgb[1];
      data[i + 2] = keyRgb[2];
    }
    data[i + 3] = 255; // gif.js ignores alpha; retained pixels are opaque.
  }
  ctx.putImageData(frame, 0, 0);
}

// ---------- GIF (deterministic virtual clock, reuses PNG's frame loop) ----------
// deps: same shape as exportPngSequence's deps (renderer, camera, scene,
//       canvas, state, getTextMesh, ANIMATION_PRESETS, EASINGS,
//       applyPresetOffset, resetMeshToBaseTransform, handleResize)
// opts: { width, height, fps, presetId, durationMs, delayMs, easing,
//         autoRotate, noPresetDurationMs, quality, loop, transparentBg,
//         backgroundColor, workerScript }
export async function exportGif(deps, opts, callbacks = {}) {
  const { onProgress, onStatus } = callbacks;
  const { renderer, camera, scene, canvas } = deps;

  // GIF can optionally use a visible background.  Only hide the studio
  // backdrop when the user chose GIF transparency; otherwise preserve it.
  const restoreTransparentSurface = opts.transparentBg ? beginTransparentExport(deps) : null;
  beginExportResolution(deps, opts.width, opts.height);

  const isAnimated = opts.presetId !== 'none';
  const isTurntable = !isAnimated && opts.autoRotate;
  const totalMs = isAnimated ? opts.durationMs + opts.delayMs : opts.noPresetDurationMs;
  const frameCount = estimateGifFrameCount(totalMs, opts.fps, isAnimated || isTurntable);

  const preset = deps.ANIMATION_PRESETS[opts.presetId] || deps.ANIMATION_PRESETS.none;
  const easingFn = preset.continuous
    ? deps.EASINGS.linear
    : (deps.EASINGS[opts.easing] || deps.EASINGS.linear);
  const baseRotYRad = (deps.state.rotY * Math.PI) / 180;

  // Chroma-key backing color for hard-edge transparency (see file-header
  // comment). Picked to be extremely unlikely to appear in a real render
  // (materials/text colors are user-chosen, but this exact magenta is not
  // offered anywhere in the color pickers) rather than hard-coding pure
  // black/white, which *are* common badge/text colors and would wrongly
  // punch holes in the output.
  const KEY_COLOR = '#ff00fe';
  const KEY_COLOR_NUM = 0xff00fe;
  const KEY_RGB = [255, 0, 254];
  const backgroundColor = opts.transparentBg ? KEY_COLOR : (opts.backgroundColor || '#ffffff');

  // Composite canvas: same size as the export resolution, opaque, reused
  // every frame (avoids allocating a new canvas 1/frame).
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = opts.width;
  compositeCanvas.height = opts.height;
  const compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });

  const gif = new GIF({
    workers: 2,
    workerScript: opts.workerScript || 'gif.worker.js',
    quality: opts.quality || 10,
    width: opts.width,
    height: opts.height,
    repeat: opts.loop ? 0 : -1, // 0 = infinite loop, -1 = play once
    background: backgroundColor,
    transparent: opts.transparentBg ? KEY_COLOR_NUM : null,
    dither: false,
  });

  const delayMsPerFrame = Math.max(20, Math.round(1000 / opts.fps)); // most GIF decoders floor below ~20ms

  for (let i = 0; i < frameCount; i++) {
    const tMs = frameCount > 1 ? (i / (frameCount - 1)) * totalMs : totalMs;

    if (isAnimated) {
      const elapsed = tMs - opts.delayMs;
      const rawT = elapsed < 0 ? 0 : Math.min(1, opts.durationMs > 0 ? elapsed / opts.durationMs : 1);
      deps.applyPresetOffset(preset, easingFn(rawT));
    } else if (isTurntable) {
      const mesh = deps.getTextMesh();
      if (mesh) {
        const frac = totalMs > 0 ? tMs / totalMs : 0;
        mesh.rotation.y = baseRotYRad + frac * Math.PI * 2;
      }
    }

    renderer.render(scene, camera);

    if (opts.transparentBg) {
      // Do not blend the partial-alpha shadow over the magenta key color;
      // that is what made the downloaded GIF's shadow appear purple.
      compositeCtx.clearRect(0, 0, opts.width, opts.height);
      compositeCtx.drawImage(canvas, 0, 0, opts.width, opts.height);
      prepareTransparentGifFrame(compositeCtx, opts.width, opts.height, KEY_RGB);
    } else {
      // Visible-background GIFs are composited onto the selected color.
      compositeCtx.fillStyle = backgroundColor;
      compositeCtx.fillRect(0, 0, opts.width, opts.height);
      compositeCtx.drawImage(canvas, 0, 0, opts.width, opts.height);
    }

    gif.addFrame(compositeCtx, { copy: true, delay: delayMsPerFrame });

    onProgress?.(((i + 1) / frameCount) * 0.5); // rendering frames = first half of progress
    onStatus?.(`ফ্রেম ${i + 1}/${frameCount} রেন্ডার হচ্ছে…`);
  }

  deps.resetMeshToBaseTransform();
  endExportResolution(deps);
  restoreTransparentSurface?.();

  onStatus?.('GIF এনকোড হচ্ছে (এতে কিছুটা সময় লাগতে পারে)…');
  const blob = await new Promise((resolve, reject) => {
    gif.on('progress', (p) => {
      const safeProgress = Math.max(0, Math.min(1, p || 0));
      onProgress?.(0.5 + safeProgress * 0.5); // encoding = second half of progress
      onStatus?.(`GIF এনকোড হচ্ছে… ${Math.round(safeProgress * 100)}%`);
    });
    gif.on('finished', (encodedBlob) => resolve(encodedBlob));
    gif.on('abort', () => reject(new Error('GIF এনকোডিং বাতিল হয়েছে')));
    try {
      gif.render();
    } catch (err) {
      reject(err);
    }
  });

  return { blob, frameCount, width: opts.width, height: opts.height };
}
