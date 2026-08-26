(() => {
  const $ = id => document.getElementById(id);

  let _lastClickId = null;
  let _lastClickTime = 0;
  const DBLCLICK_MS = 350;

  // ──────────────────────────────────────────────────────────────────────────
  // Toast Notification System
  // ──────────────────────────────────────────────────────────────────────────
  function showToast(message, duration = 1800) {
    let toast = $('presentation-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'presentation-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = '';
    }, duration);
  }
  window.showPresentationToast = showToast;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Activate Inline Text Editing
  // ──────────────────────────────────────────────────────────────────────────
  window.activateInlineTextEdit = function(item) {
    if (!item) return;
    selected = item.id;
    
    // Find the text DOM node
    const node = $('slide')?.querySelector('.text-el[data-id="' + item.id + '"]');
    if (!node) {
      if (typeof render === 'function') render();
      return;
    }

    // Make sure .text-content exists
    let content = node.querySelector('.text-content');
    if (!content) {
      node.textContent = '';
      content = document.createElement('span');
      content.className = 'text-content';
      content.textContent = item.text || '';
      node.appendChild(content);
    }

    // Flag the element as actively being edited so drag/resize handlers can
    // skip it and let the native text caret/selection work instead.
    node.classList.add('inline-editing');

    content.contentEditable = 'true';
    content.spellcheck = false;
    content.focus();

    // Place cursor at the end
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(content);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}

    if (typeof renderInspector === 'function') renderInspector();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Activate Inline Shape Editing
  // ──────────────────────────────────────────────────────────────────────────
  window.activateInlineShapeEdit = function(item) {
    if (!item) return;
    selected = item.id;
    const node = $('slide')?.querySelector('.shape-el[data-id="' + item.id + '"] .shape-label');
    if (!node) {
      if (typeof render === 'function') render();
      return;
    }
    // Flag the shape element as actively being edited so drag/resize handlers
    // skip it and the native text selection works.
    node.closest('.shape-el')?.classList.add('inline-editing');
    node.contentEditable = 'true';
    node.spellcheck = false;
    node.focus();

    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(node);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}

    if (typeof renderInspector === 'function') renderInspector();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Select All Text Inside Text Box or Shape on Ctrl+A
  // ──────────────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
      const target = event.target;
      const tagName = (target && target.tagName ? target.tagName.toLowerCase() : '');
      const isNativeInput = ['input', 'textarea'].includes(tagName);

      if (isNativeInput) {
        // Allow standard selection inside inspector fields or inputs
        return;
      }

      // Check if user is currently inside a contentEditable (or activeElement is contentEditable)
      const activeEditable = target?.isContentEditable 
        ? target 
        : (document.activeElement?.isContentEditable ? document.activeElement : target?.closest?.('[contenteditable="true"]'));

      if (activeEditable) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(activeEditable);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (_) {}
        return;
      }

      // Check if a Text or Shape is currently selected on the canvas
      const item = typeof selectedEl === 'function' ? selectedEl() : null;
      if (item && (item.type === 'text' || item.type === 'shape')) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (item.type === 'text') {
          window.activateInlineTextEdit(item);
          const content = $('slide')?.querySelector('.text-el[data-id="' + item.id + '"] .text-content');
          if (content) {
            content.contentEditable = 'true';
            content.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(content);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (_) {}
          }
        } else if (item.type === 'shape') {
          window.activateInlineShapeEdit(item);
          const label = $('slide')?.querySelector('.shape-el[data-id="' + item.id + '"] .shape-label');
          if (label) {
            label.contentEditable = 'true';
            label.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(label);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (_) {}
          }
        }
        return;
      }

      // Prevent whole webpage text selection when pressing Ctrl+A outside editable elements
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Ctrl + Mouse Wheel Zoom In / Zoom Out
  // ──────────────────────────────────────────────────────────────────────────
  let _zoomLevel = 1.0;

  function updateZoomUI() {
    const badge = $('zoomPercentageBadge');
    if (badge) badge.textContent = Math.round(_zoomLevel * 100) + '%';
  }

  window.getPresentationZoom = () => _zoomLevel;

  window.setPresentationZoom = function(level) {
    _zoomLevel = Math.max(0.3, Math.min(3.0, Math.round(level * 100) / 100));
    const slide = $('slide');
    if (slide) {
      slide.style.transform = `scale(${_zoomLevel})`;
      slide.style.transformOrigin = 'center center';
      slide.style.transition = 'transform 0.08s ease-out';
    }
    updateZoomUI();
  };

  function setupZoomControls() {
    let stageWrap = document.querySelector('.stage-wrap');
    if (!stageWrap) return;

    if (!$('presentationZoomHud')) {
      const hud = document.createElement('div');
      hud.id = 'presentationZoomHud';
      hud.innerHTML = `
        <button id="zoomOutBtn" title="Zoom Out (Ctrl + Scroll Down)">−</button>
        <span id="zoomPercentageBadge" title="Click to Reset Zoom (100%)">100%</span>
        <button id="zoomInBtn" title="Zoom In (Ctrl + Scroll Up)">+</button>
        <button id="zoomResetBtn" title="Reset Zoom to 100%">Reset</button>
      `;
      stageWrap.appendChild(hud);

      $('zoomOutBtn').onclick = e => { e.stopPropagation(); window.setPresentationZoom(_zoomLevel - 0.1); };
      $('zoomInBtn').onclick = e => { e.stopPropagation(); window.setPresentationZoom(_zoomLevel + 0.1); };
      $('zoomResetBtn').onclick = e => { e.stopPropagation(); window.setPresentationZoom(1.0); };
      $('zoomPercentageBadge').onclick = e => { e.stopPropagation(); window.setPresentationZoom(1.0); };
    }

    // Ctrl + Wheel Zoom Listener
    stageWrap.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.08 : -0.08;
        window.setPresentationZoom(_zoomLevel + delta);
      }
    }, { passive: false });
  }

  // Also catch document level wheel with Ctrl if over workspace
  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) {
      const stageWrap = document.querySelector('.stage-wrap');
      if (stageWrap && (stageWrap.contains(event.target) || event.target.closest?.('.workspace'))) {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.08 : -0.08;
        window.setPresentationZoom(_zoomLevel + delta);
      }
    }
  }, { passive: false });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Shape & Element Copy / Duplicate System (Ctrl+C, Ctrl+V, Ctrl+D)
  // ──────────────────────────────────────────────────────────────────────────
  window.duplicatePresentationElement = function(item) {
    if (!item) {
      item = typeof selectedEl === 'function' ? selectedEl() : null;
    }
    if (!item || !active() || !Array.isArray(active().elements)) return;

    const copy = structuredClone(item);
    copy.id = crypto.randomUUID();
    copy.x = Math.min(90, Math.max(0, (Number(copy.x) || 0) + 3));
    copy.y = Math.min(90, Math.max(0, (Number(copy.y) || 0) + 3));
    active().elements.push(copy);
    selected = copy.id;
    if (typeof render === 'function') render();
    showToast(`✓ ${copy.type === 'shape' ? 'Shape' : 'Element'} duplicated!`);
  };

  window.copyPresentationElement = function(item) {
    if (!item) {
      item = typeof selectedEl === 'function' ? selectedEl() : null;
    }
    if (!item) return;
    window.__presentationCopy = structuredClone(item);
    showToast(`✓ ${item.type === 'shape' ? 'Shape' : 'Element'} copied! Press Ctrl+V to paste`);
  };

  window.pastePresentationElement = function() {
    if (!window.__presentationCopy || !active() || !Array.isArray(active().elements)) return;
    const copy = structuredClone(window.__presentationCopy);
    copy.id = crypto.randomUUID();
    copy.x = Math.min(90, Math.max(0, (Number(copy.x) || 0) + 3));
    copy.y = Math.min(90, Math.max(0, (Number(copy.y) || 0) + 3));
    active().elements.push(copy);
    selected = copy.id;
    if (typeof render === 'function') render();
    showToast(`✓ ${copy.type === 'shape' ? 'Shape' : 'Element'} pasted!`);
  };

  window.addEventListener('keydown', event => {
    const isEditing = event.target && (event.target.isContentEditable || ['input','textarea','select'].includes((event.target.tagName||'').toLowerCase()));
    const item = typeof selectedEl === 'function' ? selectedEl() : null;
    const key = (event.key || '').toLowerCase();

    // Ctrl+C: Copy shape or element
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'c') {
      const sel = window.getSelection();
      const hasTextSelection = sel && sel.toString().length > 0;
      if (isEditing && hasTextSelection) {
        // Let standard text copy proceed
        return;
      }
      if (item) {
        event.preventDefault();
        window.copyPresentationElement(item);
      }
    }

    // Ctrl+V: Paste copied shape or element
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'v') {
      if (isEditing) {
        // Let standard text paste proceed
        return;
      }
      if (window.__presentationCopy) {
        event.preventDefault();
        window.pastePresentationElement();
      }
    }

    // Ctrl+D: Immediate duplicate shape or element
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'd') {
      if (item && !isEditing) {
        event.preventDefault();
        window.duplicatePresentationElement(item);
      }
    }
  }, false);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Attach direct double-click and click listeners to all elements
  // ──────────────────────────────────────────────────────────────────────────
  function bindInlineEditing() {
    const slide = $('slide');
    if (!slide) return;

    // Handle Text elements
    slide.querySelectorAll('.text-el').forEach(node => {
      const id = node.dataset.id;
      const item = active()?.elements?.find(el => el.id === id);
      if (!item) return;

      // Ensure .text-content exists
      let content = node.querySelector('.text-content');
      if (!content) {
        const currentText = item.text || node.textContent || '';
        node.textContent = '';
        content = document.createElement('span');
        content.className = 'text-content';
        content.contentEditable = 'false';
        content.spellcheck = false;
        content.textContent = currentText;
        node.appendChild(content);
      }

      // Double-click to edit text
      node.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        window.activateInlineTextEdit(item);
      };

      content.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        window.activateInlineTextEdit(item);
      };

      // When in edit mode, allow typing and cursor placement without starting drag
      content.onpointerdown = e => {
        if (content.contentEditable === 'true') {
          e.stopPropagation();
        }
      };
      content.onmousedown = e => {
        if (content.contentEditable === 'true') {
          e.stopPropagation();
        }
      };

      // Input sync
      content.oninput = e => {
        e.stopPropagation();
        item.text = (content.innerText || content.textContent || '').replace(/\r/g, '');
        if ($('textValue')) $('textValue').value = item.text;
        if (typeof fitSelectedTextBox === 'function') fitSelectedTextBox();
        if (typeof renderSlides === 'function') renderSlides();
        try {
          localStorage.setItem('presentation-studio-autosave-v1', JSON.stringify({ slides, current }));
        } catch (_) {}
      };

      // Blur to save and lock
      content.onblur = () => {
        content.contentEditable = 'false';
        const host = content.closest('.text-el');
        if (host) host.classList.remove('inline-editing');
        item.text = (content.innerText || content.textContent || '').replace(/\r/g, '');
        if ($('textValue')) $('textValue').value = item.text;
        try {
          localStorage.setItem('presentation-studio-autosave-v1', JSON.stringify({ slides, current }));
        } catch (_) {}
      };
    });

    // Handle Shape elements with text
    slide.querySelectorAll('.shape-el').forEach(node => {
      const id = node.dataset.id;
      const item = active()?.elements?.find(el => el.id === id);
      if (!item) return;

      const label = node.querySelector('.shape-label');
      if (!label) return;

      node.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        window.activateInlineShapeEdit(item);
      };

      label.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        window.activateInlineShapeEdit(item);
      };

      label.onpointerdown = e => {
        if (label.contentEditable === 'true') {
          e.stopPropagation();
        }
      };

      label.oninput = e => {
        e.stopPropagation();
        item.text = (label.innerText || label.textContent || '').replace(/\r/g, '');
        if ($('shapeText')) $('shapeText').value = item.text;
        if (typeof renderSlides === 'function') renderSlides();
        try {
          localStorage.setItem('presentation-studio-autosave-v1', JSON.stringify({ slides, current }));
        } catch (_) {}
      };

      label.onblur = () => {
        label.contentEditable = 'false';
        label.closest('.shape-el')?.classList.remove('inline-editing');
        item.text = (label.innerText || label.textContent || '').replace(/\r/g, '');
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Double-tap/Double-click capture at document level (safety net)
  // ──────────────────────────────────────────────────────────────────────────
  document.addEventListener('pointerdown', event => {
    // If target is already an active contentEditable, do nothing so typing works
    if (event.target.isContentEditable || event.target.closest?.('[contenteditable="true"]')) {
      event.stopPropagation();
      return;
    }

    const node = event.target.closest?.('#slide .element');
    if (!node) { _lastClickId = null; _lastClickTime = 0; return; }

    // Skip handles
    if (event.target.closest?.('.hard-resize,.hard-rotate,.smart-resize-handle,.smart-rotate-handle,.free-resize-handle')) {
      return;
    }

    const id = node.dataset.id;
    const now = Date.now();

    if (now - _lastClickTime < DBLCLICK_MS && _lastClickId === id) {
      // Second tap on the same element -> trigger edit mode
      _lastClickId = null;
      _lastClickTime = 0;
      event.preventDefault();
      event.stopImmediatePropagation();

      const item = active()?.elements?.find(el => el.id === id);
      if (item?.type === 'text') {
        window.activateInlineTextEdit(item);
      } else if (item?.type === 'shape') {
        window.activateInlineShapeEdit(item);
      }
      return;
    }

    _lastClickId = id;
    _lastClickTime = now;
  }, true);

  // Hook into render() to bind inline editing listeners on each render
  const _origRender = render;
  render = function() {
    _origRender();
    bindInlineEditing();
    setupZoomControls();
    // Maintain zoom transform on re-renders
    const slide = $('slide');
    if (slide && _zoomLevel !== 1.0) {
      slide.style.transform = `scale(${_zoomLevel})`;
      slide.style.transformOrigin = 'center center';
    }
  };

  // Ensure the bubble-phase drag starter used by base text/image elements never
  // moves a text box while it is being inline-edited.
  const _origStartDrag = window.startDrag;
  if (typeof _origStartDrag === 'function') {
    window.startDrag = function(e) {
      const el = e && e.currentTarget;
      if (el && el.classList && el.classList.contains('inline-editing')) return;
      return _origStartDrag(e);
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Styles & UI
  // ──────────────────────────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      /* Prevent unwanted text selection on UI frames */
      body, .workspace, .top, .left, .right, .stage-wrap, .slide, .element, #ctx-toolbar {
        -webkit-user-select: none;
        user-select: none;
      }
      .text-el.inline-editing {
        cursor: text !important;
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      .text-el.inline-editing .text-content,
      .shape-el.inline-editing .shape-label,
      .text-content[contenteditable="true"],
      .shape-label[contenteditable="true"],
      input, textarea {
        -webkit-user-select: text !important;
        user-select: text !important;
      }

      /* Floating Zoom HUD */
      #presentationZoomHud {
        position: absolute;
        right: 24px;
        bottom: 24px;
        z-index: 90;
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(14, 23, 38, 0.88);
        border: 1px solid rgba(80, 110, 160, 0.4);
        backdrop-filter: blur(8px);
        padding: 5px 8px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        font-family: inherit;
      }
      #presentationZoomHud button {
        background: #202d44;
        border: 1px solid #364868;
        color: #e2ecff;
        font-weight: 800;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      #presentationZoomHud button:hover {
        border-color: #ffb11b;
        background: #2b3e60;
        color: #fff;
      }
      #zoomPercentageBadge {
        min-width: 44px;
        text-align: center;
        font-size: 11px;
        font-weight: 800;
        color: #ffd166;
        padding: 2px 4px;
        cursor: pointer;
      }
      #zoomPercentageBadge:hover {
        text-decoration: underline;
      }

      /* Toast Notification */
      #presentation-toast {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%) translateY(30px);
        background: #172a4c;
        border: 1px solid #4f8df7;
        color: #edf5ff;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 18px;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      #presentation-toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    </style>
  `);

  bindInlineEditing();
  setupZoomControls();
})();
