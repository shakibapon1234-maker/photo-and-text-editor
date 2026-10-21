/**
 * presentation-auto-animation.js
 * One-click Auto Animation:
 * - Assigns varied entrance animations to ALL elements in the current slide
 *   (or all slides) sorted top-to-bottom by Y position.
 * - Elements get staggered delays so they appear one after another.
 * - Includes a style picker: Smart (varied), Elegant, Energetic, Minimal.
 */
(() => {
  const $ = id => document.getElementById(id);

  /* ── Animation pools by mood ─────────────────────────────────────── */
  const POOLS = {
    smart: [
      'slideDown', 'fade', 'slideLeft', 'slideRight', 'zoom',
      'pop', 'blurFadeIn', 'wipeDown', 'wipeLeft', 'wipeRight',
      'elasticDrop', 'backInDown', 'flipX', 'zoomRotate', 'curtainWipe',
      'rollIn', 'spiralIn', 'stamp', 'lightSpeed', 'swingDown'
    ],
    elegant: [
      'fade', 'blurFadeIn', 'wipeDown', 'wipeLeft', 'wipeRight',
      'slideDown', 'slideLeft', 'slideRight', 'zoom', 'curtainWipe',
      'appear', 'backInDown', 'backInUp', 'rollIn', 'flipX'
    ],
    energetic: [
      'pop', 'elasticDrop', 'zoomRotate', 'stamp', 'spiralIn',
      'lightSpeed', 'flipX', 'flipY', 'rollIn', 'swing',
      'tada', 'bounce', 'rubberBandIn', 'swingDown', 'backInDown'
    ],
    minimal: [
      'fade', 'slideDown', 'slideLeft', 'wipeDown', 'appear',
      'blurFadeIn', 'wipeLeft', 'zoom', 'backInDown', 'slideRight'
    ]
  };

  const MOOD_LABELS = {
    smart:    '🎲 Smart Mix — সব রকম মিলিয়ে',
    elegant:  '✨ Elegant — মার্জিত ও সুন্দর',
    energetic:'⚡ Energetic — জোরালো ও প্রাণবন্ত',
    minimal:  '🕊️ Minimal — শান্ত ও সাদামাটা'
  };

  const SCOPE_LABELS = {
    current: '📄 শুধু এই স্লাইড',
    all:     '📚 সব স্লাইড'
  };

  /* ── Deterministic-but-varied picker (avoids repeating same anim 2x) ─ */
  function pickAnims(pool, count) {
    const result = [];
    let lastIdx = -1;
    for (let i = 0; i < count; i++) {
      // Use a position-based hash to stay consistent per element
      let idx;
      do {
        idx = (i * 7 + Math.floor(i / pool.length) * 3) % pool.length;
        // Minor shuffle to avoid monotony
        idx = (idx + i * 3) % pool.length;
      } while (idx === lastIdx && pool.length > 1);
      lastIdx = idx;
      result.push(pool[idx]);
    }
    return result;
  }

  /* ── Apply animations to one slide ───────────────────────────────── */
  function applyToSlide(slide, mood, delayStep, duration) {
    if (!slide || !Array.isArray(slide.elements)) return;

    // Sort elements top-to-bottom by Y, then left-to-right by X
    const sorted = [...slide.elements].sort((a, b) => {
      const dy = (a.y || 0) - (b.y || 0);
      return Math.abs(dy) > 3 ? dy : (a.x || 0) - (b.x || 0);
    });

    const pool = POOLS[mood] || POOLS.smart;
    const anims = pickAnims(pool, sorted.length);

    sorted.forEach((el, i) => {
      el.animation       = anims[i];
      el.animationDelay  = parseFloat((i * delayStep).toFixed(2));
      el.animationDuration = duration;
      el.animationOrder  = i + 1;
      el.animationStart  = i === 0 ? 'with' : 'after';
      el.animationLoop   = false;
    });
  }

  /* ── UI: floating modal ───────────────────────────────────────────── */
  document.head.insertAdjacentHTML('beforeend', `<style id="autoAnimStyles">
    #autoAnimModal {
      position: fixed;
      inset: 0;
      background: rgba(4, 8, 18, 0.82);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    #autoAnimModal.open {
      opacity: 1;
      pointer-events: auto;
    }
    #autoAnimBox {
      background: #101827;
      border: 1px solid #2d3e5e;
      border-radius: 14px;
      padding: 26px 28px 22px;
      width: min(92vw, 430px);
      box-shadow: 0 24px 64px rgba(0,0,0,0.75), 0 0 28px rgba(255,177,27,0.14);
      animation: autoAnimScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes autoAnimScaleIn {
      from { transform: scale(0.93); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    #autoAnimBox h3 {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 800;
      color: #ffb11b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .aa-label {
      display: block;
      font-size: 11px;
      color: #98a8c4;
      font-weight: 700;
      margin: 14px 0 6px;
    }
    .aa-btn-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-bottom: 2px;
    }
    .aa-mood-btn, .aa-scope-btn {
      padding: 8px 10px;
      border: 1.5px solid #2e3e58;
      border-radius: 7px;
      background: #182334;
      color: #d0ddf5;
      font: 700 11px inherit;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.12s, background 0.12s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .aa-mood-btn.selected, .aa-scope-btn.selected {
      border-color: #ffb11b;
      background: #253650;
      color: #ffd166;
    }
    .aa-mood-btn:hover, .aa-scope-btn:hover {
      border-color: #ffb11b88;
    }
    .aa-slider-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 14px;
    }
    .aa-slider-row label {
      font-size: 10px;
      color: #98a8c4;
      font-weight: 700;
    }
    .aa-slider-row input[type=range] {
      display: block;
      width: 100%;
      margin-top: 5px;
      accent-color: #ffb11b;
    }
    .aa-slider-row span {
      font-size: 11px;
      color: #ffd166;
      font-weight: 700;
    }
    .aa-apply-btn {
      margin-top: 20px;
      width: 100%;
      padding: 11px;
      background: linear-gradient(90deg, #a85008, #d97706);
      border: 1.5px solid #ffb11b;
      border-radius: 8px;
      color: #fff;
      font: 800 13px inherit;
      cursor: pointer;
      letter-spacing: 0.3px;
      transition: opacity 0.15s;
    }
    .aa-apply-btn:hover { opacity: 0.88; }
    .aa-clear-btn {
      margin-top: 8px;
      width: 100%;
      padding: 7px;
      background: #1a0f0f;
      border: 1px solid #7f1d1d;
      border-radius: 7px;
      color: #fca5a5;
      font: 700 11px inherit;
      cursor: pointer;
      transition: background 0.12s;
    }
    .aa-clear-btn:hover { background: #2d1111; }
    .aa-close-btn {
      float: right;
      background: none;
      border: none;
      color: #4a5e7a;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      margin-top: -2px;
    }
    .aa-close-btn:hover { color: #ffd166; }
    .aa-preview-note {
      margin-top: 12px;
      font-size: 10px;
      color: #4a5e7a;
      line-height: 1.5;
      border-top: 1px solid #1e2d40;
      padding-top: 10px;
    }
  </style>`);

  // Build modal
  const modal = document.createElement('div');
  modal.id = 'autoAnimModal';
  modal.innerHTML = `
    <div id="autoAnimBox">
      <h3>
        ✨ Auto Animation
        <button class="aa-close-btn" id="autoAnimClose" title="বন্ধ করুন">✕</button>
      </h3>

      <span class="aa-label">🎨 স্টাইল বাছাই করুন (Animation Mood)</span>
      <div class="aa-btn-row" id="aaMoodBtns">
        ${Object.entries(MOOD_LABELS).map(([k,v]) =>
          `<button class="aa-mood-btn${k==='smart'?' selected':''}" data-mood="${k}">${v}</button>`
        ).join('')}
      </div>

      <span class="aa-label">📋 কোন স্লাইডে লাগাবেন?</span>
      <div class="aa-btn-row" id="aaScopeBtns">
        ${Object.entries(SCOPE_LABELS).map(([k,v]) =>
          `<button class="aa-scope-btn${k==='current'?' selected':''}" data-scope="${k}">${v}</button>`
        ).join('')}
      </div>

      <div class="aa-slider-row">
        <label>
          ⏱️ Delay between elements (s)
          <input type="range" id="aaDelaySlider" min="0.1" max="1.2" step="0.05" value="0.25">
          <span id="aaDelayVal">0.25s</span>
        </label>
        <label>
          🎬 Animation Duration (s)
          <input type="range" id="aaDurSlider" min="0.3" max="1.5" step="0.1" value="0.6">
          <span id="aaDurVal">0.6s</span>
        </label>
      </div>

      <button class="aa-apply-btn" id="aaApplyBtn">
        ✨ অটো অ্যানিমেশন লাগাও
      </button>
      <button class="aa-clear-btn" id="aaClearBtn">
        🗑️ সব Animation মুছে দাও (Clear All)
      </button>

      <p class="aa-preview-note">
        💡 Apply করার পর <b>▶ Present</b> বা <b>Preview Slide</b> বাটনে ক্লিক করে দেখুন।<br>
        পরে যেকোনো element select করে ডানে Animation panel থেকে পরিবর্তন করতে পারবেন।
      </p>
    </div>
  `;
  document.body.appendChild(modal);

  /* ── State ───────────────────────────────────────────────────────── */
  let selectedMood  = 'smart';
  let selectedScope = 'current';

  /* ── Mood button toggle ──────────────────────────────────────────── */
  document.getElementById('aaMoodBtns').addEventListener('click', e => {
    const btn = e.target.closest('.aa-mood-btn');
    if (!btn) return;
    selectedMood = btn.dataset.mood;
    document.querySelectorAll('.aa-mood-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });

  /* ── Scope button toggle ─────────────────────────────────────────── */
  document.getElementById('aaScopeBtns').addEventListener('click', e => {
    const btn = e.target.closest('.aa-scope-btn');
    if (!btn) return;
    selectedScope = btn.dataset.scope;
    document.querySelectorAll('.aa-scope-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });

  /* ── Sliders ─────────────────────────────────────────────────────── */
  const delaySlider = document.getElementById('aaDelaySlider');
  const durSlider   = document.getElementById('aaDurSlider');
  delaySlider.addEventListener('input', () => {
    document.getElementById('aaDelayVal').textContent = delaySlider.value + 's';
  });
  durSlider.addEventListener('input', () => {
    document.getElementById('aaDurVal').textContent = durSlider.value + 's';
  });

  /* ── Apply ───────────────────────────────────────────────────────── */
  document.getElementById('aaApplyBtn').addEventListener('click', () => {
    const delayStep = parseFloat(delaySlider.value) || 0.25;
    const duration  = parseFloat(durSlider.value)   || 0.6;

    if (selectedScope === 'all') {
      slides.forEach(slide => applyToSlide(slide, selectedMood, delayStep, duration));
      if (typeof window.showPresentationToast === 'function')
        window.showPresentationToast(`✨ সব ${slides.length}টি স্লাইডে Animation লাগানো হয়েছে!`);
    } else {
      applyToSlide(slides[current], selectedMood, delayStep, duration);
      if (typeof window.showPresentationToast === 'function')
        window.showPresentationToast('✨ এই স্লাইডে Auto Animation লাগানো হয়েছে!');
    }

    if (typeof render === 'function') render();
    closeModal();
  });

  /* ── Clear ───────────────────────────────────────────────────────── */
  document.getElementById('aaClearBtn').addEventListener('click', () => {
    const target = selectedScope === 'all' ? slides : [slides[current]];
    target.forEach(slide => {
      if (!Array.isArray(slide?.elements)) return;
      slide.elements.forEach(el => {
        el.animation       = 'none';
        el.animationDelay  = 0;
        el.animationDuration = 0.6;
        el.animationOrder  = undefined;
        el.animationStart  = undefined;
        el.animationLoop   = false;
      });
    });
    if (typeof render === 'function') render();
    if (typeof window.showPresentationToast === 'function')
      window.showPresentationToast('🗑️ Animation সব মুছে দেওয়া হয়েছে');
    closeModal();
  });

  /* ── Open/Close ──────────────────────────────────────────────────── */
  function openModal() { modal.classList.add('open'); }
  function closeModal() { modal.classList.remove('open'); }

  document.getElementById('autoAnimClose').addEventListener('click', closeModal);
  modal.addEventListener('pointerdown', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  window.openAutoAnimationModal = openModal;

  /* ── Inject button into Design dropdown ──────────────────────────── */
  function injectButton() {
    // Try Design menu first
    const designMenu = document.querySelector('.toolbar-menu[data-menu="design"]');
    if (designMenu && !document.getElementById('autoAnimTriggerBtn')) {
      const btn = document.createElement('button');
      btn.id = 'autoAnimTriggerBtn';
      btn.innerHTML = '✨ Auto Animation';
      btn.title = 'এক ক্লিকে সব element-এ অ্যানিমেশন লাগান';
      btn.style.cssText = 'background:linear-gradient(90deg,#5b21b6,#7c3aed);border-color:#a78bfa;color:#fff;font-weight:800;white-space:nowrap;';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        // Close dropdown first
        document.querySelectorAll('#toolbarGroups .toolbar-group.open')
          .forEach(g => g.classList.remove('open'));
        openModal();
      });
      designMenu.prepend(btn);
      return true;
    }

    // Fallback: also add as a standalone button next to Shortcuts
    const toolbarGroups = document.getElementById('toolbarGroups');
    if (toolbarGroups && !document.getElementById('autoAnimFallbackBtn')) {
      const btn = document.createElement('button');
      btn.id = 'autoAnimFallbackBtn';
      btn.innerHTML = '✨ Auto Anim';
      btn.title = 'Auto Animation — এক ক্লিকে সব element-এ অ্যানিমেশন';
      btn.style.cssText = 'background:linear-gradient(90deg,#5b21b6,#7c3aed);border-color:#a78bfa;color:#fff;font-weight:800;padding:7px 10px;border-radius:7px;font-size:11px;';
      btn.addEventListener('click', e => { e.stopPropagation(); openModal(); });
      toolbarGroups.appendChild(btn);
      return true;
    }
    return false;
  }

  // Retry until toolbar is built (other scripts may build it after us)
  function tryInject(retries = 0) {
    if (injectButton()) return;
    if (retries < 20) setTimeout(() => tryInject(retries + 1), 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => tryInject(), 600));
  } else {
    setTimeout(() => tryInject(), 600);
  }

})();
