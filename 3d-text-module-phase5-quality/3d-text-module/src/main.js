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
import {
  exportWebM,
  exportPngSequence,
  exportGif,
  isWebMExportSupported,
  estimateGifFrameCount,
  estimateGifSizeBytes,
} from './export.js';
import { computeArcLayout, splitGraphemes } from './curve.js';

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
const pictureStyleGrid = document.getElementById('pictureStyleGrid');
const stickerContentSection = document.getElementById('stickerContentSection');
const stickerTextInput = document.getElementById('stickerTextInput');
const stickerShapeGrid = document.getElementById('stickerShapeGrid');
const stickerBgColorPicker = document.getElementById('stickerBgColorPicker');
const stickerTextColorPicker = document.getElementById('stickerTextColorPicker');
const stickerBorderWidthRange = document.getElementById('stickerBorderWidthRange');
const stickerBorderWidthValue = document.getElementById('stickerBorderWidthValue');
const stickerBorderColorPicker = document.getElementById('stickerBorderColorPicker');
const stickerShadowCheckbox = document.getElementById('stickerShadowCheckbox');
const curveSection = document.getElementById('curveSection');
const curveIntensityRange = document.getElementById('curveIntensityRange');
const curveIntensityValue = document.getElementById('curveIntensityValue');
const curveDirectionGrid = document.getElementById('curveDirectionGrid');
const curveSpacingRange = document.getElementById('curveSpacingRange');
const curveSpacingValue = document.getElementById('curveSpacingValue');
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

const posXRange = document.getElementById('posXRange');
const posXValue = document.getElementById('posXValue');
const posYRange = document.getElementById('posYRange');
const posYValue = document.getElementById('posYValue');
const quickAlignGrid = document.getElementById('quickAlignGrid');
const dragModeSelect = document.getElementById('dragModeSelect');
const dragEnabledToggle = document.getElementById('dragEnabledToggle');
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

const fontSelect = document.getElementById('fontSelect');
const colorModeSelect = document.getElementById('colorModeSelect');
const solidColorGroup = document.getElementById('solidColorGroup');
const gradientColorGroup = document.getElementById('gradientColorGroup');
const gradientPresetSelect = document.getElementById('gradientPresetSelect');
const gradientTypeSelect = document.getElementById('gradientTypeSelect');
const customGradientControls = document.getElementById('customGradientControls');
const colorStartPicker = document.getElementById('colorStartPicker');
const colorEndPicker = document.getElementById('colorEndPicker');
const gradientAngleRange = document.getElementById('gradientAngleRange');
const gradientAngleValue = document.getElementById('gradientAngleValue');

const multicolorGroup = document.getElementById('multicolorGroup');
const multicolorPaletteSelect = document.getElementById('multicolorPaletteSelect');
const comicOutlineToggle = document.getElementById('comicOutlineToggle');

const patternGroup = document.getElementById('patternGroup');
const patternPresetSelect = document.getElementById('patternPresetSelect');
const festiveDecorToggle = document.getElementById('festiveDecorToggle');

const cubeContentSection = document.getElementById('cubeContentSection');
const cubeFace1Input = document.getElementById('cubeFace1Input');
const cubeFace2Input = document.getElementById('cubeFace2Input');
const cubeFace3Input = document.getElementById('cubeFace3Input');
const cubeColorPicker = document.getElementById('cubeColorPicker');
const cubeTextColorPicker = document.getElementById('cubeTextColorPicker');
const cubeTextBorderPicker = document.getElementById('cubeTextBorderPicker');

const bgModeSelect = document.getElementById('bgModeSelect');
const bgColorGroup = document.getElementById('bgColorGroup');
const bgColorPicker = document.getElementById('bgColorPicker');
const bgImageGroup = document.getElementById('bgImageGroup');
const bgFileInput = document.getElementById('bgFileInput');
const bgPreviewThumb = document.getElementById('bgPreviewThumb');
const bgImageNote = document.getElementById('bgImageNote');

// PLAN_3 §4 (Phase C1-C6): GIF export panel
const gifOptionsGroup = document.getElementById('gifOptionsGroup');
const gifTransparentToggle = document.getElementById('gifTransparentToggle');
const gifBackgroundColorField = document.getElementById('gifBackgroundColorField');
const gifBackgroundColorPicker = document.getElementById('gifBackgroundColorPicker');
const gifLoopToggle = document.getElementById('gifLoopToggle');
const gifQualitySelect = document.getElementById('gifQualitySelect');
const gifSizeEstimateNote = document.getElementById('gifSizeEstimateNote');

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

// ---------- Bug fix: shadow camera frustum was hardcoded-tiny ----------
// DirectionalLight's shadow camera defaults to an orthographic frustum of
// only ±5 world units (three.js default). This project's text/image mesh
// can be 100+ units wide (sizeRange goes up to 140), so almost the entire
// mesh fell outside the shadow camera's view — only a razor-thin sliver
// near the origin actually cast a shadow onto the ground plane, which is
// why the shadow looked "barely visible" even at max intensity. This
// function recomputes the frustum from the current mesh's real bounding
// box every time the mesh or lighting rig changes, so the whole object is
// always inside the shadow camera's view.
function updateShadowFrustum() {
  if (!textMesh) return;
  const box = new THREE.Box3().setFromObject(textMesh);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const half = Math.max(60, (Math.max(size.x, size.y, size.z) / 2) * 1.4);
  for (const l of lights.children) {
    if (l.isDirectionalLight && l.shadow) {
      const cam = l.shadow.camera;
      cam.left = -half;
      cam.right = half;
      cam.top = half;
      cam.bottom = -half;
      cam.updateProjectionMatrix();
    }
  }
}

// ---------- ground plane (shadow catcher only, not visible directly) ----------
const groundGeo = new THREE.PlaneGeometry(2000, 2000);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -70;
ground.receiveShadow = true;
scene.add(ground);

function updateSceneBackground() {
  const mode = state.bgMode;
  if (mode === 'none') {
    scene.background = null;
    return;
  }
  if (mode === 'color') {
    scene.background = new THREE.Color(state.bgColor);
    return;
  }
  if (mode === 'image' && state.bgImageElement) {
    const tex = new THREE.CanvasTexture(state.bgImageElement);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
    return;
  }

  // Procedural presets
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (mode === 'darkBlue') {
    const grad = ctx.createRadialGradient(512, 512, 100, 512, 512, 700);
    grad.addColorStop(0, '#0a2c56');
    grad.addColorStop(0.6, '#031936');
    grad.addColorStop(1, '#010d1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  } else if (mode === 'aiCircuitBg') {
    // Dark deep navy/black high-tech cyber background with cyan PCB traces and circular HUD target rings (Screenshot 1)
    ctx.fillStyle = '#020b18';
    ctx.fillRect(0, 0, 1024, 1024);

    // Radial energy core glow
    const radialCore = ctx.createRadialGradient(512, 512, 50, 512, 512, 600);
    radialCore.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
    radialCore.addColorStop(0.5, 'rgba(2, 44, 90, 0.45)');
    radialCore.addColorStop(1, 'rgba(1, 10, 24, 0.95)');
    ctx.fillStyle = radialCore;
    ctx.fillRect(0, 0, 1024, 1024);

    // Concentric futuristic HUD circular rings in center
    const centerHUD = [160, 220, 280, 340, 420];
    centerHUD.forEach((r, idx) => {
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(0, 229, 255, 0.45)' : 'rgba(0, 180, 255, 0.25)';
      ctx.lineWidth = idx === 2 ? 8 : (idx === 3 ? 4 : 2);
      ctx.beginPath();
      if (idx === 2) {
        ctx.setLineDash([24, 16, 8, 16]);
      } else if (idx === 3) {
        ctx.setLineDash([40, 20]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.arc(512, 512, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // PCB circuit lines & microchip buses
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    const traces = [
      [[0, 150], [200, 150], [320, 270], [320, 400]],
      [[1024, 200], [800, 200], [680, 320], [680, 420]],
      [[0, 850], [250, 850], [380, 720], [380, 620]],
      [[1024, 820], [780, 820], [650, 690], [650, 600]],
      [[100, 0], [100, 180], [220, 300]],
      [[900, 0], [900, 160], [780, 280]],
      [[120, 1024], [120, 840], [240, 720]],
      [[920, 1024], [920, 860], [800, 740]],
    ];
    traces.forEach(path => {
      ctx.beginPath();
      path.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const last = path[path.length - 1];
      ctx.beginPath(); ctx.arc(last[0], last[1], 6, 0, Math.PI * 2); ctx.fillStyle = '#38bdf8'; ctx.fill();
      ctx.beginPath(); ctx.arc(last[0], last[1], 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    });

    // Floating data chip squares
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 2;
    [[60, 240, 50, 50], [880, 280, 60, 60], [80, 700, 55, 55], [870, 680, 65, 65]].forEach(([x, y, w, h]) => {
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.fillRect(x, y, w, h);
    });
  } else if (mode === 'brickWallBg') {
    // Dark slate/brick wall with realistic mortar lines (Screenshot 2)
    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, 1024, 1024);

    const brickW = 100;
    const brickH = 42;
    const rows = Math.ceil(1024 / brickH);
    const cols = Math.ceil(1024 / brickW) + 1;

    for (let r = 0; r <= rows; r++) {
      const offsetX = (r % 2 === 0) ? 0 : -brickW / 2;
      for (let c = 0; c <= cols; c++) {
        const bx = c * brickW + offsetX;
        const by = r * brickH;

        // Individual brick subtle variations
        const shade = 14 + ((r * 7 + c * 13) % 12);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 6})`;
        ctx.fillRect(bx + 2, by + 2, brickW - 4, brickH - 4);

        // Subtle brick bevel highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(bx + 2, by + 2, brickW - 4, 3);
      }
    }

    // Dark vignette overlay with blue ambient mood
    const vig = ctx.createRadialGradient(512, 512, 100, 512, 512, 700);
    vig.addColorStop(0, 'rgba(0, 30, 60, 0.35)');
    vig.addColorStop(0.6, 'rgba(5, 8, 15, 0.7)');
    vig.addColorStop(1, 'rgba(1, 2, 5, 0.98)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, 1024, 1024);
  } else if (mode === 'lightStudio') {
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#f4f6f9');
    grad.addColorStop(0.6, '#dbe0e6');
    grad.addColorStop(1, '#b8c1cc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  } else if (mode === 'gradientDark') {
    const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 700);
    grad.addColorStop(0, '#222730');
    grad.addColorStop(1, '#090b0e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  } else if (mode === 'cyberpunk') {
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#10002b');
    grad.addColorStop(0.5, '#240046');
    grad.addColorStop(1, '#3c096c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);
  } else {
    scene.background = null;
    return;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
}

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
  updateShadowFrustum();
}

// ---------- state ----------
let font = null;
let textMesh = null;
const state = {
  contentMode: 'text', // PLAN_3 §1: 'text' | 'image' | 'sticker' — mutually exclusive, one active object at a time
  fontFamily: fontSelect?.value || 'Grand Hotel',
  colorMode: colorModeSelect?.value || 'gradient',
  gradientPreset: gradientPresetSelect?.value || 'gold',
  gradientType: gradientTypeSelect?.value || 'linear',
  colorStart: colorStartPicker?.value || '#ffd700',
  colorEnd: colorEndPicker?.value || '#ff4500',
  gradientAngle: Number(gradientAngleRange?.value || 90),
  multicolorPalette: multicolorPaletteSelect?.value || 'comic',
  comicOutline: comicOutlineToggle ? comicOutlineToggle.checked : true,
  patternPreset: patternPresetSelect?.value || 'candyCane',
  festiveDecor: festiveDecorToggle ? festiveDecorToggle.checked : true,
  cubeFace1: cubeFace1Input?.value || '3',
  cubeFace2: cubeFace2Input?.value || 'D',
  cubeFace3: cubeFace3Input?.value || '3D',
  cubeColor: cubeColorPicker?.value || '#1d4ed8',
  cubeTextColor: cubeTextColorPicker?.value || '#ffffff',
  cubeTextBorder: cubeTextBorderPicker?.value || '#0f172a',
  bgMode: bgModeSelect?.value || 'darkBlue',
  bgColor: bgColorPicker?.value || '#0a192f',
  bgImageElement: null,
  imageElement: null, // HTMLImageElement of the uploaded photo, null until one is chosen
  pictureStyle: 'none', // §8.2 follow-up: id into PICTURE_STYLES, image mode only
  stickerText: stickerTextInput.value, // PLAN_3 §2: sticker/badge mode only
  stickerShape: 'circle', // PLAN_3 §2.1: 'circle' | 'roundedRect' (Phase A1) | 'starburst' | 'stamp' | 'ribbon' | 'speech' | 'radiant' (Phase A2)
  stickerBgColor: stickerBgColorPicker.value,
  stickerTextColor: stickerTextColorPicker.value,
  stickerBorderWidth: parseInt(stickerBorderWidthRange?.value || '0', 10),
  stickerBorderColor: stickerBorderColorPicker?.value || '#ffffff',
  stickerShadow: stickerShadowCheckbox?.checked || false,
  // PLAN_3 §3: curved text — shared by Text and Sticker/Badge content modes
  // (§3.2), read directly by drawCanvasTextTexture/drawStickerCanvasTexture.
  curveIntensity: Number(curveIntensityRange.value), // -100..100, 0 = straight
  curveDirection: 'up', // 'up' (⌣ smile) | 'down' (⌢ dome)
  curveSpacing: Number(curveSpacingRange.value) / 100, // slider is a %, state stores the multiplier
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
  posX: Number(posXRange?.value || 0),
  posY: Number(posYRange?.value || 0),
  posZ: 0,
  dragMode: dragModeSelect?.value || 'move',
  dragEnabled: dragEnabledToggle ? dragEnabledToggle.checked : true,
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
  // Checks if string contains Bengali Unicode range or any non-ASCII character not present in Latin Helvetiker font
  return BANGLA_RANGE.test(str) || /[^\x00-\x7F]/.test(str);
}

const CANVAS_TEXT_FONT_STACK =
  '"Noto Sans Bengali","Nirmala UI","Vrinda UI","Vrinda","Kalpurush","Siyam Rupali","Bangla Sans UI","Segoe UI",sans-serif';
const CANVAS_TEXT_FONT_PX = 220; // supersampled resolution, independent of world-space size
const CANVAS_TEXT_LINE_HEIGHT_PX = CANVAS_TEXT_FONT_PX * 1.35;
const CANVAS_TEXT_PAD_PX = CANVAS_TEXT_FONT_PX * 0.35;

// ---------- PLAN_3 §3, Phase B2: curved-text canvas rendering ----------
// Shared by both the plain text card (drawCanvasTextTexture) and the
// Sticker/Badge card (drawStickerCanvasTexture) — plan §3.2 explicitly asks
// for curve inside badge text too, and both already go through this same
// canvas-card pipeline, so one helper covers both call sites.
//
// Measures each line with the *real* ctx.font (grapheme-cluster by
// grapheme-cluster, see curve.js's splitGraphemes for why cluster and not
// code point), runs it through curve.js's pure computeArcLayout, and returns
// per-line draw instructions plus the overall bounding box the caller needs
// to size its canvas so curved glyphs don't get clipped.
//
// When curveIntensity is 0 this still routes through here (for a single
// code path) but computeArcLayout's straight-line fallback makes it an exact
// no-op vs. the old plain ctx.fillText(line, ...) layout — same positions,
// zero rotation.
function layoutCurvedLines(ctx, lines, curveOpts) {
  const perLine = lines.map((line) => {
    const clusters = splitGraphemes(line);
    const widths = clusters.map((c) => ctx.measureText(c).width);
    const layout = computeArcLayout(widths, curveOpts);
    return { clusters, layout };
  });
  const maxLineWidth = Math.max(1, ...perLine.map((l) => l.layout.width));
  const maxBulge = Math.max(0, ...perLine.map((l) => l.layout.height));
  return { perLine, maxLineWidth, maxBulge };
}

// Draws one already-laid-out line, centered at (centerX, baselineY), onto
// ctx. `layout.chars[i]` offsets are relative to the line's own center, so
// this just re-centers them at the caller's chosen position.
function drawCurvedLine(ctx, clusters, layout, centerX, baselineY) {
  clusters.forEach((cluster, i) => {
    const c = layout.chars[i];
    if (!c) return; // defensive: clusters/layout length must match, but a mismatched font mid-measure shouldn't hard-crash the draw
    ctx.save();
    ctx.translate(centerX + c.x, baselineY + c.y);
    ctx.rotate(c.rotation);
    ctx.fillText(cluster, 0, 0);
    ctx.restore();
  });
}

function getFontStack(family) {
  if (!family || family === 'helvetiker' || family === 'Noto Sans Bengali') {
    return CANVAS_TEXT_FONT_STACK;
  }
  return `"${family}", ${CANVAS_TEXT_FONT_STACK}`;
}

function getGradientFillStyle(ctx, width, height) {
  let colors = ['#ffd700', '#ff4500'];
  let type = state.gradientType || 'linear';
  let angleDeg = state.gradientAngle || 90;

  if (state.gradientPreset === 'electricCyan') colors = ['#00f5ff', '#0072ff'];
  else if (state.gradientPreset === 'gold') colors = ['#ffd700', '#ff4500'];
  else if (state.gradientPreset === 'neon') colors = ['#00f2fe', '#4facfe'];
  else if (state.gradientPreset === 'purple') colors = ['#ff0844', '#ffb199'];
  else if (state.gradientPreset === 'silver') colors = ['#e6e9f0', '#eef1f5'];
  else if (state.gradientPreset === 'emerald') colors = ['#11998e', '#38ef7d'];
  else if (state.gradientPreset === 'fire') colors = ['#ff416c', '#ff4b2b'];
  else if (state.gradientPreset === 'custom') colors = [state.colorStart || '#ffd700', state.colorEnd || '#ff4500'];

  if (type === 'radial') {
    const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height) / 2);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    return grad;
  } else {
    const rad = (angleDeg * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    // Span the entire canvas along the selected axis.  Using only half of
    // the largest side makes diagonal gradients end before reaching the
    // canvas corners, so most wide text can appear to use just the end
    // colour.  This is the projection of the canvas onto the gradient axis.
    const halfSpan = Math.abs(dx) * width / 2 + Math.abs(dy) * height / 2;
    const x0 = cx - dx * halfSpan;
    const y0 = cy - dy * halfSpan;
    const x1 = cx + dx * halfSpan;
    const y1 = cy + dy * halfSpan;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    return grad;
  }
}

// -------- Multicolor palettes (Design 1: Rainbow / Comic Pop) --------
const MULTICOLOR_PALETTES = {
  comic:    ['#e53935','#f57c00','#43a047','#1e88e5','#8e24aa','#e91e63','#ff8f00'],
  pastel:   ['#ff8a80','#82b1ff','#ccff90','#ea80fc','#80d8ff','#ffd180','#b9f6ca'],
  neon:     ['#ff1744','#00e5ff','#76ff03','#ffea00','#d500f9','#ff6d00','#1de9b6'],
  warmCool: ['#f44336','#ff9800','#ffeb3b','#00bcd4','#3f51b5','#9c27b0','#009688'],
  rainbow:  ['#e53935','#f4511e','#f9a825','#2e7d32','#0277bd','#283593','#6a1b9a'],
};

function getMulticolorPalette() {
  return MULTICOLOR_PALETTES[state.multicolorPalette] || MULTICOLOR_PALETTES.comic;
}

// -------- Pattern fill engine (Design 2: Candy Cane, Floral, Gold, etc.) --------
function getPatternFillStyle(ctx, charW, charH, colorOverride) {
  const p = state.patternPreset;
  const patCanvas = document.createElement('canvas');

  if (p === 'aiCircuit') {
    const ts = 90;
    patCanvas.width = ts; patCanvas.height = ts;
    const pc = patCanvas.getContext('2d');
    pc.fillStyle = '#03152d'; pc.fillRect(0, 0, ts, ts);

    pc.strokeStyle = '#00f0ff'; pc.lineWidth = 2.5;
    pc.beginPath();
    pc.moveTo(0, ts*0.25); pc.lineTo(ts*0.4, ts*0.25); pc.lineTo(ts*0.65, ts*0.5); pc.lineTo(ts, ts*0.5);
    pc.moveTo(ts*0.5, 0); pc.lineTo(ts*0.5, ts*0.35); pc.lineTo(ts*0.75, ts*0.6); pc.lineTo(ts*0.75, ts);
    pc.moveTo(0, ts*0.8); pc.lineTo(ts*0.3, ts*0.8); pc.lineTo(ts*0.5, ts);
    pc.stroke();

    const nodes = [[ts*0.4, ts*0.25], [ts*0.65, ts*0.5], [ts*0.5, ts*0.35], [ts*0.75, ts*0.6], [ts*0.3, ts*0.8]];
    nodes.forEach(([nx, ny]) => {
      pc.beginPath(); pc.arc(nx, ny, 4, 0, Math.PI*2); pc.fillStyle = '#38bdf8'; pc.fill();
      pc.beginPath(); pc.arc(nx, ny, 2, 0, Math.PI*2); pc.fillStyle = '#ffffff'; pc.fill();
    });
    return ctx.createPattern(patCanvas, 'repeat');
  }

  if (p === 'candyCane') {
    const tileSize = Math.max(60, Math.round(charH * 0.22));
    patCanvas.width = tileSize;
    patCanvas.height = tileSize;
    const pc = patCanvas.getContext('2d');
    pc.fillStyle = '#ffffff';
    pc.fillRect(0, 0, tileSize, tileSize);
    pc.strokeStyle = '#e53935';
    pc.lineWidth = tileSize * 0.38;
    pc.lineCap = 'butt';
    for (let i = -2; i <= 4; i++) {
      pc.beginPath();
      pc.moveTo(i * tileSize - tileSize, 0);
      pc.lineTo(i * tileSize, tileSize);
      pc.stroke();
    }
    const pattern = ctx.createPattern(patCanvas, 'repeat');
    return pattern;
  }

  if (p === 'floral') {
    const ts = 120;
    patCanvas.width = ts; patCanvas.height = ts;
    const pc = patCanvas.getContext('2d');
    pc.fillStyle = '#1b5e20'; pc.fillRect(0, 0, ts, ts);
    const petalColors = ['#f06292','#ab47bc','#ff7043','#ffca28','#ef5350'];
    const flowers = [[ts*0.25,ts*0.25],[ts*0.75,ts*0.75],[ts*0.25,ts*0.75],[ts*0.75,ts*0.25],[ts*0.5,ts*0.5]];
    flowers.forEach(([fx,fy],fi) => {
      const r = ts * 0.13;
      for (let angle = 0; angle < Math.PI*2; angle += Math.PI/3) {
        pc.beginPath();
        pc.ellipse(fx + Math.cos(angle)*r*1.1, fy + Math.sin(angle)*r*1.1, r*0.85, r*0.5, angle, 0, Math.PI*2);
        pc.fillStyle = petalColors[fi % petalColors.length];
        pc.fill();
      }
      pc.beginPath();
      pc.arc(fx, fy, r*0.45, 0, Math.PI*2);
      pc.fillStyle = '#ffee58';
      pc.fill();
    });
    return ctx.createPattern(patCanvas, 'repeat');
  }

  if (p === 'goldGlitter') {
    const ts = 80;
    patCanvas.width = ts; patCanvas.height = ts;
    const pc = patCanvas.getContext('2d');
    const grd = pc.createLinearGradient(0, 0, ts, ts);
    grd.addColorStop(0, '#bf8f2e');
    grd.addColorStop(0.3, '#ffd700');
    grd.addColorStop(0.6, '#f0c040');
    grd.addColorStop(1, '#c9982a');
    pc.fillStyle = grd;
    pc.fillRect(0, 0, ts, ts);
    for (let s = 0; s < 22; s++) {
      const sx = Math.random() * ts;
      const sy = Math.random() * ts;
      const sr = 1 + Math.random() * 3;
      pc.beginPath();
      pc.arc(sx, sy, sr, 0, Math.PI*2);
      pc.fillStyle = `rgba(255,255,255,${0.4 + Math.random()*0.5})`;
      pc.fill();
    }
    return ctx.createPattern(patCanvas, 'repeat');
  }

  if (p === 'cyberGrid') {
    const ts = 60;
    patCanvas.width = ts; patCanvas.height = ts;
    const pc = patCanvas.getContext('2d');
    pc.fillStyle = '#0a0a1a'; pc.fillRect(0, 0, ts, ts);
    pc.strokeStyle = '#00e5ff'; pc.lineWidth = 1.5;
    pc.beginPath(); pc.moveTo(ts/2, 0); pc.lineTo(ts/2, ts); pc.stroke();
    pc.beginPath(); pc.moveTo(0, ts/2); pc.lineTo(ts, ts/2); pc.stroke();
    pc.strokeStyle = 'rgba(0,229,255,0.25)'; pc.lineWidth = 0.5;
    pc.beginPath(); pc.moveTo(0,0); pc.lineTo(ts,ts); pc.stroke();
    pc.beginPath(); pc.moveTo(ts,0); pc.lineTo(0,ts); pc.stroke();
    pc.beginPath(); pc.arc(ts/2, ts/2, ts*0.12, 0, Math.PI*2);
    pc.fillStyle = '#00e5ff'; pc.fill();
    return ctx.createPattern(patCanvas, 'repeat');
  }

  if (p === 'marble') {
    const ts = 200;
    patCanvas.width = ts; patCanvas.height = ts;
    const pc = patCanvas.getContext('2d');
    pc.fillStyle = '#f5f5f0'; pc.fillRect(0, 0, ts, ts);
    for (let v = 0; v < 8; v++) {
      pc.beginPath();
      const x1 = Math.random()*ts, y1 = Math.random()*ts;
      const x2 = x1 + (Math.random()-0.5)*ts*0.9, y2 = y1 + (Math.random()-0.5)*ts*0.9;
      pc.moveTo(x1, y1); pc.lineTo(x2, y2);
      pc.strokeStyle = `rgba(${100+Math.random()*60},${100+Math.random()*60},${100+Math.random()*60},${0.12+Math.random()*0.18})`;
      pc.lineWidth = 0.8 + Math.random()*2.5;
      pc.stroke();
    }
    return ctx.createPattern(patCanvas, 'repeat');
  }

  if (p === 'wood') {
    const ts = 160;
    patCanvas.width = ts; patCanvas.height = ts;
    const pc = patCanvas.getContext('2d');
    const gw = pc.createLinearGradient(0, 0, ts, 0);
    gw.addColorStop(0, '#5d3a1a'); gw.addColorStop(0.5, '#8d5524'); gw.addColorStop(1, '#5d3a1a');
    pc.fillStyle = gw; pc.fillRect(0, 0, ts, ts);
    for (let gr = 0; gr < 14; gr++) {
      pc.beginPath();
      pc.moveTo(0, (gr/14)*ts);
      pc.bezierCurveTo(ts*0.33, (gr/14)*ts + (Math.random()-0.5)*8, ts*0.66, (gr/14)*ts + (Math.random()-0.5)*8, ts, (gr/14)*ts);
      pc.strokeStyle = `rgba(60,30,5,${0.06 + Math.random()*0.12})`;
      pc.lineWidth = 0.5 + Math.random()*1.5;
      pc.stroke();
    }
    return ctx.createPattern(patCanvas, 'repeat');
  }

  // Fallback: solid white
  return colorOverride || '#ffffff';
}

// Helper: draw a single cluster with a clipping mask so pattern fills are
// clipped to each character's glyph shape.
function drawClusteredMulticolor(ctx, clusters, layout, centerX, baselineY, palette, outlineOn) {
  clusters.forEach((cluster, i) => {
    const c = layout.chars[i];
    if (!c) return;
    const col = palette[i % palette.length];
    ctx.save();
    ctx.translate(centerX + c.x, baselineY + c.y);
    ctx.rotate(c.rotation);
    // Thick cartoon outline
    if (outlineOn) {
      ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.12;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111111';
      ctx.strokeText(cluster, 0, 0);
    }
    // Bright fill with subtle highlight gradient
    const glyphW = ctx.measureText(cluster).width;
    const hGrad = ctx.createLinearGradient(-glyphW/2, -CANVAS_TEXT_FONT_PX*0.6, glyphW/2, CANVAS_TEXT_FONT_PX*0.5);
    hGrad.addColorStop(0, lightenHex(col, 0.55));
    hGrad.addColorStop(0.45, col);
    hGrad.addColorStop(1, darkenHex(col, 0.35));
    ctx.fillStyle = hGrad;
    ctx.fillText(cluster, 0, 0);
    ctx.restore();
  });
}

function lightenHex(hex, amount) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const lr = Math.min(255, Math.round(r + (255-r)*amount));
  const lg = Math.min(255, Math.round(g + (255-g)*amount));
  const lb = Math.min(255, Math.round(b + (255-b)*amount));
  return `rgb(${lr},${lg},${lb})`;
}
function darkenHex(hex, amount) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const dr = Math.max(0, Math.round(r*(1-amount)));
  const dg = Math.max(0, Math.round(g*(1-amount)));
  const db = Math.max(0, Math.round(b*(1-amount)));
  return `rgb(${dr},${dg},${db})`;
}

// Draws all lines onto one offscreen canvas (white/gradient glyphs on a transparent background)
function drawCanvasTextTexture(lines, curveOpts = { curveIntensity: 0 }) {
  const fontStack = getFontStack(state.fontFamily);
  const measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = `600 ${CANVAS_TEXT_FONT_PX}px ${fontStack}`;
  const arcOpts = {
    curveIntensity: curveOpts.curveIntensity,
    direction: curveOpts.curveDirection,
    spacing: curveOpts.curveSpacing,
  };
  const { perLine, maxLineWidth, maxBulge } = layoutCurvedLines(measureCtx, lines, arcOpts);

  const canvasW = Math.ceil(maxLineWidth + CANVAS_TEXT_PAD_PX * 2);
  const canvasH = Math.ceil(
    CANVAS_TEXT_LINE_HEIGHT_PX * lines.length + CANVAS_TEXT_PAD_PX * 2 + maxBulge * 2
  );

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.font = `600 ${CANVAS_TEXT_FONT_PX}px ${fontStack}`;

  // ---- MULTICOLOR MODE (Design 1: per-letter rainbow cartoon) ----
  if (state.colorMode === 'multicolor') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const palette = getMulticolorPalette();
    const outlineOn = state.comicOutline !== false;
    perLine.forEach(({ clusters, layout }, i) => {
      const y = maxBulge + CANVAS_TEXT_PAD_PX + CANVAS_TEXT_LINE_HEIGHT_PX * i + CANVAS_TEXT_LINE_HEIGHT_PX / 2;
      drawClusteredMulticolor(ctx, clusters, layout, canvasW / 2, y, palette, outlineOn);
    });
    return { canvas, aspect: canvasW / canvasH };
  }

  // ---- PATTERN MODE (Design 2: Candy Cane, Floral, AI Circuit, Neon Sign, etc.) ----
  if (state.colorMode === 'pattern') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const patFill = getPatternFillStyle(ctx, canvasW, canvasH);

    perLine.forEach(({ clusters, layout }, i) => {
      const y = maxBulge + CANVAS_TEXT_PAD_PX + CANVAS_TEXT_LINE_HEIGHT_PX * i + CANVAS_TEXT_LINE_HEIGHT_PX / 2;
      clusters.forEach((cluster, ci) => {
        const c = layout.chars[ci];
        if (!c) return;
        ctx.save();
        ctx.translate(canvasW / 2 + c.x, y + c.y);
        ctx.rotate(c.rotation);

        if (state.patternPreset === 'neonSign') {
          // Multi-layer Real Neon Gas Tube Glow (Screenshot 2)
          // 1. Broad outer ambient electric blue bloom
          ctx.save();
          ctx.shadowColor = '#0072ff';
          ctx.shadowBlur = 55;
          ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.18;
          ctx.strokeStyle = '#00e5ff';
          ctx.strokeText(cluster, 0, 0);
          ctx.restore();

          // 2. Intense cyan electric plasma ring
          ctx.save();
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 28;
          ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.11;
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeText(cluster, 0, 0);
          ctx.restore();

          // 3. Bright core tube glow
          ctx.save();
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
          ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.06;
          ctx.strokeStyle = '#e0f2fe';
          ctx.strokeText(cluster, 0, 0);
          ctx.restore();

          // 4. White-hot center neon gas core
          ctx.save();
          ctx.lineWidth = Math.max(3, CANVAS_TEXT_FONT_PX * 0.035);
          ctx.strokeStyle = '#ffffff';
          ctx.strokeText(cluster, 0, 0);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(cluster, 0, 0);
          ctx.restore();

          // Electric plasma haze around text
          if (state.festiveDecor) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
            for (let w = 0; w < 3; w++) {
              ctx.beginPath();
              ctx.arc((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 15 + Math.random() * 20, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else if (state.patternPreset === 'aiCircuit') {
          // AI Cyber Circuit Style (Screenshot 1)
          // 1. Outer cyan cyber glow
          ctx.save();
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 22;
          ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.12;
          ctx.strokeStyle = '#0072ff';
          ctx.lineJoin = 'round';
          ctx.strokeText(cluster, 0, 0);
          ctx.restore();

          // 2. Cyan border
          ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.07;
          ctx.strokeStyle = '#00f0ff';
          ctx.lineJoin = 'round';
          ctx.strokeText(cluster, 0, 0);

          // 3. Circuit pattern fill
          ctx.fillStyle = patFill;
          ctx.fillText(cluster, 0, 0);

          // 4. Central holographic neon shine
          const gw = ctx.measureText(cluster).width;
          const cyberGrad = ctx.createLinearGradient(-gw/2, -CANVAS_TEXT_FONT_PX*0.5, gw/2, CANVAS_TEXT_FONT_PX*0.5);
          cyberGrad.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
          cyberGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
          cyberGrad.addColorStop(1, 'rgba(0, 114, 255, 0.4)');
          ctx.fillStyle = cyberGrad;
          ctx.fillText(cluster, 0, 0);
        } else {
          // Thick outline first for 3D pop effect
          ctx.lineWidth = CANVAS_TEXT_FONT_PX * 0.1;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#1a0a00';
          ctx.strokeText(cluster, 0, 0);
          // Pattern fill
          if (typeof patFill === 'string') {
            ctx.fillStyle = patFill;
          } else {
            ctx.fillStyle = patFill;
          }
          ctx.fillText(cluster, 0, 0);
          // Festive snow cap highlight if enabled
          if (state.festiveDecor && state.patternPreset === 'candyCane') {
            const gw = ctx.measureText(cluster).width;
            const snowGrad = ctx.createLinearGradient(-gw/2, -CANVAS_TEXT_FONT_PX*0.58, gw/2, -CANVAS_TEXT_FONT_PX*0.15);
            snowGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
            snowGrad.addColorStop(0.5, 'rgba(255,255,255,0.30)');
            snowGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
            ctx.fillStyle = snowGrad;
            ctx.fillText(cluster, 0, 0);
          }
        }
        ctx.restore();
      });
    });
    return { canvas, aspect: canvasW / canvasH };
  }

  // ---- GRADIENT / SOLID (existing path) ----
  if (state.colorMode === 'gradient') {
    ctx.fillStyle = getGradientFillStyle(ctx, canvasW, canvasH);
  } else {
    ctx.fillStyle = state.color || '#ffffff';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  perLine.forEach(({ clusters, layout }, i) => {
    const y = maxBulge + CANVAS_TEXT_PAD_PX + CANVAS_TEXT_LINE_HEIGHT_PX * i + CANVAS_TEXT_LINE_HEIGHT_PX / 2;
    drawCurvedLine(ctx, clusters, layout, canvasW / 2, y);
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

// Attempt to register an optional bundled Bengali TTF for deterministic
// canvas text rendering. If the file exists at
// `www/assets/fonts/NotoSansBengali-Regular.ttf` (or copied there by the
// user), this will load it into `document.fonts` under the family name
// "Noto Sans Bengali" so the canvas drawing code above can rely on a
// predictable font regardless of the host OS. This function is deliberately
// best-effort: failure to find or load the font is non-fatal and only logs
// a warning.
function registerBundledCanvasFont() {
  try {
    const fontUrl = './assets/fonts/NotoSansBengali-Regular.ttf';
    const face = new FontFace('Noto Sans Bengali', `url(${fontUrl})`);
    face.load().then((loaded) => {
      try {
        document.fonts.add(loaded);
        console.log('Bundled Bengali font registered:', fontUrl);
        if (state && state.contentMode === 'text' && isBanglaText(state.text)) {
          scheduleRebuild();
        }
      } catch (err) {
        console.warn('Failed to add bundled Bengali font to document.fonts', err);
      }
    }).catch(async (err) => {
      console.warn('Bundled Bengali font not found or failed to load:', fontUrl, err);
      // Fallback: inject Google Fonts link for Noto Sans Bengali and wait
      // for it to be available via `document.fonts.load`. This requires
      // network but keeps behaviour deterministic if the user prefers not
      // to add a TTF file manually.
      try {
        const gfHref = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600&display=swap';
        if (!document.querySelector(`link[href="${gfHref}"]`)) {
          const l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = gfHref;
          document.head.appendChild(l);
        }
        // Wait for the font to load (weight 600 used in canvas draws)
        await document.fonts.load('600 220px "Noto Sans Bengali"');
        console.log('Google Fonts Noto Sans Bengali loaded fallback');
        if (state && state.contentMode === 'text' && isBanglaText(state.text)) {
          scheduleRebuild();
        }
      } catch (gerr) {
        console.warn('Google Fonts fallback failed', gerr);
      }
    });
  } catch (e) {
    console.warn('registerBundledCanvasFont failed', e);
  }
}

// BoxGeometry material slot order is [+x, -x, +y, -y, +z, -z]. Front (+z,
// facing the default camera) and back (-z) get the text texture as `.map`
// with alphaTest so background pixels are fully discarded (no
// transparency-sorting artifacts); the 4 side slots get a plain material of
// the current preset, standing in for the card's extruded edge.
function buildCanvasCardMaterials(frontTex, backTex, isImage = false) {
  const sideMat = buildMaterial(state.materialType, state.color);

  // For text card with gradient or photo card, faceColor is #ffffff to preserve exact texture gradient/photo colors.
  // For solid text card, faceColor is state.color!
  const isTexturePreserved = isImage || state.colorMode === 'gradient';
  const faceColor = isTexturePreserved ? '#ffffff' : state.color;

  const frontMat = buildMaterial(state.materialType, faceColor);
  frontMat.map = frontTex;
  frontMat.transparent = true;
  frontMat.alphaTest = isImage ? 0.05 : 0.4;
  frontMat.needsUpdate = true;

  const backMat = buildMaterial(state.materialType, faceColor);
  backMat.map = backTex;
  backMat.transparent = true;
  backMat.alphaTest = isImage ? 0.05 : 0.4;
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

// ---------- Picture Style Gallery (MS Word "Picture Styles" ribbon, §৮.২ follow-up) ----------
// Each entry describes how to draw the frame/border directly onto the same
// offscreen <canvas> that becomes the front/back texture — this is the same
// technique Word itself uses (a picture style is a 2D compositing effect,
// not a different 3D geometry), so it slots into the existing canvas-texture
// card pipeline without touching materials/export/animation at all.
//
// Trade-off (documented up front): for 'rounded'/'oval' shapes the silhouette
// is cut with an alpha mask on the BoxGeometry's front/back faces (exactly
// like the existing Bangla-text alpha-masked card), NOT a true rounded/oval
// 3D extrusion. That keeps the change low-risk and reuses the proven alpha
// pipeline, but it means the box's 4 side ("depth") faces stay rectangular —
// visible as a thin rectangular edge peeking past the rounded/oval corners
// at grazing viewing angles. To keep this subtle, Depth is auto-capped for
// these two shapes. Straight-on or lightly-rotated views (the vast majority
// of use) look correct either way.
const PICTURE_STYLES = [
  { id: 'none', label: 'কোনো ফ্রেম না' },
  { id: 'simpleWhite', label: 'সাদা বর্ডার', border: { color: '#ffffff', widthRatio: 0.028 } },
  { id: 'simpleBlack', label: 'কালো বর্ডার', border: { color: '#111111', widthRatio: 0.045 } },
  { id: 'thinLine', label: 'পাতলা লাইন', border: { color: '#242424', widthRatio: 0.01 } },
  { id: 'doubleFrame', label: 'ডাবল ফ্রেম', border: { color: '#141414', widthRatio: 0.014, double: true } },
  { id: 'rounded', label: 'গোলাকার কোণা', shape: 'rounded', cornerRatio: 0.1, border: { color: '#ffffff', widthRatio: 0.02 } },
  { id: 'softRounded', label: 'নরম কোণা (Soft Edge)', shape: 'rounded', cornerRatio: 0.12, soft: true },
  { id: 'oval', label: 'ডিম্বাকার (Oval)', shape: 'oval', border: { color: '#ffffff', widthRatio: 0.02 } },
  { id: 'softOval', label: 'নরম ডিম্বাকার', shape: 'oval', soft: true },
  { id: 'bevel', label: 'বেভেল ফ্রেম', border: { color: '#eaeaea', widthRatio: 0.038 }, bevel: true },
  { id: 'dropShadow', label: 'ড্রপ-শ্যাডো ফ্রেম', border: { color: '#ffffff', widthRatio: 0.022 }, dropShadow: true },
  { id: 'metal', label: 'মেটাল ফ্রেম', border: { color: 'metal', widthRatio: 0.052 } },
  { id: 'reflected', label: 'রিফ্লেকশন ফ্রেম', border: { color: '#ffffff', widthRatio: 0.016 }, reflection: true },
  { id: 'polaroid', label: 'পোলারয়েড (ঘোরানো)', border: { color: '#fbfbfb', widthRatio: 0.055, bottomExtraRatio: 0.18 }, tiltZ: -5 },
];

function getPictureStyle(id) {
  return PICTURE_STYLES.find((s) => s.id === id) || PICTURE_STYLES[0];
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function drawShapePath(ctx, shape, x, y, w, h, cornerRatio) {
  if (shape === 'oval') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.01, w / 2), Math.max(0.01, h / 2), 0, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shape === 'rounded') {
    drawRoundedRectPath(ctx, x, y, w, h, Math.min(w, h) * (cornerRatio || 0.1));
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
  }
}

// Draws the uploaded photo onto an offscreen canvas, framed per the chosen
// PICTURE_STYLES entry, and returns everything buildImageCardMesh() needs.
function drawImageCardCanvas(img, style) {
  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;
  const maxDim = IMAGE_TEXTURE_MAX_PX[state.quality] || IMAGE_TEXTURE_MAX_PX.medium;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const photoW = Math.max(1, Math.round(srcW * scale));
  const photoH = Math.max(1, Math.round(srcH * scale));

  const shape = style.shape || 'rect';
  const cornerRatio = style.cornerRatio || 0.1;
  const borderPx = style.border ? Math.round(Math.min(photoW, photoH) * style.border.widthRatio) : 0;
  const bottomExtraPx = style.border && style.border.bottomExtraRatio
    ? Math.round(photoH * style.border.bottomExtraRatio)
    : 0;
  const shadowMarginPx = style.dropShadow ? Math.round(Math.min(photoW, photoH) * 0.09) : 0;

  const pad = borderPx + shadowMarginPx;
  const canvasW = photoW + pad * 2;
  const canvasH = photoH + pad * 2 + bottomExtraPx;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);

  const frameX = shadowMarginPx;
  const frameY = shadowMarginPx;
  const frameW = canvasW - shadowMarginPx * 2;
  const frameH = photoH + borderPx * 2;

  // 1) baked drop shadow, sitting behind the frame on the same texture
  if (style.dropShadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = shadowMarginPx * 0.9;
    ctx.shadowOffsetX = shadowMarginPx * 0.35;
    ctx.shadowOffsetY = shadowMarginPx * 0.45;
    ctx.fillStyle = '#000000';
    drawShapePath(ctx, shape, frameX, frameY, frameW, frameH, cornerRatio);
    ctx.fill();
    ctx.restore();
  }

  // 2) frame/border fill (solid, metal gradient, or double-line)
  if (style.border) {
    ctx.save();
    drawShapePath(ctx, shape, frameX, frameY, frameW, frameH, cornerRatio);
    if (style.border.color === 'metal') {
      const grad = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
      grad.addColorStop(0, '#f4f4f4');
      grad.addColorStop(0.15, '#cbcbd0');
      grad.addColorStop(0.35, '#8d8e94');
      grad.addColorStop(0.5, '#eaeaee');
      grad.addColorStop(0.65, '#7c7d83');
      grad.addColorStop(0.85, '#d7d7db');
      grad.addColorStop(1, '#4a4a4e');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = style.border.color;
    }
    ctx.fill();
    ctx.restore();

    if (style.border.double) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, borderPx * 0.18);
      const inset = borderPx * 0.45;
      drawShapePath(ctx, shape, frameX + inset, frameY + inset, frameW - inset * 2, frameH - inset * 2, cornerRatio);
      ctx.stroke();
      ctx.restore();
    }

    if (style.bevel) {
      ctx.save();
      const inset = borderPx * 0.5;
      drawShapePath(ctx, shape, frameX + inset, frameY + inset, frameW - inset * 2, frameH - inset * 2, cornerRatio);
      const bevelGrad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
      bevelGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
      bevelGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
      bevelGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.strokeStyle = bevelGrad;
      ctx.lineWidth = Math.max(2, borderPx * 0.55);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 3) clip to the inner (photo) area and draw the photo, cover-fit
  ctx.save();
  drawShapePath(ctx, shape, frameX + borderPx, frameY + borderPx, photoW, photoH, cornerRatio);
  ctx.clip();
  ctx.drawImage(img, frameX + borderPx, frameY + borderPx, photoW, photoH);
  ctx.restore();

  // 4) soft feather edge for the 'soft' shapes — blur an alpha mask, then
  //    punch it through the drawn content with destination-in compositing.
  if (style.soft) {
    const featherPx = Math.max(4, Math.min(photoW, photoH) * 0.06);
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasW;
    maskCanvas.height = canvasH;
    const mctx = maskCanvas.getContext('2d');
    mctx.filter = `blur(${featherPx}px)`;
    mctx.fillStyle = '#ffffff';
    drawShapePath(mctx, shape, frameX + borderPx, frameY + borderPx, photoW, photoH, cornerRatio);
    mctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.restore();
  }

  return {
    canvas,
    aspect: canvasW / canvasH,
    shape,
    tiltZ: style.tiltZ || 0,
    reflection: !!style.reflection,
  };
}

function buildImageCardMesh(img) {
  const style = getPictureStyle(state.pictureStyle);
  const { canvas, aspect, shape, tiltZ, reflection } = drawImageCardCanvas(img, style);
  // Unlike the Bangla text card, an uploaded photo reads the same forwards
  // or mirrored (there's no glyph direction to preserve), so both faces use
  // the same un-mirrored texture — cheaper than the text path's two
  // separately-drawn canvases and visually correct either way.
  const frontTex = makeCardTexture(canvas, false);
  const backTex = makeCardTexture(canvas, false);

  const worldHeight = state.size * 1.6; // roughly matches a single line of 3D text at the same `size`
  const worldWidth = worldHeight * aspect;
  // See the PICTURE_STYLES comment above: rounded/oval shapes are an alpha
  // mask on a rectangular box, so depth is capped to keep the rectangular
  // edge from peeking past the rounded/oval silhouette at an angle.
  const depth = shape === 'rect' ? Math.max(1, state.depth) : Math.max(1, Math.min(state.depth, 4));

  const geometry = new THREE.BoxGeometry(worldWidth, worldHeight, depth);
  const materials = buildCanvasCardMaterials(frontTex, backTex, true);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = state.shadowsOn;
  mesh.receiveShadow = state.shadowsOn;

  const group = new THREE.Group();
  group.add(mesh);
  group.userData.frontTex = frontTex;
  group.userData.backTex = backTex;
  group.userData.styleTiltZ = tiltZ;

  // "রিফ্লেকশন ফ্রেম" style: a second, vertically-flipped copy of the same
  // mesh sitting just below the original with reduced opacity — the classic
  // Word "Reflection" picture style. Geometry/textures are shared (not
  // cloned) since Three.js dispose() is safe to call twice; only the
  // materials are cloned so the opacity fade doesn't affect the main mesh.
  if (reflection) {
    const reflMaterials = materials.map((m) => {
      const clone = m.clone();
      clone.transparent = true;
      clone.opacity = 0.32;
      clone.depthWrite = false;
      return clone;
    });
    const reflMesh = new THREE.Mesh(geometry, reflMaterials);
    reflMesh.scale.y = -1;
    reflMesh.position.y = -worldHeight - depth * 0.5;
    reflMesh.castShadow = false;
    reflMesh.receiveShadow = false;
    reflMesh.renderOrder = -1;
    group.add(reflMesh);
    group.userData.reflMaterials = reflMaterials;
  }

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
  const { canvas, aspect } = drawCanvasTextTexture(validLines, {
    curveIntensity: state.curveIntensity,
    curveDirection: state.curveDirection,
    curveSpacing: state.curveSpacing,
  });
  const frontTex = makeCardTexture(canvas, false);
  const backTex = makeCardTexture(canvas, true);

  const lineHeight = state.size * 1.35;
  const worldHeight = lineHeight * validLines.length + state.size * 0.5; // pad to roughly match canvas padding
  const worldWidth = worldHeight * aspect;
  const depth = Math.max(1, state.depth);

  const geometry = new THREE.BoxGeometry(worldWidth, worldHeight, depth);
  const materials = buildCanvasCardMaterials(frontTex, backTex, false);
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

// ---------- PLAN_3 §2: Sticker/Badge text mode ----------
// Reuses the exact canvas-texture-card pipeline §8.1 built for Bangla text
// (drawCanvasTextTexture → makeCardTexture → buildCanvasCardMaterials → a
// BoxGeometry with 6 materials): instead of drawing just glyphs, first paint
// a background shape (circle / rounded-rect for Phase A1's "Simple Sticker"
// base case, plus the 5 more §2.1 template families added in Phase A2 —
// starburst, stamp/seal, ribbon/tag, speech/alert bubble, radiant/confetti
// burst), then draw the label text centered on top, both in their own chosen
// colors baked directly into the texture (not tinted via state.color/
// material, since a badge's colors are part of its content, not its
// "material"). Because the result is again just a Group with a textured
// BoxGeometry, every existing Rotate/Material/Shadow/Reflection/Animation/
// Export code path keeps working unmodified — Phase A2 only had to touch the
// shape-drawing step below, nothing else in the pipeline.
const STICKER_FONT_STACK = CANVAS_TEXT_FONT_STACK;
const STICKER_FONT_PX = 200; // supersampled resolution, independent of world-space size
const STICKER_PAD_RATIO = 0.28; // base padding between shape edge and text, relative to shape size

// Phase A2: per-shape sizing knobs, layered on top of STICKER_PAD_RATIO.
// `square: true` shapes (radial: circle/starburst/stamp/radiant) get a
// square canvas sized off the text's diagonal footprint, same reasoning as
// the original circle case. `square: false` shapes (banner-like: rect/
// ribbon/speech) size width/height independently. `padMul` scales the base
// padding up for shapes whose decoration (spikes/rays/points) needs extra
// room *outside* the text-fitting circle/rect so tips don't get clipped by
// the canvas edge. `pointExtraW`/`tailRatio` add shape-specific extra room
// (ribbon's pointed tips eat into width; speech's tail needs bottom
// headroom that must NOT be treated as part of the "body" the text centers
// in).
const STICKER_SHAPE_SIZING = {
  circle: { square: true, padMul: 1.0 },
  roundedRect: { square: false, padMul: 1.0 },
  wavyBanner: { square: false, padMul: 1.2 },
  thoughtCloud: { square: true, padMul: 1.3, tailRatio: 0.25 },
  speechOval: { square: false, padMul: 1.25, tailRatio: 0.22 },
  glassPlate: { square: false, padMul: 1.1 },
  waterRipple: { square: true, padMul: 1.2 },
  whiteCutout: { square: false, padMul: 1.05 },
  starburst: { square: true, padMul: 1.15 },
  stamp: { square: true, padMul: 1.08 },
  ribbon: { square: false, padMul: 1.15, pointExtraW: 0.22 },
  speech: { square: false, padMul: 1.0, tailRatio: 0.22 },
  hexagon: { square: true, padMul: 1.15 },
  diamond: { square: true, padMul: 1.35 },
  lowerThird: { square: false, padMul: 1.0 },
  pill: { square: false, padMul: 1.1 },
  heart: { square: true, padMul: 1.3 },
  neonFrame: { square: false, padMul: 1.15 },
  radiant: { square: true, padMul: 1.7 },
  starSpray: { square: true, padMul: 1.85 },
  letterBlocks: { square: false, padMul: 1.2 },
};

// curveOpts (PLAN_3 §3.2 — curve works *inside* badges too):
// { curveIntensity, curveDirection, curveSpacing }.
// curveOpts (PLAN_3 §3.2 — curve works *inside* badges too):
// { curveIntensity, curveDirection, curveSpacing }.
// borderOpts (PLAN_3 §2.2 Phase A3): { borderWidth, borderColor, shadow }.
function drawStickerCanvasTexture(
  text,
  shape,
  bgColor,
  textColor,
  curveOpts = { curveIntensity: 0 },
  borderOpts = {}
) {
  const { borderWidth = 0, borderColor = '#ffffff', shadow = false } = borderOpts;
  const lines = (text || ' ').split(/\r?\n/).map((l) => (l.length > 0 ? l : ' '));

  const measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = `700 ${STICKER_FONT_PX}px ${STICKER_FONT_STACK}`;
  const arcOpts = {
    curveIntensity: curveOpts.curveIntensity,
    direction: curveOpts.curveDirection,
    spacing: curveOpts.curveSpacing,
  };
  const { perLine, maxLineWidth, maxBulge } = layoutCurvedLines(measureCtx, lines, arcOpts);
  const textMaxWidthPx = maxLineWidth;
  const lineHeightPx = STICKER_FONT_PX * 1.25;
  const textBlockH = lineHeightPx * lines.length + maxBulge * 2;

  const sizing = STICKER_SHAPE_SIZING[shape] || STICKER_SHAPE_SIZING.circle;
  const extraPadding = (borderWidth || 0) * 2 + (shadow ? 24 : 0);
  let padPx = Math.max(textMaxWidthPx, textBlockH) * STICKER_PAD_RATIO * sizing.padMul + extraPadding;
  if (shape === 'speech') padPx += STICKER_FONT_PX * 0.8; // extra room for alarm clock icon
  let canvasW;
  let bodyH;
  if (sizing.square) {
    const diameter = Math.ceil(Math.sqrt(textMaxWidthPx ** 2 + textBlockH ** 2) + padPx * 1.6);
    canvasW = diameter;
    bodyH = diameter;
  } else {
    canvasW = Math.ceil(textMaxWidthPx + padPx * 2.2 + (sizing.pointExtraW || 0) * textMaxWidthPx);
    bodyH = Math.ceil(textBlockH + padPx * 1.4);
  }
  const tailPx = sizing.tailRatio ? Math.round(bodyH * sizing.tailRatio) : 0;
  const canvasH = bodyH + tailPx;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);

  // 1) background shape
  ctx.save();
  drawStickerShape(ctx, shape, canvasW, bodyH, tailPx, bgColor, borderWidth, borderColor, shadow);
  ctx.restore();

  // 2) label text, centered within the body (offset for speech bubble icon)
  ctx.save();
  ctx.font = `700 ${STICKER_FONT_PX}px ${STICKER_FONT_STACK}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textCenterX = shape === 'speech' ? canvasW / 2 + Math.min(canvasW, bodyH) * 0.08 : canvasW / 2;
  const startY = bodyH / 2 - textBlockH / 2 + maxBulge + lineHeightPx / 2;
  perLine.forEach(({ clusters, layout }, i) => {
    drawCurvedLine(ctx, clusters, layout, textCenterX, startY + lineHeightPx * i);
  });
  ctx.restore();

  return { canvas, aspect: canvasW / canvasH };
}

// ---------- PLAN_3 §2.1 (Phase A2): background-shape template functions ----------
function drawStarPolygonPath(ctx, cx, cy, outerR, innerR, spikes) {
  ctx.beginPath();
  const step = Math.PI / spikes;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    angle += step;
  }
  ctx.closePath();
}

function drawScallopedCirclePath(ctx, cx, cy, outerR, innerR, bumps) {
  ctx.beginPath();
  const amp = (outerR - innerR) / 2;
  const baseR = (outerR + innerR) / 2;
  const steps = bumps * 8;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = baseR + amp * Math.cos(t * bumps);
    const x = cx + Math.cos(t) * r;
    const y = cy + Math.sin(t) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawRibbonPath(ctx, x, y, w, h, pointW) {
  const midY = y + h / 2;
  const pw = Math.min(pointW, w / 2 - 1);
  ctx.beginPath();
  ctx.moveTo(x + pw, y);
  ctx.lineTo(x + w - pw, y);
  ctx.lineTo(x + w, midY);
  ctx.lineTo(x + w - pw, y + h);
  ctx.lineTo(x + pw, y + h);
  ctx.lineTo(x, midY);
  ctx.closePath();
}

function drawSpeechBubblePath(ctx, x, y, w, bodyH, tailPx, r) {
  drawRoundedRectPath(ctx, x, y, w, bodyH, r);
  if (tailPx > 0) {
    const tailBaseW = Math.min(w * 0.22, bodyH * 0.5);
    const tailCx = x + w * 0.28;
    ctx.moveTo(tailCx - tailBaseW / 2, y + bodyH - 2);
    ctx.lineTo(tailCx + tailBaseW / 2, y + bodyH - 2);
    ctx.lineTo(tailCx - tailBaseW * 0.15, y + bodyH + tailPx);
    ctx.closePath();
  }
}

function drawConfettiStars(ctx, cx, cy, outerR, color) {
  ctx.save();
  ctx.fillStyle = color;
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = outerR * (0.78 + Math.random() * 0.18);
    const dx = cx + Math.cos(angle) * dist;
    const dy = cy + Math.sin(angle) * dist;
    const starR = outerR * (0.035 + Math.random() * 0.025);
    drawStarPolygonPath(ctx, dx, dy, starR, starR * 0.45, 4);
    ctx.fill();
  }
  ctx.restore();
}

// 1. Peeled Sticker Corner ("yes!" reference)
function drawPeeledStickerCorner(ctx, cx, cy, r) {
  ctx.save();
  const foldX = cx + r * 0.45;
  const foldY = cy + r * 0.45;
  const tipX = cx + r * 0.88;
  const tipY = cy + r * 0.88;

  // Shadow behind folded corner flap
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = -4;
  ctx.shadowOffsetY = -4;

  // Paper backing (white/grey fold)
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.42, cy + r * 0.95);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(cx + r * 0.95, cy + r * 0.42);
  ctx.closePath();
  ctx.fill();

  // White gradient fold flap
  const grad = ctx.createLinearGradient(foldX, foldY, tipX, tipY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#d6d6d6');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.48, cy + r * 0.9);
  ctx.lineTo(foldX, foldY);
  ctx.lineTo(cx + r * 0.9, cy + r * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 2. Rubber Stamp Double Frame ("ORIGINAL" reference)
function drawRubberStampFrame(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(5, Math.min(w, h) * 0.05);
  ctx.lineJoin = 'miter';
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.02);
  const inset = Math.max(10, Math.min(w, h) * 0.08);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.restore();
}

// 3. Alarm Clock Icon ("HURRY UP!" reference)
function drawAlarmClockIcon(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);

  const r = size * 0.36;
  const cx = x + size / 2;
  const cy = y + size / 2 + size * 0.06;

  // Bell ears
  ctx.beginPath();
  ctx.arc(cx - r * 0.7, cy - r * 0.7, r * 0.32, Math.PI * 0.8, Math.PI * 1.8);
  ctx.arc(cx + r * 0.7, cy - r * 0.7, r * 0.32, Math.PI * 1.2, Math.PI * 0.2);
  ctx.stroke();

  // Clock face
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Clock hands
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - r * 0.4, cy - r * 0.4);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.5, cy - r * 0.3);
  ctx.stroke();

  ctx.restore();
}

// 4. Colorful 3D Star Spray ("SPECIAL" multi-star spray reference)
function drawStarClusterSpray(ctx, cx, cy, outerR) {
  ctx.save();
  const starColors = ['#4caf50', '#ffeb3b', '#ff9800', '#00bcd4', '#e91e63', '#9c27b0'];
  const starCount = 8;
  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2 - Math.PI / 2;
    const dist = outerR * (0.85 + (i % 3) * 0.08);
    const starR = outerR * (0.16 + (i % 2) * 0.05);
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    drawStarPolygonPath(ctx, sx + 2, sy + 2, starR, starR * 0.45, 5);
    ctx.fill();

    // Star
    ctx.fillStyle = starColors[i % starColors.length];
    drawStarPolygonPath(ctx, sx, sy, starR, starR * 0.45, 5);
    ctx.fill();
  }
  ctx.restore();
}

// 5. Celebration Gold/Silver Starburst Rays ("Congratulations" reference)
function drawCelebrationRays(ctx, cx, cy, outerR) {
  ctx.save();
  const rayCount = 14;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const len = outerR * (0.82 + (i % 2) * 0.18);
    ctx.strokeStyle = i % 2 === 0 ? '#ffd700' : '#d0d0d0';
    ctx.lineWidth = Math.max(3, outerR * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (outerR * 0.35), cy + Math.sin(angle) * (outerR * 0.35));
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();

    if (i % 2 === 0) {
      ctx.fillStyle = '#ffb300';
      drawStarPolygonPath(ctx, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len, outerR * 0.08, outerR * 0.04, 4);
      ctx.fill();
    }
  }
  ctx.restore();
}

// 6. Yellow 3D Letter Block Tiles ("ONLY FOR YOU" block tiles reference)
function drawLetterBlocksBackground(ctx, w, h, color) {
  ctx.save();
  const pad = Math.max(6, Math.min(w, h) * 0.06);
  const blockR = Math.max(8, Math.min(w, h) * 0.08);

  ctx.fillStyle = color === '#e5484d' ? '#fbc02d' : color;
  drawRoundedRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, blockR);
  ctx.fill();

  // 3D Bottom Bevel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.moveTo(pad, h - pad - blockR);
  ctx.lineTo(pad + 6, h - pad);
  ctx.lineTo(w - pad - 6, h - pad);
  ctx.lineTo(w - pad, h - pad - blockR);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 7. Wavy Banner Path
function drawWavyBannerPath(ctx, x, y, w, h) {
  const amp = h * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, y + amp);
  ctx.bezierCurveTo(x + w * 0.3, y - amp, x + w * 0.7, y + amp * 2, x + w, y + amp);
  ctx.lineTo(x + w, y + h + amp);
  ctx.bezierCurveTo(x + w * 0.7, y + h + amp * 2, x + w * 0.3, y + h - amp, x, y + h + amp);
  ctx.closePath();
}

// 8. Thought Cloud Path with Bubble Tails
function drawThoughtCloudPath(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  const bumps = 8;
  for (let i = 0; i < bumps; i++) {
    const angle = (i / bumps) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * (rx * 0.78);
    const by = cy + Math.sin(angle) * (ry * 0.78);
    const br = Math.min(rx, ry) * 0.34;
    ctx.arc(bx, by, br, 0, Math.PI * 2);
  }
  ctx.closePath();
}
function drawThoughtBubbles(ctx, cx, cy, rx, ry, color) {
  ctx.save();
  ctx.fillStyle = color;
  const b1 = [cx - rx * 0.55, cy + ry * 0.82, rx * 0.12];
  const b2 = [cx - rx * 0.72, cy + ry * 1.05, rx * 0.08];
  const b3 = [cx - rx * 0.85, cy + ry * 1.22, rx * 0.05];
  [b1, b2, b3].forEach(([bx, by, br]) => {
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

// 9. Oval Speech Bubble Path
function drawSpeechOvalPath(ctx, cx, cy, rx, ry, tailPx) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (tailPx > 0) {
    ctx.moveTo(cx - rx * 0.35, cy + ry * 0.75);
    ctx.lineTo(cx - rx * 0.65, cy + ry + tailPx);
    ctx.lineTo(cx - rx * 0.1, cy + ry * 0.9);
    ctx.closePath();
  }
}

// 10. Hexagon Path
function drawHexagonPath(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// 11. Diamond Path
function drawDiamondPath(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
}

// 12. Heart Path
function drawHeartPath(ctx, cx, cy, rx, ry) {
  const topY = cy - ry * 0.35;
  ctx.beginPath();
  ctx.moveTo(cx, cy + ry * 0.88);
  ctx.bezierCurveTo(cx - rx * 1.35, cy + ry * 0.1, cx - rx * 1.15, cy - ry * 1.05, cx, topY);
  ctx.bezierCurveTo(cx + rx * 1.15, cy - ry * 1.05, cx + rx * 1.35, cy + ry * 0.1, cx, cy + ry * 0.88);
  ctx.closePath();
}

// 13. Pill / Capsule Path
function drawPillPath(ctx, x, y, w, h) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

// 14. Frosted Glass Plate
function drawGlassPlateBackground(ctx, w, h) {
  ctx.save();
  const r = Math.min(w, h) * 0.14;
  const gGrad = ctx.createLinearGradient(0, 0, w, h);
  gGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  gGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  gGrad.addColorStop(1, 'rgba(255, 255, 255, 0.28)');
  ctx.fillStyle = gGrad;
  drawRoundedRectPath(ctx, 4, 4, w - 8, h - 8, r);
  ctx.fill();

  const shine = ctx.createLinearGradient(0, 0, w * 0.8, h * 0.8);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  shine.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.moveTo(4, 4);
  ctx.lineTo(w * 0.65, 4);
  ctx.lineTo(4, h * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;
  drawRoundedRectPath(ctx, 4, 4, w - 8, h - 8, r);
  ctx.stroke();
  ctx.restore();
}

// 15. Water Ripple / Liquid Drop Plaque
function drawWaterRippleBackground(ctx, w, h, color) {
  ctx.save();
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 6;
  const ry = h / 2 - 6;

  const wGrad = ctx.createRadialGradient(cx - rx * 0.25, cy - ry * 0.3, 10, cx, cy, rx);
  wGrad.addColorStop(0, '#67e8f9');
  wGrad.addColorStop(0.5, '#06b6d4');
  wGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = wGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2.5;
  [0.4, 0.7, 0.92].forEach(scale => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * scale, ry * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.45, cy - ry * 0.45, rx * 0.22, ry * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 16. Lower Third Video Bar
function drawLowerThirdBackground(ctx, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ff0055';
  ctx.fillRect(0, 0, Math.max(12, w * 0.03), h);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.moveTo(w - Math.max(20, h * 0.6), 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(w - Math.max(30, h * 0.9), h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 17. Neon Frame Box
function drawNeonFrameBackground(ctx, w, h, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
  drawRoundedRectPath(ctx, 6, 6, w - 12, h - 12, 10);
  ctx.fill();

  ctx.shadowColor = color || '#00e5ff';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = color || '#00e5ff';
  ctx.lineWidth = 4;
  drawRoundedRectPath(ctx, 8, 8, w - 16, h - 16, 8);
  ctx.stroke();

  ctx.lineWidth = 6;
  const bLen = Math.min(24, Math.min(w, h) * 0.25);
  ctx.beginPath(); ctx.moveTo(8, 8 + bLen); ctx.lineTo(8, 8); ctx.lineTo(8 + bLen, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 8 - bLen, 8); ctx.lineTo(w - 8, 8); ctx.lineTo(w - 8, 8 + bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, h - 8 - bLen); ctx.lineTo(8, h - 8); ctx.lineTo(8 + bLen, h - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 8 - bLen, h - 8); ctx.lineTo(w - 8, h - 8); ctx.lineTo(w - 8, h - 8 - bLen); ctx.stroke();
  ctx.restore();
}

function drawStickerShape(ctx, shape, w, bodyH, tailPx, color, borderWidth = 0, borderColor = '#ffffff', shadow = false) {
  const cx = w / 2;
  const cy = bodyH / 2;
  const outerR = Math.min(w, bodyH) / 2;

  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = Math.max(10, Math.min(w, bodyH) * 0.08);
    ctx.shadowOffsetY = Math.max(4, Math.min(w, bodyH) * 0.04);
  }

  ctx.fillStyle = color;
  switch (shape) {
    case 'wavyBanner':
      drawWavyBannerPath(ctx, 4, 4, w - 8, bodyH - 8);
      ctx.fill();
      break;
    case 'thoughtCloud':
      drawThoughtCloudPath(ctx, cx, cy, cx - 12, cy - 12);
      ctx.fill();
      drawThoughtBubbles(ctx, cx, cy, cx - 12, cy - 12, color);
      break;
    case 'speechOval':
      drawSpeechOvalPath(ctx, cx, cy, cx - 10, cy - 10, tailPx);
      ctx.fill();
      break;
    case 'glassPlate':
      drawGlassPlateBackground(ctx, w, bodyH);
      break;
    case 'waterRipple':
      drawWaterRippleBackground(ctx, w, bodyH, color);
      break;
    case 'whiteCutout':
      ctx.fillStyle = '#ffffff';
      drawRoundedRectPath(ctx, 0, 0, w, bodyH, Math.min(w, bodyH) * 0.25);
      ctx.fill();
      ctx.fillStyle = color;
      drawRoundedRectPath(ctx, 12, 12, w - 24, bodyH - 24, Math.min(w, bodyH) * 0.2);
      ctx.fill();
      break;
    case 'hexagon':
      drawHexagonPath(ctx, cx, cy, outerR * 0.95, outerR * 0.95);
      ctx.fill();
      break;
    case 'diamond':
      drawDiamondPath(ctx, cx, cy, outerR * 0.96, outerR * 0.96);
      ctx.fill();
      break;
    case 'lowerThird':
      drawLowerThirdBackground(ctx, w, bodyH, color);
      break;
    case 'pill':
      drawPillPath(ctx, 4, 4, w - 8, bodyH - 8);
      ctx.fill();
      break;
    case 'heart':
      drawHeartPath(ctx, cx, cy, outerR * 0.72, outerR * 0.72);
      ctx.fill();
      break;
    case 'neonFrame':
      drawNeonFrameBackground(ctx, w, bodyH, color);
      break;
    case 'roundedRect':
      drawRoundedRectPath(ctx, 0, 0, w, bodyH, Math.min(w, bodyH) * 0.16);
      ctx.fill();
      break;
    case 'starburst':
      drawStarPolygonPath(ctx, cx, cy, outerR, outerR * 0.72, 14);
      ctx.fill();
      ctx.lineWidth = Math.max(3, outerR * 0.05);
      ctx.strokeStyle = '#111111';
      ctx.stroke();
      break;
    case 'stamp':
      drawScallopedCirclePath(ctx, cx, cy, outerR, outerR * 0.92, 20);
      ctx.fill();
      drawRubberStampFrame(ctx, w, bodyH, color === '#e5484d' ? '#c62828' : color);
      break;
    case 'ribbon':
      drawRibbonPath(ctx, 0, 0, w, bodyH, Math.min(w, bodyH) * 0.28);
      ctx.fill();
      break;
    case 'speech':
      drawSpeechBubblePath(ctx, 0, 0, w, bodyH, tailPx, Math.min(w, bodyH) * 0.18);
      ctx.fill();
      drawAlarmClockIcon(ctx, Math.min(w, bodyH) * 0.04, Math.min(w, bodyH) * 0.06, Math.min(w, bodyH) * 0.22, '#d32f2f');
      break;
    case 'radiant': {
      drawCelebrationRays(ctx, cx, cy, outerR);
      const coreW = w * 0.75;
      const coreH = bodyH * 0.55;
      ctx.fillStyle = '#ffffff';
      drawRoundedRectPath(ctx, (w - coreW) / 2, (bodyH - coreH) / 2, coreW, coreH, 8);
      ctx.fill();
      drawConfettiStars(ctx, cx, cy, outerR, color);
      break;
    }
    case 'starSpray': {
      drawStarClusterSpray(ctx, cx, cy, outerR);
      const coreR = outerR * 0.65;
      drawStarPolygonPath(ctx, cx, cy, outerR * 0.85, coreR, 16);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy, coreR, coreR, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'letterBlocks': {
      drawLetterBlocksBackground(ctx, w, bodyH, color);
      break;
    }
    case 'circle':
    default:
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, bodyH / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      drawPeeledStickerCorner(ctx, cx, cy, outerR);
      break;
  }
  ctx.restore();

  if (borderWidth > 0) {
    ctx.save();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    switch (shape) {
      case 'wavyBanner':
        drawWavyBannerPath(ctx, 4, 4, w - 8, bodyH - 8);
        ctx.stroke();
        break;
      case 'thoughtCloud':
        drawThoughtCloudPath(ctx, cx, cy, cx - 12, cy - 12);
        ctx.stroke();
        break;
      case 'speechOval':
        drawSpeechOvalPath(ctx, cx, cy, cx - 10, cy - 10, tailPx);
        ctx.stroke();
        break;
      case 'glassPlate':
        drawRoundedRectPath(ctx, 4, 4, w - 8, bodyH - 8, Math.min(w, bodyH) * 0.14);
        ctx.stroke();
        break;
      case 'waterRipple':
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2 - 6, bodyH / 2 - 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'whiteCutout':
        drawRoundedRectPath(ctx, 0, 0, w, bodyH, Math.min(w, bodyH) * 0.25);
        ctx.stroke();
        break;
      case 'hexagon':
        drawHexagonPath(ctx, cx, cy, outerR * 0.95, outerR * 0.95);
        ctx.stroke();
        break;
      case 'diamond':
        drawDiamondPath(ctx, cx, cy, outerR * 0.96, outerR * 0.96);
        ctx.stroke();
        break;
      case 'lowerThird':
        ctx.strokeRect(0, 0, w, bodyH);
        break;
      case 'pill':
        drawPillPath(ctx, 4, 4, w - 8, bodyH - 8);
        ctx.stroke();
        break;
      case 'heart':
        drawHeartPath(ctx, cx, cy, outerR * 0.72, outerR * 0.72);
        ctx.stroke();
        break;
      case 'neonFrame':
        drawRoundedRectPath(ctx, 8, 8, w - 16, bodyH - 16, 8);
        ctx.stroke();
        break;
      case 'roundedRect':
      case 'letterBlocks':
        drawRoundedRectPath(ctx, 0, 0, w, bodyH, Math.min(w, bodyH) * 0.16);
        ctx.stroke();
        break;
      case 'starburst':
        drawStarPolygonPath(ctx, cx, cy, outerR, outerR * 0.72, 14);
        ctx.stroke();
        break;
      case 'stamp':
        drawScallopedCirclePath(ctx, cx, cy, outerR, outerR * 0.92, 20);
        ctx.stroke();
        break;
      case 'ribbon':
        drawRibbonPath(ctx, 0, 0, w, bodyH, Math.min(w, bodyH) * 0.28);
        ctx.stroke();
        break;
      case 'speech':
        drawSpeechBubblePath(ctx, 0, 0, w, bodyH, tailPx, Math.min(w, bodyH) * 0.18);
        ctx.stroke();
        break;
      case 'radiant':
      case 'starSpray': {
        const coreR = outerR * 0.55;
        drawStarPolygonPath(ctx, cx, cy, outerR, coreR * 0.98, 20);
        ctx.stroke();
        break;
      }
      case 'circle':
      default:
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2, bodyH / 2, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

function buildStickerCardMesh(text, shape, bgColor, textColor, curveOpts, borderOpts) {
  const { canvas, aspect } = drawStickerCanvasTexture(text, shape, bgColor, textColor, curveOpts, borderOpts);
  const frontTex = makeCardTexture(canvas, false);
  const backTex = makeCardTexture(canvas, true);

  const worldHeight = state.size * 1.6; // badges read a bit larger than plain text at the same "সাইজ" value
  const worldWidth = worldHeight * aspect;
  const depth = Math.max(1, state.depth);

  const geometry = new THREE.BoxGeometry(worldWidth, worldHeight, depth);
  const materials = buildCanvasCardMaterials(frontTex, backTex, true);
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

// ======================== 3D CUBE BOX MODE (Design 3) ========================
// Builds a 3D cube (BoxGeometry) with canvas-rendered text on up to 3 faces:
//   Face 0 (front), Face 1 (back), Face 2 (top), Face 3 (bottom),
//   Face 4 (right), Face 5 (left)  — Three.js BoxGeometry face order.
// We put Face1 text on front+back, Face2 text on right+left, Face3 text on top.
function drawCubeFaceCanvas(faceText, cubeColor, textColor, borderColor) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background: rich solid cube body color with subtle radial vignette
  ctx.fillStyle = cubeColor;
  ctx.fillRect(0, 0, size, size);
  const vgrd = ctx.createRadialGradient(size/2, size/2, size*0.08, size/2, size/2, size*0.72);
  vgrd.addColorStop(0, 'rgba(255,255,255,0.18)');
  vgrd.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vgrd;
  ctx.fillRect(0, 0, size, size);

  // Subtle grid lines for 3D feel
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const gp = (size / 4) * g;
    ctx.beginPath(); ctx.moveTo(gp, 0); ctx.lineTo(gp, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gp); ctx.lineTo(size, gp); ctx.stroke();
  }

  if (!faceText || !faceText.trim()) return { canvas };

  // Choose font size based on text length
  const len = faceText.length;
  const fontSize = len <= 1 ? size * 0.62 : len <= 3 ? size * 0.42 : size * 0.28;
  const fontFamily = `"Grand Hotel", "Pacifico", sans-serif`;
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Multi-layered 3D emboss: dark offset shadow layers
  const shadowLayers = 7;
  for (let s = shadowLayers; s >= 1; s--) {
    const alpha = 0.08 + (shadowLayers - s) * 0.04;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillText(faceText, size/2 + s*2, size/2 + s*2);
  }

  // Bold dark outline for cartoon 3D pop
  ctx.lineWidth = fontSize * 0.14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = borderColor || '#0a0a2a';
  ctx.strokeText(faceText, size/2, size/2);

  // Main text fill: vertical highlight gradient
  const tGrad = ctx.createLinearGradient(0, size/2 - fontSize*0.6, 0, size/2 + fontSize*0.6);
  const tc = textColor || '#ffffff';
  tGrad.addColorStop(0, lightenHex(tc, 0.5));
  tGrad.addColorStop(0.4, tc);
  tGrad.addColorStop(1, darkenHex(tc, 0.4));
  ctx.fillStyle = tGrad;
  ctx.fillText(faceText, size/2, size/2);

  return { canvas };
}

function buildCubeBoxMesh() {
  const cubeSize = state.size * 1.4;
  const cubeColor = state.cubeColor || '#1d4ed8';
  const textColor = state.cubeTextColor || '#ffffff';
  const borderColor = state.cubeTextBorder || '#0f172a';

  const face1 = state.cubeFace1 || '3';
  const face2 = state.cubeFace2 || 'D';
  const face3 = state.cubeFace3 || '';

  // Draw each face canvas
  const { canvas: cFront } = drawCubeFaceCanvas(face1, cubeColor, textColor, borderColor);
  const { canvas: cRight } = drawCubeFaceCanvas(face2, cubeColor, textColor, borderColor);
  const { canvas: cTop } = drawCubeFaceCanvas(face3, cubeColor, textColor, borderColor);
  const { canvas: cBack } = drawCubeFaceCanvas(face1, cubeColor, textColor, borderColor);
  const { canvas: cLeft } = drawCubeFaceCanvas(face2, cubeColor, textColor, borderColor);
  const { canvas: cBottom } = drawCubeFaceCanvas('', cubeColor, textColor, borderColor);

  function makeCubeTex(cnv, mirrorH) {
    const t = new THREE.CanvasTexture(cnv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (mirrorH) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
    t.needsUpdate = true;
    return t;
  }

  // BoxGeometry face order: right(+x), left(-x), top(+y), bottom(-y), front(+z), back(-z)
  const materials = [
    new THREE.MeshStandardMaterial({ map: makeCubeTex(cRight, false), roughness: 0.25, metalness: 0.1 }),  // right
    new THREE.MeshStandardMaterial({ map: makeCubeTex(cLeft, true),  roughness: 0.25, metalness: 0.1 }),  // left
    new THREE.MeshStandardMaterial({ map: makeCubeTex(cTop, false),  roughness: 0.25, metalness: 0.1 }),  // top
    new THREE.MeshStandardMaterial({ map: makeCubeTex(cBottom, false), roughness: 0.35, metalness: 0.1 }), // bottom
    new THREE.MeshStandardMaterial({ map: makeCubeTex(cFront, false), roughness: 0.20, metalness: 0.12 }), // front
    new THREE.MeshStandardMaterial({ map: makeCubeTex(cBack, true),  roughness: 0.20, metalness: 0.12 }),  // back
  ];

  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = state.shadowsOn;
  mesh.receiveShadow = state.shadowsOn;

  const group = new THREE.Group();
  group.add(mesh);

  renderMode = 'canvas';
  textMesh = group;
  textMesh.material = materials;
}

function rebuildTextMesh() {
  if (state.contentMode === 'sticker') {
    disposeTextMesh();
    buildStickerCardMesh(
      state.stickerText,
      state.stickerShape,
      state.stickerBgColor,
      state.stickerTextColor,
      {
        curveIntensity: state.curveIntensity,
        curveDirection: state.curveDirection,
        curveSpacing: state.curveSpacing,
      },
      {
        borderWidth: state.stickerBorderWidth,
        borderColor: state.stickerBorderColor,
        shadow: state.stickerShadow,
      }
    );
    applyRotation();
    scene.add(textMesh);
    updateQualityNote();
    updateTextModeNote(false);
    updateShadowFrustum();
    return;
  }

  // ---- 3D CUBE BOX MODE ----
  if (state.contentMode === 'cube') {
    disposeTextMesh();
    buildCubeBoxMesh();
    applyRotation();
    scene.add(textMesh);
    updateQualityNote();
    if (typeof updateTextModeNote === 'function') updateTextModeNote(false);
    updateShadowFrustum();
    return;
  }

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
    updateShadowFrustum();
    return;
  }

  // Determine rendering path first: canvas-card (correct shaping, curved
  // lines) vs. vector TextGeometry path. The canvas path must be allowed to
  // run even when the vendored typeface-JSON `font` isn't loaded yet (the
  // vendored JSON only applies to the vector/extrude path). Previously the
  // function returned early if `font` was falsy which blocked canvas-based
  // Bangla rendering until the JSON font parsed — that prevented using the
  // bundled TTF for canvas draws. Compute the decision first and only
  // require `font` when the vector path is selected.

  const rawContent = state.text || ' ';
  const lines = rawContent.split(/\r?\n/);
  const validLines = lines.map((l) => (l.length > 0 ? l : ' '));

  const isCustomFontOrGradient = (state.fontFamily && state.fontFamily !== 'helvetiker') || state.colorMode === 'gradient' || state.colorMode === 'multicolor' || state.colorMode === 'pattern';
  const needsCanvasCard = isBanglaText(rawContent) || state.curveIntensity !== 0 || isCustomFontOrGradient;

  // If vector geometry is required but the vendored JSON font isn't parsed
  // yet, delay the rebuild until it is available. Canvas-card path does not
  // need `font` and should proceed immediately.
  if (!needsCanvasCard && !font) return;

  disposeTextMesh();

  if (needsCanvasCard) {
    buildCanvasCardTextMesh(validLines);
  } else {
    buildVectorTextMesh(validLines);
  }

  applyRotation();
  scene.add(textMesh);
  updateQualityNote();
  updateTextModeNote(isBanglaText(rawContent), state.curveIntensity !== 0);
  updateShadowFrustum();
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

function updateTextModeNote(isBangla, curveOn = false) {
  if (!textModeNote) return;
  if (isBangla && curveOn) {
    // PLAN_3 §3, Phase B2 caveat: curve draws one grapheme cluster at a
    // time (see curve.js splitGraphemes), which keeps a single conjunct
    // (ক্ষ ইত্যাদি) intact but can't do cross-cluster shaping the way one
    // whole-line fillText() call does — worth surfacing, not silently
    // shipping a subtly different Bangla render than the straight case.
    textModeNote.textContent =
      'বাংলা লেখা শনাক্ত হয়েছে — ছবি-টেক্সচার কার্ড মোডে রেন্ডার হচ্ছে। কার্ভ চালু থাকায় প্রতিটা অক্ষর/যুক্তাক্ষর আলাদাভাবে বসানো হচ্ছে (একসাথে পুরো লাইন শেপ করা হচ্ছে না) — জটিল যুক্তাক্ষরে সামান্য পার্থক্য দেখা যেতে পারে সোজা টেক্সটের তুলনায়।';
  } else if (isBangla) {
    textModeNote.textContent =
      'বাংলা লেখা শনাক্ত হয়েছে — ছবি-টেক্সচার কার্ড মোডে রেন্ডার হচ্ছে (ব্রাউজারের নিজস্ব বাংলা ফন্ট/শেপিং ব্যবহার করে, তাই যুক্তাক্ষর/মাত্রা ঠিকভাবে বসে), বাক্যের প্রান্ত থেকে গভীরতা বের হয় — আলাদা আলাদা অক্ষরের কিনারা থেকে না।';
  } else if (curveOn) {
    textModeNote.textContent =
      'কার্ভ চালু থাকায় ছবি-টেক্সচার কার্ড মোডে রেন্ডার হচ্ছে (ভেক্টর ৩ডি এক্সট্রুশনের বদলে) — বাক্যের প্রান্ত থেকে গভীরতা বের হয়, আলাদা আলাদা অক্ষরের কিনারা থেকে না।';
  } else {
    textModeNote.textContent = '';
  }
  textModeNote.hidden = !(isBangla || curveOn);
}

function applyPosition() {
  if (!textMesh) return;
  textMesh.position.set(state.posX || 0, state.posY || 0, state.posZ || 0);
  updateShadowFrustum();
}

function applyRotation() {
  if (!textMesh) return;
  // §৮.২ picture styles: some frames (e.g. "পোলারয়েড") bake in a fixed extra
  // tilt on top of whatever the user's Rotate/Tilt sliders say, exactly like
  // Word's "Rotated, White Frame" style. Defaults to 0 for text and for
  // every non-tilted picture style, so this is a no-op everywhere else.
  const styleTiltZ = (textMesh.userData && textMesh.userData.styleTiltZ) || 0;
  textMesh.rotation.set(
    THREE.MathUtils.degToRad(state.rotX),
    THREE.MathUtils.degToRad(state.rotY),
    THREE.MathUtils.degToRad(state.rotZ + styleTiltZ)
  );
  applyPosition();
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
    const materials = buildCanvasCardMaterials(textMesh.userData.frontTex, textMesh.userData.backTex, state.contentMode === 'image' || state.contentMode === 'sticker');
    mesh.material = materials;
    textMesh.material = materials;
    if (Array.isArray(old)) old.forEach((m) => m.dispose());

    // Keep the "রিফ্লেকশন ফ্রেম" copy (if this image has one) in sync with
    // whatever material/color the main mesh just switched to.
    const reflMesh = textMesh.children[1];
    if (reflMesh && reflMesh.isMesh) {
      const oldRefl = reflMesh.material;
      const reflMaterials = materials.map((m) => {
        const clone = m.clone();
        clone.transparent = true;
        clone.opacity = 0.32;
        clone.depthWrite = false;
        return clone;
      });
      reflMesh.material = reflMaterials;
      textMesh.userData.reflMaterials = reflMaterials;
      if (Array.isArray(oldRefl)) oldRefl.forEach((m) => m.dispose());
    }
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
  updateShadowFrustum();
}

function applyReflectionToggle() {
  scene.environment = state.reflectionsOn ? envTexture : null;
  applyMaterial(); // rebuild material so envMapIntensity picks up the new state
}

// ---------- Phase 3: animation playback ----------
// `applyPresetOffset` is the single place that turns a preset's {pos, rot,
// scaleMul, opacityMul} into an actual mesh transform. It always layers the
// offset on TOP of the current slider-configured base position and rotation,
// so manually placing or rotating the object changes where the animation
// lands, not just its starting pose.
function applyPresetOffset(preset, t) {
  if (!textMesh) return;
  const { pos, rot, scaleMul, opacityMul } = preset.apply(t);

  textMesh.position.set(
    (state.posX || 0) + pos[0],
    (state.posY || 0) + pos[1],
    (state.posZ || 0) + pos[2]
  );
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
  applyPosition();
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
// Try to register an optional bundled Bengali TTF so canvas text draws are
// deterministic across platforms. This is best-effort; if the file is not
// present the page continues to work normally.
registerBundledCanvasFont();
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
  rebuildTimer = setTimeout(() => {
    rebuildTextMesh();
    saveStudioStateDebounced();
  }, 120); // debounce so typing stays smooth
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
  stickerContentSection.hidden = state.contentMode !== 'sticker';
  if (cubeContentSection) cubeContentSection.hidden = state.contentMode !== 'cube';
  // PLAN_3 §3.2: curve control is shared by Text and Sticker, hidden for Image and Cube.
  curveSection.hidden = state.contentMode === 'image' || state.contentMode === 'cube';
  stopAnimation(); // switching the active object mid-playback would animate a stale mesh
  rebuildTextMesh();
  updateExportSourceNote();
});

// ---------- Cube box controls wiring ----------
if (cubeFace1Input) cubeFace1Input.addEventListener('input', () => { state.cubeFace1 = cubeFace1Input.value; if (state.contentMode === 'cube') scheduleRebuild(); });
if (cubeFace2Input) cubeFace2Input.addEventListener('input', () => { state.cubeFace2 = cubeFace2Input.value; if (state.contentMode === 'cube') scheduleRebuild(); });
if (cubeFace3Input) cubeFace3Input.addEventListener('input', () => { state.cubeFace3 = cubeFace3Input.value; if (state.contentMode === 'cube') scheduleRebuild(); });
if (cubeColorPicker) cubeColorPicker.addEventListener('input', () => { state.cubeColor = cubeColorPicker.value; if (state.contentMode === 'cube') scheduleRebuild(); });
if (cubeTextColorPicker) cubeTextColorPicker.addEventListener('input', () => { state.cubeTextColor = cubeTextColorPicker.value; if (state.contentMode === 'cube') scheduleRebuild(); });
if (cubeTextBorderPicker) cubeTextBorderPicker.addEventListener('input', () => { state.cubeTextBorder = cubeTextBorderPicker.value; if (state.contentMode === 'cube') scheduleRebuild(); });

// ---------- PLAN_3 §2: sticker/badge text wiring ----------
stickerTextInput.addEventListener('input', () => {
  state.stickerText = stickerTextInput.value;
  scheduleRebuild();
});

stickerShapeGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.stickerShape = btn.dataset.stickerShape;
  setActivePreset(stickerShapeGrid, 'stickerShape', state.stickerShape);
  if (state.contentMode === 'sticker') rebuildTextMesh();
});

stickerBgColorPicker.addEventListener('input', () => {
  state.stickerBgColor = stickerBgColorPicker.value;
  if (state.contentMode === 'sticker') scheduleRebuild();
});

stickerTextColorPicker.addEventListener('input', () => {
  state.stickerTextColor = stickerTextColorPicker.value;
  if (state.contentMode === 'sticker') scheduleRebuild();
});

stickerBorderWidthRange.addEventListener('input', () => {
  const val = parseInt(stickerBorderWidthRange.value, 10);
  stickerBorderWidthValue.textContent = `${val}px`;
  state.stickerBorderWidth = val;
  if (state.contentMode === 'sticker') scheduleRebuild();
});

stickerBorderColorPicker.addEventListener('input', () => {
  state.stickerBorderColor = stickerBorderColorPicker.value;
  if (state.contentMode === 'sticker') scheduleRebuild();
});

stickerShadowCheckbox.addEventListener('change', () => {
  state.stickerShadow = stickerShadowCheckbox.checked;
  if (state.contentMode === 'sticker') scheduleRebuild();
});

// ---------- PLAN_3 §3: curved text wiring (Phase B3) ----------
// Shared by Text and Sticker content modes — rebuildTextMesh() itself reads
// state.contentMode to decide which mesh to (re)build, so a single
// scheduleRebuild() here is correct for whichever of the two is active.
curveIntensityRange.addEventListener('input', () => {
  state.curveIntensity = Number(curveIntensityRange.value);
  curveIntensityValue.textContent = state.curveIntensity;
  if (state.contentMode === 'text' || state.contentMode === 'sticker') scheduleRebuild();
});

curveDirectionGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.curveDirection = btn.dataset.curveDirection;
  setActivePreset(curveDirectionGrid, 'curveDirection', state.curveDirection);
  if (state.contentMode === 'text' || state.contentMode === 'sticker') scheduleRebuild();
});

curveSpacingRange.addEventListener('input', () => {
  const pct = Number(curveSpacingRange.value);
  state.curveSpacing = pct / 100;
  curveSpacingValue.textContent = `${pct}%`;
  if (state.contentMode === 'text' || state.contentMode === 'sticker') scheduleRebuild();
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

// ---------- §8.2 follow-up: picture style gallery (image mode only) ----------
pictureStyleGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  state.pictureStyle = btn.dataset.pictureStyle;
  setActivePreset(pictureStyleGrid, 'pictureStyle', state.pictureStyle);
  if (state.contentMode === 'image' && state.imageElement) rebuildTextMesh();
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

// ---------- State Auto-Save & Restore (Persist across page refresh) ----------
function saveStudioState() {
  try {
    const toSave = {
      text: state.text,
      fontFamily: state.fontFamily,
      colorMode: state.colorMode,
      colorStart: state.colorStart,
      colorEnd: state.colorEnd,
      gradientPreset: state.gradientPreset,
      gradientType: state.gradientType,
      gradientAngle: state.gradientAngle,
      posX: state.posX,
      posY: state.posY,
      rotX: state.rotX,
      rotY: state.rotY,
      rotZ: state.rotZ,
      depth: state.depth,
      size: state.size,
      color: state.color,
      materialType: state.materialType,
      lightingPreset: state.lightingPreset,
      bgMode: state.bgMode,
      bgColor: state.bgColor
    };
    localStorage.setItem('3d_studio_saved_state', JSON.stringify(toSave));
  } catch (_) {}
}

let saveTimeout = null;
function saveStudioStateDebounced() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveStudioState, 300);
}

function loadStudioState() {
  try {
    const raw = localStorage.getItem('3d_studio_saved_state');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved) return;

    if (saved.text !== undefined && textInput) {
      state.text = saved.text;
      textInput.value = saved.text;
    }
    if (saved.fontFamily && fontSelect) {
      state.fontFamily = saved.fontFamily;
      fontSelect.value = saved.fontFamily;
    }
    if (saved.colorMode && colorModeSelect) {
      state.colorMode = saved.colorMode;
      colorModeSelect.value = saved.colorMode;
      if (solidColorGroup) solidColorGroup.hidden = saved.colorMode !== 'solid';
      if (gradientColorGroup) gradientColorGroup.hidden = saved.colorMode !== 'gradient';
      if (multicolorGroup) multicolorGroup.hidden = saved.colorMode !== 'multicolor';
      if (patternGroup) patternGroup.hidden = saved.colorMode !== 'pattern';
    }
    if (saved.colorStart && colorStartPicker) {
      state.colorStart = saved.colorStart;
      colorStartPicker.value = saved.colorStart;
    }
    if (saved.colorEnd && colorEndPicker) {
      state.colorEnd = saved.colorEnd;
      colorEndPicker.value = saved.colorEnd;
    }
    if (saved.gradientPreset && gradientPresetSelect) {
      state.gradientPreset = saved.gradientPreset;
      gradientPresetSelect.value = saved.gradientPreset;
      if (customGradientControls) customGradientControls.hidden = saved.gradientPreset !== 'custom';
    }
    if (saved.gradientType && gradientTypeSelect) {
      state.gradientType = saved.gradientType;
      gradientTypeSelect.value = saved.gradientType;
    }
    if (saved.gradientAngle !== undefined && gradientAngleRange) {
      state.gradientAngle = saved.gradientAngle;
      gradientAngleRange.value = saved.gradientAngle;
      if (gradientAngleValue) gradientAngleValue.textContent = `${saved.gradientAngle}°`;
    }
    if (saved.posX !== undefined && posXRange) {
      state.posX = saved.posX;
      posXRange.value = saved.posX;
      if (posXValue) posXValue.textContent = `${saved.posX}px`;
    }
    if (saved.posY !== undefined && posYRange) {
      state.posY = saved.posY;
      posYRange.value = saved.posY;
      if (posYValue) posYValue.textContent = `${saved.posY}px`;
    }
    if (saved.rotX !== undefined && rotXRange) {
      state.rotX = saved.rotX;
      rotXRange.value = saved.rotX;
      if (rotXValue) rotXValue.textContent = `${saved.rotX}°`;
    }
    if (saved.rotY !== undefined && rotYRange) {
      state.rotY = saved.rotY;
      rotYRange.value = saved.rotY;
      if (rotYValue) rotYValue.textContent = `${saved.rotY}°`;
    }
    if (saved.rotZ !== undefined && rotZRange) {
      state.rotZ = saved.rotZ;
      rotZRange.value = saved.rotZ;
      if (rotZValue) rotZValue.textContent = `${saved.rotZ}°`;
    }
    if (saved.depth !== undefined && depthRange) {
      state.depth = saved.depth;
      depthRange.value = saved.depth;
      if (depthValue) depthValue.textContent = saved.depth;
    }
    if (saved.size !== undefined && sizeRange) {
      state.size = saved.size;
      sizeRange.value = saved.size;
      if (sizeValue) sizeValue.textContent = saved.size;
    }
    if (saved.materialType) {
      state.materialType = saved.materialType;
      setActivePreset(materialPresetGrid, 'material', saved.materialType);
    }
    if (saved.bgMode && bgModeSelect) {
      state.bgMode = saved.bgMode;
      bgModeSelect.value = saved.bgMode;
    }
  } catch (_) {}
}

// ---------- Direct Drag Pointer Manipulation (Natural 1:1 Move / Rotate / Orbit) ----------
let isPointerDragging = false;
let previousPointerPos = { x: 0, y: 0 };

viewportEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return; // Left click only
  if (!state.dragEnabled) return;
  if (state.dragMode === 'orbit') return;

  isPointerDragging = true;
  previousPointerPos = { x: e.clientX, y: e.clientY };
  controls.enabled = false;
  viewportEl.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (e) => {
  if (!isPointerDragging || !state.dragEnabled || state.dragMode === 'orbit') return;

  const deltaX = e.clientX - previousPointerPos.x;
  const deltaY = e.clientY - previousPointerPos.y;
  previousPointerPos = { x: e.clientX, y: e.clientY };

  if (state.dragMode === 'move') {
    // Exact 1:1 screen-to-world conversion at camera distance
    const vH = 2 * Math.tan(((camera.fov || 45) * Math.PI) / 360) * Math.abs(camera.position.z || 220);
    const scale = (viewportEl.clientHeight && viewportEl.clientHeight > 0) ? (vH / viewportEl.clientHeight) : 0.45;

    state.posX = Math.round(state.posX + deltaX * scale);
    state.posY = Math.round(state.posY - deltaY * scale);

    state.posX = Math.max(-400, Math.min(400, state.posX));
    state.posY = Math.max(-300, Math.min(300, state.posY));

    if (posXRange) posXRange.value = state.posX;
    if (posXValue) posXValue.textContent = `${state.posX}px`;
    if (posYRange) posYRange.value = state.posY;
    if (posYValue) posYValue.textContent = `${state.posY}px`;

    applyPosition();
    saveStudioStateDebounced();
  } else if (state.dragMode === 'rotate') {
    let newRotY = (state.rotY + deltaX * 0.5) % 360;
    if (newRotY > 180) newRotY -= 360;
    if (newRotY < -180) newRotY -= 360;

    let newRotX = (state.rotX + deltaY * 0.5) % 360;
    if (newRotX > 180) newRotX -= 360;
    if (newRotX < -180) newRotX -= 360;

    state.rotX = Math.round(newRotX);
    state.rotY = Math.round(newRotY);

    if (rotXRange) rotXRange.value = state.rotX;
    if (rotXValue) rotXValue.textContent = `${state.rotX}°`;
    if (rotYRange) rotYRange.value = state.rotY;
    if (rotYValue) rotYValue.textContent = `${state.rotY}°`;

    applyRotation();
    saveStudioStateDebounced();
  }
});

const stopPointerDrag = () => {
  if (isPointerDragging) {
    isPointerDragging = false;
    controls.enabled = !state.dragEnabled || state.dragMode === 'orbit';
    viewportEl.style.cursor = state.dragEnabled && state.dragMode !== 'orbit' ? 'grab' : 'default';
    saveStudioState();
  }
};

window.addEventListener('pointerup', stopPointerDrag);
window.addEventListener('pointercancel', stopPointerDrag);
window.addEventListener('mouseup', stopPointerDrag);
window.addEventListener('blur', stopPointerDrag);

if (posXRange) {
  posXRange.addEventListener('input', () => {
    state.posX = Number(posXRange.value);
    if (posXValue) posXValue.textContent = `${state.posX}px`;
    applyPosition();
    saveStudioStateDebounced();
  });
}

if (posYRange) {
  posYRange.addEventListener('input', () => {
    state.posY = Number(posYRange.value);
    if (posYValue) posYValue.textContent = `${state.posY}px`;
    applyPosition();
    saveStudioStateDebounced();
  });
}

if (quickAlignGrid) {
  quickAlignGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    const align = btn.dataset.align;
    if (align === 'topLeft') {
      state.posX = -170;
      state.posY = 90;
    } else if (align === 'topRight') {
      state.posX = 170;
      state.posY = 90;
    } else if (align === 'center') {
      state.posX = 0;
      state.posY = 0;
    } else if (align === 'bottomLeft') {
      state.posX = -170;
      state.posY = -80;
    } else if (align === 'bottomCenter') {
      state.posX = 0;
      state.posY = -80;
    } else if (align === 'bottomRight') {
      state.posX = 170;
      state.posY = -80;
    }
    if (posXRange) posXRange.value = state.posX;
    if (posXValue) posXValue.textContent = `${state.posX}px`;
    if (posYRange) posYRange.value = state.posY;
    if (posYValue) posYValue.textContent = `${state.posY}px`;
    applyPosition();
    saveStudioState();
  });
}

if (dragModeSelect) {
  dragModeSelect.addEventListener('change', () => {
    state.dragMode = dragModeSelect.value;
    controls.enabled = state.dragMode === 'orbit';
    viewportEl.style.cursor = state.dragEnabled && state.dragMode !== 'orbit' ? 'grab' : 'default';
  });
}

if (dragEnabledToggle) {
  dragEnabledToggle.addEventListener('change', () => {
    state.dragEnabled = dragEnabledToggle.checked;
    controls.enabled = !state.dragEnabled || state.dragMode === 'orbit';
    viewportEl.style.cursor = state.dragEnabled && state.dragMode !== 'orbit' ? 'grab' : 'default';
  });
}

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
  } else if (exportFormatSelect.value === 'gif') {
    exportSourceNote.textContent = 'সোর্স: স্থির (কোনো অ্যানিমেশন/অটো-রোটেট নেই) — ১-ফ্রেমের স্থির GIF এক্সপোর্ট হবে';
  } else {
    exportSourceNote.textContent = `সোর্স: স্থির (কোনো অ্যানিমেশন/অটো-রোটেট নেই) — ${(STATIC_WEBM_MS / 1000).toFixed(1)}s-এর স্থির ভিডিও এক্সপোর্ট হবে`;
  }

  updateGifSizeEstimate();
}

function updateWebmSupportNote() {
  const supported = isWebMExportSupported();
  webmSupportNote.hidden = supported || exportFormatSelect.value !== 'webm';
  exportBtn.disabled = exportFormatSelect.value === 'webm' && !supported;
}

// PLAN_3 §4.4 Phase C6: rough pre-export size estimate + guardrail note.
function updateGifSizeEstimate() {
  const isGif = exportFormatSelect.value === 'gif';
  gifOptionsGroup.hidden = !isGif;
  if (!isGif) return;

  const mode = currentExportSourceMode();
  const [width, height] = exportResolutionSelect.value.split('x').map(Number);
  const fps = Number(exportFpsSelect.value);
  const totalMs =
    mode === 'animated'
      ? animState.delayMs + animState.durationMs
      : mode === 'turntable'
        ? Number(turntableLengthRange.value)
        : 0;
  const frameCount = estimateGifFrameCount(totalMs, fps, mode !== 'static');
  const estBytes = estimateGifSizeBytes(width, height, frameCount);
  const sizeLabel = formatBytes(estBytes);

  gifSizeEstimateNote.textContent = `আনুমানিক সাইজ: ~${sizeLabel} (${frameCount}টা ফ্রেম, ${width}×${height}) — এটা একটা মোটামুটি ধারণা, আসল সাইজ কম-বেশি হতে পারে।`;
  gifSizeEstimateNote.classList.toggle('field-note-warning', estBytes > 15 * 1024 * 1024);
  if (estBytes > 15 * 1024 * 1024) {
    gifSizeEstimateNote.textContent += ' ⚠️ বেশ বড় ফাইল হতে পারে — রেজলিউশন/FPS/দৈর্ঘ্য কমানোর কথা ভাবুন।';
  }
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

exportResolutionSelect.addEventListener('change', updateGifSizeEstimate);
exportFpsSelect.addEventListener('change', updateGifSizeEstimate);
gifQualitySelect.addEventListener('change', updateGifSizeEstimate);

gifTransparentToggle.addEventListener('change', () => {
  gifBackgroundColorField.hidden = gifTransparentToggle.checked;
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
    // GIF-only fields (harmless/ignored by the WebM and PNG export paths):
    quality: Number(gifQualitySelect.value),
    loop: gifLoopToggle.checked,
    transparentBg: gifTransparentToggle.checked,
    backgroundColor: gifBackgroundColorPicker.value,
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
        : format === 'gif'
          ? await exportGif(deps, opts, callbacks)
          : await exportPngSequence(deps, opts, callbacks);

    const ext = format === 'webm' ? 'webm' : format === 'gif' ? 'gif' : 'zip';
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

// ---------- Font, Gradient & Background Event Listeners ----------
if (fontSelect) {
  fontSelect.addEventListener('change', async () => {
    state.fontFamily = fontSelect.value;
    if (state.fontFamily && state.fontFamily !== 'helvetiker') {
      try {
        await document.fonts.load(`600 220px "${state.fontFamily}"`);
      } catch (err) {
        console.warn('Font load error:', err);
      }
    }
    scheduleRebuild();
  });
}

if (colorModeSelect) {
  colorModeSelect.addEventListener('change', () => {
    state.colorMode = colorModeSelect.value;
    if (solidColorGroup) solidColorGroup.hidden = state.colorMode !== 'solid';
    if (gradientColorGroup) gradientColorGroup.hidden = state.colorMode !== 'gradient';
    if (multicolorGroup) multicolorGroup.hidden = state.colorMode !== 'multicolor';
    if (patternGroup) patternGroup.hidden = state.colorMode !== 'pattern';
    scheduleRebuild();
  });
}

if (gradientPresetSelect) {
  gradientPresetSelect.addEventListener('change', () => {
    state.gradientPreset = gradientPresetSelect.value;
    if (customGradientControls) customGradientControls.hidden = state.gradientPreset !== 'custom';
    scheduleRebuild();
  });
}

if (gradientTypeSelect) {
  gradientTypeSelect.addEventListener('change', () => {
    state.gradientType = gradientTypeSelect.value;
    scheduleRebuild();
  });
}

if (colorStartPicker) {
  colorStartPicker.addEventListener('input', () => {
    state.colorStart = colorStartPicker.value;
    if (state.colorMode === 'gradient') scheduleRebuild();
  });
}

if (colorEndPicker) {
  colorEndPicker.addEventListener('input', () => {
    state.colorEnd = colorEndPicker.value;
    if (state.colorMode === 'gradient') scheduleRebuild();
  });
}

// ---------- Multicolor palette & pattern controls ----------
if (multicolorPaletteSelect) {
  multicolorPaletteSelect.addEventListener('change', () => {
    state.multicolorPalette = multicolorPaletteSelect.value;
    if (state.colorMode === 'multicolor') scheduleRebuild();
  });
}
if (comicOutlineToggle) {
  comicOutlineToggle.addEventListener('change', () => {
    state.comicOutline = comicOutlineToggle.checked;
    if (state.colorMode === 'multicolor') scheduleRebuild();
  });
}
if (patternPresetSelect) {
  patternPresetSelect.addEventListener('change', () => {
    state.patternPreset = patternPresetSelect.value;
    if (state.colorMode === 'pattern') scheduleRebuild();
  });
}
if (festiveDecorToggle) {
  festiveDecorToggle.addEventListener('change', () => {
    state.festiveDecor = festiveDecorToggle.checked;
    if (state.colorMode === 'pattern') scheduleRebuild();
  });
}

if (gradientAngleRange) {
  gradientAngleRange.addEventListener('input', () => {
    state.gradientAngle = Number(gradientAngleRange.value);
    if (gradientAngleValue) gradientAngleValue.textContent = `${state.gradientAngle}°`;
    if (state.colorMode === 'gradient') scheduleRebuild();
  });
}

if (bgModeSelect) {
  bgModeSelect.addEventListener('change', () => {
    state.bgMode = bgModeSelect.value;
    if (bgColorGroup) bgColorGroup.hidden = state.bgMode !== 'color';
    if (bgImageGroup) bgImageGroup.hidden = state.bgMode !== 'image';
    updateSceneBackground();
  });
}

if (bgColorPicker) {
  bgColorPicker.addEventListener('input', () => {
    state.bgColor = bgColorPicker.value;
    if (state.bgMode === 'color') updateSceneBackground();
  });
}

if (bgFileInput) {
  bgFileInput.addEventListener('change', () => {
    const file = bgFileInput.files && bgFileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (bgImageNote) bgImageNote.textContent = 'শুধু ইমেজ ফাইল (JPG/PNG/WebP) সাপোর্টেড।';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.bgImageElement = img;
        state.bgMode = 'image';
        if (bgModeSelect) bgModeSelect.value = 'image';
        if (bgColorGroup) bgColorGroup.hidden = true;
        if (bgPreviewThumb) {
          bgPreviewThumb.src = reader.result;
          bgPreviewThumb.hidden = false;
        }
        if (bgImageNote) bgImageNote.textContent = `✓ ছবি যুক্ত হয়েছে: ${file.name} (${img.naturalWidth}×${img.naturalHeight}px)`;
        updateSceneBackground();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- load saved state and initial preset UI state ----------
loadStudioState();
setActivePreset(contentModeGrid, 'content', state.contentMode);
setActivePreset(curveDirectionGrid, 'curveDirection', state.curveDirection);
setActivePreset(materialPresetGrid, 'material', state.materialType);
setActivePreset(lightingPresetGrid, 'lighting', state.lightingPreset);
setActivePreset(animPresetGrid, 'anim', animState.presetId);
setActivePreset(qualityPresetGrid, 'quality', state.quality);
setActivePreset(pictureStyleGrid, 'pictureStyle', state.pictureStyle);
animPlayBtn.disabled = animState.presetId === 'none';
buildLightingPreset(state.lightingPreset);
updateSceneBackground();
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
