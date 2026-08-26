(() => {
  const $ = id => document.getElementById(id);
  const top = document.querySelector('.top');
  const animate = document.createElement('button');
  animate.id = 'jumpAnimation';
  animate.textContent = 'Animate';
  const addTextBtn = $('addText');
  if (addTextBtn) top.insertBefore(animate, addTextBtn);
  else top.appendChild(animate);

  const rightPanel = document.querySelector('.right');
  if (rightPanel && !$('backgroundUpload')) {
    rightPanel.insertAdjacentHTML('afterbegin', `
      <div id="backgroundUpload">
        <div class="section-title">BACKGROUND IMAGE</div>
        <label class="file-label" style="display:block;text-align:center">Upload Background
          <input id="backgroundImageInput" type="file" accept="image/*">
        </label>
        <button id="clearBackgroundImage" style="width:100%;margin-top:7px">Remove Background Image</button>
      </div>
    `);
  }

  document.head.insertAdjacentHTML('beforeend', '<style>#jumpAnimation{background:#b45309;border-color:#fbbf24}.file-label input{display:none}</style>');

  // Extend styleSlide to handle static image backgrounds on the main canvas
  const baseStyleSlide = styleSlide;
  styleSlide = function () {
    baseStyleSlide();
    const s = active();
    if (s.background === 'image' && s.bgImage) {
      const slide = $('slide');
      if (slide) {
        slide.style.backgroundImage = 'linear-gradient(#00000018,#00000018),url("' + s.bgImage.replace(/"/g, '\\"') + '")';
        slide.style.backgroundSize = 'cover';
        slide.style.backgroundPosition = 'center';
      }
    }
  };

  // The master thumbnail renderer handles bgImage slides natively.
  // This hook is kept only as a no-op chain link for backwards compatibility.
  const baseRenderSlides = renderSlides;
  renderSlides = function () {
    baseRenderSlides();
    // bgImage thumbnails are now rendered by window.renderSlideThumbnailsMaster
  };

  if ($('backgroundImageInput')) {
    $('backgroundImageInput').onchange = e => {
      const f = e.target.files[0];
      if (!f || !f.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = () => { active().background = 'image'; active().bgImage = r.result; render(); };
      r.readAsDataURL(f);
    };
  }

  if ($('clearBackgroundImage')) {
    $('clearBackgroundImage').onclick = () => {
      if (active().background === 'image') { active().background = 'fashion'; delete active().bgImage; render(); }
    };
  }

  animate.onclick = () => {
    const e = selectedEl();
    if (!e) { alert('Select text, a shape, image, or table first.'); return; }
    const p = $('animationInspector');
    if (!p) return;
    p.classList.remove('hidden');
    p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const animEl = $('elementAnimation');
    if (animEl) animEl.focus();
  };
})();
