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
      outline: 1.5px dashed #ffb11b !important;
      outline-offset: 2px;
    }
    .element.is-active-drag {
      z-index: 500 !important;
    }
    .element.inline-editing, .element.inline-editing * {
      touch-action: auto !important;
      user-select: text !important;
      -webkit-user-select: text !important;
      cursor: text !important;
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
    window.__presentationLiveDrag = true;
    $('slide')?.classList.add('is-dragging');
    // Elevate only the actively-dragged element to float above others
    const dragNode = nodeFor(item);
    if (dragNode) dragNode.classList.add('is-active-drag');

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

  let _pendingDrag = null;

  window.addEventListener('pointerdown', event => {
    // Cells use the table editor below, but the generic corner/edge handles
    // remain available for resizing the complete table object.
    if (event.target.closest?.('#textValue, #shapeText, .table-el') && !event.target.closest?.('.hard-resize, .hard-rotate')) return;
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

  // 4. Element selection — prioritize element directly under pointer
    let node = event.target.closest?.('#slide .element');
    if (!node) {
      const allUnder = document.elementsFromPoint(event.clientX, event.clientY);
      const nodesUnder = allUnder
        .map(el => el.closest?.('#slide .element'))
        .filter((el, idx, arr) => el && arr.indexOf(el) === idx);
      if (!nodesUnder.length) {
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
          el.contentEditable = 'false';
          el.closest('.element')?.classList.remove('inline-editing');
        });
        return;
      }
      node = nodesUnder[0];
    }

    const item = active()?.elements?.find(x => x.id === node.dataset.id);
    if (!item) return;

    // 6. Select element & queue drag (Smooth & effortless dragging for Text, Shapes, and Images)
    selected = item.id;
    document.querySelectorAll('#slide .element').forEach(el => {
      el.classList.toggle('selected', el === node);
      el.classList.remove('is-active-drag');
    });
    updateHandles();
    if (typeof renderInspector === 'function') renderInspector();

    _pendingDrag = { event, item, wasAlreadySelected: (selected === item.id) };
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
    const pending = _pendingDrag;
    _pendingDrag = null; // Cancel any pending drag that didn't start
    if (typeof window.drag !== 'undefined') window.drag = null;
    window.__presentationLiveDrag = false;
    $('slide')?.classList.remove('is-dragging');
    // Remove active drag elevation from all elements
    document.querySelectorAll('#slide .element.is-active-drag').forEach(el => el.classList.remove('is-active-drag'));

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

  window.addEventListener('pointercancel', event => {
    _pendingDrag = null;
    if (typeof window.drag !== 'undefined') window.drag = null;
    window.__presentationLiveDrag = false;
    $('slide')?.classList.remove('is-dragging');
    document.querySelectorAll('#slide .element.is-active-drag').forEach(el => el.classList.remove('is-active-drag'));
    if (!action) return;
    action = null;
    render();
  }, true);

  window.__cancelTransformAction = function() {
    const wasBusy = !!(action || _pendingDrag || (typeof window.drag !== 'undefined' && window.drag));
    action = null;
    _pendingDrag = null;
    if (typeof window.drag !== 'undefined') window.drag = null;
    window.__presentationLiveDrag = false;
    $('slide')?.classList.remove('is-dragging');
    return wasBusy;
  };

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (window.__cancelTransformAction()) {
        render();
      }
    }
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

// ── Table-specific interaction ───────────────────────────────────────────
// A cell is an editor, while the small handle moves the table. Keeping those
// gestures separate prevents the generic canvas drag system from fighting the
// browser's contenteditable implementation.
(() => {
  const $ = id => document.getElementById(id);
  let moving = null, saveTimer = 0;
  document.head.insertAdjacentHTML('beforeend', `<style>
    .table-el { overflow:visible !important; padding-top:22px; }
    .table-el table { height:calc(100% - 22px) !important; background:#fff; }
    .table-move-handle { position:absolute;left:50%;top:0;transform:translate(-50%,-50%);z-index:40;display:none;align-items:center;gap:5px;padding:3px 9px;border:1px solid #fbbf24;border-radius:6px;background:#17233c;color:#fff;font:700 10px Arial,sans-serif;cursor:grab;white-space:nowrap;touch-action:none; }
    .table-el.selected .table-move-handle { display:flex; }
    .table-el td[contenteditable="true"] { outline:2px solid #f59e0b;outline-offset:-2px;cursor:text;user-select:text; }
    .table-grid-resizer { position:absolute; z-index:45; background:transparent; touch-action:none; }
    .table-grid-resizer.col { top:22px; bottom:0; width:10px; margin-left:-5px; cursor:col-resize; }
    .table-grid-resizer.row { left:0; right:0; height:10px; margin-top:-5px; cursor:row-resize; }
    .table-grid-resizer:hover { background:rgba(251,191,36,.38); }
  </style>`);
  const itemFor = node => active()?.elements?.find(item => item.id === node?.dataset?.id);
  const saveLater = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => window.presentationSaveNow?.(), 450); };
  function selectTable(node, item) {
    selected = item.id;
    document.querySelectorAll('#slide .element').forEach(el => el.classList.toggle('selected', el === node));
    renderInspector?.();
  }
  function enhanceTables() {
    document.querySelectorAll('#slide .table-el').forEach(node => {
      if (!node.querySelector('.table-move-handle')) {
        const handle = document.createElement('button');
        handle.type = 'button'; handle.className = 'table-move-handle';
        handle.textContent = '⠿ Move table'; handle.title = 'Drag to move the whole table';
        node.prepend(handle);
      }
      node.querySelectorAll('td').forEach(cell => { cell.contentEditable = 'false'; cell.title = 'Double-click to edit'; });
      const item = itemFor(node);
      const widths = item?.colWidths || Array(Math.max(1, item?.cols || 1)).fill(100 / Math.max(1, item?.cols || 1));
      const heights = item?.rowHeights || Array(Math.max(1, item?.rows || 1)).fill(100 / Math.max(1, item?.rows || 1));
      node.querySelectorAll('tr').forEach((row, rowIndex) => {
        row.style.height = (Number(heights[rowIndex]) || 0) + '%';
        row.querySelectorAll('td').forEach((cell, colIndex) => { cell.style.width = (Number(widths[colIndex]) || 0) + '%'; });
      });
      addGridResizers(node);
    });
  }
  function addGridResizers(node) {
    node.querySelectorAll('.table-grid-resizer').forEach(handle => handle.remove());
    const item = itemFor(node); if (!item) return;
    const cols = Math.max(1, Number(item.cols) || 1), rows = Math.max(1, Number(item.rows) || 1);
    const colWidths = item.colWidths || Array(cols).fill(100 / cols);
    const rowHeights = item.rowHeights || Array(rows).fill(100 / rows);
    let at = 0;
    colWidths.slice(0, -1).forEach((width, index) => { at += Number(width) || 0; const handle=document.createElement('i'); handle.className='table-grid-resizer col'; handle.style.left=at+'%'; handle.dataset.axis='col'; handle.dataset.index=index; node.append(handle); });
    at = 0;
    rowHeights.slice(0, -1).forEach((height, index) => { at += Number(height) || 0; const handle=document.createElement('i'); handle.className='table-grid-resizer row'; handle.style.top='calc(22px + '+at+'% - '+(at * 22 / 100)+'px)'; handle.dataset.axis='row'; handle.dataset.index=index; node.append(handle); });
  }
  window.addEventListener('pointerdown', event => {
    const gridHandle = event.target.closest?.('.table-grid-resizer');
    const handle = event.target.closest?.('.table-move-handle');
    const cell = event.target.closest?.('#slide .table-el td');
    if (!gridHandle && !handle && !cell) return;
    const node = event.target.closest('.table-el'), item = itemFor(node);
    if (!item) return;
    event.preventDefault(); event.stopImmediatePropagation(); selectTable(node, item);
    if (cell) return;
    const rect = $('slide').getBoundingClientRect();
    if (gridHandle) {
      const axis=gridHandle.dataset.axis, index=Number(gridHandle.dataset.index), sizes=(axis==='col'?(item.colWidths||Array(item.cols).fill(100/item.cols)):(item.rowHeights||Array(item.rows).fill(100/item.rows))).map(Number);
      moving={kind:'grid',item,rect,axis,index,sizes,start:event[axis==='col'?'clientX':'clientY']};
    } else moving = { kind:'move', item, rect, dx:event.clientX-rect.left-item.x*rect.width/100, dy:event.clientY-rect.top-item.y*rect.height/100 };
  }, true);
  window.addEventListener('dblclick', event => {
    const cell = event.target.closest?.('#slide .table-el td'); if (!cell) return;
    event.preventDefault(); event.stopImmediatePropagation(); cell.contentEditable = 'true'; cell.focus();
    const range = document.createRange(); range.selectNodeContents(cell);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }, true);
  window.addEventListener('input', event => {
    const cell = event.target.closest?.('#slide .table-el td'); if (!cell) return;
    const item = itemFor(cell.closest('.table-el')), row = cell.parentElement?.rowIndex, col = cell.cellIndex;
    if (!item || row < 0 || col < 0) return;
    item.data[row][col] = cell.textContent; saveLater();
  }, true);
  window.addEventListener('focusout', event => {
    const cell = event.target.closest?.('#slide .table-el td[contenteditable="true"]');
    if (cell) { cell.contentEditable = 'false'; saveLater(); }
  }, true);
  window.addEventListener('pointermove', event => {
    if (!moving) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const { item, rect, dx, dy } = moving;
    if (moving.kind === 'grid') {
      const pixelSize=moving.axis==='col'?rect.width*item.w/100:rect.height*item.h/100;
      const current=event[moving.axis==='col'?'clientX':'clientY']; const change=(current-moving.start)/pixelSize*100;
      const sizes=[...moving.sizes], left=moving.index, right=left+1, min=6;
      const actual=Math.max(min-sizes[left],Math.min(sizes[right]-min,change)); sizes[left]+=actual;sizes[right]-=actual;
      if(moving.axis==='col') item.colWidths=sizes; else item.rowHeights=sizes;
      enhanceTables(); return;
    }
    item.x = Math.max(-item.w+3, Math.min(97, (event.clientX-rect.left-dx)/rect.width*100));
    item.y = Math.max(-item.h+3, Math.min(97, (event.clientY-rect.top-dy)/rect.height*100));
    const node = $('slide')?.querySelector('.table-el[data-id="'+item.id+'"]');
    if (node) { node.style.left = item.x+'%'; node.style.top = item.y+'%'; }
  }, true);
  window.addEventListener('pointerup', event => {
    if (!moving) return;
    event.preventDefault(); event.stopImmediatePropagation(); moving = null; render();
  }, true);
  const priorRender = render;
  render = function() { priorRender(); enhanceTables(); };
  enhanceTables();
})();
