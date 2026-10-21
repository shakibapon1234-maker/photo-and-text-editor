/**
 * presentation-slide-ux-fix.js
 * Fixes 3 UX issues:
 * 1. Drag-and-drop thumbnail reordering in the slide panel
 * 2. Delete key removes the selected slide (when no element is selected)
 * 3. Top dropdown menus auto-close on outside click
 */
(() => {
  const $ = id => document.getElementById(id);

  /* ══════════════════════════════════════════════════════════════
   * 1. DROPDOWN AUTO-CLOSE ON OUTSIDE CLICK
   * ══════════════════════════════════════════════════════════════ */
  document.addEventListener('pointerdown', event => {
    // If click is outside any toolbar-group, close all open menus
    if (!event.target.closest('.toolbar-group')) {
      document.querySelectorAll('#toolbarGroups .toolbar-group.open')
        .forEach(g => g.classList.remove('open'));
    }
  }, true);

  // Also close on Escape key
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('#toolbarGroups .toolbar-group.open')
        .forEach(g => g.classList.remove('open'));
    }
  });


  /* ══════════════════════════════════════════════════════════════
   * 2. DELETE KEY → DELETE SELECTED SLIDE
   *    (Only when no canvas element is selected & not in an input)
   * ══════════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', event => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;

    // Ignore if typing in an input/textarea/select
    const tag = (event.target?.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if (event.target?.isContentEditable || event.target?.contentEditable === 'true') return;
    if (event.target?.closest?.('[contenteditable="true"]')) return;

    // Ignore if a canvas element is currently selected
    if (typeof selected !== 'undefined' && selected !== null) return;

    // Only delete if there are 2+ slides
    if (!Array.isArray(slides) || slides.length <= 1) return;

    // Prevent default (browser back-nav on Backspace)
    event.preventDefault();
    event.stopPropagation();

    // Use existing deletePresentationSlide if available
    if (typeof window.deletePresentationSlide === 'function') {
      window.deletePresentationSlide(current);
    } else {
      slides.splice(current, 1);
      window.current = Math.max(0, Math.min(current, slides.length - 1));
      if (typeof window.selected !== 'undefined') window.selected = null;
      if (typeof render === 'function') render();
    }

    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast('🗑️ Slide ' + (current + 1) + ' deleted');
    }
  }, true);


  /* ══════════════════════════════════════════════════════════════
   * 3. DRAG-AND-DROP THUMBNAIL REORDERING
   * ══════════════════════════════════════════════════════════════ */

  // CSS for drag-and-drop visual feedback
  document.head.insertAdjacentHTML('beforeend', `<style id="slideDragDropStyles">
    #slideList .slide-thumb {
      transition: transform 0.12s ease, opacity 0.12s ease;
      cursor: grab;
    }
    #slideList .slide-thumb.sdd-dragging {
      opacity: 0.4;
      transform: scale(0.97);
      cursor: grabbing;
    }
    #slideList .slide-thumb.sdd-over {
      box-shadow: 0 0 0 3px #ffb11b, 0 0 14px rgba(255,177,27,0.55) !important;
      border-color: #ffb11b !important;
    }
    #slideList .slide-thumb.sdd-over-above::before {
      content: '';
      display: block;
      position: absolute;
      top: -6px; left: 0; right: 0;
      height: 3px;
      background: #ffb11b;
      border-radius: 2px;
      z-index: 99;
    }
    #slideList .slide-thumb.sdd-over-below::after {
      content: '';
      display: block;
      position: absolute;
      bottom: -6px; left: 0; right: 0;
      height: 3px;
      background: #ffb11b;
      border-radius: 2px;
      z-index: 99;
    }
    #slideList .slide-thumb .sdd-handle {
      position: absolute;
      top: 4px; right: 22px;
      width: 16px; height: 16px;
      background: rgba(0,0,0,0.55);
      border-radius: 3px;
      display: flex; align-items: center; justify-content: center;
      opacity: 0;
      transition: opacity 0.15s;
      cursor: grab;
      z-index: 20;
      font-size: 10px;
      color: #ffd166;
      pointer-events: auto;
    }
    #slideList .slide-thumb:hover .sdd-handle {
      opacity: 1;
    }
  </style>`);

  let dragSrcIdx = null;
  let dragOverIdx = null;

  function getThumbIndex(thumb) {
    const list = $('slideList');
    if (!list) return -1;
    return [...list.querySelectorAll('.slide-thumb')].indexOf(thumb);
  }

  function reorderSlides(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const moved = slides.splice(fromIdx, 1)[0];
    slides.splice(toIdx, 0, moved);

    // Update current pointer
    if (current === fromIdx) {
      window.current = toIdx;
    } else if (fromIdx < current && toIdx >= current) {
      window.current = current - 1;
    } else if (fromIdx > current && toIdx <= current) {
      window.current = current + 1;
    }

    if (typeof window.selected !== 'undefined') window.selected = null;
    if (typeof render === 'function') render();

    if (typeof window.showPresentationToast === 'function') {
      window.showPresentationToast('↕️ Slide moved to position ' + (toIdx + 1));
    }
  }

  // Attach drag events whenever thumbnails are rendered
  function attachDragHandlers() {
    const list = $('slideList');
    if (!list) return;

    const thumbs = list.querySelectorAll('.slide-thumb');
    thumbs.forEach((thumb, idx) => {
      // Skip if already set up
      if (thumb.dataset.sddReady === '1') return;
      thumb.dataset.sddReady = '1';

      // Add drag handle icon
      if (!thumb.querySelector('.sdd-handle')) {
        const handle = document.createElement('span');
        handle.className = 'sdd-handle';
        handle.innerHTML = '⣿';
        handle.title = 'Drag to reorder slide';
        thumb.appendChild(handle);
      }

      // Pointer-based drag (works on touch + mouse)
      thumb.addEventListener('pointerdown', ev => {
        // Only start drag from the handle or with Alt key, otherwise it's a normal click
        const fromHandle = ev.target.closest('.sdd-handle');
        if (!fromHandle) return;

        ev.preventDefault();
        ev.stopPropagation();

        dragSrcIdx = getThumbIndex(thumb);
        thumb.classList.add('sdd-dragging');
        thumb.setPointerCapture(ev.pointerId);
        window.__presentationLiveDrag = true;
      });

      thumb.addEventListener('pointermove', ev => {
        if (dragSrcIdx === null) return;
        ev.preventDefault();

        // Find which thumb the pointer is over
        const thumbs = [...list.querySelectorAll('.slide-thumb')];
        const mouseY = ev.clientY;

        let targetIdx = -1;
        for (let i = 0; i < thumbs.length; i++) {
          const rect = thumbs[i].getBoundingClientRect();
          if (mouseY >= rect.top && mouseY <= rect.bottom) {
            targetIdx = i;
            break;
          }
        }

        // Clear all highlight
        thumbs.forEach(t => t.classList.remove('sdd-over', 'sdd-over-above', 'sdd-over-below'));

        if (targetIdx >= 0 && targetIdx !== dragSrcIdx) {
          dragOverIdx = targetIdx;
          thumbs[targetIdx].classList.add('sdd-over');
          if (targetIdx < dragSrcIdx) {
            thumbs[targetIdx].classList.add('sdd-over-above');
          } else {
            thumbs[targetIdx].classList.add('sdd-over-below');
          }
        } else {
          dragOverIdx = null;
        }
      });

      thumb.addEventListener('pointerup', ev => {
        if (dragSrcIdx === null) return;
        ev.preventDefault();

        const thumbs = [...list.querySelectorAll('.slide-thumb')];
        thumbs.forEach(t => t.classList.remove('sdd-dragging', 'sdd-over', 'sdd-over-above', 'sdd-over-below'));

        if (dragOverIdx !== null && dragOverIdx !== dragSrcIdx) {
          reorderSlides(dragSrcIdx, dragOverIdx);
        }

        dragSrcIdx = null;
        dragOverIdx = null;
        window.__presentationLiveDrag = false;
      });

      thumb.addEventListener('pointercancel', () => {
        const thumbs = [...list.querySelectorAll('.slide-thumb')];
        thumbs.forEach(t => t.classList.remove('sdd-dragging', 'sdd-over', 'sdd-over-above', 'sdd-over-below'));
        dragSrcIdx = null;
        dragOverIdx = null;
        window.__presentationLiveDrag = false;
      });
    });
  }

  // Patch renderSlides / renderSlideThumbnailsMaster to attach drag handlers after each render
  function patchRenderWithDrag() {
    const origRender = window.renderSlideThumbnailsMaster;
    if (typeof origRender === 'function') {
      window.renderSlideThumbnailsMaster = function(...args) {
        origRender.apply(this, args);
        // Attach after a tiny delay to ensure DOM is ready
        setTimeout(attachDragHandlers, 60);
      };
    }

    const origRenderSlides = window.renderSlides;
    if (typeof origRenderSlides === 'function' && origRenderSlides !== window.renderSlideThumbnailsMaster) {
      window.renderSlides = function(...args) {
        origRenderSlides.apply(this, args);
        setTimeout(attachDragHandlers, 60);
      };
    }
  }

  // Wait for the app to fully initialize, then patch
  function init() {
    const list = $('slideList');
    if (!list || typeof slides === 'undefined') {
      setTimeout(init, 300);
      return;
    }

    patchRenderWithDrag();
    attachDragHandlers();
  }

  // Initialize after scripts are loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

})();
