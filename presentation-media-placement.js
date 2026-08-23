(() => {
  const $ = id => document.getElementById(id);
  let edit = null;
  document.head.insertAdjacentHTML('beforeend', `<style>
    #mediaPlacement{margin-top:10px;padding-top:10px;border-top:1px solid #35445f}.media-placement-hint{margin:7px 0 0;font-size:11px;line-height:1.4;color:#98a8c4}
    /* Keep inserted slide objects above an editable background. */
    #animatedBackgroundLayer.media-unlocked{inset:auto!important;z-index:0!important;overflow:visible!important;pointer-events:auto!important;border:2px solid #ffb11b;box-shadow:0 0 0 1px #0008}
    .slide>.element{z-index:3!important}
    #animatedBackgroundLayer.media-unlocked img,#animatedBackgroundLayer.media-unlocked video{pointer-events:none!important}
    .media-place-handle{position:absolute;z-index:4;width:13px;height:13px;background:#fff;border:2px solid #1769e8;border-radius:2px;box-shadow:0 1px 4px #0009;touch-action:none}
    .media-place-handle.n,.media-place-handle.s{left:50%;transform:translateX(-50%);cursor:ns-resize}.media-place-handle.e,.media-place-handle.w{top:50%;transform:translateY(-50%);cursor:ew-resize}
    .media-place-handle.n{top:-8px}.media-place-handle.s{bottom:-8px}.media-place-handle.e{right:-8px}.media-place-handle.w{left:-8px}.media-place-handle.nw{left:-8px;top:-8px;cursor:nwse-resize}.media-place-handle.ne{right:-8px;top:-8px;cursor:nesw-resize}.media-place-handle.sw{left:-8px;bottom:-8px;cursor:nesw-resize}.media-place-handle.se{right:-8px;bottom:-8px;cursor:nwse-resize}
  </style>`);
  const card = document.createElement('div');
  card.id = 'mediaPlacement'; card.className = 'hidden';
  card.innerHTML = '<div class="section-title">BACKGROUND POSITION</div><button id="unlockMediaPlacement" type="button">Edit background position</button><button id="resetMediaPlacement" type="button" style="margin-left:6px">Reset</button><p class="media-placement-hint">This controls the background only. To move a logo or photo added with Insert, click that object and drag it directly — no unlock is needed.</p>';
  $('backgroundUpload').append(card);
  const state = () => active();
  function normalise(s) { s.bgMediaX = Number.isFinite(s.bgMediaX) ? s.bgMediaX : 0; s.bgMediaY = Number.isFinite(s.bgMediaY) ? s.bgMediaY : 0; s.bgMediaW = Number.isFinite(s.bgMediaW) ? s.bgMediaW : 100; s.bgMediaH = Number.isFinite(s.bgMediaH) ? s.bgMediaH : 100; }
  function layer() { return $('animatedBackgroundLayer'); }
  function apply() {
    const s = state(), l = layer(); if (!s || !s.bgMedia || !l) return;
    normalise(s); const unlocked = !!s.bgMediaUnlocked;
    l.classList.toggle('media-unlocked', unlocked);
    l.style.left = unlocked ? s.bgMediaX + '%' : ''; l.style.top = unlocked ? s.bgMediaY + '%' : '';
    l.style.width = unlocked ? s.bgMediaW + '%' : ''; l.style.height = unlocked ? s.bgMediaH + '%' : '';
    l.querySelectorAll('.media-place-handle').forEach(n => n.remove());
    if (unlocked) addHandles(l);
    card.classList.toggle('hidden', !s.bgMedia); $('unlockMediaPlacement').textContent = unlocked ? 'Lock as background' : 'Unlock placement';
  }
  function addHandles(l) {
    ['n','e','s','w','nw','ne','sw','se'].forEach(side => { const h = document.createElement('i'); h.className = 'media-place-handle ' + side; h.title = 'Drag to resize'; h.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); const r = $('slide').getBoundingClientRect(), s = state(); normalise(s); edit = { kind:'resize', side, r, s, start:{x:s.bgMediaX,y:s.bgMediaY,w:s.bgMediaW,h:s.bgMediaH} }; h.setPointerCapture(ev.pointerId); }, true); l.append(h); });
  }
  function startMove(ev) { const l = layer(), s = state(); if (!l || !s.bgMediaUnlocked || ev.target.closest('.media-place-handle')) return; ev.preventDefault(); ev.stopPropagation(); const r = $('slide').getBoundingClientRect(); normalise(s); edit = { kind:'move', r, s, dx: ev.clientX-r.left-s.bgMediaX*r.width/100, dy: ev.clientY-r.top-s.bgMediaY*r.height/100 }; l.setPointerCapture(ev.pointerId); }
  $('slide').addEventListener('pointerdown', ev => { if (ev.target.closest('#animatedBackgroundLayer')) startMove(ev); }, true);
  window.addEventListener('pointermove', ev => { if (!edit) return; ev.preventDefault(); ev.stopImmediatePropagation(); const {s,r} = edit, px = (ev.clientX-r.left)/r.width*100, py=(ev.clientY-r.top)/r.height*100; if(edit.kind==='move'){s.bgMediaX=Math.max(-s.bgMediaW+4,Math.min(96,px-edit.dx/r.width*100));s.bgMediaY=Math.max(-s.bgMediaH+4,Math.min(96,py-edit.dy/r.height*100));}else{let {x,y,w,h}=edit.start,side=edit.side;if(side.includes('e'))w=Math.max(4,px-x);if(side.includes('s'))h=Math.max(4,py-y);if(side.includes('w')){x=Math.min(edit.start.x+edit.start.w-4,px);w=edit.start.x+edit.start.w-x}if(side.includes('n')){y=Math.min(edit.start.y+edit.start.h-4,py);h=edit.start.y+edit.start.h-y}s.bgMediaX=x;s.bgMediaY=y;s.bgMediaW=w;s.bgMediaH=h;} apply(); }, true);
  window.addEventListener('pointerup', () => { if (edit) { edit=null; render(); } }, true);
  $('unlockMediaPlacement').onclick = () => { const s=state(); s.bgMediaUnlocked=!s.bgMediaUnlocked; normalise(s); render(); };
  $('resetMediaPlacement').onclick = () => { const s=state(); Object.assign(s,{bgMediaX:0,bgMediaY:0,bgMediaW:100,bgMediaH:100,bgMediaUnlocked:false}); render(); };
  const before = render; render = function(){ before(); setTimeout(apply,0); };
  render();
})();