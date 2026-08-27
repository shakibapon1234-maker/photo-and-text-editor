(() => {
  makeSlide = function () {
    return { background:'fashion', bgColor:'#17233c', transition:'fade', autoDuration:0, elements:[] };
  };

  const starterTexts = new Set(['আপনার অসাধারণ Presentation','শুরু করুন আপনার গল্প, পণ্য বা আইডিয়া দিয়ে']);
  slides.forEach(slide => {
    if (!slide || !Array.isArray(slide.elements)) return;
    slide.elements = slide.elements.filter(item => !(item.type === 'text' && starterTexts.has(String(item.text || ''))));
  });

  const $ = id => document.getElementById(id);
  let navigationToken = 0;

  function selectSlide(index, event) {
    event?.preventDefault(); event?.stopImmediatePropagation();
    if (index < 0 || index >= slides.length) return;
    const token = ++navigationToken;
    const apply = () => {
      if (token !== navigationToken || index >= slides.length) return;
      current = index; selected = null; drag = null;
      render();
    };
    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 40);
    setTimeout(() => { if (token === navigationToken) navigationToken = 0; }, 160);
  }

  function removeSlide(index, event) {
    event?.preventDefault(); event?.stopImmediatePropagation();
    if (slides.length <= 1 || index < 0 || index >= slides.length) return;
    slides.splice(index, 1);
    current = Math.max(0, Math.min(current > index ? current - 1 : current, slides.length - 1));
    selected = null; drag = null; render();
  }

  window.openPresentationSlide = selectSlide;
  window.deletePresentationSlide = removeSlide;

  window.addEventListener('pointerdown', event => {
    const thumb = event.target.closest && event.target.closest('#slideList .slide-thumb');
    if (!thumb) return;
    const index = [...$('slideList').querySelectorAll('.slide-thumb')].indexOf(thumb);
    if (index >= 0) selectSlide(index, event);
  }, true);

  window.addEventListener('keydown', event => {
    const target = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
    if (['input','textarea','select'].includes(target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowUp') { selectSlide(Math.max(0, current - 1), event); }
    if (event.key === 'ArrowDown') { selectSlide(Math.min(slides.length - 1, current + 1), event); }
  }, true);

  // ── MASTER HIGH-FIDELITY SLIDE THUMBNAIL RENDERER ──
  window.renderSlideThumbnailsMaster = function () {
    if (window.__presentationLiveDrag) return;

    const list = $('slideList');
    if (!list) return;

    const getBrollBg = window.getBrollPresetGradient || (p => {
      const map = {
        sky: 'linear-gradient(165deg, #0762a3, #79cdf3 48%, #d9f4ff)',
        space: 'radial-gradient(circle at 72% 20%, #ffe18a 0 2%, transparent 5%), radial-gradient(circle at 19% 88%, #5933a0 0 10%, transparent 24%), #020617',
        aurora: 'linear-gradient(135deg, #051531, #156d89 52%, #663a9c)',
        night: 'linear-gradient(155deg, #030914, #0d2145 58%, #291529)',
        sunset: 'linear-gradient(175deg, #642160, #ec6e69 45%, #ffbf62 72%, #72587f)',
        water: 'linear-gradient(#084f71, #078fba 45%, #015278)'
      };
      return map[p] || null;
    });

    list.innerHTML = '';
    slides.forEach((s, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb' + (i === current ? ' active' : '');
      thumb.dataset.slideIndex = i;

      // 1. Background determination
      let brollGradient = null;
      if (s.brollPreset && s.brollPreset !== 'none') {
        brollGradient = getBrollBg(s.brollPreset);
      }

      if (brollGradient) {
        thumb.style.background = brollGradient;
      } else if (s.background === 'custom') {
        thumb.style.background = s.bgColor || '#17233c';
      } else if (s.background === 'image' && s.bgImage) {
        thumb.style.backgroundImage = 'url("' + s.bgImage + '")';
        thumb.style.backgroundSize = 'cover';
        thumb.style.backgroundPosition = 'center';
      } else {
        thumb.style.background = (typeof themes !== 'undefined' && themes[s.background]) ? themes[s.background] : '#17233c';
      }

      // Slide number badge
      const numBadge = document.createElement('span');
      numBadge.className = 'num';
      numBadge.textContent = i + 1;
      numBadge.style.zIndex = '10';
      thumb.appendChild(numBadge);

      // Background Media (Video or Image)
      if (s.bgMedia) {
        const mediaWrap = document.createElement('div');
        mediaWrap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:1;opacity:' + (Number(s.bgMediaOpacity ?? 100) / 100) + ';';
        if (s.bgMediaType === 'video') {
          const vid = document.createElement('video');
          vid.src = s.bgMedia;
          vid.muted = true;
          vid.autoplay = true;
          vid.loop = true;
          vid.playsInline = true;
          vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          vid.play().catch(() => {});
          mediaWrap.appendChild(vid);
        } else {
          const img = document.createElement('img');
          img.src = s.bgMedia;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          mediaWrap.appendChild(img);
        }
        if (s.bgOverlayOpacity) {
          const overlay = document.createElement('div');
          const hex = Math.round(((s.bgOverlayOpacity || 0) / 100) * 255).toString(16).padStart(2, '0');
          overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:' + (s.bgOverlayColor || '#000000') + hex + ';';
          mediaWrap.appendChild(overlay);
        }
        thumb.appendChild(mediaWrap);
      }

      // 2. Elements Layer
      const elementsWrap = document.createElement('div');
      elementsWrap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:hidden;';

      (s.elements || []).forEach(el => {
        const elBox = document.createElement('div');
        const rot = Number(el.rotation) || 0;
        elBox.style.cssText = 'position:absolute;left:' + el.x + '%;top:' + el.y + '%;width:' + el.w + '%;height:' + el.h + '%;transform:rotate(' + rot + 'deg);transform-origin:center center;overflow:hidden;box-sizing:border-box;pointer-events:none;';

        if (el.type === 'shape') {
          const fillVal = el.fill || el.fillColor || el.color || '#4f8df7';
          const strokeVal = el.stroke || el.borderColor || '#ffffff';
          const lineVal = Math.max(1, (el.line !== undefined ? el.line : 2) * 0.4);
          const opVal = (el.opacity !== undefined ? Number(el.opacity) : 100) / 100;

          elBox.style.setProperty('--sf', fillVal);
          elBox.style.setProperty('--ss', strokeVal);
          elBox.style.setProperty('--sl', lineVal + 'px');
          elBox.style.setProperty('--so', opVal);

          const svgFn = window.getShapeSvg;
          if (typeof svgFn === 'function') {
            const body = document.createElement('div');
            body.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:' + opVal + ';pointer-events:none;';
            body.innerHTML = svgFn(el.shape);
            elBox.appendChild(body);
          } else {
            elBox.style.background = fillVal;
            elBox.style.borderRadius = el.shape === 'round' ? '3px' : el.shape === 'oval' ? '50%' : '0';
          }

          if (el.text) {
            const label = document.createElement('div');
            const fontSize = Math.max(3.5, (el.textSize || 18) * 0.17);
            const align = el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center';
            label.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:' + align + ';text-align:' + (el.textAlign || 'center') + ';color:' + (el.textColor || '#ffffff') + ';font-size:' + fontSize + 'px;font-weight:' + (el.textWeight || '700') + ';overflow:hidden;word-break:break-word;line-height:1.15;padding:1px 3px;box-sizing:border-box;z-index:2;';
            label.textContent = el.text;
            elBox.appendChild(label);
          }
        } else if (el.type === 'image') {
          const img = document.createElement('img');
          img.src = el.src;
          img.style.cssText = 'width:100%;height:100%;display:block;object-fit:cover;';
          elBox.appendChild(img);
        } else if (el.type === 'video') {
          const vid = document.createElement('video');
          vid.src = el.src;
          vid.muted = true;
          vid.autoplay = true;
          vid.loop = true;
          vid.playsInline = true;
          vid.style.cssText = 'width:100%;height:100%;display:block;object-fit:cover;';
          vid.play().catch(() => {});
          elBox.appendChild(vid);
        } else if (el.type === 'table') {
          const table = document.createElement('table');
          table.style.cssText = 'width:100%;height:100%;border-collapse:collapse;table-layout:fixed;background:#fff;font-size:3px;color:#17223a;';
          (el.data || []).slice(0, 4).forEach((row, r) => {
            const tr = document.createElement('tr');
            row.slice(0, 4).forEach(cell => {
              const td = document.createElement('td');
              td.style.cssText = 'border:0.5px solid #98a6bd;padding:0;overflow:hidden;' + (r === 0 ? 'background:#4f8df7;color:#fff;' : '');
              td.textContent = cell;
              tr.appendChild(td);
            });
            table.appendChild(tr);
          });
          elBox.appendChild(table);
        } else if (el.type === 'chart') {
          elBox.style.cssText += 'display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border-radius:2px;color:' + (el.color || '#78e6ff') + ';font-size:6px;font-weight:bold;';
          elBox.textContent = '▥ ' + (el.title || 'Chart');
        } else {
          // Regular text element with exact flex centering & background badge
          const fontSize = Math.max(3.5, (el.size || 24) * 0.17);
          const align = el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center';
          
          let txtCss = 'display:flex;align-items:center;justify-content:' + align + ';text-align:' + (el.textAlign || 'center') + ';color:' + (el.color || '#ffffff') + ';font-size:' + fontSize + 'px;font-weight:' + (el.weight || '700') + ';line-height:1.15;white-space:pre-wrap;word-break:break-word;padding:1px 2px;box-sizing:border-box;';
          
          const boxBgColor = el.boxBg || el.backgroundColor || el.bgColor || (el.background && el.background.startsWith('#') ? el.background : null);
          let boxOp = 1;
          if (el.boxOpacity !== undefined) {
            const num = Number(el.boxOpacity);
            boxOp = num <= 1 ? num : num / 100;
          }
          if (boxBgColor && boxBgColor !== 'transparent' && boxOp > 0) {
            if (boxBgColor.startsWith('#') && boxOp < 1) {
              const hex = boxBgColor.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16) || 0,
                    g = parseInt(hex.substring(2, 4), 16) || 0,
                    b = parseInt(hex.substring(4, 6), 16) || 0;
              txtCss += 'background:rgba(' + r + ',' + g + ',' + b + ',' + boxOp + ');border-radius:2px;';
            } else {
              txtCss += 'background:' + boxBgColor + ';border-radius:2px;';
            }
          }
          elBox.style.cssText += txtCss;
          if (el.textGradient) {
            elBox.style.backgroundImage = 'linear-gradient(' + (el.textGradientAngle ?? 90) + 'deg, ' + (el.color || '#ffffff') + ', ' + (el.textGradientTo || '#4f8df7') + ')';
            elBox.style.webkitBackgroundClip = 'text';
            elBox.style.webkitTextFillColor = 'transparent';
          }
          elBox.textContent = el.text || '';
        }

        elementsWrap.appendChild(elBox);
      });

      thumb.appendChild(elementsWrap);

      thumb.onclick = (e) => {
        selectSlide(i, e);
      };

      list.appendChild(thumb);
    });

    const box = $('slideQuickNavList');
    if (!box) return;
    box.replaceChildren();
    slides.forEach((slide, index) => {
      const row = document.createElement('div'); row.className = 'slide-quick-row';
      const open = document.createElement('button'); open.textContent = (index === current ? '▶ ' : '') + (index + 1) + '. Slide';
      open.onclick = event => selectSlide(index, event);
      row.appendChild(open);
      box.appendChild(row);
    });
  };

  renderSlides = function() { window.renderSlideThumbnailsMaster(); };
  window.renderSlides = renderSlides;
  window.renderSlideThumbnailsMaster();
})();