(() => {
  const $ = id => document.getElementById(id);

  const add = document.createElement('label');
  add.className = 'file-label'; add.id = 'videoUploadLabel';
  add.innerHTML = '🎬 Add Video<input id="videoInput" type="file" accept="video/mp4,video/webm,video/ogg">';
  const insertMenu = document.querySelector('.toolbar-menu[data-menu="insert"]');
  (insertMenu || document.querySelector('.top')).append(add);
  document.head.insertAdjacentHTML('beforeend', '<style>.video-el{overflow:hidden;background:transparent}.video-el video{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}.video-el.key-black video{mix-blend-mode:screen}.video-el.key-light video{mix-blend-mode:multiply}</style>');
  function addVideo(src) {
    const item = {id:crypto.randomUUID(), type:'video', src, x:18, y:30, w:46, h:34, rotation:0, transparency:'black'};
    active().elements.push(item); selected=item.id; render();
  }
  window.PresentationMedia = {
    addBlob(blob) {
      if (!blob || typeof blob.arrayBuffer !== 'function') return;
      const reader = new FileReader();
      reader.onload = () => addVideo(reader.result);
      reader.readAsDataURL(blob);
    }
  };
  $('videoInput').addEventListener('change', event => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => addVideo(reader.result); reader.readAsDataURL(file);
    event.target.value = '';
  });
  const inspector = document.createElement('div'); inspector.id = 'videoInspector'; inspector.className = 'hidden';
  inspector.innerHTML = '<div class="section-title">VIDEO</div><label class="field">Background transparency<select id="videoTransparency"><option value="black">Remove black background</option><option value="none">Keep original video</option><option value="light">Remove white/light background</option></select></label><p class="hint">Black-background logo/motion-এর জন্য প্রথম option ব্যবহার করুন।</p>';
  document.querySelector('.right').insertBefore(inspector, document.querySelector('.right').lastElementChild);
  const baseInspector = renderInspector;
  renderInspector = function () {
    baseInspector(); const item = selectedEl(), visible = !!item && item.type === 'video';
    inspector.classList.toggle('hidden', !visible); if (visible) $('videoTransparency').value = item.transparency || 'black';
  };
  $('videoTransparency').addEventListener('change', () => { const item = selectedEl(); if (!item || item.type !== 'video') return; item.transparency = $('videoTransparency').value; render(); });  const baseRender = render;
  render = function () {
    const all = active().elements, videos = all.filter(item => item.type === 'video');
    if (!videos.length) return baseRender();
    active().elements = all.filter(item => item.type !== 'video'); baseRender(); active().elements = all;
    const slide = $('slide');
    videos.forEach(item => {
      const node = document.createElement('div');
      node.className = 'element video-el key-' + (item.transparency || 'none') + (selected === item.id ? ' selected' : '');
      node.dataset.id = item.id;
      node.style.cssText = 'left:' + item.x + '%;top:' + item.y + '%;width:' + item.w + '%;height:' + item.h + '%;transform:rotate(' + (Number(item.rotation) || 0) + 'deg);transform-origin:center center;';
      const video = document.createElement('video'); video.src=item.src; video.autoplay=true; video.loop=true; video.muted=true; video.playsInline=true;
      video.play().catch(() => {}); node.append(video); node.addEventListener('pointerdown', startDrag); slide.append(node);
    });
    renderSlides(); renderInspector();
  };
  render();
})();