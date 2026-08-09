# 3D Text Module — Phase 4

Standalone Three.js-based 3D text engine, per `PLAN_2_3D_Text_Module.md`. Not wired into
the Photo Editor or Studio Flow Video Editor yet — that integration is Phase 4/5 (export
pipeline), by design (see plan §5, Integration Strategy).

## Build system (changed in Phase 2)

Phase 1 loaded Three.js from a CDN via an import map at runtime. Phase 2 switches to an
**npm dependency + esbuild bundle** — the same pattern the Photo Editor (`PLAN_1`) already
uses. Two reasons:

1. It was flagged as an open decision to make before starting Phase 2 (see PLAN_2 §6).
2. It's what actually made real rendering tests possible in this sandbox: `unpkg.com`
   (the CDN Phase 1 used) is blocked by the sandbox's network allowlist (confirmed via
   `curl` → `403`), but `registry.npmjs.org` is allowed. Bundling from npm meant Phase 2
   could be tested with a real `three` build instead of just a syntax check.

As a side effect, the font is now vendored and imported directly as a JSON module
(`assets/fonts/helvetiker_regular.typeface.json`, copied from the `three` npm package)
and parsed synchronously with `FontLoader.parse()` — no network fetch for the font either,
so the app has zero runtime network dependencies for its core 3D engine (Google Fonts for
UI typography in `style.css` is the only remaining external request, and it degrades
gracefully to system fonts if unreachable).

Note: `assets/fonts/` also has `helvetiker_bold` and `optimer_regular` vendored
alongside the `helvetiker_regular` that's actually wired up — copied in now so a future
font-selector feature doesn't need a separate npm-package dig; not used by any code yet.

## Export pipeline (Phase 4)

Two export formats, both added in `src/export.js`, both reusing the *same* live
renderer/scene/camera the preview uses (temporarily resized to the requested export
resolution, then restored) rather than standing up a second renderer — so exported output
can never drift from what the preview shows.

- **Transparent WebM** — real-time capture via `canvas.captureStream()` + `MediaRecorder`
  (VP9). Real time because `MediaRecorder` is a live-capture API; there's no way to feed it
  frames on a virtual/faster-than-realtime clock and still get a correct output duration.
  **Alpha-channel WebM is a Chromium/VP9-specific capability** — Chrome auto-detects the
  canvas has alpha and sets VP9's `alpha_mode` flag on the encoded stream (confirmed via
  `ffprobe`, see "What's tested" below). Firefox/Safari do not currently produce an
  alpha-carrying WebM through this same code path, which is why PNG Sequence exists as a
  format every browser can do, not just a "simpler fallback."
- **PNG Sequence (ZIP)** — deterministic, *not* real-time: steps through frames on a
  virtual clock (frame `i` → `t = i/fps`), so frame count and content are exact regardless
  of how fast the machine renders each frame — no dropped-frame jitter the way live
  capture can have. Packed into a ZIP with `jszip` (added as a new dependency this phase).
  A fully static shot (no animation preset, no auto-rotate) exports a single PNG instead of
  N identical frames.

Both a selected animation preset (Animation panel) and auto-rotate (Rotate/Tilt panel) can
drive an export — the Export panel's "সোর্স" (source) line always shows which one, live,
and the export duration is derived from whichever is active rather than being a separate
number you'd have to keep in sync by hand. With neither active, the shot is static: PNG
exports 1 frame, WebM exports a fixed 3s clip (there's nothing to animate, so the length
isn't user-configurable in that case).

## Run it

```bash
cd 3d-text-module
npm install
npm run build      # bundles src/main.js -> www/main.bundle.js (esbuild)
npm run serve      # python3 -m http.server 8000 -d www
# then open http://localhost:8000
```

`www/main.bundle.js` is shipped already built too, so `npm run serve` alone (after
`npm install`) will work even if you skip the build step. You still need to serve over
http(s), not open `www/index.html` via `file://` — ES modules are blocked under `file://`
by browser CORS rules.

If you edit `src/main.js`, re-run `npm run build` to regenerate the bundle.

> ✅ **Phase 4 build status:** unlike the Phase 3 session, this session **did** have npm
> registry access (confirmed via `npm ping` before starting), so — for the first time since
> Phase 2 — this got a full real test: `npm install` (including the new `jszip`
> dependency), `npm run build`, and real headless-Chromium runs of the actual export flows,
> not just a syntax check. `www/main.bundle.js` shipped in this zip is the current build,
> including Phase 3's animation code (which only got a syntax-level check in its own
> session) and Phase 4's export code. See "What's tested — Phase 4" below for specifics,
> including a real bug this caught and fixed.

## What's implemented (Phase 4 checklist)

- [x] **Transparent WebM export** — `MediaRecorder` + `canvas.captureStream()`, VP9. Real
      alpha channel confirmed via `ffprobe` (`alpha_mode: 1` in the encoded stream), not
      just assumed from the renderer's `alpha: true` setting.
- [x] **PNG Sequence export (fallback)** — deterministic per-frame capture, zipped with
      `jszip`. Real alpha-channel PNGs confirmed both by file header (color type 6 = RGBA)
      and by decoding actual pixel values (background pixels alpha≈0, mesh pixels
      alpha≈255 — a working transparency, not just a format flag).
- [ ] **Manual import test into your video editor** — this is the one Phase 4 checklist
      item that's inherently outside sandbox reach (no video editor here to import into).
      This is the concrete next step for you — see "Next" below.

## What's implemented (Phase 3 checklist)

- [x] **Preset animation library** — finalized at 17 buttons (`None` + 16 effects):
      original 8 (Fade In, Pop In, Rotate In, Flip In, Slide In left/right, Drop In,
      Wobble) plus 8 added in the animation-list-finalization pass (Zoom Blast, Rise Up,
      Flip In vertical-axis, Rotate In reverse-direction, Spin + Pop, Swing In, Diagonal
      In, Drop In with squash-landing). Lives in `src/animations.js` as plain functions
      (`ANIMATION_PRESETS`), no `three` import. Every preset — old and new — was
      re-verified with the same `apply(1) === neutral offset` unit test (see "What's
      tested" below), all 17 pass.
- [x] **Timeline control** — Duration slider (0.2s–4s), Delay slider (0–3s), Easing
      dropdown (Linear, Ease In, Ease Out, Ease In-Out, Elastic-Out, Bounce-Out), Loop
      toggle.
- [x] **Preview playback** — Play/Restart + Stop buttons, a live progress bar, and a
      status label (delay window / playing / looping / done / stopped).
- [x] Every preset is defined as an *offset on top of* the Rotate/Tilt panel's current
      X/Y/Z sliders, so what you rotate to before hitting Play is what the animation
      lands on — not a separate, disconnected transform.
- [x] Carried over from Phase 2 unchanged: 5 material presets, 3 lighting presets,
      shadow/reflection toggles, camera orbit + reset, transparent renderer background.

## What's implemented from earlier phases (Phase 1 + 2 checklist, unchanged)

- [x] **5 material presets**: Matte, Glossy, Metallic, Glass, Neon (button grid, replaces
      Phase 1's 3-option dropdown)
- [x] **3 lighting presets**: Studio (neutral 3-point, the Phase 1 default), Dramatic
      (low ambient, one hard strong side light, orange rim), Soft (hemisphere light +
      two gentle broad fills, soft shadow radius) — each preset owns and tears down its
      own light rig so switching never leaves stale lights in the scene
- [x] **Shadow toggle** — ground shadow-catcher plane (invisible except for the shadow
      it receives), toggles `castShadow`/`receiveShadow` on the text mesh and all
      directional lights
- [x] **Reflection/environment toggle** — procedural environment map (Three's
      `RoomEnvironment` + `PMREMGenerator`, no external HDRI download needed) that
      Metallic and Glass lean on for their reflections; toggling it off drops
      `envMapIntensity` to ~0 so the difference is obvious (see test notes below)
- [x] Neon gets its own "Glow intensity" slider (emissive intensity), shown only when
      Neon is selected
- [x] Carried over from Phase 1 unchanged: text input, depth/size sliders, X/Y/Z rotate
      sliders, free camera orbit (`OrbitControls`, drag/scroll) + auto-rotate toggle,
      transparent renderer background (still `alpha: true`, `scene.background = null`)

## What's tested, and how — Phase 4 (this session)

Full real-browser testing this time (Playwright + headless Chromium, real `three` +
`jszip` build, same as Phase 2's approach) — not just syntax-check, and not just
render-and-look, but actually exercising both export code paths end to end and inspecting
the output files afterward with tools outside the browser (`ffprobe`, Pillow) rather than
trusting the app's own success message.

- **Baseline still works**: 3D text still renders correctly after all the Phase 4 changes
  (status note "রেডি", same as Phase 2/3) — confirms nothing in the export wiring broke
  the existing scene/material/lighting/animation code it sits alongside.
- **All 50 DOM ids** referenced by `getElementById` in `main.js` cross-checked
  programmatically against `index.html` — 0 missing, 0 unused (same check Phase 3 used,
  re-run after adding the Export panel's ~15 new ids).
- **PNG Sequence, full pipeline**: ran a real export (Rotate In preset, so frames actually
  differ), downloaded the resulting ZIP, and inspected it outside the browser:
  - 5 frames present, sizes ranging 87–109 KB (i.e. genuinely different image *content*
    per frame, not 5 copies of the same render).
  - PNG header color type 6 (RGBA) confirmed at the correct requested resolution
    (800×800).
  - Decoded actual pixel alpha values with Pillow: background samples read alpha 0,
    text-mesh samples read alpha 255 — real working transparency, not just the color-type
    flag being set with everything actually opaque underneath.
  - Frame 1 and frame 5 came out byte-identical — expected, not a bug: Rotate In's `t=0`
    offset is a *full* 2π rotation (see `animations.js`'s comment on why that satisfies
    the "lands on neutral at t=1" contract), and a 2π rotation is visually identical to no
    rotation, so the first and last frames of a full spin-in are the same image. Confirms
    the animation math is behaving exactly as documented, not that capture is stuck.
- **WebM, full pipeline**: ran a real export (static source, fixed 3s clip — the fastest/
  most deterministic case to test the recorder machinery itself), downloaded the file, and
  inspected it with `ffprobe`: valid VP9 stream, 800×800, and — the part that actually
  matters for this format's whole purpose — **`alpha_mode: 1`** in the stream metadata,
  meaning Chrome detected the canvas's alpha and encoded it as an alpha-carrying VP9
  stream, not a normal opaque one. (Could not decode actual pixel alpha values from the
  WebM in this sandbox — the cached `ffmpeg` binary here has no VP9 *decoder*, only an
  encoder/muxer path, so a true pixel-level check like the PNG one above wasn't possible
  for video. The stream-level `alpha_mode` flag plus the demonstrated-correct alpha
  pipeline via PNG export is the evidence available from this sandbox; worth a specific
  look when you do the manual video-editor import test.)
- **Post-export app state**: canvas backing resolution correctly restored to its
  pre-export size afterward (980×748 before and after, in this session's viewport), the
  `is-exporting` UI lock clears, and switching a material preset right after an export
  still works — confirms the temporary resolution swap doesn't leave the app in a broken
  state for continued use.

**One real bug was caught by this testing and fixed** (not an imagined edge case — same
category as the two bugs Phase 2 testing caught): the `.export-result` box (which holds
the post-export download button) has `hidden` on it in the HTML, same as the Neon-only
Glow slider Phase 2 dealt with — and it had the *exact same* CSS bug: an author-stylesheet
rule (`.export-result { display: flex; ... }`) was overriding the browser's default
`[hidden] { display: none }`, so the download button was visible before any export had
ever run. A screenshot taken during testing caught it directly (the button was visibly
present next to an empty "প্রস্তুত" status). Fixed the same way Phase 2 fixed the Neon
slider: an explicit `.export-result[hidden] { display: none; }` rule. Re-screenshotted
after the fix to confirm the button is gone in the initial state and reappears correctly
after a real export completes.

**A real, non-bug performance finding, worth knowing about before you test on your own
machine:** `canvas.toBlob('image/png')` — the call PNG Sequence export makes once per
frame — took **2.3–5.2 seconds per single call** at 800×800 in this sandbox. That's not a
bug in the export code: it reproduces identically with a bare `canvas.toBlob()` call
completely outside the export pipeline (isolated test, no resize, no app logic involved),
and the cost scales with resolution (roughly consistent timings at 980×748 and 800×800,
both similar pixel counts). Chromium's own console logs point at the cause directly —
repeated `GPU stall due to ReadPixels` warnings — which is `SwiftShader` (this sandbox's
*software* GL rasterizer; there's no real GPU here) being slow at reading rendered pixels
back off the "GPU" for encoding, on every single frame. A real GPU does this readback in
hardware and should be dramatically faster; the WebM path sidesteps this entirely (it
doesn't call `toBlob` per frame — `MediaRecorder` captures compressed video incrementally
via the browser's own encoding pipeline, real-time, and its 800×800/3s test above finished
in under 10 seconds total in this same sandbox). **If PNG Sequence export feels very slow
on your machine too**, that's worth reporting back as a real finding rather than assuming
it's expected — but the fact that it's clearly resolution-scaling and reproduces with a
bare API call outside any of this project's code makes "software rasterizer in this
specific sandbox" the far more likely explanation than an export-pipeline bug.

## What's tested, and how — Phase 3 (this session)

This sandbox session had no npm registry access (see the build-status note above), so
unlike Phase 2, **nothing in Phase 3 has been run in an actual browser or bundled with
esbuild yet**. What *was* possible without a browser, bundler, or network, and was
actually done:

- `node --check` on both `src/animations.js` and `src/main.js` — syntax-valid.
- Every DOM id `main.js` looks up with `getElementById` was cross-checked against
  `www/index.html` programmatically (regex diff of the two id sets) — all 35 match, no
  dangling reference.
- `src/animations.js` has **zero `three` imports** by design, so it could be loaded and
  actually *executed* with plain Node (no bundler, no DOM) to numerically verify the
  easing curves and, more importantly, the contract every preset must satisfy: calling
  `preset.apply(1)` for all 17 presets (the original 9 plus the 8 added in the
  animation-list-finalization pass) and asserting the result is the exact neutral
  offset (`pos [0,0,0]`, `rot [0,0,0]`, `scaleMul 1`, `opacityMul 1`) — confirmed for all
  17. This matters because it's the guarantee that an animation always *lands* on exactly
  what the Text/Rotate panel sliders say, regardless of which preset/duration/delay/
  easing was chosen — a bug here would mean the mesh ends up in the wrong pose after
  every playback.
- Also spot-checked each easing function's `f(0)`, `f(0.5)`, `f(1)` numerically — all
  start at 0 and end at 1 as expected (`easeOutElastic`/`easeOutBounce` overshoot above 1
  around the midpoint, which is intentional).

**Not verified this session, and can't be until you run it with network access:**
- Real rendering — does Fade In actually look like a fade, does Wobble look like a
  wobble, etc. The math is unit-tested; the visual result isn't. *(Update from Phase 4:
  this got verified — Rotate In was seen actually rotating-in correctly across real
  captured frames, see "What's tested — Phase 4" above. The other 7 presets weren't
  individually eyeballed this session either, just Rotate In as part of testing export.)*
- Whether toggling `mat.transparent = true` mid-playback (needed to preview
  `opacityMul < 1`) causes any visible sorting/z-fighting artifact with the existing
  Glass material's own transparency — worth a specific look once you can render it.
- Interaction between a playing animation and manually dragging the Rotate/Tilt sliders
  or switching material/lighting presets mid-playback — the code is written so this
  should resolve correctly next frame (see `applyPresetOffset`'s comment), but that's
  reasoning about the code, not an observed test.
- Interaction between `autoRotate` and a playing animation — deliberately made mutually
  exclusive per-frame (animation takes priority while playing) so they can't fight over
  `textMesh.rotation`, but again, not seen running.

## What's tested, and how — Phase 2

Unlike Phase 1 (blocked by the CDN), the Phase 2 sandbox session **did** have npm
registry access, so Phase 2 got a real render test — Playwright + headless Chromium (SwiftShader software
GL), served over local HTTP, with the actual bundled `three` build:

- `npm install` ran for real (3 packages: `three`, `esbuild`, plus esbuild's own
  dependency), and `npm run build` produced a working `www/main.bundle.js`.
- Loaded in headless Chromium and confirmed **actual 3D extruded text renders** — not
  just a blank canvas or a code-reachability check. Status note shows "রেডি" (ready),
  not the "font load failed" state Phase 1 hit.
- Clicked through all 5 material presets and took screenshots of each — Matte, Glossy,
  Metallic, and Neon are all visually distinct. Metallic clearly shows environment
  reflections (bright streaks across the extruded faces).
- Clicked through all 3 lighting presets on a non-emissive material (Glossy) and
  confirmed they're visibly different: Studio is balanced 3-point, Dramatic has hard
  shadow edges and strong one-sided contrast, Soft is flat/even with gentle falloff.
  (Checked separately from Neon, since an emissive-driven material doesn't react much
  to light changes — that's physically correct, not a bug, but not a useful lighting
  demo shot.)
- Toggled reflections off on Metallic and confirmed the object goes nearly black except
  for direct specular highlights — i.e. the toggle actually removes the environment
  contribution rather than being a no-op.
- Toggled shadows off/on (checkbox state confirmed; the ground plane itself sits below
  the default camera framing so the shadow isn't in-frame at the default angle — worth
  zooming out to check visually on your machine).
- Typed new text into the input and confirmed the mesh rebuilds live (debounced).
- Dragged the mouse across the canvas and confirmed `OrbitControls` actually re-angles
  the camera (not just wired up, but functionally moves the view).

**Two real bugs were caught by this testing (not just imagined edge cases) and fixed:**

1. **CSS bug**: `.field { display: flex }` was overriding the browser's default
   `[hidden]` behavior (same specificity, author stylesheet wins), so the neon-only
   "Glow intensity" slider was showing for every material preset, not just Neon.
   Screenshot caught it directly. Fixed with an explicit `.field[hidden] { display: none }`
   rule.
2. **Glass material bug**: the first pass used `transmission: 1.0`, which refracts
   whatever is *behind* the mesh inside the WebGL scene itself. Since this scene is
   intentionally kept empty/transparent (`alpha: true`, `scene.background = null`, for
   Phase 4's export requirement), there was nothing to refract — Glass rendered
   pixel-for-pixel indistinguishable from Glossy. Caught this by diffing the two
   screenshots (mean pixel difference ~10/255, i.e. essentially identical) rather than
   eyeballing it. Fixed by lowering `transmission` to 0.35 combined with real `opacity`
   (0.55) — reliably reads as translucent glass regardless of what's behind it.

**Still not verified in this sandbox** (needs your machine or a non-headless check):
- Visual correctness on a real GPU — this ran on SwiftShader (software rasterizer), so
  colors/AA quality may look subtly different (typically better) on real hardware.
- The ground-plane shadow itself, visually, at a camera angle where it's in frame.
- Performance with the full material+lighting+shadow stack enabled together on a
  low-end device (that's explicitly Phase 5 scope, not skipped by accident).

## Known open item carried over from Phase 1 (now resolved)

~~If you'd rather not depend on the unpkg CDN at runtime... vendoring `three` as an npm
dependency and bundling with esbuild... Worth deciding before Phase 2.~~ → Done, see
"Build system" above.

## Bangla text support (this session, per PLAN_2 §8.1)

`TextGeometry` (Phase 1-5, still used for Latin text) extrudes glyph outlines from a
Three.js typeface-JSON font. That's wrong for Bangla for two independent reasons: the
vendored fonts (helvetiker/optimer) have no Bengali glyphs, and even a Bengali font run
through `TextGeometry`'s pipeline wouldn't shape conjuncts (যুক্তাক্ষর) or matra/kar marks
correctly — that pipeline is built for simple Latin-style glyph runs.

**Approach taken: hybrid canvas-texture card** (PLAN_2 §8.1 option 3, not option 1 —
vendor a Bengali typeface-JSON — or option 2 — switch to `troika-three-text`). Text is
auto-detected via the Bengali Unicode block (`\u0980`–`\u09FF`); when present, the line(s)
are drawn into an offscreen `<canvas>` using the *browser's own* text shaping (the same
engine that already renders the `<textarea>` correctly), then mapped as a texture onto an
extruded `BoxGeometry` "card" — front/back faces get the text texture with `alphaTest` for
a clean cutout, the 4 side faces get a plain material of the current preset as the card's
edge. Latin text is completely unaffected; it still goes through the original per-glyph
`TextGeometry` path.

This was chosen over the alternatives because it needs no new font file (this sandbox has
no network access this session — see below — so downloading a Bengali font wasn't an
option anyway) and because it reuses every existing material/animation/export code path
unchanged, since the result is still just a `Group` with `.position`/`.rotation`/
`.material`, same shape as the Latin-text mesh. The trade-off, stated up front rather than
discovered later: depth comes from the card's rectangular edge, not from each letter's own
silhouette — a flat card with depth, not per-letter extrusion. A UI note
(`#textModeNote`, under the text input) says this explicitly whenever Bangla is detected.

**What changed in `src/main.js`:** `isBanglaText()`, `drawCanvasTextTexture()`,
`makeCardTexture()`, `buildCanvasCardMaterials()`, `buildCanvasCardTextMesh()` (new);
`rebuildTextMesh()` now branches into `buildVectorTextMesh()` (old logic, renamed) or
`buildCanvasCardTextMesh()` based on `isBanglaText()`; `applyMaterial()`,
`applyPresetOffset()`, and `resetMeshToBaseTransform()` were extended to handle a
multi-material array (`[side,side,side,side,front,back]`) since they previously assumed
`child.material` was always a single object.

**What was tested this session:** `node --check` on `src/main.js` (syntax valid); every
`getElementById()` call cross-checked programmatically against `www/index.html` (60/60
matched, including the new `textModeNote`); the Bangla-detection regex checked in plain
Node against English/Bangla/mixed/Bangla-numeral cases.

**What could NOT be tested this session — sandbox had no network access at all** (`npm
install` itself returned `403 Forbidden` from `registry.npmjs.org`, a step stricter than
earlier sessions where the registry was reachable but `unpkg.com`/`cdn.playwright.dev`
weren't):
- **`npm run build` could not be run**, so `www/main.bundle.js` in this delivery is still
  the **pre-Bangla build** — you must run `npm install && npm run build` yourself before
  this feature will actually appear in the browser.
- No real browser render of the canvas-text path at all: whether the font fallback stack
  (`Noto Sans Bengali` → `Nirmala UI` → `Vrinda` → `Kalpurush` → `Siyam Rupali` → generic
  sans-serif) actually resolves to a Bengali-capable font on your OS, whether conjuncts/
  matras look visually correct, whether the card's size/aspect lines up reasonably with
  the Size slider, and how all 5 material presets / shadows / reflections / the 17
  animation presets / WebM+PNG export look on a Bangla card specifically.

## 3D image support (this session, per PLAN_2 §8.2)

An "উপলোড ছবি" (upload image) option alongside text: pick an image file and it becomes a
3D object with the same depth/rotate/material/animation/export controls text already had.

**Approach taken:** reuse §8.1's canvas-texture-card pipeline as-is, instead of building a
separate image path. `drawImageCardCanvas()` draws the uploaded `<img>` onto an offscreen
canvas with `ctx.drawImage()` (in place of §8.1's `ctx.fillText()`), downscaled to a
quality-preset-dependent cap first (`IMAGE_TEXTURE_MAX_PX = { low: 512, medium: 1024, high:
2048 }` — resolves the plan's "large image performance" open question: polygon count never
changes, only the texture's pixel budget does, and it's re-applied automatically whenever
the Quality preset changes since that already triggers a mesh rebuild). The canvas becomes
a `CanvasTexture` mapped onto a 6-material `BoxGeometry` exactly like the Bangla card, so it
reuses the existing `renderMode === 'canvas'` branch in `applyMaterial()`/
`resetMeshToBaseTransform()` unchanged — no new material-handling code, no export.js
changes. One small difference from the text card: front/back textures are **not** mirrored,
since a photo has no "reading direction" to protect (text mirrors its back face so letters
don't read backwards from behind).

**Text vs. image — mutually exclusive, not simultaneous** (resolves the plan's other open
question): a new content-type toggle (টেক্সট / ছবি) switches which one is the single active
object (`textMesh`), matching how every other panel already assumes one active object.
Showing both at once in the same scene would need a real architecture change (an array of
active objects, each with independent transform/preset state) and was treated as a
separate, larger feature rather than folded into this pass. The Depth/Size sliders, which
used to live only inside the text panel, were pulled out into their own always-visible
section so both modes can reach them.

**What changed in `src/main.js`:** `drawImageCardCanvas()`, `buildImageCardMesh()` (new);
`rebuildTextMesh()` now branches on `state.contentMode` before its existing text-vs-Bangla
branching; new DOM refs/listeners for the content-type toggle and the file `<input>`
(`FileReader` → `Image` → `state.imageElement` → rebuild); the Export button now checks
`textMesh` is non-null before starting (previously an empty scene could silently "export").

**What was tested this session:** `node --check` on `src/main.js` (syntax valid); every
`getElementById()` call cross-checked against `www/index.html` (66/66 matched, including
the 6 new ids for the content toggle and image panel); the `IMAGE_TEXTURE_MAX_PX` downscale
math (cap per quality tier, aspect-ratio preservation, no upscaling of small images) checked
in plain Node against several width/height/quality combinations.

**What could NOT be tested this session — sandbox again had no `npm install`/network
access** (same limitation as §8.1 above, so `www/main.bundle.js` still does not include
this feature either — you'll need `npm install && npm run build` to see both this and the
§8.1 Bangla work in the browser):
- Real file-picker → `FileReader` → `Image.onload` flow in an actual browser; whether the
  preview thumbnail and the 3D card's aspect ratio both look right for a real uploaded
  photo.
- Whether the front/back `alphaTest` cutout (0.4, same threshold as the Bangla card)
  introduces any visible edge artifact on a transparent PNG with soft/anti-aliased edges.
- All 5 material presets, animation presets, shadow/reflection, and quality-preset
  switching specifically on an image card (code-level all reuse the same paths as the
  Bangla card, which itself is still browser-unverified — see §8.1 above).
- Export (WebM/PNG) of an image card, and that switching content-type mid-preview/mid-export
  resets state cleanly.

## Next (per PLAN_2)

0. **New, most urgent (this session's Bangla + image work — neither tested in a real
   browser, see both sections above):** run `npm install && npm run build && npm run
   serve`, then (a) type Bangla text into the Content field and confirm it renders as a
   readable card, and (b) switch to "ছবি" and upload a photo and confirm the card looks
   right and export works. If the font fallback stack doesn't pick up a Bengali-capable
   font on your system, the next step would be vendoring a Noto Sans Bengali
   `.ttf`/`.woff2` and adding it via `@font-face` in `www/style.css` (or drawing with it
   directly in the canvas context) so the module doesn't depend on whatever happens to be
   installed on the machine.

Phase 4's code is written and tested end-to-end in this sandbox (real exports produced,
downloaded, and inspected with tools outside the browser — see "What's tested — Phase 4"
above). One Phase 4 checklist item is inherently outside sandbox reach:

1. **You, most important**: **manual import test into Studio Flow Video Editor.** Export
   both formats (`npm install && npm run build && npm run serve`, then use the Export
   panel), import each into your video editor, and confirm the background is actually
   transparent there — not just transparent in this module's own preview. Specifically
   worth checking:
   - Does the WebM's alpha channel survive import, or does your editor treat it as opaque
     (common if an editor's WebM decoder doesn't read VP9's `alpha_mode` flag)? This
     sandbox confirmed the flag is set correctly on export (via `ffprobe`) but couldn't
     verify what a real video editor does with it.
   - If WebM import doesn't preserve transparency, PNG Sequence is the fallback — most
     video editors can import a PNG sequence as an image-sequence clip with alpha intact,
     since PNG alpha is universal rather than a codec-specific feature.
2. Also worth doing on your machine since this sandbox has no real GPU: click through all
   17 animation presets (9 original + 8 added in the finalization pass) and 3 easing
   curves that weren't individually eyeballed this session (only Rotate In was, as part
   of export testing) — see the Phase 3 section above for what specifically to look at
   (Wobble, Swing In, Spin + Pop, squash-landing on Drop In (স্কোয়াশ), elastic/bounce
   easing).
3. If PNG Sequence export feels meaningfully slow on your machine too, that's worth
   reporting — this session found it very slow specifically under this sandbox's software
   GL rasterizer (SwiftShader), not something expected to reproduce with a real GPU, but
   worth confirming rather than assuming.
4. Otherwise, Phase 5 — Optimization: low-end-config performance testing, polygon/texture
   budget, and quality presets. This was intentionally deferred behind Export Pipeline so
   optimization work has a real end-to-end pipeline to optimize *for*, not a standalone
   preview page.
