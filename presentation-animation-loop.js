(() => {
  const $ = id => document.getElementById(id);
  const panel = $('animationInspector');
  if (!panel) return;
  panel.insertAdjacentHTML('beforeend', '<label id="animationLoopRow" class="field" style="display:flex;align-items:center;gap:8px"><input id="animationLoop" type="checkbox" style="width:auto;margin:0">Loop animation continuously</label><p class="hint" id="animationLoopHint">Best for Float, Spin, Pulse, Bounce, Swing, Jello, and Shake.</p>');
  const loop = $('animationLoop'), row = $('animationLoopRow');
  const emphasis = new Set(['pulse','bounce','spin','swing','float','jello','shake']);
  function sync() { const e = selectedEl(); if (!e) return; loop.checked = !!e.animationLoop; const canLoop = emphasis.has(e.animation || ''); row.classList.toggle('hidden', !e || e.animation === 'none'); loop.disabled = !canLoop; $('animationLoopHint').textContent = canLoop ? 'Loop repeats this motion until the slide changes.' : 'Loop is available for motion effects such as Float, Spin, Pulse, Bounce, Swing, Jello, and Shake.'; }
  loop.addEventListener('change', () => { const e = selectedEl(); if (!e || !emphasis.has(e.animation)) { loop.checked = false; return; } e.animationLoop = loop.checked; });
  $('elementAnimation').addEventListener('change', () => { const e = selectedEl(); if (e && !emphasis.has(e.animation)) e.animationLoop = false; setTimeout(sync, 0); });
  const before = renderInspector; renderInspector = function(){ before(); sync(); };
  renderInspector();
})();