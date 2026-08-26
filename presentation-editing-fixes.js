(() => {
  const $ = id => document.getElementById(id);

  let _lastClickId = null;
  let _lastClickTime = 0;
  const DBLCLICK_MS = 350;

  // ──────────────────────────────────────────────────────────────────────────
  // Activate Inline Text Editing
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
  // Attach direct double-click and click listeners to all elements
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

  // Visual cue + allow text selection across the whole editable box.
  document.head.insertAdjacentHTML('beforeend', '<style>.text-el.inline-editing{cursor:text;user-select:text}.text-el.inline-editing .text-content{user-select:text}</style>');

  bindInlineEditing();
})();
