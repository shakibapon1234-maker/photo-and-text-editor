// ================================================================
// Bulk Resize — upload 5, 7, or more photos at once, pick one
// Facebook size preset, and get every photo back at the exact same
// size in a single ZIP download.
// ================================================================
(function () {
    'use strict';

    const bulkOpenBtn = document.getElementById('bulkOpenBtn');
    const bulkModalOverlay = document.getElementById('bulkModalOverlay');
    const bulkCloseBtn = document.getElementById('bulkCloseBtn');
    const bulkUploadArea = document.getElementById('bulkUploadArea');
    const bulkFileInput = document.getElementById('bulkFileInput');
    const bulkThumbs = document.getElementById('bulkThumbs');
    const bulkPresetWrap = document.getElementById('bulkPresetWrap');
    const bulkPresetGrid = document.getElementById('bulkPresetGrid');
    const bulkModeWrap = document.getElementById('bulkModeWrap');
    const bulkWatermarkWrap = document.getElementById('bulkWatermarkWrap');
    const bulkApplyWatermark = document.getElementById('bulkApplyWatermark');
    const bulkWatermarkHint = document.getElementById('bulkWatermarkHint');
    const bulkUpscaleWrap = document.getElementById('bulkUpscaleWrap');
    const bulkApplyUpscale = document.getElementById('bulkApplyUpscale');
    const bulkUpscaleHint = document.getElementById('bulkUpscaleHint');
    const bulkClearBtn = document.getElementById('bulkClearBtn');
    const bulkProcessBtn = document.getElementById('bulkProcessBtn');
    const bulkProgress = document.getElementById('bulkProgress');
    const bulkProgressFill = document.getElementById('bulkProgressFill');
    const bulkProgressLabel = document.getElementById('bulkProgressLabel');

    if (!bulkOpenBtn || !bulkModalOverlay) return;

    // Each item: { id, file, img (HTMLImageElement, loaded), url, thumbEl }
    let items = [];
    let selectedPreset = null;
    let nextId = 1;

    // ---------- Open / Close ----------
    function openModal() {
        bulkModalOverlay.style.display = 'flex';
        refreshBulkWatermarkHint();
        refreshBulkUpscaleHint();
    }
    function closeModal() {
        bulkModalOverlay.style.display = 'none';
    }

    bulkOpenBtn.addEventListener('click', openModal);
    bulkCloseBtn.addEventListener('click', closeModal);
    bulkModalOverlay.addEventListener('click', (e) => {
        if (e.target === bulkModalOverlay) closeModal();
    });

    // ---------- Preset grid (own copy so it doesn't fight with the single-image tab) ----------
    function buildPresetGrid() {
        bulkPresetGrid.innerHTML = '';
        (window.SOCIAL_PRESETS || []).forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'preset-btn-social';
            btn.dataset.presetId = p.id;
            btn.innerHTML = `<strong>${p.label}</strong><small>${p.w}×${p.h} · ${p.ratioLabel}</small><em>${p.note}</em>`;
            btn.addEventListener('click', () => {
                bulkPresetGrid.querySelectorAll('.preset-btn-social').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedPreset = p;
                updateProcessButtonState();
            });
            if (idx === 0) {
                btn.classList.add('active');
                selectedPreset = p;
            }
            bulkPresetGrid.appendChild(btn);
        });
    }
    buildPresetGrid();

    function getBulkMode() {
        const el = document.querySelector('input[name="bulkMode"]:checked');
        return el ? el.value : 'fit';
    }

    document.querySelectorAll('input[name="bulkMode"]').forEach(r => {
        r.addEventListener('change', () => {
            document.querySelectorAll('input[name="bulkMode"]').forEach(rr => {
                const label = rr.closest('.mode-option');
                if (label) label.classList.toggle('active', rr.checked);
            });
        });
    });

    // ---------- Upload handling ----------
    bulkUploadArea.addEventListener('click', () => bulkFileInput.click());
    bulkFileInput.addEventListener('change', (e) => addFiles(e.target.files));

    bulkUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        bulkUploadArea.classList.add('drag-over');
    });
    bulkUploadArea.addEventListener('dragleave', () => {
        bulkUploadArea.classList.remove('drag-over');
    });
    bulkUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        bulkUploadArea.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    function addFiles(fileList) {
        const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
        if (!files.length) return;

        files.forEach(file => {
            const id = 'bulk_' + (nextId++);
            const url = URL.createObjectURL(file);
            const img = new Image();

            const item = { id, file, img: null, url, thumbEl: null };
            items.push(item);

            const thumb = document.createElement('div');
            thumb.className = 'bulk-thumb';
            thumb.dataset.id = id;
            thumb.innerHTML = `
                <img src="${url}" alt="${file.name}">
                <button type="button" class="bulk-thumb-remove" title="মুছুন">&times;</button>
                <span class="bulk-thumb-name">${file.name}</span>
                <div class="bulk-thumb-status">✓</div>
            `;
            thumb.querySelector('.bulk-thumb-remove').addEventListener('click', (ev) => {
                ev.stopPropagation();
                removeItem(id);
            });
            bulkThumbs.appendChild(thumb);
            item.thumbEl = thumb;

            img.onload = () => {
                item.img = img;
            };
            img.onerror = () => {
                showBulkError(`"${file.name}" ফাইলটি লোড করা যায়নি`);
                removeItem(id);
            };
            img.src = url;
        });

        bulkPresetWrap.style.display = 'block';
        bulkModeWrap.style.display = 'block';
        if (bulkWatermarkWrap) {
            bulkWatermarkWrap.style.display = 'block';
            refreshBulkWatermarkHint();
        }
        if (bulkUpscaleWrap) {
            bulkUpscaleWrap.style.display = 'block';
            refreshBulkUpscaleHint();
        }
        updateProcessButtonState();
        bulkFileInput.value = '';
    }

    function removeItem(id) {
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) return;
        const item = items[idx];
        URL.revokeObjectURL(item.url);
        if (item.thumbEl && item.thumbEl.parentNode) item.thumbEl.parentNode.removeChild(item.thumbEl);
        items.splice(idx, 1);
        updateProcessButtonState();
        if (!items.length) {
            bulkPresetWrap.style.display = 'none';
            bulkModeWrap.style.display = 'none';
        }
    }

    function clearAll() {
        items.forEach(it => URL.revokeObjectURL(it.url));
        items = [];
        bulkThumbs.innerHTML = '';
        bulkPresetWrap.style.display = 'none';
        bulkModeWrap.style.display = 'none';
        if (bulkWatermarkWrap) bulkWatermarkWrap.style.display = 'none';
        if (bulkUpscaleWrap) bulkUpscaleWrap.style.display = 'none';
        bulkProgress.style.display = 'none';
        updateProcessButtonState();
    }
    bulkClearBtn.addEventListener('click', clearAll);

    // Phase 9: reflect whether the "ওয়াটারমার্ক" tab actually has anything
    // configured, so the checkbox doesn't silently do nothing when checked.
    function refreshBulkWatermarkHint() {
        if (!bulkWatermarkWrap || !bulkWatermarkHint) return;
        const wm = (typeof window.getWatermarkSettings === 'function') ? window.getWatermarkSettings() : null;
        if (!wm || !wm.enabled) {
            bulkWatermarkHint.textContent = '"ওয়াটারমার্ক" ট্যাবে আগে টেক্সট বা লোগো সক্রিয় করুন, তারপর এখানে টিক দিন';
            if (bulkApplyWatermark) bulkApplyWatermark.checked = false;
        } else {
            bulkWatermarkHint.textContent = '"ওয়াটারমার্ক" ট্যাবে যা সেট করা আছে, ঠিক সেটাই প্রতিটা ছবিতে বসবে';
        }
    }

    // Phase 11 bulk follow-up: the Upscale tab's local controls always have
    // a usable default (factor select + sharpen slider both start non-empty),
    // so unlike the watermark hint there's no "not configured yet" state to
    // warn about — this just keeps the number in the hint text live.
    function refreshBulkUpscaleHint() {
        if (!bulkUpscaleWrap || !bulkUpscaleHint) return;
        if (typeof window.getUpscaleSettings !== 'function') {
            bulkUpscaleWrap.style.display = 'none';
            return;
        }
        const settings = window.getUpscaleSettings();
        bulkUpscaleHint.textContent = `"আপস্কেল" ট্যাবের লোকাল সেকশনে বর্তমানে ${settings.factor}x সেট করা আছে — সেটাই প্রতিটা ছবিতে প্রয়োগ হবে (প্রিসেট সাইজে বসানোর আগে)`;
    }

    function updateProcessButtonState() {
        bulkProcessBtn.disabled = !(items.length > 0 && selectedPreset);
    }

    function showBulkError(msg) {
        // Reuse the main app's toast if present, otherwise a simple alert.
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.className = 'toast show error';
            setTimeout(() => toast.classList.remove('show'), 3000);
        } else {
            alert(msg);
        }
    }

    // ---------- Process & ZIP download ----------
    function waitForImage(item) {
        if (item.img) return Promise.resolve(item.img);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { item.img = img; resolve(img); };
            img.onerror = reject;
            img.src = item.url;
        });
    }

    function blobFromCanvas(canvasEl, type, quality) {
        return new Promise(resolve => canvasEl.toBlob(resolve, type, quality));
    }

    // Phase 9: draws the currently-configured watermark onto a fresh
    // full-resolution canvas and returns that canvas as the "source image"
    // for renderSocialCanvas() — a <canvas> works anywhere an <img> does
    // for ctx.drawImage()/img.naturalWidth (which falls back to .width),
    // so no changes were needed in social-presets.js.
    function applyBulkWatermarkIfNeeded(img) {
        if (!bulkApplyWatermark || !bulkApplyWatermark.checked) return img;
        const wm = (typeof window.getWatermarkSettings === 'function') ? window.getWatermarkSettings() : null;
        if (!wm || !wm.enabled || typeof window.drawWatermark !== 'function') return img;

        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, w, h);
        window.drawWatermark(octx, w, h, wm.settings, wm.logoImage);
        return off;
    }

    // Phase 11 bulk follow-up: runs the same progressive-resample + sharpen
    // pipeline the single-image "লোকাল আপস্কেল" button uses (exposed as
    // window.applyLocalUpscaleToCanvas, same window-exposure pattern as
    // drawWatermark()/renderSocialCanvas()) and returns a <canvas> — which
    // works anywhere an <img> does for the rest of this pipeline, so nothing
    // downstream needs to know the difference.
    function applyBulkUpscaleIfNeeded(img) {
        if (!bulkApplyUpscale || !bulkApplyUpscale.checked) return img;
        if (typeof window.applyLocalUpscaleToCanvas !== 'function' || typeof window.getUpscaleSettings !== 'function') return img;

        const settings = window.getUpscaleSettings();
        const result = window.applyLocalUpscaleToCanvas(img, settings.factor, settings.sharpenAmount, 6000);
        return result.canvas;
    }

    // Runs upscale first (so it works from the sharpest/most-detail source),
    // then burns in the watermark on top of the (possibly larger) result —
    // the opposite order would upscale the watermark's own pixels along with
    // the photo and soften its edges.
    function preprocessBulkImage(img) {
        const upscaled = applyBulkUpscaleIfNeeded(img);
        return applyBulkWatermarkIfNeeded(upscaled);
    }

    function triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    bulkProcessBtn.addEventListener('click', async () => {
        if (!items.length || !selectedPreset || typeof window.renderSocialCanvas !== 'function') return;

        // JSZip loads from a CDN — if there's no internet right now, fall
        // back to downloading each resized photo one by one instead of
        // failing outright (this app is otherwise fully offline-capable).
        const useZip = typeof JSZip !== 'undefined';

        const mode = getBulkMode();
        const preset = selectedPreset;

        bulkProcessBtn.disabled = true;
        bulkClearBtn.disabled = true;
        bulkProgress.style.display = 'block';
        bulkProgressFill.style.width = '0%';
        bulkProgressLabel.textContent = `প্রসেস হচ্ছে... 0 / ${items.length}`;

        const zip = useZip ? new JSZip() : null;
        const usedNames = new Set();
        let successCount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                const img = await waitForImage(item);
                const preprocessed = preprocessBulkImage(img);
                const rendered = window.renderSocialCanvas(preprocessed, preset.w, preset.h, mode);
                const blob = await blobFromCanvas(rendered, 'image/jpeg', 0.92);

                let baseName = item.file.name.replace(/\.[^/.]+$/, '') || `image_${i + 1}`;
                let fileName = `${baseName}_${preset.id}.jpg`;
                let dupeCount = 1;
                while (usedNames.has(fileName)) {
                    fileName = `${baseName}_${preset.id}_${dupeCount++}.jpg`;
                }
                usedNames.add(fileName);

                if (useZip) {
                    zip.file(fileName, blob);
                } else {
                    triggerDownload(blob, fileName);
                    // Small gap between downloads so the browser doesn't
                    // block them as a popup flood.
                    await new Promise(res => setTimeout(res, 350));
                }

                successCount++;
                if (item.thumbEl) item.thumbEl.classList.add('done');
            } catch (err) {
                showBulkError(`"${item.file.name}" প্রসেস করতে সমস্যা হয়েছে, বাদ দেওয়া হলো`);
            }

            const pct = Math.round(((i + 1) / items.length) * 100);
            bulkProgressFill.style.width = pct + '%';
            bulkProgressLabel.textContent = `প্রসেস হচ্ছে... ${i + 1} / ${items.length}`;
        }

        if (useZip && successCount > 0) {
            bulkProgressLabel.textContent = 'ZIP তৈরি হচ্ছে...';
            try {
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                triggerDownload(zipBlob, `${preset.id}_bulk_resized.zip`);
                bulkProgressLabel.textContent = `✅ সম্পন্ন! ${successCount}টি ছবি ZIP আকারে ডাউনলোড হয়েছে`;
            } catch (err) {
                showBulkError('ZIP তৈরি করতে সমস্যা হয়েছে, আলাদাভাবে ডাউনলোড করা হচ্ছে...');
                // last-resort fallback if zip generation itself fails
                for (const [fileName, fileObj] of Object.entries(zip.files)) {
                    if (fileObj.dir) continue;
                    const b = await fileObj.async('blob');
                    triggerDownload(b, fileName);
                    await new Promise(res => setTimeout(res, 350));
                }
            }
        } else if (!useZip && successCount > 0) {
            bulkProgressLabel.textContent = `✅ সম্পন্ন! ${successCount}টি ছবি আলাদাভাবে ডাউনলোড হয়েছে (ইন্টারনেট না থাকায় ZIP তৈরি করা যায়নি)`;
        } else {
            bulkProgressLabel.textContent = 'কোনো ছবি প্রসেস করা যায়নি';
        }

        bulkProcessBtn.disabled = false;
        bulkClearBtn.disabled = false;
    });
})();
