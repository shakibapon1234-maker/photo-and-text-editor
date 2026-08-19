// ================================================================
// Phase 17: Collage / Grid Maker
// ================================================================
(function () {
    'use strict';

    const collageFileInput = document.getElementById('collageFileInput');
    const collageUploadArea = document.getElementById('collageUploadArea');
    const collageThumbs = document.getElementById('collageThumbs');
    const collageLayoutWrap = document.getElementById('collageLayoutWrap');
    const collageLayoutGrid = document.getElementById('collageLayoutGrid');
    const collageGapWrap = document.getElementById('collageGapWrap');
    const collageGapRange = document.getElementById('collageGapRange');
    const collageGapValue = document.getElementById('collageGapValue');
    const collageBorderWrap = document.getElementById('collageBorderWrap');
    const collageBorderRange = document.getElementById('collageBorderRange');
    const collageBorderValue = document.getElementById('collageBorderValue');
    const collageBorderColorToggle = document.getElementById('collageBorderColorToggle');
    const collageBorderColor = document.getElementById('collageBorderColor');
    const collagePresetWrap = document.getElementById('collagePresetWrap');
    const collagePresetGrid = document.getElementById('collagePresetGrid');
    const collageGenerateBtn = document.getElementById('collageGenerateBtn');
    const collageOpenBulkBtn = document.getElementById('collageOpenBulkBtn');
    const collageResultWrap = document.getElementById('collageResultWrap');
    const collageDownloadBtn = document.getElementById('collageDownloadBtn');

    if (!collageFileInput || !collageUploadArea) return;

    let collageImages = []; // { id, file, img, url, thumbEl }
    let collageLayout = '2x2';
    let collagePreset = null;
    let nextCollageId = 1;
    let lastGeneratedBlob = null;
    let lastGeneratedName = '';

    // Quick trigger for bulk modal
    if (collageOpenBulkBtn) {
        collageOpenBulkBtn.addEventListener('click', () => {
            const bulkBtn = document.getElementById('bulkOpenBtn');
            if (bulkBtn) bulkBtn.click();
        });
    }

    // ---------- Layout definitions ----------
    function getLayoutCells(layout) {
        const map = {
            '2x2': { cols: 2, rows: 2, cells: 4 },
            '3x1': { cols: 3, rows: 1, cells: 3 },
            '1x3': { cols: 1, rows: 3, cells: 3 },
            '2x3': { cols: 2, rows: 3, cells: 6 },
            '3x2': { cols: 3, rows: 2, cells: 6 },
        };
        return map[layout] || map['2x2'];
    }

    // ---------- Preset grid ----------
    function buildCollagePresetGrid() {
        if (!collagePresetGrid) return;
        collagePresetGrid.innerHTML = '';
        (window.SOCIAL_PRESETS || []).forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'preset-btn-social';
            btn.dataset.presetId = p.id;
            btn.innerHTML = `<strong>${p.label}</strong><small>${p.w}×${p.h} · ${p.ratioLabel}</small>`;
            btn.addEventListener('click', () => {
                collagePresetGrid.querySelectorAll('.preset-btn-social').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                collagePreset = p;
                updateGenerateButton();
            });
            if (idx === 0) {
                btn.classList.add('active');
                collagePreset = p;
            }
            collagePresetGrid.appendChild(btn);
        });
    }
    buildCollagePresetGrid();

    // ---------- Upload ----------
    collageUploadArea.addEventListener('click', () => collageFileInput.click());
    collageFileInput.addEventListener('change', (e) => addCollageFiles(e.target.files));

    collageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        collageUploadArea.classList.add('drag-over');
    });
    collageUploadArea.addEventListener('dragleave', () => {
        collageUploadArea.classList.remove('drag-over');
    });
    collageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        collageUploadArea.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files) addCollageFiles(e.dataTransfer.files);
    });

    function addCollageFiles(fileList) {
        const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
        if (!files.length) return;

        files.forEach(file => {
            const id = 'collage_' + (nextCollageId++);
            const url = URL.createObjectURL(file);
            const img = new Image();
            const item = { id, file, img: null, url, thumbEl: null };
            collageImages.push(item);

            const thumb = document.createElement('div');
            thumb.className = 'collage-thumb';
            thumb.dataset.id = id;
            thumb.innerHTML = `
                <img src="${url}" alt="${file.name}">
                <button type="button" class="collage-thumb-remove" title="মুছুন">&times;</button>
                <span class="collage-thumb-name">${file.name}</span>
            `;
            thumb.querySelector('.collage-thumb-remove').addEventListener('click', (ev) => {
                ev.stopPropagation();
                removeCollageItem(id);
            });
            collageThumbs.appendChild(thumb);
            item.thumbEl = thumb;

            img.onload = () => { item.img = img; updateGenerateButton(); };
            img.onerror = () => {
                showToast(`"${file.name}" লোড করা যায়নি`, 'error');
                removeCollageItem(id);
            };
            img.src = url;
        });

        collageLayoutWrap.style.display = 'block';
        collageGapWrap.style.display = 'block';
        collageBorderWrap.style.display = 'block';
        collagePresetWrap.style.display = 'block';
        updateGenerateButton();
        collageFileInput.value = '';
    }

    function removeCollageItem(id) {
        const idx = collageImages.findIndex(it => it.id === id);
        if (idx === -1) return;
        const item = collageImages[idx];
        URL.revokeObjectURL(item.url);
        if (item.thumbEl && item.thumbEl.parentNode) item.thumbEl.parentNode.removeChild(item.thumbEl);
        collageImages.splice(idx, 1);
        updateGenerateButton();
        if (!collageImages.length) {
            collageLayoutWrap.style.display = 'none';
            collageGapWrap.style.display = 'none';
            collageBorderWrap.style.display = 'none';
            collagePresetWrap.style.display = 'none';
            if (collageResultWrap) collageResultWrap.style.display = 'none';
        }
    }

    function updateGenerateButton() {
        const ready = collageImages.length >= 2 && collageImages.every(it => it.img) && collagePreset;
        collageGenerateBtn.disabled = !ready;
        if (!ready && collageImages.length > 0 && collageImages.length < 2) {
            collageGenerateBtn.title = 'কোলাজ তৈরি করতে অন্তত ২টি ছবি দিন';
        } else {
            collageGenerateBtn.removeAttribute('title');
        }
    }

    // ---------- Layout selection ----------
    collageLayoutGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-btn');
        if (!btn) return;
        collageLayout = btn.dataset.collageLayout;
        collageLayoutGrid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateGenerateButton();
    });

    collageGapRange.addEventListener('input', () => {
        collageGapValue.textContent = collageGapRange.value;
    });

    collageBorderRange.addEventListener('input', () => {
        collageBorderValue.textContent = collageBorderRange.value;
    });

    collageBorderColorToggle.addEventListener('change', () => {
        collageBorderColor.style.display = collageBorderColorToggle.checked ? 'block' : 'none';
    });

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    // ---------- Generate ----------
    collageGenerateBtn.addEventListener('click', () => {
        if (!collageImages.length || !collagePreset) return;

        collageGenerateBtn.disabled = true;
        collageGenerateBtn.innerHTML = '⏳ কোলাজ তৈরি হচ্ছে...';

        setTimeout(() => {
            try {
                const layout = getLayoutCells(collageLayout);
                const gap = parseInt(collageGapRange.value, 10) || 0;
                const border = parseInt(collageBorderRange.value, 10) || 0;
                const useBorderColor = collageBorderColorToggle.checked;
                const borderColor = collageBorderColor.value;

                const outW = collagePreset.w;
                const outH = collagePreset.h;
                const out = document.createElement('canvas');
                out.width = outW;
                out.height = outH;
                const octx = out.getContext('2d');

                // White background
                octx.fillStyle = '#ffffff';
                octx.fillRect(0, 0, outW, outH);

                const cellW = (outW - gap * (layout.cols + 1) - border * 2) / layout.cols;
                const cellH = (outH - gap * (layout.rows + 1) - border * 2) / layout.rows;

                for (let i = 0; i < layout.cells; i++) {
                    const col = i % layout.cols;
                    const row = Math.floor(i / layout.cols);
                    const x = gap + border + col * (cellW + gap);
                    const y = gap + border + row * (cellH + gap);

                    // Border fill
                    if (border > 0 && useBorderColor) {
                        octx.fillStyle = borderColor;
                        octx.fillRect(x - border, y - border, cellW + border * 2, cellH + border * 2);
                    }

                    // Get image (if fewer images than cells, cycle or use available)
                    const item = collageImages[i] || collageImages[i % collageImages.length];
                    const img = item ? item.img : null;
                    if (img) {
                        const srcW = img.naturalWidth || img.width;
                        const srcH = img.naturalHeight || img.height;
                        const srcRatio = srcW / srcH;
                        const cellRatio = cellW / cellH;
                        let sx, sy, sw, sh;
                        if (srcRatio > cellRatio) {
                            sh = srcH;
                            sw = sh * cellRatio;
                            sx = (srcW - sw) / 2;
                            sy = 0;
                        } else {
                            sw = srcW;
                            sh = sw / cellRatio;
                            sx = 0;
                            sy = (srcH - sh) / 2;
                        }
                        octx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
                    }
                }

                out.toBlob(blob => {
                    collageGenerateBtn.innerHTML = '🖼️ কোলাজ তৈরি করুন';
                    collageGenerateBtn.disabled = false;

                    if (!blob) {
                        showToast('❌ কোলাজ তৈরি করা যায়নি', 'error');
                        return;
                    }

                    lastGeneratedBlob = blob;
                    lastGeneratedName = `collage_${collageLayout}_${Date.now()}.png`;

                    // 1. Immediately load into main editor canvas & workspace
                    if (typeof window.setEditorImageFromBlob === 'function') {
                        window.setEditorImageFromBlob(blob, lastGeneratedName, `কোলাজ তৈরি (${collageLayout})`);
                    }

                    // 2. Trigger automatic download
                    downloadBlob(blob, lastGeneratedName);

                    // 3. Show visual result box in panel
                    if (collageResultWrap) {
                        collageResultWrap.style.display = 'block';
                        const thumb = document.getElementById('collageResultThumb');
                        if (thumb) thumb.src = URL.createObjectURL(blob);
                    }

                    showToast('✅ কোলাজ তৈরি সম্পন্ন হয়েছে এবং প্রিভিউতে লোড হয়েছে!', 'success');
                }, 'image/png');
            } catch (err) {
                collageGenerateBtn.innerHTML = '🖼️ কোলাজ তৈরি করুন';
                collageGenerateBtn.disabled = false;
                showToast('❌ সমস্যা: ' + err.message, 'error');
            }
        }, 50);
    });

    if (collageDownloadBtn) {
        collageDownloadBtn.addEventListener('click', () => {
            if (lastGeneratedBlob) {
                downloadBlob(lastGeneratedBlob, lastGeneratedName || 'collage.png');
                showToast('✅ কোলাজ ডাউনলোড শুরু হয়েছে!', 'success');
            }
        });
    }

    // ---------- Toast helper ----------
    function showToast(msg, type) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.className = 'toast show ' + (type === 'error' ? 'error' : (type === 'success' ? 'success' : ''));
            setTimeout(() => toast.classList.remove('show'), 3500);
        } else {
            alert(msg);
        }
    }

})();
