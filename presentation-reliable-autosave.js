(() => {
  const DB = 'presentation-studio-projects-v2', STORE = 'projects', KEY = 'current';
  let db = null, ready = false, timer = 0, writing = false, queued = false;
  const snapshot = () => ({slides: structuredClone(slides), current, savedAt: Date.now()});
  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function get(key) {
    return new Promise((resolve, reject) => { const r=db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
  }
  function put(data) {
    return new Promise((resolve, reject) => {
      const tx=db.transaction(STORE,'readwrite'), store=tx.objectStore(STORE);
      const old=store.get(KEY);
      old.onsuccess=()=>{ if(old.result) store.put(old.result,'previous'); store.put(data,KEY); };
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }
  async function saveNow() {
    if (!ready || !db) return;
    if (writing) { queued = true; return; }
    writing = true;
    try { await put(snapshot()); }
    catch (error) { console.warn('Presentation autosave failed', error); }
    finally { writing=false; if (queued) { queued=false; saveNow(); } }
  }
  function schedule() { if (!ready) return; clearTimeout(timer); timer=setTimeout(saveNow,350); }
  const renderBeforeReliableSave = render;
  render = function () { renderBeforeReliableSave(); schedule(); };
  window.addEventListener('beforeunload', () => { clearTimeout(timer); saveNow(); });
  window.presentationRestorePreviousVersion = async () => {
    if (!db) return false;
    const previous = await get('previous');
    if (!previous?.slides?.length) return false;
    slides=previous.slides; current=Math.min(Math.max(0,previous.current||0),slides.length-1); selected=null; render(); return true;
  };
  (async () => {
    try {
      db = await openDb();
      const saved = await get(KEY);
      if (saved?.slides?.length) {
        slides=saved.slides; current=Math.min(Math.max(0,saved.current||0),slides.length-1); selected=null;
      }
    } catch (error) { console.warn('Reliable presentation storage unavailable', error); }
    ready=true; render();
  })();
})();