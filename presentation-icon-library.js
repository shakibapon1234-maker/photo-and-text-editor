/**
 * presentation-icon-library.js
 * Ultra-lightweight, 100% vector SVG icon library for Presentation Studio.
 * Zero external dependencies. Fast, scalable, and responsive on all PCs.
 */
(() => {
  const $ = id => document.getElementById(id);

  // Standard 24x24 SVG Path Dictionary
  const ICONS = {
    // ── Fashion & E-Commerce ──
    'bag': {
      name: 'Shopping Bag (শপিং ব্যাগ)',
      cat: 'fashion',
      path: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
    },
    'dress': {
      name: 'Dress (পোশাক/ফ্যাশন)',
      cat: 'fashion',
      path: 'M12 3a2 2 0 012 2c0 .4-.1.8-.3 1.1L18 8l-2 5 2 8H6l2-8-2-5 4.3-1.9c-.2-.3-.3-.7-.3-1.1a2 2 0 012-2z'
    },
    'tag': {
      name: 'Price Tag (ডিসকাউন্ট/অফার)',
      cat: 'fashion',
      path: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01'
    },
    'diamond': {
      name: 'Diamond (লাক্সারি/জুয়েলারি)',
      cat: 'fashion',
      path: 'M6 3h12l4 6-10 12L2 9l4-6z M2 9h20 M12 21L8 9l4-6 4 6-4 12'
    },
    'crown': {
      name: 'Crown (প্রিমিয়াম/ভিআইপি)',
      cat: 'fashion',
      path: 'M2 4l3 12h14l3-12-5 6-5-8-5 8-5-6zm2 14h16v2H4v-2z'
    },
    'gift': {
      name: 'Gift Box (উপহার/প্যাকেজ)',
      cat: 'fashion',
      path: 'M20 12v9H4v-9M2 7h20v5H2V7zm10-5a2.5 2.5 0 00-2.5 2.5c0 1.5 2.5 2.5 2.5 2.5s2.5-1 2.5-2.5A2.5 2.5 0 0012 2zM12 7v14'
    },
    'truck': {
      name: 'Delivery (হোম ডেলিভারি)',
      cat: 'fashion',
      path: 'M1 3h15v13H1V3zm15 5h4l3 3v5h-7V8zM5.5 20.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm12 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'
    },
    'cart': {
      name: 'Shopping Cart (কার্ট)',
      cat: 'fashion',
      path: 'M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6 M10 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z'
    },

    // ── Contact & Social ──
    'phone': {
      name: 'Phone (ফোন কল)',
      cat: 'contact',
      path: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'
    },
    'mail': {
      name: 'Email (ইমেইল)',
      cat: 'contact',
      path: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6'
    },
    'pin': {
      name: 'Location Pin (লোকেশন/ঠিকানা)',
      cat: 'contact',
      path: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 13a3 3 0 100-6 3 3 0 000 6z'
    },
    'globe': {
      name: 'Website (ওয়েবসাইট/গ্লোব)',
      cat: 'contact',
      path: 'M12 2a10 10 0 100 20 10 10 0 000-20z M2 12h20 M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'
    },
    'chat': {
      name: 'Chat / Message (মেসেজ)',
      cat: 'contact',
      path: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z'
    },
    'whatsapp': {
      name: 'WhatsApp (হোয়াটসঅ্যাপ)',
      cat: 'contact',
      path: 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.08.15.2 2.09 3.19 5.06 4.47.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z M12 2a10 10 0 00-8.66 15L2 22l5.16-1.34A10 10 0 1012 2z'
    },
    'mobile': {
      name: 'Smartphone (স্মার্টফোন)',
      cat: 'contact',
      path: 'M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 17a1 1 0 100 2 1 1 0 000-2z'
    },

    // ── Badges & Trust ──
    'star': {
      name: 'Star (৫-স্টার রেটিং)',
      cat: 'trust',
      path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
    },
    'heart': {
      name: 'Heart (ভালোবাসা/উইশলিস্ট)',
      cat: 'trust',
      path: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'
    },
    'shield': {
      name: 'Shield (১০০% গ্যারান্টি)',
      cat: 'trust',
      path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4'
    },
    'trophy': {
      name: 'Trophy (অ্যাওয়ার্ড/সেরা মান)',
      cat: 'trust',
      path: 'M8 21h8m-4-4v4M6 4h12v6a6 6 0 01-12 0V4z M6 6H3a2 2 0 00-2 2v1a4 4 0 004 4h1 M18 6h3a2 2 0 012 2v1a4 4 0 01-4 4h-1'
    },
    'check': {
      name: 'Checkmark (যাচাইকৃত/সঠিক)',
      cat: 'trust',
      path: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
    },
    'thumb': {
      name: 'Thumbs Up (গ্রাহক সন্তুষ্টি)',
      cat: 'trust',
      path: 'M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3'
    },
    'sparkle': {
      name: 'Sparkle (নতুন/স্পেশাল)',
      cat: 'trust',
      path: 'M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2zm7 15l1.25 2.75L23 21l-2.75 1.25L19 25l-1.25-2.75L15 21l2.75-1.25L19 17z'
    },

    // ── Business & Growth ──
    'rocket': {
      name: 'Rocket (লঞ্চ/গতি)',
      cat: 'business',
      path: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-3.95 11z'
    },
    'chart': {
      name: 'Growth Chart (উন্নতি/বিক্রি)',
      cat: 'business',
      path: 'M18 20V10M12 20V4M6 20v-6 M2 20h20'
    },
    'lightbulb': {
      name: 'Lightbulb (আইডিয়া/উদ্ভাবন)',
      cat: 'business',
      path: 'M9 18h6m-4 4h2M12 2a7 7 0 00-5 11.9c.7.7 1 1.6 1 2.6v.5h8v-.5c0-1 .3-1.9 1-2.6A7 7 0 0012 2z'
    },
    'user': {
      name: 'User (প্রোফাইল/কাস্টমার)',
      cat: 'business',
      path: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z'
    },
    'clock': {
      name: 'Clock (২৪/৭ সময়/দ্রুত)',
      cat: 'business',
      path: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3.5 2'
    },
    'calendar': {
      name: 'Calendar (তারিখ/সিডিউল)',
      cat: 'business',
      path: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11z'
    },
    'target': {
      name: 'Target (লক্ষ্য/টার্গেট)',
      cat: 'business',
      path: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z'
    },
    'arrow': {
      name: 'Arrow Right (পরবর্তী ধাপ/CTA)',
      cat: 'business',
      path: 'M5 12h14M12 5l7 7-7 7'
    }
  };

  // Helper to build SVG markup
  function makeIconSvg(path, strokeOnly = false) {
    const isLine = path.includes('M5 12h14') || path.includes('M18 20V10') || path.includes('M12 2a10 10 0 100 20');
    return `
      <svg viewBox="0 0 24 24" style="width:100%;height:100%;display:block;overflow:visible;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${path}" fill="currentColor" fill-opacity="0.15" />
      </svg>
    `;
  }

  // 1. Insert "✦ Icons" button in top toolbar
  function setupIconButton() {
    if ($('iconPickerBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'iconPickerBtn';
    btn.innerHTML = '✦ Icons';
    btn.title = 'রেডি-মেড ভেক্টর আইকন লাইব্রেরি (Fashion, Contact, Badges, Business)';
    btn.style.cssText = 'background:#4338ca;border-color:#818cf8;color:#fff;font-weight:800;white-space:nowrap;';
    
    const ref = $('addShape') || $('addText') || $('newSlide');
    if (ref && ref.parentElement) {
      ref.parentElement.insertBefore(btn, ref.nextSibling);
    }

    btn.onclick = openIconPicker;
  }

  // 2. Build the Modal Dialog
  let _iconModal = null;
  function openIconPicker() {
    if (!_iconModal) {
      _iconModal = document.createElement('div');
      _iconModal.id = 'iconPickerModal';
      _iconModal.className = 'icon-modal hidden';
      _iconModal.innerHTML = `
        <div class="icon-modal-content">
          <div class="icon-modal-head">
            <div>
              <strong style="font-size:15px;color:#ffd166;display:flex;align-items:center;gap:6px;">
                ✦ READY-MADE VECTOR ICONS
              </strong>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
                ১ ক্লিকে যেকোনো আইকন স্লাইডে যোগ করুন (রঙ ও সাইজ পরিবর্তনযোগ্য)
              </div>
            </div>
            <button id="closeIconModal" style="margin-left:auto;background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
          </div>

          <div class="icon-tabs">
            <button class="icon-tab active" data-cat="all">All (সব)</button>
            <button class="icon-tab" data-cat="fashion">Fashion & Shop</button>
            <button class="icon-tab" data-cat="contact">Contact & Social</button>
            <button class="icon-tab" data-cat="trust">Trust & Badges</button>
            <button class="icon-tab" data-cat="business">Business & UI</button>
          </div>

          <div id="iconGrid" class="icon-grid"></div>
        </div>
      `;
      document.body.appendChild(_iconModal);

      // Close handlers
      $('closeIconModal').onclick = () => _iconModal.classList.add('hidden');
      _iconModal.addEventListener('click', e => {
        if (e.target === _iconModal) _iconModal.classList.add('hidden');
      });

      // Category tab click
      _iconModal.querySelectorAll('.icon-tab').forEach(tab => {
        tab.onclick = () => {
          _iconModal.querySelectorAll('.icon-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderIconGrid(tab.dataset.cat);
        };
      });

      // Inject styling
      document.head.insertAdjacentHTML('beforeend', `<style>
        .icon-modal {
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(4, 9, 18, 0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
        }
        .icon-modal.hidden { display: none !important; }
        .icon-modal-content {
          width: min(620px, calc(100vw - 32px));
          max-height: calc(100vh - 80px);
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .icon-modal-head {
          padding: 14px 18px;
          border-bottom: 1px solid #1e293b;
          display: flex; align-items: center;
        }
        .icon-tabs {
          display: flex; gap: 6px; padding: 10px 18px;
          border-bottom: 1px solid #1e293b; background: #09101d;
          overflow-x: auto;
        }
        .icon-tab {
          background: #1e293b; border: 1px solid #334155;
          color: #94a3b8; font-size: 11px; font-weight: 700;
          padding: 5px 12px; border-radius: 6px; cursor: pointer;
          white-space: nowrap; transition: all 0.15s;
        }
        .icon-tab.active, .icon-tab:hover {
          background: #3b82f6; border-color: #60a5fa; color: #fff;
        }
        .icon-grid {
          padding: 16px 18px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
          gap: 10px;
          overflow-y: auto;
          max-height: 400px;
        }
        .icon-card {
          background: #17233c; border: 1px solid #283a58;
          border-radius: 8px; padding: 10px 6px;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: #cbd5e1; cursor: pointer; transition: all 0.15s;
        }
        .icon-card:hover {
          background: #1e2e4e; border-color: #ffb11b; color: #ffd166;
          transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }
        .icon-card-svg {
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        }
        .icon-card-name {
          font-size: 9.5px; text-align: center; line-height: 1.2;
          overflow: hidden; text-overflow: ellipsis; width: 100%;
          white-space: nowrap;
        }
      </style>`);
    }

    renderIconGrid('all');
    _iconModal.classList.remove('hidden');
  }

  // 3. Render icons in grid
  function renderIconGrid(cat) {
    const grid = $('iconGrid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(ICONS).forEach(([key, info]) => {
      if (cat !== 'all' && info.cat !== cat) return;

      const card = document.createElement('button');
      card.className = 'icon-card';
      card.title = info.name;
      card.innerHTML = `
        <div class="icon-card-svg">${makeIconSvg(info.path)}</div>
        <div class="icon-card-name">${info.name.split(' (')[0]}</div>
      `;
      card.onclick = () => insertIcon(key, info);
      grid.appendChild(card);
    });
  }

  // 4. Insert Icon onto current slide canvas
  function insertIcon(key, info) {
    if (typeof active !== 'function' || !active()) return;

    // Create SVG Data URL for crisp rendering and maximum compatibility
    const svgData = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100" height="100" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${info.path}" fill="#ffd166" fill-opacity="0.18" />
      </svg>
    `);

    const el = {
      id: crypto.randomUUID(),
      type: 'image',
      src: svgData,
      isVectorIcon: true,
      iconKey: key,
      x: 43,
      y: 40,
      w: 14,
      h: 14,
      rotation: 0
    };

    active().elements.push(el);
    selected = el.id;

    if (_iconModal) _iconModal.classList.add('hidden');
    if (typeof render === 'function') render();
    if (typeof updateHandles === 'function') updateHandles();
    if (typeof showToast === 'function') showToast(`✓ ${info.name.split(' (')[0]} আইকন যুক্ত হয়েছে!`);
    window.dispatchEvent(new CustomEvent('presentation:change'));
  }

  // Initialize button when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupIconButton);
  } else {
    setupIconButton();
  }
})();
