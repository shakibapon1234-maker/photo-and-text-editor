// Presentation Studio — Native 3D Text engine (PLAN_4 §2)
//
// This is a small, purpose-built subset of the standalone 3D Text Module
// (see PLAN_2_3D_Text_Module.md) reused *conceptually* — same idea of
// text -> extruded geometry -> material preset -> lighting preset -> snapshot
// — but re-implemented lean here on purpose:
//   - No shadows / reflections / RoomEnvironment (heavy on low-end GPUs)
//   - No OrbitControls (rotation is via explicit X/Y/Z sliders, per the
//     saved element schema, not free camera orbit)
//   - Low curveSegments / bevelSegments and capped pixel ratio, since this
//     is Option B from PLAN_4 §2.1: only ever one live WebGL context, open
//     only while the mini-editor modal is open. The moment the modal closes
//     the renderer/context is disposed — nothing 3D keeps running in the
//     background while the user edits the rest of the deck.
//
// Public API: window.Presentation3DText.open(existingParams, onInsert)
//   existingParams: null for "insert new", or a saved text3dParams object
//                   for "re-edit" (see presentation-3d-text-live.js)
//   onInsert(dataURL, params): called once when the user clicks
//                   Insert/Update. Never called on Cancel.

import * as THREE from './vendor/three/three.module.js';
import { FontLoader } from './vendor/three/addons/FontLoader.js';
import { TextGeometry } from './vendor/three/addons/TextGeometry.js';

const FONTS = [
  ['helvetiker_bold', 'Helvetiker Bold'],
  ['Montserrat', 'Montserrat'],
  ['PlayfairDisplay', 'Playfair Display'],
  ['Bungee', 'Bungee'],
  ['Lobster', 'Lobster'],
  ['Pacifico', 'Pacifico'],
];

const MATERIAL_PRESETS = {
  matte: { label: 'Matte', build: c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 }) },
  plastic: { label: 'Glossy Plastic', build: c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.18, metalness: 0.06 }) },
  metal: { label: 'Metal', build: c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.28, metalness: 1 }) },
  glass: { label: 'Frosted Glass', build: c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55 }) },
  neon: { label: 'Neon Glow', build: c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0, emissive: c, emissiveIntensity: 1.8 }) },
};

const LIGHTING_PRESETS = {
  studio: { label: 'Studio', build: scene => {
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.4); fill.position.set(-4, -1, 2); scene.add(fill);
  }},
  dramatic: { label: 'Dramatic', build: scene => {
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(5, 2, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7a4d, 0.7); rim.position.set(-4, 1, -3); scene.add(rim);
  }},
  soft: { label: 'Soft', build: scene => {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x33415c, 0.9));
    const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(2, 3, 4); scene.add(fill);
  }},
  neonGlow: { label: 'Neon Stage', build: scene => {
    scene.add(new THREE.AmbientLight(0x1a1030, 0.5));
    const p1 = new THREE.PointLight(0xff2fd6, 1.6, 20); p1.position.set(3, 2, 3); scene.add(p1);
    const p2 = new THREE.PointLight(0x2fd6ff, 1.6, 20); p2.position.set(-3, -1, 2); scene.add(p2);
  }},
};

let fontCache = {};
async function loadFont(key) {
  if (fontCache[key]) return fontCache[key];
  const res = await fetch('./vendor/fonts/' + key + '.typeface.json');
  const json = await res.json();
  const font = new FontLoader().parse(json);
  fontCache[key] = font;
  return font;
}

function css() {
  if (document.getElementById('p3d-style')) return;
  const style = document.createElement('style');
  style.id = 'p3d-style';
  style.textContent = `
  #p3dOverlay{position:fixed;inset:0;z-index:200;background:#000c;display:flex;align-items:center;justify-content:center}
  #p3dModal{width:min(920px,94vw);max-height:92vh;overflow:auto;background:#111b2c;border:1px solid #40506b;border-radius:14px;box-shadow:0 30px 80px #000c;padding:16px}
  #p3dModal h2{margin:0 0 4px;color:#ffd166;font-size:16px}
  #p3dModal .p3d-sub{color:#98a8c4;font-size:11px;margin-bottom:12px}
  #p3dBody{display:grid;grid-template-columns:1fr 300px;gap:16px}
  #p3dCanvasWrap{position:relative;background:repeating-conic-gradient(#1a2337 0% 25%,#131c2d 0% 50%) 50%/24px 24px;border:1px solid #2b3852;border-radius:10px;overflow:hidden;aspect-ratio:16/10}
  #p3dCanvasWrap canvas{width:100%;height:100%;display:block}
  #p3dControls{display:flex;flex-direction:column;gap:10px;max-height:64vh;overflow:auto;padding-right:4px}
  #p3dControls label{display:block;color:#98a8c4;font-size:11px;font-weight:700}
  #p3dControls input[type=text],#p3dControls select,#p3dControls textarea{width:100%;margin-top:4px;border:1px solid #34425e;background:#0b1220;color:#fff;border-radius:6px;padding:7px;font:13px inherit}
  #p3dControls textarea{resize:vertical;min-height:52px}
  #p3dControls input[type=range]{width:100%}
  .p3d-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .p3d-swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
  .p3d-swatch{aspect-ratio:1;border:2px solid #64748b;border-radius:6px;cursor:pointer;font-size:10px;color:#fff;display:flex;align-items:center;justify-content:center;background:#1c2740;text-align:center;line-height:1.15;padding:2px}
  .p3d-swatch.active{border-color:#ffb11b}
  .p3d-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
  .p3d-foot button{border:1px solid #35445f;border-radius:7px;padding:9px 14px;background:#202c40;color:#fff;font:700 12px inherit;cursor:pointer}
  .p3d-foot button:hover{border-color:#ffb11b}
  .p3d-foot button.primary{background:#a85008;border-color:#ffb11b}
  #p3dClose{position:absolute;top:8px;right:8px;background:#0009;color:#fff;border:none;border-radius:6px;width:26px;height:26px;cursor:pointer}
  #p3dHint{font-size:10px;color:#6b7d9c;margin-top:2px}
  `;
  document.head.appendChild(style);
}

function defaultParams() {
  // Brand Kit (presentation-brand-kit.js) may have a saved default
  // material/lighting/color combo — new inserts start from that instead
  // of the hardcoded fallback below. Re-edits of an existing element
  // never touch this (existingParams already overrides it in open()).
  const kit = window.PresentationBrandKit && window.PresentationBrandKit.get();
  const kitHasStyle = kit && kit.text3dMaterial && kit.text3dLighting;
  return {
    text: '3D Text',
    font: 'helvetiker_bold',
    size: 1,
    depth: 0.35,
    bevel: true,
    color: (kitHasStyle && kit.text3dColor) || '#ffb11b',
    material: (kitHasStyle && kit.text3dMaterial) || 'metal',
    lighting: (kitHasStyle && kit.text3dLighting) || 'studio',
    rotX: -10,
    rotY: 20,
    rotZ: 0,
  };
}

let session = 0; // guards against a stale editor session writing after close

function open(existingParams, onInsert) {
  css();
  const mySession = ++session;
  const params = Object.assign(defaultParams(), existingParams || {});
  const isEdit = !!existingParams;

  const overlay = document.createElement('div');
  overlay.id = 'p3dOverlay';
  overlay.innerHTML = `
  <div id="p3dModal">
    <button id="p3dClose" title="Close">×</button>
    <h2>${isEdit ? 'Edit 3D Text' : 'Insert 3D Text'}</h2>
    <div class="p3d-sub">Type your text, pick a look, then insert it directly onto the slide as a live-editable element.</div>
    <div id="p3dBody">
      <div id="p3dCanvasWrap"></div>
      <div id="p3dControls">
        <label>Text<textarea id="p3dText"></textarea></label>
        <label>Font<select id="p3dFont">${FONTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <div class="p3d-row">
          <label>Size<input id="p3dSize" type="range" min="0.5" max="1.8" step="0.05"></label>
          <label>Depth<input id="p3dDepth" type="range" min="0.05" max="1" step="0.05"></label>
        </div>
        <label><input id="p3dBevel" type="checkbox" style="width:auto;display:inline-block;margin-right:6px">Beveled edges</label>
        <label>Color<input id="p3dColor" type="color"></label>
        <label>Material</label>
        <div class="p3d-swatches" id="p3dMaterial"></div>
        <label>Lighting</label>
        <div class="p3d-swatches" id="p3dLighting"></div>
        <div class="p3d-row">
          <label>Rotate X<input id="p3dRotX" type="range" min="-180" max="180" step="1"></label>
          <label>Rotate Y<input id="p3dRotY" type="range" min="-180" max="180" step="1"></label>
        </div>
        <label>Rotate Z<input id="p3dRotZ" type="range" min="-180" max="180" step="1"></label>
        <div id="p3dHint">Preview renders locally while this window is open — closing it stops the 3D renderer.</div>
      </div>
    </div>
    <div class="p3d-foot">
      <button id="p3dSaveDefault" title="পরের বার নতুন 3D Text বসানোর সময় এই material+lighting+color অটো-প্রয়োগ হবে">★ Save as default style</button>
      <button id="p3dCancel">Cancel</button>
      <button id="p3dInsert" class="primary">${isEdit ? 'Update on Slide' : 'Insert to Slide'}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const $ = id => overlay.querySelector('#' + id);
  $('p3dText').value = params.text;
  $('p3dFont').value = params.font;
  $('p3dSize').value = params.size;
  $('p3dDepth').value = params.depth;
  $('p3dBevel').checked = params.bevel;
  $('p3dColor').value = params.color;
  $('p3dRotX').value = params.rotX;
  $('p3dRotY').value = params.rotY;
  $('p3dRotZ').value = params.rotZ;

  Object.entries(MATERIAL_PRESETS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.className = 'p3d-swatch' + (key === params.material ? ' active' : '');
    b.textContent = def.label;
    b.type = 'button';
    b.onclick = () => { params.material = key; $('p3dMaterial').querySelectorAll('.p3d-swatch').forEach(n => n.classList.remove('active')); b.classList.add('active'); rebuildMesh(); };
    $('p3dMaterial').appendChild(b);
  });
  Object.entries(LIGHTING_PRESETS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.className = 'p3d-swatch' + (key === params.lighting ? ' active' : '');
    b.textContent = def.label;
    b.type = 'button';
    b.onclick = () => { params.lighting = key; $('p3dLighting').querySelectorAll('.p3d-swatch').forEach(n => n.classList.remove('active')); b.classList.add('active'); rebuildLighting(); };
    $('p3dLighting').appendChild(b);
  });

  // ---------- Three.js scene: single live context, only while modal is open ----------
  const wrap = $('p3dCanvasWrap');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // capped for low-end GPUs
  renderer.setSize(wrap.clientWidth || 600, wrap.clientHeight || 375, false);
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, (wrap.clientWidth || 600) / (wrap.clientHeight || 375), 0.1, 100);
  camera.position.set(0, 0, 6);

  let mesh = null;
  let lightGroup = new THREE.Group();
  scene.add(lightGroup);

  function rebuildLighting() {
    lightGroup.clear();
    (LIGHTING_PRESETS[params.lighting] || LIGHTING_PRESETS.studio).build(lightGroup);
  }

  async function rebuildMesh() {
    const font = await loadFont(params.font);
    if (mySession !== session) return; // modal closed while font loaded
    const text = ($('p3dText').value || ' ').slice(0, 60);
    const geo = new TextGeometry(text, {
      font,
      size: Number(params.size),
      height: Number(params.depth), // TextGeometry's API name is "height", not "depth", despite our own field being called depth
      curveSegments: 6,
      bevelEnabled: !!params.bevel,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);

    const materialDef = MATERIAL_PRESETS[params.material] || MATERIAL_PRESETS.matte;
    const material = materialDef.build(new THREE.Color(params.color));

    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
    mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);
    frameCamera(geo.boundingBox);
    syncRotation();
  }

  function frameCamera(box) {
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, 1) * Number(params.size) * 1.15;
    camera.position.set(0, 0, Math.max(3.2, maxDim * 2.3));
    camera.lookAt(0, 0, 0);
  }

  function syncRotation() {
    if (!mesh) return;
    mesh.rotation.x = THREE.MathUtils.degToRad(Number(params.rotX));
    mesh.rotation.y = THREE.MathUtils.degToRad(Number(params.rotY));
    mesh.rotation.z = THREE.MathUtils.degToRad(Number(params.rotZ));
  }

  let raf = null;
  function loop() {
    if (mySession !== session) return; // stop the moment the modal closes
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  rebuildLighting();
  rebuildMesh();
  loop();

  // ---------- wire up controls ----------
  let textDebounce = null;
  $('p3dText').oninput = () => { clearTimeout(textDebounce); textDebounce = setTimeout(rebuildMesh, 180); };
  $('p3dFont').onchange = () => { params.font = $('p3dFont').value; rebuildMesh(); };
  $('p3dSize').oninput = () => { params.size = $('p3dSize').value; rebuildMesh(); };
  $('p3dDepth').oninput = () => { params.depth = $('p3dDepth').value; rebuildMesh(); };
  $('p3dBevel').onchange = () => { params.bevel = $('p3dBevel').checked; rebuildMesh(); };
  $('p3dColor').oninput = () => { params.color = $('p3dColor').value; rebuildMesh(); };
  ['p3dRotX', 'p3dRotY', 'p3dRotZ'].forEach(id => {
    $(id).oninput = () => { params.rotX = $('p3dRotX').value; params.rotY = $('p3dRotY').value; params.rotZ = $('p3dRotZ').value; syncRotation(); };
  });

  function cleanup() {
    session++; // invalidates this session so no async callback touches disposed objects
    cancelAnimationFrame(raf);
    if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }
    renderer.dispose();
    overlay.remove();
  }

  if (window.PresentationBrandKit) {
    $('p3dSaveDefault').onclick = () => {
      window.PresentationBrandKit.saveText3DStyle(params.material, params.lighting, params.color);
      const original = $('p3dSaveDefault').textContent;
      $('p3dSaveDefault').textContent = '✓ Saved';
      setTimeout(() => { $('p3dSaveDefault').textContent = original; }, 1200);
    };
  } else {
    $('p3dSaveDefault').style.display = 'none'; // brand-kit.js not loaded — nothing to save into
  }

  $('p3dClose').onclick = cleanup;
  $('p3dCancel').onclick = cleanup;
  overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(); });

  $('p3dInsert').onclick = () => {
    params.text = $('p3dText').value || '3D Text';
    renderer.render(scene, camera); // ensure the frame we snapshot is current
    const dataURL = renderer.domElement.toDataURL('image/png');
    onInsert(dataURL, Object.assign({}, params));
    cleanup();
  };
}

window.Presentation3DText = { open };
window.__presentation3DTextEngineReady = true;
