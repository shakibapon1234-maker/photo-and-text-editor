// 3D Text Module — Phase 3: Animation System
// Scope (per PLAN_2 Phase 3 checklist):
//   - Preset animation library (16 effects + "none" — finalized in the
//     animation-list-finalization pass, see PLAN_2 §6 Open Decisions)
//   - Timeline control (duration, delay, easing)
//   - Preview playback (play/stop, loop toggle, progress readout)
//
// Carries forward everything from Phase 2 (materials/lighting/shadow/
// reflection) unchanged. The animation math itself lives in animations.js as
// plain functions with no `three` dependency — see that file's header for
// why, and README.md "What's tested" for how it was verified this session.

import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import JSZip from 'jszip';

import helvetikerRegular from '../assets/fonts/helvetiker_regular.typeface.json';
import { EASINGS, ANIMATION_PRESETS } from './animations.js';
import { exportWebM, exportPngSequence, isWebMExportSupported } from './export.js';

const statusNote = document.getElementById('statusNote');

// ---------- DOM refs ----------
const canvas = document.getElementById('scene-canvas');
const viewportEl = document.getElementById('viewport');

const contentModeGrid = document.getElementById('contentModeGrid');
const textContentSection = document.getElementById('textContentSection');
const imageContentSection = document.getElementById('imageContentSection');
const textInput = document.getElementById('textInput');
const textModeNote = document.getElementById('textModeNote');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreviewThumb = document.getElementById('imagePreviewThumb');
const imageNote = document.getElementById('imageNote');
const depthRange = document.getElementById('depthRange');
const depthValue = document.getElementById('depthValue');
const sizeRange = document.getElementById('sizeRange');
const sizeValue = document.getElementById('sizeValue');

const rotXRange = document.getElementById('rotXRange');
const rotYRange = document.getElementById('rotYRange');
const rotZRange = document.getElementById('rotZRange');
const rotXValue = document.getElementById('rotXValue');
const rotYValue = document.getElementById('rotYValue');
const rotZValue = document.getElementById('rotZValue');
const autoRotateToggle = document.getElementById('autoRotateToggle');

const colorPicker = document.getElementById('colorPicker');
const materialPresetGrid = document.getElementById('materialPresetGrid');
const lightingPresetGrid = document.getElementById('lightingPresetGrid');
const neonIntensityField = document.getElementById('neonIntensityField');
const neonIntensityRange = document.getElementById('neonIntensityRange');
const neonIntensityValue = document.getElementById('neonIntensityValue');

const shadowToggle = document.getElementById('shadowToggle');
const shadowIntensityField = document.getElementById('shadowIntensityField');
const shadowIntensityRange = document.getElementById('shadowIntensityRange');
const shadowIntensityValue = document.getElementById('shadowIntensityValue');

const reflectionToggle = document.getElementById('reflectionToggle');
const reflectionIntensityField = document.getElementById('reflectionIntensityField');
const reflectionIntensityRange = document.getElementById('reflectionIntensityRange');
const reflectionIntensityValue = document.getElementById('reflectionIntensityValue');

const dragRotateToggle = document.getElementById('dragRotateToggle');
const resetCameraBtn = document.getElementById('resetCameraBtn');

const qualityPresetGrid = document.getElementById('qualityPresetGrid');
const qualityNote = document.getElementById('qualityNote');

const animPresetGrid = document.getElementById('animPresetGrid');
const animDurationRange = document.getElementById('animDurationRange');
const animDurationValue = document.getElementById('animDurationValue');
const animDelayRange = document.getElementById('animDelayRange');
const animDelayValue = document.getElementById('animDelayValue');
const animEasingSelect = document.getElementById('animEasingSelect');
const animLoopToggle = document.getElementById('animLoopToggle');
const animPlayBtn = document.getElementById('animPlayBtn');
const animStopBtn = document.getElementById('animStopBtn');
const animProgressFill = document.getElementById('animProgressFill');
const animProgressLabel = document.getElementById('animProgressLabel');

// Phase 4: export panel
const exportFormatSelect = document.getElementById('exportFormatSelect');
const webmSupportNote = document.getElementById('webmSupportNote');
const exportResolutionSelect = document.getElementById('exportResolutionSelect');
const exportFpsSelect = document.getElementById('exportFpsSelect');
const turntableLengthField = document.getElementById('turntableLengthField');
const turntableLengthRange = document.getElementById('turntableLengthRange');
const turntableLengthValue = document.getElementById('turntableLengthValue');
const turntableNote = document.getElementById('turntableNote');
const exportSourceNote = document.getElementById('exportSourceNote');
const exportBtn = document.getElementById('exportBtn');
const exportProgressFill = document.getElementById('exportProgressFill');
const exportStatusLabel = document.getElementById('exportStatusLabel');
const exportResult = document.getElementById('exportResult');
const exportResultInfo = document.getElementById('exportResultInfo');
const exportDownloadLink = document.getElementById('exportDownloadLink');

// ---------- Three.js core setup ----------
const scene = new THREE.Scene();
scene.background = null; // transparent — export pipeline (Phase 4) will rely on this

const camera = new THREE.PerspectiveCamera(
  45,
  viewportEl.clientWidth / viewportEl.clientHeight,
  0.1,
  2000
);
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 40, 220);
camera.position.copy(DEFAULT_CAMERA_POS);

// ---------- Phase 5: quality presets ----------
// Three tiers trading render fidelity for performance on lower-end hardware.
// "medium" reproduces Phase 1-4's original hardcoded values exactly, so
// picking Medium (the default) changes nothing about how this looked before.
const QUALITY_PRESETS = {
  low: { curveSegments: 2, bevelSegments: 1, shadowMapSize: 512, pixelRatioCap: 1 },
  medium: { curveSegments: 6, bevelSegments: 3, shadowMapSize: 1024, pixelRatioCap: 2 },
  high: { curveSegments: 12, bevelSegments: 6, shadowMapSize: 2048, pixelRatioCap: 2 },
};

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true, // transparent background, needed later for video/PNG export
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY_PRESETS.medium.pixelRatioCap));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

// ---------- environment map (for metallic/glass reflections) ----------
// Generated procedurally (RoomEnvironment) so no external HDRI download is
// needed — keeps this module dependency-free at runtime, same spirit as the
// vendored font below.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- ground plane (shadow catcher only, not visible directly) ----------
const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -70;
ground.receiveShadow = true;
scene.add(ground);

// ---------- lighting rigs ----------
// Three named presets per PLAN_2 Phase 2. Each preset owns its own light set;
// switching presets tears down the previous set and builds the new one, so
// there's never a mix of two rigs' lights left in the scene.
const lights = new THREE.Group();
scene.add(lights);

function clearLights() {
  for (const l of [...lights.children]) {
    lights.remove(l);
    if (l.dispose) l.dispose();
  }
}

function buildLightingPreset(preset) {
  clearLights();

  if (preset === 'studio') {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(120, 150, 200);
    const rim = new THREE.DirectionalLight(0x8fb8ff, 0.5);
    rim.position.set(-150, 80, -120);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(0, -100, 100);
    key.castShadow = true;
    key.shadow.mapSize.set(QUALITY_PRESETS[state.quality].shadowMapSize, QUALITY_PRESETS[state.quality].shadowMapSize);
    key.shadow.camera.near = 50;
    key.shadow.camera.far = 600;
    lights.add(ambient, key, rim, fill);
  } else if (preset === 'dramatic') {
    // Low ambient, one hard strong side light, minimal fill — high contrast.
    const ambient = new THREE.AmbientLight(0xffffff, 0.12);
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-220, 90, 60);
    const rim = new THREE.DirectionalLight(0xff8a4c, 0.6);
    rim.position.set(180, 40, -180);
    key.castShadow = true;
    key.shadow.mapSize.set(QUALITY_PRESETS[state.quality].shadowMapSize, QUALITY_PRESETS[state.quality].shadowMapSize);
    key.shadow.camera.near = 50;
    key.shadow.camera.far = 600;
    lights.add(ambient, key, rim);
  } else if (preset === 'soft') {
    // Diffuse, low-contrast: strong ambient/hemisphere + gentle broad fill.
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3f47, 0.9);
    const fillA = new THREE.DirectionalLight(0xffffff, 0.5);
    fillA.position.set(100, 120, 150);
    const fillB = new THREE.DirectionalLight(0xffffff, 0.35);
    fillB.position.set(-100, 60, -100);
    fillA.castShadow = true;
    fillA.shadow.mapSize.set(QUALITY_PRESETS[state.quality].shadowMapSize, QUALITY_PRESETS[state.quality].shadowMapSize);
    fillA.shadow.radius = 6; // extra-soft shadow edge to match the "soft" mood
    fillA.shadow.camera.near = 50;
    fillA.shadow.camera.far = 600;
    lights.add(hemi, fillA, fillB);
  }

  // Re-apply the current shadow toggle to whatever lights this preset just made.
  applyShadowToggle();
}

// ---------- state ----------
let font = null;
let textMesh = null;
const state = {
  contentMode: 'text', // §8.2: 'text' | 'image' — mutually exclusive, one active object at a time
  imageElement: null, // HTMLImageElement of the uploaded photo, null until one is chosen
  text: textInput.value,
  depth: Number(depthRange.value),
  size: Number(sizeRange.value),
  rotX: Number(rotXRange.value),
  rotY: Number(rotYRange.value),
  rotZ: Number(rotZRange.value),
  color: colorPicker.value,
  materialType: 'glossy',
  lightingPreset: 'studio',
  neonIntensity: Number(neonIntensityRange.value),
  shadowsOn: shadowToggle.checked,
  shadowIntensity: Number(shadowIntensityRange ? shadowIntensityRange.value : 0.35),
  reflectionsOn: reflectionToggle.checked,
  reflectionIntensity: Number(reflectionIntensityRange ? reflectionIntensityRange.value : 1.2),
  dragRotateOn: dragRotateToggle ? dragRotateToggle.checked : false,
  autoRotate: false,
  quality: 'medium', // Phase 5: low/medium/high — medium = old fixed behavior
};

// Phase 3: playback state, separate from `state` above since it describes
// *how the mesh is being previewed right now*, not a persistent text/material
// setting. `presetId` picks a function from ANIMATION_PRESETS; duration/delay
// are in ms; easing is a key into EASINGS.
const animState = {
  presetId: 'none',
  durationMs: Number(animDurationRange.value),
  delayMs: Number(animDelayRange.value),
  easing: animEasingSelect.value,
  loop: false,
  playing: false,
  startTime: 0,
};

function getBaseOpacity() {
  // Mirrors buildMaterial(): every preset is fully opaque except glass, which
  // is deliberately semi-transparent (see buildMaterial's "glass" case for
  // why real opacity is used instead of transmission).
  return state.materialType === 'glass' ? 0.55 : 1;
}

// ---------- material presets (Phase 2: 5 presets) ----------
function buildMaterial(type, colorHex) {
  const color = new THREE.Color(colorHex);
  const refIntensity = state.reflectionsOn ? state.reflectionIntensity : 0;

  switch (type) {
    case 'matte':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        metalness: 0.0,
        envMapIntensity: refIntensity * 0.2,
      });

    case 'glossy':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.22,
        metalness: 0.35,
        envMapIntensity: refIntensity * 0.8,
      });

    case 'metallic':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.18,
        metalness: 1.0,
        envMapIntensity: refIntensity * 1.2,
      });

    case 'glass':
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.02,
        roughness: 0.04,
        transmission: 0.88,
        thickness: 25,
        ior: 1.52,
        transparent: true,
        opacity: 0.95,
        envMapIntensity: refIntensity * 1.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        depthWrite: true,
      });

    case 'neon': {
      const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        roughness: 0.08,
        metalness: 0.1,
        emissive: color,
        emissiveIntensity: state.neonIntensity,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: refIntensity * 0.5,
      });
      return mat;
    }

    default:
      return new THREE.MeshStandardMaterial({ color });
  }
}

// ---------- Bangla support (this session, PLAN_2 §8.1) ----------
// `TextGeometry` extrudes glyph outlines from a Three.js typeface-JSON font,
// which is fine for Latin (helvetiker) but wrong for Bangla: (1) the vendored
// fonts have no Bengali glyphs at all, and (2) even with a Bengali font,
// TextGeometry's glyph pipeline doesn't handle complex-script shaping
// (juktakkhor/conjuncts, matra/kar positioning) — so per-character extrusion
// would render broken/disconnected shapes even with the right font data.
//
// Chosen fix = plan §8.1 option 3 (hybrid canvas-texture card), NOT option 1
// (vendor a Bengali typeface-JSON) or option 2 (switch to troika-three-text):
//   - Option 1 was rejected because TextGeometry's shaping limitation (2)
//     above would remain even with a correct font file.
//   - Option 2 was rejected for this pass because troika doesn't give true
//     extrude/depth out of the box, and swapping the text engine would touch
//     every existing Latin-text code path (materials, animation, export) —
//     much larger blast radius than adding a second, isolated render path.
//   - Option 3 draws the line(s) into an offscreen 2D <canvas> using the
//     *browser's own* text shaping (correct for Bangla, or any script, by
//     construction — it's the same engine that renders the <textarea> above)
//     and maps that as a texture onto an extruded card (BoxGeometry). This
//     keeps every existing material/animation/export code path working
//     unchanged, because the result is still just a Group containing
//     mesh(es) with a `.rotation`/`.position`/`.material`.
//
// Trade-off (documented up front, not discovered later): this is a flat
// card with depth, not per-letter extrusion — the depth "wall" is the
// card's rectangular edge, not each glyph's silhouette. That matches what
// §8.1 option 3 describes ("extruded plane/shape"), not what Latin text
// currently does. Latin text is completely unaffected — it still uses the
// original per-glyph TextGeometry path.
const BANGLA_RANGE = /[\u0980-\u09FF]/;
function isBanglaText(str) {
  return BANGLA_RANGE.test(str);
}

const CANVAS_TEXT_FONT_STACK =
  '"Noto Sans Bengali","Nirmala UI","Vrinda UI","Vrinda","Kalpurush","Siyam Rupali","Bangla Sans UI","Segoe UI",sans-serif';
const CANVAS_TEXT_FONT_PX = 220; // supersampled resolution, independent of world-space size
const CANVAS_TEXT_LINE_HEIGHT_PX = CANVAS_TEXT_FONT_PX * 1.35;
const CANVAS_TEXT_PAD_PX = CANVAS_TEXT_FONT_PX * 0.35;

// Draws all lines onto one offscreen canvas (white glyphs on a transparent
// background) and returns it plus its aspect ratio. Using the *real* browser
// text-layout engine here is the entire point — it's what makes Bangla
// (or Arabic, Devanagari, emoji, anything) come out correctly shaped without
// this module needing to know anything about any specific script.
function drawCanvasTextTexture(lines) {
  const measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = `600 ${CANVAS_TEXT_FONT_PX}px ${CANVAS_TEXT_FONT_STACK}`;
  const maxWidthPx = Math.max(1, ...lines.map((l) => measureCtx.measureText(l).width));

  const canvasW = Math.ceil(maxWidthPx + CANVAS_TEXT_PAD_PX * 2);
  const canvasH = Math.ceil(CANVAS_TEXT_LINE_HEIGHT_PX * lines.length + CANVAS_TEXT_PAD_PX * 2);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${CANVAS_TEXT_FONT_PX}px ${CANVAS_TEXT_FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    const y = CANVAS_TEXT_PAD_PX + CANVAS_TEXT_LINE_HEIGHT_PX * i + CANVAS_TEXT_LINE_HEIGHT_PX / 2;
    ctx.fillText(line, canvasW / 2, y);
  });

  return { canvas, aspect: canvasW / canvasH };
}

function makeCardTexture(canvas, mirrored) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (mirrored) {
    // Back face of the card: mirror horizontally so text reads correctly
    // (not backwards) if the user rotates the card around.
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = -1;
    tex.offset.x = 1;
  }
  tex.needsUpdate = true;
  return tex;
}

// BoxGeometry material slot order is [+x, -x, +y, -y, +z, -z]. Front (+z,
// facing the default camera) and back (-z) get the text texture as `.map`
// with alphaTest so background pixels are fully discarded (no
// transparency-sorting artifacts); the 4 side slots get a plain material of
// the current preset, standing in for the card's extruded edge.
function buildCanvasCardMaterials(frontTex, backTex) {
  const sideMat = buildMaterial(state.materialType, state.color);

  const frontMat = buildMaterial(state.materialType, state.color);
  frontMat.map = frontTex;
  frontMat.transparent = true;
  frontMat.alphaTest = 0.4;
  frontMat.needsUpdate = true;

  const backMat = buildMaterial(state.materialType, state.color);
  backMat.map = backTex;
  backMat.transparent = true;
  backMat.alphaTest = 0.4;
  backMat.needsUpdate = true;

  return [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
}

// ---------- 3D image support (PLAN_2 §8.2) ----------
// Reuses the exact same "canvas-texture card" plumbing §8.1 built for Bangla
// text (drawCanvasTextTexture → makeCardTexture → buildCanvasCardMaterials →
// a BoxGeometry with 6 materials): draw source content onto an offscreen
// <canvas>, wrap it as a CanvasTexture on the front/back faces of an
// extruded box, and let the 4 side faces carry the current material preset
// as the card's "edge". For an uploaded photo the "drawing" step is just
// `ctx.drawImage()` instead of `ctx.fillText()`, downscaled to the active
// quality preset's texture cap first (see IMAGE_TEXTURE_MAX_PX below — this
// resolves the §8.2 "large image performance" open question: polygon count
// never changes, only the texture's pixel budget does). Because the result
// is, again, just a Group of mesh(es) with position/rotation/material, every
// existing Rotate/Material/Shadow/Reflection/Animation/Export code path
// keeps working unmodified — none of them are told or care whether the
// active object is text or an image.
const IMAGE_TEXTURE_MAX_PX = { low: 512, medium: 1024, high: 2048 };

function drawImageCardCanvas(img) {
  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;
  const maxDim = IMAGE_TEXTURE_MAX_PX[state.quality] || IMAGE_TEXTURE_MAX_PX.medium;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return { canvas, aspect: srcW / srcH };
}

function buildImageCardMesh(img) {
  const { canvas, aspect } = drawImageCardCanvas(img);
  // Unlike the Bangla text card, an uploaded photo reads the same forwards
  // or mirrored (there's no glyph direction to preserve), so both faces use
  // the same un-mirrored texture — cheaper than the text path's two
  // separately-drawn canvases and visually correct either way.
  const frontTex = makeCardTexture(canvas, false);
  const backTex = makeCardTexture(canvas, false);

  const worldHeight = state.size * 1.6; // roughly matches a single line of 3D text at the same `size`
  const worldWidth = worldHeight * aspect;
  const depth = Math.max(1, state.depth);

  const geometry = new THREE.BoxGeometry(worldWidth, worldHeight, depth);
  const materials = buildCanvasCardMaterials(frontTex, backTex);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = state.shadowsOn;
  mesh.receiveShadow = state.shadowsOn;

  const group = new THREE.Group();
  group.add(mesh);
  group.userData.frontTex = frontTex;
  group.userData.backTex = backTex;

  // Reuses the 'canvas' renderMode tag (not a new 'image' tag) — applyMaterial()
  // only needs to know "is this mesh's `.material` an array of 6 [side,side,
  // side,side,front,back] materials or a single material", and that's exactly
  // what renderMode already distinguishes. A photo card and a Bangla text card
  // are structurally identical Three.js objects.
  renderMode = 'canvas';
  textMesh = group;
  textMesh.material = materials;
}

// ---------- text mesh (re)build ----------
let renderMode = 'vector'; // 'vector' (TextGeometry, Latin) | 'canvas' (Bangla card / §8.2 image card)

function disposeTextMesh() {
  if (!textMesh) return;
  scene.remove(textMesh);
  if (textMesh.userData) {
    if (textMesh.userData.frontTex) textMesh.userData.frontTex.dispose();
    if (textMesh.userData.backTex) textMesh.userData.backTex.dispose();
  }
  textMesh.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
  });
  textMesh = null;
}

function buildVectorTextMesh(validLines) {
  const q = QUALITY_PRESETS[state.quality];
  const lineHeight = state.size * 1.35;

  const group = new THREE.Group();
  const material = buildMaterial(state.materialType, state.color);

  const totalLinesHeight = (validLines.length - 1) * lineHeight;

  validLines.forEach((lineStr, idx) => {
    const hasText = lineStr.trim().length > 0;
    const content = hasText ? lineStr : ' ';

    const geometry = new TextGeometry(content, {
      font,
      size: state.size,
      depth: state.depth,
      curveSegments: q.curveSegments,
      bevelEnabled: true,
      bevelThickness: Math.max(1, state.depth * 0.06),
      bevelSize: Math.max(0.5, state.depth * 0.03),
      bevelSegments: q.bevelSegments,
    });

    geometry.computeBoundingBox();
    if (hasText && geometry.boundingBox && !isNaN(geometry.boundingBox.min.x)) {
      geometry.center();
    }

    const lineMesh = new THREE.Mesh(geometry, material);
    lineMesh.castShadow = state.shadowsOn;
    lineMesh.receiveShadow = state.shadowsOn;

    // Vertical placement: centered around Y = 0
    lineMesh.position.y = (totalLinesHeight / 2) - (idx * lineHeight);

    group.add(lineMesh);
  });

  renderMode = 'vector';
  textMesh = group;
  textMesh.material = material;
}

function buildCanvasCardTextMesh(validLines) {
  const { canvas, aspect } = drawCanvasTextTexture(validLines);
  const frontTex = makeCardTexture(canvas, false);
  const backTex = makeCardTexture(canvas, true);

  const lineHeight = state.size * 1.35;
  const worldHeight = lineHeight * validLines.length + state.size * 0.5; // pad to roughly match canvas padding
  const worldWidth = worldHeight * aspect;
  const depth = Math.max(1, state.depth);

  const geometry = new THREE.BoxGeometry(worldWidth, worldHeight, depth);
  const materials = buildCanvasCardMaterials(frontTex, backTex);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = state.shadowsOn;
  mesh.receiveShadow = state.shadowsOn;

  const group = new THREE.Group();
  group.add(mesh);
  group.userData.frontTex = frontTex;
  group.userData.backTex = backTex;

  renderMode = 'canvas';
  textMesh = group;
  textMesh.material = materials;
}

function rebuildTextMesh() {
  // §8.2: image mode builds/rebuilds a photo card instead of a text mesh —
  // completely separate branch from the text paths below, but converges on
  // the same `textMesh` variable + applyRotation()/scene.add() tail, since
  // that's the "current active object" every other panel (material, shadow,
  // animation, export) already reads from.
  if (state.contentMode === 'image') {
    disposeTextMesh();
    if (!state.imageElement) {
      updateQualityNote();
      updateTextModeNote(false);
      return; // nothing uploaded yet — leave the scene empty, same as an empty text field
    }
    buildImageCardMesh(state.imageElement);
    applyRotation();
    scene.add(textMesh);
    updateQualityNote();
    updateTextModeNote(false);
    return;
  }

  if (!font) return; // font still loading

  disposeTextMesh();

  const rawContent = state.text || ' ';
  const lines = rawContent.split(/\r?\n/);
  const validLines = lines.map((l) => (l.length > 0 ? l : ' '));

  if (isBanglaText(rawContent)) {
    buildCanvasCardTextMesh(validLines);
  } else {
    buildVectorTextMesh(validLines);
  }

  applyRotation();
  scene.add(textMesh);
  updateQualityNote();
  updateTextModeNote(isBanglaText(rawContent));
}

// ---------- Phase 5: quality preset apply + readout ----------
// Rebuilds whatever is quality-dependent: pixel ratio cap, shadow map
// resolution (via a lighting-rig rebuild, which re-reads QUALITY_PRESETS),
// and geometry segment counts (via a text-mesh rebuild). Shadow/reflection
// toggle state is preserved because buildLightingPreset() re-applies it.
function applyQuality() {
  const q = QUALITY_PRESETS[state.quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatioCap));
  buildLightingPreset(state.lightingPreset);
  rebuildTextMesh(); // also calls updateQualityNote()
}

function updateQualityNote() {
  if (!qualityNote) return;
  const q = QUALITY_PRESETS[state.quality];
  let triCount = 0;
  if (textMesh) {
    textMesh.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry;
        const posCount = geo.attributes.position ? geo.attributes.position.count : 0;
        triCount += Math.round(geo.index ? geo.index.count / 3 : posCount / 3);
      }
    });
  }
  const triLabel = triCount > 0 ? triCount.toLocaleString('bn-BD') : '—';
  qualityNote.textContent =
    `বর্তমান: ~${triLabel} ট্রায়াঙ্গেল, পিক্সেল-রেশিও সর্বোচ্চ ${q.pixelRatioCap}x, শ্যাডো ম্যাপ ${q.shadowMapSize}px। ` +
    `লো-এন্ড ডিভাইস/কম-শক্তির পিসিতে ল্যাগ হলে "Low" বেছে নিন।`;
}

function updateTextModeNote(isBangla) {
  if (!textModeNote) return;
  textModeNote.textContent = isBangla
    ? 'বাংলা লেখা শনাক্ত হয়েছে — ছবি-টেক্সচার কার্ড মোডে রেন্ডার হচ্ছে (ব্রাউজারের নিজস্ব বাংলা ফন্ট/শেপিং ব্যবহার করে, তাই যুক্তাক্ষর/মাত্রা ঠিকভাবে বসে), বাক্যের প্রান্ত থেকে গভীরতা বের হয় — আলাদা আলাদা অক্ষরের কিনারা থেকে না।'
    : '';
  textModeNote.hidden = !isBangla;
}

function applyRotation() {
  if (!textMesh) return;
  textMesh.rotation.set(
    THREE.MathUtils.degToRad(state.rotX),
    THREE.MathUtils.degToRad(state.rotY),
    THREE.MathUtils.degToRad(state.rotZ)
  );
}

function applyMaterial() {
  if (!textMesh) return;

  if (renderMode === 'canvas') {
    // Multi-material box (front/back textured faces + plain side faces) —
    // rebuild the material array from the cached textures rather than the
    // single-material clone-per-mesh logic below, which doesn't apply to a
    // mesh whose `.material` is an array.
    const mesh = textMesh.children[0];
    if (!mesh) return;
    const old = mesh.material;
    const materials = buildCanvasCardMaterials(textMesh.userData.frontTex, textMesh.userData.backTex);
    mesh.material = materials;
    textMesh.material = materials;
    if (Array.isArray(old)) old.forEach((m) => m.dispose());
    return;
  }

  const newMat = buildMaterial(state.materialType, state.color);
  textMesh.material = newMat;
  textMesh.traverse((child) => {
    if (child.isMesh) {
      const old = child.material;
      child.material = newMat.clone ? newMat.clone() : newMat;
      if (old && old.dispose) old.dispose();
    }
  });
}

function applyShadowToggle() {
  ground.visible = state.shadowsOn;
  groundMat.opacity = state.shadowsOn ? state.shadowIntensity : 0;
  if (textMesh) {
    textMesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = state.shadowsOn;
        child.receiveShadow = state.shadowsOn;
      }
    });
  }
  for (const l of lights.children) {
    if (l.isDirectionalLight) l.castShadow = state.shadowsOn;
  }
}

function applyReflectionToggle() {
  scene.environment = state.reflectionsOn ? envTexture : null;
  applyMaterial(); // rebuild material so envMapIntensity picks up the new state
}

// ---------- Phase 3: animation playback ----------
// `applyPresetOffset` is the single place that turns a preset's {pos, rot,
// scaleMul, opacityMul} into an actual mesh transform. It always layers the
// offset on TOP of the current slider-configured base rotation (state.rotX/Y/Z),
// so rotating the mesh manually while a preset is selected changes what the
// animation lands on, not just its starting pose.
function applyPresetOffset(preset, t) {
  if (!textMesh) return;
  const { pos, rot, scaleMul, opacityMul } = preset.apply(t);

  textMesh.position.set(pos[0], pos[1], pos[2]);
  textMesh.rotation.set(
    THREE.MathUtils.degToRad(state.rotX) + rot[0],
    THREE.MathUtils.degToRad(state.rotY) + rot[1],
    THREE.MathUtils.degToRad(state.rotZ) + rot[2]
  );

  const s = Math.max(0, scaleMul);
  textMesh.scale.set(s, s, s);

  const baseOpacity = getBaseOpacity();
  const finalOpacity = Math.min(1, Math.max(0, opacityMul)) * baseOpacity;
  textMesh.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((m) => {
        m.transparent = true;
        m.opacity = finalOpacity;
      });
    }
  });
}

function resetMeshToBaseTransform() {
  if (!textMesh) return;
  textMesh.position.set(0, 0, 0);
  textMesh.scale.set(1, 1, 1);
  applyRotation();
  const baseOpacity = getBaseOpacity();
  textMesh.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((m) => {
        // Canvas-card front/back faces (identified by having a `.map`) rely
        // on alphaTest to cut out the background, so they must always stay
        // transparent — unlike vector-mode/side materials, which are only
        // transparent for the glass preset.
        m.transparent = m.map ? true : state.materialType === 'glass';
        m.opacity = baseOpacity;
      });
    }
  });
}

function updateProgressUI(t, label) {
  animProgressFill.style.width = `${Math.round(Math.min(1, Math.max(0, t)) * 100)}%`;
  if (label !== undefined) animProgressLabel.textContent = label;
}

function playAnimation() {
  if (!textMesh || animState.presetId === 'none') return;
  animState.playing = true;
  animState.startTime = performance.now();
  animPlayBtn.textContent = 'রিস্টার্ট';
  updateProgressUI(0, 'প্লে হচ্ছে…');
}

function stopAnimation() {
  animState.playing = false;
  animPlayBtn.textContent = 'প্লে';
  resetMeshToBaseTransform();
  updateProgressUI(0, 'বন্ধ');
}

// Called once per rendered frame (from the main render loop below) with the
// same high-res timestamp requestAnimationFrame hands to that loop.
function tickAnimation(now) {
  if (!animState.playing || !textMesh) return;
  const preset = ANIMATION_PRESETS[animState.presetId] || ANIMATION_PRESETS.none;
  const elapsed = now - animState.startTime - animState.delayMs;

  if (elapsed < 0) {
    applyPresetOffset(preset, 0); // hold at the entrance pose during the delay
    return;
  }

  let rawT = animState.durationMs > 0 ? elapsed / animState.durationMs : 1;

  if (rawT >= 1) {
    if (animState.loop) {
      animState.startTime = now; // re-enter, including the delay window again
      applyPresetOffset(preset, 0);
      updateProgressUI(0, 'লুপ চলছে…');
      return;
    }
    applyPresetOffset(preset, 1);
    updateProgressUI(1, 'শেষ');
    animState.playing = false;
    animPlayBtn.textContent = 'প্লে';
    return;
  }

  const easingFn = EASINGS[animState.easing] || EASINGS.linear;
  applyPresetOffset(preset, easingFn(rawT));
  updateProgressUI(rawT, 'প্লে হচ্ছে…');
}

// ---------- UI: preset button active-state helper ----------
function setActivePreset(grid, datasetKey, value) {
  for (const btn of grid.querySelectorAll('.preset-btn')) {
    btn.classList.toggle('active', btn.dataset[datasetKey] === value);
  }
}

// ---------- font load (bundled JSON, no network fetch at runtime) ----------
const loader = new FontLoader();
font = loader.parse(helvetikerRegular);
statusNote.textContent = 'রেডি';
rebuildTextMesh();

// ---------- resize ----------
function handleResize() {
  const w = viewportEl.clientWidth;
  const h = viewportEl.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', handleResize);
handleResize();

// ---------- UI wiring ----------
let rebuildTimer = null;
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuildTextMesh, 120); // debounce so typing stays smooth
}

textInput.addEventListener('input', () => {
  state.text = textInput.value;
  scheduleRebuild();
});

// ---------- §8.2: content-type toggle (text vs image) ----------
contentModeGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.contentMode = btn.dataset.content;
  setActivePreset(contentModeGrid, 'content', state.contentMode);
  textContentSection.hidden = state.contentMode !== 'text';
  imageContentSection.hidden = state.contentMode !== 'image';
  stopAnimation(); // switching the active object mid-playback would animate a stale mesh
  rebuildTextMesh();
  updateExportSourceNote();
});

// ---------- §8.2: image upload ----------
imageFileInput.addEventListener('change', () => {
  const file = imageFileInput.files && imageFileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    imageNote.textContent = 'শুধু ইমেজ ফাইল সাপোর্টেড (JPG/PNG/WebP ইত্যাদি)।';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.imageElement = img;
      imagePreviewThumb.src = reader.result;
      imagePreviewThumb.hidden = false;
      const capPx = IMAGE_TEXTURE_MAX_PX[state.quality];
      imageNote.textContent =
        `${file.name} — মূল ${img.naturalWidth}×${img.naturalHeight}px, ` +
        `বর্তমান কোয়ালিটি প্রিসেট অনুযায়ী টেক্সচার সর্বোচ্চ ${capPx}px-এ ব্যবহার হবে।`;
      rebuildTextMesh();
    };
    img.onerror = () => {
      imageNote.textContent = 'ছবিটা লোড করা যায়নি — ফাইলটা কি ঠিক আছে দেখুন।';
    };
    img.src = reader.result;
  };
  reader.onerror = () => {
    imageNote.textContent = 'ফাইলটা পড়া যায়নি।';
  };
  reader.readAsDataURL(file);
});

depthRange.addEventListener('input', () => {
  state.depth = Number(depthRange.value);
  depthValue.textContent = state.depth;
  scheduleRebuild();
});

sizeRange.addEventListener('input', () => {
  state.size = Number(sizeRange.value);
  sizeValue.textContent = state.size;
  scheduleRebuild();
});

rotXRange.addEventListener('input', () => {
  state.rotX = Number(rotXRange.value);
  rotXValue.textContent = `${state.rotX}°`;
  applyRotation();
});
rotYRange.addEventListener('input', () => {
  state.rotY = Number(rotYRange.value);
  rotYValue.textContent = `${state.rotY}°`;
  applyRotation();
});
rotZRange.addEventListener('input', () => {
  state.rotZ = Number(rotZRange.value);
  rotZValue.textContent = `${state.rotZ}°`;
  applyRotation();
});

autoRotateToggle.addEventListener('change', () => {
  state.autoRotate = autoRotateToggle.checked;
  updateExportSourceNote();
});

colorPicker.addEventListener('input', () => {
  state.color = colorPicker.value;
  applyMaterial();
});

materialPresetGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.materialType = btn.dataset.material;
  setActivePreset(materialPresetGrid, 'material', state.materialType);
  neonIntensityField.hidden = state.materialType !== 'neon';
  applyMaterial();
});

neonIntensityRange.addEventListener('input', () => {
  state.neonIntensity = Number(neonIntensityRange.value);
  neonIntensityValue.textContent = state.neonIntensity.toFixed(1);
  if (state.materialType === 'neon') applyMaterial();
});

lightingPresetGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.lightingPreset = btn.dataset.lighting;
  setActivePreset(lightingPresetGrid, 'lighting', state.lightingPreset);
  buildLightingPreset(state.lightingPreset);
});

shadowToggle.addEventListener('change', () => {
  state.shadowsOn = shadowToggle.checked;
  applyShadowToggle();
});

shadowIntensityRange.addEventListener('input', () => {
  state.shadowIntensity = Number(shadowIntensityRange.value);
  shadowIntensityValue.textContent = state.shadowIntensity.toFixed(2);
  applyShadowToggle();
});

reflectionToggle.addEventListener('change', () => {
  state.reflectionsOn = reflectionToggle.checked;
  applyReflectionToggle();
});

reflectionIntensityRange.addEventListener('input', () => {
  state.reflectionIntensity = Number(reflectionIntensityRange.value);
  reflectionIntensityValue.textContent = state.reflectionIntensity.toFixed(1);
  applyReflectionToggle();
});

// ---------- Direct Drag Pointer Rotation ----------
let isPointerDragging = false;
let previousPointerPos = { x: 0, y: 0 };

viewportEl.addEventListener('pointerdown', (e) => {
  if (!state.dragRotateOn) return;
  isPointerDragging = true;
  previousPointerPos = { x: e.clientX, y: e.clientY };
  controls.enabled = false;
  try { viewportEl.setPointerCapture(e.pointerId); } catch (_) {}
});

viewportEl.addEventListener('pointermove', (e) => {
  if (!isPointerDragging || !state.dragRotateOn) return;
  const deltaX = e.clientX - previousPointerPos.x;
  const deltaY = e.clientY - previousPointerPos.y;
  previousPointerPos = { x: e.clientX, y: e.clientY };

  let newRotY = (state.rotY + deltaX * 0.5) % 360;
  if (newRotY > 180) newRotY -= 360;
  if (newRotY < -180) newRotY += 360;

  let newRotX = (state.rotX + deltaY * 0.5) % 360;
  if (newRotX > 180) newRotX -= 360;
  if (newRotX < -180) newRotX += 360;

  state.rotX = Math.round(newRotX);
  state.rotY = Math.round(newRotY);

  rotXRange.value = state.rotX;
  rotXValue.textContent = `${state.rotX}°`;
  rotYRange.value = state.rotY;
  rotYValue.textContent = `${state.rotY}°`;

  applyRotation();
});

const stopPointerDrag = (e) => {
  if (isPointerDragging) {
    isPointerDragging = false;
    controls.enabled = true;
    try { viewportEl.releasePointerCapture(e.pointerId); } catch (_) {}
  }
};
viewportEl.addEventListener('pointerup', stopPointerDrag);
viewportEl.addEventListener('pointercancel', stopPointerDrag);

dragRotateToggle.addEventListener('change', () => {
  state.dragRotateOn = dragRotateToggle.checked;
  viewportEl.style.cursor = state.dragRotateOn ? 'grab' : 'default';
});

resetCameraBtn.addEventListener('click', () => {
  if (!textMesh) {
    camera.position.copy(DEFAULT_CAMERA_POS);
    controls.target.set(0, 0, 0);
    controls.update();
    return;
  }
  const box = new THREE.Box3().setFromObject(textMesh);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 10);
  const fovRad = camera.fov * (Math.PI / 180);
  let dist = (maxDim / 2) / Math.tan(fovRad / 2) * 1.4;
  dist = Math.max(80, Math.min(3500, dist));
  camera.position.set(0, size.y * 0.1, dist);
  controls.target.set(0, 0, 0);
  controls.update();
});

qualityPresetGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.quality = btn.dataset.quality;
  setActivePreset(qualityPresetGrid, 'quality', state.quality);
  applyQuality();
});

// ---------- Phase 3: animation panel wiring ----------
animPresetGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  animState.presetId = btn.dataset.anim;
  setActivePreset(animPresetGrid, 'anim', animState.presetId);
  const isNone = animState.presetId === 'none';
  animPlayBtn.disabled = isNone;
  if (isNone) stopAnimation();
  updateExportSourceNote();
});

animDurationRange.addEventListener('input', () => {
  animState.durationMs = Number(animDurationRange.value);
  animDurationValue.textContent = `${(animState.durationMs / 1000).toFixed(1)}s`;
  updateExportSourceNote();
});

animDelayRange.addEventListener('input', () => {
  animState.delayMs = Number(animDelayRange.value);
  animDelayValue.textContent = `${(animState.delayMs / 1000).toFixed(1)}s`;
  updateExportSourceNote();
});

animEasingSelect.addEventListener('change', () => {
  animState.easing = animEasingSelect.value;
});

animLoopToggle.addEventListener('change', () => {
  animState.loop = animLoopToggle.checked;
});

animPlayBtn.addEventListener('click', playAnimation);
animStopBtn.addEventListener('click', stopAnimation);

// ---------- Phase 4: export panel wiring ----------
// A fully static shot (no anim preset, no auto-rotate) still needs *some*
// clip length for the WebM path (a 0-length recording is meaningless); the
// PNG path handles the same case by exporting a single frame instead (see
// export.js). Not user-configurable — keeping this one fixed avoids adding
// a slider that's only relevant in the least useful of the three source
// modes (static/turntable/animated).
const STATIC_WEBM_MS = 3000;

let lastExportUrl = null;

function currentExportSourceMode() {
  if (animState.presetId !== 'none') return 'animated';
  if (state.autoRotate) return 'turntable';
  return 'static';
}

function updateExportSourceNote() {
  const mode = currentExportSourceMode();
  turntableLengthField.hidden = mode !== 'turntable';
  turntableNote.hidden = mode !== 'turntable';

  if (mode === 'animated') {
    const totalS = ((animState.delayMs + animState.durationMs) / 1000).toFixed(1);
    const label = (ANIMATION_PRESETS[animState.presetId] || {}).label || animState.presetId;
    exportSourceNote.textContent = `সোর্স: অ্যানিমেশন প্যানেল অনুযায়ী — "${label}" (মোট ${totalS}s, delay+duration)`;
  } else if (mode === 'turntable') {
    const totalS = (Number(turntableLengthRange.value) / 1000).toFixed(1);
    exportSourceNote.textContent = `সোর্স: অটো-রোটেট টার্নটেবল (৩৬০°, ${totalS}s)`;
  } else if (exportFormatSelect.value === 'png') {
    exportSourceNote.textContent = 'সোর্স: স্থির (কোনো অ্যানিমেশন/অটো-রোটেট নেই) — ১টা PNG ফ্রেম এক্সপোর্ট হবে';
  } else {
    exportSourceNote.textContent = `সোর্স: স্থির (কোনো অ্যানিমেশন/অটো-রোটেট নেই) — ${(STATIC_WEBM_MS / 1000).toFixed(1)}s-এর স্থির ভিডিও এক্সপোর্ট হবে`;
  }
}

function updateWebmSupportNote() {
  const supported = isWebMExportSupported();
  webmSupportNote.hidden = supported || exportFormatSelect.value !== 'webm';
  exportBtn.disabled = exportFormatSelect.value === 'webm' && !supported;
}

function updateExportProgress(t, label) {
  exportProgressFill.style.width = `${Math.round(Math.min(1, Math.max(0, t)) * 100)}%`;
  if (label !== undefined) exportStatusLabel.textContent = label;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

exportFormatSelect.addEventListener('change', () => {
  updateWebmSupportNote();
  updateExportSourceNote();
});

turntableLengthRange.addEventListener('input', () => {
  turntableLengthValue.textContent = `${(Number(turntableLengthRange.value) / 1000).toFixed(1)}s`;
  updateExportSourceNote();
});

exportBtn.addEventListener('click', async () => {
  // §8.2: image mode with nothing uploaded yet has no active mesh — nothing
  // meaningful to export (an all-transparent clip), so bail with a status
  // note instead of silently producing an empty file.
  if (!textMesh) {
    updateExportProgress(0, 'কোনো অ্যাক্টিভ অবজেক্ট নেই — আগে টেক্সট লিখুন বা ছবি আপলোড করুন।');
    return;
  }

  // Stop any running preview playback first: export.js drives animState
  // directly (WebM path) or reads the mesh/preset state directly (PNG
  // path), and either would race against the main render loop's own
  // tickAnimation() call if a preview loop were still playing.
  stopAnimation();

  if (lastExportUrl) {
    URL.revokeObjectURL(lastExportUrl);
    lastExportUrl = null;
  }
  exportResult.hidden = true;
  exportBtn.disabled = true;
  document.body.classList.add('is-exporting');
  updateExportProgress(0, 'শুরু হচ্ছে…');

  const [width, height] = exportResolutionSelect.value.split('x').map(Number);
  const fps = Number(exportFpsSelect.value);
  const format = exportFormatSelect.value;
  const mode = currentExportSourceMode();

  const opts = {
    width,
    height,
    fps,
    presetId: animState.presetId,
    durationMs: animState.durationMs,
    delayMs: animState.delayMs,
    easing: animState.easing,
    autoRotate: mode === 'turntable',
    noPresetDurationMs:
      mode === 'turntable'
        ? Number(turntableLengthRange.value)
        : format === 'webm'
          ? STATIC_WEBM_MS
          : 0,
  };

  const deps = {
    renderer,
    camera,
    canvas,
    scene,
    state,
    animState,
    ANIMATION_PRESETS,
    EASINGS,
    getTextMesh: () => textMesh,
    applyPresetOffset,
    resetMeshToBaseTransform,
    handleResize,
    JSZip,
  };

  try {
    const callbacks = {
      onProgress: (t) => updateExportProgress(t, exportStatusLabel.textContent),
      onStatus: (label) => updateExportProgress(
        Number(exportProgressFill.style.width.replace('%', '')) / 100 || 0,
        label
      ),
    };

    const result =
      format === 'webm'
        ? await exportWebM(deps, opts, callbacks)
        : await exportPngSequence(deps, opts, callbacks);

    const ext = format === 'webm' ? 'webm' : 'zip';
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `3d-text-export-${stamp}.${ext}`;

    lastExportUrl = URL.createObjectURL(result.blob);
    exportDownloadLink.href = lastExportUrl;
    exportDownloadLink.download = filename;

    const sizeLabel = formatBytes(result.blob.size);
    exportResultInfo.textContent =
      format === 'webm'
        ? `${filename} — ${sizeLabel}, ${result.width}×${result.height}, ${(result.durationMs / 1000).toFixed(1)}s`
        : `${filename} — ${sizeLabel}, ${result.frameCount}টা ফ্রেম, ${result.width}×${result.height}`;
    exportResult.hidden = false;
    updateExportProgress(1, 'শেষ — ডাউনলোড করুন');

    // Auto-trigger the download once, same as any normal browser download —
    // the link above stays live afterward in case it's dismissed/lost.
    exportDownloadLink.click();
  } catch (err) {
    console.error('Export failed:', err);
    updateExportProgress(0, `এরর: ${err.message || err}`);
  } finally {
    exportBtn.disabled = exportFormatSelect.value === 'webm' && !isWebMExportSupported();
    document.body.classList.remove('is-exporting');
  }
});

// ---------- initial preset UI state ----------
setActivePreset(contentModeGrid, 'content', state.contentMode);
setActivePreset(materialPresetGrid, 'material', state.materialType);
setActivePreset(lightingPresetGrid, 'lighting', state.lightingPreset);
setActivePreset(animPresetGrid, 'anim', animState.presetId);
setActivePreset(qualityPresetGrid, 'quality', state.quality);
animPlayBtn.disabled = animState.presetId === 'none';
buildLightingPreset(state.lightingPreset);
scene.environment = state.reflectionsOn ? envTexture : null;
updateWebmSupportNote();
updateExportSourceNote();

// ---------- render loop ----------
function animate(now) {
  requestAnimationFrame(animate);
  if (animState.playing) {
    tickAnimation(now);
  } else if (state.autoRotate && textMesh) {
    textMesh.rotation.y += 0.008;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();
