(() => {
  const $ = id => document.getElementById(id);

  function setupVisaLoader() {
    if ($('loadVisaQuickBtn')) return;

    const top = document.querySelector('.top') || document.getElementById('toolbarGroups');
    if (!top) return;

    const btn = document.createElement('button');
    btn.id = 'loadVisaQuickBtn';
    btn.type = 'button';
    btn.innerHTML = '✈️ Load Visa PPTX (৭ স্লাইড)';
    btn.title = 'আপনার পাওয়ারপয়েন্ট ফাইল থেকে কনভার্ট করা ৭টি স্লাইড ১-ক্লিকে লোড করুন';
    btn.style.cssText = 'background:linear-gradient(135deg,#065f46,#047857)!important;border:1px solid #34d399!important;color:#ecfdf5!important;font-weight:800!important;font-size:12px!important;padding:7px 12px!important;border-radius:7px!important;cursor:pointer!important;white-space:nowrap!important;margin-left:4px!important;box-shadow:0 2px 8px rgba(5,150,105,0.35)!important;';

    btn.onclick = async e => {
      e?.preventDefault();
      e?.stopPropagation();

      try {
        btn.textContent = '⏳ Loading...';
        btn.disabled = true;

        let deck = null;

        // Try fetch first
        try {
          const res = await fetch('/tourist-visa-guide-converted.json');
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.slides)) deck = data.slides;
          }
        } catch (_) {}

        // Fallback: file input picker
        if (!deck) {
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = '.json,application/json';
          inp.onchange = async ev => {
            const f = ev.target.files?.[0];
            if (!f) { btn.innerHTML = '✈️ Load Visa PPTX (৭ স্লাইড)'; btn.disabled = false; return; }
            const text = await f.text();
            const data = JSON.parse(text);
            const loaded = Array.isArray(data) ? data : data.slides;
            applyDeck(loaded);
          };
          inp.click();
          btn.innerHTML = '✈️ Load Visa PPTX (৭ স্লাইড)';
          btn.disabled = false;
          return;
        }

        applyDeck(deck);
      } catch (err) {
        alert('Error loading presentation: ' + err.message);
        btn.innerHTML = '✈️ Load Visa PPTX (৭ স্লাইড)';
        btn.disabled = false;
      }
    };

    function applyDeck(loadedSlides) {
      if (!loadedSlides || !loadedSlides.length) return;
      if (confirm(`পাওয়ারপয়েন্ট থেকে কনভার্ট করা "ট্যুরিস্ট ভিসা গাইড" এর ${loadedSlides.length}টি স্লাইড লোড করতে চান?`)) {
        if (typeof window.setSlides === 'function') window.setSlides(loadedSlides);
        else window.slides = loadedSlides;

        if (typeof window.setCurrent === 'function') window.setCurrent(0);
        else window.current = 0;

        try { current = 0; } catch(_) {}
        try { selected = null; } catch(_) {}

        if (typeof render === 'function') render();
        if (typeof window.applySlideFitting === 'function') window.applySlideFitting();
        if (typeof window.presentationSaveNow === 'function') window.presentationSaveNow();

        if (typeof window.showPresentationToast === 'function') {
          window.showPresentationToast('✅ ভিসা প্রেজেন্টেশনের ৭টি স্লাইড সফলভাবে লোড হয়েছে!');
        } else {
          alert('✅ ভিসা প্রেজেন্টেশনের ৭টি স্লাইড সফলভাবে লোড হয়েছে!');
        }
      }
      btn.innerHTML = '✈️ Load Visa PPTX (৭ স্লাইড)';
      btn.disabled = false;
    }

    // Insert next to Export or into top ribbon
    const directActions = $('directToolbarActions') || top;
    if (directActions) {
      directActions.appendChild(btn);
    } else {
      top.appendChild(btn);
    }

    // Also add to Export menu dropdown if available
    const exportMenu = document.querySelector('.toolbar-menu[data-menu="export"]');
    if (exportMenu && !$('loadVisaMenuBtn')) {
      const menuBtn = document.createElement('button');
      menuBtn.id = 'loadVisaMenuBtn';
      menuBtn.type = 'button';
      menuBtn.innerHTML = '✈️ Load Converted Visa Slides';
      menuBtn.style.cssText = 'color:#6ee7b7;font-weight:700;';
      menuBtn.onclick = () => btn.click();
      exportMenu.appendChild(menuBtn);
    }
  }

  window.addEventListener('load', setupVisaLoader);
  setTimeout(setupVisaLoader, 200);
  setTimeout(setupVisaLoader, 800);
})();
