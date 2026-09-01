(()=>{
  const $=id=>document.getElementById(id);
  const css = `
  #brollLayer {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    transform: translateZ(0);
  }
  #brollLayer:before, #brollLayer:after {
    content: "" !important;
    position: absolute !important;
    inset: -50% !important;
    width: 200% !important;
    height: 200% !important;
    display: block !important;
    background-repeat: repeat !important;
    will-change: transform;
    pointer-events: none !important;
  }
  #brollLayer.space {
    background: radial-gradient(circle at 70% 25%, #ffd166 0%, #ff8c00 1.5%, transparent 4%),
                radial-gradient(circle at 20% 80%, #6366f1 0%, #312e81 8%, transparent 20%),
                radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%);
  }
  #brollLayer.space:before {
    background-image: radial-gradient(circle, #ffffff 1px, transparent 1.5px), radial-gradient(circle, #93c5fd 1.5px, transparent 2px);
    background-size: 60px 60px, 110px 110px;
    background-position: 0 0, 30px 30px;
    animation: broll_space_drift 25s linear infinite !important;
  }
  #brollLayer.space:after {
    background: radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(139, 92, 246, 0.35) 45%, transparent 55%),
                radial-gradient(circle at 80% 30%, rgba(236, 72, 153, 0.25) 0%, transparent 40%);
    animation: broll_space_pulse 16s ease-in-out infinite alternate !important;
  }
  @keyframes broll_space_drift {
    from { transform: rotate(0deg) translate3d(0, 0, 0); }
    to { transform: rotate(360deg) translate3d(-30px, -30px, 0); }
  }
  @keyframes broll_space_pulse {
    0% { transform: scale(0.9) rotate(0deg); opacity: 0.6; }
    50% { transform: scale(1.1) rotate(15deg); opacity: 0.9; }
    100% { transform: scale(0.95) rotate(-10deg); opacity: 0.7; }
  }

  #brollLayer.aurora {
    background: #020617;
  }
  #brollLayer.aurora:before {
    background: radial-gradient(ellipse at 20% 80%, rgba(16, 185, 129, 0.65) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 30%, rgba(56, 189, 248, 0.7) 0%, transparent 55%),
                radial-gradient(ellipse at 90% 70%, rgba(168, 85, 247, 0.6) 0%, transparent 50%);
    filter: blur(25px);
    animation: broll_aurora_wave 10s ease-in-out infinite alternate !important;
  }
  #brollLayer.aurora:after {
    background: radial-gradient(ellipse at 50% 20%, rgba(244, 114, 182, 0.4) 0%, transparent 45%),
                radial-gradient(ellipse at 40% 90%, rgba(34, 197, 94, 0.5) 0%, transparent 50%);
    filter: blur(35px);
    animation: broll_aurora_shift 14s ease-in-out infinite alternate !important;
  }
  @keyframes broll_aurora_wave {
    0% { transform: translate3d(-5%, -5%, 0) scale(1); opacity: 0.7; }
    100% { transform: translate3d(8%, 8%, 0) scale(1.15); opacity: 1; }
  }
  @keyframes broll_aurora_shift {
    0% { transform: translate3d(6%, -8%, 0) rotate(5deg); }
    100% { transform: translate3d(-6%, 6%, 0) rotate(-5deg); }
  }

  #brollLayer.sky {
    background: linear-gradient(165deg, #0284c7, #38bdf8 45%, #bae6fd);
  }
  #brollLayer.sky:before {
    background: radial-gradient(ellipse at 15% 35%, #fff 0 10%, transparent 28%),
                radial-gradient(ellipse at 55% 65%, rgba(255,255,255,0.9) 0 12%, transparent 30%),
                radial-gradient(ellipse at 88% 25%, #fff 0 10%, transparent 28%);
    filter: blur(8px);
    animation: broll_clouds 22s linear infinite !important;
  }
  #brollLayer.sky:after {
    inset: auto 20% 40% auto !important;
    width: 48px !important;
    height: 16px !important;
    background: #fff !important;
    clip-path: polygon(0 45%,60% 43%,90% 0,100% 0,75% 47%,100% 75%,100% 90%,60% 59%,0 59%) !important;
    animation: broll_plane 12s linear infinite !important;
  }
  @keyframes broll_clouds {
    0% { transform: translate3d(-20%, 0, 0); }
    100% { transform: translate3d(20%, 0, 0); }
  }
  @keyframes broll_plane {
    from { transform: translate3d(-80vw, 35vh, 0) scale(0.8); }
    to { transform: translate3d(60vw, -30vh, 0) scale(1.2); }
  }

  #brollLayer.night {
    background: linear-gradient(155deg, #020617, #0f172a 60%, #1e1b4b);
  }
  #brollLayer.night:before {
    background-image: radial-gradient(#fde047 0.8px, transparent 1.2px), radial-gradient(#ffffff 1px, transparent 1.5px);
    background-size: 40px 40px, 90px 90px;
    animation: broll_stars_twinkle 15s linear infinite !important;
  }
  #brollLayer.night:after {
    inset: auto -10% 0 !important;
    height: 45% !important;
    background: repeating-linear-gradient(90deg, #090d16 0 25px, #131d2e 26px 45px, #090d16 46px 65px) !important;
    clip-path: polygon(0 32%,8% 17%,16% 37%,23% 5%,32% 25%,41% 12%,49% 35%,60% 4%,70% 30%,79% 10%,89% 32%,100% 13%,100% 100%,0 100%) !important;
    animation: broll_city_pan 12s linear infinite alternate !important;
  }
  @keyframes broll_stars_twinkle {
    0% { transform: translate3d(0, 0, 0); opacity: 0.7; }
    50% { opacity: 1; }
    100% { transform: translate3d(-5%, -5%, 0); opacity: 0.8; }
  }
  @keyframes broll_city_pan {
    0% { transform: translate3d(-4%, 0, 0); }
    100% { transform: translate3d(4%, 0, 0); }
  }

  #brollLayer.sunset, #brollLayer.cloudSunset {
    background: linear-gradient(175deg, #4c0519, #be123c 35%, #f97316 65%, #fde047 90%);
  }
  #brollLayer.sunset:before, #brollLayer.cloudSunset:before {
    background: radial-gradient(ellipse at 15% 70%, #ffc76c 0 10%, transparent 28%),
                radial-gradient(ellipse at 50% 75%, #ffedd5 0 8%, transparent 22%),
                radial-gradient(ellipse at 85% 55%, #fed7aa 0 10%, transparent 30%);
    filter: blur(12px);
    animation: broll_sunset_clouds 18s linear infinite alternate !important;
  }
  #brollLayer.sunset:after, #brollLayer.cloudSunset:after {
    display: none;
  }

  #brollLayer.water {
    background: linear-gradient(180deg, #0369a1, #0284c7 45%, #075985);
  }
  #brollLayer.water:before {
    background: repeating-radial-gradient(ellipse at 50% 105%, rgba(186, 230, 253, 0.4) 0 1px, transparent 2px 16px);
    transform-origin: 50% 100%;
    animation: broll_water_ripple 6s ease-in-out infinite alternate !important;
  }
  #brollLayer.water:after {
    background: linear-gradient(110deg, transparent 35%, rgba(224, 242, 254, 0.3) 48%, transparent 58%);
    animation: broll_water_shimmer 6s linear infinite !important;
  }
  @keyframes broll_water_ripple {
    0% { transform: scale(1, 1); }
    100% { transform: scale(1.15, 1.08) translate3d(0, -3%, 0); }
  }
  @keyframes broll_water_shimmer {
    from { transform: translate3d(-70%, 0, 0); }
    to { transform: translate3d(70%, 0, 0); }
  }
`;

  let style = document.getElementById('brollPresetStyles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'brollPresetStyles';
    document.head.append(style);
  }
  style.textContent = css;

  window.getBrollPresetGradient = function(p) {
    const map = {
      sky: 'linear-gradient(165deg, #0762a3, #79cdf3 48%, #d9f4ff)',
      space: 'radial-gradient(circle at 72% 20%, #ffe18a 0 2%, transparent 5%), radial-gradient(circle at 19% 88%, #5933a0 0 10%, transparent 24%), #020617',
      aurora: 'linear-gradient(135deg, #051531, #156d89 52%, #663a9c)',
      night: 'linear-gradient(155deg, #030914, #0d2145 58%, #291529)',
      sunset: 'linear-gradient(175deg, #642160, #ec6e69 45%, #ffbf62 72%, #72587f)',
      cloudSunset: 'linear-gradient(175deg, #642160, #ec6e69 45%, #ffbf62 72%, #72587f)',
      water: 'linear-gradient(#084f71, #078fba 45%, #015278)'
    };
    return map[p] || null;
  };

  function draw() {
    const s = active(), p = s.brollPreset || 'none', sp = s.brollSpeed || 'normal';
    let layer = $('brollLayer');
    if (p === 'none' || s.bgMedia) {
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

  // ── Inject Animated Background Themes UI into Right Sidebar ──
  const rightPanel = document.querySelector('.right');
  if (rightPanel && !$('brollPresetPanel')) {
    const brollWrap = document.createElement('div');
    brollWrap.id = 'brollPresetPanel';
    brollWrap.innerHTML = `
      <div class="section-title" style="color:#ffd166;font-weight:800;margin-top:14px;">🎬 ANIMATED BACKGROUND THEMES (অ্যানিমেটেড থিম)</div>
      <div class="row" style="margin-bottom:8px;">
        <label class="field" style="margin:0;">
          Animated Preset
          <select id="brollPreset">
            <option value="none">None (সাধারণ স্লাইড)</option>
            <option value="space">🌌 Space Stars (মহাকাশ তারা)</option>
            <option value="aurora">✨ Aurora Lights (অরোরা লাইটস)</option>
            <option value="water">🌊 Water Ripple (পানির ঢেউ)</option>
            <option value="cloudSunset">🌅 Cloud Sunset (সানসেট মেঘ)</option>
            <option value="sky">☁️ Sky & Clouds (আকাশ মেঘ)</option>
            <option value="night">🌃 City Night (রাতের শহর)</option>
          </select>
        </label>
        <label class="field" id="brollSpeedRow" style="margin:0;">
          Speed
          <select id="brollSpeed">
            <option value="slow">Slow (ধীরগতি)</option>
            <option value="normal" selected>Normal</option>
            <option value="fast">Fast (দ্রুত)</option>
          </select>
        </label>
      </div>
      <div id="brollQuickGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
        <button type="button" data-preset="space" style="font-size:10px;padding:7px 4px;background:#0f172a;border-color:#6366f1;">🌌 Space Stars</button>
        <button type="button" data-preset="aurora" style="font-size:10px;padding:7px 4px;background:#022c22;border-color:#10b981;">✨ Aurora Lights</button>
        <button type="button" data-preset="water" style="font-size:10px;padding:7px 4px;background:#075985;border-color:#38bdf8;">🌊 Water Ripple</button>
        <button type="button" data-preset="cloudSunset" style="font-size:10px;padding:7px 4px;background:#4c1d24;border-color:#f43f5e;">🌅 Cloud Sunset</button>
        <button type="button" data-preset="sky" style="font-size:10px;padding:7px 4px;background:#0c4a6e;border-color:#38bdf8;">☁️ Sky & Clouds</button>
        <button type="button" data-preset="night" style="font-size:10px;padding:7px 4px;background:#1e1b4b;border-color:#818cf8;">🌃 City Night</button>
        <button type="button" data-preset="none" style="font-size:10px;padding:7px 4px;background:#1e293b;border-color:#475569;grid-column:1/-1;">✕ Remove Animation (স্বাভাবিক)</button>
      </div>
    `;

    // Safely insert after BEAUTIFUL SLIDE THEMES or near top of right sidebar
    const themePal = $('themePalette')?.closest('.right > div') || $('themePalette')?.parentElement;
    if (themePal && themePal.parentElement === rightPanel && themePal.nextElementSibling) {
      rightPanel.insertBefore(brollWrap, themePal.nextElementSibling);
    } else if (themePal && themePal.parentElement === rightPanel) {
      themePal.after(brollWrap);
    } else if (rightPanel.firstElementChild && rightPanel.firstElementChild.nextElementSibling) {
      rightPanel.insertBefore(brollWrap, rightPanel.firstElementChild.nextElementSibling);
    } else {
      rightPanel.appendChild(brollWrap);
    }

    // Bind Quick Preset Buttons
    brollWrap.querySelectorAll('#brollQuickGrid button').forEach(b => {
      b.onclick = () => {
        const p = b.dataset.preset;
        const s = active();
        s.brollPreset = p;
        if (p !== 'none') {
          delete s.bgMedia;
          delete s.bgMediaType;
        }
        if ($('brollPreset')) $('brollPreset').value = p;
        if ($('brollSpeedRow')) $('brollSpeedRow').classList.toggle('hidden', p === 'none');
        render();
      };
    });
  }

  const priorInspector = renderInspector;
  renderInspector = function() {
    priorInspector();
    const s = active();
    if (!s) return;
    s.brollPreset = s.bgMedia ? 'none' : (s.brollPreset || 'none');
    s.brollSpeed = s.brollSpeed || 'normal';
    if ($('brollPreset')) $('brollPreset').value = s.brollPreset;
    if ($('brollSpeed')) $('brollSpeed').value = s.brollSpeed;
    if ($('brollSpeedRow')) $('brollSpeedRow').classList.toggle('hidden', s.brollPreset === 'none');

    // Highlight active quick button
    const grid = $('brollQuickGrid');
    if (grid) {
      grid.querySelectorAll('button').forEach(b => {
        b.style.outline = (b.dataset.preset === s.brollPreset) ? '2px solid #fbbf24' : '';
      });
    }
  };

  if ($('brollPreset')) {
    $('brollPreset').onchange = e => {
      const s = active();
      s.brollPreset = e.target.value;
      if (e.target.value !== 'none') {
        delete s.bgMedia;
        delete s.bgMediaType;
      }
      if ($('brollSpeedRow')) $('brollSpeedRow').classList.toggle('hidden', e.target.value === 'none');
      render();
    };
  }
  if ($('brollSpeed')) {
    $('brollSpeed').onchange = e => {
      active().brollSpeed = e.target.value;
      render();
    };
  }
})();