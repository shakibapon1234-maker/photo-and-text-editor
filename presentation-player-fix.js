// Loaded after the presentation editor; playback fixes and controls live here.
(() => {
  const $ = id => document.getElementById(id);
  document.head.insertAdjacentHTML('beforeend', '<style>.image-el{overflow:hidden}.image-el img{object-fit:contain!important;background:transparent;border-radius:0!important}.image-el.fit-cover img{object-fit:cover!important}</style>');

  const preview = document.createElement('button');
  preview.id = 'previewSlideBtn';
  preview.textContent = '▶ Preview Slide';
  $('presentBtn').before(preview);
  $('imageInspector').insertAdjacentHTML('beforeend', '<label class="field">Image fit<select id="imageFit"><option value="contain">পুরো ছবি দেখান (কাটবে না)</option><option value="cover">ফ্রেম ভরুন (crop হতে পারে)</option></select></label><p class="hint">ছবিতে কোনো shape যোগ হয় না। পুরো logo/transparent PNG দেখতে প্রথম অপশন রাখুন।</p>');

  const baseRender = render;
  render = function () {
    baseRender();
    const currentElement = selectedEl();
    if (currentElement && currentElement.type === 'image') $('imageFit').value = currentElement.fit || 'contain';
    active().elements.filter(e => e.type === 'image').forEach(e => {
      const node = $('slide').querySelector('.element[data-id="' + e.id + '"]');
      if (node) node.classList.toggle('fit-cover', (e.fit || 'contain') === 'cover');
    });
  };
  $('imageFit').addEventListener('change', () => {
    const image = selectedEl();
    if (image && image.type === 'image') { image.fit = $('imageFit').value; render(); }
  });

  const frames = {
    fade:[{opacity:0},{opacity:1}], appear:[{opacity:0},{opacity:1}],
    slideLeft:[{opacity:0,transform:'translateX(-90px)'},{opacity:1,transform:'none'}], slideRight:[{opacity:0,transform:'translateX(90px)'},{opacity:1,transform:'none'}],
    slideUp:[{opacity:0,transform:'translateY(70px)'},{opacity:1,transform:'none'}], slideDown:[{opacity:0,transform:'translateY(-70px)'},{opacity:1,transform:'none'}],
    zoom:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)'}], pop:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.15)',offset:.7},{opacity:1,transform:'scale(1)'}],
    flipX:[{opacity:0,transform:'perspective(400px) rotateX(90deg)'},{opacity:1,transform:'perspective(400px) rotateX(0)'}], flipY:[{opacity:0,transform:'perspective(400px) rotateY(90deg)'},{opacity:1,transform:'perspective(400px) rotateY(0)'}],
    wipeLeft:[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0)'}], pulse:[{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}], bounce:[{transform:'translateY(0)'},{transform:'translateY(-28px)'},{transform:'translateY(0)'}],
    spin:[{transform:'rotate(0)'},{transform:'rotate(360deg)'}], spin3d:[{transform:'perspective(700px) rotateY(0deg)'},{transform:'perspective(700px) rotateY(360deg)'}], swing:[{transform:'rotate(0)'},{transform:'rotate(15deg)'},{transform:'rotate(-10deg)'},{transform:'rotate(0)'}], float:[{transform:'translateY(0)'},{transform:'translateY(-20px)'},{transform:'translateY(0)'}],
    jello:[{transform:'skew(0)'},{transform:'skew(-12deg,-12deg)'},{transform:'skew(7deg,7deg)'},{transform:'skew(0)'}], shake:[{transform:'translateX(0)'},{transform:'translateX(-18px)'},{transform:'translateX(18px)'},{transform:'translateX(0)'}], fadeOut:[{opacity:1},{opacity:0}], zoomOut:[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.2)'}], slideOutRight:[{opacity:1,transform:'none'},{opacity:0,transform:'translateX(120px)'}]
  };
  preview.onclick = () => {
    [...$('slide').querySelectorAll('.element')].forEach(node => {
      const element = active().elements.find(e => e.id === node.dataset.id);
      if (!element || !frames[element.animation]) return;
      node.getAnimations().forEach(a => a.cancel());
      node.animate(frames[element.animation], {duration:Math.max(.1, Number(element.animationDuration) || .6) * 1000, delay:Math.max(0, Number(element.animationDelay) || 0) * 1000, iterations:element.animationLoop ? Infinity : 1, easing:'cubic-bezier(.2,.8,.2,1)', fill:'both'});
    });
  };

  function runtime() {
    const slides = window.__presentationSlides, themes = window.__presentationThemes, frames = window.__presentationFrames;
    let index = 0, timer = null, recognition = null;
    const stage = document.getElementById('stage'), status = document.getElementById('status'), voice = document.getElementById('voice');
    const go = step => { index = (index + step + slides.length) % slides.length; draw(); };
    const draw = () => {
      const slide = slides[index]; stage.style.background = slide.background === 'custom' ? slide.bgColor : themes[slide.background]; stage.replaceChildren();
      slide.elements.forEach(e => { const node = document.createElement('div'); node.className = 'element ' + e.type + (e.type === 'image' && e.fit === 'cover' ? ' cover' : ''); node.style.cssText = 'left:'+e.x+'%;top:'+e.y+'%;width:'+e.w+'%;height:'+e.h+'%;font-size:'+(e.size||e.textSize||18)+'px;color:'+(e.color||e.textColor||'#fff')+';font-weight:'+(e.weight||e.textWeight||700)+';'; if(e.type==='image'){const image=new Image();image.src=e.src;node.append(image)}else if(e.type==='shape'){node.style.background=e.fill||'#4f8df7';node.style.border=(e.line??2)+'px solid '+(e.stroke||'#fff');node.style.opacity=(e.opacity??100)/100}else node.textContent=e.text||''; stage.append(node); if(frames[e.animation]) node.animate(frames[e.animation], {duration:Math.max(.1,Number(e.animationDuration)||.6)*1000,delay:Math.max(0,Number(e.animationDelay)||0)*1000,iterations:e.animationLoop?Infinity:1,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'}); });
      clearTimeout(timer); if(Number(slide.autoDuration)>0) timer=setTimeout(()=>go(1),Number(slide.autoDuration)*1000);
    };
    const stopVoice = () => { if(recognition){recognition.onend=null;recognition.stop();recognition=null} voice.textContent='🎙 Voice: Off'; voice.classList.remove('on'); };
    const startVoice = () => { const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if(!Speech){status.textContent='এই Electron/Browser-এ voice recognition পাওয়া যায়নি';return} recognition=new Speech();recognition.lang='bn-BD';recognition.continuous=true;recognition.interimResults=false;recognition.onresult=e=>{for(let n=e.resultIndex;n<e.results.length;n++){if(!e.results[n].isFinal)continue;const words=e.results[n][0].transcript.toLowerCase();if(/next|forward|নেক্সট|পরের|আগামী/.test(words)){go(1);status.textContent='Voice: next'}else if(/back|previous|ব্যাক|আগের|পেছ/.test(words)){go(-1);status.textContent='Voice: back'}}};recognition.onerror=e=>{status.textContent='Voice error: '+e.error;if(e.error==='not-allowed'||e.error==='service-not-allowed')stopVoice()};recognition.onend=()=>{if(recognition)try{recognition.start()}catch(_){}};recognition.start();voice.textContent='🎙 Voice: On';voice.classList.add('on');status.textContent='বলুন: next / নেক্সট / back / ব্যাক'; };
    voice.onclick = () => recognition ? stopVoice() : startVoice(); document.onkeydown=e=>{if(e.key==='ArrowRight'||e.key===' '||e.key==='Enter'){e.preventDefault();go(1)}else if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}else if(e.key==='Escape')close()}; document.onclick=e=>{if(!e.target.closest('#controls'))go(1)}; draw();
  }
  $('presentBtn').onclick = () => {
    const popup = window.open('', 'presentation', 'popup,width=1280,height=720');
    if (!popup) { alert('Presentation window খোলা যায়নি। Pop-up block করা আছে কি না দেখুন।'); return; }
    const deck = JSON.stringify(slides).replace(/</g, '\\u003c'), palette = JSON.stringify(themes).replace(/</g, '\\u003c'), motion = JSON.stringify(frames);
    const html = '<!doctype html><meta charset="utf-8"><title>Presentation</title><style>body{margin:0;background:#000;overflow:hidden;font-family:Arial,"Noto Sans Bengali",sans-serif}.slide{width:100vw;height:100vh;position:relative;overflow:hidden}.element{position:absolute;white-space:pre-wrap;animation-fill-mode:both}.image img{width:100%;height:100%;object-fit:contain;display:block}.image.cover img{object-fit:cover}.shape{box-sizing:border-box}.voice{position:fixed;z-index:5;right:16px;bottom:16px;display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:9px;background:#111c;color:#fff;font:13px Arial}.voice button{border:1px solid #9bb2d6;border-radius:6px;background:#24344e;color:#fff;padding:7px 10px;cursor:pointer}.voice button.on{background:#a85008;border-color:#ffb11b}</style><div id="stage" class="slide"></div><div id="controls" class="voice"><button id="voice">🎙 Voice: Off</button><span id="status">Click/→ next · ← back · Esc exit</span></div><script>window.__presentationSlides='+deck+';window.__presentationThemes='+palette+';window.__presentationFrames='+motion+';('+runtime.toString()+')();<\\/script>';
    // The closing tag must be real HTML in the popup (not the escaped form
    // used while this string is embedded in JavaScript).
    popup.document.open(); popup.document.write(html.replace('<\\/script>', '</script>')); popup.document.close();
  };

  // Text should be written where it is seen.  Older code required a
  // double-click and then moved focus to the sidebar textarea; this layer
  // makes every text box directly editable and keeps its model in sync.
  const textField = $('textValue');
  if (textField) {
    const textFieldLabel = textField.closest('label');
    if (textFieldLabel) textFieldLabel.style.display = 'none';
  }
  document.head.insertAdjacentHTML('beforeend', '<style>.text-el[contenteditable="true"]{cursor:text;user-select:text;outline:1px dashed transparent}.text-el[contenteditable="true"]:focus{outline-color:#ffb11b;background:#ffb11b12}</style>');
  const renderWithDirectText = render;
  render = function () {
    renderWithDirectText();
    active().elements.filter(e => e.type === 'text').forEach(e => {
      const node = $('slide').querySelector('.text-el[data-id="' + e.id + '"]');
      if (!node || node.dataset.directTextReady) return;
      node.dataset.directTextReady = '1';
      node.contentEditable = 'true';
      node.spellcheck = false;
      node.addEventListener('pointerdown', event => {
        if (event.altKey) return; // Alt + drag keeps object-moving available.
        event.stopImmediatePropagation();
        selected = e.id;
        renderInspector();
      }, true);
      node.addEventListener('input', () => {
        e.text = node.innerText.replace(/\r/g, '');
        if (textField) textField.value = e.text;
        if (typeof fitSelectedTextBox === 'function') {
          fitSelectedTextBox();
          node.style.height = e.h + '%';
        }
        try { localStorage.setItem('presentation-studio-autosave-v1', JSON.stringify({slides, current})); } catch (_) {}
      });
      node.addEventListener('focus', () => { selected = e.id; renderInspector(); });
    });
  };

  // Keep the top bar compact.  These are the existing controls (not cloned
  // buttons), so their original listeners and keyboard behaviour stay intact.
  const top = document.querySelector('.top');
  if (top && !document.getElementById('toolbarGroups')) {
    const groups = document.createElement('div');
    groups.id = 'toolbarGroups';
    const definitions = [
      ['slide', 'Slide', ['newSlide', 'duplicateSlide']],
      ['insert', 'Insert', ['addText', 'imageInput', 'assetBtn', 'addShape', 'addTable']],
      ['design', 'Design', ['textTools']],
      ['export', 'Export', ['saveProject', 'loadProject', 'downloadSlideshow', 'exportVideo']],
      ['present', 'Present', ['previewSlideBtn', 'presentBtn']]
    ];
    definitions.forEach(([key, title, ids]) => {
      const wrap = document.createElement('div'); wrap.className = 'toolbar-group';
      const trigger = document.createElement('button'); trigger.className = 'toolbar-trigger'; trigger.type = 'button'; trigger.textContent = title + ' ▾';
      const menu = document.createElement('div'); menu.className = 'toolbar-menu'; menu.dataset.menu = key;
      trigger.onclick = event => { event.stopPropagation(); const opening = !wrap.classList.contains('open'); groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); wrap.classList.toggle('open', opening); };
      ids.forEach(id => { const control = id === 'imageInput' ? $('imageInput')?.closest('label') : $(id); if (control) menu.appendChild(control); });
      wrap.append(trigger, menu); groups.appendChild(wrap);
    });
    // Any later-added top-bar control has a safe home instead of forcing the
    // bar to become horizontally scrollable again.
    const more = document.createElement('div'); more.className = 'toolbar-group';
    const moreTrigger = document.createElement('button'); moreTrigger.className = 'toolbar-trigger'; moreTrigger.type = 'button'; moreTrigger.textContent = 'More ▾';
    const moreMenu = document.createElement('div'); moreMenu.className = 'toolbar-menu';
    moreTrigger.onclick = event => { event.stopPropagation(); const opening = !more.classList.contains('open'); groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); more.classList.toggle('open', opening); };
    more.append(moreTrigger, moreMenu); groups.appendChild(more);
    top.querySelectorAll(':scope > button, :scope > label.file-label').forEach(control => { if (control !== moreTrigger && !control.closest('#toolbarGroups') && !control.classList.contains('brand')) moreMenu.appendChild(control); });
    top.querySelector('.brand')?.after(groups);
    if (!moreMenu.children.length) more.remove();
    document.addEventListener('pointerdown', event => { if (!groups.contains(event.target)) groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); });
    document.head.insertAdjacentHTML('beforeend', '<style>.top{overflow:visible!important;gap:9px}.top .brand{margin-right:8px!important}.toolbar-groups,#toolbarGroups{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.toolbar-group{position:relative}.toolbar-trigger{white-space:nowrap;background:#18253a}.toolbar-menu{display:none;position:absolute;z-index:150;top:calc(100% + 7px);left:0;width:min(720px,calc(100vw - 32px));min-width:260px;padding:8px;background:#111b2c;border:1px solid #50617d;border-radius:9px;box-shadow:0 18px 48px #000c}.toolbar-group.open>.toolbar-menu{display:flex;flex-flow:row wrap;align-items:center;gap:6px}.toolbar-menu button,.toolbar-menu .file-label{width:auto;flex:0 1 auto;text-align:left;white-space:nowrap}.toolbar-menu #presentBtn{background:#1769e8;border-color:#79abff}.toolbar-menu #saveProject,.toolbar-menu #downloadSlideshow{background:#0f766e;border-color:#50c7b5}.toolbar-menu #exportVideo{background:#7c3aed;border-color:#b9a0ff}@media(max-width:900px){#toolbarGroups{flex-wrap:nowrap}.top{overflow-x:auto!important}.toolbar-menu{width:min(520px,calc(100vw - 24px))}}</style>');
  }
  // Reliable presentation-wide history.  This intentionally replaces the
  // earlier history listener which skipped edits made inside text boxes.
  const undoButton = $('undoAction');
  const redoButton = $('redoAction');
  let undoStates = [structuredClone({slides, current})];
  let undoIndex = 0;
  let restoringHistory = false;
  let undoStamp = JSON.stringify(undoStates[0]);
  const refreshUndoButtons = () => {
    if (undoButton) undoButton.disabled = undoIndex === 0;
    if (redoButton) redoButton.disabled = undoIndex >= undoStates.length - 1;
  };
  const recordHistory = () => {
    if (restoringHistory) return;
    const snapshot = structuredClone({slides, current});
    const stamp = JSON.stringify(snapshot);
    if (stamp === undoStamp) return;
    undoStates = undoStates.slice(0, undoIndex + 1);
    undoStates.push(snapshot);
    if (undoStates.length > 100) undoStates.shift();
    undoIndex = undoStates.length - 1;
    undoStamp = stamp;
    refreshUndoButtons();
  };
  const restoreHistory = target => {
    if (target < 0 || target >= undoStates.length) return;
    restoringHistory = true;
    const snapshot = structuredClone(undoStates[target]);
    slides = snapshot.slides;
    current = Math.max(0, Math.min(snapshot.current || 0, slides.length - 1));
    selected = null;
    undoIndex = target;
    render();
    undoStamp = JSON.stringify({slides, current});
    restoringHistory = false;
    refreshUndoButtons();
  };
  if (undoButton) undoButton.onclick = () => restoreHistory(undoIndex - 1);
  if (redoButton) redoButton.onclick = () => restoreHistory(undoIndex + 1);
  const renderWithHistory = render;
  // Render is also called internally while other legacy undo code restores a
  // snapshot.  Recording only after user actions avoids that stale history
  // from polluting this reliable stack.
  render = function () { renderWithHistory(); };
  window.addEventListener('input', () => setTimeout(recordHistory, 0), true);
  window.addEventListener('change', () => setTimeout(recordHistory, 0), true);
  window.addEventListener('pointerup', () => setTimeout(recordHistory, 0), true);
  window.addEventListener('click', () => setTimeout(recordHistory, 0), true);
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      $('saveProject')?.click();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault();
      restoreHistory(event.shiftKey ? undoIndex + 1 : undoIndex - 1);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault();
      restoreHistory(undoIndex + 1);
      return;
    }
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.toolbar-group.open').forEach(x => x.classList.remove('open'));
    ['textToolsMenu','colorPop','shapeGallery','tablePicker','assetDrawer','smartDesigner','soundtrackPanel','textGradientAppearance','iconLibrary'].forEach(id => $(id)?.classList.add('hidden'));
    document.getAnimations().forEach(animation => animation.cancel());
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.getSelection()?.removeAllRanges();
  }, true);

  // Built-in SVG icons stay sharp at every size and behave exactly like an
  // inserted image, so they can be placed beside any text box.
  const iconButton = document.createElement('button');
  iconButton.id = 'iconLibraryBtn';
  iconButton.type = 'button';
  iconButton.textContent = '◈ Icons';
  const insertMenu = document.querySelector('.toolbar-menu[data-menu="insert"]');
  (insertMenu || document.querySelector('.top')).appendChild(iconButton);
  const iconPanel = document.createElement('div');
  iconPanel.id = 'iconLibrary';
  iconPanel.className = 'icon-library hidden';
  iconPanel.innerHTML = '<div class="icon-library-head"><strong>ICON LIBRARY</strong><button type="button" id="closeIconLibrary">×</button></div><p class="hint">Icon click করলেই slide-এ যোগ হবে। তারপর text box পাশে বসান।</p><div id="iconGrid" class="icon-grid"></div>';
  document.body.appendChild(iconPanel);
  const iconDefinitions = [
    ['Facebook','#1877f2','f','Facebook'], ['WhatsApp','#25d366','☎','WhatsApp'], ['Instagram','#e4405f','◎','Instagram'], ['YouTube','#ff0000','▶','YouTube'], ['Messenger','#0084ff','✦','Messenger'], ['Telegram','#229ed9','➤','Telegram'], ['LinkedIn','#0a66c2','in','LinkedIn'], ['TikTok','#111827','♪','TikTok'],
    ['Email','#e85d4a','✉','Email'], ['Phone','#16a34a','☎','Phone'], ['Location','#dc2626','●','Location'], ['Website','#2563eb','◎','Website'], ['Home','#f59e0b','⌂','Home'], ['User','#7c3aed','●','User'], ['Calendar','#0f766e','▣','Calendar'], ['Clock','#475569','◷','Clock'],
    ['Cart','#b45309','🛒','Shopping cart'], ['Bag','#a855f7','▢','Shopping bag'], ['Star','#eab308','★','Star'], ['Check','#16a34a','✓','Check'], ['Info','#0284c7','i','Info'], ['Arrow','#334155','→','Arrow']
  ];
  const svgIcon = (color, glyph, label) => {
    const textSize = glyph.length > 1 ? 42 : 58;
    const whatsapp = label === 'WhatsApp'
      ? '<path fill="#fff" d="M80 35C55.1 35 35 55.1 35 80c0 8 2.1 15.4 5.8 21.9L35 125l23.7-6.2A44.8 44.8 0 0 0 80 125c24.9 0 45-20.1 45-45S104.9 35 80 35zm0 80.9c-6.8 0-13.1-2-18.5-5.4l-13.8 3.6 3.7-13.4A35.6 35.6 0 1 1 80 115.9z"/><path fill="'+color+'" d="M66.1 56.7c-2.1 0-3.7 1.1-4.5 3.1-1.5 3.7-2.2 7.1-2.2 10.5 0 16.2 13.1 29.3 29.3 29.3 3.4 0 6.8-.7 10.5-2.2 2-.8 3.1-2.4 3.1-4.5l-1-7.5c-.2-1.8-2-3-3.8-2.5l-6.3 1.7c-1.2.3-2.4 0-3.3-.8a43.7 43.7 0 0 1-11.7-11.7c-.8-.9-1.1-2.1-.8-3.3l1.7-6.3c.5-1.8-.7-3.6-2.5-3.8z"/>'
      : '<text x="80" y="101" text-anchor="middle" font-family="Arial, sans-serif" font-size="'+textSize+'" font-weight="700" fill="#fff">'+glyph+'</text>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="'+label+'"><circle cx="80" cy="80" r="72" fill="'+color+'"/>'+whatsapp+'</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  const iconGrid = $('iconGrid');
  iconDefinitions.forEach(([name, color, glyph, label]) => {
    const item = document.createElement('button'); item.type = 'button'; item.className = 'icon-choice'; item.title = label;
    item.innerHTML = '<img alt="" src="'+svgIcon(color, glyph, label)+'"><span>'+name+'</span>';
    item.onclick = () => {
      addImage(svgIcon(color, glyph, label));
      const icon = selectedEl();
      if (icon && icon.type === 'image') { icon.x = 12; icon.y = 58; icon.w = 9; icon.h = 12; icon.fit = 'contain'; render(); }
      iconPanel.classList.add('hidden');
    };
    iconGrid.appendChild(item);
  });
  iconButton.onclick = event => { event.stopPropagation(); iconPanel.classList.toggle('hidden'); };
  $('closeIconLibrary').onclick = () => iconPanel.classList.add('hidden');
  document.addEventListener('pointerdown', event => { if (!iconPanel.contains(event.target) && event.target !== iconButton) iconPanel.classList.add('hidden'); });
  document.head.insertAdjacentHTML('beforeend', '<style>#iconLibraryBtn{white-space:nowrap}.icon-library-head{display:flex;align-items:center;justify-content:space-between;color:#ffd166}.icon-library-head button{padding:3px 8px}.icon-library{position:fixed;z-index:160;top:70px;left:50%;transform:translateX(-50%);width:min(720px,calc(100vw - 24px));max-height:calc(100vh - 92px);overflow:auto;padding:14px;background:#111b2c;border:1px solid #50617d;border-radius:12px;box-shadow:0 24px 70px #000d}.icon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}.icon-choice{display:flex;flex-direction:column;align-items:center;gap:5px;min-height:86px;padding:8px 5px;font-size:10px;background:#18243a}.icon-choice img{width:42px;height:42px}.icon-choice:hover{border-color:#ffb11b;transform:translateY(-1px)}</style>');
  refreshUndoButtons();
  render();
})();
