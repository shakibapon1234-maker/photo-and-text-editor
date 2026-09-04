(() => {
  const $ = id => document.getElementById(id);
  const list = $('slideList');
  if (!list) return;

  // Global Slide Duplication Function
  window.duplicateCurrentSlide = function(targetIndex) {
    if (typeof slides === 'undefined' || !Array.isArray(slides) || !slides.length) return;
    const idx = (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < slides.length) ? targetIndex : current;
    const currentSlide = slides[idx];
    if (!currentSlide) return;

    const copy = structuredClone(currentSlide);
    if (Array.isArray(copy.elements)) {
      copy.elements.forEach(e => {
        e.id = crypto.randomUUID();
      });
    }

    slides.splice(idx + 1, 0, copy);
    current = idx + 1;
    selected = null;

    if (typeof render === 'function') render();
    if (typeof window.renderSlideThumbnailsMaster === 'function') {
      window.renderSlideThumbnailsMaster();
    } else if (typeof renderSlides === 'function') {
      renderSlides();
    }

    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast('✓ স্লাইড ডুপ্লিকেট সম্পন্ন হয়েছে (Slide Duplicated)!');
    }
    window.dispatchEvent(new CustomEvent('presentation:change'));
  };

  // Build dual sticky header for Slide List (New Slide + Duplicate Slide)
  if (!document.getElementById('slideHeaderControls')) {
    const header = document.createElement('div');
    header.id = 'slideHeaderControls';
    header.innerHTML = `
      <button id="alwaysNewSlide" class="primary" title="নতুন স্লাইড তৈরি করুন">＋ New Slide</button>
      <button id="alwaysDuplicateSlide" class="slide-dup-btn" title="বর্তমান স্লাইড হুবহু ডুপ্লিকেট করুন (Ctrl+Shift+D)">⧉ Duplicate</button>
    `;
    list.parentElement.insertBefore(header, list);

    $('alwaysNewSlide').onclick = () => {
      if ($('newSlide')) $('newSlide').click();
    };

    $('alwaysDuplicateSlide').onclick = () => {
      window.duplicateCurrentSlide();
    };

    document.head.insertAdjacentHTML('beforeend', `<style>
      #slideHeaderControls {
        position: sticky;
        top: 0;
        z-index: 10;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin: 0 0 10px;
        background: #0d1524;
        padding: 4px 0 8px;
        border-bottom: 1px solid #1e293b;
      }
      #alwaysNewSlide, #alwaysDuplicateSlide {
        padding: 8px 4px;
        font-size: 11.5px;
        font-weight: 800;
        white-space: nowrap;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      #alwaysDuplicateSlide {
        background: #1e293b;
        border: 1px solid #3b82f6;
        color: #e2e8f0;
      }
      #alwaysDuplicateSlide:hover {
        background: #2563eb;
        border-color: #60a5fa;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      }
      .slide-thumb {
        position: relative;
      }
      .slide-thumb-quick-dup {
        position: absolute;
        top: 4px;
        right: 4px;
        z-index: 8;
        width: 22px;
        height: 22px;
        background: rgba(14, 23, 38, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 4px;
        color: #e2e8f0;
        font-size: 11px;
        font-weight: bold;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .slide-thumb:hover .slide-thumb-quick-dup {
        display: flex;
      }
      .slide-thumb-quick-dup:hover {
        background: #2563eb;
        border-color: #60a5fa;
        color: #ffffff;
        transform: scale(1.15);
      }
    </style>`);
  }
})();