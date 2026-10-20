/**
 * Presentation Multi-Selection & Batch Animation Suite
 * Enables:
 * 1. Shift + Click / Ctrl + Click / Cmd + Click multi-selection on canvas
 * 2. Rubberband / Marquee drag box selection on canvas
 * 3. Simultaneous multi-object animation assignment
 * 4. "⚡ Play Together" (With previous) synchronization for grouped appearances
 * 5. "⏳ In Sequence" (After previous) step-by-step animation sequencing
 * 6. Object Grouping & Ungrouping (Ctrl+G / Ctrl+Shift+G)
 * 7. Multi-element live animation preview on the slide
 */

(() => {
  const $ = id => document.getElementById(id);

  if (!window.selectedIds) {
    window.selectedIds = new Set();
  }

  // Inject styles for multi-selection, marquee box, and batch controls
  document.head.insertAdjacentHTML('beforeend', `
    <style id="multiSelectStyles">
      .element.selected {
        outline: 2px solid #ffb11b !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 12px rgba(255, 177, 27, 0.45) !important;
      }
      .element.is-grouped::after {
        content: '🔗';
        position: absolute;
        top: -12px;
        right: -8px;
        font-size: 11px;
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 100;
      }
      #slideMarqueeBox {
        position: absolute;
        border: 1.5px dashed #ffb11b;
        background: rgba(255, 177, 27, 0.15);
        pointer-events: none;
        z-index: 9999;
        border-radius: 4px;
        box-shadow: 0 0 15px rgba(255, 177, 27, 0.25);
      }
      .batch-anim-box {
        background: #0b1322;
        border: 1.5px solid #ffb11b;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      }
      .batch-chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin: 8px 0;
        max-height: 80px;
        overflow-y: auto;
      }
      .batch-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #17243c;
        border: 1px solid #33486e;
        border-radius: 4px;
        padding: 2px 7px;
        font-size: 10px;
        color: #edf3ff;
        font-weight: 700;
        max-width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .batch-chip .chip-type {
        color: #ffd166;
        font-size: 9px;
      }
    </style>
  `);

  function getSelectedElements() {
    const s = typeof active === 'function' ? active() : null;
    if (!s || !s.elements) return [];
    if (!window.selectedIds || window.selectedIds.size === 0) {
      const single = typeof selectedEl === 'function' ? selectedEl() : null;
      return single ? [single] : [];
    }
    return s.elements.filter(e => window.selectedIds.has(e.id));
  }
  window.getSelectedElements = getSelectedElements;

  function clearMultiSelection() {
    if (window.selectedIds) window.selectedIds.clear();
    selected = null;
    document.querySelectorAll('#slide .element').forEach(el => el.classList.remove('selected'));
    if (typeof updateHandles === 'function') updateHandles();
    if (typeof renderInspector === 'function') renderInspector();
    syncMultiSelectionUI();
  }
  window.clearMultiSelection = clearMultiSelection;

  // Helper to format item label
  function getItemTitle(item) {
    if (!item) return 'Element';
    if (item.type === 'text') {
      const clean = (item.text || 'Text').replace(/\s+/g, ' ').trim();
      return clean.length > 14 ? clean.slice(0, 14) + '…' : clean;
    }
    if (item.type === 'shape') {
      return (item.shape || 'Shape').toUpperCase();
    }
    if (item.type === 'image') return 'Image';
    if (item.type === 'video') return 'Video';
    if (item.type === 'table') return 'Table';
    return item.type || 'Object';
  }

  // Multi-element simultaneous live preview on canvas
  function previewBatchAnimations(items) {
    const elements = items || getSelectedElements();
    if (!elements || !elements.length) return;
    const slideNode = $('slide');
    if (!slideNode) return;

    elements.forEach(el => {
      const node = slideNode.querySelector('.element[data-id="' + el.id + '"]');
      if (node) {
        node.getAnimations().forEach(a => a.cancel());
      }
    });

    elements.forEach((el, idx) => {
      if (!el.animation || el.animation === 'none') return;
      const node = slideNode.querySelector('.element[data-id="' + el.id + '"]');
      if (!node) return;

      const f = (typeof window.getAnimFrames === 'function')
        ? window.getAnimFrames(el.animation, el.rotation)
        : [{ opacity: 0 }, { opacity: 1 }];

      const dur = Math.max(0.1, Number(el.animationDuration) || 0.6) * 1000;
      let del = Math.max(0, Number(el.animationDelay) || 0) * 1000;

      // Stagger slightly if in sequential mode for preview
      if (el.animationStart === 'after' && idx > 0) {
        del += idx * 300;
      }

      const anim = node.animate(f, {
        duration: dur,
        delay: del,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'both'
      });

      if (!el.animationLoop) {
        anim.onfinish = () => {
          setTimeout(() => {
            if (node && node.style) {
              node.style.opacity = '';
              node.style.transform = el.rotation ? ('rotate(' + el.rotation + 'deg)') : '';
              node.style.clipPath = '';
              node.style.filter = '';
            }
          }, 120);
        };
      }
    });
  }
  window.previewAllSelectedAnimations = previewBatchAnimations;

  // Batch action: Play all selected together (With previous)
  function applyBatchPlayTogether() {
    const items = getSelectedElements();
    if (items.length < 2) return;

    // Use currently selected dropdown animation or fallback
    const selDropdown = $('elementAnimation');
    let effect = (selDropdown && selDropdown.value !== 'none') ? selDropdown.value : 'slideUp';
    const dur = Math.max(0.1, Number($('animationDuration')?.value) || 0.6);
    const del = Math.max(0, Number($('animationDelay')?.value) || 0);

    // Determine target step order
    let baseOrder = items[0].animationOrder;
    if (!baseOrder) {
      const existing = (active()?.elements || []).map(e => e.animationOrder || 0);
      baseOrder = Math.max(0, ...existing) + 1;
    }

    items.forEach((item, idx) => {
      if (!item.animation || item.animation === 'none') {
        item.animation = effect;
      }
      item.animationDuration = dur;
      item.animationDelay = del;
      item.animationOrder = baseOrder;
      // First item triggers on click; all subsequent items trigger WITH it
      item.animationStart = (idx === 0) ? (item.animationStart || 'click') : 'with';
    });

    if (typeof render === 'function') render();
    syncMultiSelectionUI();
    previewBatchAnimations(items);

    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast(`⚡ ${items.length}টি অবজেক্ট একসাথে (With previous) অ্যানিমেট হবে!`);
    }
    if (typeof window.presentationSaveNow === 'function') {
      window.presentationSaveNow();
    }
  }

  // Batch action: Play all selected in sequence (After previous)
  function applyBatchPlaySequence() {
    const items = getSelectedElements();
    if (items.length < 2) return;

    const selDropdown = $('elementAnimation');
    let effect = (selDropdown && selDropdown.value !== 'none') ? selDropdown.value : 'slideUp';
    const dur = Math.max(0.1, Number($('animationDuration')?.value) || 0.6);
    const del = Math.max(0, Number($('animationDelay')?.value) || 0);

    let baseOrder = items[0].animationOrder;
    if (!baseOrder) {
      const existing = (active()?.elements || []).map(e => e.animationOrder || 0);
      baseOrder = Math.max(0, ...existing) + 1;
    }

    items.forEach((item, idx) => {
      if (!item.animation || item.animation === 'none') {
        item.animation = effect;
      }
      item.animationDuration = dur;
      item.animationDelay = del;
      item.animationOrder = baseOrder + idx;
      item.animationStart = (idx === 0) ? 'click' : 'after';
    });

    if (typeof render === 'function') render();
    syncMultiSelectionUI();
    previewBatchAnimations(items);

    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast(`⏳ ${items.length}টি অবজেক্ট একের পর এক (Sequence) অ্যানিমেট হবে!`);
    }
    if (typeof window.presentationSaveNow === 'function') {
      window.presentationSaveNow();
    }
  }

  // Group selected elements
  function groupSelectedElements() {
    const items = getSelectedElements();
    if (items.length < 2) {
      if (typeof window.showPresentationToast === 'function') {
        window.showPresentationToast('গ্রুপ করতে কমপক্ষে ২টি অবজেক্ট সিলেক্ট করুন');
      }
      return;
    }
    const groupId = 'grp_' + Date.now().toString(36);
    items.forEach(item => {
      item.groupId = groupId;
    });

    if (typeof render === 'function') render();
    syncMultiSelectionUI();

    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast(`🔗 ${items.length}টি অবজেক্ট গ্রুপ করা হয়েছে! (Ctrl+G)`);
    }
    if (typeof window.presentationSaveNow === 'function') {
      window.presentationSaveNow();
    }
  }

  // Ungroup selected elements
  function ungroupSelectedElements() {
    const items = getSelectedElements();
    let count = 0;
    items.forEach(item => {
      if (item.groupId) {
        delete item.groupId;
        count++;
      }
    });

    if (count > 0) {
      if (typeof render === 'function') render();
      syncMultiSelectionUI();
      if (typeof window.showPresentationToast === 'function') {
        window.showPresentationToast('🔓 অবজেক্টগুলো আনগ্রুপ করা হয়েছে!');
      }
      if (typeof window.presentationSaveNow === 'function') {
        window.presentationSaveNow();
      }
    }
  }

  window.groupSelectedElements = groupSelectedElements;
  window.ungroupSelectedElements = ungroupSelectedElements;

  // Render the Batch Animation Panel inside the right sidebar
  function syncMultiSelectionUI() {
    const items = getSelectedElements();
    const inspector = $('animationInspector');
    if (!inspector) return;

    let box = $('batchAnimationBox');
    if (items.length <= 1) {
      if (box) box.style.display = 'none';
      return;
    }

    if (!box) {
      box = document.createElement('div');
      box.id = 'batchAnimationBox';
      box.className = 'batch-anim-box';
      inspector.insertBefore(box, inspector.firstChild);
    }
    box.style.display = 'block';

    const isGrouped = items.every(it => it.groupId && it.groupId === items[0].groupId);

    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:800;color:#ffb11b;font-size:11px;letter-spacing:0.5px">
          ✦ MULTI-OBJECT ANIMATION
        </span>
        <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#ffb11b2e;color:#ffd166;font-weight:800">
          ${items.length} Selected
        </span>
      </div>
      <p style="font-size:11px;color:#98a8c4;margin:0 0 6px;line-height:1.4">
        নির্বাচিত ${items.length}টি উপাদানে একসাথে অ্যানিমেশন সেট করুন:
      </p>
      <div class="batch-chip-list">
        ${items.map(it => `
          <span class="batch-chip" title="${it.type}: ${getItemTitle(it)}">
            <span class="chip-type">${it.type === 'shape' ? '💼' : it.type === 'image' ? '🖼️' : '📄'}</span>
            ${getItemTitle(it)}
          </span>
        `).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 6px">
        <button id="btnBatchTogether" type="button" style="background:#059669;border:1px solid #34d399;color:#fff;font-weight:800;padding:8px 4px;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:4px">
          ⚡ একসাথে (Together)
        </button>
        <button id="btnBatchSequence" type="button" style="background:#2563eb;border:1px solid #60a5fa;color:#fff;font-weight:800;padding:8px 4px;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:4px">
          ⏳ পরপর (Sequence)
        </button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
        <button id="btnBatchGroup" type="button" style="background:#1e293b;border:1px solid #475569;color:#e2e8f0;font-weight:700;padding:6px;border-radius:6px;cursor:pointer;font-size:10px">
          ${isGrouped ? '✓ Grouped (গ্রুপড)' : '🔗 Group (Ctrl+G)'}
        </button>
        <button id="btnBatchUngroup" type="button" style="background:#1e293b;border:1px solid #475569;color:#e2e8f0;font-weight:700;padding:6px;border-radius:6px;cursor:pointer;font-size:10px">
          🔓 Ungroup
        </button>
      </div>
      <button id="btnBatchPreview" type="button" style="width:100%;background:#d97706;border:1px solid #fbbf24;color:#fff;font-weight:800;padding:7px;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;gap:6px">
        ▶ নির্বাচিত সবগুলো একসাথে প্রিভিউ
      </button>
    `;

    $('btnBatchTogether').onclick = applyBatchPlayTogether;
    $('btnBatchSequence').onclick = applyBatchPlaySequence;
    $('btnBatchGroup').onclick = groupSelectedElements;
    $('btnBatchUngroup').onclick = ungroupSelectedElements;
    $('btnBatchPreview').onclick = () => previewBatchAnimations(items);

    // Ensure animation inspector is visible
    inspector.classList.remove('hidden');
    $('emptyInspector')?.classList.add('hidden');
  }
  window.syncMultiSelectionUI = syncMultiSelectionUI;

  // Intercept dropdown changes on elementAnimation / Delay / Duration
  ['elementAnimation', 'animationDelay', 'animationDuration'].forEach(id => {
    const el = $(id);
    if (!el) return;

    el.addEventListener('change', () => {
      const items = getSelectedElements();
      if (items.length > 1) {
        const animVal = $('elementAnimation').value;
        const durVal = Math.max(0.1, Number($('animationDuration')?.value) || 0.6);
        const delVal = Math.max(0, Number($('animationDelay')?.value) || 0);

        let baseOrder = items[0].animationOrder;
        if (!baseOrder) {
          const existing = (active()?.elements || []).map(e => e.animationOrder || 0);
          baseOrder = Math.max(0, ...existing) + 1;
        }

        items.forEach((it, idx) => {
          it.animation = animVal;
          it.animationDuration = durVal;
          it.animationDelay = delVal;
          it.animationOrder = baseOrder;
          // Synchronize together by default
          it.animationStart = (idx === 0) ? (it.animationStart || 'click') : 'with';
        });

        if (typeof window.showPresentationToast === 'function') {
          window.showPresentationToast(`⚡ ${items.length}টি অবজেক্টে "${animVal}" অ্যানিমেশন সেট করা হয়েছে!`);
        }
        if (typeof window.presentationSaveNow === 'function') {
          window.presentationSaveNow();
        }
        previewBatchAnimations(items);
        syncMultiSelectionUI();
      }
    });
  });

  // ── Marquee / Rubberband Box Selection on Slide Canvas ──
  let marqueeState = null;

  function initMarqueeSelection() {
    const slide = $('slide');
    if (!slide) return;

    slide.addEventListener('pointerdown', event => {
      // Only start marquee if pointerdown was on the slide canvas itself
      if (event.target !== slide && !event.target.classList.contains('slide')) return;
      if (event.target.closest?.('.element, .hard-resize, .hard-rotate, #ctx-toolbar')) return;

      const slideRect = slide.getBoundingClientRect();
      marqueeState = {
        startX: event.clientX,
        startY: event.clientY,
        slideRect,
        active: false,
        box: null,
        isAddMode: event.shiftKey || event.ctrlKey || event.metaKey
      };
    });

    window.addEventListener('pointermove', event => {
      if (!marqueeState) return;

      const dx = event.clientX - marqueeState.startX;
      const dy = event.clientY - marqueeState.startY;
      const dist = Math.hypot(dx, dy);

      if (!marqueeState.active) {
        if (dist > 8) {
          marqueeState.active = true;
          const box = document.createElement('div');
          box.id = 'slideMarqueeBox';
          $('slide')?.appendChild(box);
          marqueeState.box = box;
        } else {
          return;
        }
      }

      const rect = marqueeState.slideRect;
      const x1 = Math.min(marqueeState.startX, event.clientX) - rect.left;
      const y1 = Math.min(marqueeState.startY, event.clientY) - rect.top;
      const w = Math.abs(dx);
      const h = Math.abs(dy);

      marqueeState.box.style.left = x1 + 'px';
      marqueeState.box.style.top = y1 + 'px';
      marqueeState.box.style.width = w + 'px';
      marqueeState.box.style.height = h + 'px';

      // Check intersection with all elements on slide
      const boxRect = { left: x1, top: y1, right: x1 + w, bottom: y1 + h };
      const currentElements = active()?.elements || [];

      document.querySelectorAll('#slide .element').forEach(elNode => {
        const elLeft = (parseFloat(elNode.style.left) * rect.width) / 100;
        const elTop = (parseFloat(elNode.style.top) * rect.height) / 100;
        const elWidth = (parseFloat(elNode.style.width) * rect.width) / 100;
        const elHeight = (parseFloat(elNode.style.height) * rect.height) / 100;

        const isIntersecting = !(
          elLeft > boxRect.right ||
          elLeft + elWidth < boxRect.left ||
          elTop > boxRect.bottom ||
          elTop + elHeight < boxRect.top
        );

        if (isIntersecting) {
          window.selectedIds.add(elNode.dataset.id);
        } else if (!marqueeState.isAddMode) {
          window.selectedIds.delete(elNode.dataset.id);
        }
      });

      document.querySelectorAll('#slide .element').forEach(elNode => {
        elNode.classList.toggle('selected', window.selectedIds.has(elNode.dataset.id));
      });
    });

    window.addEventListener('pointerup', event => {
      if (!marqueeState) return;

      if (marqueeState.active) {
        marqueeState.box?.remove();
        marqueeState.active = false;

        const count = window.selectedIds.size;
        if (count > 0) {
          selected = Array.from(window.selectedIds)[count - 1];
          if (typeof updateHandles === 'function') updateHandles();
          if (typeof renderInspector === 'function') renderInspector();
          syncMultiSelectionUI();
          if (typeof window.showPresentationToast === 'function') {
            window.showPresentationToast(`✓ ${count}টি অবজেক্ট নির্বাচিত হয়েছে`);
          }
        }
      }
      marqueeState = null;
    });
  }

  // Keyboard Shortcuts: Ctrl+G (Group), Ctrl+Shift+G (Ungroup)
  window.addEventListener('keydown', event => {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.key === 'g' || event.key === 'G')) {
      event.preventDefault();
      if (event.shiftKey) {
        ungroupSelectedElements();
      } else {
        groupSelectedElements();
      }
    }
  });

  // Ensure inspector syncs when switching slides or rendering
  const prevRenderInspector = window.renderInspector;
  window.renderInspector = function() {
    if (typeof prevRenderInspector === 'function') prevRenderInspector();
    syncMultiSelectionUI();
  };

  // Boot up
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMarqueeSelection();
      syncMultiSelectionUI();
    });
  } else {
    initMarqueeSelection();
    syncMultiSelectionUI();
  }
})();
