(() => {
  const $ = id => document.getElementById(id);

  let _lastClickId = null;
  let _lastClickTime = 0;
  const DBLCLICK_MS = 350;

  // ──────────────────────────────────────────────────────────────────────────
  // Toast Notification System
  // ──────────────────────────────────────────────────────────────────────────
  function showToast(message, duration = 1800) {
    let toast = $('presentation-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'presentation-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = '';
    }, duration);
  }
  window.showPresentationToast = showToast;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Activate Direct On-Screen Inline Text Editing
  // ──────────────────────────────────────────────────────────────────────────
  window.activateInlineTextEdit = function(item) {
    if (!item) return;
    selected = item.id;
    
    const node = $('slide')?.querySelector('.text-el[data-id="' + item.id + '"]');
    if (!node) return;

    node.classList.add('inline-editing');
    node.contentEditable = 'true';
    node.spellcheck = false;
    node.style.setProperty('user-select', 'text', 'important');
    node.style.setProperty('-webkit-user-select', 'text', 'important');
    node.style.setProperty('cursor', 'text', 'important');
    node.style.setProperty('outline', '2px dashed #4f8df7', 'important');
    node.style.setProperty('outline-offset', '3px', 'important');
    node.style.setProperty('caret-color', '#ffd166', 'important');

    // Remove transform handles while editing
    node.querySelectorAll('.hard-resize, .hard-rotate').forEach(h => h.remove());

    setTimeout(() => {
      node.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    }, 10);

    node.oninput = e => {
      e.stopPropagation();
      item.text = (node.innerText || node.textContent || '').replace(/\r/g, '');
      if ($('textValue')) $('textValue').value = item.text;
      if (typeof window.renderSlideThumbnailsMaster === 'function') window.renderSlideThumbnailsMaster();
      window.dispatchEvent(new CustomEvent('presentation:change'));
    };

    node.onblur = () => {
      node.contentEditable = 'false';
      node.classList.remove('inline-editing');
      node.style.outline = '';
      node.style.outlineOffset = '';
      item.text = (node.innerText || node.textContent || '').replace(/\r/g, '');
      if ($('textValue')) $('textValue').value = item.text;
      if (typeof render === 'function') render();
      window.dispatchEvent(new CustomEvent('presentation:change'));
    };

    if (typeof renderInspector === 'function') renderInspector();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Activate Direct On-Screen Inline Shape Editing
  // ──────────────────────────────────────────────────────────────────────────
  window.activateInlineShapeEdit = function(item) {
    if (!item) return;
    selected = item.id;
    const node = $('slide')?.querySelector('.shape-el[data-id="' + item.id + '"]');
    if (!node) return;
    let label = node.querySelector('.shape-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'shape-label';
      node.appendChild(label);
    }
    
    node.classList.add('inline-editing');
    label.contentEditable = 'true';
    label.spellcheck = false;
    label.style.setProperty('user-select', 'text', 'important');
    label.style.setProperty('-webkit-user-select', 'text', 'important');
    label.style.setProperty('cursor', 'text', 'important');
    label.style.setProperty('pointer-events', 'auto', 'important');
    label.style.setProperty('caret-color', '#ffd166', 'important');

    node.querySelectorAll('.hard-resize, .hard-rotate').forEach(h => h.remove());

    setTimeout(() => {
      label.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(label);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) {}
    }, 10);

    label.oninput = e => {
      e.stopPropagation();
      item.text = (label.innerText || label.textContent || '').replace(/\r/g, '');
      if ($('shapeText')) $('shapeText').value = item.text;
      if (typeof window.renderSlideThumbnailsMaster === 'function') window.renderSlideThumbnailsMaster();
      window.dispatchEvent(new CustomEvent('presentation:change'));
    };

    label.onblur = () => {
      label.contentEditable = 'false';
      node.classList.remove('inline-editing');
      label.style.pointerEvents = 'none';
      item.text = (label.innerText || label.textContent || '').replace(/\r/g, '');
      if (typeof render === 'function') render();
      window.dispatchEvent(new CustomEvent('presentation:change'));
    };

    if (typeof renderInspector === 'function') renderInspector();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Select All Text Inside Text Box or Shape on Ctrl+A
  // ──────────────────────────────────────────────────────────────────────────
  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
      const target = event.target;
      const tagName = (target && target.tagName ? target.tagName.toLowerCase() : '');
      const isNativeInput = ['input', 'textarea'].includes(tagName);

      if (isNativeInput) {
        return;
      }

      // Check if user is currently inside a contentEditable (or activeElement is contentEditable)
      const activeEditable = target?.isContentEditable 
        ? target 
        : (document.activeElement?.isContentEditable ? document.activeElement : target?.closest?.('[contenteditable="true"]'));

      if (activeEditable) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(activeEditable);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (_) {}
        return;
      }

      // Check if a Text or Shape is currently selected on the canvas
      const item = typeof selectedEl === 'function' ? selectedEl() : null;
      if (item && (item.type === 'text' || item.type === 'shape')) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (item.type === 'text') {
          window.activateInlineTextEdit(item);
          const content = $('slide')?.querySelector('.text-el[data-id="' + item.id + '"] .text-content');
          if (content) {
            content.contentEditable = 'true';
            content.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(content);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (_) {}
          }
        } else if (item.type === 'shape') {
          window.activateInlineShapeEdit(item);
          const label = $('slide')?.querySelector('.shape-el[data-id="' + item.id + '"] .shape-label');
          if (label) {
            label.contentEditable = 'true';
            label.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(label);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (_) {}
          }
        }
        return;
      }

      // Prevent whole webpage text selection when pressing Ctrl+A outside editable elements
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Ctrl + Mouse Wheel Zoom In / Zoom Out
  // ──────────────────────────────────────────────────────────────────────────
  let _zoomLevel = 1.0;

  function updateZoomUI() {
    const badge = $('zoomPercentageBadge');
    if (badge) badge.textContent = Math.round(_zoomLevel * 100) + '%';
  }

  window.getPresentationZoom = () => _zoomLevel;

  window.setPresentationZoom = function(level) {
    _zoomLevel = Math.max(0.3, Math.min(3.0, Math.round(level * 100) / 100));
    const slide = $('slide');
    if (slide) {
      slide.style.transform = `scale(${_zoomLevel})`;
      slide.style.transformOrigin = 'center center';
      slide.style.transition = 'transform 0.08s ease-out';
    }
    updateZoomUI();
  };

  function setupZoomControls() {
    let stageWrap = document.querySelector('.stage-wrap');
    if (!stageWrap) return;

    if (!$('presentationZoomHud')) {
      const hud = document.createElement('div');
      hud.id = 'presentationZoomHud';
      hud.innerHTML = `
        <button id="zoomOutBtn" title="Zoom Out (Ctrl + Scroll Down)">−</button>
        <span id="zoomPercentageBadge" title="Click to Reset Zoom (100%)">100%</span>
        <button id="zoomInBtn" title="Zoom In (Ctrl + Scroll Up)">+</button>
        <button id="zoomResetBtn" title="Reset Zoom to 100%">Reset</button>
      `;
      stageWrap.appendChild(hud);

      $('zoomOutBtn').onclick = e => { e.stopPropagation(); window.setPresentationZoom(_zoomLevel - 0.1); };
      $('zoomInBtn').onclick = e => { e.stopPropagation(); window.setPresentationZoom(_zoomLevel + 0.1); };
      $('zoomResetBtn').onclick = e => { e.stopPropagation(); window.setPresentationZoom(1.0); };
      $('zoomPercentageBadge').onclick = e => { e.stopPropagation(); window.setPresentationZoom(1.0); };
    }

    stageWrap.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.08 : -0.08;
        window.setPresentationZoom(_zoomLevel + delta);
      }
    }, { passive: false });
  }

  document.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) {
      const stageWrap = document.querySelector('.stage-wrap');
      if (stageWrap && (stageWrap.contains(event.target) || event.target.closest?.('.workspace'))) {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.08 : -0.08;
        window.setPresentationZoom(_zoomLevel + delta);
      }
    }
  }, { passive: false });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Image Upload & Replacement Engine
  // ──────────────────────────────────────────────────────────────────────────
  let _fileInput = null;
  window.uploadOrReplaceImage = function(targetItem) {
    if (!targetItem) {
      targetItem = typeof selectedEl === 'function' ? selectedEl() : null;
    }
    if (!_fileInput) {
      _fileInput = document.createElement('input');
      _fileInput.type = 'file';
      _fileInput.accept = 'image/*';
      _fileInput.style.display = 'none';
      document.body.appendChild(_fileInput);
    }
    _fileInput.onchange = e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        if (targetItem) {
          if (targetItem.type === 'image') {
            targetItem.src = src;
          } else if (targetItem.type === 'shape') {
            // Convert shape or assign image
            targetItem.type = 'image';
            targetItem.src = src;
          } else {
            targetItem.src = src;
          }
        } else {
          // Insert new image
          const newImg = {
            id: crypto.randomUUID(),
            type: 'image',
            src,
            x: 30,
            y: 30,
            w: 40,
            h: 30,
            rotation: 0
          };
          active().elements.push(newImg);
          selected = newImg.id;
        }
        if (typeof render === 'function') render();
        showToast('✓ Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
      _fileInput.value = '';
    };
    _fileInput.click();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Shape & Element Copy / Duplicate System (Debounced & Single Copy)
  // ──────────────────────────────────────────────────────────────────────────
  let _lastDuplicateTime = 0;

  window.duplicatePresentationElement = function(item) {
    const now = Date.now();
    if (now - _lastDuplicateTime < 260) return; // Strict debounce to prevent double/triple creation
    _lastDuplicateTime = now;

    if (!item) {
      item = typeof selectedEl === 'function' ? selectedEl() : null;
    }
    if (!item || !active() || !Array.isArray(active().elements)) return;

    const copy = structuredClone(item);
    copy.id = crypto.randomUUID();
    copy.x = Math.min(90, Math.max(0, (Number(copy.x) || 0) + 3));
    copy.y = Math.min(90, Math.max(0, (Number(copy.y) || 0) + 3));
    active().elements.push(copy);
    selected = copy.id;
    if (typeof render === 'function') render();
    showToast(`✓ ${copy.type === 'shape' ? 'Shape' : (copy.type === 'image' ? 'Image' : 'Element')} duplicated!`);
  };

  window.copyPresentationElement = function(item) {
    if (!item) {
      item = typeof selectedEl === 'function' ? selectedEl() : null;
    }
    if (!item) return;
    window.__presentationCopy = structuredClone(item);
    showToast(`✓ ${item.type === 'shape' ? 'Shape' : (item.type === 'image' ? 'Image' : 'Element')} copied! Press Ctrl+V to paste`);
  };

  window.pastePresentationElement = function() {
    if (!window.__presentationCopy || !active() || !Array.isArray(active().elements)) return;
    const copy = structuredClone(window.__presentationCopy);
    copy.id = crypto.randomUUID();
    copy.x = Math.min(90, Math.max(0, (Number(copy.x) || 0) + 3));
    copy.y = Math.min(90, Math.max(0, (Number(copy.y) || 0) + 3));
    active().elements.push(copy);
    selected = copy.id;
    if (typeof render === 'function') render();
    showToast(`✓ ${copy.type === 'shape' ? 'Shape' : (copy.type === 'image' ? 'Image' : 'Element')} pasted!`);
  };

  window.deletePresentationElement = function(item) {
    if (!item) {
      item = typeof selectedEl === 'function' ? selectedEl() : null;
    }
    if (!item || !active() || !Array.isArray(active().elements)) return;
    active().elements = active().elements.filter(x => x.id !== item.id);
    selected = null;
    if (typeof render === 'function') render();
    showToast('✓ Element deleted');
  };

  window.bringElementForward = function(item) {
    if (!item) item = typeof selectedEl === 'function' ? selectedEl() : null;
    if (!item || !active() || !Array.isArray(active().elements)) return;
    const es = active().elements, i = es.findIndex(e => e.id === item.id);
    if (i >= 0 && i < es.length - 1) {
      [es[i], es[i + 1]] = [es[i + 1], es[i]];
      if (typeof render === 'function') render();
      showToast('✓ Brought forward');
    }
  };

  window.sendElementBackward = function(item) {
    if (!item) item = typeof selectedEl === 'function' ? selectedEl() : null;
    if (!item || !active() || !Array.isArray(active().elements)) return;
    const es = active().elements, i = es.findIndex(e => e.id === item.id);
    if (i > 0) {
      [es[i], es[i - 1]] = [es[i - 1], es[i]];
      if (typeof render === 'function') render();
      showToast('✓ Sent backward');
    }
  };

  // Keyboard shortcut listener
  window.addEventListener('keydown', event => {
    const isEditing = event.target && (event.target.isContentEditable || ['input','textarea','select'].includes((event.target.tagName||'').toLowerCase()));
    const item = typeof selectedEl === 'function' ? selectedEl() : null;
    const key = (event.key || '').toLowerCase();

    // Ctrl+C: Copy shape or element
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'c') {
      const sel = window.getSelection();
      const hasTextSelection = sel && sel.toString().length > 0;
      if (isEditing && hasTextSelection) {
        return;
      }
      if (item) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.copyPresentationElement(item);
      }
    }

    // Ctrl+V: Paste copied shape or element
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'v') {
      if (isEditing) {
        return;
      }
      if (window.__presentationCopy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.pastePresentationElement();
      }
    }

    // Ctrl+D: Immediate single duplicate
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'd') {
      if (item && !isEditing) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.duplicatePresentationElement(item);
      }
    }
  }, true);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Right Click Context Menu System (Edit Text, Upload Image, Duplicate, etc.)
  // ──────────────────────────────────────────────────────────────────────────
  let _contextMenu = null;

  function hideContextMenu() {
    if (_contextMenu) {
      _contextMenu.classList.remove('open');
      setTimeout(() => {
        if (!_contextMenu?.classList.contains('open')) {
          _contextMenu?.remove();
          _contextMenu = null;
        }
      }, 120);
    }
  }

  function showContextMenu(x, y, items) {
    hideContextMenu();

    _contextMenu = document.createElement('div');
    _contextMenu.id = 'presentationContextMenu';
    _contextMenu.className = 'presentation-context-menu';

    items.forEach(it => {
      if (it.divider) {
        const sep = document.createElement('div');
        sep.className = 'ctx-menu-divider';
        _contextMenu.appendChild(sep);
        return;
      }

      const row = document.createElement('button');
      row.className = 'ctx-menu-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '');
      row.innerHTML = `
        <span class="ctx-item-icon">${it.icon || '•'}</span>
        <span class="ctx-item-label">${it.label}</span>
        ${it.shortcut ? `<span class="ctx-item-shortcut">${it.shortcut}</span>` : ''}
      `;
      if (!it.disabled) {
        row.onclick = e => {
          e.stopPropagation();
          hideContextMenu();
          it.action();
        };
      }
      _contextMenu.appendChild(row);
    });

    document.body.appendChild(_contextMenu);

    const rect = _contextMenu.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    const posX = Math.max(8, Math.min(x, maxX));
    const posY = Math.max(8, Math.min(y, maxY));

    _contextMenu.style.left = posX + 'px';
    _contextMenu.style.top = posY + 'px';

    requestAnimationFrame(() => {
      _contextMenu?.classList.add('open');
    });
  }

  document.addEventListener('contextmenu', event => {
    const slide = $('slide');
    if (!slide) return;

    const elementNode = event.target.closest('#slide .element');
    const onSlideCanvas = event.target.closest('#slide');

    if (!elementNode && !onSlideCanvas) {
      hideContextMenu();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (elementNode) {
      const id = elementNode.dataset.id;
      selected = id;
      const item = active()?.elements?.find(el => el.id === id);
      if (typeof renderInspector === 'function') renderInspector();

      const isTextOrShape = item && (item.type === 'text' || item.type === 'shape');
      const menuItems = [];

      if (isTextOrShape) {
        menuItems.push({
          icon: '✏️',
          label: 'Edit Text (টেক্সট এডিট)',
          shortcut: 'Dbl Click',
          action: () => {
            if (item.type === 'text') {
              window.activateInlineTextEdit(item);
            } else {
              window.activateInlineShapeEdit(item);
            }
          }
        });
      }

      // Upload / Replace Image option for shapes, image boxes, or templates
      menuItems.push({
        icon: '🖼️',
        label: item.type === 'image' ? 'Replace Image (ছবি পরিবর্তন)' : 'Upload Image (ছবি যোগ করুন)',
        action: () => window.uploadOrReplaceImage(item)
      });

      menuItems.push({ divider: true });

      menuItems.push({
        icon: '⧉',
        label: 'Duplicate',
        shortcut: 'Ctrl+D',
        action: () => window.duplicatePresentationElement(item)
      });

      menuItems.push({
        icon: '📋',
        label: 'Copy',
        shortcut: 'Ctrl+C',
        action: () => window.copyPresentationElement(item)
      });

      if (window.__presentationCopy) {
        menuItems.push({
          icon: '📄',
          label: 'Paste',
          shortcut: 'Ctrl+V',
          action: () => window.pastePresentationElement()
        });
      }

      menuItems.push({ divider: true });

      menuItems.push({
        icon: '⬆️',
        label: 'Bring Forward',
        action: () => window.bringElementForward(item)
      });

      menuItems.push({
        icon: '⬇️',
        label: 'Send Backward',
        action: () => window.sendElementBackward(item)
      });

      menuItems.push({ divider: true });

      menuItems.push({
        icon: '🗑️',
        label: 'Delete Element',
        shortcut: 'Delete',
        danger: true,
        action: () => window.deletePresentationElement(item)
      });

      showContextMenu(event.clientX, event.clientY, menuItems);

    } else if (onSlideCanvas) {
      // Right clicked on slide background
      const menuItems = [
        {
          icon: 'T',
          label: 'Add Text Box',
          action: () => {
            if (typeof addText === 'function') addText();
          }
        },
        {
          icon: '⬡',
          label: 'Add Shapes',
          action: () => {
            $('shapeGallery')?.classList.remove('hidden');
          }
        },
        {
          icon: '🖼️',
          label: 'Upload Image',
          action: () => {
            window.uploadOrReplaceImage();
          }
        },
        {
          icon: '✨',
          label: 'Slide Templates',
          action: () => {
            $('layoutGallery')?.classList.remove('hidden');
          }
        }
      ];

      if (window.__presentationCopy) {
        menuItems.unshift({
          icon: '📄',
          label: 'Paste Copied Object',
          shortcut: 'Ctrl+V',
          action: () => window.pastePresentationElement()
        });
      }

      showContextMenu(event.clientX, event.clientY, menuItems);
    }
  }, true);

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#presentationContextMenu')) {
      hideContextMenu();
    }
  }, true);

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideContextMenu();
    }
  }, true);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Attach direct double-click and click listeners to all elements
  // ──────────────────────────────────────────────────────────────────────────
  function bindInlineEditing() {
    const slide = $('slide');
    if (!slide) return;

    // Handle Image elements: double click to replace image
    slide.querySelectorAll('.image-el').forEach(node => {
      const id = node.dataset.id;
      const item = active()?.elements?.find(el => el.id === id);
      if (!item) return;
      node.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.uploadOrReplaceImage === 'function') window.uploadOrReplaceImage(item);
      };
    });

    // Handle Shape elements with text
    slide.querySelectorAll('.shape-el').forEach(node => {
      const id = node.dataset.id;
      const item = active()?.elements?.find(el => el.id === id);
      if (!item) return;

      const label = node.querySelector('.shape-label');
      if (!label) return;

      node.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        window.activateInlineShapeEdit(item);
      };

      label.ondblclick = e => {
        e.preventDefault();
        e.stopPropagation();
        window.activateInlineShapeEdit(item);
      };

      label.onpointerdown = e => {
        if (label.contentEditable === 'true') {
          e.stopPropagation();
        }
      };

      label.oninput = e => {
        e.stopPropagation();
        item.text = (label.innerText || label.textContent || '').replace(/\r/g, '');
        if ($('shapeText')) $('shapeText').value = item.text;
        if (typeof window.renderSlideThumbnailsMaster === 'function') window.renderSlideThumbnailsMaster();
        else if (typeof renderSlides === 'function') renderSlides();
        window.dispatchEvent(new CustomEvent('presentation:change'));
      };

      label.onblur = () => {
        label.contentEditable = 'false';
        label.closest('.shape-el')?.classList.remove('inline-editing');
        item.text = (label.innerText || label.textContent || '').replace(/\r/g, '');
        window.dispatchEvent(new CustomEvent('presentation:change'));
      };
    });
  }

  // Hook into render() to bind inline editing listeners on each render
  const _origRender = render;
  render = function() {
    _origRender();
    bindInlineEditing();
    setupZoomControls();
    const slide = $('slide');
    if (slide && _zoomLevel !== 1.0) {
      slide.style.transform = `scale(${_zoomLevel})`;
      slide.style.transformOrigin = 'center center';
    }
  };

  const _origStartDrag = window.startDrag;
  if (typeof _origStartDrag === 'function') {
    window.startDrag = function(e) {
      const el = e && e.currentTarget;
      if (el && el.classList && el.classList.contains('inline-editing')) return;
      return _origStartDrag(e);
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Styles & UI
  // ──────────────────────────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      body, .workspace, .top, .left, .right, .stage-wrap, .slide, .element, #ctx-toolbar {
        -webkit-user-select: none;
        user-select: none;
      }
      .text-el.inline-editing,
      .text-el[contenteditable="true"] {
        cursor: text !important;
        -webkit-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
        outline: 2px solid #4f8df7 !important;
        outline-offset: 2px !important;
        caret-color: #ffb11b !important;
      }
      .element.inline-editing,
      .element[contenteditable="true"] {
        -webkit-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
      }
      .text-el.inline-editing .text-content,
      .shape-el.inline-editing .shape-label,
      .text-content[contenteditable="true"],
      .shape-label[contenteditable="true"],
      input, textarea {
        -webkit-user-select: text !important;
        user-select: text !important;
      }

      /* Floating Zoom HUD */
      #presentationZoomHud {
        position: absolute;
        right: 24px;
        bottom: 24px;
        z-index: 90;
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(14, 23, 38, 0.88);
        border: 1px solid rgba(80, 110, 160, 0.4);
        backdrop-filter: blur(8px);
        padding: 5px 8px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        font-family: inherit;
      }
      #presentationZoomHud button {
        background: #202d44;
        border: 1px solid #364868;
        color: #e2ecff;
        font-weight: 800;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      #presentationZoomHud button:hover {
        border-color: #ffb11b;
        background: #2b3e60;
        color: #fff;
      }
      #zoomPercentageBadge {
        min-width: 44px;
        text-align: center;
        font-size: 11px;
        font-weight: 800;
        color: #ffd166;
        padding: 2px 4px;
        cursor: pointer;
      }
      #zoomPercentageBadge:hover {
        text-decoration: underline;
      }

      /* Toast Notification */
      #presentation-toast {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%) translateY(30px);
        background: #172a4c;
        border: 1px solid #4f8df7;
        color: #edf5ff;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 18px;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      #presentation-toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Right-Click Context Menu */
      .presentation-context-menu {
        position: fixed;
        z-index: 99999;
        min-width: 200px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 6px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(12px);
        opacity: 0;
        transform: scale(0.95);
        transform-origin: top left;
        transition: opacity 0.12s ease, transform 0.12s ease;
        pointer-events: auto;
      }
      .presentation-context-menu.open {
        opacity: 1;
        transform: scale(1);
      }
      .ctx-menu-item {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 7px 10px;
        border: none;
        background: transparent;
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
        transition: background 0.12s, color 0.12s;
      }
      .ctx-menu-item:hover {
        background: #2563eb;
        color: #ffffff;
      }
      .ctx-menu-item.danger:hover {
        background: #dc2626;
        color: #ffffff;
      }
      .ctx-item-icon {
        margin-right: 8px;
        font-size: 13px;
        width: 16px;
        text-align: center;
      }
      .ctx-item-label {
        flex: 1;
      }
      .ctx-item-shortcut {
        font-size: 10px;
        color: #94a3b8;
        margin-left: 12px;
        font-weight: 500;
      }
      .ctx-menu-item:hover .ctx-item-shortcut {
        color: #dbeafe;
      }
      .ctx-menu-divider {
        height: 1px;
        background: #1e293b;
        margin: 4px 6px;
      }
    </style>
  `);

  bindInlineEditing();
  setupZoomControls();
})();
