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
// Both temporarily resize the existing canvas/renderer to the requested
// export resolution, capture, then restore the on-screen size — see
// `withExportResolution` at the bottom.

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
  const easingFn = deps.EASINGS[opts.easing] || deps.EASINGS.linear;
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
    zip.file(`frame_${String(i + 1).padStart(pad, '0')}.png`, blob);

    onProgress?.((i + 1) / frameCount);
    onStatus?.(`ফ্রেম ${i + 1}/${frameCount} ক্যাপচার হচ্ছে…`);
  }

  deps.resetMeshToBaseTransform();
  endExportResolution(deps);

  onStatus?.('ZIP প্যাক করা হচ্ছে…');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { blob: zipBlob, frameCount, width: opts.width, height: opts.height };
}
