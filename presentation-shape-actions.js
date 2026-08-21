(()=>{
  const $=id=>document.getElementById(id);
  document.querySelector('.right').insertAdjacentHTML('afterbegin','<div id="shapeActionsPanel" class="hidden"><div class="section-title">SHAPE ACTIONS</div><div class="row"><button id="shapeDuplicate">⧉ Duplicate</button><button id="shapeDelete" class="danger">⌫ Delete shape</button></div><label class="field">Rotate<input id="shapeRotate" type="range" min="-180" max="180" value="0"></label><div class="row"><label class="field">Width (%)<input id="shapeWidth" type="number" min="4" max="100" step="1"></label><label class="field">Height (%)<input id="shapeHeight" type="number" min="4" max="100" step="1"></label></div><div class="row"><label class="field">Left (%)<input id="shapeLeft" type="number" min="0" max="100" step="1"></label><label class="field">Top (%)<input id="shapeTop" type="number" min="0" max="100" step="1"></label></div><div class="row"><button id="shapeFront">Bring forward</button><button id="shapeBack">Send backward</button></div><p class="hint">Shape-এ click করে select করুন। এরপর mouse দিয়ে drag, নিচের ডান দিকের handle দিয়ে resize, উপরের গোল handle দিয়ে rotate—অথবা এই controls ব্যবহার করুন।</p></div>');
  document.head.insertAdjacentHTML('beforeend','<style>#shapeActionsPanel{border:1px solid #4d6285;border-radius:8px;padding:9px;margin:8px 0;background:#17253d}.shape-el{cursor:move!important}.shape-el.selected{outline:2px solid #ffb11b!important;outline-offset:4px}.shape-handle{z-index:20!important}</style>');
  function shape(){const item=selectedEl();return item&&item.type==='shape'?item:null}
  function refresh(){const item=shape(),show=!!item;$('shapeActionsPanel').classList.toggle('hidden',!show);if(!item)return;$('shapeRotate').value=Number(item.rotation)||0;$('shapeWidth').value=Math.round(item.w||0);$('shapeHeight').value=Math.round(item.h||0);$('shapeLeft').value=Math.round(item.x||0);$('shapeTop').value=Math.round(item.y||0)}
  const oldInspector=renderInspector;
  renderInspector=function(){oldInspector();refresh()};
  function update(){
    const item=shape();if(!item)return;
    item.rotation=Number($('shapeRotate').value)||0;
    item.w=Math.max(4,Math.min(100-item.x,Number($('shapeWidth').value)||4));
    item.h=Math.max(4,Math.min(100-item.y,Number($('shapeHeight').value)||4));
    item.x=Math.max(0,Math.min(100-item.w,Number($('shapeLeft').value)||0));
    item.y=Math.max(0,Math.min(100-item.h,Number($('shapeTop').value)||0));
    render();
  }
  ['shapeRotate','shapeWidth','shapeHeight','shapeLeft','shapeTop'].forEach(id=>$(id).addEventListener('input',update));
  $('shapeDelete').onclick=()=>{const item=shape();if(!item)return;active().elements=active().elements.filter(e=>e.id!==item.id);selected=null;render()};
  $('shapeDuplicate').onclick=()=>{const item=shape();if(!item)return;const copy=structuredClone(item);copy.id=crypto.randomUUID();copy.x=Math.min(100-copy.w,copy.x+3);copy.y=Math.min(100-copy.h,copy.y+3);active().elements.push(copy);selected=copy.id;render()};
  function moveLayer(direction){const item=shape();if(!item)return;const items=active().elements,index=items.findIndex(e=>e.id===item.id),next=index+direction;if(next<0||next>=items.length)return;[items[index],items[next]]=[items[next],items[index]];render()}
  $('shapeFront').onclick=()=>moveLayer(1);
  $('shapeBack').onclick=()=>moveLayer(-1);
  const oldRender=render;
  render=function(){oldRender();active().elements.filter(e=>e.type==='shape').forEach(item=>{const node=$('slide').querySelector('.shape-el[data-id="'+item.id+'"]');if(node)node.addEventListener('pointerdown',()=>{selected=item.id},{once:true})})};
  render();
})();