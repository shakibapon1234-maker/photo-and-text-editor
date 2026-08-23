(() => {
  const $ = id => document.getElementById(id);
  let moving = null, rotating = null, smartResizing = null;

  document.head.insertAdjacentHTML('beforeend', `<style>
    /* Direct manipulation: no labelled Move/Resize buttons on the canvas. */
    .image-move-handle,.image-rotate-handle,.image-resize-handle,.text-move-handle,.text-rotate-handle,.free-resize-handle{display:none!important}
    .slide{overflow:visible}
    .element{touch-action:none}.element.selected{outline:2px solid #ffb11b;outline-offset:3px}
    .smart-rotate-handle{position:absolute;left:50%;top:-30px;transform:translateX(-50%);width:16px;height:16px;border-radius:50%;border:2px solid #1769e8;background:#fff;box-shadow:0 1px 4px #0009;cursor:grab;z-index:20;touch-action:none}
    .smart-rotate-handle:after{content:'';position:absolute;left:5px;top:14px;height:13px;border-left:2px solid #ffb11b}
  </style>`);

  function nodeFor(item) { return item && $('slide').querySelector('.element[data-id="' + item.id + '"]'); }
  // Imported logos often contain a large transparent canvas. Tighten the
  // editing box to visible pixels so drag, resize and rotate affect the logo.
  function trimTransparentPadding(item) {
    if (!item || item.type !== 'image' || item._transparentTrimTried || !String(item.src || '').startsWith('data:image/')) return;
    item._transparentTrimTried = true;
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', {willReadFrequently:true}); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let left=canvas.width, top=canvas.height, right=-1, bottom=-1;
        for (let y=0; y<canvas.height; y++) for (let x=0; x<canvas.width; x++) if (pixels[(y*canvas.width+x)*4+3] > 12) { left=Math.min(left,x); right=Math.max(right,x); top=Math.min(top,y); bottom=Math.max(bottom,y); }
        if (right < left) return;
        const width=right-left+1, height=bottom-top+1;
        if (width > canvas.width-4 && height > canvas.height-4) return;
        // Preserve the visible logo's current location/size but remove the invisible frame.
        item.x += item.w * left / canvas.width; item.y += item.h * top / canvas.height;
        item.w *= width / canvas.width; item.h *= height / canvas.height;
        const cropped=document.createElement('canvas'); cropped.width=width; cropped.height=height;
        cropped.getContext('2d').drawImage(image,left,top,width,height,0,0,width,height);
        item.src=cropped.toDataURL('image/png'); render();
      } catch (_) { /* a non-readable source simply keeps its original bounds */ }
    };
    image.src = item.src;
  }
  function selectNode(item) {
    trimTransparentPadding(item);
    selected = item.id;
    document.querySelectorAll('#slide .element').forEach(node => node.classList.toggle('selected', node.dataset.id === item.id));
    renderInspector(); renderSlides(); addSmartResizeHandles(); addRotateHandle();
  }
  function addRotateHandle() {
    const item = selectedEl(), node = nodeFor(item);
    if (!item || !node || !['image','text'].includes(item.type)) return;
    node.querySelector('.smart-rotate-handle')?.remove();
    const handle = document.createElement('i'); handle.className = 'smart-rotate-handle'; handle.title = 'Drag to rotate';
    handle.addEventListener('pointerdown', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const rect = $('slide').getBoundingClientRect();
      rotating = { item, rect, pointerId:event.pointerId };
      handle.setPointerCapture?.(event.pointerId);
    }, true);
    node.append(handle);
  }

  // Capture at window level before legacy object listeners can cancel dragging.
  window.addEventListener('pointerdown', event => {
    const node = event.target.closest?.('#slide .element');
    if (!node || event.target.closest('.free-resize-handle,.smart-resize-handle,.smart-rotate-handle')) return;
    const item = active().elements.find(el => el.id === node.dataset.id);
    if (!item) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const canvas = $('slide'); canvas.setPointerCapture?.(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    moving = { item, rect, dx:event.clientX - rect.left - item.x * rect.width / 100, dy:event.clientY - rect.top - item.y * rect.height / 100, pointerId:event.pointerId };
    selectNode(item);
  }, true);
  // Click/drag the object itself to move it. Positions may be outside the slide.
  $('slide').addEventListener('pointerdown', event => {
    const node = event.target.closest?.('.element');
    if (!node || event.target.closest('.free-resize-handle,.smart-resize-handle,.smart-rotate-handle')) return;
    const item = active().elements.find(el => el.id === node.dataset.id);
    if (!item) return;
    event.stopImmediatePropagation();
    const rect = $('slide').getBoundingClientRect();
    moving = { item, rect, dx:event.clientX - rect.left - item.x * rect.width / 100, dy:event.clientY - rect.top - item.y * rect.height / 100, pointerId:event.pointerId };
    selectNode(item);
  }, true);

  window.addEventListener('pointermove', event => {
    if (rotating) {
      event.preventDefault(); event.stopImmediatePropagation();
      const {item,rect} = rotating, cx = rect.left + (item.x + item.w / 2) * rect.width / 100, cy = rect.top + (item.y + item.h / 2) * rect.height / 100;
      item.rotation = Math.round((Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI + 90 + 360) % 360);
      const node = nodeFor(item); if (node) node.style.transform = 'rotate(' + item.rotation + 'deg)';
      return;
    }
    if (!moving) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const {item,rect,dx,dy} = moving;
    item.x = (event.clientX - rect.left - dx) / rect.width * 100;
    item.y = (event.clientY - rect.top - dy) / rect.height * 100;
    const node = nodeFor(item); if (node) { node.style.left = item.x + '%'; node.style.top = item.y + '%'; }
  }, true);
  window.addEventListener('pointerup', event => {
    if (!moving && !rotating) return;
    event.preventDefault(); event.stopImmediatePropagation(); $('slide').releasePointerCapture?.(event.pointerId); moving = null; rotating = null; drag = null; render();
  }, true);

  // The thumbnail needs the same static background treatment as the canvas,
  // including animated B-roll. It is a deliberately static preview.
  const earlierSlides = renderSlides;
  renderSlides = function () {
    earlierSlides();
    $('slideList').querySelectorAll('.slide-thumb').forEach((thumb, index) => {
      const slide = slides[index]; if (!slide || !slide.brollPreset || slide.brollPreset === 'none') return;
      if (thumb.querySelector('.slide-thumb-broll')) return;
      const colors = { sky:'linear-gradient(165deg,#0762a3,#79cdf3 48%,#d9f4ff)', aurora:'linear-gradient(135deg,#051531,#156d89 52%,#663a9c)', space:'radial-gradient(circle at 72% 20%,#ffe18a 0 2%,transparent 5%),#020617', night:'linear-gradient(155deg,#030914,#0d2145 58%,#291529)', sunset:'linear-gradient(175deg,#642160,#ec6e69 45%,#ffbf62 72%,#72587f)', water:'linear-gradient(#084f71,#078fba 45%,#015278)' };
      const broll = document.createElement('div'); broll.className = 'slide-thumb-broll'; broll.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;background:' + (colors[slide.brollPreset] || '#102044');
      const num = thumb.querySelector('.num'); thumb.insertBefore(broll, thumb.firstChild);
      if (num) num.style.zIndex = '3';
      [...thumb.children].forEach(child => { if (child !== broll && child !== num && !child.classList.contains('slide-thumb-background')) child.style.zIndex = '2'; });
    });
  };
  document.head.insertAdjacentHTML('beforeend', '<style>.smart-resize-handle{position:absolute;z-index:21;width:12px;height:12px;background:#fff;border:2px solid #1769e8;border-radius:2px;box-shadow:0 1px 4px #0009;touch-action:none}.smart-resize-handle.n,.smart-resize-handle.s{left:50%;transform:translateX(-50%);cursor:ns-resize}.smart-resize-handle.e,.smart-resize-handle.w{top:50%;transform:translateY(-50%);cursor:ew-resize}.smart-resize-handle.n{top:-8px}.smart-resize-handle.s{bottom:-8px}.smart-resize-handle.e{right:-8px}.smart-resize-handle.w{left:-8px}.smart-resize-handle.nw{left:-8px;top:-8px;cursor:nwse-resize}.smart-resize-handle.ne{right:-8px;top:-8px;cursor:nesw-resize}.smart-resize-handle.sw{left:-8px;bottom:-8px;cursor:nesw-resize}.smart-resize-handle.se{right:-8px;bottom:-8px;cursor:nwse-resize}</style>');
  function addSmartResizeHandles(){
    const item=selectedEl(),node=nodeFor(item); if(!item||!node||!['image','text'].includes(item.type))return;
    node.querySelectorAll('.smart-resize-handle').forEach(h=>h.remove());
    ['n','e','s','w','nw','ne','sw','se'].forEach(side=>{const h=document.createElement('i');h.className='smart-resize-handle '+side;h.title='Drag to resize';h.addEventListener('pointerdown',event=>{event.preventDefault();event.stopImmediatePropagation();const rect=$('slide').getBoundingClientRect();smartResizing={item,side,rect,start:{x:item.x,y:item.y,w:item.w,h:item.h}};h.setPointerCapture?.(event.pointerId)},true);node.append(h)});
  }
  window.addEventListener('pointermove',event=>{if(!smartResizing)return;event.preventDefault();event.stopImmediatePropagation();const {item,side,rect,start}=smartResizing,px=(event.clientX-rect.left)/rect.width*100,py=(event.clientY-rect.top)/rect.height*100;let {x,y,w,h}=start;if(side.includes('e'))w=Math.max(3,px-x);if(side.includes('s'))h=Math.max(3,py-y);if(side.includes('w')){x=Math.min(start.x+start.w-3,px);w=start.x+start.w-x}if(side.includes('n')){y=Math.min(start.y+start.h-3,py);h=start.y+start.h-y}Object.assign(item,{x,y,w,h});const node=nodeFor(item);if(node){node.style.left=x+'%';node.style.top=y+'%';node.style.width=w+'%';node.style.height=h+'%'}},true);
  window.addEventListener('pointerup',event=>{if(!smartResizing)return;event.preventDefault();event.stopImmediatePropagation();smartResizing=null;drag=null;render()},true);
  const beforeRender = render;
  render = function () {
    beforeRender();
    // Base renderer only restored text rotation; restore image rotation too.
    active().elements.forEach(item => { if (item.type === 'image') { const node=nodeFor(item); if (node) { node.style.transform='rotate(' + (Number(item.rotation)||0) + 'deg)'; node.style.transformOrigin='center center'; } } });
    addSmartResizeHandles(); addRotateHandle();
  };
  render();
})();