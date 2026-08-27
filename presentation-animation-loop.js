(() => {
  const $ = id => document.getElementById(id);
  const panel = $('animationInspector');
  if (!panel) return;

  let loopRow = $('animationLoopRow');
  if (!loopRow) {
    panel.insertAdjacentHTML('beforeend', '<label id="animationLoopRow" class="field" style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer"><input id="animationLoop" type="checkbox" style="width:16px;height:16px;margin:0;cursor:pointer"><strong style="color:#ffd166">Loop animation continuously</strong></label><p class="hint" id="animationLoopHint">Repeats this motion continuously without stopping.</p>');
    loopRow = $('animationLoopRow');
  }

  const loop = $('animationLoop');

  function sync() {
    const e = typeof selectedEl === 'function' ? selectedEl() : null;
    if (!e) {
      if (loopRow) loopRow.classList.add('hidden');
      return;
    }
    const hasAnim = e.animation && e.animation !== 'none';
    if (loopRow) loopRow.classList.toggle('hidden', !hasAnim);
    if (loop) {
      loop.disabled = !hasAnim;
      loop.checked = !!e.animationLoop;
    }
    const hint = $('animationLoopHint');
    if (hint) {
      hint.textContent = hasAnim ? 'Repeats this motion continuously without stopping.' : 'Select an animation first to enable continuous looping.';
    }
  }

  if (loop) {
    loop.onchange = () => {
      const e = typeof selectedEl === 'function' ? selectedEl() : null;
      if (!e) return;
      e.animationLoop = loop.checked;
      if (typeof window.previewLiveAnimation === 'function' && e.animation && e.animation !== 'none') {
        window.previewLiveAnimation(e);
      }
      window.dispatchEvent(new CustomEvent('presentation:change'));
    };
  }

  const animSelect = $('elementAnimation');
  if (animSelect) {
    animSelect.addEventListener('change', () => {
      setTimeout(sync, 0);
    });
  }

  const before = renderInspector;
  renderInspector = function() {
    if (typeof before === 'function') before();
    sync();
  };

  sync();
})();
