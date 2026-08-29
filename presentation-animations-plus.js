(()=>{
  const $=id=>document.getElementById(id);
  const select=$('elementAnimation');
  if(!select)return;

  function getAnimFrames(name, rot = 0) {
    const r = Number(rot) || 0;
    const rotStr = r ? (' rotate(' + r + 'deg)') : '';
    const baseMap = {
      fade: [{ opacity: 0, transform: 'rotate(' + r + 'deg)' }, { opacity: 1, transform: 'rotate(' + r + 'deg)' }],
      appear: [{ opacity: 0, transform: 'rotate(' + r + 'deg)' }, { opacity: 1, transform: 'rotate(' + r + 'deg)' }],
      slideLeft: [{ opacity: 0, transform: 'translateX(-90px)' + rotStr }, { opacity: 1, transform: 'translateX(0)' + rotStr }],
      slideRight: [{ opacity: 0, transform: 'translateX(90px)' + rotStr }, { opacity: 1, transform: 'translateX(0)' + rotStr }],
      slideUp: [{ opacity: 0, transform: 'translateY(70px)' + rotStr }, { opacity: 1, transform: 'translateY(0)' + rotStr }],
      slideDown: [{ opacity: 0, transform: 'translateY(-70px)' + rotStr }, { opacity: 1, transform: 'translateY(0)' + rotStr }],
      zoom: [{ opacity: 0, transform: 'scale(.2)' + rotStr }, { opacity: 1, transform: 'scale(1)' + rotStr }],
      pop: [{ opacity: 0, transform: 'scale(.2)' + rotStr }, { opacity: 1, transform: 'scale(1.15)' + rotStr, offset: 0.7 }, { opacity: 1, transform: 'scale(1)' + rotStr }],
      flipX: [{ opacity: 0, transform: 'perspective(400px) rotateX(90deg)' + rotStr }, { opacity: 1, transform: 'perspective(400px) rotateX(0)' + rotStr }],
      flipY: [{ opacity: 0, transform: 'perspective(400px) rotateY(90deg)' + rotStr }, { opacity: 1, transform: 'perspective(400px) rotateY(0)' + rotStr }],
      wipeLeft: [{ opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'rotate(' + r + 'deg)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' }],
      pulse: [{ transform: 'scale(1)' + rotStr }, { transform: 'scale(1.12)' + rotStr }, { transform: 'scale(1)' + rotStr }],
      bounce: [{ transform: 'translateY(0)' + rotStr }, { transform: 'translateY(-28px)' + rotStr }, { transform: 'translateY(0)' + rotStr }],
      spin: [{ transform: 'rotate(' + r + 'deg)' }, { transform: 'rotate(' + (r + 360) + 'deg)' }],
      spin3d: [{ transform: 'perspective(700px) rotateY(0deg)' + rotStr }, { transform: 'perspective(700px) rotateY(360deg)' + rotStr }],
      swing: [{ transform: 'rotate(' + r + 'deg)' }, { transform: 'rotate(' + (r + 15) + 'deg)' }, { transform: 'rotate(' + (r - 10) + 'deg)' }, { transform: 'rotate(' + r + 'deg)' }],
      float: [{ transform: 'translateY(0)' + rotStr }, { transform: 'translateY(-20px)' + rotStr }, { transform: 'translateY(0)' + rotStr }],
      jello: [{ transform: 'skew(0)' + rotStr }, { transform: 'skew(-12deg,-12deg)' + rotStr }, { transform: 'skew(7deg,7deg)' + rotStr }, { transform: 'skew(0)' + rotStr }],
      shake: [{ transform: 'translateX(0)' + rotStr }, { transform: 'translateX(-18px)' + rotStr }, { transform: 'translateX(18px)' + rotStr }, { transform: 'translateX(0)' + rotStr }],
      fadeOut: [{ opacity: 1, transform: 'rotate(' + r + 'deg)' }, { opacity: 0, transform: 'rotate(' + r + 'deg)' }],
      zoomOut: [{ opacity: 1, transform: 'scale(1)' + rotStr }, { opacity: 0, transform: 'scale(.2)' + rotStr }],
      slideOutRight: [{ opacity: 1, transform: 'translateX(0)' + rotStr }, { opacity: 0, transform: 'translateX(120px)' + rotStr }]
    };
    return baseMap[name] || baseMap.fade;
  }

  window.getAnimFrames = getAnimFrames;
  window.animFrames = getAnimFrames('fade', 0);

  function previewLiveAnimation(el) {
    const e = el || (typeof selectedEl === 'function' ? selectedEl() : null);
    if (!e || !e.id || !e.animation || e.animation === 'none') return;
    const slide = $('slide');
    if (!slide) return;
    const node = slide.querySelector('.element[data-id="' + e.id + '"]') || slide.querySelector('[data-id="' + e.id + '"]');
    const f = getAnimFrames(e.animation, e.rotation);
    if (!node || !f) return;

    node.getAnimations().forEach(a => a.cancel());
    const dur = Math.max(0.1, Number(e.animationDuration) || 0.6) * 1000;
    const del = Math.max(0, Number(e.animationDelay) || 0) * 1000;

    const anim = node.animate(f, {
      duration: dur,
      delay: del,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'both'
    });

    if (!e.animationLoop) {
      anim.onfinish = () => {
        setTimeout(() => {
          if (node && node.style) {
            node.style.opacity = '';
            node.style.transform = (e.rotation ? ('rotate(' + e.rotation + 'deg)') : '');
            node.style.clipPath = '';
          }
        }, 100);
      };
    }
  }

  window.previewElementAnimation = previewLiveAnimation;

  const inspector = $('animationInspector');
  if (inspector && !$('btnPreviewAnimation')) {
    const pBtn = document.createElement('button');
    pBtn.id = 'btnPreviewAnimation';
    pBtn.type = 'button';
    pBtn.textContent = '▶ Play / Replay Animation';
    pBtn.style.cssText = 'width:100%;margin-top:10px;padding:8px;background:#1769e8;border:1px solid #79abff;border-radius:6px;color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;';
    pBtn.onclick = () => previewLiveAnimation();
    inspector.appendChild(pBtn);
  }

  select.innerHTML = '<option value="none">None</option>'
    + '<optgroup label="Entrance">'
    + '<option value="fade">Fade In</option><option value="appear">Appear</option>'
    + '<option value="slideLeft">Slide from Left</option><option value="slideRight">Slide from Right</option>'
    + '<option value="slideUp">Rise Up</option><option value="slideDown">Drop Down</option>'
    + '<option value="zoom">Zoom In</option><option value="pop">Pop / Bounce</option>'
    + '<option value="flipX">Flip In X</option><option value="flipY">Flip In Y</option>'
    + '<option value="wipeLeft">Wipe from Left</option>'
    + '</optgroup>'
    + '<optgroup label="Emphasis">'
    + '<option value="pulse">Pulse</option><option value="bounce">Bounce</option>'
    + '<option value="spin">Spin</option><option value="spin3d">3D Spin (Y)</option>'
    + '<option value="swing">Swing</option><option value="float">Float</option>'
    + '<option value="jello">Jello</option><option value="shake">Shake</option>'
    + '</optgroup>'
    + '<optgroup label="Exit">'
    + '<option value="fadeOut">Fade Out</option><option value="zoomOut">Zoom Out</option>'
    + '<option value="slideOutRight">Slide Out Right</option>'
    + '</optgroup>';

  ['elementAnimation', 'animationDelay', 'animationDuration'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const e = typeof selectedEl === 'function' ? selectedEl() : null;
      if (e && e.animation && e.animation !== 'none') {
        setTimeout(() => previewLiveAnimation(e), 50);
      }
    });
    el.addEventListener('input', () => {
      const e = typeof selectedEl === 'function' ? selectedEl() : null;
      if (e && e.animation && e.animation !== 'none') {
        setTimeout(() => previewLiveAnimation(e), 50);
      }
    });
  });
})();