(() => {
  const $ = id => document.getElementById(id);
  let action = null;
  document.head.insertAdjacentHTML('beforeend', `<style>
    .image-move-handle,.image-rotate-handle,.image-resize-handle,.text-move-handle,.text-rotate-handle,.text-resize-handle,.shape-handle{display:none!important}.slide{overflow:visible}.element.selected{z-index:500!important;overflow:visible!important}.hard-resize{position:absolute;z-index:99;width:13px;height:13px;background:#fff;border:2px solid #1769e8;border-radius:2px;box-shadow:0 1px 5px #000;touch-action:none}.hard-resize.n,.hard-resize.s{left:50%;transform:translateX(-50%);cursor:ns-resize}.hard-resize.e,.hard-resize.w{top:50%;transform:translateY(-50%);cursor:ew-resize}.hard-resize.n{top:-9px}.hard-resize.s{bottom:-9px}.hard-resize.e{right:-9px}.hard-resize.w{left:-9px}.hard-resize.nw{left:-9px;top:-9px;cursor:nwse-resize}.hard-resize.ne{right:-9px;top:-9px;cursor:nesw-resize}.hard-resize.sw{left:-9px;bottom:-9px;cursor:nesw-resize}.hard-resize.se{right:-9px;bottom:-9px;cursor:nwse-resize}.hard-rotate{position:absolute;z-index:100;left:50%;top:-34px;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;border:2px solid #1769e8;background:#fff;box-shadow:0 1px 5px #000;cursor:grab;touch-action:none}.hard-rotate:after{content:'';position:absolute;left:6px;top:16px;height:15px;border-left:2px solid #ffb11b}.shape-hard-control{right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important}</style>`);
  const nodeFor = item => item && $('slide').querySelector('.element[data-id="'+item.id+'"]');
  function controls() {
    $('slide').querySelectorAll('.shape-hard-control').forEach(x=>x.remove());
    const item=selectedEl(), node=nodeFor(item); if(!item||!node)return;
    node.querySelectorAll('.hard-resize,.hard-rotate').forEach(x=>x.remove());
    const sides=['n','e','s','w','nw','ne','sw','se'];
    // CSS clip-path also clips descendants. Render shape handles on the slide
    // instead of inside the shape so arrows, triangles, stars, etc. remain resizable.
    if(item.type==='shape'){
      const positions={n:[item.x+item.w/2,item.y],e:[item.x+item.w,item.y+item.h/2],s:[item.x+item.w/2,item.y+item.h],w:[item.x,item.y+item.h/2],nw:[item.x,item.y],ne:[item.x+item.w,item.y],sw:[item.x,item.y+item.h],se:[item.x+item.w,item.y+item.h]};
      sides.forEach(side=>{const h=document.createElement('i');h.className='hard-resize shape-hard-control '+side;h.style.left=positions[side][0]+'%';h.style.top=positions[side][1]+'%';h.onpointerdown=e=>begin('resize',e,item,side);$('slide').append(h)});
      return;
    }
    sides.forEach(side=>{const h=document.createElement('i');h.className='hard-resize '+side;h.onpointerdown=e=>begin('resize',e,item,side);node.append(h)});
    const r=document.createElement('i');r.className='hard-rotate';r.onpointerdown=e=>begin('rotate',e,item);node.append(r);
  }
  function begin(kind,event,item,side='') {
    event.preventDefault();event.stopPropagation();const stage=$('slide'),rect=stage.getBoundingClientRect();
    action={kind,item,side,rect,start:{x:item.x,y:item.y,w:item.w,h:item.h,rotation:Number(item.rotation)||0},dx:event.clientX-rect.left-item.x*rect.width/100,dy:event.clientY-rect.top-item.y*rect.height/100};
    stage.setPointerCapture?.(event.pointerId);
  }
  // Object itself always moves. Handles are the only resize/rotate entry points.
  window.addEventListener('pointerdown',event=>{
    const handle=event.target.closest?.('.hard-resize,.hard-rotate');
    if(handle){
      const node=handle.closest?.('#slide .element'), item=node&&active().elements.find(x=>x.id===node.dataset.id);
      if(!item)return;
      event.preventDefault();event.stopImmediatePropagation();selected=item.id;
      const side=['n','e','s','w','nw','ne','sw','se'].find(name=>handle.classList.contains(name));
      begin(handle.classList.contains('hard-rotate')?'rotate':'resize',event,item,side||'');
      return;
    }
    const node=event.target.closest?.('#slide .element'); if(!node)return;
    const item=active().elements.find(x=>x.id===node.dataset.id);if(!item)return;
    event.preventDefault();event.stopImmediatePropagation();selected=item.id;render();begin('move',event,item);
  },true);
  window.addEventListener('pointermove',event=>{
    if(!action)return;event.preventDefault();event.stopImmediatePropagation();const {kind,item,side,rect,start,dx,dy}=action,px=(event.clientX-rect.left)/rect.width*100,py=(event.clientY-rect.top)/rect.height*100;
    if(kind==='move'){item.x=(event.clientX-rect.left-dx)/rect.width*100;item.y=(event.clientY-rect.top-dy)/rect.height*100}
    else if(kind==='resize'){let {x,y,w,h}=start;if(side.includes('e'))w=Math.max(2,px-x);if(side.includes('s'))h=Math.max(2,py-y);if(side.includes('w')){x=Math.min(start.x+start.w-2,px);w=start.x+start.w-x}if(side.includes('n')){y=Math.min(start.y+start.h-2,py);h=start.y+start.h-y}Object.assign(item,{x,y,w,h})}
    else {const cx=rect.left+(item.x+item.w/2)*rect.width/100,cy=rect.top+(item.y+item.h/2)*rect.height/100;item.rotation=Math.round((Math.atan2(event.clientY-cy,event.clientX-cx)*180/Math.PI+90+360)%360)}
    const node=nodeFor(item);if(node){node.style.left=item.x+'%';node.style.top=item.y+'%';node.style.width=item.w+'%';node.style.height=item.h+'%';node.style.transform='rotate('+(Number(item.rotation)||0)+'deg)'}
  },true);
  window.addEventListener('pointerup',event=>{if(!action)return;event.preventDefault();event.stopImmediatePropagation();$('slide').releasePointerCapture?.(event.pointerId);action=null;render()},true);
  const priorInspector=renderInspector;
  renderInspector=function(){priorInspector();setTimeout(controls,0)};  const priorRender=render;render=function(){priorRender();active().elements.forEach(item=>{const node=nodeFor(item);if(node){node.style.transform='rotate('+(Number(item.rotation)||0)+'deg)';node.style.transformOrigin='center center'}});controls()};render();
})();
