(() => {
  const $ = id => document.getElementById(id);

  const defs = [
    // Lines
    ['line', 'Straight Line', 'Lines'],
    ['arrowLineRight', 'Arrow Line Right', 'Lines'],
    ['arrowLineLeft', 'Arrow Line Left', 'Lines'],
    ['doubleArrowLine', 'Double Arrow Line', 'Lines'],
    // Basic Shapes
    ['rect', 'Rectangle', 'Basic Shapes'],
    ['round', 'Rounded Rectangle', 'Basic Shapes'],
    ['oval', 'Oval', 'Basic Shapes'],
    ['triangle', 'Triangle', 'Basic Shapes'],
    ['rightTriangle', 'Right Triangle', 'Basic Shapes'],
    ['diamond', 'Diamond', 'Basic Shapes'],
    ['parallelogram', 'Parallelogram', 'Basic Shapes'],
    ['trapezoid', 'Trapezoid', 'Basic Shapes'],
    ['pentagon', 'Pentagon', 'Basic Shapes'],
    ['hexagon', 'Hexagon', 'Basic Shapes'],
    // Block Arrows
    ['chevron', 'Chevron', 'Block Arrows'],
    ['arrowRight', 'Right Arrow', 'Block Arrows'],
    ['arrowLeft', 'Left Arrow', 'Block Arrows'],
    ['arrowUp', 'Up Arrow', 'Block Arrows'],
    ['arrowDown', 'Down Arrow', 'Block Arrows'],
    // Stars & Callouts
    ['star5', '5 Point Star', 'Stars & Banners'],
    ['star4', '4 Point Star', 'Stars & Banners'],
    ['heart', 'Heart', 'Stars & Banners'],
    ['cloud', 'Cloud', 'Stars & Banners'],
    ['callout', 'Speech Callout', 'Callouts'],
    ['thought', 'Thought Bubble', 'Callouts']
  ];

  function getShapeSvg(shape) {
    const s = shape || 'rect';
    switch(s) {
      // Lines
      case 'line':
        return `<svg viewBox="0 0 100 20" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><line x1="0" y1="10" x2="100" y2="10" stroke="var(--sf, #4f8df7)" stroke-width="var(--sl, 4px)" stroke-linecap="round" /></svg>`;
      case 'arrowLineRight':
        return `<svg viewBox="0 0 100 20" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><line x1="0" y1="10" x2="86" y2="10" stroke="var(--sf, #4f8df7)" stroke-width="var(--sl, 4px)" stroke-linecap="round" /><polygon points="84,2 100,10 84,18" fill="var(--sf, #4f8df7)" /></svg>`;
      case 'arrowLineLeft':
        return `<svg viewBox="0 0 100 20" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><line x1="14" y1="10" x2="100" y2="10" stroke="var(--sf, #4f8df7)" stroke-width="var(--sl, 4px)" stroke-linecap="round" /><polygon points="16,2 0,10 16,18" fill="var(--sf, #4f8df7)" /></svg>`;
      case 'doubleArrowLine':
        return `<svg viewBox="0 0 100 20" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><line x1="14" y1="10" x2="86" y2="10" stroke="var(--sf, #4f8df7)" stroke-width="var(--sl, 4px)" /><polygon points="16,2 0,10 16,18" fill="var(--sf, #4f8df7)" /><polygon points="84,2 100,10 84,18" fill="var(--sf, #4f8df7)" /></svg>`;
      
      // Block Arrows
      case 'arrowRight':
        return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="0,15 62,15 62,0 100,25 62,50 62,35 0,35" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'arrowLeft':
        return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="38,0 38,15 100,15 100,35 38,35 38,50 0,25" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'arrowUp':
        return `<svg viewBox="0 0 50 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="25,0 50,38 35,38 35,100 15,100 15,38 0,38" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'arrowDown':
        return `<svg viewBox="0 0 50 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="15,0 35,0 35,62 50,62 25,100 0,62 15,62" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'chevron':
        return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="0,0 70,0 100,25 70,50 0,50 30,25" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;

      // Basic Shapes
      case 'round':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><rect x="2" y="2" width="96" height="56" rx="14" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
      case 'oval':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><ellipse cx="50" cy="30" rx="48" ry="28" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
      case 'diamond':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="50,2 98,30 50,58 2,30" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'triangle':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="50,2 98,58 2,58" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'rightTriangle':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="2,2 98,58 2,58" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'parallelogram':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="20,2 98,2 80,58 2,58" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'trapezoid':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="20,2 80,2 98,58 2,58" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'pentagon':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="50,2 98,22 80,58 20,58 2,22" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'hexagon':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="25,2 75,2 98,30 75,58 25,58 2,30" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'star5':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'star4':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="50,0 62,38 100,50 62,62 50,100 38,62 0,50 38,38" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'heart':
        return `<svg viewBox="0 0 100 90" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="M50,85 C20,60 0,38 0,20 C0,8 8,0 22,0 C34,0 44,8 50,18 C56,8 66,0 78,0 C92,0 100,8 100,20 C100,38 80,60 50,85 Z" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
      case 'cloud':
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="M25,50 C12,50 0,40 0,28 C0,18 8,10 18,8 C22,2 32,0 40,4 C48,-2 62,-1 70,6 C78,6 88,14 88,24 C96,26 100,34 100,42 C100,50 90,50 85,50 Z" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
      case 'callout':
        return `<svg viewBox="0 0 100 70" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polygon points="0,0 100,0 100,50 60,50 45,70 47,50 0,50" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" stroke-linejoin="round" /></svg>`;
      case 'thought':
        return `<svg viewBox="0 0 100 70" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><ellipse cx="50" cy="28" rx="46" ry="24" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /><circle cx="25" cy="56" r="6" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="1.5px" /><circle cx="15" cy="65" r="3.5" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="1px" /></svg>`;
      default: // rect
        return `<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><rect x="2" y="2" width="96" height="56" fill="var(--sf, #4f8df7)" stroke="var(--ss, #fff)" stroke-width="var(--sl, 2px)" /></svg>`;
    }
  }
  window.getShapeSvg = getShapeSvg;

  const css = `
    /* Shape wrapper MUST be transparent with no outer rectangle border */
    .shape-el {
      position: absolute;
      overflow: visible !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      transform-origin: center center;
      box-sizing: border-box;
      touch-action: none;
    }
    .shape-body {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: var(--so, 1);
      filter: drop-shadow(0 2px 8px #0004);
    }
    .shape-label {
      position: absolute;
      inset: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      overflow: hidden;
      line-height: 1.15;
      cursor: text;
      outline: 0;
      word-break: break-word;
      z-index: 2;
      user-select: text;
      pointer-events: auto;
    }
    .shape-label:focus {
      box-shadow: inset 0 0 0 1px #ffffffaa;
    }
    .shape-gallery {
      position: fixed; z-index: 95; top: 66px; left: 50%; transform: translateX(-50%);
      width: min(640px, calc(100vw - 24px)); max-height: calc(100vh - 80px); overflow: auto;
      padding: 14px; background: #111b2c; border: 1px solid #50617d; border-radius: 12px;
      box-shadow: 0 24px 70px #000d;
    }
    .shape-head { display: flex; align-items: center; gap: 10px; }
    .shape-group { margin-top: 12px; color: #ffd17b; font-weight: 800; font-size: 11px; }
    .shape-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
    .shape-choice { height: 52px; padding: 4px; background: #18243a; position: relative; border-radius: 6px; }
    .shape-choice:hover { border-color: #ffb11b; background: #223454; }
    .shape-choice small { display: block; font-size: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .shape-choice-icon { display: block; width: 34px; height: 22px; margin: auto; }
  `;
  document.head.insertAdjacentHTML('beforeend', '<style>' + css + '</style>');

  if (!$('addShape')) {
    $('addText').insertAdjacentHTML('afterend', '<button id="addShape">⬡ Shapes</button>');
  }

  if (!$('shapeGallery')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="shapeGallery" class="shape-gallery hidden">
        <div class="shape-head">
          <strong style="color:#ffd166">INSERT SHAPES & LINES</strong>
          <span class="hint">PowerPoint-style library</span>
          <button id="closeShapes" style="margin-left:auto">✕</button>
        </div>
        <div id="shapeGroups"></div>
      </div>
      <div id="shapeInspector" class="hidden">
        <div class="section-title">SHAPE FORMAT</div>
        <label class="field">Fill color<input id="shapeFill" type="color"></label>
        <div class="row">
          <label class="field">Outline<input id="shapeStroke" type="color"></label>
          <label class="field">Outline width<input id="shapeLine" type="number" min="0" max="16"></label>
        </div>
        <label class="field">Opacity<input id="shapeOpacity" type="range" min="0" max="100"></label>
        <div class="section-title" style="margin-top:14px">SHAPE TEXT</div>
        <label class="field">Text<textarea id="shapeText" placeholder="Double-click shape to type"></textarea></label>
        <div class="row">
          <label class="field">Text color<input id="shapeTextColor" type="color"></label>
          <label class="field">Text size<input id="shapeTextSize" type="number" min="8" max="120"></label>
        </div>
        <button id="shapeDuplicateBtn" style="width:100%;margin-top:10px;background:#203354;border-color:#4f8df7">⧉ Duplicate Shape (Ctrl+D)</button>
      </div>
    `);
  }

  const groups = $('shapeGroups');
  if (groups) {
    groups.innerHTML = '';
    [...new Set(defs.map(x => x[2]))].forEach(g => {
      const w = document.createElement('div');
      w.innerHTML = '<div class="shape-group">' + g + '</div><div class="shape-grid"></div>';
      defs.filter(x => x[2] === g).forEach(([k, n]) => {
        const b = document.createElement('button');
        b.className = 'shape-choice';
        b.title = n;
        b.innerHTML = '<div class="shape-choice-icon">' + getShapeSvg(k) + '</div><small>' + n + '</small>';
        b.onclick = () => add(k);
        w.querySelector('.shape-grid').appendChild(b);
      });
      groups.appendChild(w);
    });
  }

  function add(shape) {
    const isLine = shape.toLowerCase().includes('line');
    const e = {
      id: crypto.randomUUID(),
      type: 'shape',
      shape,
      text: '',
      textColor: '#ffffff',
      textSize: 18,
      textWeight: '700',
      x: 30,
      y: 35,
      w: isLine ? 28 : (shape.includes('arrow') ? 24 : 22),
      h: isLine ? 4 : (shape.includes('arrow') ? 12 : 16),
      fill: '#4f8df7',
      stroke: isLine ? '#4f8df7' : '#ffffff',
      line: isLine ? 3 : 2,
      opacity: 100,
      rotation: 0
    };
    active().elements.push(e);
    selected = e.id;
    $('shapeGallery')?.classList.add('hidden');
    render();
  }

  function paint(n, e) {
    n.className = 'element shape-el shape-' + (e.shape || 'rect') + (selected === e.id ? ' selected' : '');
    const fillVal = e.fill || e.fillColor || e.color || '#4f8df7';
    const strokeVal = e.stroke || e.borderColor || '#ffffff';
    const lineVal = e.line !== undefined ? e.line : (e.borderWidth !== undefined ? e.borderWidth : 2);
    const opVal = (e.opacity !== undefined ? Number(e.opacity) : 100) / 100;

    n.style.cssText = `left:${e.x}%;top:${e.y}%;width:${e.w}%;height:${e.h}%;` +
      `--sf:${fillVal};--ss:${strokeVal};--sl:${lineVal}px;--so:${opVal};` +
      `transform:rotate(${Number(e.rotation) || 0}deg);transform-origin:center center;background:transparent!important;border:none!important;`;

    let body = n.querySelector('.shape-body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'shape-body';
      n.appendChild(body);
    }
    body.innerHTML = getShapeSvg(e.shape);

    let label = n.querySelector('.shape-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'shape-label';
      n.appendChild(label);
    }
    label.contentEditable = 'false';
    label.spellcheck = false;
    label.textContent = e.text || '';
    label.style.color = e.textColor || '#ffffff';
    label.style.fontSize = (e.textSize || 18) + 'px';
    label.style.fontWeight = e.textWeight || '700';
    label.style.fontStyle = e.fontStyle || 'normal';
    label.style.textDecoration = e.textDecoration || 'none';
    label.style.justifyContent = (e.textAlign === 'left') ? 'flex-start' : (e.textAlign === 'right') ? 'flex-end' : 'center';
    label.style.textAlign = e.textAlign || 'center';
  }

  const oldRender = render;
  render = function() {
    const all = active().elements, shapes = all.filter(e => e.type === 'shape');
    if (!shapes.length) return oldRender();
    active().elements = all.filter(e => e.type !== 'shape');
    oldRender();
    active().elements = all;

    const box = $('slide');
    shapes.forEach(e => {
      const n = document.createElement('div');
      n.dataset.id = e.id;
      paint(n, e);
      n.addEventListener('pointerdown', startDrag);
      box.appendChild(n);
    });
    renderSlides();
    renderInspector();
  };

  const oldInspector = renderInspector;
  renderInspector = function() {
    oldInspector();
    const e = selectedEl(), ok = e && e.type === 'shape';
    $('shapeInspector')?.classList.toggle('hidden', !ok);
    if (ok) {
      $('emptyInspector')?.classList.add('hidden');
      $('shapeFill').value = e.fill || '#4f8df7';
      $('shapeStroke').value = e.stroke || '#ffffff';
      $('shapeLine').value = e.line ?? 2;
      $('shapeOpacity').value = e.opacity ?? 100;
      if ($('shapeText')) $('shapeText').value = e.text || '';
      if ($('shapeTextColor')) $('shapeTextColor').value = e.textColor || '#ffffff';
      if ($('shapeTextSize')) $('shapeTextSize').value = e.textSize || 18;
    }
  };

  ['shapeFill', 'shapeStroke', 'shapeLine', 'shapeOpacity', 'shapeTextColor', 'shapeTextSize', 'shapeText'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.oninput = () => {
      const e = selectedEl();
      if (!e || e.type !== 'shape') return;
      if (id === 'shapeFill') e.fill = el.value;
      if (id === 'shapeStroke') e.stroke = el.value;
      if (id === 'shapeLine') e.line = Math.max(0, +el.value || 0);
      if (id === 'shapeOpacity') e.opacity = +el.value;
      if (id === 'shapeText') e.text = el.value;
      if (id === 'shapeTextColor') e.textColor = el.value;
      if (id === 'shapeTextSize') e.textSize = Math.max(8, +el.value || 18);
      render();
    };
  });

  const rPanel = document.querySelector('.right');
  const insp = $('shapeInspector');
  if (rPanel && insp && insp.parentElement !== rPanel) {
    rPanel.insertBefore(insp, rPanel.lastElementChild);
  }
  if ($('addShape')) $('addShape').onclick = () => $('shapeGallery')?.classList.remove('hidden');
  if ($('closeShapes')) $('closeShapes').onclick = () => $('shapeGallery')?.classList.add('hidden');
  if ($('shapeDuplicateBtn')) {
    $('shapeDuplicateBtn').onclick = () => {
      if (typeof window.duplicatePresentationElement === 'function') {
        window.duplicatePresentationElement();
      }
    };
  }
  render();
})();
