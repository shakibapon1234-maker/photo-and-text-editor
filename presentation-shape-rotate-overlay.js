(() => {
  const $ = id => document.getElementById(id);
  let rotating = null;
  document.head.insertAdjacentHTML('beforeend', '<style>.shape-el .hard-rotate{display:none!important}#shapeRotateOverlay{position:absolute;z-index:1200;display:none;width:22px;height:22px;margin-left:-11px;margin-top:-48px;border:2px solid #1769e8;border-radius:50%;background:#fff;box-shadow:0 1px 5px #0009;cursor:grab;touch-action:none}#shapeRotateOverlay:after{content:"";position:absolute;left:9px;top:19px;height:18px;border-left:2px solid #ffb11b}#shapeRotateButtons{position:absolute;z-index:1201;display:none;gap:4px}#shapeRotateButtons button{width:28px;height:24px;padding:0;border-color:#1769e8;background:#fff;color:#1769e8;font:700 16px Arial;line-height:20px}</style>');
  const handle = document.createElement('i'); handle.id = 'shapeRotateOverlay'; handle.title = 'Drag to rotate';
  const buttons = document.createElement('div'); buttons.id = 'shapeRotateButtons'; buttons.innerHTML = '<button type="button" data-turn="-15" title="Rotate left">↺</button><button type="button" data-turn="15" title="Rotate right">↻</button>';
  $('slide').append(handle, buttons);
  function selectedShape() { const item = selectedEl(); return item && item.type === 'shape' ? item : null; }
  function place() {
    const item = selectedShape();
    if (!item) { handle.style.display = 'none'; buttons.style.display = 'none'; return; }
    handle.style.display = 'block'; handle.style.left = (item.x + item.w / 2) + '%'; handle.style.top = item.y + '%'; handle.style.transform = 'rotate(' + (Number(item.rotation) || 0) + 'deg)';
    buttons.style.display = 'flex'; buttons.style.left = (item.x + item.w / 2 + 2) + '%'; buttons.style.top = 'calc(' + item.y + '% - 60px)';
  }
  function apply(item) {
    const node = $('slide').querySelector('.element[data-id="' + item.id + '"]');
    if (node) { node.style.transform = 'rotate(' + item.rotation + 'deg)'; node.style.transformOrigin = 'center center'; }
    place();
  }
  window.addEventListener('pointerdown', event => {
    const turnButton = event.target.closest?.('#shapeRotateButtons button');
    const rotateHandle = event.target.closest?.('#shapeRotateOverlay');
    if (!turnButton && !rotateHandle) return;
    const item = selectedShape(); if (!item) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (turnButton) {
      item.rotation = ((Number(item.rotation) || 0) + Number(turnButton.dataset.turn) + 360) % 360;
      apply(item); render(); return;
    }
    rotating = { item, rect:$('slide').getBoundingClientRect() };
    handle.setPointerCapture?.(event.pointerId);
  }, true);
  buttons.addEventListener('click', event => {
    const turn = Number(event.target?.dataset?.turn); const item = selectedShape();
    if (!item || !turn) return;
    event.preventDefault(); event.stopImmediatePropagation();
    item.rotation = ((Number(item.rotation) || 0) + turn + 360) % 360; apply(item); render();
  }, true);
  handle.addEventListener('pointerdown', event => {
    const item = selectedShape(); if (!item) return;
    event.preventDefault(); event.stopImmediatePropagation(); rotating = { item, rect:$('slide').getBoundingClientRect() }; handle.setPointerCapture?.(event.pointerId);
  }, true);
  window.addEventListener('pointermove', event => {
    if (!rotating) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const {item, rect} = rotating, cx = rect.left + (item.x + item.w / 2) * rect.width / 100, cy = rect.top + (item.y + item.h / 2) * rect.height / 100;
    item.rotation = Math.round((Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI + 90 + 360) % 360); apply(item);
  }, true);
  window.addEventListener('pointerup', event => { if (!rotating) return; event.preventDefault(); event.stopImmediatePropagation(); handle.releasePointerCapture?.(event.pointerId); rotating = null; render(); }, true);
  const previousRender = render;
  render = function () { previousRender(); if (!handle.isConnected) $('slide').append(handle, buttons); place(); };
  place();
})();