/**
 * presentation-context-toolbar.js
 * Microsoft Word-style context toolbar.
 * • Text selected/clicked   → Text Size, Text Color, Box BG, Opacity, Bold/Italic/Underline, Alignment
 * • Shape clicked           → Fill Color, Border Color, Border px, Opacity + Shape Text (Size, Color, B/I/U, Alignment)
 * • Image clicked           → Opacity, Flip H/V, Fit/Cover toggle
 *
 * The bar appears just below the top header and hides when nothing is selected.
 */
(() => {
  const $ = id => document.getElementById(id);

  /* ── Build the floating context bar ─────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.id = 'ctx-toolbar';
  bar.innerHTML = `
    <!-- DEFAULT section (shown when nothing is selected) -->
    <div class="ctx-group" id="ctx-default">
      <span style="font-size:11px;font-weight:800;color:#ffb11b;display:flex;align-items:center;gap:6px;">
        ✦ Presentation Studio
      </span>
      <div class="ctx-sep"></div>
      <span class="ctx-hint" style="color:#98a8c4;font-size:11px;">
        ক্যানভাসের যেকোনো Text, Shape বা Image-এ ক্লিক করে স্টাইল ও ফরম্যাট কাস্টমাইজ করুন
      </span>
    </div>

    <!-- TEXT section -->
    <div class="ctx-group ctx-hidden" id="ctx-text">
      <label class="ctx-label">Size
        <input id="ctx-size" type="number" min="8" max="180" value="38" title="Font size">
      </label>
      <label class="ctx-label">Text Color
        <input id="ctx-color" type="color" value="#ffffff" title="Text color">
      </label>
      <div class="ctx-sep"></div>
      <label class="ctx-label" title="Text box background color">
        <span style="font-size:9px;color:#ffb11b">📦 BG</span>
        <input id="ctx-box-color" type="color" value="#000000" title="Box background color">
      </label>
      <label class="ctx-label" title="Box background opacity (0 = transparent)">
        <span style="font-size:9px">Opacity</span>
        <input id="ctx-box-opacity" type="range" min="0" max="100" value="0" title="Box opacity" style="width:52px;accent-color:#ffb11b">
        <span id="ctx-box-opacity-val" style="font-size:10px;color:#ffd166;min-width:26px">0%</span>
      </label>
      <button id="ctx-box-clear" title="Remove box background" style="font-size:10px">✕ BG</button>
      <div class="ctx-sep"></div>
      <button id="ctx-bold"  title="Bold"><b>B</b></button>
      <button id="ctx-italic" title="Italic"><i>I</i></button>
      <button id="ctx-under" title="Underline"><u>U</u></button>
      <div class="ctx-sep"></div>
      <button id="ctx-left"   title="Align left">⬅</button>
      <button id="ctx-center" title="Align center">☰</button>
      <button id="ctx-right"  title="Align right">➡</button>
      <div class="ctx-sep"></div>
      <button id="ctx-edit-text-btn" title="Edit Text directly on slide (ক্যানভাসে সরাসরি টেক্সট লিখুন)" style="background:#0284c7;border-color:#38bdf8;color:#fff;font-weight:800;font-size:11px;padding:3px 8px;">✏️ Edit Text</button>
      <div class="ctx-sep"></div>
      <button id="ctx-layer-front" title="Bring to Front (সবার উপরে আনুন - Ctrl+Shift+])" style="font-size:11px;font-weight:700">⤒ Front</button>
      <button id="ctx-layer-forward" title="Bring Forward (এক ধাপ সামনে আনুন - Ctrl+])" style="font-size:11px;font-weight:700">↑ Forward</button>
      <button id="ctx-layer-backward" title="Send Backward (এক ধাপ পেছনে পাঠান - Ctrl+[)" style="font-size:11px;font-weight:700">↓ Backwd</button>
      <button id="ctx-layer-back" title="Send to Back (সবার নিচে পাঠান - Ctrl+Shift+[)" style="font-size:11px;font-weight:700">⤓ Back</button>
      <div class="ctx-sep"></div>
      <button id="ctx-duplicate" title="Duplicate (Ctrl+D)">⧉ Duplicate</button>
      <div class="ctx-sep"></div>
      <span class="ctx-hint">Click text on slide to edit</span>
    </div>

    <!-- SHAPE section (with both Shape styling and Shape Text styling) -->
    <div class="ctx-group ctx-hidden" id="ctx-shape">
      <button id="ctx-shape-img-replace" title="শেপে নিজের ছবি আপলোড করুন" style="background:#0369a1;border-color:#38bdf8;color:#fff;font-weight:800;padding:4px 10px;white-space:nowrap;">📁 ছবি লোড করুন</button>
      <div class="ctx-sep"></div>
      <label class="ctx-label">Fill
        <input id="ctx-shape-fill" type="color" value="#4f8df7" title="Shape fill color">
      </label>
      <label class="ctx-label">Border
        <input id="ctx-shape-border" type="color" value="#ffffff" title="Shape border color">
      </label>
      <label class="ctx-label">Border px
        <input id="ctx-shape-bw" type="number" min="0" max="20" value="2" title="Border width">
      </label>
      <label class="ctx-label">Opacity
        <input id="ctx-shape-opacity" type="range" min="0" max="100" value="100" title="Opacity" style="width:52px;accent-color:#ffb11b">
        <span id="ctx-shape-opacity-val" style="font-size:10px;color:#ffd166;min-width:28px">100%</span>
      </label>
      <div class="ctx-sep"></div>
      <label class="ctx-label">Text Size
        <input id="ctx-shape-text-size" type="number" min="8" max="120" value="18" title="Shape text size" style="width:42px">
      </label>
      <label class="ctx-label">Text Color
        <input id="ctx-shape-text-color" type="color" value="#ffffff" title="Shape text color">
      </label>
      <div class="ctx-sep"></div>
      <button id="ctx-shape-bold" title="Bold"><b>B</b></button>
      <button id="ctx-shape-italic" title="Italic"><i>I</i></button>
      <button id="ctx-shape-under" title="Underline"><u>U</u></button>
      <div class="ctx-sep"></div>
      <button id="ctx-shape-left" title="Align left">⬅</button>
      <button id="ctx-shape-center" title="Align center">☰</button>
      <button id="ctx-shape-right" title="Align right">➡</button>
      <div class="ctx-sep"></div>
      <button id="ctx-shape-rot-ccw" title="Rotate -45°">⟲ -45°</button>
      <button id="ctx-shape-rot-cw" title="Rotate +45°">⟳ +45°</button>
      <button id="ctx-shape-rot-0" title="Snap Horizontal (0°)">0°</button>
      <button id="ctx-shape-rot-90" title="Snap Vertical (90°)">90°</button>
      <button id="ctx-shape-flip" title="Flip 180°">↔ Flip</button>
      <div class="ctx-sep"></div>
      <button id="ctx-shape-layer-front" title="Bring to Front (সবার উপরে আনুন - Ctrl+Shift+])" style="font-size:11px;font-weight:700">⤒ Front</button>
      <button id="ctx-shape-layer-forward" title="Bring Forward (এক ধাপ সামনে আনুন - Ctrl+])" style="font-size:11px;font-weight:700">↑ Forward</button>
      <button id="ctx-shape-layer-backward" title="Send Backward (এক ধাপ পেছনে পাঠান - Ctrl+[)" style="font-size:11px;font-weight:700">↓ Backwd</button>
      <button id="ctx-shape-layer-back" title="Send to Back (সবার নিচে পাঠান - Ctrl+Shift+[)" style="font-size:11px;font-weight:700">⤓ Back</button>
      <div class="ctx-sep"></div>
      <button id="ctx-shape-duplicate" title="Duplicate Shape (Ctrl+D)">⧉ Duplicate</button>
      <div class="ctx-sep"></div>
      <span class="ctx-hint">Click shape to type</span>
    </div>

    <!-- IMAGE section -->
    <div class="ctx-group ctx-hidden" id="ctx-image">
      <button id="ctx-img-replace" title="কম্পিউটার থেকে নিজের ছবি/আইকন বাছাই করুন" style="background:#0369a1;border-color:#38bdf8;color:#fff;font-weight:800;padding:4px 12px;">📁 ছবি Replace করুন</button>
      <div class="ctx-sep"></div>
      <label class="ctx-label">Opacity
        <input id="ctx-img-opacity" type="range" min="0" max="100" value="100" title="Opacity" style="width:64px;accent-color:#ffb11b">
        <span id="ctx-img-opacity-val" style="font-size:10px;color:#ffd166;min-width:28px">100%</span>
      </label>
      <div class="ctx-sep"></div>
      <button id="ctx-flip-h" title="Flip horizontal">↔ Flip H</button>
      <button id="ctx-flip-v" title="Flip vertical">↕ Flip V</button>
      <div class="ctx-sep"></div>
      <button id="ctx-fit-cover" title="Toggle fit/cover">⊡ Fit/Cover</button>
      <div class="ctx-sep"></div>
      <button id="ctx-img-layer-front" title="Bring to Front (সবার উপরে আনুন - Ctrl+Shift+])" style="font-size:11px;font-weight:700">⤒ Front</button>
      <button id="ctx-img-layer-forward" title="Bring Forward (এক ধাপ সামনে আনুন - Ctrl+])" style="font-size:11px;font-weight:700">↑ Forward</button>
      <button id="ctx-img-layer-backward" title="Send Backward (এক ধাপ পেছনে পাঠান - Ctrl+[)" style="font-size:11px;font-weight:700">↓ Backwd</button>
      <button id="ctx-img-layer-back" title="Send to Back (সবার নিচে পাঠান - Ctrl+Shift+[)" style="font-size:11px;font-weight:700">⤓ Back</button>
      <div class="ctx-sep"></div>
      <span class="ctx-hint">💡 Double-click image = Replace করুন</span>
    </div>
  `;
  document.body.prepend(bar);

  // Stop pointerdown from bubbling to document deselect listeners
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  bar.addEventListener('mousedown', e => e.stopPropagation());

  // Direct event delegation for all toolbar buttons
  bar.addEventListener('click', event => {
    event.stopPropagation();
    const btn = event.target.closest('button');
    if (!btn) return;
    const id = btn.id;

    // Text buttons
    if (id === 'ctx-bold') {
      applyText(item => {
        const isBold = (item.weight === '900' || item.weight === 'bold' || item.weight === '700' || item.weight === '800');
        item.weight = isBold ? 'normal' : '900';
      });
    } else if (id === 'ctx-italic') {
      applyText(item => {
        item.fontStyle = (item.fontStyle === 'italic') ? 'normal' : 'italic';
      });
    } else if (id === 'ctx-under') {
      applyText(item => {
        item.textDecoration = (item.textDecoration === 'underline') ? 'none' : 'underline';
      });
    } else if (id === 'ctx-left') {
      applyText(item => { item.textAlign = 'left'; });
    } else if (id === 'ctx-center') {
      applyText(item => { item.textAlign = 'center'; });
    } else if (id === 'ctx-right') {
      applyText(item => { item.textAlign = 'right'; });
    } else if (id === 'ctx-box-clear') {
      applyText(item => {
        item.boxBg = 'transparent';
        item.boxOpacity = 0;
        $('ctx-box-opacity').value = 0;
        $('ctx-box-opacity-val').textContent = '0%';
      });
    }
    // Shape text buttons
    else if (id === 'ctx-shape-bold') {
      applyShape(item => {
        const isBold = (item.textWeight === '900' || item.textWeight === 'bold' || item.weight === '900' || item.weight === 'bold');
        item.textWeight = isBold ? 'normal' : '900';
        item.weight = item.textWeight;
      });
    } else if (id === 'ctx-shape-italic') {
      applyShape(item => {
        item.fontStyle = (item.fontStyle === 'italic') ? 'normal' : 'italic';
      });
    } else if (id === 'ctx-shape-under') {
      applyShape(item => {
        item.textDecoration = (item.textDecoration === 'underline') ? 'none' : 'underline';
      });
    } else if (id === 'ctx-shape-left') {
      applyShape(item => { item.textAlign = 'left'; });
    } else if (id === 'ctx-shape-center') {
      applyShape(item => { item.textAlign = 'center'; });
    } else if (id === 'ctx-shape-right') {
      applyShape(item => { item.textAlign = 'right'; });
    }
    // Shape quick rotation & flip buttons
    else if (id === 'ctx-shape-rot-ccw') {
      applyShape(item => {
        item.rotation = ((Number(item.rotation) || 0) - 45 + 360) % 360;
      });
    } else if (id === 'ctx-shape-rot-cw') {
      applyShape(item => {
        item.rotation = ((Number(item.rotation) || 0) + 45) % 360;
      });
    } else if (id === 'ctx-shape-rot-0') {
      applyShape(item => {
        item.rotation = 0;
      });
    } else if (id === 'ctx-shape-rot-90') {
      applyShape(item => {
        item.rotation = 90;
      });
    } else if (id === 'ctx-shape-flip') {
      applyShape(item => {
        item.rotation = ((Number(item.rotation) || 0) + 180) % 360;
      });
    } else if (id === 'ctx-shape-duplicate' || id === 'ctx-duplicate') {
      if (typeof window.duplicatePresentationElement === 'function') {
        window.duplicatePresentationElement();
      }
    }
    // Layer ordering buttons
    else if (id.includes('layer-front')) {
      if (typeof window.bringElementToFront === 'function') window.bringElementToFront();
    } else if (id.includes('layer-forward')) {
      if (typeof window.bringElementForward === 'function') window.bringElementForward();
    } else if (id.includes('layer-backward')) {
      if (typeof window.sendElementBackward === 'function') window.sendElementBackward();
    } else if (id.includes('layer-back')) {
      if (typeof window.sendElementToBack === 'function') window.sendElementToBack();
    }
    // Direct Edit Text button
    else if (id === 'ctx-edit-text-btn') {
      const el = (typeof selectedEl === 'function') ? selectedEl() : null;
      if (el && typeof window.activateInlineTextEdit === 'function') {
        window.activateInlineTextEdit(el);
      }
    }
    // Image replace buttons (both from image & shape sections)
    else if (id === 'ctx-img-replace' || id === 'ctx-shape-img-replace') {
      const el = (typeof selectedEl === 'function') ? selectedEl() : null;
      if (typeof window.triggerReplaceImage === 'function') {
        window.triggerReplaceImage(el);
      }
    }
    // Image buttons
    else if (id === 'ctx-flip-h') {
      applyImage(item => { item.flipH = !item.flipH; });
    } else if (id === 'ctx-flip-v') {
      applyImage(item => { item.flipV = !item.flipV; });
    } else if (id === 'ctx-fit-cover') {
      applyImage(item => { item.objectFit = (item.objectFit === 'contain') ? 'cover' : 'contain'; });
    }
  });

  /* ── CSS ─────────────────────────────────────────────────────────────────── */
  document.head.insertAdjacentHTML('beforeend', `<style>
    #ctx-toolbar {
      position: fixed;
      top: 58px; left: 0; right: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      background: #0e1726;
      border-bottom: 1px solid #26334a;
      padding: 0 14px;
      height: 40px;
      gap: 0;
      box-shadow: 0 2px 12px #0008;
      transition: opacity .18s, transform .18s;
      overflow: hidden;
    }
    #ctx-toolbar.ctx-empty {
      height: 0;
      padding: 0;
      border: none;
      overflow: hidden;
    }
    .ctx-group {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 100%;
    }
    .ctx-hidden { display: none !important; }
    .ctx-sep {
      width: 1px;
      height: 22px;
      background: #2e3e58;
      margin: 0 6px;
    }
    .ctx-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: #98a8c4;
      white-space: nowrap;
    }
    #ctx-size, #ctx-shape-text-size {
      width: 46px;
      padding: 3px 4px;
      background: #131f33;
      border: 1px solid #2e3e58;
      border-radius: 5px;
      color: #fff;
      font: 12px inherit;
    }
    #ctx-color, #ctx-shape-fill, #ctx-shape-border, #ctx-shape-text-color,
    #ctx-box-color {
      width: 28px; height: 24px;
      padding: 1px;
      border: 1px solid #3a4e6b;
      border-radius: 4px;
      background: #131f33;
      cursor: pointer;
    }
    #ctx-shape-bw {
      width: 38px;
      padding: 3px 4px;
      background: #131f33;
      border: 1px solid #2e3e58;
      border-radius: 5px;
      color: #fff;
      font: 12px inherit;
    }
    #ctx-toolbar button {
      padding: 3px 8px;
      background: #182334;
      border: 1px solid #2e3e58;
      border-radius: 5px;
      color: #d0ddf5;
      font: 700 11px inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: background .12s, border-color .12s;
    }
    #ctx-toolbar button:hover { background: #253650; border-color: #ffb11b; }
    #ctx-toolbar button.ctx-active { background: #315184; border-color: #ffb11b; color: #fff; }
    .ctx-hint {
      font-size: 10px;
      color: #4a5e7a;
      user-select: none;
      padding-left: 4px;
    }
    /* Permanently reserve room for toolbar so workspace never shifts down or up */
    .workspace { margin-top: 40px !important; height: calc(100vh - 58px - 40px) !important; }
  </style>`);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function showGroup(id) {
    ['ctx-default','ctx-text','ctx-shape','ctx-image'].forEach(g => {
      const el = $(g);
      if (el) el.classList.toggle('ctx-hidden', g !== id);
    });
  }
  function hideAll() {
    showGroup('ctx-default');
  }

  /* ── Sync the bar to the currently selected element ─────────────────────── */
  function syncBar() {
    const item = (typeof selectedEl === 'function') ? selectedEl() : null;
    if (!item) { hideAll(); return; }

    if (item.type === 'text') {
      showGroup('ctx-text');
      $('ctx-size').value = item.size || 38;
      $('ctx-color').value = item.color || '#ffffff';
      
      const boxOpacity = item.boxOpacity !== undefined ? Math.round(item.boxOpacity * 100) : 0;
      $('ctx-box-color').value = item.boxBg || '#000000';
      $('ctx-box-opacity').value = boxOpacity;
      $('ctx-box-opacity-val').textContent = boxOpacity + '%';

      const isBold = (item.weight === '900' || item.weight === 'bold' || item.weight === '700' || item.weight === '800');
      $('ctx-bold').classList.toggle('ctx-active', isBold);
      $('ctx-italic').classList.toggle('ctx-active', item.fontStyle === 'italic');
      $('ctx-under').classList.toggle('ctx-active', item.textDecoration === 'underline');

      const align = item.textAlign || 'center';
      $('ctx-left').classList.toggle('ctx-active', align === 'left');
      $('ctx-center').classList.toggle('ctx-active', align === 'center');
      $('ctx-right').classList.toggle('ctx-active', align === 'right');
    }
    else if (item.type === 'shape') {
      showGroup('ctx-shape');
      const fillVal = item.fill || item.fillColor || item.color || '#4f8df7';
      const strokeVal = item.stroke || item.borderColor || '#ffffff';
      const lineVal = item.line !== undefined ? item.line : (item.borderWidth !== undefined ? item.borderWidth : 2);
      
      // Calculate opacity cleanly (handling both 0..1 and 0..100)
      let op = 100;
      if (item.opacity !== undefined) {
        const num = Number(item.opacity);
        op = num <= 1 ? Math.round(num * 100) : Math.round(num);
      }

      $('ctx-shape-fill').value   = fillVal;
      $('ctx-shape-border').value = strokeVal;
      $('ctx-shape-bw').value     = lineVal;
      $('ctx-shape-opacity').value = op;
      $('ctx-shape-opacity-val').textContent = op + '%';

      // Shape text options
      $('ctx-shape-text-size').value = item.textSize || 18;
      $('ctx-shape-text-color').value = item.textColor || '#ffffff';

      const isBold = (item.textWeight === '900' || item.textWeight === 'bold' || item.weight === '900' || item.weight === 'bold');
      $('ctx-shape-bold').classList.toggle('ctx-active', isBold);
      $('ctx-shape-italic').classList.toggle('ctx-active', item.fontStyle === 'italic');
      $('ctx-shape-under').classList.toggle('ctx-active', item.textDecoration === 'underline');

      const align = item.textAlign || 'center';
      $('ctx-shape-left').classList.toggle('ctx-active', align === 'left');
      $('ctx-shape-center').classList.toggle('ctx-active', align === 'center');
      $('ctx-shape-right').classList.toggle('ctx-active', align === 'right');
    }
    else if (item.type === 'image') {
      showGroup('ctx-image');
      let op = 100;
      if (item.opacity !== undefined) {
        const num = Number(item.opacity);
        op = num <= 1 ? Math.round(num * 100) : Math.round(num);
      }
      $('ctx-img-opacity').value = op;
      $('ctx-img-opacity-val').textContent = op + '%';
    }
    else {
      hideAll();
    }
  }

  /* ── Wire renderInspector so the bar always stays in sync ─────────────────── */
  const _prevRenderInspector = renderInspector;
  renderInspector = function() {
    _prevRenderInspector();
    syncBar();
  };

  /* ── TEXT controls ─────────────────────────────────────────────────────── */
  function applyText(fn) {
    const item = (typeof selectedEl === 'function') ? selectedEl() : null;
    if (!item || item.type !== 'text') return;
    const currentId = item.id;
    fn(item);
    selected = currentId;
    if (typeof render === 'function') render();
    selected = currentId;
    syncBar();
  }

  $('ctx-size').addEventListener('input', () =>
    applyText(item => item.size = Math.max(8, +$('ctx-size').value || 38)));

  $('ctx-color').addEventListener('input', () =>
    applyText(item => { item.color = $('ctx-color').value; item.textGradient = false; }));

  // Box background color
  $('ctx-box-color').addEventListener('input', () => applyText(item => {
    item.boxBg = $('ctx-box-color').value;
    if ((item.boxOpacity || 0) === 0) { item.boxOpacity = 1; $('ctx-box-opacity').value = 100; $('ctx-box-opacity-val').textContent = '100%'; }
  }));

  $('ctx-box-opacity').addEventListener('input', () => {
    const val = +$('ctx-box-opacity').value;
    $('ctx-box-opacity-val').textContent = val + '%';
    applyText(item => item.boxOpacity = val / 100);
  });

  /* ── SHAPE controls ─────────────────────────────────────────────────────── */
  function applyShape(fn) {
    const item = (typeof selectedEl === 'function') ? selectedEl() : null;
    if (!item || item.type !== 'shape') return;
    const currentId = item.id;
    fn(item);
    selected = currentId;
    if (typeof render === 'function') render();
    selected = currentId;
    syncBar();
  }

  $('ctx-shape-fill').addEventListener('input', () =>
    applyShape(item => {
      const val = $('ctx-shape-fill').value;
      item.fill = val;
      item.fillColor = val;
      item.color = val;
    }));

  $('ctx-shape-border').addEventListener('input', () =>
    applyShape(item => {
      const val = $('ctx-shape-border').value;
      item.stroke = val;
      item.borderColor = val;
    }));

  $('ctx-shape-bw').addEventListener('input', () =>
    applyShape(item => {
      const val = Math.max(0, +$('ctx-shape-bw').value || 0);
      item.line = val;
      item.borderWidth = val;
    }));

  $('ctx-shape-opacity').addEventListener('input', () => {
    const val = +$('ctx-shape-opacity').value;
    $('ctx-shape-opacity-val').textContent = val + '%';
    applyShape(item => {
      item.opacity = val;
    });
  });

  $('ctx-shape-text-size').addEventListener('input', () =>
    applyShape(item => {
      item.textSize = Math.max(8, +$('ctx-shape-text-size').value || 18);
    }));

  $('ctx-shape-text-color').addEventListener('input', () =>
    applyShape(item => {
      item.textColor = $('ctx-shape-text-color').value;
    }));

  /* ── IMAGE controls ─────────────────────────────────────────────────────── */
  function applyImage(fn) {
    const item = (typeof selectedEl === 'function') ? selectedEl() : null;
    if (!item || item.type !== 'image') return;
    const currentId = item.id;
    fn(item);
    selected = currentId;
    if (typeof render === 'function') render();
    selected = currentId;
    syncBar();
  }

  $('ctx-img-opacity').addEventListener('input', () => {
    const val = +$('ctx-img-opacity').value;
    $('ctx-img-opacity-val').textContent = val + '%';
    applyImage(item => item.opacity = val / 100);
  });

  /* ── Extend render() to apply text styling, shape colors, image opacity ─── */
  const _prevRender = render;
  render = function() {
    _prevRender();
    active().elements.forEach(item => {
      if (item.type === 'text') {
        const node = $('slide').querySelector('.text-el[data-id="' + item.id + '"]');
        if (!node) return;

        const isBold = (item.weight === '900' || item.weight === 'bold' || item.weight === '700' || item.weight === '800');
        const isItalic = (item.fontStyle === 'italic');
        const isUnderline = (item.textDecoration === 'underline');
        const weightVal = isBold ? '900' : 'normal';
        const alignVal = item.textAlign || 'center';

        node.style.fontWeight = weightVal;
        node.style.fontStyle = isItalic ? 'italic' : 'normal';
        node.style.textDecoration = isUnderline ? 'underline' : 'none';
        node.style.textDecorationThickness = '2.5px';
        node.style.textUnderlineOffset = '5px';
        node.style.textAlign = alignVal;

        const content = node.querySelector('.text-content');
        if (content) {
          content.style.fontWeight = weightVal;
          content.style.fontStyle = isItalic ? 'italic' : 'normal';
          content.style.textDecoration = isUnderline ? 'underline' : 'none';
          content.style.textDecorationThickness = '2.5px';
          content.style.textUnderlineOffset = '5px';
          content.style.textAlign = alignVal;
          content.style.transform = isItalic ? 'skewX(-12deg)' : 'none';
          content.style.transformOrigin = 'left center';
        }

        if (item.boxOpacity && item.boxOpacity > 0 && item.boxBg && item.boxBg !== 'transparent') {
          const hex = item.boxBg.replace('#','');
          const r = parseInt(hex.substring(0,2),16), g = parseInt(hex.substring(2,4),16), b = parseInt(hex.substring(4,6),16);
          node.style.background = 'rgba('+r+','+g+','+b+','+item.boxOpacity+')';
          node.style.borderRadius = '6px';
        } else {
          node.style.background = 'transparent';
        }
      }
      if (item.type === 'shape') {
        const node = $('slide').querySelector('.shape-el[data-id="' + item.id + '"]');
        if (!node) return;

        const fillVal = item.fill || item.fillColor || item.color || '#4f8df7';
        const strokeVal = item.stroke || item.borderColor || '#ffffff';
        const lineVal = item.line !== undefined ? item.line : (item.borderWidth !== undefined ? item.borderWidth : 2);
        
        let opVal = 1;
        if (item.opacity !== undefined) {
          const num = Number(item.opacity);
          opVal = (num <= 1 ? num : num / 100);
        }

        node.style.setProperty('--sf', fillVal);
        node.style.setProperty('--ss', strokeVal);
        node.style.setProperty('--sl', lineVal + 'px');
        node.style.setProperty('--so', opVal);
        node.style.background = fillVal;
        node.style.borderColor = strokeVal;
        node.style.borderWidth = lineVal + 'px';
        node.style.borderStyle = lineVal > 0 ? 'solid' : 'none';
        node.style.opacity = opVal;

        const label = node.querySelector('.shape-label');
        if (label) {
          const isBold = (item.textWeight === '900' || item.textWeight === 'bold' || item.weight === '900' || item.weight === 'bold');
          const isItalic = (item.fontStyle === 'italic');
          const isUnderline = (item.textDecoration === 'underline');

          label.style.color = item.textColor || '#ffffff';
          label.style.fontSize = (item.textSize || 18) + 'px';
          label.style.fontWeight = isBold ? '900' : 'normal';
          label.style.fontStyle = isItalic ? 'italic' : 'normal';
          label.style.textDecoration = isUnderline ? 'underline' : 'none';
          label.style.textDecorationThickness = '2px';
          label.style.textUnderlineOffset = '4px';
          label.style.justifyContent = (item.textAlign === 'left') ? 'flex-start' : (item.textAlign === 'right') ? 'flex-end' : 'center';
          label.style.textAlign = item.textAlign || 'center';
          label.style.transform = isItalic ? 'skewX(-12deg)' : 'none';
        }
      }
      if (item.type === 'image') {
        const node = $('slide').querySelector('.image-el[data-id="' + item.id + '"]');
        if (!node) return;
        const img = node.querySelector('img');
        if (img) {
          node.style.opacity = item.opacity !== undefined ? item.opacity : 1;
          const sx = item.flipH ? -1 : 1, sy = item.flipV ? -1 : 1;
          const baseRot = 'rotate(' + (Number(item.rotation) || 0) + 'deg)';
          node.style.transform = baseRot + ' scale(' + sx + ',' + sy + ')';
          img.style.objectFit = item.objectFit || 'cover';
        }
      }
    });
  };

  /* ── Also sync bar when selectionchange happens (text cursor position) ──── */
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const anchor = sel.anchorNode;
    const textEl = anchor?.nodeType === Node.TEXT_NODE
      ? anchor.parentElement?.closest('.text-el, .shape-el')
      : anchor?.closest?.('.text-el, .shape-el');
    if (!textEl) return;
    const id = textEl.dataset?.id;
    if (!id) return;
    const item = active()?.elements?.find(el => el.id === id);
    if (item) syncBar();
  });

  /* ── Initial sync ────────────────────────────────────────────────────────── */
  hideAll();
  render();
})();
