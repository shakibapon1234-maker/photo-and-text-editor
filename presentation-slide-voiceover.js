/* Per-slide voiceover controls and portable slide metadata. */
(function () {
  'use strict';

  const right = document.querySelector('.workspace > .right');
  const duration = document.getElementById('autoDuration');
  if (!right || !duration || typeof slides === 'undefined') return;

  const panel = document.createElement('section');
  panel.id = 'slideVoiceoverPanel';
  panel.style.cssText = 'margin:12px 0;padding:10px;border:1px solid #35445f;border-radius:8px;background:#0d1524';
  panel.innerHTML = '<div class="section-title">SLIDE VOICEOVER</div>' +
    '<div id="slideVoiceoverName" class="hint" style="margin:5px 0 8px">No audio for this slide</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" id="slideVoiceoverChoose">+ Add Audio</button><button type="button" id="slideVoiceoverPreview" disabled>Preview</button><button type="button" id="slideVoiceoverRemove" class="danger" disabled>Remove</button></div>' +
    '<input id="slideVoiceoverInput" class="hidden" type="file" accept="audio/*">' +
    '<audio id="slideVoiceoverAudio" preload="metadata" style="display:none"></audio>' +
    '<p class="hint" style="margin:8px 0 0">This audio is included in HTML and video exports. Auto-play uses the longer of the slide duration and audio length.</p>';
  const transition = document.getElementById('applyTransToAll');
  right.insertBefore(panel, transition ? transition.nextSibling : duration.parentElement);

  const input = panel.querySelector('#slideVoiceoverInput');
  const audio = panel.querySelector('#slideVoiceoverAudio');
  const name = panel.querySelector('#slideVoiceoverName');
  const preview = panel.querySelector('#slideVoiceoverPreview');
  const remove = panel.querySelector('#slideVoiceoverRemove');
  let previewContext = null;
  let previewSource = null;
  function stopPreview() {
    audio.pause();
    try { previewSource?.stop(); } catch (_) {}
    previewSource = null;
    preview.textContent = 'Preview';
  }
  const currentSlide = () => Array.isArray(slides)
    ? slides[Number(window.currentSlideIndex || window.activeSlideIndex || 0)] || null
    : null;
  // The editor's active() function is authoritative; it follows thumbnail selection.
  function slide() { try { return typeof active === 'function' ? active() : currentSlide(); } catch (_) { return currentSlide(); } }

  function sync() {
    const s = slide();
    if (!s) return;
    const has = !!s.voiceoverData;
    name.textContent = has ? `${s.voiceoverName || 'Slide voiceover'}${s.voiceoverDuration ? ` - ${Number(s.voiceoverDuration).toFixed(1)}s` : ''}` : 'No audio for this slide';
    preview.disabled = !has;
    remove.disabled = !has;
    if (has && audio.src !== s.voiceoverData) audio.src = s.voiceoverData;
    if (!has) { stopPreview(); audio.removeAttribute('src'); audio.load(); }
  }

  panel.querySelector('#slideVoiceoverChoose').onclick = () => input.click();
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const s = slide();
      if (!s) return;
      s.voiceoverData = String(reader.result || '');
      s.voiceoverName = file.name;
      s.voiceoverType = file.type || 'audio/mpeg';
      audio.src = s.voiceoverData;
      audio.onloadedmetadata = () => {
        s.voiceoverDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
        sync();
      };
      sync();
      if (typeof window.showPresentationToast === 'function') window.showPresentationToast('Voiceover added to this slide');
    };
    reader.onerror = () => alert('The audio file could not be read. Please try another file.');
    reader.readAsDataURL(file);
    input.value = '';
  };
  preview.onclick = () => {
    const s = slide();
    if (!s || !s.voiceoverData) return;
    if (preview.textContent === 'Stop Preview') { stopPreview(); return; }
    stopPreview();
    audio.src = s.voiceoverData;
    audio.load();
    audio.currentTime = 0;
    audio.play().then(() => { preview.textContent = 'Stop Preview'; }).catch(async () => {
      // Electron can reject HTMLAudio playback for some imported codecs; decode
      // the same file through Web Audio as a fallback.
      try {
        previewContext = previewContext || new (window.AudioContext || window.webkitAudioContext)();
        if (previewContext.state === 'suspended') await previewContext.resume();
        const bytes = await fetch(s.voiceoverData).then(response => response.arrayBuffer());
        const decoded = await previewContext.decodeAudioData(bytes.slice(0));
        previewSource = previewContext.createBufferSource();
        previewSource.buffer = decoded;
        previewSource.connect(previewContext.destination);
        previewSource.onended = () => { previewSource = null; preview.textContent = 'Preview'; };
        previewSource.start(0);
        preview.textContent = 'Stop Preview';
      } catch (error) {
        console.warn('Voiceover preview playback failed:', error);
        alert('This audio could not be decoded for preview. Try converting it to MP3 or WAV.');
      }
    });
  };
  remove.onclick = () => {
    const s = slide();
    if (!s) return;
    stopPreview();
    delete s.voiceoverData;
    delete s.voiceoverName;
    delete s.voiceoverType;
    delete s.voiceoverDuration;
    sync();
  };

  if (typeof window.renderInspector === 'function') {
    const oldRenderInspector = window.renderInspector;
    window.renderInspector = function () { const result = oldRenderInspector.apply(this, arguments); sync(); return result; };
  }
  document.getElementById('slideList')?.addEventListener('click', () => { stopPreview(); setTimeout(sync, 0); });
  sync();
})();
