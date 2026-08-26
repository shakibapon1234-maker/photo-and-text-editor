(() => {
  const $ = id => document.getElementById(id);
  const choices = [
    ['none', 'None — Solid Color Only'],
    ['space', '🪐 Space — তারা ও গ্রহ'],
    ['aurora', '🌌 Aurora — উত্তরীয় আলো'],
    ['sky', '✈️ Sky Flight — মেঘ ও উড়ান'],
    ['night', '🌃 Night Flight — রাতের শহর'],
    ['sunset', '🌅 Cloud Sunset — সোনালি আকাশ'],
    ['water', '🌊 Water — শান্ত ঢেউ']
  ];

  window.getBrollPresetGradient = function(preset) {
    const map = {
      sky: 'linear-gradient(165deg, #0762a3, #79cdf3 48%, #d9f4ff)',
      space: 'radial-gradient(circle at 72% 20%, #ffe18a 0 2%, transparent 5%), radial-gradient(circle at 19% 88%, #5933a0 0 10%, transparent 24%), #020617',
      aurora: 'linear-gradient(135deg, #051531, #156d89 52%, #663a9c)',
      night: 'linear-gradient(155deg, #030914, #0d2145 58%, #291529)',
      sunset: 'linear-gradient(175deg, #642160, #ec6e69 45%, #ffbf62 72%, #72587f)',
      water: 'linear-gradient(#084f71, #078fba 45%, #015278)'
    };
    return map[preset] || null;
  };

  const uploadWrap = $('backgroundUpload');
  if (uploadWrap && !$('brollPanel')) {
    uploadWrap.insertAdjacentHTML('beforebegin', `
      <div id="brollPanel">
        <div class="section-title">✨ ANIMATED B-ROLL</div>
        <label class="field">Background animation<select id="brollPreset"></select></label>
        <label class="field" id="brollSpeedRow">Animation speed<select id="brollSpeed">
          <option value="slow">Slow / Calm</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select></label>
        <p class="hint">B-roll loop হবে; text ও ছবি সবসময় উপরে থাকবে।</p>
      </div>
    `);
  }

  if ($('brollPreset')) {
    $('brollPreset').innerHTML = choices.map(x => '<option value="' + x[0] + '">' + x[1] + '</option>').join('');
  }

  const css = `
    #brollLayer {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
      background: #102044;
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    #brollLayer:before, #brollLayer:after {
      content: "";
      position: absolute;
      inset: -10%;
      background-repeat: no-repeat;
      will-change: transform;
      transform: translate3d(0,0,0);
      backface-visibility: hidden;
    }
    #brollLayer.space {
      background: radial-gradient(circle at 72% 20%,#ffe18a 0 2%,transparent 5%),radial-gradient(circle at 19% 88%,#5933a0 0 10%,transparent 24%),#020617;
    }
    #brollLayer.space:before {
      background-image: radial-gradient(#fff 0 1px,transparent 2px);
      background-size: 55px 48px;
      animation: broll_bd 18s linear infinite;
    }
    #brollLayer.space:after {
      background: radial-gradient(ellipse,transparent 0 42%,#8168ff77 44%,transparent 48%);
      animation: broll_bs 22s linear infinite;
    }
    #brollLayer.aurora {
      background: #051531;
    }
    #brollLayer.aurora:before {
      background: radial-gradient(ellipse at 23% 84%,#1dffc099 0 18%,transparent 52%),radial-gradient(ellipse at 65% 38%,#49a9ffb8 0 20%,transparent 55%),radial-gradient(ellipse at 94% 66%,#c85eff99 0 18%,transparent 51%);
      filter: blur(16px);
      animation: broll_ba 10s ease-in-out infinite alternate;
    }
    #brollLayer.sky {
      background: linear-gradient(165deg,#0762a3,#79cdf3 48%,#d9f4ff);
    }
    #brollLayer.sky:before {
      background: radial-gradient(ellipse at 15% 35%,#fff 0 9%,transparent 25%),radial-gradient(ellipse at 52% 62%,#ffffffdd 0 11%,transparent 28%),radial-gradient(ellipse at 90% 20%,#fff 0 9%,transparent 27%);
      filter: blur(6px);
      animation: broll_bc 14s linear infinite;
    }
    #brollLayer.sky:after {
      inset: auto 20% 38% auto;
      width: 36px;
      height: 12px;
      background: #fff;
      clip-path: polygon(0 45%,60% 43%,90% 0,100% 0,75% 47%,100% 75%,100% 90%,60% 59%,0 59%);
      animation: broll_bp 9s linear infinite;
    }
    #brollLayer.night {
      background: linear-gradient(155deg,#030914,#0d2145 58%,#291529);
    }
    #brollLayer.night:before {
      inset: auto -5% 0;
      height: 45%;
      background: repeating-linear-gradient(90deg,#07111e 0 30px,#26384d 31px 55px,#07111e 56px 76px);
      clip-path: polygon(0 32%,8% 17%,16% 37%,23% 5%,32% 25%,41% 12%,49% 35%,60% 4%,70% 30%,79% 10%,89% 32%,100% 13%,100% 100%,0 100%);
      animation: broll_bn 8s linear infinite;
    }
    #brollLayer.night:after {
      background-image: radial-gradient(#ffe075 0 1px,transparent 2px),radial-gradient(#fff 0 1px,transparent 2px);
      background-size: 37px 31px,91px 73px;
      animation: broll_bd 13s linear infinite reverse;
    }
    #brollLayer.sunset {
      background: linear-gradient(175deg,#642160,#ec6e69 45%,#ffbf62 72%,#72587f);
    }
    #brollLayer.sunset:before {
      background: radial-gradient(ellipse at 13% 70%,#ffc76c 0 8%,transparent 25%),radial-gradient(ellipse at 51% 73%,#ffdb9b 0 5%,transparent 18%),radial-gradient(ellipse at 85% 53%,#ffb08b 0 9%,transparent 26%);
      filter: blur(10px);
      animation: broll_bc 17s linear infinite reverse;
    }
    #brollLayer.water {
      background: linear-gradient(#084f71,#078fba 45%,#015278);
    }
    #brollLayer.water:before {
      background: repeating-radial-gradient(ellipse at 48% 108%,#b9f8ff77 0 1px,transparent 2px 15px);
      transform-origin: 50% 100%;
      animation: broll_bw 5s ease-in-out infinite alternate;
    }
    #brollLayer.water:after {
      background: linear-gradient(110deg,transparent 35%,#d9ffff66 46%,transparent 55%);
      animation: broll_bh 5s linear infinite;
    }
    #brollLayer.speed-slow:before, #brollLayer.speed-slow:after { animation-duration: 18s !important; }
    #brollLayer.speed-fast:before, #brollLayer.speed-fast:after { animation-duration: 5s !important; }

    @keyframes broll_bd { to { transform: translate3d(-9%, -6%, 0); } }
    @keyframes broll_bs { to { transform: rotate(360deg); } }
    @keyframes broll_ba { to { transform: translate3d(8%, 0, 0) scale(1.12); opacity: .78; } }
    @keyframes broll_bc { to { transform: translate3d(14%, 0, 0); } }
    @keyframes broll_bp { from { transform: translate3d(-70vw, 35vh, 0) scale(.7); } to { transform: translate3d(55vw, -25vh, 0) scale(1.15); } }
    @keyframes broll_bn { to { transform: translate3d(-7%, 0, 0); } }
    @keyframes broll_bh { from { transform: translate3d(-80%, 0, 0); } to { transform: translate3d(80%, 0, 0); } }
    @keyframes broll_bw { to { transform: scale(1.2, 1.08) translate3d(0, -3%, 0); } }
  `;

  let style = document.getElementById('brollPresetStyles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'brollPresetStyles';
    document.head.append(style);
  }
  style.textContent = css;

  function draw() {
    const s = active(), p = s.brollPreset || 'none', sp = s.brollSpeed || 'normal';
    let layer = $('brollLayer');
    if (p === 'none') {
      if (layer) layer.remove();
      return;
    }
    const targetClass = p + ' speed-' + sp;
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'brollLayer';
      layer.className = targetClass;
      $('slide').insertBefore(layer, $('animatedBackgroundLayer') || $('slide').firstChild);
    } else if (layer.className !== targetClass) {
      layer.className = targetClass;
    }
  }

  const priorStyle = styleSlide;
  styleSlide = function() {
    priorStyle();
    draw();
  };

  const priorInspector = renderInspector;
  renderInspector = function() {
    priorInspector();
    const s = active();
    s.brollPreset = s.brollPreset || 'none';
    s.brollSpeed = s.brollSpeed || 'normal';
    if ($('brollPreset')) $('brollPreset').value = s.brollPreset;
    if ($('brollSpeed')) $('brollSpeed').value = s.brollSpeed;
    if ($('brollSpeedRow')) $('brollSpeedRow').classList.toggle('hidden', s.brollPreset === 'none');
  };

  if ($('brollPreset')) {
    $('brollPreset').onchange = e => {
      active().brollPreset = e.target.value;
      render();
    };
  }
  if ($('brollSpeed')) {
    $('brollSpeed').onchange = e => {
      active().brollSpeed = e.target.value;
      render();
    };
  }

  function present() {
    const w = window.open('', 'presentation', 'popup,width=1280,height=720');
    if (!w) return;
    const d = JSON.stringify(slides).replace(/</g, '\\u003c'), t = JSON.stringify(themes);
    const code = "const slides=" + d + ";const themes=" + t + ";let i=0,timer;function add(e,c){const n=document.createElement('div');n.className='el '+e.type;n.style.cssText='left:'+e.x+'%;top:'+e.y+'%;width:'+e.w+'%;height:'+e.h+'%;font-size:'+(e.size||e.textSize||18)+'px;color:'+(e.color||e.textColor||'#fff')+';font-weight:'+(e.weight||e.textWeight||700);if(e.type==='image'){const m=new Image();m.src=e.src;n.append(m)}else n.textContent=e.text||'';c.append(n)}function r(){const q=slides[i],s=document.querySelector('#s');s.style.background=q.background==='custom'?q.bgColor:(themes[q.background]||'#17233c');s.replaceChildren();if(q.bgMedia){const m=document.createElement(q.bgMediaType==='video'?'video':'img');m.className='bg';m.src=q.bgMedia;if(m.tagName==='VIDEO'){m.autoplay=true;m.loop=true;m.muted=true;m.playsInline=true;m.playbackRate=q.bgPlaybackRate||1}m.style.opacity=(q.bgMediaOpacity??100)/100;m.style.filter='blur('+(q.bgMediaBlur||0)+'px)';s.append(m)}if(q.brollPreset&&q.brollPreset!=='none'){const b=document.createElement('div');b.id='brollLayer';b.className=q.brollPreset+' speed-'+(q.brollSpeed||'normal');s.append(b)}const c=document.createElement('div');c.className='content';q.elements.forEach(e=>add(e,c));s.append(c);clearTimeout(timer);if(q.autoDuration>0)timer=setTimeout(next,q.autoDuration*1000)}function next(){i=(i+1)%slides.length;r()}r();onkeydown=e=>{if(e.key==='ArrowRight'||e.key===' ')next();if(e.key==='ArrowLeft'){i=(i+slides.length-1)%slides.length;r()}if(e.key==='Escape')close()}";
    const base = '*{box-sizing:border-box}body{margin:0;background:#000;overflow:hidden;font-family:Arial}.slide{width:100vw;height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.content{position:absolute;inset:0;z-index:2}.el{position:absolute;white-space:pre-wrap;line-height:1.15}.image img{width:100%;height:100%;object-fit:cover}';
    w.document.write('<style>' + base + css + '</style><div id="s" class="slide"></div><script>' + code + '<\\/script>');
    w.document.close();
  }
  if ($('presentBtn')) $('presentBtn').onclick = present;
})();