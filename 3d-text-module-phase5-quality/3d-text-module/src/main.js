// 3D Text Module — Phase 3: Animation System
// Scope (per PLAN_2 Phase 3 checklist):
//   - Preset animation library (8 effects + "none")
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

const textInput = document.getElementById('textInput');
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
const reflectionToggle = document.getElementById('reflectionToggle');
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
  reflectionsOn: reflectionToggle.checked,
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

  switch (type) {
    case 'matte':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        metalness: 0.0,
        envMapIntensity: state.reflectionsOn ? 0.25 : 0,
      });

    case 'glossy':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.22,
        metalness: 0.35,
        envMapIntensity: state.reflectionsOn ? 1 : 0,
      });

    case 'metallic':
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.18,
        metalness: 1.0,
        envMapIntensity: state.reflectionsOn ? 1.4 : 0,
      });

    case 'glass':
      // Note: full `transmission: 1` refracts whatever is *behind* the mesh in
      // the WebGL scene itself — and this scene is intentionally kept empty/
      // transparent (renderer alpha:true, scene.background = null) so Phase 4
      // can export with a transparent background. With nothing there to
      // refract, transmission=1 rendered indistinguishable from Glossy (caught
      // by the in-sandbox screenshot diff during this session, see
      // README "Known issues fixed in Phase 2 testing"). Using real opacity
      // instead of full transmission is what actually reads as "glass" here;
      // a low transmission value is kept for a bit of blur/refraction should
      // this later render over real content (e.g. composited in Phase 4).
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0,
        roughness: 0.06,
        transmission: 0.35,
        thickness: 18,
        ior: 1.45,
        transparent: true,
        opacity: 0.55,
        envMapIntensity: state.reflectionsOn ? 1.6 : 0.2,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
      });

    case 'neon': {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0d0d10,
        roughness: 0.4,
        metalness: 0.0,
        emissive: color,
        emissiveIntensity: state.neonIntensity,
        envMapIntensity: state.reflectionsOn ? 0.3 : 0,
      });
      return mat;
    }

    default:
      return new THREE.MeshStandardMaterial({ color });
  }
}

// ---------- text mesh (re)build ----------
function rebuildTextMesh() {
  if (!font) return; // font still loading

  if (textMesh) {
    scene.remove(textMesh);
    textMesh.geometry.dispose();
    if (Array.isArray(textMesh.material)) {
      textMesh.material.forEach((m) => m.dispose());
    } else {
      textMesh.material.dispose();
    }
    textMesh = null;
  }

  const content = state.text.trim() || ' ';

  const q = QUALITY_PRESETS[state.quality];
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
  geometry.center(); // pivot at the text's own center, so rotation looks natural

  const material = buildMaterial(state.materialType, state.color);
  textMesh = new THREE.Mesh(geometry, material);
  textMesh.castShadow = state.shadowsOn;
  textMesh.receiveShadow = state.shadowsOn;
  applyRotation();
  scene.add(textMesh);
  updateQualityNote();
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
  let triLabel = '—';
  if (textMesh) {
    const geo = textMesh.geometry;
    const posCount = geo.attributes.position.count;
    const triCount = Math.round(geo.index ? geo.index.count / 3 : posCount / 3);
    triLabel = triCount.toLocaleString('bn-BD');
  }
  qualityNote.textContent =
    `বর্তমান: ~${triLabel} ট্রায়াঙ্গেল, পিক্সেল-রেশিও সর্বোচ্চ ${q.pixelRatioCap}x, শ্যাডো ম্যাপ ${q.shadowMapSize}px। ` +
    `লো-এন্ড ডিভাইস/কম-শক্তির পিসিতে ল্যাগ হলে "Low" বেছে নিন।`;
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
  const old = textMesh.material;
  textMesh.material = buildMaterial(state.materialType, state.color);
  old.dispose();
}

function applyShadowToggle() {
  ground.visible = state.shadowsOn;
  if (textMesh) {
    textMesh.castShadow = state.shadowsOn;
    textMesh.receiveShadow = state.shadowsOn;
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

  const s = Math.max(0, scaleMul); // negative scale would inside-out the mesh
  textMesh.scale.set(s, s, s);

  const mat = textMesh.material;
  const baseOpacity = getBaseOpacity();
  mat.transparent = true; // needed to preview opacityMul < 1 (fadeIn etc.)
  mat.opacity = Math.min(1, Math.max(0, opacityMul)) * baseOpacity;
}

// Puts the mesh back exactly where the sliders/material panel say it should
// be — i.e. preset.apply(1) for whichever preset, but done directly so it
// doesn't depend on ANIMATION_PRESETS having a valid entry.
function resetMeshToBaseTransform() {
  if (!textMesh) return;
  textMesh.position.set(0, 0, 0);
  textMesh.scale.set(1, 1, 1);
  applyRotation();
  const mat = textMesh.material;
  mat.transparent = state.materialType === 'glass';
  mat.opacity = getBaseOpacity();
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

reflectionToggle.addEventListener('change', () => {
  state.reflectionsOn = reflectionToggle.checked;
  applyReflectionToggle();
});

resetCameraBtn.addEventListener('click', () => {
  camera.position.copy(DEFAULT_CAMERA_POS);
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
