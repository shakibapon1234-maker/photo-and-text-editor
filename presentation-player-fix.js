// Presentation Player Fix — Unified, High-Fidelity, Electron-Compatible
// Replaces ALL other presentBtn handlers with one authoritative player.
// Uses a same-window fullscreen overlay (no window.open) to avoid the
// blank Electron popup issue and for better performance.
(() => {
  const $ = id => document.getElementById(id);

  // ── Image fit selector (in editor) ────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', '<style>.image-el{overflow:hidden}.image-el img{object-fit:contain!important;background:transparent;border-radius:0!important}.image-el.fit-cover img{object-fit:cover!important}</style>');

  const preview = document.createElement('button');
  preview.id = 'previewSlideBtn';
  preview.textContent = '▶ Preview Slide';
  const presentBtn = $('presentBtn');
  if (presentBtn) presentBtn.before(preview);

  const imageInsp = $('imageInspector');
  if (imageInsp && !$('imageFit')) {
    imageInsp.insertAdjacentHTML('beforeend', '<label class="field">Image fit<select id="imageFit"><option value="contain">পুরো ছবি দেখান (কাটবে না)</option><option value="cover">ফ্রেম ভরুন (crop হতে পারে)</option></select></label><p class="hint">ছবিতে কোনো shape যোগ হয় না। পুরো logo/transparent PNG দেখতে প্রথম অপশন রাখুন।</p>');
  }

  const animFrames = {
    fade:[{opacity:0},{opacity:1}], appear:[{opacity:0},{opacity:1}],
    slideLeft:[{opacity:0,transform:'translateX(-90px)'},{opacity:1,transform:'none'}],
    slideRight:[{opacity:0,transform:'translateX(90px)'},{opacity:1,transform:'none'}],
    slideUp:[{opacity:0,transform:'translateY(70px)'},{opacity:1,transform:'none'}],
    slideDown:[{opacity:0,transform:'translateY(-70px)'},{opacity:1,transform:'none'}],
    zoom:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)'}],
    pop:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.15)',offset:.7},{opacity:1,transform:'scale(1)'}],
    flipX:[{opacity:0,transform:'perspective(400px) rotateX(90deg)'},{opacity:1,transform:'perspective(400px) rotateX(0)'}],
    flipY:[{opacity:0,transform:'perspective(400px) rotateY(90deg)'},{opacity:1,transform:'perspective(400px) rotateY(0)'}],
    wipeLeft:[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0)'}],
    pulse:[{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],
    bounce:[{transform:'translateY(0)'},{transform:'translateY(-28px)'},{transform:'translateY(0)'}],
    spin:[{transform:'rotate(0)'},{transform:'rotate(360deg)'}],
    spin3d:[{transform:'perspective(700px) rotateY(0deg)'},{transform:'perspective(700px) rotateY(360deg)'}],
    swing:[{transform:'rotate(0)'},{transform:'rotate(15deg)'},{transform:'rotate(-10deg)'},{transform:'rotate(0)'}],
    float:[{transform:'translateY(0)'},{transform:'translateY(-20px)'},{transform:'translateY(0)'}],
    jello:[{transform:'skew(0)'},{transform:'skew(-12deg,-12deg)'},{transform:'skew(7deg,7deg)'},{transform:'skew(0)'}],
    shake:[{transform:'translateX(0)'},{transform:'translateX(-18px)'},{transform:'translateX(18px)'},{transform:'translateX(0)'}],
    fadeOut:[{opacity:1},{opacity:0}],
    zoomOut:[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.2)'}],
    slideOutRight:[{opacity:1,transform:'none'},{opacity:0,transform:'translateX(120px)'}]
  };

  preview.onclick = () => {
    [...$('slide').querySelectorAll('.element')].forEach(node => {
      const el = active().elements.find(e => e.id === node.dataset.id);
      if (!el || !animFrames[el.animation]) return;
      node.getAnimations().forEach(a => a.cancel());
      node.animate(animFrames[el.animation], {duration:Math.max(.1,Number(el.animationDuration)||.6)*1000,delay:Math.max(0,Number(el.animationDelay)||0)*1000,iterations:el.animationLoop?Infinity:1,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
    });
  };

  const baseRender = render;
  render = function () {
    baseRender();
    const currentEl = selectedEl();
    if (currentEl && currentEl.type === 'image' && $('imageFit')) $('imageFit').value = currentEl.fit || 'contain';
    active().elements.filter(e => e.type === 'image').forEach(e => {
      const node = $('slide').querySelector('.element[data-id="' + e.id + '"]');
      if (node) node.classList.toggle('fit-cover', (e.fit || 'contain') === 'cover');
    });
  };

  if ($('imageFit')) {
    $('imageFit').addEventListener('change', () => {
      const image = selectedEl();
      if (image && image.type === 'image') { image.fit = $('imageFit').value; render(); }
    });
  }

  // ── Broll CSS for the player overlay ──────────────────────────────────────
  const BROLL_CSS = `
    #__pres_stage #brollLayer{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;transform:translateZ(0)}
    #__pres_stage #brollLayer:before,#__pres_stage #brollLayer:after{content:"";position:absolute;inset:-10%;background-repeat:no-repeat;will-change:transform;transform:translate3d(0,0,0)}
    #__pres_stage #brollLayer.space{background:radial-gradient(circle at 72% 20%,#ffe18a 0 2%,transparent 5%),radial-gradient(circle at 19% 88%,#5933a0 0 10%,transparent 24%),#020617}
    #__pres_stage #brollLayer.space:before{background-image:radial-gradient(#fff 0 1px,transparent 2px);background-size:55px 48px;animation:broll_bd 18s linear infinite}
    #__pres_stage #brollLayer.space:after{background:radial-gradient(ellipse,transparent 0 42%,#8168ff77 44%,transparent 48%);animation:broll_bs 22s linear infinite}
    #__pres_stage #brollLayer.aurora{background:#051531}
    #__pres_stage #brollLayer.aurora:before{background:radial-gradient(ellipse at 23% 84%,#1dffc099 0 18%,transparent 52%),radial-gradient(ellipse at 65% 38%,#49a9ffb8 0 20%,transparent 55%),radial-gradient(ellipse at 94% 66%,#c85eff99 0 18%,transparent 51%);filter:blur(16px);animation:broll_ba 10s ease-in-out infinite alternate}
    #__pres_stage #brollLayer.sky{background:linear-gradient(165deg,#0762a3,#79cdf3 48%,#d9f4ff)}
    #__pres_stage #brollLayer.sky:before{background:radial-gradient(ellipse at 15% 35%,#fff 0 9%,transparent 25%),radial-gradient(ellipse at 52% 62%,#ffffffdd 0 11%,transparent 28%),radial-gradient(ellipse at 90% 20%,#fff 0 9%,transparent 27%);filter:blur(6px);animation:broll_bc 14s linear infinite}
    #__pres_stage #brollLayer.sky:after{inset:auto 20% 38% auto;width:36px;height:12px;background:#fff;clip-path:polygon(0 45%,60% 43%,90% 0,100% 0,75% 47%,100% 75%,100% 90%,60% 59%,0 59%);animation:broll_bp 9s linear infinite}
    #__pres_stage #brollLayer.night{background:linear-gradient(155deg,#030914,#0d2145 58%,#291529)}
    #__pres_stage #brollLayer.night:before{inset:auto -5% 0;height:45%;background:repeating-linear-gradient(90deg,#07111e 0 30px,#26384d 31px 55px,#07111e 56px 76px);clip-path:polygon(0 32%,8% 17%,16% 37%,23% 5%,32% 25%,41% 12%,49% 35%,60% 4%,70% 30%,79% 10%,89% 32%,100% 13%,100% 100%,0 100%);animation:broll_bn 8s linear infinite}
    #__pres_stage #brollLayer.night:after{background-image:radial-gradient(#ffe075 0 1px,transparent 2px),radial-gradient(#fff 0 1px,transparent 2px);background-size:37px 31px,91px 73px;animation:broll_bd 13s linear infinite reverse}
    #__pres_stage #brollLayer.sunset{background:linear-gradient(175deg,#642160,#ec6e69 45%,#ffbf62 72%,#72587f)}
    #__pres_stage #brollLayer.sunset:before{background:radial-gradient(ellipse at 13% 70%,#ffc76c 0 8%,transparent 25%),radial-gradient(ellipse at 51% 73%,#ffdb9b 0 5%,transparent 18%),radial-gradient(ellipse at 85% 53%,#ffb08b 0 9%,transparent 26%);filter:blur(10px);animation:broll_bc 17s linear infinite reverse}
    #__pres_stage #brollLayer.water{background:linear-gradient(#084f71,#078fba 45%,#015278)}
    #__pres_stage #brollLayer.water:before{background:repeating-radial-gradient(ellipse at 48% 108%,#b9f8ff77 0 1px,transparent 2px 15px);transform-origin:50% 100%;animation:broll_bw 5s ease-in-out infinite alternate}
    #__pres_stage #brollLayer.water:after{background:linear-gradient(110deg,transparent 35%,#d9ffff66 46%,transparent 55%);animation:broll_bh 5s linear infinite}
    #__pres_stage #brollLayer.speed-slow:before,#__pres_stage #brollLayer.speed-slow:after{animation-duration:18s!important}
    #__pres_stage #brollLayer.speed-fast:before,#__pres_stage #brollLayer.speed-fast:after{animation-duration:5s!important}
    @keyframes broll_bd{to{transform:translate3d(-9%,-6%,0)}}
    @keyframes broll_bs{to{transform:rotate(360deg)}}
    @keyframes broll_ba{to{transform:translate3d(8%,0,0) scale(1.12);opacity:.78}}
    @keyframes broll_bc{to{transform:translate3d(14%,0,0)}}
    @keyframes broll_bp{from{transform:translate3d(-70vw,35vh,0) scale(.7)}to{transform:translate3d(55vw,-25vh,0) scale(1.15)}}
    @keyframes broll_bn{to{transform:translate3d(-7%,0,0)}}
    @keyframes broll_bh{from{transform:translate3d(-80%,0,0)}to{transform:translate3d(80%,0,0)}}
    @keyframes broll_bw{to{transform:scale(1.2,1.08) translate3d(0,-3%,0)}}
  `;

  // ── Overlay Styles (injected once) ────────────────────────────────────────
  const OVERLAY_CSS = `
    #__pres_overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: #000; display: flex; align-items: center; justify-content: center;
      font-family: Arial, "Noto Sans Bengali", sans-serif;
    }
    #__pres_stage {
      position: relative;
      width: 100vw; height: 56.25vw; /* 16:9 */
      max-height: 100vh;
      max-width: 177.78vh;
      background: #000; overflow: hidden;
    }
    #__pres_stage .bg-media {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; z-index: 0; pointer-events: none;
      transform: translateZ(0);
    }
    #__pres_stage .bg-overlay {
      position: absolute; inset: 0; z-index: 1; pointer-events: none;
    }
    #__pres_stage .el {
      position: absolute;
      white-space: pre-wrap;
      line-height: 1.12;
      box-sizing: border-box;
      animation-fill-mode: both;
      overflow: hidden;
    }
    #__pres_stage .el.image { background: transparent; }
    #__pres_stage .el.image img {
      width: 100%; height: 100%;
      object-fit: contain; display: block;
      pointer-events: none;
    }
    #__pres_stage .el.image.cover img { object-fit: cover; }
    #__pres_stage .el.video-el { background: transparent; }
    #__pres_stage .el.video-el video {
      width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none;
    }
    #__pres_stage .el.video-el.key-black video { mix-blend-mode: screen; }
    #__pres_stage .el.video-el.key-light video { mix-blend-mode: multiply; }
    #__pres_stage .el.shape-el {
      background: transparent !important;
      overflow: visible !important;
    }
    #__pres_stage .el.shape-el .shape-body {
      position: absolute; inset: 0; pointer-events: none;
    }
    #__pres_stage .el.shape-el .shape-label {
      position: absolute; inset: 4px;
      display: flex; align-items: center; justify-content: center;
      text-align: center; overflow: hidden; word-break: break-word;
      line-height: 1.15; z-index: 2;
    }
    #__pres_stage .el.table-el { background: #fff; color: #17223a; overflow: hidden; }
    #__pres_stage .el.table-el table { border-collapse: collapse; width: 100%; height: 100%; table-layout: fixed; }
    #__pres_stage .el.table-el td { border: 1px solid #98a6bd; padding: 4px; font-size: inherit; vertical-align: middle; word-break: break-word; }
    #__pres_stage .el.table-el tr:first-child td { background: #4f8df7; color: #fff; font-weight: 700; }
    #__pres_stage .content-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
    #__pres_controls {
      position: fixed; z-index: 100000;
      right: 16px; bottom: 16px;
      display: flex; gap: 8px; align-items: center;
      padding: 8px 10px; border-radius: 9px;
      background: rgba(0,0,0,0.7); color: #fff; font: 13px Arial;
      backdrop-filter: blur(8px);
    }
    #__pres_controls button {
      border: 1px solid #9bb2d6; border-radius: 6px;
      background: #24344e; color: #fff;
      padding: 7px 10px; cursor: pointer; font: 700 12px Arial;
    }
    #__pres_controls button.voice-on { background: #a85008; border-color: #ffb11b; }
    ${BROLL_CSS}
  `;

  if (!$('__pres_overlay_styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = '__pres_overlay_styles';
    styleEl.textContent = OVERLAY_CSS;
    document.head.appendChild(styleEl);
  }

  // ── Fullscreen Overlay Player ──────────────────────────────────────────────
  function buildElement(el) {
    const node = document.createElement('div');
    const rot = Number(el.rotation) || 0;

    if (el.type === 'shape') {
      node.className = 'el shape-el';
      const fillVal = el.fill || el.fillColor || el.color || '#4f8df7';
      const strokeVal = el.stroke || el.borderColor || '#ffffff';
      const lineVal = el.line !== undefined ? Number(el.line) : 2;
      const opVal = (el.opacity !== undefined ? Number(el.opacity) : 100) / 100;
      node.style.cssText = `left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;transform:rotate(${rot}deg);transform-origin:center center;`;

      const body = document.createElement('div');
      body.className = 'shape-body';
      body.style.opacity = opVal;

      if (typeof window.getShapeSvg === 'function') {
        // Replace CSS variable tokens with actual values so SVG attributes render
        // correctly in all browsers (SVG presentation attributes don't inherit
        // CSS custom properties from parent divs).
        let svg = window.getShapeSvg(el.shape);
        svg = svg
          .replace(/var\(--sf[^)]*\)/g, fillVal)
          .replace(/var\(--ss[^)]*\)/g, strokeVal)
          .replace(/var\(--sl[^)]*\)/g, lineVal + 'px');
        body.innerHTML = svg;
      } else {
        body.style.background = fillVal;
        body.style.border = lineVal + 'px solid ' + strokeVal;
        body.style.borderRadius = el.shape === 'oval' ? '50%' : el.shape === 'round' ? '14px' : '0';
      }
      node.appendChild(body);

      if (el.text) {
        const label = document.createElement('div');
        label.className = 'shape-label';
        label.style.color = el.textColor || '#ffffff';
        label.style.fontSize = (el.textSize || 18) + 'px';
        label.style.fontWeight = el.textWeight || '700';
        label.style.fontFamily = el.fontFamily || 'Arial';
        label.style.textAlign = el.textAlign || 'center';
        label.style.justifyContent = el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center';
        label.textContent = el.text;
        node.appendChild(label);
      }

    } else if (el.type === 'image') {
      node.className = 'el image' + ((el.fit || 'contain') === 'cover' ? ' cover' : '');
      node.style.cssText = `left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;transform:rotate(${rot}deg);transform-origin:center center;`;
      const img = new Image();
      img.src = el.src;
      img.draggable = false;
      node.appendChild(img);

    } else if (el.type === 'video') {
      node.className = 'el video-el key-' + (el.transparency || 'none');
      node.style.cssText = `left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;transform:rotate(${rot}deg);transform-origin:center center;`;
      const vid = document.createElement('video');
      vid.src = el.src; vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
      vid.play().catch(() => {});
      node.appendChild(vid);

    } else if (el.type === 'table') {
      node.className = 'el table-el';
      node.style.cssText = `left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;transform:rotate(${rot}deg);transform-origin:center center;font-size:${el.textSize || 14}px;`;
      const table = document.createElement('table');
      (el.data || []).forEach((row, r) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      node.appendChild(table);

    } else {
      // text element — match editor's .text-el CSS properties exactly
      node.className = 'el text';
      const textAlign = el.textAlign || 'left';
      const lineH = el.lineHeight || 1.12;
      let css = `left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;`
        + `font-size:${el.size||el.textSize||18}px;`
        + `font-weight:${el.weight||el.textWeight||700};`
        + `font-family:${el.fontFamily||'Arial, "Noto Sans Bengali", sans-serif'};`
        + `text-align:${textAlign};`
        + `line-height:${lineH};`
        + `white-space:pre-wrap;word-break:break-word;`
        + `transform:rotate(${rot}deg);transform-origin:center center;`
        + `padding:4px;box-sizing:border-box;`;
      if (el.textGradient) {
        css += `background:linear-gradient(${el.textGradientAngle??90}deg,${el.color||'#fff'},${el.textGradientTo||'#4f8df7'});`
             + `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
      } else {
        css += `color:${el.color||el.textColor||'#fff'};`;
      }
      // text background color (if set by some modules)
      if (el.backgroundColor || el.bgColor) {
        css += `background-color:${el.backgroundColor||el.bgColor};`;
      }
      node.style.cssText = css;
      node.textContent = el.text || '';
    }

    return node;
  }

  function openPresenter() {
    // ── Step 1: Read the editor slide's actual rendered pixel size ────────────
    const editorSlide = $('slide');
    if (!editorSlide) return;
    const savedCurrent = current;
    const savedSelected = selected;

    // Measure before hiding (accurate layout)
    const slideW = editorSlide.offsetWidth  || 960;
    const slideH = editorSlide.offsetHeight || 540;

    // Hide editor slide so the render loop doesn't flash on screen
    editorSlide.style.visibility = 'hidden';

    // ── Step 2: Capture one clone per slide via the editor's own render() ─────
    const clones = [];
    for (let i = 0; i < slides.length; i++) {
      current = i; selected = null;
      render(); // full multi-module editor pipeline

      const clone = editorSlide.cloneNode(true);

      // ⬛ BUG FIX 1: cloneNode inherits inline visibility:hidden — clear it
      clone.style.visibility = 'visible';

      // ⬛ BUG FIX 2: keep a unique id so clones don't conflict; #slide CSS
      //   rules are what give the slide its dimensions & background. Instead
      //   of removing the id (which loses all CSS), we rename it.
      clone.id = '__pres_slide_' + i;
      clone.classList.add('pres-slide-clone');

      // Remove editor-only chrome
      clone.classList.remove('dragging');
      clone.querySelectorAll(
        '.smart-resize-handle,.rotate-handle,[data-editor-only],' +
        '.selection-overlay,.context-toolbar,.selection-handle,.drop-note'
      ).forEach(el => el.remove());
      clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      clone.querySelectorAll('[contenteditable]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
      });
      // Start hidden; shown by showSlide()
      clone.style.display = 'none';
      clone.style.pointerEvents = 'none';

      clones.push(clone);
    }

    // Restore editor
    current = savedCurrent; selected = savedSelected;
    editorSlide.style.visibility = '';
    render();

    // ── Step 3: CSS that makes the clones fill the fullscreen stage ──────────
    // The clones have the editor's pixel dimensions (e.g. 960×540).
    // We scale them up to fill the viewport using CSS transform.
    const existingStyle = $('__pres_clone_style');
    if (existingStyle) existingStyle.remove();
    const cloneStyle = document.createElement('style');
    cloneStyle.id = '__pres_clone_style';
    cloneStyle.textContent = `
      #__pres_stage {
        position: relative;
        overflow: hidden;
        background: #000;
      }
      .pres-slide-clone {
        position: absolute !important;
        inset: 0 !important;
        width: ${slideW}px !important;
        height: ${slideH}px !important;
        left: 50% !important;
        top: 50% !important;
        transform-origin: center center !important;
        transform: translate(-50%, -50%) scale(var(--pres-scale, 1)) !important;
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        cursor: default !important;
      }
    `;
    document.head.appendChild(cloneStyle);

    // ── Step 4: Build the overlay ─────────────────────────────────────────────
    const existing = $('__pres_overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '__pres_overlay';

    const stage = document.createElement('div');
    stage.id = '__pres_stage';
    clones.forEach(c => stage.appendChild(c));

    const controls = document.createElement('div');
    controls.id = '__pres_controls';
    controls.innerHTML = '<button id="__pres_voice">🎙 Voice: Off</button><span id="__pres_status">Click/→ next · ← back · Esc exit</span>';

    overlay.appendChild(stage);
    overlay.appendChild(controls);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Calculate scale to fit slide into viewport
    function recalcScale() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const scale = Math.min(vw / slideW, vh / slideH);
      document.documentElement.style.setProperty('--pres-scale', scale);
      stage.style.width = vw + 'px';
      stage.style.height = vh + 'px';
    }
    recalcScale();
    window.addEventListener('resize', recalcScale);

    let idx = 0, autoTimer = null, recognition = null, currentClone = null;

    function showSlide(i) {
      idx = ((i % clones.length) + clones.length) % clones.length;
      if (currentClone) currentClone.style.display = 'none';
      currentClone = clones[idx];
      currentClone.style.display = 'block';
      // Re-play video elements (cloneNode pauses them)
      currentClone.querySelectorAll('video').forEach(vid => {
        vid.muted = true; vid.loop = true;
        vid.play().catch(() => {});
      });
      // Re-trigger element animations
      const sl = slides[idx];
      (sl?.elements || []).forEach(el => {
        if (!el.animation || !animFrames[el.animation]) return;
        const node = currentClone.querySelector('.element[data-id="' + el.id + '"]');
        if (!node) return;
        node.getAnimations().forEach(a => a.cancel());
        node.animate(animFrames[el.animation], {
          duration: Math.max(.1, Number(el.animationDuration) || .6) * 1000,
          delay: Math.max(0, Number(el.animationDelay) || 0) * 1000,
          iterations: el.animationLoop ? Infinity : 1,
          easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both'
        });
      });
      clearTimeout(autoTimer);
      if (Number(sl?.autoDuration) > 0)
        autoTimer = setTimeout(() => showSlide(idx + 1), Number(sl.autoDuration) * 1000);
    }

    function advance(step) { showSlide(idx + step); }

    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
      else if (e.key === 'Escape') { closePlayer(); }
    }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (!e.target.closest('#__pres_controls')) advance(1); });

    function stopVoice() {
      if (recognition) { recognition.onend = null; recognition.stop(); recognition = null; }
      const vb = $('__pres_voice');
      if (vb) { vb.textContent = '🎙 Voice: Off'; vb.classList.remove('voice-on'); }
    }

    function startVoice() {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      const statusEl = $('__pres_status');
      if (!Speech) { if (statusEl) statusEl.textContent = 'Voice recognition পাওয়া যায়নি'; return; }
      recognition = new Speech();
      recognition.lang = 'bn-BD'; recognition.continuous = true; recognition.interimResults = false;
      recognition.onresult = e => {
        for (let n = e.resultIndex; n < e.results.length; n++) {
          if (!e.results[n].isFinal) continue;
          const w = e.results[n][0].transcript.toLowerCase();
          if (/next|forward|নেক্সট|পরের|আগামী/.test(w)) advance(1);
          else if (/back|previous|ব্যাক|আগের|পেছ/.test(w)) advance(-1);
          else if (/exit|close|বন্ধ/.test(w)) closePlayer();
        }
      };
      recognition.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') stopVoice(); };
      recognition.onend = () => { if (recognition) try { recognition.start(); } catch(_) {} };
      recognition.start();
      const vb = $('__pres_voice');
      if (vb) { vb.textContent = '🎙 Voice: On'; vb.classList.add('voice-on'); }
      if (statusEl) statusEl.textContent = 'বলুন: next / নেক্সট / back / ব্যাক / exit';
    }

    const voiceBtn = $('__pres_voice');
    if (voiceBtn) voiceBtn.onclick = e => { e.stopPropagation(); recognition ? stopVoice() : startVoice(); };

    function closePlayer() {
      clearTimeout(autoTimer); stopVoice();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', recalcScale);
      document.body.style.overflow = '';
      $('__pres_clone_style')?.remove();
      overlay.remove();
    }

    showSlide(savedCurrent);
  }


  // ── Assign the SINGLE authoritative presentBtn handler ───────────────────
  // Use a MutationObserver + setTimeout to ensure this runs LAST,
  // after all other modules have registered their handlers.
  function assignPresenter() {
    const btn = $('presentBtn');
    if (btn) {
      // Replace all onclick handlers by cloning the button
      const fresh = btn.cloneNode(true);
      btn.parentNode?.replaceChild(fresh, btn);
      fresh.onclick = e => {
        e.stopImmediatePropagation();
        openPresenter();
      };
    }
  }

  // Run after all scripts have had a chance to assign their handlers
  window.addEventListener('load', assignPresenter);
  setTimeout(assignPresenter, 200);
  setTimeout(assignPresenter, 800);

  // ── Undo/Redo & History ───────────────────────────────────────────────────
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
    if (undoStates.length > 80) undoStates.shift();
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
    selected = null; undoIndex = target;
    render(); undoStamp = JSON.stringify({slides, current});
    restoringHistory = false; refreshUndoButtons();
  };
  if (undoButton) undoButton.onclick = () => restoreHistory(undoIndex - 1);
  if (redoButton) redoButton.onclick = () => restoreHistory(undoIndex + 1);

  const renderWithHistory = render;
  render = function() { renderWithHistory(); };
  window.addEventListener('input', () => setTimeout(recordHistory, 0), true);
  window.addEventListener('change', () => setTimeout(recordHistory, 0), true);
  window.addEventListener('pointerup', () => setTimeout(recordHistory, 0), true);

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault(); $('saveProject')?.click(); return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault(); restoreHistory(event.shiftKey ? undoIndex + 1 : undoIndex - 1); return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault(); restoreHistory(undoIndex + 1); return;
    }
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.toolbar-group.open').forEach(x => x.classList.remove('open'));
    ['textToolsMenu','colorPop','shapeGallery','tablePicker','assetDrawer','smartDesigner','soundtrackPanel','textGradientAppearance','iconLibrary']
      .forEach(id => $(id)?.classList.add('hidden'));
  }, true);

  // ── Toolbar groups ────────────────────────────────────────────────────────
  const top = document.querySelector('.top');
  if (top && !document.getElementById('toolbarGroups')) {
    const groups = document.createElement('div'); groups.id = 'toolbarGroups';
    const definitions = [
      ['slide','Slide',['newSlide','duplicateSlide']],
      ['insert','Insert',['addText','imageInput','assetBtn','addShape','addTable']],
      ['design','Design',['textTools']],
      ['export','Export',['saveProject','loadProject','downloadSlideshow','exportVideo']],
      ['present','Present',['previewSlideBtn','presentBtn']]
    ];
    definitions.forEach(([key, title, ids]) => {
      const wrap = document.createElement('div'); wrap.className = 'toolbar-group';
      const trigger = document.createElement('button'); trigger.className = 'toolbar-trigger'; trigger.type = 'button'; trigger.textContent = title + ' ▾';
      const menu = document.createElement('div'); menu.className = 'toolbar-menu'; menu.dataset.menu = key;
      trigger.onclick = event => { event.stopPropagation(); const opening = !wrap.classList.contains('open'); groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); wrap.classList.toggle('open', opening); };
      ids.forEach(id => { const control = id === 'imageInput' ? $('imageInput')?.closest('label') : $(id); if (control) menu.appendChild(control); });
      wrap.append(trigger, menu); groups.appendChild(wrap);
    });
    const more = document.createElement('div'); more.className = 'toolbar-group';
    const moreTrigger = document.createElement('button'); moreTrigger.className = 'toolbar-trigger'; moreTrigger.type = 'button'; moreTrigger.textContent = 'More ▾';
    const moreMenu = document.createElement('div'); moreMenu.className = 'toolbar-menu';
    moreTrigger.onclick = event => { event.stopPropagation(); const opening = !more.classList.contains('open'); groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); more.classList.toggle('open', opening); };
    more.append(moreTrigger, moreMenu); groups.appendChild(more);
    top.querySelectorAll(':scope > button, :scope > label.file-label').forEach(control => { if (control !== moreTrigger && !control.closest('#toolbarGroups') && !control.classList.contains('brand')) moreMenu.appendChild(control); });
    top.querySelector('.brand')?.after(groups);
    if (!moreMenu.children.length) more.remove();
    document.addEventListener('pointerdown', event => { if (!groups.contains(event.target)) groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open')); });
    document.head.insertAdjacentHTML('beforeend', '<style>.top{overflow:visible!important;gap:9px}.top .brand{margin-right:8px!important}.toolbar-groups,#toolbarGroups{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.toolbar-group{position:relative}.toolbar-trigger{white-space:nowrap;background:#18253a}.toolbar-menu{display:none;position:absolute;z-index:150;top:calc(100% + 7px);left:0;width:min(720px,calc(100vw - 32px));min-width:260px;padding:8px;background:#111b2c;border:1px solid #50617d;border-radius:9px;box-shadow:0 18px 48px #000c}.toolbar-group.open>.toolbar-menu{display:flex;flex-flow:row wrap;align-items:center;gap:6px}.toolbar-menu button,.toolbar-menu .file-label{width:auto;flex:0 1 auto;text-align:left;white-space:nowrap}.toolbar-menu #presentBtn{background:#1769e8;border-color:#79abff}.toolbar-menu #saveProject,.toolbar-menu #downloadSlideshow{background:#0f766e;border-color:#50c7b5}.toolbar-menu #exportVideo{background:#7c3aed;border-color:#b9a0ff}@media(max-width:900px){#toolbarGroups{flex-wrap:nowrap}.top{overflow-x:auto!important}.toolbar-menu{width:min(520px,calc(100vw - 24px))}}</style>');
  }

  refreshUndoButtons();
  render();
})();
