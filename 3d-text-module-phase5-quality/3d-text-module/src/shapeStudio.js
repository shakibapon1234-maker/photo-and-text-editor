// ---------------------------------------------------------------------------
// Shape Studio — "শেপ" feature
// ---------------------------------------------------------------------------
// A self-contained, multi-layer 2D/3D shape tool bolted onto the existing
// single-active-object 3D Text Studio. Unlike Text/Image/Sticker/Cube (which
// rebuild ONE mesh from `state`), Shape keeps an array of independent
// "layers", each its own THREE.Group with its own fill (solid/gradient),
// border, reflection, 3D extrusion and optional embedded text — selectable,
// draggable, duplicatable and deletable, with Ctrl+C / Ctrl+V support.
//
// Everything here is additive: main.js only needs to (1) create the DOM
// panel markup, (2) call initShapeStudio() once, and (3) call a couple of
// thin hooks (update() in the render loop, and a pointerdown guard so the
// existing single-object drag system steps aside while "শেপ" is active).
// ---------------------------------------------------------------------------

export function initShapeStudio({
  THREE,
  TextGeometry,
  scene,
  camera,
  renderer,
  controls,
  viewportEl,
  fontCache,
  FONT_MAP,
  fontLoader,
  getSharedAppearance,
  isActive, // () => boolean — true when contentMode === 'shape'
}) {
  const STORAGE_KEY = 'shapeStudio_layers_v1';

  // ---------------------------------------------------------------------
  // Root group stays in the scene so layers can persist, but is visible only
  // while Shape mode is active. Otherwise old shape layers look like ghost
  // text/objects in the other editors and make their Delete controls appear
  // broken.
  // ---------------------------------------------------------------------
  const root = new THREE.Group();
  root.name = 'shapeStudioRoot';
  root.visible = isActive();
  scene.add(root);

  const raycaster = new THREE.Raycaster();
  const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  /** @type {Map<string, {layer:Object, group:THREE.Group}>} */
  const layers = new Map();
  let order = []; // array of ids, back-to-front
  let selectedId = null;
  let clipboard = null;
  let uidCounter = 1;
  const uid = () => `shp_${Date.now().toString(36)}_${uidCounter++}`;

  // ---------------------------------------------------------------------
  // DOM refs (all optional — module degrades gracefully if markup absent)
  // ---------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const el = {
    presetGrid: $('shapePresetGrid'),
    freehandBtn: $('shapeFreehandBtn'),
    freehandHint: $('shapeFreehandHint'),
    layerList: $('shapeLayerList'),
    emptyNote: $('shapeEmptyNote'),
    propsPanel: $('shapePropsPanel'),
    noSelectionNote: $('shapeNoSelectionNote'),

    fillModeGrid: $('shapeFillModeGrid'),
    solidGroup: $('shapeSolidGroup'),
    solidColor: $('shapeSolidColor'),
    gradientGroup: $('shapeGradientGroup'),
    gradientColor1: $('shapeGradientColor1'),
    gradientColor2: $('shapeGradientColor2'),
    gradientAngle: $('shapeGradientAngle'),
    gradientAngleValue: $('shapeGradientAngleValue'),

    borderToggle: $('shapeBorderToggle'),
    borderFields: $('shapeBorderFields'),
    borderColor: $('shapeBorderColor'),
    borderWidth: $('shapeBorderWidth'),
    borderWidthValue: $('shapeBorderWidthValue'),

    reflectionToggle: $('shapeReflectionToggle'),
    reflectionFields: $('shapeReflectionFields'),
    reflectionIntensity: $('shapeReflectionIntensity'),
    reflectionIntensityValue: $('shapeReflectionIntensityValue'),

    threeDToggle: $('shape3DToggle'),
    threeDFields: $('shape3DFields'),
    depth: $('shapeDepth'),
    depthValue: $('shapeDepthValue'),

    textInput: $('shapeTextInput'),
    textColor: $('shapeTextColor'),
    textSize: $('shapeTextSize'),
    textSizeValue: $('shapeTextSizeValue'),
    fontSelect: $('shapeFontSelect'),

    sizeRange: $('shapeSizeRange'),
    sizeValue: $('shapeSizeValue'),
    rotationRange: $('shapeRotationRange'),
    rotationValue: $('shapeRotationValue'),
    opacityRange: $('shapeOpacityRange'),
    opacityValue: $('shapeOpacityValue'),

    duplicateBtn: $('shapeDuplicateBtn'),
    deleteBtn: $('shapeDeleteBtn'),
    bringFrontBtn: $('shapeBringFrontBtn'),
    sendBackBtn: $('shapeSendBackBtn'),
    clearAllBtn: $('shapeClearAllBtn'),
  };

  // ---------------------------------------------------------------------
  // Preset shape point generators — all return an array of [x, y] points
  // (already closed loop, no need to repeat the first point) at "footprint"
  // scale ~ [-50, 50]. `s` below is always 50 (half of the default 100pt
  // footprint); the layer's own `size` value later scales the whole group.
  // ---------------------------------------------------------------------
  const S = 50;
  function regularPolygon(sides, r, rot = -Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function roundedRectPoints(w, h, r, seg = 6) {
    r = Math.min(r, w / 2, h / 2);
    const corners = [
      [w / 2 - r, h / 2 - r, 0],
      [-(w / 2 - r), h / 2 - r, Math.PI / 2],
      [-(w / 2 - r), -(h / 2 - r), Math.PI],
      [w / 2 - r, -(h / 2 - r), -Math.PI / 2],
    ];
    const pts = [];
    for (const [cx, cy, startAngle] of corners) {
      for (let i = 0; i <= seg; i++) {
        const a = startAngle + (i / seg) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    }
    return pts;
  }
  const PRESETS = {
    rect: { label: 'আয়তক্ষেত্র', icon: '▭', points: () => [[-S, -S * 0.68], [S, -S * 0.68], [S, S * 0.68], [-S, S * 0.68]] },
    roundedRect: { label: 'রাউন্ড রেক্ট', icon: '▢', points: () => roundedRectPoints(S * 2, S * 1.36, 14) },
    circle: { label: 'বৃত্ত', icon: '●', points: () => regularPolygon(48, S) },
    ellipse: { label: 'ওভাল', icon: '⬭', points: () => regularPolygon(48, 1, 0).map(([x, y]) => [x * S, y * S * 0.62]) },
    triangle: { label: 'ত্রিভুজ', icon: '▲', points: () => [[0, S], [-S * 0.92, -S * 0.72], [S * 0.92, -S * 0.72]] },
    pentagon: { label: 'পেন্টাগন', icon: '⬠', points: () => regularPolygon(5, S) },
    hexagon: { label: 'হেক্সাগন', icon: '⬡', points: () => regularPolygon(6, S) },
    star: {
      label: 'তারা', icon: '★', points: () => {
        const pts = []; const spikes = 5; const outer = S; const inner = S * 0.42;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = -Math.PI / 2 + (i / (spikes * 2)) * Math.PI * 2;
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        return pts;
      },
    },
    heart: {
      label: 'হার্ট', icon: '♥', points: () => {
        const pts = []; const seg = 48;
        for (let i = 0; i <= seg; i++) {
          const t = (i / seg) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          pts.push([x * (S / 17), y * (S / 17)]);
        }
        return pts;
      },
    },
    arrow: {
      label: 'তীর', icon: '➤', points: () => [
        [-S, S * 0.35], [S * 0.15, S * 0.35], [S * 0.15, S * 0.75], [S, 0],
        [S * 0.15, -S * 0.75], [S * 0.15, -S * 0.35], [-S, -S * 0.35],
      ],
    },
    speech: {
      label: 'স্পিচ বাবল', icon: '💬', points: () => {
        const body = roundedRectPoints(S * 2, S * 1.3, 16, 6).map(([x, y]) => [x, y + S * 0.1]);
        const tail = [[-S * 0.25, -S * 0.55], [-S * 0.45, -S * 0.95], [S * 0.1, -S * 0.5]];
        return [...body, ...tail];
      },
    },
  };
  const PRESET_ORDER = ['rect', 'roundedRect', 'circle', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'star', 'heart', 'arrow', 'speech'];

  // ---------------------------------------------------------------------
  // Texture helpers
  // ---------------------------------------------------------------------
  function buildGradientTexture(c1, c2, angleDeg) {
    const size = 256;
    const cnv = document.createElement('canvas');
    cnv.width = cnv.height = size;
    const ctx = cnv.getContext('2d');
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    const x0 = size / 2 - dx * size / 2, y0 = size / 2 - dy * size / 2;
    const x1 = size / 2 + dx * size / 2, y1 = size / 2 + dy * size / 2;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function buildFadeAlphaTexture() {
    const size = 128;
    const cnv = document.createElement('canvas');
    cnv.width = size; cnv.height = size;
    const ctx = cnv.getContext('2d');
    const g = ctx.createLinearGradient(0, size, 0, 0); // bottom opaque -> top transparent
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cnv);
  }
  const fadeAlphaTexture = buildFadeAlphaTexture();

  // ---------------------------------------------------------------------
  // Geometry building
  // ---------------------------------------------------------------------
  function pointsToShape(pts) {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
    shape.closePath();
    return shape;
  }
  function scaleFromCentroid(pts, factor) {
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x; cy += y; }
    cx /= pts.length; cy /= pts.length;
    return pts.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
  }
  function getLayerPoints(layer) {
    if (layer.presetType === 'freehand') return layer.freehandPoints;
    const preset = PRESETS[layer.presetType] || PRESETS.rect;
    return preset.points();
  }
  function bboxOf(pts) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }

  function buildRainbowTexture(colors) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    colors.forEach((color, index) => gradient.addColorStop(index / Math.max(1, colors.length - 1), color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeShapeMaterial(layer, map, color) {
    const reflections = layer.reflectionsOn ? (layer.materialReflectionIntensity || 1) : 0;
    const common = { color, map, side: THREE.DoubleSide, transparent: layer.opacity < 1, opacity: layer.opacity, envMapIntensity: reflections };
    if (layer.materialType === 'metallic') return new THREE.MeshStandardMaterial({ ...common, roughness: 0.18, metalness: 1 });
    if (layer.materialType === 'glass') return new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.05, metalness: 0.02, transmission: 0.78, thickness: 10, ior: 1.52, transparent: true, opacity: Math.min(layer.opacity, 0.82), clearcoat: 1 });
    if (layer.materialType === 'neon') return new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.22, metalness: 0.15, emissive: new THREE.Color(color), emissiveIntensity: Math.max(0.1, Math.min(2.5, layer.neonIntensity || 0.8)) * 0.45, clearcoat: 0.85 });
    if (layer.materialType === 'matte') return new THREE.MeshStandardMaterial({ ...common, roughness: 0.95, metalness: 0 });
    return new THREE.MeshStandardMaterial({ ...common, roughness: 0.22, metalness: 0.35 });
  }

  function makeFillMaterial(layer, forSide) {
    if (layer.fillMode === 'gradient') {
      const tex = buildGradientTexture(layer.gradientColor1, layer.gradientColor2, layer.gradientAngle);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      return makeShapeMaterial(layer, forSide ? null : tex, forSide ? layer.gradientColor2 : '#ffffff');
    }
    if (layer.fillMode === 'rainbow') return makeShapeMaterial(layer, forSide ? null : buildRainbowTexture(layer.rainbowColors || ['#ef4444', '#facc15', '#22c55e', '#06b6d4', '#8b5cf6', '#ef4444']), '#ffffff');
    return makeShapeMaterial(layer, null, layer.fillColor);
  }

  // THREE.ExtrudeGeometry's default UV generator ("WorldUVGenerator") writes
  // the *raw local x/y coordinates* into the UV channel instead of values
  // normalized to [0, 1]. Our shapes live on a much larger local scale
  // (roughly -50..50), so almost the entire face UV range falls outside
  // [0, 1] and gets clamped to whichever texture edge/corner it's nearest —
  // which is exactly why a smooth 2-colour gradient rendered as a handful
  // of hard-edged colour blocks instead of a blend. This remaps the UVs of
  // the front/back cap faces to span 0..1 across the shape's own bounding
  // box so gradient textures interpolate correctly.
  function normalizeCapUVs(geometry, w, h) {
    const uv = geometry.attributes.uv;
    const pos = geometry.attributes.position;
    if (!uv || !pos) return;
    const halfW = (w || 1) / 2;
    const halfH = (h || 1) / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, (x + halfW) / (w || 1), (y + halfH) / (h || 1));
    }
    uv.needsUpdate = true;
  }

  function buildLayerGroup(layer) {
    const group = new THREE.Group();
    group.name = `shapeLayer:${layer.id}`;

    const rawPts = getLayerPoints(layer);
    const box = bboxOf(rawPts);
    // Center the local point set at (0,0) so scale/rotation behave predictably.
    const pts = rawPts.map(([x, y]) => [x - box.cx, y - box.cy]);
    const shapePath = pointsToShape(pts);

    const depth = layer.is3D ? Math.max(1, layer.depth) : 0.6;
    const extrudeSettings = {
      depth,
      bevelEnabled: layer.is3D,
      bevelThickness: Math.min(2.2, depth * 0.18),
      bevelSize: Math.min(1.6, depth * 0.14),
      bevelSegments: 3,
      curveSegments: 16,
    };
    const geo = new THREE.ExtrudeGeometry(shapePath, extrudeSettings);
    geo.center = geo.center || undefined;
    geo.translate(0, 0, -depth / 2);
    normalizeCapUVs(geo, box.w, box.h);

    const faceMat = makeFillMaterial(layer, false);
    const sideMat = makeFillMaterial(layer, true);
    const mainMesh = new THREE.Mesh(geo, [faceMat, sideMat]);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    mainMesh.userData.layerId = layer.id;

    // ---- border (cheap "halo" outline: a scaled-up duplicate behind) ----
    if (layer.borderEnabled && layer.borderWidth > 0) {
      const factor = 1 + layer.borderWidth / Math.max(box.w, box.h, 1) * 2.2;
      const borderPts = scaleFromCentroid(pts, factor);
      const borderShape = pointsToShape(borderPts);
      const borderGeo = layer.is3D
        ? new THREE.ExtrudeGeometry(borderShape, { ...extrudeSettings, depth: depth * 0.72, bevelEnabled: false })
        : new THREE.ShapeGeometry(borderShape, 16);
      if (layer.is3D) borderGeo.translate(0, 0, -depth * 0.36);
      const borderMat = new THREE.MeshStandardMaterial({ color: layer.borderColor, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
      const borderMesh = new THREE.Mesh(borderGeo, borderMat);
      borderMesh.position.z = -0.15;
      borderMesh.userData.layerId = layer.id;
      group.add(borderMesh);
    }

    // ---- reflection (mirrored, fading duplicate under the shape) ----
    if (layer.reflectionEnabled && layer.reflectionIntensity > 0) {
      const flatGeo = new THREE.ShapeGeometry(shapePath, 16);
      normalizeCapUVs(flatGeo, box.w, box.h);
      const reflMat = layer.fillMode === 'gradient'
        ? new THREE.MeshBasicMaterial({ map: buildGradientTexture(layer.gradientColor1, layer.gradientColor2, layer.gradientAngle), transparent: true, opacity: layer.reflectionIntensity * 0.55, alphaMap: fadeAlphaTexture, side: THREE.DoubleSide, depthWrite: false })
        : new THREE.MeshBasicMaterial({ color: layer.fillColor, transparent: true, opacity: layer.reflectionIntensity * 0.55, alphaMap: fadeAlphaTexture, side: THREE.DoubleSide, depthWrite: false });
      const reflMesh = new THREE.Mesh(flatGeo, reflMat);
      reflMesh.scale.y = -1;
      reflMesh.position.set(0, 2 * (-box.h / 2) - 1, -depth / 2 - 0.05);
      reflMesh.userData.layerId = layer.id;
      reflMesh.renderOrder = -1;
      group.add(reflMesh);
    }

    group.add(mainMesh);

    // ---- embedded text ----
    if (layer.text && layer.text.trim()) {
      const font = fontCache[layer.fontFamily] || fontCache.helvetiker;
      if (font) {
        try {
          const fontSize = Math.max(4, box.h * (layer.textSize / 100));
          const textDepth = layer.is3D ? Math.max(0.8, depth * 0.35) : 0.8;
          // NOTE: THREE.TextGeometry's extrusion-thickness parameter is
          // called `height`, not `depth` (it internally maps height ->
          // ExtrudeGeometry's `depth`, defaulting to 50 whenever `height`
          // is missing). Passing `depth` here was silently ignored, so
          // every embedded shape text was extruded 50 units deep — wildly
          // out of proportion to the shape (and often out of camera range)
          // which made it look like text never appeared at all.
          const tGeo = new TextGeometry(layer.text, {
            font, size: fontSize, height: textDepth, curveSegments: 6, bevelEnabled: false,
          });
          tGeo.computeBoundingBox();
          const tb = tGeo.boundingBox;
          const tw = tb.max.x - tb.min.x;
          const th = tb.max.y - tb.min.y;
          const maxW = box.w * 0.82;
          const fit = tw > maxW ? maxW / tw : 1;
          // Also center the extrusion on Z (TextGeometry only extrudes
          // 0..height, it doesn't center like the main shape mesh does).
          tGeo.translate(-(tb.min.x + tw / 2), -(tb.min.y + th / 2), -textDepth / 2);
          const tMat = new THREE.MeshStandardMaterial({ color: layer.textColor, roughness: 0.4, metalness: 0.1 });
          const tMesh = new THREE.Mesh(tGeo, tMat);
          tMesh.scale.setScalar(fit);
          tMesh.position.z = depth / 2 + 0.4;
          tMesh.userData.layerId = layer.id;
          tMesh.castShadow = true;
          group.add(tMesh);
        } catch (err) {
          console.warn('shape text build failed', err);
        }
      }
    }

    group.userData.layerId = layer.id;
    group.position.set(layer.posX, layer.posY, layer.posZ);
    group.rotation.z = (layer.rotationZ * Math.PI) / 180;
    group.scale.setScalar(layer.scaleMul);
    return group;
  }

  function rebuildLayer(id) {
    const entry = layers.get(id);
    if (!entry) return;
    if (entry.group) {
      root.remove(entry.group);
      entry.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); if (m.alphaMap && m.alphaMap !== fadeAlphaTexture) m.alphaMap.dispose(); m.dispose(); });
      });
    }
    const group = buildLayerGroup(entry.layer);
    entry.group = group;
    root.add(group);
    reorderScene();
    updateSelectionOutline();
  }

  function reorderScene() {
    order.forEach((id, i) => {
      const entry = layers.get(id);
      if (entry) entry.group.position.z = entry.layer.posZ + i * 0.02;
    });
  }

  // ---------------------------------------------------------------------
  // Layer CRUD
  // ---------------------------------------------------------------------
  function defaultLayer(presetType) {
    return {
      id: uid(),
      presetType,
      freehandPoints: null,
      posX: 0, posY: 0, posZ: 0,
      rotationZ: 0,
      scaleMul: 1,
      size: 100,
      fillMode: 'solid',
      fillColor: '#3b82f6',
      gradientColor1: '#f59e0b',
      gradientColor2: '#ef4444',
      gradientAngle: 45,
      borderEnabled: false,
      borderColor: '#ffffff',
      borderWidth: 4,
      reflectionEnabled: false,
      reflectionIntensity: 0.5,
      is3D: true,
      depth: 14,
      text: '',
      textColor: '#ffffff',
      textSize: 32,
      fontFamily: 'helvetiker',
      materialType: 'glossy',
      neonIntensity: 0.8,
      reflectionsOn: true,
      materialReflectionIntensity: 1,
      opacity: 1,
    };
  }

  function addLayer(layer) {
    layers.set(layer.id, { layer, group: null });
    order.push(layer.id);
    rebuildLayer(layer.id);
    selectLayer(layer.id);
    renderLayerList();
    persist();
  }

  function addPreset(presetType) {
    const layer = defaultLayer(presetType);
    // small stagger so stacked adds are still visible/selectable
    const n = order.length;
    layer.posX = (n % 5) * 8 - 16;
    layer.posY = -((n % 5) * 4);
    addLayer(layer);
  }

  function addFreehand(worldPts) {
    if (worldPts.length < 3) return;
    const box = bboxOf(worldPts);
    const cx = box.cx, cy = box.cy;
    const local = worldPts.map(([x, y]) => [x - cx, y - cy]);
    const layer = defaultLayer('freehand');
    layer.freehandPoints = local;
    layer.posX = cx; layer.posY = cy;
    layer.size = Math.max(box.w, box.h);
    addLayer(layer);
  }

  function deleteLayer(id) {
    const entry = layers.get(id);
    if (!entry) return;
    root.remove(entry.group);
    entry.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    layers.delete(id);
    order = order.filter((x) => x !== id);
    if (selectedId === id) selectLayer(order[order.length - 1] || null);
    renderLayerList();
    persist();
  }

  function duplicateLayer(id) {
    const entry = layers.get(id);
    if (!entry) return null;
    const clone = JSON.parse(JSON.stringify(entry.layer));
    clone.id = uid();
    clone.posX += 8;
    clone.posY -= 8;
    addLayer(clone);
    return clone.id;
  }

  function updateLayer(id, patch) {
    const entry = layers.get(id);
    if (!entry) return;
    Object.assign(entry.layer, patch);
    rebuildLayer(id);
    renderLayerList();
    persist();
  }

  const PALETTES = {
    comic: ['#ef4444', '#facc15', '#22c55e', '#2563eb', '#a855f7', '#ef4444'],
    rainbow: ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#2563eb', '#a855f7', '#ef4444'],
    neon: ['#00f5ff', '#2563eb', '#a855f7', '#f472b6', '#00f5ff'],
  };

  function applySharedAppearance() {
    const entry = selectedId && layers.get(selectedId);
    const appearance = getSharedAppearance && getSharedAppearance();
    if (!entry || !appearance) return;
    const patch = { materialType: appearance.materialType, neonIntensity: appearance.neonIntensity, reflectionsOn: appearance.reflectionsOn, materialReflectionIntensity: appearance.reflectionIntensity };
    if (appearance.colorMode === 'solid') Object.assign(patch, { fillMode: 'solid', fillColor: appearance.color });
    else if (appearance.colorMode === 'gradient') Object.assign(patch, { fillMode: 'gradient', gradientColor1: appearance.colorStart, gradientColor2: appearance.colorEnd, gradientAngle: appearance.gradientAngle });
    else if (appearance.colorMode === 'multicolor') Object.assign(patch, { fillMode: 'rainbow', rainbowColors: PALETTES[appearance.multicolorPalette] || PALETTES.rainbow });
    updateLayer(selectedId, patch);
  }

  function applyAnimation(preset, t) {
    const entry = selectedId && layers.get(selectedId);
    if (!entry) return false;
    const { pos, rot, scaleMul, opacityMul, emissiveMul } = preset.apply(t);
    const { group, layer } = entry;
    group.position.set(layer.posX + (pos ? pos[0] : 0), layer.posY + (pos ? pos[1] : 0), layer.posZ + (pos ? pos[2] : 0));
    group.rotation.set(0, 0, THREE.MathUtils.degToRad(layer.rotationZ) + (rot ? rot[2] : 0));
    group.scale.setScalar(layer.scaleMul * Math.max(0, scaleMul === undefined ? 1 : scaleMul));
    group.visible = opacityMul === undefined || opacityMul > 0.005;
    group.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => {
        material.transparent = true;
        material.opacity = (layer.opacity || 1) * (opacityMul === undefined ? 1 : Math.max(0, opacityMul));
        if (emissiveMul !== undefined && material.emissive) material.emissiveIntensity = (layer.neonIntensity || 0.8) * 0.45 * emissiveMul;
      });
    });
    return true;
  }

  function resetAnimation() {
    const entry = selectedId && layers.get(selectedId);
    if (entry) rebuildLayer(entry.layer.id);
  }

  function bringToFront(id) {
    order = order.filter((x) => x !== id);
    order.push(id);
    reorderScene();
    renderLayerList();
    persist();
  }
  function sendToBack(id) {
    order = order.filter((x) => x !== id);
    order.unshift(id);
    reorderScene();
    renderLayerList();
    persist();
  }

  function clearAll() {
    // Use the map rather than `order`: an interrupted older save can leave
    // an id out of order, which previously made that shape impossible to
    // select/delete while it remained visible on the canvas.
    for (const id of [...layers.keys()]) deleteLayer(id);
    order = [];
    selectedId = null;
    if (selectionHelper) { scene.remove(selectionHelper); selectionHelper = null; }
    renderLayerList();
    renderPropsPanel();
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------
  // Selection + outline
  // ---------------------------------------------------------------------
  let selectionHelper = null;
  function selectLayer(id) {
    selectedId = id;
    if (selectionHelper) { scene.remove(selectionHelper); selectionHelper = null; }
    const entry = id ? layers.get(id) : null;
    if (entry) {
      const mainMesh = entry.group.children.find((c) => c.geometry && c.geometry.type === 'ExtrudeGeometry') || entry.group.children[0];
      if (mainMesh) {
        selectionHelper = new THREE.BoxHelper(mainMesh, 0xffcc00);
        scene.add(selectionHelper);
      }
    }
    renderLayerList();
    renderPropsPanel();
  }
  function updateSelectionOutline() {
    if (selectionHelper) selectLayer(selectedId);
  }

  // ---------------------------------------------------------------------
  // Pointer interaction: select / drag / freehand-draw
  // ---------------------------------------------------------------------
  let freehandMode = false;
  let isDrawing = false;
  let drawPts = [];
  let previewLine = null;
  let isDraggingLayer = false;
  let dragStart = { x: 0, y: 0 };
  let dragLayerStart = { x: 0, y: 0 };

  function screenToWorld(clientX, clientY, targetZ = 0) {
    const rect = viewportEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    raycaster.setFromCamera(ndc, camera);
    zPlane.constant = -targetZ;
    const pt = new THREE.Vector3();
    raycaster.ray.intersectPlane(zPlane, pt);
    return pt || new THREE.Vector3();
  }

  function pickLayerAt(clientX, clientY) {
    const rect = viewportEl.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    raycaster.setFromCamera(ndc, camera);
    const meshes = [];
    root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return hits[0].object.userData.layerId || null;
  }

  function setFreehandMode(on) {
    freehandMode = on;
    if (el.freehandBtn) el.freehandBtn.classList.toggle('active', on);
    if (el.freehandHint) el.freehandHint.style.display = on ? 'block' : 'none';
    viewportEl.style.cursor = on ? 'crosshair' : '';
  }

  function onPointerDown(e) {
    if (!isActive()) return;
    if (e.button !== 0) return;
    if (freehandMode) {
      isDrawing = true;
      drawPts = [];
      const p = screenToWorld(e.clientX, e.clientY, 0);
      drawPts.push([p.x, p.y]);
      controls.enabled = false;
      const geo = new THREE.BufferGeometry().setFromPoints([p]);
      const mat = new THREE.LineBasicMaterial({ color: 0xffcc00 });
      previewLine = new THREE.Line(geo, mat);
      scene.add(previewLine);
      e.preventDefault();
      return;
    }
    const hitId = pickLayerAt(e.clientX, e.clientY);
    if (hitId) {
      selectLayer(hitId);
      isDraggingLayer = true;
      controls.enabled = false;
      dragStart = { x: e.clientX, y: e.clientY };
      const entry = layers.get(hitId);
      dragLayerStart = { x: entry.layer.posX, y: entry.layer.posY };
      viewportEl.style.cursor = 'grabbing';
      e.preventDefault();
      // Stop this pointerdown from also reaching OrbitControls (it listens
      // on the canvas/renderer element too). Without this, the very first
      // down-event of a drag can still kick off a camera rotate/pan before
      // `controls.enabled = false` above takes effect, which shifts the
      // whole scene — making every shape on screen appear to move along
      // with the one actually being dragged.
      e.stopPropagation();
    } else {
      selectLayer(null);
    }
  }

  function onPointerMove(e) {
    if (!isActive()) return;
    if (isDrawing) {
      const p = screenToWorld(e.clientX, e.clientY, 0);
      const last = drawPts[drawPts.length - 1];
      if (!last || Math.hypot(p.x - last[0], p.y - last[1]) > 1.2) {
        drawPts.push([p.x, p.y]);
        if (previewLine) {
          const pts3 = drawPts.map(([x, y]) => new THREE.Vector3(x, y, 0));
          previewLine.geometry.dispose();
          previewLine.geometry = new THREE.BufferGeometry().setFromPoints(pts3);
        }
      }
      return;
    }
    if (isDraggingLayer && selectedId) {
      const vH = 2 * Math.tan(((camera.fov || 45) * Math.PI) / 360) * Math.abs(camera.position.z || 220);
      const scale = viewportEl.clientHeight ? vH / viewportEl.clientHeight : 0.45;
      const dx = (e.clientX - dragStart.x) * scale;
      const dy = (e.clientY - dragStart.y) * scale;
      updateLayer(selectedId, { posX: dragLayerStart.x + dx, posY: dragLayerStart.y - dy });
    }
  }

  function onPointerUp() {
    if (isDrawing) {
      isDrawing = false;
      if (previewLine) { scene.remove(previewLine); previewLine.geometry.dispose(); previewLine.material.dispose(); previewLine = null; }
      if (drawPts.length >= 3) addFreehand(drawPts);
      setFreehandMode(false);
      controls.enabled = true;
      return;
    }
    if (isDraggingLayer) {
      isDraggingLayer = false;
      controls.enabled = true;
      viewportEl.style.cursor = '';
      persist();
    }
  }

  viewportEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Copy / Paste
  window.addEventListener('keydown', (e) => {
    if (!isActive()) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'c' || e.key === 'C')) {
      if (selectedId && layers.has(selectedId)) {
        clipboard = JSON.parse(JSON.stringify(layers.get(selectedId).layer));
        e.preventDefault();
      }
    } else if (mod && (e.key === 'v' || e.key === 'V')) {
      if (clipboard) {
        const clone = JSON.parse(JSON.stringify(clipboard));
        clone.id = uid();
        clone.posX += 10;
        clone.posY -= 10;
        addLayer(clone);
        e.preventDefault();
      }
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      deleteLayer(selectedId);
      e.preventDefault();
    }
  });

  // ---------------------------------------------------------------------
  // UI: preset grid + freehand button
  // ---------------------------------------------------------------------
  if (el.presetGrid) {
    el.presetGrid.innerHTML = PRESET_ORDER.map(
      (key) => `<button type="button" class="preset-btn" data-preset="${key}">${PRESETS[key].icon} ${PRESETS[key].label}</button>`
    ).join('');
    el.presetGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (!btn) return;
      setFreehandMode(false);
      addPreset(btn.dataset.preset);
    });
  }
  if (el.freehandBtn) {
    el.freehandBtn.addEventListener('click', () => setFreehandMode(!freehandMode));
  }

  // ---------------------------------------------------------------------
  // UI: layer list
  // ---------------------------------------------------------------------
  function renderLayerList() {
    if (!el.layerList) return;
    if (el.emptyNote) el.emptyNote.style.display = order.length ? 'none' : 'block';
    el.layerList.innerHTML = [...order].reverse().map((id) => {
      const entry = layers.get(id);
      if (!entry) return '';
      const preset = PRESETS[entry.layer.presetType];
      const label = preset ? `${preset.icon} ${preset.label}` : '✏️ ফ্রিহ্যান্ড';
      const textLabel = entry.layer.text ? ` — "${entry.layer.text.slice(0, 12)}"` : '';
      const active = id === selectedId ? ' active' : '';
      return `<div class="shape-layer-row${active}" data-id="${id}">
        <span class="shape-layer-name">${label}${textLabel}</span>
        <button type="button" class="shape-layer-del" data-id="${id}" title="মুছুন">✕</button>
      </div>`;
    }).join('');
    el.layerList.querySelectorAll('.shape-layer-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.shape-layer-del')) return;
        selectLayer(row.dataset.id);
      });
    });
    el.layerList.querySelectorAll('.shape-layer-del').forEach((btn) => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteLayer(btn.dataset.id); });
    });
  }

  // ---------------------------------------------------------------------
  // UI: property panel
  // ---------------------------------------------------------------------
  function renderPropsPanel() {
    const entry = selectedId ? layers.get(selectedId) : null;
    if (el.propsPanel) el.propsPanel.style.display = entry ? 'block' : 'none';
    if (el.noSelectionNote) el.noSelectionNote.style.display = entry ? 'none' : 'block';
    if (!entry) return;
    const L = entry.layer;

    if (el.fillModeGrid) {
      el.fillModeGrid.querySelectorAll('.preset-btn').forEach((b) => b.classList.toggle('active', b.dataset.fillMode === L.fillMode));
    }
    if (el.solidGroup) el.solidGroup.hidden = L.fillMode !== 'solid';
    if (el.gradientGroup) el.gradientGroup.hidden = L.fillMode !== 'gradient';
    if (el.solidColor) el.solidColor.value = L.fillColor;
    if (el.gradientColor1) el.gradientColor1.value = L.gradientColor1;
    if (el.gradientColor2) el.gradientColor2.value = L.gradientColor2;
    if (el.gradientAngle) el.gradientAngle.value = L.gradientAngle;
    if (el.gradientAngleValue) el.gradientAngleValue.textContent = `${L.gradientAngle}°`;

    if (el.borderToggle) el.borderToggle.checked = L.borderEnabled;
    if (el.borderFields) el.borderFields.hidden = !L.borderEnabled;
    if (el.borderColor) el.borderColor.value = L.borderColor;
    if (el.borderWidth) el.borderWidth.value = L.borderWidth;
    if (el.borderWidthValue) el.borderWidthValue.textContent = `${L.borderWidth}px`;

    if (el.reflectionToggle) el.reflectionToggle.checked = L.reflectionEnabled;
    if (el.reflectionFields) el.reflectionFields.hidden = !L.reflectionEnabled;
    if (el.reflectionIntensity) el.reflectionIntensity.value = Math.round(L.reflectionIntensity * 100);
    if (el.reflectionIntensityValue) el.reflectionIntensityValue.textContent = `${Math.round(L.reflectionIntensity * 100)}%`;

    if (el.threeDToggle) el.threeDToggle.checked = L.is3D;
    if (el.threeDFields) el.threeDFields.hidden = !L.is3D;
    if (el.depth) el.depth.value = L.depth;
    if (el.depthValue) el.depthValue.textContent = L.depth;

    if (el.textInput) el.textInput.value = L.text;
    if (el.textColor) el.textColor.value = L.textColor;
    if (el.textSize) el.textSize.value = L.textSize;
    if (el.textSizeValue) el.textSizeValue.textContent = `${L.textSize}%`;
    if (el.fontSelect) el.fontSelect.value = L.fontFamily;

    if (el.sizeRange) el.sizeRange.value = Math.round(L.scaleMul * 100);
    if (el.sizeValue) el.sizeValue.textContent = `${Math.round(L.scaleMul * 100)}%`;
    if (el.rotationRange) el.rotationRange.value = L.rotationZ;
    if (el.rotationValue) el.rotationValue.textContent = `${L.rotationZ}°`;
    if (el.opacityRange) el.opacityRange.value = Math.round(L.opacity * 100);
    if (el.opacityValue) el.opacityValue.textContent = `${Math.round(L.opacity * 100)}%`;
  }

  function wireProp(elem, handler) {
    if (!elem) return;
    elem.addEventListener('input', handler);
    elem.addEventListener('change', handler);
  }

  if (el.fillModeGrid) {
    el.fillModeGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.preset-btn');
      if (!btn || !selectedId) return;
      updateLayer(selectedId, { fillMode: btn.dataset.fillMode });
    });
  }
  wireProp(el.solidColor, () => selectedId && updateLayer(selectedId, { fillColor: el.solidColor.value }));
  wireProp(el.gradientColor1, () => selectedId && updateLayer(selectedId, { gradientColor1: el.gradientColor1.value }));
  wireProp(el.gradientColor2, () => selectedId && updateLayer(selectedId, { gradientColor2: el.gradientColor2.value }));
  wireProp(el.gradientAngle, () => selectedId && updateLayer(selectedId, { gradientAngle: Number(el.gradientAngle.value) }));

  wireProp(el.borderToggle, () => selectedId && updateLayer(selectedId, { borderEnabled: el.borderToggle.checked }));
  wireProp(el.borderColor, () => selectedId && updateLayer(selectedId, { borderColor: el.borderColor.value }));
  wireProp(el.borderWidth, () => selectedId && updateLayer(selectedId, { borderWidth: Number(el.borderWidth.value) }));

  wireProp(el.reflectionToggle, () => selectedId && updateLayer(selectedId, { reflectionEnabled: el.reflectionToggle.checked }));
  wireProp(el.reflectionIntensity, () => selectedId && updateLayer(selectedId, { reflectionIntensity: Number(el.reflectionIntensity.value) / 100 }));

  wireProp(el.threeDToggle, () => selectedId && updateLayer(selectedId, { is3D: el.threeDToggle.checked }));
  wireProp(el.depth, () => selectedId && updateLayer(selectedId, { depth: Number(el.depth.value) }));

  wireProp(el.textInput, () => selectedId && updateLayer(selectedId, { text: el.textInput.value }));
  wireProp(el.textColor, () => selectedId && updateLayer(selectedId, { textColor: el.textColor.value }));
  wireProp(el.textSize, () => selectedId && updateLayer(selectedId, { textSize: Number(el.textSize.value) }));
  wireProp(el.fontSelect, async () => {
    if (!selectedId) return;
    const family = el.fontSelect.value;
    if (!fontCache[family] && FONT_MAP[family]) {
      try {
        const res = await fetch(FONT_MAP[family]);
        const json = await res.json();
        fontCache[family] = fontLoader.parse(json);
      } catch (err) { console.warn('shape font load failed', err); }
    }
    updateLayer(selectedId, { fontFamily: family });
  });

  wireProp(el.sizeRange, () => selectedId && updateLayer(selectedId, { scaleMul: Number(el.sizeRange.value) / 100 }));
  wireProp(el.rotationRange, () => selectedId && updateLayer(selectedId, { rotationZ: Number(el.rotationRange.value) }));
  wireProp(el.opacityRange, () => selectedId && updateLayer(selectedId, { opacity: Number(el.opacityRange.value) / 100 }));

  if (el.duplicateBtn) el.duplicateBtn.addEventListener('click', () => selectedId && duplicateLayer(selectedId));
  if (el.deleteBtn) el.deleteBtn.addEventListener('click', () => selectedId && deleteLayer(selectedId));
  if (el.bringFrontBtn) el.bringFrontBtn.addEventListener('click', () => selectedId && bringToFront(selectedId));
  if (el.sendBackBtn) el.sendBackBtn.addEventListener('click', () => selectedId && sendToBack(selectedId));
  if (el.clearAllBtn) el.clearAllBtn.addEventListener('click', () => { if (confirm('সব শেপ মুছে ফেলবেন?')) clearAll(); });

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------
  let persistTimer = null;
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        const data = { order, layers: order.map((id) => layers.get(id).layer) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_) { /* ignore quota errors */ }
    }, 250);
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.layers)) return;
      for (const layer of data.layers) {
        if (!layer || !layer.id) continue;
        layers.set(layer.id, { layer, group: null });
      }
      const savedOrder = Array.isArray(data.order) ? data.order : [];
      // Keep only valid, unique ids, then append valid layers omitted by an
      // older/incomplete save. This keeps the list and canvas in lockstep.
      order = savedOrder.filter((id, index) => layers.has(id) && savedOrder.indexOf(id) === index);
      for (const id of layers.keys()) if (!order.includes(id)) order.push(id);
      for (const id of order) rebuildLayer(id);
      renderLayerList();
    } catch (err) {
      console.warn('shape studio restore failed', err);
    }
  }
  restore();

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  return {
    update() {
      if (selectionHelper) selectionHelper.update();
    },
    setActive(active) {
      root.visible = active;
      if (!active) {
        setFreehandMode(false);
        if (isDraggingLayer) { isDraggingLayer = false; controls.enabled = true; }
      }
    },
    hasSelection: () => !!selectedId,
    getSelectedGroup: () => (selectedId ? layers.get(selectedId)?.group || null : null),
    applySharedAppearance,
    applyAnimation,
    resetAnimation,
    clearAll,
  };
}
