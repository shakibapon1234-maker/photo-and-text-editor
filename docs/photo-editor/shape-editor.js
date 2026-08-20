/* Editable shape layer: draw, move, resize, rotate, order and export. */
(() => {
  const $ = id => document.getElementById(id),
    img = $('previewImage'),
    wrap = $('previewImageWrapper'),
    tab = $('tab-shapes');
  if (!img || !wrap || !tab) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'shape-overlay';
  canvas.hidden = true;
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let shapes = [],
    selected = null,
    clipboard = null,
    tool = 'rect',
    action = null;

  const v = id => $(id) ? $(id).value : '',
    current = () => ({
      fill: v('shapeFill') || '#ff5722',
      stroke: v('shapeStroke') || '#ffffff',
      mode: v('shapeFillMode') || 'solid',
      sw: +v('shapeStrokeWidth') || 3,
      alpha: $('shapeOpacity') ? +v('shapeOpacity') / 100 : 1,
      glow: $('shapeGlow') ? $('shapeGlow').checked : false,
      bevel: $('shape3d') ? $('shape3d').checked : false,
      text: v('shapeText') || '',
      textColor: v('shapeTextColor') || '#ffffff',
      rotate: +v('shapeRotate') || 0
    });

  function syncInputs(s) {
    if (!s) return;
    if ($('shapeFill') && s.fill) $('shapeFill').value = s.fill;
    if ($('shapeStroke') && s.stroke) $('shapeStroke').value = s.stroke;
    if ($('shapeFillMode') && s.mode) $('shapeFillMode').value = s.mode;
    if ($('shapeStrokeWidth')) {
      const sw = s.sw ?? 3;
      $('shapeStrokeWidth').value = sw;
      if ($('shapeStrokeWidthValue')) $('shapeStrokeWidthValue').textContent = sw + 'px';
    }
    if ($('shapeOpacity')) {
      const op = Math.round((s.alpha ?? 1) * 100);
      $('shapeOpacity').value = op;
      if ($('shapeOpacityValue')) $('shapeOpacityValue').textContent = op + '%';
    }
    if ($('shapeGlow')) $('shapeGlow').checked = !!s.glow;
    if ($('shape3d')) $('shape3d').checked = !!s.bevel;
    if ($('shapeText')) $('shapeText').value = s.text || '';
    if ($('shapeTextColor') && s.textColor) $('shapeTextColor').value = s.textColor;
    if ($('shapeRotate')) {
      const rot = s.rotate || 0;
      $('shapeRotate').value = rot;
      if ($('shapeRotateValue')) $('shapeRotateValue').textContent = rot + '°';
    }
  }

  function sync() {
    const r = img.getBoundingClientRect(),
      w = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width));
    canvas.height = Math.max(1, Math.round(r.height));
    Object.assign(canvas.style, {
      left: (r.left - w.left) + 'px',
      top: (r.top - w.top) + 'px',
      width: r.width + 'px',
      height: r.height + 'px'
    });
  }

  function path(s, c, w, h) {
    w = w || (c.canvas ? c.canvas.width : canvas.width);
    h = h || (c.canvas ? c.canvas.height : canvas.height);
    const X = s.x * w,
      Y = s.y * h,
      W = s.w * w,
      H = s.h * h;
    c.beginPath();
    if (s.type === 'circle') {
      c.ellipse(X + W / 2, Y + H / 2, Math.abs(W / 2), Math.abs(H / 2), 0, 0, Math.PI * 2);
    } else if (s.type === 'triangle') {
      c.moveTo(X + W / 2, Y);
      c.lineTo(X + W, Y + H);
      c.lineTo(X, Y + H);
      c.closePath();
    } else if (s.type === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5,
          r = Math.min(Math.abs(W), Math.abs(H)) * (i % 2 ? .2 : .5),
          px = X + W / 2 + Math.cos(a) * r,
          py = Y + H / 2 + Math.sin(a) * r;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    } else if (s.type === 'arrow') {
      c.moveTo(X, Y + H * .3);
      c.lineTo(X + W * .62, Y + H * .3);
      c.lineTo(X + W * .62, Y);
      c.lineTo(X + W, Y + H / 2);
      c.lineTo(X + W * .62, Y + H);
      c.lineTo(X + W * .62, Y + H * .7);
      c.lineTo(X, Y + H * .7);
      c.closePath();
    } else if (s.type === 'freehand') {
      (s.points || []).forEach((p, i) => i ? c.lineTo(p.x * w, p.y * h) : c.moveTo(p.x * w, p.y * h));
      if ((s.points || []).length > 2) c.closePath();
    } else {
      c.rect(X, Y, W, H);
    }
  }

  function render(s, c, w, h, handles = false) {
    w = w || (c.canvas ? c.canvas.width : canvas.width);
    h = h || (c.canvas ? c.canvas.height : canvas.height);
    c.save();
    if (s.type !== 'freehand') {
      c.translate((s.x + s.w / 2) * w, (s.y + s.h / 2) * h);
      c.rotate((s.rotate || 0) * Math.PI / 180);
      c.translate(-(s.x + s.w / 2) * w, -(s.y + s.h / 2) * h);
    }
    c.globalAlpha = s.alpha ?? 1;
    if (s.glow) {
      c.shadowColor = s.fill;
      c.shadowBlur = 16 * w / canvas.width;
    }
    if (s.mode === 'gradient') {
      const g = c.createLinearGradient(s.x * w, s.y * h, (s.x + s.w) * w, (s.y + s.h) * h);
      g.addColorStop(0, s.fill);
      g.addColorStop(1, s.stroke);
      c.fillStyle = g;
    } else {
      c.fillStyle = s.fill;
    }
    c.strokeStyle = s.stroke;
    c.lineWidth = (s.sw || 3) * w / canvas.width;
    path(s, c, w, h);
    if (s.type === 'freehand') {
      if ((s.points || []).length > 2) c.fill();
      c.stroke();
    } else {
      c.fill();
      c.stroke();
    }
    if (s.bevel && s.type !== 'freehand') {
      c.shadowBlur = 0;
      c.globalAlpha = (s.alpha ?? 1) * .35;
      c.strokeStyle = '#fff';
      c.lineWidth = Math.max(1, (s.sw || 3) / 2);
      path(s, c, w, h);
      c.stroke();
    }
    if (s.text) {
      c.shadowBlur = 0;
      c.globalAlpha = s.alpha ?? 1;
      c.fillStyle = s.textColor || '#fff';
      c.font = `700 ${Math.max(14, Math.abs(s.h * h) * .24)}px "Noto Sans Bengali", "Nirmala UI", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(s.text, (s.x + s.w / 2) * w, (s.y + s.h / 2) * h, Math.abs(s.w * w) * .88);
    }
    if (handles) {
      c.shadowBlur = 0;
      c.globalAlpha = 1;
      c.strokeStyle = '#00d4c8';
      c.lineWidth = 2;
      c.setLineDash([6, 4]);
      c.strokeRect(s.x * w - 4, s.y * h - 4, s.w * w + 8, s.h * h + 8);
      c.setLineDash([]);
      c.fillStyle = '#00d4c8';
      c.fillRect((s.x + s.w) * w - 5, (s.y + s.h) * h - 5, 10, 10);
      c.beginPath();
      c.arc((s.x + s.w / 2) * w, s.y * h - 22, 7, 0, Math.PI*2);
      c.fill();
    }
    c.restore();
  }

  function draw() {
    sync();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach(s => {
      if (s !== selected) render(s, ctx, canvas.width, canvas.height);
    });
    if (selected) render(selected, ctx, canvas.width, canvas.height, true);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height
    };
  }

  function hit(p) {
    return [...shapes].reverse().find(s => {
      const minX = Math.min(s.x, s.x + s.w),
        maxX = Math.max(s.x, s.x + s.w),
        minY = Math.min(s.y, s.y + s.h),
        maxY = Math.max(s.y, s.y + s.h);
      return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    });
  }

  function normalize(s) {
    if (s.w < 0) {
      s.x += s.w;
      s.w = -s.w;
    }
    if (s.h < 0) {
      s.y += s.h;
      s.h = -s.h;
    }
  }

  canvas.addEventListener('pointerdown', e => {
    const p = pos(e);
    canvas.setPointerCapture(e.pointerId);
    if (selected) {
      const cx = selected.x + selected.w / 2,
        cy = selected.y + selected.h / 2;
      if (Math.hypot(p.x - cx, p.y - (selected.y - 22 / canvas.height)) < .04) {
        action = {
          k: 'rotate',
          a: Math.atan2(p.y - cy, p.x - cx),
          r: selected.rotate || 0
        };
        return;
      }
      if (Math.hypot(p.x - (selected.x + selected.w), p.y - (selected.y + selected.h)) < .035) {
        action = {
          k: 'resize',
          p,
          w: selected.w,
          h: selected.h
        };
        return;
      }
    }
    if (tool === 'freehand') {
      selected = {
        type: 'freehand',
        ...current(),
        rotate: 0,
        x: p.x,
        y: p.y,
        w: .01,
        h: .01,
        points: [p]
      };
      shapes.push(selected);
      action = {
        k: 'free'
      };
      syncInputs(selected);
      draw();
      return;
    }
    const found = hit(p);
    if (found) {
      selected = found;
      syncInputs(selected);
      action = {
        k: 'move',
        dx: p.x - found.x,
        dy: p.y - found.y
      };
      draw();
      return;
    }
    selected = {
      type: tool,
      ...current(),
      x: p.x,
      y: p.y,
      w: 0,
      h: 0
    };
    shapes.push(selected);
    action = {
      k: 'draw'
    };
    syncInputs(selected);
    draw();
  });

  canvas.addEventListener('pointermove', e => {
    if (!action) return;
    const p = pos(e),
      s = selected;
    if (action.k === 'free') {
      s.points.push(p);
      const xs = s.points.map(q => q.x),
        ys = s.points.map(q => q.y);
      s.x = Math.min(...xs);
      s.y = Math.min(...ys);
      s.w = Math.max(...xs) - s.x;
      s.h = Math.max(...ys) - s.y;
    } else if (action.k === 'draw') {
      s.w = p.x - s.x;
      s.h = p.y - s.y;
      normalize(s);
    } else if (action.k === 'move') {
      s.x = Math.max(0, Math.min(1 - s.w, p.x - action.dx));
      s.y = Math.max(0, Math.min(1 - s.h, p.y - action.dy));
    } else if (action.k === 'resize') {
      s.w = Math.max(.02, action.w + p.x - action.p.x);
      s.h = Math.max(.02, action.h + p.y - action.p.y);
    } else {
      const a = Math.atan2(p.y - (s.y + s.h / 2), p.x - (s.x + s.w / 2));
      s.rotate = Math.round(action.r + (a - action.a) * 180 / Math.PI);
      if ($('shapeRotate')) $('shapeRotate').value = s.rotate;
      if ($('shapeRotateValue')) $('shapeRotateValue').textContent = s.rotate + '°';
    }
    draw();
  });

  canvas.addEventListener('pointerup', () => (action = null));

  $('shapePresetGrid')?.addEventListener('click', e => {
    const b = e.target.closest('[data-shape]');
    if (!b) return;
    tool = b.dataset.shape;
    document.querySelectorAll('#shapePresetGrid button').forEach(q => q.classList.toggle('active', q === b));
    canvas.classList.add('active');
  });

  $('shapeAddBtn')?.addEventListener('click', () => {
    selected = {
      type: tool === 'freehand' ? 'rect' : tool,
      ...current(),
      x: .3,
      y: .3,
      w: .25,
      h: .18
    };
    shapes.push(selected);
    syncInputs(selected);
    draw();
  });

  $('shapeDuplicateBtn')?.addEventListener('click', () => {
    if (selected) {
      clipboard = structuredClone(selected);
      const n = structuredClone(selected);
      n.x = Math.min(.9, n.x + .03);
      n.y = Math.min(.9, n.y + .03);
      shapes.push(n);
      selected = n;
      syncInputs(selected);
      draw();
    }
  });

  $('shapeDeleteBtn')?.addEventListener('click', () => {
    if (selected) {
      shapes = shapes.filter(s => s !== selected);
      selected = shapes.length > 0 ? shapes[shapes.length - 1] : null;
      if (selected) syncInputs(selected);
      draw();
    }
  });

  $('shapeFrontBtn')?.addEventListener('click', () => {
    if (selected) {
      shapes = shapes.filter(s => s !== selected);
      shapes.push(selected);
      draw();
    }
  });

  $('shapeBackBtn')?.addEventListener('click', () => {
    if (selected) {
      shapes = shapes.filter(s => s !== selected);
      shapes.unshift(selected);
      draw();
    }
  });

  ['shapeFill', 'shapeStroke', 'shapeFillMode', 'shapeStrokeWidth', 'shapeOpacity', 'shapeGlow', 'shape3d', 'shapeText', 'shapeTextColor', 'shapeRotate'].forEach(id => {
    $(id)?.addEventListener('input', () => {
      if (selected) Object.assign(selected, current());
      if ($('shapeStrokeWidthValue') && $('shapeStrokeWidth')) $('shapeStrokeWidthValue').textContent = v('shapeStrokeWidth') + 'px';
      if ($('shapeOpacityValue') && $('shapeOpacity')) $('shapeOpacityValue').textContent = v('shapeOpacity') + '%';
      if ($('shapeRotateValue') && $('shapeRotate')) $('shapeRotateValue').textContent = v('shapeRotate') + '°';
      draw();
    });
  });

  $('shapeSize')?.addEventListener('input', () => {
    if (!selected) return;
    const n = +v('shapeSize'),
      f = n / (selected._size || 100);
    selected.w *= f;
    selected.h *= f;
    selected._size = n;
    if ($('shapeSizeValue')) $('shapeSizeValue').textContent = n;
    draw();
  });

  document.addEventListener('keydown', e => {
    if (!tab.classList.contains('active') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'c' && selected) {
      clipboard = structuredClone(selected);
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && k === 'v' && clipboard) {
      const n = structuredClone(clipboard);
      n.x = Math.min(.9, n.x + .03);
      n.y = Math.min(.9, n.y + .03);
      shapes.push(n);
      selected = n;
      syncInputs(selected);
      draw();
      e.preventDefault();
    }
    if (e.key === 'Delete') $('shapeDeleteBtn')?.click();
  });

  document.addEventListener('app:tabchange', e => {
    canvas.hidden = e.detail !== 'shapes';
    if (e.detail === 'shapes') {
      canvas.classList.add('active');
      draw();
    }
  });

  img.addEventListener('load', draw);
  window.addEventListener('resize', draw);

  window.shapeEditor = {
    hasShapes: () => shapes.length > 0,
    drawTo: (target, w, h) => {
      shapes.forEach(s => render(s, target, w, h));
      draw();
    }
  };
})();
