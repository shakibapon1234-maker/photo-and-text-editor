(() => {
  // A new slide is a clean canvas. No demo Bengali/English placeholder text.
  makeSlide = function () {
    return { background:'fashion', bgColor:'#17233c', transition:'fade', autoDuration:0, elements:[] };
  };

  // Remove only the obsolete starter placeholders restored from an old autosave.
  // A newly created slide is always an empty canvas.
  const starterTexts = new Set(['আপনার অসাধারণ Presentation','শুরু করুন আপনার গল্প, পণ্য বা আইডিয়া দিয়ে']);
  slides.forEach(slide => {
    if (!slide || !Array.isArray(slide.elements)) return;
    // These are only the built-in starter strings, never user-entered content.
    slide.elements = slide.elements.filter(item => !(item.type === 'text' && starterTexts.has(String(item.text || ''))));
  });
  // Direct slide controls must win over any toolbar/editor click listeners.
  const $ = id => document.getElementById(id);
  let navigationToken = 0;
  function selectSlide(index, event) {
    event?.preventDefault(); event?.stopImmediatePropagation();
    if (index < 0 || index >= slides.length) return;
    const token = ++navigationToken;
    const apply = () => { if (token !== navigationToken || index >= slides.length) return; current = index; selected = null; drag = null; render(); };
    apply();
    // Some older presentation extensions restore their own stale `current`
    // value on the next frame. Reapply briefly so a deliberate slide choice wins.
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
  // Global capture handles thumbnail clicks before any legacy slide-list code.
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
  const before = renderSlides;
  renderSlides = function () {
    before();
    // Mirror uploaded media in thumbnails so they match the editable slide.
    $('slideList').querySelectorAll('.slide-thumb').forEach((thumb, index) => {
      const slide = slides[index];
      if (!slide || !slide.bgMedia) return;
      const media = document.createElement(slide.bgMediaType === 'video' ? 'video' : 'img');
      media.className = 'slide-thumb-background'; media.src = slide.bgMedia;
      if (media.tagName === 'VIDEO') { media.muted = true; media.autoplay = true; media.loop = true; media.playsInline = true; }
      media.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;opacity:' + (Number(slide.bgMediaOpacity ?? 100) / 100);
      const number = thumb.querySelector('.num');
      thumb.insertBefore(media, number ? number.nextSibling : thumb.firstChild);
      if (number) number.style.zIndex = '2';
      [...thumb.children].forEach(child => { if (child !== media && child !== number) child.style.zIndex = '1'; });
    });
    const box = $('slideQuickNavList'); if (!box) return;
    box.replaceChildren();
    slides.forEach((slide, index) => {
      const row = document.createElement('div'); row.className = 'slide-quick-row';
      const open = document.createElement('button'); open.textContent = (index === current ? '● ' : '○ ') + 'Open Slide ' + (index + 1);
      open.addEventListener('pointerdown', event => selectSlide(index, event), true); open.addEventListener('click', event => selectSlide(index, event), true);
      const del = document.createElement('button'); del.className = 'danger'; del.textContent = '×'; del.title = 'Delete Slide ' + (index + 1); del.disabled = slides.length === 1;
      del.addEventListener('pointerdown', event => removeSlide(index, event), true);
      row.append(open, del); box.append(row);
    });
  };
  render();
})();