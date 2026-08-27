(() => {
  const $ = id => document.getElementById(id);
  let action = null;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .image-move-handle,.image-rotate-handle,.image-resize-handle,
    .text-move-handle,.text-rotate-handle,.text-resize-handle,
    .shape-handle,.smart-resize-handle,.smart-rotate-handle,#shapeRotateOverlay,#shapeRotateButtons,
    .shape-resize-fix-handle,.shape-rotate-fix-handle,.free-resize-handle {
      display: none !important;
    }
    .slide { overflow: visible !important; }
    .element {
      position: absolute;
      box-sizing: border-box;
      touch-action: none;
    }
    .element.selected {
      z-index: 500 !important;
      outline: 1.5px dashed #ffb11b !important;
      outline-offset: 2px;
    }
    /* 8 cardinal resize handles */
    .hard-resize {
      position: absolute;
      z-index: 9999;
      width: 12px;
      height: 12px;
      background: #ffffff;
      border: 2px solid #1769e8;
      border-radius: 3px;
      box-shadow: 0 1px 4px #000a;
      touch-action: none;
      box-sizing: border-box;
      pointer-events: auto !important;
      cursor: pointer;
    }
    .hard-resize:hover {
      background: #ffb11b !important;
      border-color: #ffffff !important;
      transform: scale(1.3);
    }
    .hard-resize.n  { left: 50%; top: -6px; transform: translateX(-50%); cursor: ns-resize; }
    .hard-resize.s  { left: 50%; bottom: -6px; transform: translateX(-50%); cursor: ns-resize; }
    .hard-resize.e  { right: -6px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
    .hard-resize.w  { left: -6px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
    .hard-resize.nw { left: -6px; top: -6px; cursor: nwse-resize; }
    .hard-resize.ne { right: -6px; top: -6px; cursor: nesw-resize; }
    .hard-resize.sw { left: -6px; bottom: -6px; cursor: nesw-resize; }
    .hard-resize.se { right: -6px; bottom: -6px; cursor: nwse-resize; }

    /* Top Rotation Handle with visible stem */
    .hard-rotate {
      position: absolute;
      z-index: 10000;
      left: 50%;
      top: -34px;
      transform: translateX(-50%);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #1769e8;
      background: #ffffff;
      box-shadow: 0 2px 6px #0008;
      cursor: grab;
      touch-action: none;
      box-sizing: border-box;
      pointer-events: auto !important;
    }
    .hard-rotate:hover {
      background: #ffb11b !important;
      border-color: #ffffff !important;
      transform: translateX(-50%) scale(1.25);
    }
    .hard-rotate:after {
      content: '';
      position: absolute;
      left: 7px;
      top: 16px;
      height: 18px;
      border-left: 2px solid #ffb11b;
      pointer-events: none;
    }
  </style>`);

  const nodeFor = item => item && $('slide')?.querySelector('.element[data-id="' + item.id + '"]');

  function updateHandles() {
    document.querySelectorAll('.hard-resize, .hard-rotate').forEach(x => x.remove());

    const item = selectedEl();
    if (!item) return;
    const node = nodeFor(item);
    if (!node) return;

    const sides = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    sides.forEach(side => {
      const h = document.createElement('i');
      h.className = 'hard-resize ' + side;
      h.title = 'Resize ' + side.toUpperCase();
      node.appendChild(h);
    });

    const r = document.createElement('i');
    r.className = 'hard-rotate';
    r.title = 'Drag to rotate (Shift for 15° snap)';
    node.appendChild(r);
  }

  function begin(kind, event, item, side = '') {
    const stage = $('slide');
    const rect = stage.getBoundingClientRect();
    const startRot = Number(item.rotation) || 0;

    action = {
      kind,
      item,
      side,
      rect,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCenterX: item.x + item.w / 2,
      startCenterY: item.y + item.h / 2,
      start: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        rotation: startRot
      },
      dx: event.clientX - rect.left - (item.x * rect.width) / 100,
      dy: event.clientY - rect.top - (item.y * rect.height) / 100
    };

    try {
      stage.setPointerCapture?.(event.pointerId);
    } catch (_) {}
  }

  let _lastDownTime = 0, _lastDownId = null, _pendingDrag = null;

  window.addEventListener('pointerdown', event => {
    // 1. Intercept handles FIRST
    const handle = event.target.closest?.('.hard-resize, .hard-rotate');
    if (handle) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const item = selectedEl();
      if (!item) return;

      if (handle.classList.contains('hard-rotate')) {
        begin('rotate', event, item);
      } else {
        const sides = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        const side = sides.find(s => handle.classList.contains(s)) || 'se';
        begin('resize', event, item, side);
      }
      return;
    }

    // 2. Ignore toolbar clicks and input panels
    if (event.target.closest?.('#ctx-toolbar, #assetDrawer, #shapeGallery, #textToolsMenu, .top, .right, .left, input, textarea, select')) {
      return;
    }

    // 3. If currently inside active inline text editing, allow text caret / typing / selection natively
    if (event.target.isContentEditable || event.target.closest?.('[contenteditable="true"], .inline-editing')) {
      return;
    }

    // 4. Element selection
    const node = event.target.closest?.('#slide .element');
    if (!node) {
      // Clicked on background canvas: end any active inline text edit
      document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        el.contentEditable = 'false';
        el.closest('.element')?.classList.remove('inline-editing');
      });
      return;
    }

    const item = active()?.elements?.find(x => x.id === node.dataset.id);
    if (!item) return;

    // 5. Double-click detection: activate on-canvas inline text editing
    const now = Date.now();
    const isDbl = (event.detail >= 2 || (now - _lastDownTime < 380 && _lastDownId === item.id));
    _lastDownTime = now;
    _lastDownId = item.id;

    if (isDbl && (item.type === 'text' || item.type === 'shape')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      selected = item.id;
      _pendingDrag = null;
      if (item.type === 'text' && typeof window.activateInlineTextEdit === 'function') {
        window.activateInlineTextEdit(item);
      } else if (item.type === 'shape' && typeof window.activateInlineShapeEdit === 'function') {
        window.activateInlineShapeEdit(item);
      }
      return;
    }

    // 6. Select element & queue drag (Smooth & effortless dragging for Text, Shapes, and Images)
    selected = item.id;
    document.querySelectorAll('#slide .element').forEach(el => el.classList.toggle('selected', el === node));
    updateHandles();
    if (typeof renderInspector === 'function') renderInspector();

    _pendingDrag = { event, item };
  }, true);

  const DRAG_THRESHOLD = 5; // pixels

  window.addEventListener('pointermove', event => {
    // If we have a pending drag, check threshold before starting
    if (_pendingDrag && !action) {
      // NEVER start drag if the element is in inline text edit mode
      const pendingNode = $('slide')?.querySelector('.element[data-id="' + _pendingDrag.item.id + '"]');
      if (pendingNode && (pendingNode.classList.contains('inline-editing') || pendingNode.contentEditable === 'true')) {
        _pendingDrag = null;
        return;
      }
      const dx = Math.abs(event.clientX - _pendingDrag.event.clientX);
      const dy = Math.abs(event.clientY - _pendingDrag.event.clientY);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        // Threshold crossed — start the drag now
        begin('move', _pendingDrag.event, _pendingDrag.item);
        _pendingDrag = null;
      } else {
        return;
      }
    }

    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const { kind, item, side, rect, start, startClientX, startClientY, startCenterX, startCenterY, dx, dy } = action;

    if (kind === 'move') {
      item.x = ((event.clientX - rect.left - dx) / rect.width) * 100;
      item.y = ((event.clientY - rect.top - dy) / rect.height) * 100;
    }
    else if (kind === 'rotate') {
      const cx = rect.left + (startCenterX * rect.width) / 100;
      const cy = rect.top + (startCenterY * rect.height) / 100;
      const currentAngle = Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI;
      let rawAngle = currentAngle + 90;
      let angle = Math.round((rawAngle + 3600) % 360);

      // Smart Snapping
      if (event.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      } else {
        const snapPoints = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        for (const snap of snapPoints) {
          if (Math.abs(angle - snap) <= 4) {
            angle = snap % 360;
            break;
          }
        }
      }
      item.rotation = angle;
    }
    else if (kind === 'resize') {
      // Screen vector in pixels
      const screenDx = event.clientX - startClientX;
      const screenDy = event.clientY - startClientY;

      // Project into local rotated space
      const rotRad = -(start.rotation * Math.PI) / 180;
      const localDx = screenDx * Math.cos(rotRad) - screenDy * Math.sin(rotRad);
      const localDy = screenDx * Math.sin(rotRad) + screenDy * Math.cos(rotRad);

      // Convert to percentage
      const deltaW = (localDx / rect.width) * 100;
      const deltaH = (localDy / rect.height) * 100;

      let newW = start.w;
      let newH = start.h;
      let shiftX = 0;
      let shiftY = 0;

      // Horizontal resize
      if (side.includes('e')) {
        newW = Math.max(2, start.w + deltaW);
        shiftX = (newW - start.w) / 2;
      } else if (side.includes('w')) {
        newW = Math.max(2, start.w - deltaW);
        shiftX = -(newW - start.w) / 2;
      }

      // Vertical resize
      if (side.includes('s')) {
        newH = Math.max(2, start.h + deltaH);
        shiftY = (newH - start.h) / 2;
      } else if (side.includes('n')) {
        newH = Math.max(2, start.h - deltaH);
        shiftY = -(newH - start.h) / 2;
      }

      // Rotate local shift back to screen coordinates
      const forwardRad = (start.rotation * Math.PI) / 180;
      const slideShiftX = shiftX * Math.cos(forwardRad) - shiftY * Math.sin(forwardRad);
      const slideShiftY = shiftX * Math.sin(forwardRad) + shiftY * Math.cos(forwardRad);

      item.w = newW;
      item.h = newH;
      item.x = startCenterX + slideShiftX - newW / 2;
      item.y = startCenterY + slideShiftY - newH / 2;
    }

    const node = nodeFor(item);
    if (node) {
      node.style.left = item.x + '%';
      node.style.top = item.y + '%';
      node.style.width = item.w + '%';
      node.style.height = item.h + '%';
      node.style.transform = 'rotate(' + (Number(item.rotation) || 0) + 'deg)';
    }
  }, true);

  window.addEventListener('pointerup', event => {
    _pendingDrag = null; // Cancel any pending drag that didn't start
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try {
      $('slide')?.releasePointerCapture?.(event.pointerId);
    } catch (_) {}
    action = null;
    render();
  }, true);

  const priorInspector = renderInspector;
  renderInspector = function() {
    priorInspector();
    setTimeout(updateHandles, 0);
  };

  const priorRender = render;
  render = function() {
    priorRender();
    active()?.elements?.forEach(item => {
      const node = nodeFor(item);
      if (node) {
        node.style.transform = 'rotate(' + (Number(item.rotation) || 0) + 'deg)';
        node.style.transformOrigin = 'center center';
      }
    });
    updateHandles();
  };

  render();
})();
