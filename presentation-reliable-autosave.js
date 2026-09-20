(() => {
  const DB = 'presentation-studio-projects-v2', STORE = 'projects', KEY = 'current';
  const LS_AUTOSAVE = 'presentation-studio-autosave-v1';
  const LS_EMERGENCY = 'presentation-studio-emergency-backup';
  const LS_SNAPSHOTS = 'presentation-studio-snapshots-v1';

  let db = null, ready = false, timer = 0, writing = false, queued = false;

  const countTotalElements = (deck) => {
    if (!Array.isArray(deck)) return 0;
    return deck.reduce((acc, s) => acc + (Array.isArray(s?.elements) ? s.elements.length : 0), 0);
  };

  const snapshot = () => {
    const savedSlides = structuredClone(slides);
    // Object URLs only work in the tab that created them. Persistent media is
    // addressed by bgMediaAssetId, so never save an invalid blob: URL.
    savedSlides.forEach(slide => { if (slide) delete slide.bgMediaObjURL; });
    return { slides: savedSlides, current, elementCount: countTotalElements(slides), savedAt: Date.now() };
  };

  // localStorage cannot reliably hold large base64 images. Its emergency copy
  // intentionally replaces those images with this marker, so it must never
  // win over a complete IndexedDB/server project during restore.
  const countUnavailableMedia = (deck) => {
    if (!Array.isArray(deck)) return 0;
    return deck.reduce((total, slide) => total
      + (String(slide?.bgMedia || '').startsWith('[heavy-bg-media-') ? 1 : 0)
      + (String(slide?.bgImage || '').startsWith('[heavy-bg-image-') ? 1 : 0)
      + (slide?.elements || []).reduce((n, element) => {
        return n + (element?.__hasLargeSrc || element?.src === '[base64-image-in-idb]' ? 1 : 0);
      }, 0), 0);
  };

  const hasUnavailableMedia = deck => countUnavailableMedia(deck) > 0;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function get(key) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      } catch (err) {
        resolve(null);
      }
    });
  }

  function put(key, data) {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(null);
      try {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(data, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        resolve(null);
      }
    });
  }

  // Fast fingerprint to avoid cloning and writing to disk when nothing changed
  function computeDeckFingerprint(deck, curr) {
    if (!Array.isArray(deck)) return '';
    let hash = 'c:' + curr + ';n:' + deck.length + ';';
    const valueSignature = value => {
      if (value === null || value === undefined) return String(value);
      if (typeof value === 'string') return 'str:' + value.length + ':' + value.slice(0, 24) + ':' + value.slice(-24);
      if (typeof value !== 'object') return String(value);
      try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
    };
    const objectSignature = object => Object.keys(object || {}).sort().map(key => key + '=' + valueSignature(object[key])).join('|');
    for (let i = 0; i < deck.length; i++) {
      const s = deck[i];
      if (!s) continue;
      // Include every slide property: animated themes, background-media
      // controls, placement and future visual settings must trigger autosave.
      hash += 's:' + objectSignature(Object.fromEntries(Object.entries(s).filter(([key]) => key !== 'elements'))) + ';';
      const els = s.elements;
      if (Array.isArray(els)) {
        for (let j = 0; j < els.length; j++) {
          const e = els[j];
          if (!e) continue;
          hash += 'e:' + objectSignature(e) + ';';
        }
      }
    }
    return hash;
  }

  // Keep a complete local copy whenever it fits. A per-image 50 KB cutoff
  // caused ordinary uploaded logos/photos to be replaced even though the
  // entire presentation was well within localStorage's capacity.
  function sanitizeForLocalStorage(snap) {
    try {
      const completeJson = JSON.stringify(snap);
      // Leave room below the usual 5 MB browser quota for the rest of the app.
      if (completeJson.length <= 4200000) return structuredClone(snap);

      // Large projects still get an emergency outline; their original media
      // remains in IndexedDB and the server-backed project copy.
      const copy = structuredClone(snap);
      if (Array.isArray(copy.slides)) {
        copy.slides.forEach(s => {
          if (s.bgMedia && typeof s.bgMedia === 'string' && s.bgMedia.length > 50000) {
            s.bgMedia = '[heavy-bg-media-in-idb]';
          }
          if (s.bgImage && typeof s.bgImage === 'string' && s.bgImage.length > 50000) {
            s.bgImage = '[heavy-bg-image-in-idb]';
          }
          if (Array.isArray(s.elements)) {
            s.elements.forEach(e => {
              if (e.src && typeof e.src === 'string' && e.src.length > 50000 && e.src.startsWith('data:')) {
                e.src = '[base64-image-in-idb]';
                e.__hasLargeSrc = true;
              }
            });
          }
        });
      }
      return copy;
    } catch (_) {
      return snap;
    }
  }

  function saveToLocalStorage(data) {
    try {
      // Always save lightweight sanitized version so it never exceeds quota
      const safeData = sanitizeForLocalStorage(data);
      try {
        localStorage.setItem(LS_AUTOSAVE, JSON.stringify({ slides: safeData.slides, current: safeData.current }));
      } catch (_) {}

      if (data.elementCount > 0 || (Array.isArray(data.slides) && data.slides.length > 0)) {
        try {
          localStorage.setItem(LS_EMERGENCY, JSON.stringify(safeData));
          updateSnapshotsHistory(safeData);
        } catch (_) {}
      }
    } catch (_) {
      /* storage quota safe */
    }
  }

  function getSnapshotsHistory() {
    try {
      return JSON.parse(localStorage.getItem(LS_SNAPSHOTS) || '[]');
    } catch (_) {
      return [];
    }
  }

  function updateSnapshotsHistory(safeData) {
    try {
      let list = getSnapshotsHistory();
      const last = list[0];
      if (last && (Date.now() - last.savedAt < 20000) && last.elementCount === safeData.elementCount) {
        list[0] = safeData;
      } else {
        list.unshift(safeData);
      }
      list = list.slice(0, 5);
      localStorage.setItem(LS_SNAPSHOTS, JSON.stringify(list));
    } catch (_) {}
  }

  let lastSavedFingerprint = '';
  let lastSavedSlideCount = -1;

  async function saveNow() {
    if (!ready || !db) return;
    if (writing) { queued = true; return; }

    // Never let a lightweight emergency backup overwrite the real project.
    // The real image bytes remain in IndexedDB/the server copy and are picked
    // at startup instead.
    if (hasUnavailableMedia(slides)) {
      console.warn('Skipped saving an incomplete presentation backup.');
      return;
    }

    const currentFingerprint = computeDeckFingerprint(slides, current);
    const countChanged = Array.isArray(slides) && slides.length !== lastSavedSlideCount;
    if (!countChanged && currentFingerprint === lastSavedFingerprint && lastSavedFingerprint !== '') {
      return;
    }

    writing = true;

    try {
      const data = snapshot();
      lastSavedFingerprint = currentFingerprint;
      lastSavedSlideCount = Array.isArray(slides) ? slides.length : 0;

      // 1. Synchronous localStorage update immediately
      saveToLocalStorage(data);

      // 2. Primary fast IndexedDB put
      await put(KEY, data);

      // 3. Persistent backend server write
      try {
        if (typeof fetch === 'function') {
          fetch('/api/save-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).catch(() => {});
        }
      } catch (_) {}

      // 4. Emergency secondary backup
      put('emergency_backup', data).catch(() => {});
    } catch (error) {
      console.warn('Presentation autosave failed', error);
    } finally {
      writing = false;
      if (queued) {
        queued = false;
        setTimeout(saveNow, 200);
      }
    }
  }

  function schedule(immediate = false) {
    if (!ready) return;
    clearTimeout(timer);
    // If slide count changed (new slide, duplicate, delete), save IMMEDIATELY!
    if (immediate || (Array.isArray(slides) && slides.length !== lastSavedSlideCount)) {
      saveNow();
      return;
    }
    timer = setTimeout(saveNow, 600);
  }

  const renderBeforeReliableSave = render;
  render = function () {
    renderBeforeReliableSave();
    schedule();
  };

  window.addEventListener('presentation:change', () => schedule(true));
  window.presentationSaveNow = () => saveNow();

  const handleAppClose = () => {
    clearTimeout(timer);
    lastSavedFingerprint = '';
    try {
      const data = snapshot();
      saveToLocalStorage(data);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/save-project', JSON.stringify(data));
      }
      saveNow();
    } catch (_) {}
  };
  window.addEventListener('beforeunload', handleAppClose);
  window.addEventListener('pagehide', handleAppClose);

  // ── Modal & UI Recovery System ──────────────────────────────────
  function applyDeck(deck, curr = 0) {
    if (!Array.isArray(deck) || !deck.length) return false;
    slides = structuredClone(deck);
    current = Math.min(Math.max(0, curr), slides.length - 1);
    selected = null;
    if (typeof drag !== 'undefined') drag = null;
    render();
    if (typeof renderSlides === 'function') renderSlides();
    schedule();
    return true;
  }

  window.restorePresentationProject = (deck, curr = 0) => applyDeck(deck, curr);

  window.presentationRestorePreviousVersion = async () => {
    const prev = (await get('previous')) || (await get('emergency_backup'));
    if (prev?.slides?.length) {
      return applyDeck(prev.slides, prev.current);
    }
    try {
      const ls = JSON.parse(localStorage.getItem(LS_EMERGENCY) || 'null');
      if (ls?.slides?.length) {
        return applyDeck(ls.slides, ls.current);
      }
    } catch (_) {}
    return false;
  };

  function createRecoveryUI() {
    document.head.insertAdjacentHTML('beforeend', `
      <style>
        #restoreVaultBtn {
          background: #1e3a8a !important;
          border-color: #3b82f6 !important;
          color: #fff !important;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        #restoreVaultBtn:hover {
          background: #2563eb !important;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
        }
        #recoveryBanner {
          position: fixed;
          top: 66px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: #1e293b;
          border: 1.5px solid #f59e0b;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: #fff;
          font-size: 13px;
          animation: bannerSlideDown 0.3s ease;
        }
        @keyframes bannerSlideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        #recoveryModal {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(4, 8, 18, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .recovery-card {
          width: 100%;
          max-width: 580px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.9);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 85vh;
          overflow: hidden;
        }
        .recovery-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 12px;
        }
        .recovery-title {
          font-size: 16px;
          font-weight: 800;
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .recovery-list {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 380px;
          padding-right: 4px;
        }
        .recovery-item {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.15s ease;
        }
        .recovery-item:hover {
          border-color: #38bdf8;
          background: #243552;
        }
        .recovery-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .recovery-tag {
          font-size: 13px;
          font-weight: 700;
          color: #f8fafc;
        }
        .recovery-time {
          font-size: 11px;
          color: #94a3b8;
        }
        .btn-restore-action {
          background: #2563eb;
          border: 1px solid #60a5fa;
          color: #fff;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-restore-action:hover {
          background: #1d4ed8;
        }
      </style>
    `);

    // Top Bar Button
    const top = document.querySelector('.top');
    if (top) {
      const btn = document.createElement('button');
      btn.id = 'restoreVaultBtn';
      btn.innerHTML = '🔄 রিস্টোর / ব্যাকআপ';
      btn.title = 'পূর্ববর্তী সংরক্ষিত প্রজেক্ট বা ব্যাকআপ রিস্টোর করুন';
      const insertRef = document.getElementById('saveProject') || top.firstElementChild;
      top.insertBefore(btn, insertRef);
      btn.onclick = () => openRecoveryModal();
    }
  }

  window.openRecoveryModal = openRecoveryModal;

  async function openRecoveryModal() {
    const existing = document.getElementById('recoveryModal');
    if (existing) existing.remove();

    const idbCurrent = await get(KEY);
    const idbPrev = await get('previous');
    const idbEmergency = await get('emergency_backup');
    const lsEmergency = (() => {
      try { return JSON.parse(localStorage.getItem(LS_EMERGENCY) || 'null'); } catch (_) { return null; }
    })();
    const snapshots = getSnapshotsHistory();

    const candidates = [];
    if (idbCurrent?.slides?.length) candidates.push({ tag: '🌟 বর্তমান অটো-সেভ (Current Autosave)', data: idbCurrent });
    if (idbEmergency?.slides?.length) candidates.push({ tag: '💾 ইমার্জেন্সি ব্যাকআপ (Emergency Backup)', data: idbEmergency });
    if (idbPrev?.slides?.length) candidates.push({ tag: '🕒 পূর্ববর্তী সেশন (Previous Session)', data: idbPrev });
    if (lsEmergency?.slides?.length) candidates.push({ tag: '📦 লোকাল স্টোরেজ ব্যাকআপ (Local Backup)', data: lsEmergency });

    snapshots.forEach((snap, idx) => {
      candidates.push({ tag: `📋 স্ন্যাপশট #${idx + 1}`, data: snap });
    });

    // Deduplicate by time or element count
    const seen = new Set();
    const uniqueCandidates = candidates.filter(item => {
      const key = `${item.data.savedAt || 0}-${item.data.elementCount || 0}-${item.data.slides?.length || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const modal = document.createElement('div');
    modal.id = 'recoveryModal';

    let listHtml = '';
    if (uniqueCandidates.length === 0) {
      listHtml = '<div style="color:#94a3b8;text-align:center;padding:30px 0;">কোনো পূর্ববর্তী ব্যাকআপ ফাইল পাওয়া যায়নি।</div>';
    } else {
      uniqueCandidates.forEach((item, i) => {
        const timeStr = item.data.savedAt ? new Date(item.data.savedAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }) : 'অজানা সময়';
        const slideCount = item.data.slides ? item.data.slides.length : 1;
        const elemCount = item.data.elementCount ?? countTotalElements(item.data.slides);

        listHtml += `
          <div class="recovery-item">
            <div class="recovery-meta">
              <div class="recovery-tag">${item.tag}</div>
              <div class="recovery-time">📅 ${timeStr} • 📑 ${slideCount} স্লাইড • 🎯 ${elemCount} টি উপাদান</div>
            </div>
            <button class="btn-restore-action" data-index="${i}">রিস্টোর করুন</button>
          </div>
        `;
      });
    }

    modal.innerHTML = `
      <div class="recovery-card">
        <div class="recovery-head">
          <div class="recovery-title">↺ প্রজেক্ট রিকভারি ও ব্যাকআপ ভল্ট</div>
          <button id="closeRecoveryModal" style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <p style="color:#cbd5e1;font-size:12px;margin:0;">
          আপনার কাজ করা স্লাইড বা আগের সেশনের ফাইল নিচে সংরক্ষিত আছে। যে কোনোটি নির্বাচন করে 'রিস্টোর করুন' বাটনে ক্লিক করুন।
        </p>
        <div class="recovery-list">
          ${listHtml}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
          <button id="manualSnapshotBtn" style="background:#0f766e;border-color:#14b8a6;">📸 এই মুহূর্তে স্ন্যাপশট সেভ করুন</button>
          <button id="closeRecoveryModal2" style="background:#334155;border-color:#64748b;">বন্ধ করুন</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.btn-restore-action').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.index);
        const choice = uniqueCandidates[idx];
        if (choice && choice.data.slides) {
          applyDeck(choice.data.slides, choice.data.current || 0);
          modal.remove();
        }
      };
    });

    modal.querySelector('#closeRecoveryModal').onclick = () => modal.remove();
    modal.querySelector('#closeRecoveryModal2').onclick = () => modal.remove();
    modal.querySelector('#manualSnapshotBtn').onclick = () => {
      const snap = snapshot();
      updateSnapshotsHistory(snap);
      alert('সফলভাবে স্ন্যাপশট সংরক্ষিত হয়েছে!');
      openRecoveryModal();
    };
  }

  function showRecoveryBanner(backupData) {
    if (document.getElementById('recoveryBanner')) return;
    const elemCount = backupData.elementCount ?? countTotalElements(backupData.slides);
    const timeStr = backupData.savedAt ? new Date(backupData.savedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '';

    const banner = document.createElement('div');
    banner.id = 'recoveryBanner';
    banner.innerHTML = `
      <span>💡 <strong>পূর্ববর্তী সেশন পাওয়া গেছে</strong> (${backupData.slides.length} স্লাইড, ${elemCount} অবজেক্ট ${timeStr ? '• ' + timeStr : ''})</span>
      <button id="bannerRestoreBtn" style="background:#f59e0b;color:#000;font-weight:800;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;">🔄 এখনই রিস্টোর করুন</button>
      <button id="bannerDismissBtn" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:16px;">✕</button>
    `;
    document.body.appendChild(banner);

    banner.querySelector('#bannerRestoreBtn').onclick = () => {
      applyDeck(backupData.slides, backupData.current || 0);
      banner.remove();
    };
    banner.querySelector('#bannerDismissBtn').onclick = () => {
      banner.remove();
    };
  }

  // ── Boot Initialization ─────────────────────────────────────────
  (async () => {
    createRecoveryUI();

    try {
      // Open IDB and fetch recovered-project.json IN PARALLEL for speed
      const [db_result, recoverJson] = await Promise.all([
        openDb().catch(() => null),
        fetch('recovered-project.json?t=' + Date.now())
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      ]);
      db = db_result;

      const saved = await get(KEY);
      const emergency = await get('emergency_backup');
      const lsBackup = (() => {
        try { return JSON.parse(localStorage.getItem(LS_EMERGENCY) || 'null'); } catch (_) { return null; }
      })();
      const lsAuto = (() => {
        try { return JSON.parse(localStorage.getItem(LS_AUTOSAVE) || 'null'); } catch (_) { return null; }
      })();

      // Include the server-written recovered-project.json as a ranked candidate.
      // This is the most reliable persistence mechanism in Electron (written by the Node server).
      const serverData = (recoverJson && Array.isArray(recoverJson.slides) && recoverJson.slides.length > 0)
        ? { slides: recoverJson.slides, current: recoverJson.current || 0, savedAt: recoverJson.savedAt || 0, elementCount: countTotalElements(recoverJson.slides) }
        : null;

      // Pick a complete project before considering timestamps. localStorage
      // backups can contain image placeholders when quota is limited.
      const candidates = [
        { source: 'idb_saved', data: saved },
        { source: 'idb_emergency', data: emergency },
        { source: 'ls_emergency', data: lsBackup },
        { source: 'ls_auto', data: lsAuto },
        { source: 'server_file', data: serverData }
      ].filter(c => c.data && Array.isArray(c.data.slides) && c.data.slides.length > 0);

      let bestCandidate = null;
      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const missingMediaDiff = countUnavailableMedia(a.data.slides) - countUnavailableMedia(b.data.slides);
          if (missingMediaDiff !== 0) return missingMediaDiff;
          const timeA = a.data.savedAt || 0;
          const timeB = b.data.savedAt || 0;
          const timeDiff = timeB - timeA;
          // If one save is definitively newer (by more than 3 seconds), honor the newer user state
          if (Math.abs(timeDiff) > 3000) {
            return timeDiff;
          }
          // If timestamps are essentially simultaneous, prefer candidate with more slides
          const countDiff = b.data.slides.length - a.data.slides.length;
          if (countDiff !== 0) return countDiff;
          return timeDiff;
        });
        bestCandidate = candidates[0].data;
      }

      if (bestCandidate && Array.isArray(bestCandidate.slides) && bestCandidate.slides.length > 0) {
        const activeCount = Array.isArray(slides) ? slides.length : 0;
        const activeMissingMedia = countUnavailableMedia(slides);
        const candidateMissingMedia = countUnavailableMedia(bestCandidate.slides);
        const keepCompleteLocalDraft = window.__presentationInitialDeckIsCompleteLocal && activeMissingMedia === 0;
        // Restore a complete deck even when it has the same number of slides.
        // This is the case that previously left broken-image placeholders on
        // the canvas after a browser refresh. A complete draft already loaded
        // from localStorage is newer than recovery candidates, so keep it.
        if (!keepCompleteLocalDraft && (bestCandidate.slides.length !== activeCount || activeCount <= 1 || candidateMissingMedia < activeMissingMedia)) {
          slides = structuredClone(bestCandidate.slides);
          window.slides = slides;
          current = Math.min(Math.max(0, bestCandidate.current || 0), slides.length - 1);
          window.current = current;
          selected = null;
          if (typeof drag !== 'undefined') drag = null;
          if (typeof render === 'function') render();
          if (typeof window.renderSlideThumbnailsMaster === 'function') {
            window.renderSlideThumbnailsMaster(true);
          } else if (typeof renderSlides === 'function') {
            renderSlides();
          }
          if (typeof window.showPresentationToast === 'function' && bestCandidate.slides.length > 1) {
            window.showPresentationToast('✅ আপনার পূর্ববর্তী প্রজেক্ট সফলভাবে লোড হয়েছে!');
          }
        }
      }
    } catch (error) {
      console.warn('Reliable presentation storage unavailable', error);
      try {
        const ls = JSON.parse(localStorage.getItem(LS_AUTOSAVE) || 'null');
        if (ls && Array.isArray(ls.slides) && ls.slides.length > 0) {
          applyDeck(ls.slides, ls.current || 0);
        }
      } catch (_) {}
    }

    ready = true;
    lastSavedSlideCount = Array.isArray(slides) ? slides.length : 0;
    lastSavedFingerprint = computeDeckFingerprint(slides, current);
    schedule();
  })();
})();

// Optional one-time importer for a user-provided FINAL.html backup.
// It is loaded dynamically so the large backup is never part of the app bundle.
(() => {
  const script = document.createElement('script');
  script.src = 'presentation-final-background-import.js?v=1';
  document.head.appendChild(script);
})();
