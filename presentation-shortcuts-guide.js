/**
 * Presentation Studio - Keyboard Shortcuts Guide & Slide Tab Integration
 * Adds:
 * 1. "⌨️ শর্টকাট কীসমূহ (Shortcuts)" button inside the Slide ▾ menu and top toolbar
 * 2. Interactive modal detailing all shortcuts categorized cleanly
 * 3. Press '?' key anytime to view shortcuts
 */

(() => {
  const $ = id => document.getElementById(id);

  // Inject Modal Styles
  document.head.insertAdjacentHTML('beforeend', `
    <style id="shortcutsGuideStyles">
      .shortcuts-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 7, 15, 0.85);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .shortcuts-modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .shortcuts-modal-container {
        background: #101827;
        border: 1px solid #2d3e5e;
        border-radius: 14px;
        width: min(92vw, 760px);
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 177, 27, 0.15);
        overflow: hidden;
        animation: shortcutsScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes shortcutsScaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .shortcuts-modal-header {
        padding: 16px 22px;
        background: #141f33;
        border-bottom: 1px solid #263654;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .shortcuts-modal-header h3 {
        margin: 0;
        color: #ffb11b;
        font-size: 16px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .shortcuts-modal-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .shortcuts-modal-close:hover {
        background: #202d45;
        color: #fff;
      }
      .shortcuts-modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 640px) {
        .shortcuts-modal-body {
          grid-template-columns: 1fr;
        }
      }
      .shortcut-section {
        background: #0b111e;
        border: 1px solid #1f2c44;
        border-radius: 10px;
        padding: 12px 14px;
      }
      .shortcut-section h4 {
        margin: 0 0 10px;
        font-size: 12px;
        color: #ffd166;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 1px solid #1c273e;
        padding-bottom: 6px;
      }
      .shortcut-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 0;
        font-size: 11px;
        color: #cbd5e1;
        border-bottom: 1px dotted #182337;
      }
      .shortcut-row:last-child {
        border-bottom: none;
      }
      .shortcut-desc {
        flex: 1;
        padding-right: 10px;
      }
      .shortcut-keys {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .kbd {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 4px;
        box-shadow: 0 2px 0 #0f172a;
        color: #f1f5f9;
        font-family: inherit;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        white-space: nowrap;
      }
      .shortcuts-modal-footer {
        padding: 12px 22px;
        background: #141f33;
        border-top: 1px solid #263654;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
      }
      .shortcuts-modal-footer b {
        color: #ffb11b;
      }
    </style>
  `);

  // Build the Shortcuts Modal DOM
  const modal = document.createElement('div');
  modal.id = 'shortcutsModal';
  modal.className = 'shortcuts-modal-overlay';
  modal.innerHTML = `
    <div class="shortcuts-modal-container">
      <div class="shortcuts-modal-header">
        <h3>⌨️ Presentation Studio — কীবোর্ড শর্টকাট গাইড</h3>
        <button class="shortcuts-modal-close" id="closeShortcutsModalBtn" title="Close (Esc)">&times;</button>
      </div>
      <div class="shortcuts-modal-body">
        <!-- 1. সাধারণ এডিটিং -->
        <div class="shortcut-section">
          <h4>✏️ সাধারণ এডিটিং (Editing)</h4>
          <div class="shortcut-row">
            <span class="shortcut-desc">পূর্বাবস্থায় ফেরা (Undo)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">Z</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">পুনরায় করা (Redo)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">Y</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট কপি (Copy)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">C</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট কাট (Cut)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">X</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট পেস্ট (Paste)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">V</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট ডুপ্লিকেট (Duplicate)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">D</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">সব অবজেক্ট সিলেক্ট (Select All)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">A</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">সিলেক্টেড অবজেক্ট মুছা (Delete)</span>
            <span class="shortcut-keys"><span class="kbd">Delete</span> / <span class="kbd">Backspace</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">সিলেকশন বাতিল (Deselect / Cancel)</span>
            <span class="shortcut-keys"><span class="kbd">Esc</span></span>
          </div>
        </div>

        <!-- 2. মাল্টি-সিলেকশন ও গ্রুপ -->
        <div class="shortcut-section">
          <h4>🗂️ সিলেকশন ও গ্রুপিং (Selection & Group)</h4>
          <div class="shortcut-row">
            <span class="shortcut-desc">একাধিক অবজেক্ট সিলেক্ট</span>
            <span class="shortcut-keys"><span class="kbd">Shift</span> + <span class="kbd">Click</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">বক্স টেনে সিলেকশন (Marquee)</span>
            <span class="shortcut-keys"><span class="kbd">Mouse Drag</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট গ্রুপ করা (Group)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">G</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট আনগ্রুপ করা (Ungroup)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">G</span></span>
          </div>
        </div>

        <!-- 3. পজিশন ও রোটেশন -->
        <div class="shortcut-section">
          <h4>📐 মুভমেন্ট ও রোটেশন (Transform)</h4>
          <div class="shortcut-row">
            <span class="shortcut-desc">১ পিক্সেল সূক্ষ্ম মুভ (Nudge)</span>
            <span class="shortcut-keys"><span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">←</span> <span class="kbd">→</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">১০ পিক্সেল দ্রুত মুভ</span>
            <span class="shortcut-keys"><span class="kbd">Shift</span> + <span class="kbd">Arrows</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">অবজেক্ট দ্রুত ঘোরানো (Rotate)</span>
            <span class="shortcut-keys"><span class="kbd">Alt</span> + <span class="kbd">←</span> / <span class="kbd">→</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">১৫° স্ন্যাপ করে ঘোরানো</span>
            <span class="shortcut-keys"><span class="kbd">Shift</span> + <span class="kbd">Rotate Drag</span></span>
          </div>
        </div>

        <!-- 4. টেক্সট ও লিস্ট -->
        <div class="shortcut-section">
          <h4>📝 টেক্সট স্টাইল (Text Formatting)</h4>
          <div class="shortcut-row">
            <span class="shortcut-desc">বোল্ড করা (Bold)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">B</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">ইটালিক করা (Italic)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">I</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">আন্ডারলাইন (Underline)</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">U</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">বুলেট লিস্ট অন/অফ</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">B</span></span>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">নম্বর লিস্ট অন/অফ</span>
            <span class="shortcut-keys"><span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">N</span></span>
          </div>
        </div>

        <!-- 5. স্লাইড প্লেব্যাক ও প্রেজেন্টেশন -->
        <div class="shortcut-section" style="grid-column: 1 / -1;">
          <h4>🎬 স্লাইড প্লে ও প্রেজেন্টেশন (Presentation Playback)</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="shortcut-row">
              <span class="shortcut-desc">পরবর্তী অ্যানিমেশন / স্লাইড</span>
              <span class="shortcut-keys"><span class="kbd">Space</span> / <span class="kbd">→</span> / <span class="kbd">Click</span></span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">পূর্ববর্তী স্লাইড</span>
              <span class="shortcut-keys"><span class="kbd">←</span> (Left Arrow)</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">প্লেয়ার প্রস্থান (Exit Presentation)</span>
              <span class="shortcut-keys"><span class="kbd">Esc</span></span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-desc">ফুলস্ক্রিন টগল (Fullscreen)</span>
              <span class="shortcut-keys"><span class="kbd">F11</span></span>
            </div>
          </div>
        </div>
      </div>
      <div class="shortcuts-modal-footer">
        <span>💡 টিপস: যেকোনো সময় কীবোর্ডে <b>?</b> চাপলে এই শর্টকাট গাইডটি ওপেন হবে।</span>
        <button id="closeShortcutsBottomBtn" style="padding:6px 14px;background:#202c40;border:1px solid #35445f;border-radius:6px;color:#fff;cursor:pointer;font-weight:700">ঠিক আছে (Close)</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function openShortcutsModal() {
    modal.classList.add('open');
  }

  function closeShortcutsModal() {
    modal.classList.remove('open');
  }

  $('closeShortcutsModalBtn').onclick = closeShortcutsModal;
  $('closeShortcutsBottomBtn').onclick = closeShortcutsModal;
  modal.onclick = event => {
    if (event.target === modal) closeShortcutsModal();
  };

  window.openShortcutsModal = openShortcutsModal;
  window.closeShortcutsModal = closeShortcutsModal;

  // Listen to '?' key to toggle shortcuts
  window.addEventListener('keydown', event => {
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)) {
      return;
    }
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      if (modal.classList.contains('open')) closeShortcutsModal();
      else openShortcutsModal();
    } else if (event.key === 'Escape' && modal.classList.contains('open')) {
      closeShortcutsModal();
    }
  });

  // Inject into the Slide ▾ menu and top toolbar
  function setupShortcutsButton() {
    // 1. Inside Slide ▾ Menu
    const slideMenu = document.querySelector('.toolbar-menu[data-menu="slide"]');
    if (slideMenu && !$('slideShortcutsBtn')) {
      const btn = document.createElement('button');
      btn.id = 'slideShortcutsBtn';
      btn.type = 'button';
      btn.innerHTML = '⌨️ শর্টকাট কীসমূহ (Shortcuts)';
      btn.title = 'কীবোর্ড শর্টকাট লিস্ট দেখুন (?)';
      btn.style.cssText = 'border-top:1px solid #2d3e5e;margin-top:4px;color:#ffd166;font-weight:800;';
      btn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('#toolbarGroups .toolbar-group').forEach(x => x.classList.remove('open'));
        openShortcutsModal();
      };
      slideMenu.appendChild(btn);
    }

    // 2. Quick shortcut pill in the top header
    const topBar = document.querySelector('.top');
    if (topBar && !$('quickShortcutsPill')) {
      const pill = document.createElement('button');
      pill.id = 'quickShortcutsPill';
      pill.type = 'button';
      pill.innerHTML = '⌨️ Shortcuts';
      pill.title = 'কীবোর্ড শর্টকাট লিস্ট দেখুন (বা ? চাপুন)';
      pill.style.cssText = 'background:#182234;border:1px solid #3b4e72;color:#ffd166;font-weight:800;padding:6px 11px;border-radius:6px;cursor:pointer;white-space:nowrap;margin-left:4px;';
      pill.onclick = openShortcutsModal;
      
      const presentGroup = document.querySelector('.toolbar-group[data-group="present"]');
      if (presentGroup && presentGroup.nextSibling) {
        presentGroup.parentElement.insertBefore(pill, presentGroup.nextSibling);
      } else if (topBar) {
        topBar.appendChild(pill);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setupShortcutsButton, 200));
  } else {
    setTimeout(setupShortcutsButton, 200);
  }
})();
