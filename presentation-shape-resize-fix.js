(() => {
  const slide = document.getElementById('slide');
  let action = null;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .shape-handle { display: none !important; }
    .shape-resize-fix-handle { position: absolute; z-index: 1001; width: 14px; height: 14px; background: #fff; border: 2px solid #1769e8; border-radius: 2px; box-shadow: 0 1px 4px #0008; transform: translate(-50%, -50%); cursor: nwse-resize; touch-action: none; }
    .shape-rotate-fix-handle { position: absolute; z-index: 1001; width: 14px; height: 14px; background: #fff; border: 2px solid #1769e8; border-radius: 50%; box-shadow: 0 1px 4px #0008; transform: translate(-50%, -50%); cursor: grab; touch-action: none; }
  </style>`);

  function addControls() {
    slide.querySelectorAll('.shape-resize-fix-handle,.shape-rotate-fix-handle').forEach(handle => handle.remove());
    const item = selectedEl();
    if (!item || item.type !== 'shape') return;
    [['shape-resize-fix-handle', item.x + item.w, item.y + item.h, 'resize'], ['shape-rotate-fix-handle', item.x + item.w / 2, item.y - 6, 'rotate']].forEach(([className, left, top, mode]) => {
      const handle = document.createElement('i');
      handle.className = className;
      handle.style.left = `${left}%`;
      handle.style.top = `${top}%`;
      handle.title = mode === 'resize' ? 'Drag to resize' : 'Drag to rotate';
      handle.addEventListener('pointerdown', event => begin(mode, event), true);
      slide.append(handle);
    });
  }

  function begin(mode, event) {
    const item = selectedEl();
    if (!item) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = slide.getBoundingClientRect();
    action = { mode, item, rect, start: { x: item.x, y: item.y, w: item.w, h: item.h } };
  }

  window.addEventListener('pointermove', event => {
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const { item, rect, mode, start } = action;
    const px = (event.clientX - rect.left) / rect.width * 100;
    const py = (event.clientY - rect.top) / rect.height * 100;
    if (mode === 'resize') {
      item.w = Math.max(4, Math.min(100 - item.x, px - item.x));
      item.h = Math.max(4, Math.min(100 - item.y, py - item.y));
    } else {
      const centerX = rect.left + (start.x + start.w / 2) * rect.width / 100;
      const centerY = rect.top + (start.y + start.h / 2) * rect.height / 100;
      item.rotation = Math.round((Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90 + 360) % 360);
    }
    render();
  }, true);

  window.addEventListener('pointerup', event => {
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    slide.releasePointerCapture?.(event.pointerId);
    action = null;
    render();
  }, true);

  const previousRender = render;
  render = function () {
    previousRender();
    addControls();
  };
  render();
})();
