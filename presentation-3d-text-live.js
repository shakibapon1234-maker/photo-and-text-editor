// Presentation Studio — Native 3D Text integration (PLAN_4 §2, Steps 1-5)
//
// Deliberately reuses the existing "image" element type instead of adding a
// brand-new one: a 3D text element is stored as a normal image element
// (src = transparent PNG snapshot from the mini-editor) plus two extra
// fields — `is3dText` and `text3dParams` (the saved 3D settings for
// re-editing). Because it's a real image element under the hood, it
// automatically gets, for free, everything that already works for images:
// move/resize/rotate handles (presentation-shape*/free-resize files),
// layering, element animations, autosave (presentation-reliable-autosave.js
// just serializes the whole slides array, extra fields included), the
// slideshow/video export pipeline, and the presenter/player views.
//
// This file only adds: the toolbar button, the insert flow, the re-edit
// flow (double-click, or an Edit button in the inspector), and loads the
// Three.js mini-editor (presentation-3d-text-engine.mjs) lazily so it never
// costs anything until the user actually opens it.
(() => {
  const $ = id => document.getElementById(id);

  // ---------- toolbar button ----------
  const btn = document.createElement('button');
  btn.id = 'add3DText';
  btn.textContent = '✨ 3D Text';
  const anchor = $('addTable') || $('addShape') || $('addText');
  if (anchor) anchor.insertAdjacentElement('afterend', btn);
  else document.querySelector('.top').appendChild(btn);

  document.head.insertAdjacentHTML('beforeend', '<style>#add3DText{background:#7c3aed;border-color:#c9b3ff;white-space:nowrap}#add3DText:disabled{opacity:.6;cursor:wait}#edit3DTextBtn{margin-top:8px;width:100%;background:#7c3aed;border-color:#c9b3ff}</style>');

  // ---------- lazy-load the Three.js engine (only one WebGL context, only while its modal is open) ----------
  let enginePromise = null;
  function loadEngine() {
    if (!enginePromise) enginePromise = import('./presentation-3d-text-engine.mjs');
    return enginePromise;
  }

  async function withEngine(run) {
    const original = btn.textContent;
    btn.disabled = true; btn.textContent = 'Loading…';
    try {
      await loadEngine();
    } catch (err) {
      console.error('3D Text engine failed to load', err);
      alert('3D Text এডিটর লোড করা যায়নি। প্রজেক্ট ফোল্ডারের vendor/ ও .mjs ফাইলগুলো ঠিক জায়গায় আছে কিনা দেখুন।');
      btn.disabled = false; btn.textContent = original;
      return;
    }
    btn.disabled = false; btn.textContent = original;
    run();
  }

  // ---------- insert / re-edit ----------
  function insertNewElement(dataURL, params) {
    const el = { id: crypto.randomUUID(), type: 'image', src: dataURL, x: 20, y: 28, w: 55, h: 38, is3dText: true, text3dParams: params };
    active().elements.push(el);
    selected = el.id;
    render();
  }

  function updateElement(id, dataURL, params) {
    const e = active().elements.find(x => x.id === id);
    if (!e) return;
    e.src = dataURL;
    e.text3dParams = params;
    render();
  }

  btn.onclick = () => withEngine(() => window.Presentation3DText.open(null, insertNewElement));

  function openEditFlow(el) {
    withEngine(() => window.Presentation3DText.open(el.text3dParams, (dataURL, params) => updateElement(el.id, dataURL, params)));
  }

  // Double-click a 3D-text element on the slide to re-open its editor.
  document.addEventListener('dblclick', event => {
    const node = event.target.closest && event.target.closest('.image-el');
    if (!node) return;
    const el = active().elements.find(x => x.id === node.dataset.id);
    if (!el || !el.is3dText) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openEditFlow(el);
  }, true);

  // ---------- inspector: "Edit 3D Text" button + note when a 3D-text image is selected ----------
  const editBtn = document.createElement('button');
  editBtn.id = 'edit3DTextBtn';
  editBtn.className = 'hidden';
  editBtn.textContent = '✏️ Edit 3D Text';
  editBtn.onclick = () => { const el = selectedEl(); if (el && el.is3dText) openEditFlow(el); };
  const imageInspector = $('imageInspector');
  if (imageInspector) imageInspector.appendChild(editBtn);

  const beforeInspector3DText = renderInspector;
  renderInspector = function () {
    beforeInspector3DText();
    const el = selectedEl();
    editBtn.classList.toggle('hidden', !(el && el.type === 'image' && el.is3dText));
  };
})();
