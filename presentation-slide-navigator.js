(() => {
  const $ = id => document.getElementById(id);
  const panel = document.createElement('div'); panel.id = 'slideQuickNav';
  panel.innerHTML = '<div class="section-title" style="margin-top:14px">SLIDE CONTROL</div><div id="slideQuickNavList"></div><p class="hint">Select always opens the exact slide. Delete removes that slide.</p>';
  $('slideList').after(panel);
  document.head.insertAdjacentHTML('beforeend','<style>#slideQuickNavList{display:grid;gap:6px}.slide-quick-row{display:grid;grid-template-columns:1fr 36px;gap:5px}.slide-quick-row button{padding:7px;text-align:left}.slide-quick-row .danger{color:#ffd2dc;text-align:center}</style>');
  function sync(){const box=$('slideQuickNavList');box.replaceChildren();slides.forEach((slide,index)=>{const row=document.createElement('div');row.className='slide-quick-row';const open=document.createElement('button');open.textContent=(index===current?'● ':'○ ')+'Open Slide '+(index+1);open.onclick=()=>{current=index;selected=null;render()};const del=document.createElement('button');del.className='danger';del.title='Delete slide '+(index+1);del.textContent='×';del.disabled=slides.length===1;del.onclick=()=>{if(slides.length===1)return;slides.splice(index,1);current=Math.max(0,Math.min(current,index===current?index-1:current));selected=null;render()};row.append(open,del);box.append(row)})}
  const before=renderSlides;renderSlides=function(){before();sync()};sync();
})();