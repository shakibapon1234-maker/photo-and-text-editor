(()=>{
  const $=id=>document.getElementById(id);
  const select=$('elementAnimation');
  if(!select)return;

  const frames={
    fade:[{opacity:0},{opacity:1}],
    appear:[{opacity:0},{opacity:1}],
    slideLeft:[{opacity:0,transform:'translateX(-90px)'},{opacity:1,transform:'none'}],
    slideRight:[{opacity:0,transform:'translateX(90px)'},{opacity:1,transform:'none'}],
    slideUp:[{opacity:0,transform:'translateY(70px)'},{opacity:1,transform:'none'}],
    slideDown:[{opacity:0,transform:'translateY(-70px)'},{opacity:1,transform:'none'}],
    zoom:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1)'}],
    pop:[{opacity:0,transform:'scale(.2)'},{opacity:1,transform:'scale(1.15)',offset:.7},{opacity:1,transform:'scale(1)'}],
    flipX:[{opacity:0,transform:'perspective(400px) rotateX(90deg)'},{opacity:1,transform:'perspective(400px) rotateX(0)'}],
    flipY:[{opacity:0,transform:'perspective(400px) rotateY(90deg)'},{opacity:1,transform:'perspective(400px) rotateY(0)'}],
    wipeLeft:[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}],
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

  window.animFrames = frames;

  function previewLiveAnimation(el) {
    const e = el || (typeof selectedEl === 'function' ? selectedEl() : null);
    if (!e || !e.id || !e.animation || e.animation === 'none') return;
    const slide = $('slide');
    if (!slide) return;
    const node = slide.querySelector('.element[data-id="' + e.id + '"]') || slide.querySelector('[data-id="' + e.id + '"]');
    const f = frames[e.animation];
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