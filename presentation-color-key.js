(()=>{
  const $=id=>document.getElementById(id);
  document.querySelector('.right').insertAdjacentHTML('afterbegin','<div id="colorKeyPanel" class="hidden"><div class="section-title">SOLID COLOR TRANSPARENCY</div><label class="field"><input id="colorKeyEnabled" type="checkbox" style="display:inline;width:auto;margin:0 6px 0 0">Make a solid color transparent</label><div id="colorKeyControls"><div class="row"><label class="field">Color to remove<input id="colorKeyColor" type="color" value="#00ff00"></label><label class="field">Tolerance<input id="colorKeyTolerance" type="number" min="0" max="255" value="45"></label></div><p class="hint">AI ছাড়া কাজ করে। Green, white, black বা যেকোনো একরঙা background select করুন। Color যত plain হবে, result তত clean হবে।</p></div></div>');
  document.head.insertAdjacentHTML('beforeend','<style>#colorKeyPanel{border-top:1px solid #40506b;margin-top:12px;padding-top:10px}.keyed-canvas{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}</style>');
  function keyedCanvas(node,item){
    const image=node.querySelector('img');
    if(!image||!item.colorKey||!item.colorKey.enabled)return;
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    canvas.className='keyed-canvas';
    image.style.display='none';
    node.append(canvas);
    const hex=item.colorKey.color||'#00ff00';
    const rgb=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
    const tolerance=Math.max(0,Math.min(255,Number(item.colorKey.tolerance)||0));
    function paint(){
      if(!node.isConnected)return;
      const width=image.naturalWidth,height=image.naturalHeight;
      if(width&&height){
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
        ctx.clearRect(0,0,width,height);
        ctx.drawImage(image,0,0,width,height);
        try{
          const pixels=ctx.getImageData(0,0,width,height);
          for(let i=0;i<pixels.data.length;i+=4){
            const distance=Math.max(Math.abs(pixels.data[i]-rgb[0]),Math.abs(pixels.data[i+1]-rgb[1]),Math.abs(pixels.data[i+2]-rgb[2]));
            if(distance<=tolerance)pixels.data[i+3]=0;
          }
          ctx.putImageData(pixels,0,0);
        }catch(_){}
      }
      requestAnimationFrame(paint);
    }
    paint();
  }
  const oldInspector=renderInspector;
  renderInspector=function(){
    oldInspector();
    const item=selectedEl(),ok=item&&item.type==='image';
    $('colorKeyPanel').classList.toggle('hidden',!ok);
    if(!ok)return;
    item.colorKey=item.colorKey||{enabled:false,color:'#00ff00',tolerance:45};
    $('colorKeyEnabled').checked=!!item.colorKey.enabled;
    $('colorKeyColor').value=item.colorKey.color;
    $('colorKeyTolerance').value=item.colorKey.tolerance;
    $('colorKeyControls').classList.toggle('hidden',!item.colorKey.enabled);
  };
  function update(){
    const item=selectedEl();
    if(!item||item.type!=='image')return;
    item.colorKey={enabled:$('colorKeyEnabled').checked,color:$('colorKeyColor').value,tolerance:Math.max(0,Math.min(255,Number($('colorKeyTolerance').value)||0))};
    render();
  }
  ['colorKeyEnabled','colorKeyColor','colorKeyTolerance'].forEach(id=>$(id).addEventListener('input',update));
  $('colorKeyEnabled').addEventListener('change',update);
  const oldRender=render;
  render=function(){
    oldRender();
    active().elements.filter(item=>item.type==='image'&&item.colorKey&&item.colorKey.enabled).forEach(item=>{
      const node=$('slide').querySelector('.image-el[data-id="'+item.id+'"]');
      if(node&&!node.querySelector('canvas'))keyedCanvas(node,item);
    });
  };
  render();
})();