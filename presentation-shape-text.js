// presentation-shape-text.js - Clean inspector sync without blocking transform controls or double-clicks
(() => {
  const $ = id => document.getElementById(id);

  const inspectorBeforeShapeText = renderInspector;
  renderInspector = function () {
    inspectorBeforeShapeText();
    const e = selectedEl(), ok = e && e.type === 'shape';
    if (!ok) return;
    if ($('shapeText')) $('shapeText').value = e.text || '';
    if ($('shapeTextColor')) $('shapeTextColor').value = e.textColor || '#ffffff';
    if ($('shapeTextSize')) $('shapeTextSize').value = e.textSize || 18;
  };

  function updateShapeDom(e, fn) {
    const node = $('slide')?.querySelector('.shape-el[data-id="' + e.id + '"]');
    if (!node) return;
    let label = node.querySelector('.shape-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'shape-label';
      label.contentEditable = 'false';
      node.appendChild(label);
    }
    fn(label);
  }

  $('shapeText')?.addEventListener('input', () => {
    const e = selectedEl();
    if (!e || e.type !== 'shape') return;
    e.text = $('shapeText').value;
    updateShapeDom(e, l => {
      if (!l.isContentEditable) l.textContent = e.text;
    });
    if (typeof window.renderSlideThumbnailsMaster === 'function') window.renderSlideThumbnailsMaster();
    window.dispatchEvent(new CustomEvent('presentation:change'));
  });

  $('shapeTextColor')?.addEventListener('input', () => {
    const e = selectedEl();
    if (!e || e.type !== 'shape') return;
    e.textColor = $('shapeTextColor').value;
    updateShapeDom(e, l => { l.style.color = e.textColor; });
    window.dispatchEvent(new CustomEvent('presentation:change'));
  });

  $('shapeTextSize')?.addEventListener('input', () => {
    const e = selectedEl();
    if (!e || e.type !== 'shape') return;
    e.textSize = Math.max(8, Math.min(120, +$('shapeTextSize').value || 18));
    updateShapeDom(e, l => { l.style.fontSize = e.textSize + 'px'; });
    window.dispatchEvent(new CustomEvent('presentation:change'));
  });
})();
