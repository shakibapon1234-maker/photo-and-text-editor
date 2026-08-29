(() => {
  const $ = id => document.getElementById(id);

  // ── Hidden file input for image replacement ──
  let replaceInput = document.getElementById('replaceImageFileInput');
  if (!replaceInput) {
    replaceInput = document.createElement('input');
    replaceInput.type = 'file';
    replaceInput.id = 'replaceImageFileInput';
    replaceInput.accept = 'image/*';
    replaceInput.style.display = 'none';
    document.body.appendChild(replaceInput);
  }

  // Replace image data on an element (works for both type:image and type:shape)
  function doReplace(el, file) {
    if (!el || !file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (el.type === 'image') {
        el.src = dataUrl;
      } else if (el.type === 'shape') {
        el.shapeImage = dataUrl;
        el.text = ''; // Clear old placeholder emoji/text
        el.fill = 'transparent';
        el.stroke = 'transparent';
      } else {
        el.src = dataUrl;
      }
      if (typeof render === 'function') render();
      if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();
    };
    reader.readAsDataURL(file);
  }

  // Global trigger: opens file picker and replaces selected element's image
  window.triggerReplaceImage = function(targetEl) {
    const el = targetEl || (typeof selectedEl === 'function' ? selectedEl() : null);
    if (!el) {
      alert('প্রথমে স্লাইডের কোনো ছবি বা আইকন/শেপ Click করে Select করুন।');
      return;
    }
    replaceInput.onchange = ev => {
      const file = ev.target.files[0];
      if (file) doReplace(el, file);
      replaceInput.value = '';
    };
    replaceInput.click();
  };

  // ── Inject Replace button into imageInspector (non-destructive) ──
  function injectImageReplaceBtn() {
    const inspector = $('imageInspector');
    if (!inspector || inspector.dataset.replaceInjected) return;
    inspector.dataset.replaceInjected = '1';

    const btn = document.createElement('button');
    btn.id = 'inspectorReplaceImg';
    btn.style.cssText = 'width:100%;margin-bottom:10px;background:#0369a1;border-color:#38bdf8;color:#fff;font-weight:800;font-size:13px;padding:9px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:7px;';
    btn.innerHTML = '📁 ছবি / আইকন পরিবর্তন করুন (Replace)';
    btn.onclick = () => window.triggerReplaceImage();
    inspector.insertBefore(btn, inspector.firstChild);
  }

  // ── Inject Replace button into shapeInspector (non-destructive) ──
  function injectShapeReplaceBtn() {
    const inspector = $('shapeInspector');
    if (!inspector || inspector.dataset.shapeReplaceInjected) return;
    inspector.dataset.shapeReplaceInjected = '1';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:10px;';
    wrap.innerHTML = `
      <div class="section-title" style="color:#38bdf8;margin-bottom:6px;">REPLACE / UPLOAD IMAGE</div>
      <button id="shapeInspectorReplaceBtn" style="width:100%;background:#0369a1;border:1px solid #38bdf8;color:#fff;font-weight:800;font-size:13px;padding:9px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:7px;cursor:pointer;">
        📁 এই শেপে ছবি / আইকন আপলোড করুন
      </button>
      <button id="shapeInspectorRemoveImgBtn" class="hidden" style="width:100%;margin-top:6px;background:#7f1d1d;border:1px solid #ef4444;color:#fff;font-size:11px;padding:6px;border-radius:6px;cursor:pointer;">
        ❌ আপলোড করা ছবি রিমুভ করুন
      </button>
      <p class="hint" style="margin-top:6px;">💡 এখানে ছবি বা SVG আইকন আপলোড করলে শেপের উপর দেখাবে।</p>
    `;
    inspector.insertBefore(wrap, inspector.firstChild);

    document.getElementById('shapeInspectorReplaceBtn').onclick = () => window.triggerReplaceImage();
    document.getElementById('shapeInspectorRemoveImgBtn').onclick = () => {
      const el = typeof selectedEl === 'function' ? selectedEl() : null;
      if (!el || el.type !== 'shape') return;
      delete el.shapeImage;
      if (typeof render === 'function') render();
    };
  }

  // ── Enhanced render ──
  const _prevRender = render;
  render = function() {
    _prevRender();

    injectImageReplaceBtn();
    injectShapeReplaceBtn();

    const slideEl = $('slide');
    if (!slideEl) return;

    active().elements.forEach(el => {
      const node = slideEl.querySelector('.element[data-id="' + el.id + '"]');
      if (!node) return;

      if (el.type === 'image') {
        // Apply fit style
        const img = node.querySelector('img');
        if (img) img.style.objectFit = el.fit || 'contain';
        if (el.borderRadius) node.style.borderRadius = el.borderRadius + 'px';
        if (el.opacity !== undefined && el.opacity !== 100) node.style.opacity = Number(el.opacity) / 100;

        // Double-click to replace
        node.ondblclick = ev => { ev.stopPropagation(); window.triggerReplaceImage(el); };

        // Drag & drop onto this image element
        node._replaceListened = node._replaceListened || (() => {
          node._replaceListened = true;
          node.addEventListener('dragover', ev => { ev.preventDefault(); ev.stopPropagation(); node.style.outline='3px dashed #38bdf8'; }, {passive:false});
          node.addEventListener('dragleave', () => { node.style.outline=''; });
          node.addEventListener('drop', ev => {
            ev.preventDefault(); ev.stopPropagation(); node.style.outline='';
            const file = ev.dataTransfer?.files?.[0];
            if (file && file.type.startsWith('image/')) doReplace(el, file);
          });
        })();

      } else if (el.type === 'shape' && el.shapeImage) {
        // Show uploaded image on top of shape SVG
        let sImg = node.querySelector('.shape-uploaded-image');
        if (!sImg) {
          sImg = document.createElement('img');
          sImg.className = 'shape-uploaded-image';
          sImg.style.cssText = 'position:absolute;inset:6px;width:calc(100% - 12px);height:calc(100% - 12px);object-fit:contain;z-index:5;pointer-events:none;border-radius:4px;';
          node.appendChild(sImg);
        }
        sImg.src = el.shapeImage;

        // Double-click to replace
        node.ondblclick = ev => { ev.stopPropagation(); window.triggerReplaceImage(el); };

        // Update remove btn visibility in inspector
        const removeBtn = document.getElementById('shapeInspectorRemoveImgBtn');
        if (removeBtn && selected === el.id) removeBtn.classList.remove('hidden');
      } else if (el.type === 'shape') {
        // Remove any orphaned uploaded image div if shapeImage was removed
        const old = node.querySelector('.shape-uploaded-image');
        if (old) old.remove();
      }
    });

    // Sync Remove button visibility in inspector
    const removeBtn = document.getElementById('shapeInspectorRemoveImgBtn');
    if (removeBtn) {
      const el = typeof selectedEl === 'function' ? selectedEl() : null;
      removeBtn.classList.toggle('hidden', !(el && el.type === 'shape' && el.shapeImage));
    }
  };

  render();
})();
