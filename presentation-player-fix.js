(()=>{
  const $ = id => document.getElementById(id);

  // ── Horizontal Ribbon Toolbar (Side-by-Side) ──
  function organizeToolbar() {
    const top = document.querySelector('.top');
    if (!top) return;

    let groups = document.getElementById('toolbarGroups');
    if (!groups) {
      groups = document.createElement('div');
      groups.id = 'toolbarGroups';
      const brand = top.querySelector('.brand');
      if (brand) brand.after(groups);
      else top.prepend(groups);
    }

    const tabs = [
      {
        key: 'slide',
        title: 'Slide ▾',
        ids: ['newSlide', 'duplicateSlide', 'deleteSlide', 'templateBtn']
      },
      {
        key: 'insert',
        title: 'Insert ▾',
        ids: ['addText', 'imageInput', 'assetBtn', 'addShape', 'add3dShape', 'addTable', 'addChart', 'addGlassCard', 'addHotspot', 'saveAssetBtn']
      },
      {
        key: 'design',
        title: 'Design ▾',
        ids: ['smartDesignerBtn', 'magicDeckBtn', 'colorToolbarBtn', 'colorBtn', 'brandKitBtn', 'textTools', 'btnElementAnimation']
      },
      {
        key: 'export',
        title: 'Export ▾',
        ids: ['saveProject', 'loadProject', 'downloadSlideshow', 'exportVideo']
      },
      {
        key: 'present',
        title: 'Present ▾',
        ids: ['presentBtn', 'previewSlideBtn', 'presenterView', 'deckTimingBtn', 'soundtrackBtn']
      }
    ];

    tabs.forEach(tab => {
      let wrap = groups.querySelector('.toolbar-group[data-group="' + tab.key + '"]');
      let menu;
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'toolbar-group';
        wrap.dataset.group = tab.key;

        const trigger = document.createElement('button');
        trigger.className = 'toolbar-trigger';
        trigger.type = 'button';
        trigger.textContent = tab.title;

        menu = document.createElement('div');
        menu.className = 'toolbar-menu';
        menu.dataset.menu = tab.key;

        trigger.onclick = event => {
          event.stopPropagation();
          const wasOpen = wrap.classList.contains('open');
          document.querySelectorAll('#toolbarGroups .toolbar-group').forEach(x => x.classList.remove('open'));
          if (!wasOpen) wrap.classList.add('open');
        };

        wrap.append(trigger, menu);
        groups.appendChild(wrap);
      } else {
        menu = wrap.querySelector('.toolbar-menu');
      }

      tab.ids.forEach(id => {
        let control = id === 'imageInput' ? $('imageInput')?.closest('label') : $(id);
        if (!control) {
          if (id === 'previewSlideBtn') {
            control = document.createElement('button');
            control.id = 'previewSlideBtn';
            control.textContent = '🎬 Preview Current Slide';
            control.title = 'Preview only the currently active slide';
            menu.appendChild(control);
          }
          if (id === 'addChart') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Chart'));
          if (id === 'addGlassCard') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Glass'));
          if (id === 'magicDeckBtn') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Magic Deck'));
          if (id === 'smartDesignerBtn') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Smart Design'));
          if (id === 'colorToolbarBtn' || id === 'colorBtn') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Color'));
          if (id === 'btnElementAnimation') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Animate'));
          if (id === 'deckTimingBtn') control = Array.from(top.querySelectorAll('button')).find(b => b.textContent.includes('Timing'));
        }

        if (control && control.parentElement !== menu) {
          control.style.margin = '0';
          menu.appendChild(control);
        }
      });
    });

    // Label clarify
    const pBtn = $('presentBtn');
    if (pBtn) {
      pBtn.textContent = '▶ Play Slideshow (All Slides)';
      pBtn.title = 'Play full multi-slide presentation starting from beginning';
    }
    const pvBtn = $('presenterView') || $('previewSlideBtn');
    if (pvBtn) {
      pvBtn.textContent = '🎬 Preview Current Slide';
      pvBtn.title = 'Preview only the currently active running slide';
    }
  }

  // Inject Styles (Horizontal Layout 'flex-flow: row wrap')
  let s = document.getElementById('toolbarGroupStyles');
  if (!s) {
    s = document.createElement('style');
    s.id = 'toolbarGroupStyles';
    document.head.appendChild(s);
  }
  s.textContent = `
    .top {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      overflow: visible !important;
      padding: 6px 16px !important;
      background: #090f1d !important;
      border-bottom: 1px solid #1e2d48 !important;
      position: relative !important;
      z-index: 1000 !important;
    }
    .top .brand {
      margin-right: 10px !important;
      font-weight: 800 !important;
      font-size: 15px !important;
      white-space: nowrap !important;
    }
    #toolbarGroups {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      flex-wrap: nowrap !important;
      position: relative !important;
      z-index: 1001 !important;
    }
    .toolbar-group {
      position: relative !important;
    }
    .toolbar-trigger {
      padding: 7px 14px !important;
      background: #152238 !important;
      border: 1px solid #2e4368 !important;
      border-radius: 7px !important;
      color: #e2ecff !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      white-space: nowrap !important;
      user-select: none !important;
    }
    .toolbar-trigger:hover, .toolbar-group.open .toolbar-trigger {
      background: #1769e8 !important;
      border-color: #79abff !important;
      color: #fff !important;
      box-shadow: 0 4px 12px rgba(23, 105, 232, 0.4) !important;
    }
    .toolbar-menu {
      display: none !important;
      position: absolute !important;
      top: calc(100% + 6px) !important;
      left: 0 !important;
      z-index: 99999 !important;
      width: max-content !important;
      max-width: 680px !important;
      min-width: 260px !important;
      background: #0d1627 !important;
      border: 1px solid #364d73 !important;
      border-radius: 10px !important;
      box-shadow: 0 16px 40px rgba(0,0,0,0.85) !important;
      padding: 8px 10px !important;
      gap: 8px !important;
      backdrop-filter: blur(14px) !important;
    }
    .toolbar-group.open .toolbar-menu {
      display: flex !important;
      flex-flow: row wrap !important;
      align-items: center !important;
    }
    .toolbar-menu button, .toolbar-menu label.file-label, .toolbar-menu label {
      width: auto !important;
      flex: 0 0 auto !important;
      padding: 7px 12px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      border-radius: 6px !important;
      border: 1px solid #2e4368 !important;
      background: #16243b !important;
      color: #cbdcf7 !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-sizing: border-box !important;
      transition: all 0.12s !important;
    }
    .toolbar-menu button:hover, .toolbar-menu label:hover {
      background: #24395c !important;
      color: #fff !important;
      border-color: #4f8df7 !important;
      transform: translateY(-1px) !important;
    }
    .toolbar-menu #presentBtn {
      background: #1769e8 !important;
      border-color: #79abff !important;
      color: #fff !important;
      font-weight: 700 !important;
    }
    .toolbar-menu #presenterView, .toolbar-menu #previewSlideBtn {
      background: #4f46e5 !important;
      border-color: #a5b4fc !important;
      color: #fff !important;
      font-weight: 700 !important;
    }
  `;

  document.addEventListener('pointerdown', event => {
    const groups = document.getElementById('toolbarGroups');
    if (groups && !groups.contains(event.target)) {
      groups.querySelectorAll('.toolbar-group').forEach(x => x.classList.remove('open'));
    }
  });

  // ── ON-DEMAND PRESENTER ENGINE ──
  // singleSlideOnly = true -> Previews ONLY the running active slide
  // singleSlideOnly = false -> Full Slideshow across all slides
  function openPresenter(singleSlideOnly = false) {
    if (!slides.length) return;

    const slideW = 960;
    const slideH = 540;

    const existingStyle = $('__pres_fast_style');
    if (existingStyle) existingStyle.remove();
    const style = document.createElement('style');
    style.id = '__pres_fast_style';
    style.textContent = `
      #__pres_overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 999999 !important;
        background: #000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: 'Outfit', 'Inter', Arial, 'Noto Sans Bengali', sans-serif !important;
        overflow: hidden !important;
        user-select: none !important;
      }
      #__pres_stage_container {
        position: relative !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #000 !important;
      }
      #__pres_stage {
        position: relative !important;
        width: ${slideW}px !important;
        height: ${slideH}px !important;
        transform-origin: center center !important;
        transform: scale(var(--pres-scale, 1)) !important;
        background: #17233c !important;
        box-shadow: 0 0 50px rgba(0,0,0,0.9) !important;
        overflow: hidden !important;
      }
      #__pres_controls {
        position: fixed !important;
        z-index: 1000000 !important;
        right: 24px !important;
        bottom: 24px !important;
        display: flex !important;
        gap: 10px !important;
        align-items: center !important;
        padding: 8px 16px !important;
        border-radius: 40px !important;
        background: rgba(10, 16, 30, 0.88) !important;
        color: #fff !important;
        backdrop-filter: blur(14px) !important;
        border: 1px solid rgba(80, 120, 180, 0.4) !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.7) !important;
      }
      #__pres_controls button {
        border: 1px solid #4a6288 !important;
        border-radius: 20px !important;
        background: #1c2b42 !important;
        color: #fff !important;
        padding: 6px 14px !important;
        cursor: pointer !important;
        font-weight: 700 !important;
        font-size: 12.5px !important;
        transition: all 0.15s !important;
      }
      #__pres_controls button:hover {
        background: #2d456b !important;
        border-color: #79abff !important;
      }
      #__pres_controls button.voice-on {
        background: #a85008 !important;
        border-color: #ffb11b !important;
      }
    `;
    document.head.appendChild(style);

    const existing = $('__pres_overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = '__pres_overlay';

    const stageContainer = document.createElement('div');
    stageContainer.id = '__pres_stage_container';

    const stage = document.createElement('div');
    stage.id = '__pres_stage';
    stageContainer.appendChild(stage);

    const controls = document.createElement('div');
    controls.id = '__pres_controls';

    if (singleSlideOnly) {
      // Single Current Slide Preview Mode
      controls.innerHTML = '<span id="__pres_status" style="font-size:13px;color:#ffd166;font-weight:800;padding:0 6px">🎬 Running Slide Preview (Slide ' + ((current || 0) + 1) + ')</span><button id="__pres_replay" style="background:#0284c7;border-color:#38bdf8">↺ Replay Slide</button><button id="__pres_fs">⛶ Fullscreen</button><button id="__pres_exit" style="background:#be123c;border-color:#fb7185">✕ Exit Preview</button>';
    } else {
      // Full Multi-Slide Slideshow Mode
      controls.innerHTML = '<button id="__pres_prev">◀ Prev</button><span id="__pres_status" style="font-size:13px;color:#ffd166;font-weight:800;padding:0 6px">1 / ' + slides.length + '</span><button id="__pres_next">Next ▶</button><button id="__pres_voice">🎤 Voice</button><button id="__pres_fs">⛶ Fullscreen</button><button id="__pres_exit" style="background:#be123c;border-color:#fb7185">✕ Exit</button>';
    }

    overlay.appendChild(stageContainer);
    overlay.appendChild(controls);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function recalcScale() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const scale = Math.min(vw / slideW, vh / slideH);
      document.documentElement.style.setProperty('--pres-scale', scale);
    }
    recalcScale();
    window.addEventListener('resize', recalcScale);

    let idx = singleSlideOnly ? (current || 0) : 0, autoTimer = null, recognition = null;

    // High-speed on-demand slide builder
    function renderPresenterSlide(i) {
      idx = singleSlideOnly ? (current || 0) : (((i % slides.length) + slides.length) % slides.length);
      const sl = slides[idx];
      stage.replaceChildren();

      // 1. Background
      if (sl.background === 'custom') {
        stage.style.background = sl.bgColor || '#17233c';
        stage.style.backgroundImage = '';
      } else if (sl.background === 'image' && sl.bgImage) {
        stage.style.backgroundImage = 'url("' + sl.bgImage + '")';
        stage.style.backgroundSize = 'cover';
        stage.style.backgroundPosition = 'center';
      } else {
        stage.style.background = (typeof themes !== 'undefined' && themes[sl.background]) ? themes[sl.background] : '#17233c';
        stage.style.backgroundImage = '';
      }

      // 2. B-Roll Layer
      if (sl.brollPreset && sl.brollPreset !== 'none') {
        const broll = document.createElement('div');
        broll.id = 'brollLayer';
        broll.className = sl.brollPreset + ' speed-' + (sl.brollSpeed || 'normal');
        stage.appendChild(broll);
      }

      // 3. Media Background (Video or Image)
      if (sl.bgMedia) {
        const media = document.createElement(sl.bgMediaType === 'video' ? 'video' : 'img');
        media.className = 'bg-media';
        media.src = sl.bgMedia;
        media.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;';
        if (media.tagName === 'VIDEO') {
          media.autoplay = true; media.loop = true; media.muted = true; media.playsInline = true;
          media.playbackRate = Number(sl.bgPlaybackRate || 1);
          media.play().catch(() => {});
        }
        media.style.opacity = (sl.bgMediaOpacity !== undefined ? sl.bgMediaOpacity : 100) / 100;
        if (sl.bgMediaBlur) media.style.filter = 'blur(' + sl.bgMediaBlur + 'px)';
        stage.appendChild(media);

        if (sl.bgOverlayOpacity) {
          const ov = document.createElement('div');
          const hex = Math.round((sl.bgOverlayOpacity / 100) * 255).toString(16).padStart(2, '0');
          ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;background:' + (sl.bgOverlayColor || '#000000') + hex + ';';
          stage.appendChild(ov);
        }
      }

      // 4. Content Elements Layer
      const contentLayer = document.createElement('div');
      contentLayer.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;';
      stage.appendChild(contentLayer);

      const frames = window.animFrames || {};

      (sl.elements || []).forEach(el => {
        const node = document.createElement('div');
        const rot = Number(el.rotation) || 0;

        if (el.type === 'shape') {
          node.className = 'element shape-el' + (el.shape ? ' shape-' + el.shape : '');
          const fillVal = el.fill || el.fillColor || el.bgColor || el.color || '#4f8df7';
          const strokeVal = el.stroke || el.borderColor || el.lineColor || '#ffffff';
          const lineVal = el.line !== undefined ? Number(el.line) : 2;
          let opVal = 1;
          if (el.opacity !== undefined) {
            const num = Number(el.opacity);
            opVal = num <= 1 ? num : num / 100;
          }
          node.style.cssText = 'position:absolute;left:' + el.x + '%;top:' + el.y + '%;width:' + el.w + '%;height:' + el.h + '%;transform:rotate(' + rot + 'deg);transform-origin:center center;background:transparent;overflow:visible;';

          const body = document.createElement('div');
          body.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:' + opVal + ';';
          const svgFn = window.getShapeSvg;
          if (typeof svgFn === 'function') {
            let svg = svgFn(el.shape);
            svg = svg.replace(/var\(--sf[^)]*\)/g, fillVal)
                     .replace(/var\(--ss[^)]*\)/g, strokeVal)
                     .replace(/var\(--sl[^)]*\)/g, lineVal + 'px');
            body.innerHTML = svg;
          }
          node.appendChild(body);

          if (el.text) {
            const label = document.createElement('div');
            const txtColor = el.textColor || el.color || '#ffffff';
            const txtSize = Number(el.textSize || el.size || 18);
            const txtWeight = el.textWeight || el.weight || '700';
            label.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:' + (el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center') + ';text-align:' + (el.textAlign || 'center') + ';color:' + txtColor + ';font-size:' + txtSize + 'px;font-weight:' + txtWeight + ';font-family:' + (el.fontFamily || 'Inter, Arial, sans-serif') + ';line-height:1.25;word-break:break-word;overflow-wrap:break-word;white-space:pre-wrap;padding:8px 12px;box-sizing:border-box;z-index:2;';
            label.textContent = el.text;
            node.appendChild(label);
          }
        } else if (el.type === 'image') {
          node.style.cssText = 'position:absolute;left:' + el.x + '%;top:' + el.y + '%;width:' + el.w + '%;height:' + el.h + '%;transform:rotate(' + rot + 'deg);transform-origin:center center;overflow:hidden;';
          const img = new Image();
          img.src = el.src;
          img.style.cssText = 'width:100%;height:100%;object-fit:' + (el.fit || 'contain') + ';display:block;';
          node.appendChild(img);
        } else if (el.type === 'video') {
          node.style.cssText = 'position:absolute;left:' + el.x + '%;top:' + el.y + '%;width:' + el.w + '%;height:' + el.h + '%;transform:rotate(' + rot + 'deg);transform-origin:center center;overflow:hidden;';
          const vid = document.createElement('video');
          vid.src = el.src; vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
          vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          vid.play().catch(() => {});
          node.appendChild(vid);
        } else if (el.type === 'table') {
          node.style.cssText = 'position:absolute;left:' + el.x + '%;top:' + el.y + '%;width:' + el.w + '%;height:' + el.h + '%;transform:rotate(' + rot + 'deg);transform-origin:center center;font-size:' + (el.textSize || 14) + 'px;background:#fff;color:#17223a;overflow:hidden;';
          const table = document.createElement('table');
          table.style.cssText = 'border-collapse:collapse;width:100%;height:100%;table-layout:fixed;';
          (el.data || []).forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
              const td = document.createElement('td');
              td.style.cssText = 'border:1px solid #98a6bd;padding:4px;vertical-align:middle;word-break:break-word;';
              td.textContent = cell;
              tr.appendChild(td);
            });
            table.appendChild(tr);
          });
          node.appendChild(table);
        } else {
          // Regular text element
          const textAlign = el.textAlign || 'center';
          const fontW = el.weight || el.textWeight || '700';
          const txtColor = el.color || el.textColor || '#ffffff';
          const txtSize = Number(el.size || el.textSize || 38);
          const pad = (el.padding !== undefined ? el.padding : 6) + 'px';

          let css = 'position:absolute;left:' + el.x + '%;top:' + el.y + '%;width:' + el.w + '%;height:' + el.h + '%;font-size:' + txtSize + 'px;font-weight:' + fontW + ';font-family:' + (el.fontFamily || 'Inter, Arial, sans-serif') + ';text-align:' + textAlign + ';line-height:' + (el.lineSpacing || 1.2) + ';padding:' + pad + ';transform:rotate(' + rot + 'deg);transform-origin:center center;white-space:pre-wrap;word-break:break-word;box-sizing:border-box;';

          const boxBgColor = el.boxBg || el.backgroundColor || el.bgColor || (el.background && el.background.startsWith('#') ? el.background : null);
          let boxOp = 1;
          if (el.boxOpacity !== undefined) {
            const num = Number(el.boxOpacity);
            boxOp = num <= 1 ? num : num / 100;
          }
          if (boxBgColor && boxBgColor !== 'transparent' && boxOp > 0) {
            if (boxBgColor.startsWith('#') && boxOp < 1) {
              const hex = boxBgColor.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16) || 0,
                    g = parseInt(hex.substring(2, 4), 16) || 0,
                    b = parseInt(hex.substring(4, 6), 16) || 0;
              css += 'background-color:rgba(' + r + ',' + g + ',' + b + ',' + boxOp + ');border-radius:6px;';
            } else {
              css += 'background-color:' + boxBgColor + ';border-radius:6px;';
            }
            css += 'display:flex;align-items:center;justify-content:' + (textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center') + ';';
          }
          if (el.textGradient) {
            css += 'background:linear-gradient(' + (el.textGradientAngle ?? 90) + 'deg, ' + txtColor + ', ' + (el.textGradientTo || '#4f8df7') + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
          } else {
            css += 'color:' + txtColor + ';';
          }
          node.style.cssText = css;
          node.textContent = el.text || '';
        }

        contentLayer.appendChild(node);

        // Apply element animation with infinite loop support
        if (el.animation && frames[el.animation]) {
          node.animate(frames[el.animation], {
            duration: Math.max(0.1, Number(el.animationDuration) || 0.6) * 1000,
            delay: Math.max(0, Number(el.animationDelay) || 0) * 1000,
            iterations: el.animationLoop ? Infinity : 1,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            fill: 'both'
          });
        }
      });

      if (!singleSlideOnly) {
        $('__pres_status').textContent = (idx + 1) + ' / ' + slides.length;
        clearTimeout(autoTimer);
        if (Number(sl.autoDuration) > 0)
          autoTimer = setTimeout(() => advance(1), Number(sl.autoDuration) * 1000);
      }
    }

    function advance(step) {
      if (singleSlideOnly) return;
      renderPresenterSlide(idx + step);
    }

    function onKey(e) {
      if (singleSlideOnly) {
        if (e.key === 'Escape') closePlayer();
        if (e.key === 'r' || e.key === 'R') renderPresenterSlide(idx);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') { e.preventDefault(); advance(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); advance(-1); }
      else if (e.key === 'Home') { renderPresenterSlide(0); }
      else if (e.key === 'End') { renderPresenterSlide(slides.length - 1); }
      else if (e.key === 'Escape') { closePlayer(); }
    }
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('click', e => {
      if (e.target.closest('#__pres_controls')) return;
      if (!singleSlideOnly) advance(1);
    });

    if (singleSlideOnly) {
      const rep = $('__pres_replay');
      if (rep) rep.onclick = e => { e.stopPropagation(); renderPresenterSlide(idx); };
    } else {
      $('__pres_prev').onclick = e => { e.stopPropagation(); advance(-1); };
      $('__pres_next').onclick = e => { e.stopPropagation(); advance(1); };
    }

    $('__pres_exit').onclick = e => { e.stopPropagation(); closePlayer(); };
    $('__pres_fs').onclick = e => {
      e.stopPropagation();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    };

    function stopVoice() {
      if (recognition) { recognition.onend = null; recognition.stop(); recognition = null; }
      $('__pres_voice')?.classList.remove('voice-on');
    }
    function startVoice() {
      const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Speech) return;
      recognition = new Speech();
      recognition.lang = 'bn-BD';
      recognition.continuous = true;
      recognition.onresult = e => {
        for (let n = e.resultIndex; n < e.results.length; n++) {
          if (!e.results[n].isFinal) continue;
          const w = e.results[n][0].transcript.toLowerCase();
          if (/next|forward|সামনে|পরবর্তী|পরেরটা/.test(w)) advance(1);
          else if (/back|previous|পেছনে|আগেরটা|আগের/.test(w)) advance(-1);
        }
      };
      recognition.onerror = stopVoice;
      recognition.onend = () => { if (recognition) try { recognition.start(); } catch(_) {} };
      recognition.start();
      $('__pres_voice')?.classList.add('voice-on');
    }
    if ($('__pres_voice')) {
      $('__pres_voice').onclick = e => { e.stopPropagation(); recognition ? stopVoice() : startVoice(); };
    }

    function closePlayer() {
      clearTimeout(autoTimer); stopVoice();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', recalcScale);
      document.body.style.overflow = '';
      $('__pres_fast_style')?.remove();
      overlay.remove();
    }

    renderPresenterSlide(idx);
  }

  window.openPresenterMaster = openPresenter;

  function bindButtons() {
    organizeToolbar();
    const pBtn = $('presentBtn');
    if (pBtn) {
      pBtn.onclick = e => {
        if (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
        openPresenter(false); // Full slideshow from slide 1
      };
    }
    const prevBtn = $('previewSlideBtn') || $('presenterView');
    if (prevBtn) {
      prevBtn.onclick = e => {
        if (e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
        openPresenter(true); // Preview ONLY the currently active running slide
      };
    }
  }

  window.addEventListener('load', bindButtons);
  setTimeout(bindButtons, 50);
  setTimeout(bindButtons, 200);
  setTimeout(bindButtons, 600);
  setTimeout(bindButtons, 1200);
})();
