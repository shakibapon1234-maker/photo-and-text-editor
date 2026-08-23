(() => {
  const $ = id => document.getElementById(id);
  const panel = $('shapeInspector');
  if (!panel || $('shapeRotationControl')) return;
  panel.insertAdjacentHTML('beforeend', '<label id="shapeRotationControl" class="field hidden">Rotate shape <span id="shapeRotationValue">0°</span><input id="shapeRotationRange" type="range" min="0" max="360" value="0"></label>');
  const range = $('shapeRotationRange'), value = $('shapeRotationValue');
  function sync() {
    const item = selectedEl(), visible = !!item && item.type === 'shape';
    $('shapeRotationControl').classList.toggle('hidden', !visible);
    if (!visible) return;
    const angle = Number(item.rotation) || 0;
    range.value = angle; value.textContent = angle + '°';
  }
  const previousInspector = renderInspector;
  renderInspector = function () { previousInspector(); sync(); };
  range.addEventListener('input', () => {
    const item = selectedEl(); if (!item || item.type !== 'shape') return;
    item.rotation = Number(range.value) || 0; value.textContent = item.rotation + '°';
    const node = $('slide').querySelector('.element[data-id="' + item.id + '"]');
    if (node) { node.style.transform = 'rotate(' + item.rotation + 'deg)'; node.style.transformOrigin = 'center center'; }
  });
  range.addEventListener('change', () => { if (selectedEl()?.type === 'shape') render(); });
  sync();
})();