/**
 * presentation-context-toolbar.js
 * Microsoft Word-style context toolbar.
 * • Text selected/clicked   → Text Size, Text Color, Bold/Italic/Underline, Alignment
 * • Shape clicked           → Fill Color, Border Color, Opacity, Rotate
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
    <!-- TEXT section -->
    <div class="ctx-group" id="ctx-text">
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
      <span class="ctx-hint">Double-click text to edit</span>
    </div>

    <!-- SHAPE section -->
    <div class="ctx-group ctx-hidden" id="ctx-shape">
      <label class="ctx-label">Fill
        <input id="ctx-shape-fill" type="color" value="#4f8df7" title="Shape fill color">
      </label>
      <label class="ctx-label">Border
        <input id="ctx-shape-border" type="color" value="#1769e8" title="Shape border color">
      </label>
      <label class="ctx-label">Border px
        <input id="ctx-shape-bw" type="number" min="0" max="20" value="0" title="Border width">
      </label>
      <label class="ctx-label">Opacity
        <input id="ctx-shape-opacity" type="range" min="0" max="100" value="100" title="Opacity">
        <span id="ctx-shape-opacity-val">100%</span>
      </label>
      <div class="ctx-sep"></div>
      <span class="ctx-hint">Double-click shape to edit text</span>
    </div>

    <!-- IMAGE section -->
    <div class="ctx-group ctx-hidden" id="ctx-image">
      <label class="ctx-label">Opacity
        <input id="ctx-img-opacity" type="range" min="0" max="100" value="100" title="Opacity">
        <span id="ctx-img-opacity-val">100%</span>
      </label>
      <div class="ctx-sep"></div>
      <button id="ctx-flip-h" title="Flip horizontal">↔ Flip H</button>
      <button id="ctx-flip-v" title="Flip vertical">↕ Flip V</button>
      <div class="ctx-sep"></div>
      <button id="ctx-fit-cover" title="Toggle fit/cover">⊡ Fit/Cover</button>
      <div class="ctx-sep"></div>
      <span class="ctx-hint">Click image to select</span>
    </div>
  `;
  document.body.prepend(bar);

  // Stop clicks/pointerdowns inside toolbar from bubbling or triggering deselect handlers
  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(evt => {
    bar.addEventListener(evt, e => {
      e.stopPropagation();
    }, true);
    bar.addEventListener(evt, e => {
      e.stopPropagation();
    }, false);
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
    #ctx-size {
      width: 46px;
      padding: 3px 4px;
      background: #131f33;
      border: 1px solid #2e3e58;
      border-radius: 5px;
      color: #fff;
      font: 12px inherit;
    }
    #ctx-color, #ctx-shape-fill, #ctx-shape-border,
    #ctx-img-opacity-swatch {
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
    #ctx-shape-opacity, #ctx-img-opacity {
      width: 64px;
      accent-color: #ffb11b;
      cursor: pointer;
    }
    #ctx-shape-opacity-val, #ctx-img-opacity-val {
      font-size: 10px;
      color: #ffd166;
      min-width: 28px;
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
    /* Push workspace down to make room for the bar */
    .workspace { margin-top: 40px; height: calc(100vh - 58px - 40px) !important; }
    .workspace.ctx-empty-workspace { margin-top: 0; height: calc(100vh - 58px) !important; }
  </style>`);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function showGroup(id) {
    ['ctx-text','ctx-shape','ctx-image'].forEach(g => {
      const el = $(g);
      if (el) el.classList.toggle('ctx-hidden', g !== id);
    });
    bar.classList.remove('ctx-empty');
    document.querySelector('.workspace')?.classList.remove('ctx-empty-workspace');
  }
  function hideAll() {
    bar.classList.add('ctx-empty');
    document.querySelector('.workspace')?.classList.add('ctx-empty-workspace');
  }

  /* ── Sync the bar to the currently selected element ─────────────────────── */
  function syncBar() {
    const item = (typeof selectedEl === 'function') ? selectedEl() : null;
    if (!item) { hideAll(); return; }

    if (item.type === 'text') {
      showGroup('ctx-text');
      // Size
      $('ctx-size').value = item.size || 38;
      // Text color
      $('ctx-color').value = item.color || '#ffffff';
      // Box background
      const boxOpacity = item.boxOpacity !== undefined ? Math.round(item.boxOpacity * 100) : 0;
      $('ctx-box-color').value = item.boxBg || '#000000';
      $('ctx-box-opacity').value = boxOpacity;
      $('ctx-box-opacity-val').textContent = boxOpacity + '%';
      // Style toggles
      $('ctx-bold').classList.toggle('ctx-active', item.weight === '900');
      $('ctx-italic').classList.toggle('ctx-active', item.fontStyle === 'italic');
      $('ctx-under').classList.toggle('ctx-active', item.textDecoration === 'underline');
      // Alignment
      const align = item.textAlign || 'center';
      $('ctx-left').classList.toggle('ctx-active', align === 'left');
      $('ctx-center').classList.toggle('ctx-active', align === 'center');
      $('ctx-right').classList.toggle('ctx-active', align === 'right');
    }
    else if (item.type === 'shape') {
      showGroup('ctx-shape');
      $('ctx-shape-fill').value   = item.fillColor   || item.color || '#4f8df7';
      $('ctx-shape-border').value = item.borderColor || '#1769e8';
      $('ctx-shape-bw').value     = item.borderWidth !== undefined ? item.borderWidth : 0;
      const op = item.opacity !== undefined ? Math.round(item.opacity * 100) : 100;
      $('ctx-shape-opacity').value = op;
      $('ctx-shape-opacity-val').textContent = op + '%';
    }
    else if (item.type === 'image') {
      showGroup('ctx-image');
      const op = item.opacity !== undefined ? Math.round(item.opacity * 100) : 100;
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
    // If opacity was 0, bump it to 100 so the color is immediately visible
    if ((item.boxOpacity || 0) === 0) { item.boxOpacity = 1; $('ctx-box-opacity').value = 100; $('ctx-box-opacity-val').textContent = '100%'; }
  }));

  $('ctx-box-opacity').addEventListener('input', () => {
    const val = +$('ctx-box-opacity').value;
    $('ctx-box-opacity-val').textContent = val + '%';
    applyText(item => item.boxOpacity = val / 100);
  });

  $('ctx-box-clear').addEventListener('click', () => applyText(item => { item.boxBg = 'transparent'; item.boxOpacity = 0; $('ctx-box-opacity').value = 0; $('ctx-box-opacity-val').textContent = '0%'; }));

  $('ctx-bold').addEventListener('click', () =>
    applyText(item => item.weight = item.weight === '900' ? '700' : '900'));

  $('ctx-italic').addEventListener('click', () =>
    applyText(item => item.fontStyle = item.fontStyle === 'italic' ? 'normal' : 'italic'));

  $('ctx-under').addEventListener('click', () =>
    applyText(item => item.textDecoration = item.textDecoration === 'underline' ? 'none' : 'underline'));

  ['left','center','right'].forEach(align =>
    $('ctx-' + align).addEventListener('click', () =>
      applyText(item => item.textAlign = align)));

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
    applyShape(item => { item.fillColor = $('ctx-shape-fill').value; item.color = item.fillColor; }));

  $('ctx-shape-border').addEventListener('input', () =>
    applyShape(item => item.borderColor = $('ctx-shape-border').value));

  $('ctx-shape-bw').addEventListener('input', () =>
    applyShape(item => item.borderWidth = Math.max(0, +$('ctx-shape-bw').value || 0)));

  $('ctx-shape-opacity').addEventListener('input', () => {
    const val = +$('ctx-shape-opacity').value;
    $('ctx-shape-opacity-val').textContent = val + '%';
    applyShape(item => item.opacity = val / 100);
  });

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

  $('ctx-flip-h').addEventListener('click', () =>
    applyImage(item => item.flipH = !item.flipH));

  $('ctx-flip-v').addEventListener('click', () =>
    applyImage(item => item.flipV = !item.flipV));

  $('ctx-fit-cover').addEventListener('click', () =>
    applyImage(item => item.objectFit = (item.objectFit === 'contain') ? 'cover' : 'contain'));

  /* ── Extend render() to apply image opacity and flip ────────────────────── */
  const _prevRender = render;
  render = function() {
    _prevRender();
    active().elements.forEach(item => {
      if (item.type === 'image') {
        const node = $('slide').querySelector('.image-el[data-id="' + item.id + '"]');
        if (!node) return;
        const img = node.querySelector('img');
        if (img) {
          // Opacity
          node.style.opacity = item.opacity !== undefined ? item.opacity : 1;
          // Flip
          const sx = item.flipH ? -1 : 1, sy = item.flipV ? -1 : 1;
          const baseRot = 'rotate(' + (Number(item.rotation) || 0) + 'deg)';
          node.style.transform = baseRot + ' scale(' + sx + ',' + sy + ')';
          // Fit/Cover
          img.style.objectFit = item.objectFit || 'cover';
        }
      }
      if (item.type === 'text') {
        const node = $('slide').querySelector('.text-el[data-id="' + item.id + '"]');
        if (!node) return;
        if (item.boxOpacity && item.boxOpacity > 0 && item.boxBg && item.boxBg !== 'transparent') {
          // Build rgba from hex + opacity
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
        if (item.opacity !== undefined) node.style.opacity = item.opacity;
        if (item.borderColor) node.style.borderColor = item.borderColor;
        if (item.borderWidth !== undefined) {
          node.style.borderWidth = item.borderWidth + 'px';
          node.style.borderStyle = item.borderWidth > 0 ? 'solid' : 'none';
        }
      }
    });
  };

  /* ── Also sync bar when selectionchange happens (text cursor position) ──── */
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return; // only sync when text is actually selected
    const anchor = sel.anchorNode;
    const textEl = anchor?.nodeType === Node.TEXT_NODE
      ? anchor.parentElement?.closest('.text-el')
      : anchor?.closest?.('.text-el');
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
