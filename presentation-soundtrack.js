(() => {
  const $ = id => document.getElementById(id);
  const KEY_META = 'presentation-soundtrack-meta-v1';
  const DB_NAME = 'PresentationSoundtrackDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'soundtracks';

  function getCorrectAudioMime(filename, origType) {
    if (origType && origType.includes('/') && origType !== 'application/octet-stream') {
      return origType;
    }
    const ext = (filename || '').split('.').pop().toLowerCase();
    switch (ext) {
      case 'm4a': return 'audio/mp4';
      case 'mp4': return 'audio/mp4';
      case 'aac': return 'audio/aac';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'ogg': return 'audio/ogg';
      case 'flac': return 'audio/flac';
      default: return 'audio/mp4';
    }
  }

  // ── IndexedDB Engine for Fast Asynchronous Audio Storage ──────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function saveAudioBlobToIDB(blob) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(blob, 'currentAudio');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IDB Save Error:', err);
      return false;
    }
  }

  async function getAudioBlobFromIDB() {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get('currentAudio');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  }

  async function deleteAudioBlobFromIDB() {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete('currentAudio');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (_) {
      return false;
    }
  }

  // ── State & UI Management ──────────────────────────────────────────────────
  let musicMeta = {
    name: '',
    volume: 60,
    loop: true,
    hasAudio: false,
    mimeType: 'audio/mp4'
  };

  try {
    const saved = localStorage.getItem(KEY_META);
    if (saved) musicMeta = { ...musicMeta, ...JSON.parse(saved) };
  } catch (_) {}

  function saveMeta() {
    try {
      localStorage.setItem(KEY_META, JSON.stringify(musicMeta));
    } catch (_) {}
  }

  // Active playing audio resources
  let activeAudio = null;
  let cachedObjectUrl = null;
  let webAudioCtx = null;
  let webAudioSource = null;
  let webAudioGain = null;

  async function getSoundtrackData() {
    const rawBlob = await getAudioBlobFromIDB();
    if (!rawBlob) return null;

    // Ensure Blob has proper MIME type
    const mime = musicMeta.mimeType || getCorrectAudioMime(musicMeta.name, rawBlob.type);
    const blob = new Blob([rawBlob], { type: mime });

    if (!cachedObjectUrl) {
      cachedObjectUrl = URL.createObjectURL(blob);
    }
    return {
      blob,
      src: cachedObjectUrl,
      name: musicMeta.name,
      volume: musicMeta.volume,
      loop: musicMeta.loop,
      mimeType: mime
    };
  }

  window.getPresentationSoundtrack = getSoundtrackData;

  window.stopPresentationSoundtrack = function() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    if (webAudioSource) {
      try { webAudioSource.stop(); } catch (_) {}
      webAudioSource = null;
    }
  };

  window.playPresentationSoundtrack = async function() {
    window.stopPresentationSoundtrack();

    const data = await getSoundtrackData();
    if (!data || !data.src) return null;

    const volRatio = (data.volume !== undefined ? data.volume : 60) / 100;
    const shouldLoop = data.loop !== false;

    // 1. Try HTML5 Audio with proper Blob Object URL
    if (!activeAudio) {
      activeAudio = new Audio();
    }
    activeAudio.src = data.src;
    activeAudio.volume = volRatio;
    activeAudio.loop = shouldLoop;

    let success = false;
    try {
      await activeAudio.play();
      success = true;
    } catch (err) {
      console.warn('HTML5 Audio play failed, attempting Web Audio API decoding:', err);
    }

    if (success) return activeAudio;

    // 2. Fallback to Web Audio API (direct AAC/M4A/MP3 decoding)
    try {
      if (!webAudioCtx) {
        webAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (webAudioCtx.state === 'suspended') {
        await webAudioCtx.resume();
      }

      const arrBuffer = await data.blob.arrayBuffer();
      const decodedBuffer = await webAudioCtx.decodeAudioData(arrBuffer.slice(0));

      webAudioSource = webAudioCtx.createBufferSource();
      webAudioSource.buffer = decodedBuffer;
      webAudioSource.loop = shouldLoop;

      webAudioGain = webAudioCtx.createGain();
      webAudioGain.gain.value = volRatio;

      webAudioSource.connect(webAudioGain);
      webAudioGain.connect(webAudioCtx.destination);
      webAudioSource.start(0);

      return {
        pause: () => window.stopPresentationSoundtrack(),
        currentTime: 0
      };
    } catch (webAudioErr) {
      console.error('Both HTML5 Audio & Web Audio API failed:', webAudioErr);
      alert('Unable to play audio format. Please try an MP3 or WAV file.');
      return null;
    }
  };

  // ── DOM UI Setup ──────────────────────────────────────────────────────────
  const top = document.querySelector('.top');
  let soundtrackBtn = $('soundtrackBtn');
  if (!soundtrackBtn && top) {
    soundtrackBtn = document.createElement('button');
    soundtrackBtn.id = 'soundtrackBtn';
    soundtrackBtn.textContent = '♫ Soundtrack';
    const presentBtn = $('presentBtn');
    if (presentBtn && presentBtn.parentNode) {
      presentBtn.parentNode.insertBefore(soundtrackBtn, presentBtn);
    }
  }

  document.head.insertAdjacentHTML('beforeend', `
    <style>
      #soundtrackBtn { background: #be185d; border-color: #f9a8d4; font-weight: 700; }
      #soundtrackBtn:hover { background: #9d174d; border-color: #fbcfe8; }
      .soundtrack-panel {
        position: fixed; z-index: 102; right: 18px; top: 70px; width: 330px;
        padding: 16px; background: #111b2c; border: 1px solid #86456b;
        border-radius: 12px; box-shadow: 0 24px 70px rgba(0,0,0,0.8);
        font-family: Inter, Arial, "Noto Sans Bengali", sans-serif;
      }
      .soundtrack-test-btn {
        width: 100%; margin-top: 8px; padding: 10px; border-radius: 6px;
        background: #1e293b; border: 1px solid #475569; color: #38bdf8;
        font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      .soundtrack-test-btn:hover { background: #334155; color: #7dd3fc; }
    </style>
  `);

  const panelHtml = `
    <div id="soundtrackPanel" class="soundtrack-panel hidden">
      <div style="display:flex;align-items:center;margin-bottom:10px;">
        <strong style="color:#f9a8d4;font-size:14px;">PRESENTATION SOUNDTRACK</strong>
        <button id="closeSoundtrack" style="margin-left:auto;background:none;border:none;color:#fff;font-size:18px;cursor:pointer;">×</button>
      </div>

      <label class="file-label" style="display:block;text-align:center;margin-top:8px;padding:10px;background:#1e293b;border:1px dashed #f9a8d4;border-radius:8px;cursor:pointer;">
        📁 Upload MP3 / WAV / M4A
        <input id="soundtrackInput" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.mp4" style="display:none;">
      </label>

      <div style="margin-top:12px;">
        <label class="field" style="display:block;font-size:12px;color:#94a3b8;font-weight:700;">
          Volume
          <input id="soundtrackVolume" type="range" min="0" max="100" value="60" style="width:100%;margin-top:4px;">
        </label>
      </div>

      <div style="margin-top:8px;">
        <label class="field" style="font-size:12px;color:#cbd5e1;cursor:pointer;display:flex;align-items:center;gap:6px;">
          <input id="soundtrackLoop" type="checkbox" checked style="width:auto;margin:0;">
          Loop music during presentation
        </label>
      </div>

      <button id="testPlaySoundtrack" class="soundtrack-test-btn" type="button">▶ Test Listen Sound</button>
      <button id="removeSoundtrack" class="danger" style="width:100%;margin-top:8px;background:#991b1b;border-color:#f87171;color:#fff;padding:8px;border-radius:6px;font-weight:700;cursor:pointer;">Remove soundtrack</button>
      <p id="soundtrackName" class="hint" style="margin-top:10px;font-size:11px;color:#a0aec0;word-break:break-all;"></p>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHtml);

  function syncUI() {
    if ($('soundtrackVolume')) $('soundtrackVolume').value = musicMeta.volume !== undefined ? musicMeta.volume : 60;
    if ($('soundtrackLoop')) $('soundtrackLoop').checked = musicMeta.loop !== false;
    if ($('soundtrackName')) {
      $('soundtrackName').textContent = musicMeta.hasAudio
        ? `Selected: ${musicMeta.name || 'Audio File'} • ${musicMeta.volume || 60}% volume`
        : 'No soundtrack selected.';
    }
  }

  if (soundtrackBtn) {
    soundtrackBtn.onclick = () => {
      syncUI();
      $('soundtrackPanel').classList.remove('hidden');
    };
  }

  $('closeSoundtrack').onclick = () => {
    $('soundtrackPanel').classList.add('hidden');
    window.stopPresentationSoundtrack();
    if ($('testPlaySoundtrack')) $('testPlaySoundtrack').textContent = '▶ Test Listen Sound';
  };

  // ── File Selection via Typed Async Blob ───────────────────────────────────
  $('soundtrackInput').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    if ($('soundtrackName')) {
      $('soundtrackName').textContent = 'Processing & saving audio file... Please wait.';
      $('soundtrackName').style.color = '#ffd166';
    }

    if (cachedObjectUrl) {
      URL.revokeObjectURL(cachedObjectUrl);
      cachedObjectUrl = null;
    }

    const mime = getCorrectAudioMime(file.name, file.type);
    const arrBuf = await file.arrayBuffer();
    const typedBlob = new Blob([arrBuf], { type: mime });

    const saved = await saveAudioBlobToIDB(typedBlob);

    if (saved) {
      musicMeta.name = file.name;
      musicMeta.mimeType = mime;
      musicMeta.hasAudio = true;
      saveMeta();
      syncUI();
      if ($('soundtrackName')) $('soundtrackName').style.color = '#34d399';

      // Auto test play to confirm to user
      const aud = await window.playPresentationSoundtrack();
      if (aud) {
        if ($('testPlaySoundtrack')) $('testPlaySoundtrack').textContent = '⏸ Pause Test Sound';
      }
    } else {
      alert('Failed to save audio file to browser storage.');
    }
  };

  $('soundtrackVolume').oninput = e => {
    musicMeta.volume = Number(e.target.value);
    saveMeta();
    syncUI();
    if (activeAudio) activeAudio.volume = musicMeta.volume / 100;
    if (webAudioGain) webAudioGain.gain.value = musicMeta.volume / 100;
  };

  $('soundtrackLoop').onchange = e => {
    musicMeta.loop = e.target.checked;
    saveMeta();
    if (activeAudio) activeAudio.loop = musicMeta.loop;
    if (webAudioSource) webAudioSource.loop = musicMeta.loop;
  };

  let isTestPlaying = false;
  $('testPlaySoundtrack').onclick = async () => {
    if (isTestPlaying) {
      window.stopPresentationSoundtrack();
      isTestPlaying = false;
      $('testPlaySoundtrack').textContent = '▶ Test Listen Sound';
    } else {
      const aud = await window.playPresentationSoundtrack();
      if (aud) {
        isTestPlaying = true;
        $('testPlaySoundtrack').textContent = '⏸ Pause Test Sound';
        if (aud.onended !== undefined) {
          aud.onended = () => {
            isTestPlaying = false;
            if ($('testPlaySoundtrack')) $('testPlaySoundtrack').textContent = '▶ Test Listen Sound';
          };
        }
      } else {
        alert('Please upload an MP3 / WAV / M4A file first.');
      }
    }
  };

  $('removeSoundtrack').onclick = async () => {
    window.stopPresentationSoundtrack();
    await deleteAudioBlobFromIDB();
    if (cachedObjectUrl) {
      URL.revokeObjectURL(cachedObjectUrl);
      cachedObjectUrl = null;
    }
    musicMeta = { name: '', volume: 60, loop: true, hasAudio: false, mimeType: 'audio/mp4' };
    saveMeta();
    syncUI();
    if ($('testPlaySoundtrack')) $('testPlaySoundtrack').textContent = '▶ Test Listen Sound';
  };

  syncUI();
})();