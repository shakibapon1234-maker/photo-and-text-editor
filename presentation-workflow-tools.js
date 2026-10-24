(() => {
  const $ = id => document.getElementById(id);
  const top = document.querySelector('.top');
  const right = document.querySelector('.right');
  const slideList = $('slideList');
  if (!top || !right || !slideList) return;

  const selectedElements = () => {
    const ids = window.selectedIds instanceof Set ? window.selectedIds : new Set();
    const list = active()?.elements || [];
    return ids.size ? list.filter(item => ids.has(item.id)) : list.filter(item => item.id === selected);
  };

  // Group alignment and spacing controls complement the existing single-item
  // align-to-slide actions in the context toolbar.
  const arrangePanel = document.createElement('div');
  arrangePanel.id = 'workflowArrangePanel';
  arrangePanel.innerHTML = `
    <div class="section-title">ALIGN & DISTRIBUTE</div>
    <p class="hint" style="margin-bottom:7px">Select 2+ objects, then align their edges or distribute them evenly.</p>
    <div class="workflow-action-grid">
      <button data-align="left">⇤ Left</button><button data-align="centerX">↔ Center</button><button data-align="right">Right ⇥</button>
      <button data-align="top">⇡ Top</button><button data-align="centerY">↕ Middle</button><button data-align="bottom">Bottom ⇣</button>
      <button data-align="distributeX">⇔ Distribute H</button><button data-align="distributeY">⇕ Distribute V</button>
    </div>`;
  right.insertBefore(arrangePanel, right.firstElementChild);
  document.head.insertAdjacentHTML('beforeend', `<style>
    .workflow-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
    .workflow-action-grid button{padding:6px 4px;font-size:10px;white-space:nowrap}
    #workflowSectionPanel{padding-top:10px;border-top:1px solid #26324a;margin-top:12px}
    #slideSorterModal{position:fixed;inset:0;z-index:99999;background:#050914ed;display:flex;flex-direction:column;padding:20px;overflow:auto}
    #slideSorterModal.hidden{display:none!important}
    .sorter-head{display:flex;align-items:center;gap:12px;position:sticky;top:-20px;background:#0b1220;padding:12px 0;z-index:2}
    .sorter-head strong{font-size:18px;color:#ffd166}
    .sorter-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;align-content:start}
    .sorter-card{padding:9px;background:#121a2a;border:1px solid #34425e;border-radius:9px;cursor:grab}
    .sorter-card.dragging{opacity:.45}.sorter-card.drop-target{outline:2px solid #38bdf8}
    .sorter-card .slide-thumb{width:100%;height:auto;aspect-ratio:16/9}
    .sorter-meta{display:flex;justify-content:space-between;gap:8px;margin-top:7px;color:#cbd5e1;font-size:11px}
    .sorter-section{grid-column:1/-1;color:#ffd166;font-weight:800;border-bottom:1px solid #34425e;padding:5px 0 3px}
    @media print{#slideSorterModal{display:none!important}}
  </style>`);

  const arrange = (mode) => {
    const items = selectedElements();
    if (items.length < 2) {
      window.showPresentationToast?.('Select at least two objects first.');
      return;
    }
    const bounds = () => ({
      left: Math.min(...items.map(item => Number(item.x) || 0)),
      top: Math.min(...items.map(item => Number(item.y) || 0)),
      right: Math.max(...items.map(item => (Number(item.x) || 0) + (Number(item.w) || 0))),
      bottom: Math.max(...items.map(item => (Number(item.y) || 0) + (Number(item.h) || 0)))
    });
    if (mode === 'distributeX' || mode === 'distributeY') {
      const horizontal = mode === 'distributeX';
      const start = horizontal ? 'x' : 'y';
      const size = horizontal ? 'w' : 'h';
      const sorted = [...items].sort((a, b) => (Number(a[start]) || 0) - (Number(b[start]) || 0));
      if (sorted.length < 3) {
        window.showPresentationToast?.('Distribution needs at least three objects.');
        return;
      }
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const gap = ((Number(last[start]) || 0) - ((Number(first[start]) || 0) + (Number(first[size]) || 0))) / (sorted.length - 1);
      let cursor = Number(first[start]) || 0;
      sorted.forEach((item, index) => {
        if (index === 0) return;
        const prior = sorted[index - 1];
        cursor = (Number(prior[start]) || 0) + (Number(prior[size]) || 0) + gap;
        if (index < sorted.length - 1) item[start] = Math.round(cursor * 100) / 100;
      });
    } else {
      const b = bounds();
      items.forEach(item => {
        if (mode === 'left') item.x = b.left;
        if (mode === 'centerX') item.x = (b.left + b.right - item.w) / 2;
        if (mode === 'right') item.x = b.right - item.w;
        if (mode === 'top') item.y = b.top;
        if (mode === 'centerY') item.y = (b.top + b.bottom - item.h) / 2;
        if (mode === 'bottom') item.y = b.bottom - item.h;
        item.x = Math.max(0, Math.min(100 - item.w, Math.round(item.x * 100) / 100));
        item.y = Math.max(0, Math.min(100 - item.h, Math.round(item.y * 100) / 100));
      });
    }
    render();
    window.dispatchEvent(new CustomEvent('presentation:change'));
    window.presentationSaveNow?.(true);
  };
  arrangePanel.querySelectorAll('[data-align]').forEach(button => button.addEventListener('click', () => arrange(button.dataset.align)));

  // A section is light-weight slide metadata, so existing project files and
  // the user's template catalog continue to load without migration.
  const sectionPanel = document.createElement('div');
  sectionPanel.id = 'workflowSectionPanel';
  sectionPanel.innerHTML = '<div class="section-title">SLIDE SECTION</div><label class="field">Section name<input id="workflowSectionName" list="workflowSectionOptions" placeholder="e.g. Introduction"></label><datalist id="workflowSectionOptions"></datalist><button id="workflowApplySection" style="width:100%">Apply to current slide</button>';
  slideList.after(sectionPanel);
  function syncSectionPanel() {
    const slide = active();
    $('workflowSectionName').value = slide?.section || '';
    const names = [...new Set((slides || []).map(item => String(item.section || '').trim()).filter(Boolean))];
    $('workflowSectionOptions').innerHTML = names.map(name => `<option value="${name.replace(/[&<>"']/g, '')}"></option>`).join('');
  }
  $('workflowApplySection').onclick = () => {
    const value = $('workflowSectionName').value.trim();
    active().section = value;
    if (!value) delete active().section;
    syncSectionPanel();
    renderSlides();
    window.dispatchEvent(new CustomEvent('presentation:change'));
    window.presentationSaveNow?.(true);
  };

  // Full-deck visual sorter. Native drag/drop reorders the original slide
  // objects, preserving all per-slide data including notes and timing.
  const sorterButton = document.createElement('button');
  sorterButton.id = 'workflowSorterButton';
  sorterButton.textContent = '▦ Slide Sorter';
  sorterButton.title = 'Review and drag to reorder slides';
  const presentAnchor = $('presentBtn');
  if (presentAnchor?.parentElement === top) top.insertBefore(sorterButton, presentAnchor);
  else top.appendChild(sorterButton);
  const sorter = document.createElement('div');
  sorter.id = 'slideSorterModal';
  sorter.className = 'hidden';
  sorter.innerHTML = '<div class="sorter-head"><strong>Slide Sorter</strong><span class="hint">Drag slides to reorder. Use the Section field in the sidebar to group them.</span><button id="closeWorkflowSorter" style="margin-left:auto">Close</button></div><div id="workflowSorterGrid" class="sorter-grid"></div>';
  document.body.append(sorter);
  const sorterGrid = $('workflowSorterGrid');
  let draggedIndex = -1;
  function paintSorter() {
    sorterGrid.replaceChildren();
    const thumbs = [...document.querySelectorAll('#slideList > .slide-thumb')];
    let lastSection = null;
    slides.forEach((slide, index) => {
      const section = String(slide.section || '').trim() || 'Unsectioned';
      if (section !== lastSection) {
        const heading = document.createElement('div');
        heading.className = 'sorter-section';
        heading.textContent = section;
        sorterGrid.append(heading);
        lastSection = section;
      }
      const card = document.createElement('div');
      card.className = 'sorter-card';
      card.draggable = true;
      card.dataset.index = String(index);
      const thumb = thumbs[index]?.cloneNode(true);
      if (thumb) { thumb.classList.remove('active'); card.append(thumb); }
      const meta = document.createElement('div');
      meta.className = 'sorter-meta';
      meta.innerHTML = `<span>Slide ${index + 1}</span><span>${section.replace(/[&<>"']/g, '')}</span>`;
      card.append(meta);
      card.onclick = event => {
        if (event.target.closest('button')) return;
        current = index; selected = null; window.selectedIds?.clear(); render(); syncSectionPanel(); sorter.classList.add('hidden');
      };
      card.ondragstart = event => { draggedIndex = index; card.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; };
      card.ondragend = () => { draggedIndex = -1; card.classList.remove('dragging'); };
      card.ondragover = event => { event.preventDefault(); card.classList.add('drop-target'); };
      card.ondragleave = () => card.classList.remove('drop-target');
      card.ondrop = event => {
        event.preventDefault(); card.classList.remove('drop-target');
        const to = Number(card.dataset.index);
        if (draggedIndex < 0 || draggedIndex === to) return;
        const currentSlide = active();
        const [moved] = slides.splice(draggedIndex, 1);
        slides.splice(to, 0, moved);
        current = Math.max(0, slides.indexOf(currentSlide));
        render(); syncSectionPanel(); paintSorter();
        window.dispatchEvent(new CustomEvent('presentation:change'));
        window.presentationSaveNow?.(true);
      };
      sorterGrid.append(card);
    });
  }
  sorterButton.onclick = () => { renderSlides(); syncSectionPanel(); paintSorter(); sorter.classList.remove('hidden'); };
  $('closeWorkflowSorter').onclick = () => sorter.classList.add('hidden');
  sorter.addEventListener('click', event => { if (event.target === sorter) sorter.classList.add('hidden'); });

  // Browser/Electron print flow lets the user choose “Save as PDF” and keeps
  // one presentation slide per landscape page. Render clones are temporary;
  // the editor returns to the same slide and selection afterward.
  const pdfButton = $('exportPresentationPdf') || document.createElement('button');
  pdfButton.id = 'exportPresentationPdf';
  pdfButton.textContent = '▤ Export as PDF';
  pdfButton.title = 'Open the print dialog, then choose Save as PDF';
  // The presentation toolbar is reorganized into dropdowns by
  // presentation-player-fix.js. Put PDF beside the other export actions so it
  // remains available from the Export tab instead of being left as a stray
  // button in the original top bar.
  const exportMenu = document.querySelector('#toolbarGroups .toolbar-menu[data-menu="export"]');
  if (exportMenu) exportMenu.appendChild(pdfButton);
  else {
    const loadAnchor = $('loadProject');
    if (loadAnchor?.parentElement === top) top.insertBefore(pdfButton, loadAnchor);
    else top.appendChild(pdfButton);
  }
  if (!$('presentationPdfProgressStyles')) {
    const progressStyles = document.createElement('style');
    progressStyles.id = 'presentationPdfProgressStyles';
    progressStyles.textContent = `
      #presentationPdfProgress{position:fixed;inset:0;z-index:200000;display:grid;place-items:center;background:rgba(3,8,18,.72);backdrop-filter:blur(3px);font:14px Arial,sans-serif;color:#e7efff}
      #presentationPdfProgress[hidden]{display:none}
      #presentationPdfProgress .pdf-progress-card{width:min(440px,calc(100vw - 36px));padding:24px;border:1px solid #3b5278;border-radius:14px;background:#101a2c;box-shadow:0 20px 60px #000a}
      #presentationPdfProgress strong{display:block;font-size:18px;color:#fff;margin-bottom:9px}
      #presentationPdfProgress p{margin:0 0 17px;color:#b8c8e3;line-height:1.5}
      #presentationPdfProgress .pdf-progress-track{height:12px;overflow:hidden;border-radius:99px;background:#263550}
      #presentationPdfProgress .pdf-progress-fill{height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#1d72ed,#4dd7fa);transition:width .18s ease}
      #presentationPdfProgress .pdf-progress-fill.indeterminate{width:38%;animation:pdfProgressSlide 1.15s ease-in-out infinite alternate}
      @keyframes pdfProgressSlide{from{transform:translateX(0)}to{transform:translateX(165%)}}
      #presentationPdfProgress .pdf-progress-hint{margin-top:11px;font-size:12px;color:#91a5c6}
    `;
    document.head.appendChild(progressStyles);
  }
  const progressOverlay = document.createElement('div');
  progressOverlay.id = 'presentationPdfProgress';
  progressOverlay.hidden = true;
  progressOverlay.setAttribute('role', 'status');
  progressOverlay.setAttribute('aria-live', 'polite');
  progressOverlay.innerHTML = '<div class="pdf-progress-card"><strong>প্রেজেন্টেশন PDF তৈরি হচ্ছে</strong><p class="pdf-progress-message">প্রস্তুতি চলছে…</p><div class="pdf-progress-track" role="progressbar" aria-label="PDF তৈরির অগ্রগতি"><div class="pdf-progress-fill"></div></div><div class="pdf-progress-hint">এই উইন্ডো খোলা রাখুন</div></div>';
  document.body.appendChild(progressOverlay);
  const progressMessage = progressOverlay.querySelector('.pdf-progress-message');
  const progressFill = progressOverlay.querySelector('.pdf-progress-fill');
  function setPdfProgress(message, percent = null) {
    if (!progressOverlay.isConnected) document.body.appendChild(progressOverlay);
    progressOverlay.hidden = false;
    progressMessage.textContent = message;
    if (percent === null) {
      progressFill.classList.add('indeterminate');
      progressFill.style.width = '';
      progressFill.parentElement.removeAttribute('aria-valuenow');
    } else {
      progressFill.classList.remove('indeterminate');
      progressFill.style.width = `${percent}%`;
      progressFill.parentElement.setAttribute('aria-valuenow', String(percent));
    }
  }
  window.exportPresentationPdf = async () => {
    const slideCount = slides.length;
    setPdfProgress(`স্লাইড প্রস্তুত হচ্ছে: 0/${slideCount}`, 0);
    const printFrame = document.createElement('iframe');
    printFrame.id = 'presentationPdfFrame';
    printFrame.title = 'Presentation print preview';
    printFrame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:100000;border:0;background:#fff';
    document.body.append(printFrame);
    const printWindow = printFrame.contentWindow;
    pdfButton.disabled = true;
    const originalCurrent = current;
    const originalSelected = selected;
    const originalSelectedIds = new Set(window.selectedIds || []);
    const slideMarkup = [];
    try {
      for (let index = 0; index < slides.length; index++) {
        setPdfProgress(`স্লাইড প্রস্তুত হচ্ছে: ${index + 1}/${slideCount}`, 5 + Math.round(((index + 1) / slideCount) * 55));
        current = index; selected = null; window.selectedIds?.clear(); render();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const clone = $('slide').cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('pdf-slide-canvas');
        clone.querySelectorAll('.hard-resize,.hard-rotate,.hard-selection-box,.smart-guide,.drop-note,.image-move-handle,.image-rotate-handle,.image-resize-handle,.table-move-handle,.table-grid-resizer').forEach(node => node.remove());
        clone.querySelectorAll('.selected,.is-active-drag').forEach(node => node.classList.remove('selected','is-active-drag'));
        slideMarkup.push(`<section class="pdf-page">${clone.outerHTML}</section>`);
      }
    } catch (error) {
      printFrame.remove();
      progressOverlay.remove();
      window.showPresentationToast?.('Could not prepare the PDF preview.');
      console.error('PDF preparation failed:', error);
      return;
    } finally {
      current = originalCurrent; selected = originalSelected;
      if (window.selectedIds) { window.selectedIds.clear(); originalSelectedIds.forEach(id => window.selectedIds.add(id)); }
      render(); syncSectionPanel(); pdfButton.disabled = false;
    }
    const base = document.createElement('base'); base.href = location.href;
    const styles = [...document.querySelectorAll('style,link[rel="stylesheet"]')].map(node => node.outerHTML).join('\n');
    const printHtml = `<!doctype html><html><head><meta charset="utf-8">${base.outerHTML}${styles}<style>
      @page{size:landscape;margin:0}html,body{margin:0;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .pdf-page{width:100vw;height:100vh;display:grid;place-items:center;page-break-after:always;break-after:page;overflow:hidden}
      .pdf-page:last-child{page-break-after:auto;break-after:auto}.pdf-slide-canvas{width:100vw!important;height:56.25vw!important;max-height:100vh;aspect-ratio:16/9!important;margin:auto;box-shadow:none!important;overflow:hidden!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .element{print-color-adjust:exact;-webkit-print-color-adjust:exact}.element img{print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .pdf-tools{position:fixed;z-index:100001;top:0;left:0;right:0;display:flex;justify-content:flex-end;gap:8px;padding:10px;background:#101827;color:#fff;font:14px Arial}
      .pdf-tools button{padding:7px 12px;border:1px solid #64748b;border-radius:5px;background:#243552;color:#fff;cursor:pointer}
      @media print{.pdf-page{width:100vw;height:100vh}.pdf-tools{display:none}}
    </style></head><body>${slideMarkup.join('')}</body></html>`;
    if (window.studioPdf?.export) {
      printFrame.remove();
      setPdfProgress('PDF ফাইল তৈরি হচ্ছে… বড় প্রেজেন্টেশনে কিছুটা সময় লাগতে পারে।', null);
      pdfButton.disabled = true;
      try {
        const result = await window.studioPdf.export(printHtml, 'presentation.pdf');
        progressOverlay.remove();
        pdfButton.disabled = false;
        if (result?.success) window.showPresentationToast?.('✅ PDF saved successfully.');
        else if (result?.canceled) window.showPresentationToast?.('PDF save cancelled.');
        else window.showPresentationToast?.(`PDF export failed: ${result?.error || 'unknown error'}`);
      } catch (error) {
        progressOverlay.remove();
        pdfButton.disabled = false;
        console.error('Native PDF export failed:', error);
        window.showPresentationToast?.(`PDF export failed: ${error.message || 'unknown error'}`);
      }
      return;
    }
    progressOverlay.remove();
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">${base.outerHTML}${styles}<style>
      @page{size:landscape;margin:0}html,body{margin:0;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .pdf-page{width:100vw;height:100vh;display:grid;place-items:center;page-break-after:always;break-after:page;overflow:hidden}
      .pdf-page:last-child{page-break-after:auto;break-after:auto}.pdf-slide-canvas{width:100vw!important;height:56.25vw!important;max-height:100vh;aspect-ratio:16/9!important;margin:auto;box-shadow:none!important;overflow:hidden!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .element{print-color-adjust:exact;-webkit-print-color-adjust:exact}.element img{print-color-adjust:exact;-webkit-print-color-adjust:exact}
      @media print{.pdf-page{width:100vw;height:100vh}}
    </style></head><body>${slideMarkup.join('')}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));<\/script></body></html>`);
    printWindow.document.close();
  };
  pdfButton.onclick = window.exportPresentationPdf;

  // Presenter View already includes speaker notes, a next-slide preview and an
  // elapsed rehearsal timer. Add a clearly named one-click rehearsal entry.
  if ($('presenterView')) {
    const rehearse = document.createElement('button');
    rehearse.id = 'workflowRehearseButton'; rehearse.textContent = '⏱ Rehearse';
    rehearse.title = 'Open Presenter View with notes and elapsed timer';
    rehearse.onclick = () => $('presenterView').click();
    top.insertBefore(rehearse, $('presenterView').nextSibling);
  }

  const previousRenderSlides = renderSlides;
  renderSlides = function() { previousRenderSlides(); syncSectionPanel(); };
  syncSectionPanel();
})();
