// ================================
// Photo Editor by Shakib - App JS
// ================================

(function () {
    'use strict';

    // --- State ---
    let originalImage = null;    // Original HTMLImageElement
    let originalFile = null;     // Original File object
    let processedBlob = null;    // Latest processed blob for download
    let originalWidth = 0;
    let originalHeight = 0;
    let aspectRatio = 1;

    // --- DOM Elements ---
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadSection = document.getElementById('uploadSection');
    const editorSection = document.getElementById('editorSection');
    const previewImage = document.getElementById('previewImage');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Info
    const infoName = document.getElementById('infoName');
    const infoSize = document.getElementById('infoSize');
    const infoDimension = document.getElementById('infoDimension');
    const infoType = document.getElementById('infoType');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tool-content');

    // File Size Tool
    const targetSizeKB = document.getElementById('targetSizeKB');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const outputFormatSize = document.getElementById('outputFormatSize');
    const applyFileSize = document.getElementById('applyFileSize');
    const fileSizeResult = document.getElementById('fileSizeResult');
    const newFileSize = document.getElementById('newFileSize');

    // Pixel Tool
    const currentPixels = document.getElementById('currentPixels');
    const targetPixels = document.getElementById('targetPixels');
    const maintainRatioPixel = document.getElementById('maintainRatioPixel');
    const applyPixel = document.getElementById('applyPixel');
    const pixelResult = document.getElementById('pixelResult');
    const newPixelDimension = document.getElementById('newPixelDimension');
    const presetBtns = document.querySelectorAll('.preset-btn');

    // Dimension Tool
    const targetWidth = document.getElementById('targetWidth');
    const targetHeight = document.getElementById('targetHeight');
    const maintainRatioDim = document.getElementById('maintainRatioDim');
    const linkIcon = document.getElementById('linkIcon');
    const applyDimension = document.getElementById('applyDimension');
    const dimensionResult = document.getElementById('dimensionResult');
    const newDimension = document.getElementById('newDimension');
    const presetDimBtns = document.querySelectorAll('.preset-btn-dim');

    // Brightness Tool
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    const contrastSlider = document.getElementById('contrastSlider');
    const contrastValue = document.getElementById('contrastValue');
    const saturationSlider = document.getElementById('saturationSlider');
    const saturationValue = document.getElementById('saturationValue');
    const applyBrightness = document.getElementById('applyBrightness');
    const brightnessResult = document.getElementById('brightnessResult');
    const newBrightness = document.getElementById('newBrightness');
    const presetBrightBtns = document.querySelectorAll('.preset-btn-bright');

    // Phase 8: extra filter-preset state (grayscale/sepia/hue-rotate amounts).
    // These have no dedicated sliders — they're only ever set by clicking a
    // filter-preset button (see buildFilterString() below) — so they live
    // as plain state instead of being read off a DOM control like
    // brightness/contrast/saturation are.
    let presetGrayscale = 0; // 0–1
    let presetSepia = 0;     // 0–1
    let presetHueRotate = 0; // degrees

    // Crop Tool
    const cropX = document.getElementById('cropX');
    const cropY = document.getElementById('cropY');
    const cropWidth = document.getElementById('cropWidth');
    const cropHeight = document.getElementById('cropHeight');
    const cropCanvas = document.getElementById('cropCanvas');
    const cropCtx = cropCanvas.getContext('2d');
    const applyCrop = document.getElementById('applyCrop');
    const cropResult = document.getElementById('cropResult');
    const newCropDimension = document.getElementById('newCropDimension');
    const presetCropBtns = document.querySelectorAll('.preset-btn-crop');

    // Download
    const downloadSection = document.getElementById('downloadSection');
    const downloadBtn = document.getElementById('downloadBtn');

    // Toast
    const toast = document.getElementById('toast');

    // Undo/Redo/Compare/History/Reset
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const compareBtn = document.getElementById('compareBtn');
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const historyModalOverlay = document.getElementById('historyModalOverlay');
    const historyList = document.getElementById('historyList');
    const historyCloseBtn = document.getElementById('historyCloseBtn');
    const historyDoneBtn = document.getElementById('historyDoneBtn');
    const clearAllEditsBtn = document.getElementById('clearAllEditsBtn');
    const revertOriginalBtn = document.getElementById('revertOriginalBtn');
    const resetSessionBtn = document.getElementById('resetSessionBtn');
    const undoPaintBucketBtn = document.getElementById('undoPaintBucketBtn');

    // ============================================
    // Upload & File Handling
    // ============================================

    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            loadImage(files[0]);
        } else {
            showToast('দয়া করে একটি ছবি ফাইল দিন', 'error');
        }
    });

    changePhotoBtn.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        } else if (file) {
            showToast('এই ফাইল টাইপ সাপোর্টেড না', 'error');
        }
    }

    // ============================================
    // Phase 7: EXIF auto-orientation
    // ============================================
    // parseExifOrientation() is a PURE function — it only reads bytes out
    // of an ArrayBuffer and returns a number, no canvas/DOM involved — so
    // it can be unit-tested standalone in plain Node (same pattern as
    // floodFillMask() in the BG-remove module). It walks the JPEG marker
    // segments looking for APP1/Exif, then walks IFD0 looking for tag
    // 0x0112 (Orientation). Non-JPEGs (PNG/WEBP/BMP) simply fail the SOI
    // check on the first line and fall back to 1 (no rotation needed).
    function parseExifOrientation(buffer) {
        try {
            if (!buffer || buffer.byteLength < 4) return 1;
            const view = new DataView(buffer);
            if (view.getUint16(0, false) !== 0xFFD8) return 1; // not a JPEG

            let offset = 2;
            const length = view.byteLength;

            while (offset + 4 <= length) {
                const marker = view.getUint16(offset, false);
                offset += 2;

                // Markers with no length field at all — skip past them.
                if (marker === 0xFFD8 || marker === 0xFFD9 || (marker >= 0xFFD0 && marker <= 0xFFD7)) {
                    continue;
                }
                if ((marker & 0xFF00) !== 0xFF00) break; // corrupt data, bail out safely

                if (offset + 2 > length) break;
                const segmentLength = view.getUint16(offset, false);
                if (segmentLength < 2) break;

                if (marker === 0xFFE1) {
                    const segStart = offset + 2;
                    if (
                        segStart + 6 <= length &&
                        view.getUint32(segStart, false) === 0x45786966 && // "Exif"
                        view.getUint16(segStart + 4, false) === 0x0000
                    ) {
                        const tiffOffset = segStart + 6;
                        if (tiffOffset + 8 <= length) {
                            const little = view.getUint16(tiffOffset, false) === 0x4949; // "II"
                            if (view.getUint16(tiffOffset + 2, little) === 0x002A) {
                                const ifd0Offset = tiffOffset + view.getUint32(tiffOffset + 4, little);
                                if (ifd0Offset + 2 <= length) {
                                    const numEntries = view.getUint16(ifd0Offset, little);
                                    for (let i = 0; i < numEntries; i++) {
                                        const entryOffset = ifd0Offset + 2 + i * 12;
                                        if (entryOffset + 12 > length) break;
                                        const tag = view.getUint16(entryOffset, little);
                                        if (tag === 0x0112) {
                                            const value = view.getUint16(entryOffset + 8, little);
                                            return (value >= 1 && value <= 8) ? value : 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (marker === 0xFFDA) break; // Start of Scan — headers are over
                offset += segmentLength;
            }
        } catch (err) {
            return 1;
        }
        return 1;
    }

    // Redraws `img` onto an offscreen canvas upright according to an EXIF
    // orientation value (2–8), returning a PNG data URL. Uses the standard
    // orientation → matrix table. Not pure (touches canvas), so this part
    // needs a real-browser check rather than a Node unit test.
    function reorientImageDataUrl(img, orientation) {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const swapDims = orientation >= 5 && orientation <= 8;

        const off = document.createElement('canvas');
        off.width = swapDims ? h : w;
        off.height = swapDims ? w : h;
        const offCtx = off.getContext('2d');

        switch (orientation) {
            case 2: offCtx.transform(-1, 0, 0, 1, w, 0); break;
            case 3: offCtx.transform(-1, 0, 0, -1, w, h); break;
            case 4: offCtx.transform(1, 0, 0, -1, 0, h); break;
            case 5: offCtx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: offCtx.transform(0, 1, -1, 0, h, 0); break;
            case 7: offCtx.transform(0, -1, -1, 0, h, w); break;
            case 8: offCtx.transform(0, -1, 1, 0, 0, w); break;
            default: break;
        }
        offCtx.drawImage(img, 0, 0);
        return off.toDataURL('image/png');
    }

    function loadImage(file) {
        originalFile = file;

        // Read the raw bytes once to look for a JPEG EXIF Orientation tag.
        // file.arrayBuffer() resolving to something unexpected (or not
        // being available at all) must never block the normal upload path,
        // so any failure here just falls back to orientation 1 (no-op).
        const exifCheck = (typeof file.arrayBuffer === 'function')
            ? file.arrayBuffer().then(parseExifOrientation).catch(() => 1)
            : Promise.resolve(1);

        exifCheck.then((orientation) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const dataUrl = (orientation >= 2 && orientation <= 8)
                        ? reorientImageDataUrl(img, orientation)
                        : e.target.result;
                    finishImageLoad(dataUrl, file);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function finishImageLoad(dataUrl, file) {
        const img = new Image();
        img.onload = function () {
            originalImage = img;
            originalWidth = img.naturalWidth;
            originalHeight = img.naturalHeight;
            aspectRatio = originalWidth / originalHeight;
            previewImage.src = dataUrl;
            // Phase 6: every fresh upload starts a brand-new undo/redo
            // timeline — the uploaded file itself becomes history[0],
            // the permanent "restore to original" baseline (also used
            // by the Erase/Restore brush and the Before/After slider).
            resetHistory(dataUrl);
            document.dispatchEvent(new CustomEvent('app:newimage'));
            showEditor(file);
        };
        img.src = dataUrl;
    }

    function showEditor(file) {
        uploadSection.style.display = 'none';
        editorSection.style.display = 'grid';
        downloadSection.style.display = 'inline-flex';
        processedBlob = null;

        // Reset results
        fileSizeResult.style.display = 'none';
        pixelResult.style.display = 'none';
        dimensionResult.style.display = 'none';
        brightnessResult.style.display = 'none';
        cropResult.style.display = 'none';

        // Set info
        infoName.textContent = file.name;
        infoSize.textContent = formatBytes(file.size);
        infoDimension.textContent = `${originalWidth} × ${originalHeight}`;
        infoType.textContent = file.type.split('/')[1].toUpperCase();

        // Set current pixel info
        const totalPixels = originalWidth * originalHeight;
        currentPixels.textContent = formatPixels(totalPixels);

        // Set default dimension values
        targetWidth.value = originalWidth;
        targetHeight.value = originalHeight;

        // Set default crop values
        cropX.value = 0;
        cropY.value = 0;
        cropWidth.value = originalWidth;
        cropHeight.value = originalHeight;
        drawCropPreview();

        // Reset brightness sliders
        brightnessSlider.value = 100;
        brightnessValue.textContent = '100';
        brightnessSlider.style.setProperty('--slider-percent', '33.3%');
        contrastSlider.value = 100;
        contrastValue.textContent = '100';
        contrastSlider.style.setProperty('--slider-percent', '33.3%');
        saturationSlider.value = 100;
        saturationValue.textContent = '100';
        saturationSlider.style.setProperty('--slider-percent', '33.3%');
        previewImage.style.filter = 'none';

        // Phase 8: clear any active filter preset (grayscale/sepia/hue-rotate)
        // and its highlighted button so a fresh upload always starts neutral.
        presetGrayscale = 0;
        presetSepia = 0;
        presetHueRotate = 0;
        presetBrightBtns.forEach(b => b.classList.remove('active'));
    }

    // ============================================
    // Tab Navigation
    // ============================================

    const toolPanels = document.getElementById('toolPanels');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            // Switching tools should always start at the top of that tool's
            // content, not wherever the previous tool happened to be scrolled to.
            if (toolPanels) toolPanels.scrollTop = 0;
            // Notify other modules (e.g. BG remove) that the active tab changed,
            // so tools like eyedropper/lasso can safely deactivate themselves.
            document.dispatchEvent(new CustomEvent('app:tabchange', { detail: btn.dataset.tab }));
        });
    });

    // ============================================
    // BG Remove: Accordion (one method open at a time)
    // ============================================
    // The BG-remove tab used to stack all 7 methods open at once, which made
    // it by far the longest scroll in the app. Now each method's header is a
    // toggle: opening one closes the others, so only one method's controls
    // are visible (and taking up scroll space) at a time.
    // Reusable per-container accordion — used by BG-remove (7 methods) and
    // Upscale (2 methods). Scoped to one container at a time so opening a
    // card in one tab never touches the other tab's open/closed state.
    function initMethodAccordion(containerSelector) {
        const cards = document.querySelectorAll(`${containerSelector} .bg-method-card`);
        if (!cards.length) return;

        cards.forEach(card => {
            const header = card.querySelector('.bg-method-header');
            if (!header) return;
            header.addEventListener('click', () => {
                const isOpen = card.classList.contains('open');
                cards.forEach(c => {
                    c.classList.remove('open');
                    const h = c.querySelector('.bg-method-header');
                    if (h) h.setAttribute('aria-expanded', 'false');
                });
                if (!isOpen) {
                    card.classList.add('open');
                    header.setAttribute('aria-expanded', 'true');
                    // Bring the opened method into view within the scrollable
                    // panel (not the whole page) once it's rendered.
                    requestAnimationFrame(() => {
                        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    });
                }
            });
        });
    }
    initMethodAccordion('#tab-bgremove');
    initMethodAccordion('#tab-upscale');

    // ============================================
    // Tool 1: File Size
    // ============================================

    qualitySlider.addEventListener('input', () => {
        const val = qualitySlider.value;
        qualityValue.textContent = val;
        qualitySlider.style.setProperty('--slider-percent', val + '%');
    });
    // Set initial slider background
    qualitySlider.style.setProperty('--slider-percent', '80%');

    applyFileSize.addEventListener('click', () => {
        if (!originalImage) return;

        const quality = parseInt(qualitySlider.value) / 100;
        const format = outputFormatSize.value;
        const targetKB = targetSizeKB.value ? parseInt(targetSizeKB.value) : null;

        applyFileSize.classList.add('loading');

        setTimeout(() => {
            if (targetKB) {
                // Iterative compression to reach target size
                compressToTargetSize(targetKB, format).then(blob => {
                    processedBlob = blob;
                    fileSizeResult.style.display = 'block';
                    newFileSize.textContent = formatBytes(blob.size);
                    downloadSection.style.display = 'block';
                    updatePreview(blob);
                    pushHistory(blob, `ফাইল সাইজ → ${targetKB}KB`);
                    applyFileSize.classList.remove('loading');
                    showToast('✅ ফাইল সাইজ সফলভাবে পরিবর্তন হয়েছে!', 'success');
                });
            } else {
                // Simple quality adjustment
                canvas.width = originalWidth;
                canvas.height = originalHeight;
                ctx.drawImage(originalImage, 0, 0);
                canvas.toBlob(blob => {
                    processedBlob = blob;
                    fileSizeResult.style.display = 'block';
                    newFileSize.textContent = formatBytes(blob.size);
                    downloadSection.style.display = 'block';
                    updatePreview(blob);
                    pushHistory(blob, 'কোয়ালিটি পরিবর্তন');
                    applyFileSize.classList.remove('loading');
                    showToast('✅ কোয়ালিটি সফলভাবে পরিবর্তন হয়েছে!', 'success');
                }, format, quality);
            }
        }, 100);
    });

    async function compressToTargetSize(targetKB, format) {
        const targetBytes = targetKB * 1024;
        let low = 0.01;
        let high = 1.0;
        let bestBlob = null;
        let iterations = 0;
        const maxIterations = 20;

        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.drawImage(originalImage, 0, 0);

        while (iterations < maxIterations && (high - low) > 0.01) {
            const mid = (low + high) / 2;
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, format, mid);
            });

            if (blob.size <= targetBytes) {
                bestBlob = blob;
                low = mid;
            } else {
                high = mid;
            }
            iterations++;
        }

        // If still larger, try reducing dimensions proportionally
        if (!bestBlob || bestBlob.size > targetBytes) {
            let scale = 1.0;
            while (scale > 0.1) {
                scale -= 0.05;
                const newW = Math.round(originalWidth * scale);
                const newH = Math.round(originalHeight * scale);
                canvas.width = newW;
                canvas.height = newH;
                ctx.drawImage(originalImage, 0, 0, newW, newH);

                const blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, format, high);
                });

                if (blob.size <= targetBytes) {
                    bestBlob = blob;
                    break;
                }
            }
        }

        if (!bestBlob) {
            // Fallback: smallest we can get
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            ctx.drawImage(originalImage, 0, 0);
            bestBlob = await new Promise(resolve => {
                canvas.toBlob(resolve, format, 0.01);
            });
        }

        return bestBlob;
    }

    // ============================================
    // Tool 2: Pixel Resize
    // ============================================

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            targetPixels.value = btn.dataset.pixels;
        });
    });

    applyPixel.addEventListener('click', () => {
        if (!originalImage) return;

        const total = parseInt(targetPixels.value);
        if (!total || total < 1) {
            showToast('দয়া করে পিক্সেল সংখ্যা দিন', 'error');
            return;
        }

        applyPixel.classList.add('loading');

        setTimeout(() => {
            let newW, newH;

            if (maintainRatioPixel.checked) {
                // Maintain aspect ratio with target total pixels
                newH = Math.round(Math.sqrt(total / aspectRatio));
                newW = Math.round(newH * aspectRatio);
            } else {
                // Just scale uniformly
                const scale = Math.sqrt(total / (originalWidth * originalHeight));
                newW = Math.round(originalWidth * scale);
                newH = Math.round(originalHeight * scale);
            }

            newW = Math.max(1, newW);
            newH = Math.max(1, newH);

            canvas.width = newW;
            canvas.height = newH;
            ctx.drawImage(originalImage, 0, 0, newW, newH);

            canvas.toBlob(blob => {
                processedBlob = blob;
                pixelResult.style.display = 'block';
                newPixelDimension.textContent = `${newW} × ${newH} (${formatPixels(newW * newH)})`;
                downloadSection.style.display = 'block';
                updatePreview(blob);
                pushHistory(blob, `পিক্সেল রিসাইজ → ${newW}×${newH}`);
                applyPixel.classList.remove('loading');
                showToast('✅ পিক্সেল সফলভাবে পরিবর্তন হয়েছে!', 'success');
            }, 'image/png');
        }, 100);
    });

    // ============================================
    // Tool 3: Height & Width
    // ============================================

    // Aspect ratio linking
    let ratioLocked = true;

    maintainRatioDim.addEventListener('change', () => {
        ratioLocked = maintainRatioDim.checked;
        linkIcon.classList.toggle('unlocked', !ratioLocked);
    });

    linkIcon.addEventListener('click', () => {
        maintainRatioDim.checked = !maintainRatioDim.checked;
        ratioLocked = maintainRatioDim.checked;
        linkIcon.classList.toggle('unlocked', !ratioLocked);
    });

    targetWidth.addEventListener('input', () => {
        if (ratioLocked && targetWidth.value) {
            targetHeight.value = Math.round(parseInt(targetWidth.value) / aspectRatio);
        }
    });

    targetHeight.addEventListener('input', () => {
        if (ratioLocked && targetHeight.value) {
            targetWidth.value = Math.round(parseInt(targetHeight.value) * aspectRatio);
        }
    });

    // Presets
    presetDimBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetDimBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            targetWidth.value = btn.dataset.w;
            targetHeight.value = btn.dataset.h;
        });
    });

    applyDimension.addEventListener('click', () => {
        if (!originalImage) return;

        const w = parseInt(targetWidth.value);
        const h = parseInt(targetHeight.value);

        if (!w || !h || w < 1 || h < 1) {
            showToast('দয়া করে সঠিক হাইট ও ওয়াইড দিন', 'error');
            return;
        }

        applyDimension.classList.add('loading');

        setTimeout(() => {
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(originalImage, 0, 0, w, h);

            canvas.toBlob(blob => {
                processedBlob = blob;
                dimensionResult.style.display = 'block';
                newDimension.textContent = `${w} × ${h}`;
                downloadSection.style.display = 'block';
                updatePreview(blob);
                pushHistory(blob, `ডাইমেনশন → ${w}×${h}`);
                applyDimension.classList.remove('loading');
                showToast('✅ ডাইমেনশন সফলভাবে পরিবর্তন হয়েছে!', 'success');
            }, 'image/png');
        }, 100);
    });

    // ============================================
    // Tool 4: Brightness / Contrast / Saturation
    // ============================================

    function updateSliderPercent(slider) {
        const percent = (slider.value / slider.max) * 100;
        slider.style.setProperty('--slider-percent', percent + '%');
    }

    // Show adjustment changes immediately while the sliders move. The Apply
    // button below still commits the same values into the exported image.
    function updateBrightnessLivePreview() {
        if (!originalImage) return;
        const brightness = parseInt(brightnessSlider.value, 10) / 100;
        const contrast = parseInt(contrastSlider.value, 10) / 100;
        const saturation = parseInt(saturationSlider.value, 10) / 100;
        brightnessValue.textContent = brightnessSlider.value;
        contrastValue.textContent = contrastSlider.value;
        saturationValue.textContent = saturationSlider.value;
        updateSliderPercent(brightnessSlider);
        updateSliderPercent(contrastSlider);
        updateSliderPercent(saturationSlider);
        previewImage.style.filter = buildFilterString(
            brightness, contrast, saturation,
            presetGrayscale, presetSepia, presetHueRotate
        );
    }

    // Phase 8: PURE function — builds the ctx.filter CSS string from plain
    // numbers, no canvas/DOM involved, so it's unit-testable standalone in
    // plain Node. brightness/contrast/saturation are ratios (1 = 100%),
    // grayscale/sepia are 0–1, hueRotate is in degrees. Zero-valued
    // grayscale/sepia/hueRotate are omitted entirely rather than emitted
    // as a no-op grayscale(0)/sepia(0)/hue-rotate(0deg), keeping the
    // filter string identical to the pre-Phase-8 output when no filter
    // preset is active.
    function buildFilterString(brightness, contrast, saturation, grayscale, sepia, hueRotate) {
        let filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
        if (grayscale) filter += ` grayscale(${grayscale})`;
        if (sepia) filter += ` sepia(${sepia})`;
        if (hueRotate) filter += ` hue-rotate(${hueRotate}deg)`;
        return filter;
    }

    // Phase 18: pure function — analyzes a downsampled ImageData and returns
    // suggested { brightness, contrast, saturation } percentages. Works from
    // a simple histogram stretch (linear stretch between low/high clips) plus
    // a modest saturation boost if the image is desaturated.
    function computeAutoEnhanceSettings(imageData) {
        const data = imageData.data;
        const len = data.length;
        const brightnesses = new Float32Array(len / 4);
        const saturations = new Float32Array(len / 4);
        let idx = 0;
        for (let i = 0; i < len; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const lum = (max + min) / 2;
            brightnesses[idx] = lum;
            saturations[idx] = max === 0 ? 0 : (max - min) / max;
            idx++;
        }

        brightnesses.sort();
        const lowClip = brightnesses[Math.floor(brightnesses.length * 0.01)];
        const highClip = brightnesses[Math.floor(brightnesses.length * 0.99)];
        const mid = (lowClip + highClip) / 2;
        const targetMid = 128;
        const targetRange = 200;
        const actualRange = Math.max(1, highClip - lowClip);

        const brightness = Math.round((targetMid / mid) * 100);
        const contrast = Math.round((targetRange / actualRange) * 100);

        let avgSat = 0;
        for (let i = 0; i < saturations.length; i++) avgSat += saturations[i];
        avgSat /= saturations.length;
        const saturation = avgSat < 0.15 ? Math.round(100 + (0.15 - avgSat) * 400) : 100;

        return {
            brightness: Math.max(50, Math.min(200, brightness)),
            contrast: Math.max(50, Math.min(200, contrast)),
            saturation: Math.max(50, Math.min(200, saturation)),
        };
    }

    // Brightness presets
    presetBrightBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBrightBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            brightnessSlider.value = btn.dataset.b;
            brightnessValue.textContent = btn.dataset.b;
            updateSliderPercent(brightnessSlider);
            contrastSlider.value = btn.dataset.c;
            contrastValue.textContent = btn.dataset.c;
            updateSliderPercent(contrastSlider);
            saturationSlider.value = btn.dataset.s;
            saturationValue.textContent = btn.dataset.s;
            updateSliderPercent(saturationSlider);
            // Phase 8: filter-preset amounts. Buttons that don't set these
            // (all the pre-Phase-8 tone presets) fall back to 0, which
            // correctly clears any previously-active filter preset too.
            presetGrayscale = parseFloat(btn.dataset.g || 0);
            presetSepia = parseFloat(btn.dataset.sp || 0);
            presetHueRotate = parseFloat(btn.dataset.h || 0);
            updateBrightnessLivePreview();
        });
    });

    [brightnessSlider, contrastSlider, saturationSlider].forEach(slider => {
        slider.addEventListener('input', updateBrightnessLivePreview);
    });

    // Phase 18: auto-enhance button
    const autoEnhanceBtn = document.getElementById('autoEnhanceBtn');
    if (autoEnhanceBtn) {
        autoEnhanceBtn.addEventListener('click', () => {
            if (!originalImage) {
                showToast('প্রথমে একটি ছবি আপলোড করুন', 'error');
                return;
            }
            const w = originalImage.naturalWidth || originalImage.width;
            const h = originalImage.naturalHeight || originalImage.height;
            const sampleSize = 200;
            const scale = Math.min(1, sampleSize / Math.max(w, h));
            const sw = Math.max(1, Math.round(w * scale));
            const sh = Math.max(1, Math.round(h * scale));
            const off = document.createElement('canvas');
            off.width = sw;
            off.height = sh;
            const octx = off.getContext('2d');
            octx.drawImage(originalImage, 0, 0, sw, sh);
            const imageData = octx.getImageData(0, 0, sw, sh);
            const settings = computeAutoEnhanceSettings(imageData);

            brightnessSlider.value = settings.brightness;
            brightnessValue.textContent = settings.brightness;
            updateSliderPercent(brightnessSlider);
            contrastSlider.value = settings.contrast;
            contrastValue.textContent = settings.contrast;
            updateSliderPercent(contrastSlider);
            saturationSlider.value = settings.saturation;
            saturationValue.textContent = settings.saturation;
            updateSliderPercent(saturationSlider);

            // Clear any active filter preset so auto-enhance is the only effect
            presetGrayscale = 0;
            presetSepia = 0;
            presetHueRotate = 0;
            document.querySelectorAll('.preset-btn-bright').forEach(b => b.classList.remove('active'));

            showToast(`✨ অটো ফিক্স: Brightness ${settings.brightness}%, Contrast ${settings.contrast}%, Saturation ${settings.saturation}% — "অ্যাপ্লাই করুন" চাপুন`);
        });
    }

    applyBrightness.addEventListener('click', () => {
        if (!originalImage) return;

        const brightness = parseInt(brightnessSlider.value) / 100;
        const contrast = parseInt(contrastSlider.value) / 100;
        const saturation = parseInt(saturationSlider.value) / 100;

        applyBrightness.classList.add('loading');

        setTimeout(() => {
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            ctx.filter = buildFilterString(brightness, contrast, saturation, presetGrayscale, presetSepia, presetHueRotate);
            ctx.drawImage(originalImage, 0, 0);
            ctx.filter = 'none';

            canvas.toBlob(blob => {
                previewImage.style.filter = 'none';
                processedBlob = blob;
                brightnessResult.style.display = 'block';
                newBrightness.textContent = `B:${brightnessSlider.value}% C:${contrastSlider.value}% S:${saturationSlider.value}%`;
                downloadSection.style.display = 'block';
                updatePreview(blob);
                pushHistory(blob, `ব্রাইটনেস/কন্ট্রাস্ট/স্যাচুরেশন পরিবর্তন`);
                applyBrightness.classList.remove('loading');
                showToast('✅ ব্রাইটনেস সফলভাবে পরিবর্তন হয়েছে!', 'success');
            }, 'image/png');
        }, 100);
    });


    // ============================================
    // Tool 5: Crop
    // ============================================

    let cropScale = 1; // scale factor for display

    function getCropScale() {
        const maxW = 500;
        return Math.min(maxW / originalWidth, 300 / originalHeight, 1);
    }

    function drawCropPreview() {
        if (!originalImage) return;

        cropScale = getCropScale();
        const displayW = Math.round(originalWidth * cropScale);
        const displayH = Math.round(originalHeight * cropScale);

        cropCanvas.width = displayW;
        cropCanvas.height = displayH;
        cropCtx.drawImage(originalImage, 0, 0, displayW, displayH);

        // Draw crop region overlay
        const cx = parseInt(cropX.value || 0) * cropScale;
        const cy = parseInt(cropY.value || 0) * cropScale;
        const cw = parseInt(cropWidth.value || originalWidth) * cropScale;
        const ch = parseInt(cropHeight.value || originalHeight) * cropScale;

        // Dim outside crop area
        cropCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        cropCtx.fillRect(0, 0, displayW, cy);
        cropCtx.fillRect(0, cy + ch, displayW, displayH - cy - ch);
        cropCtx.fillRect(0, cy, cx, ch);
        cropCtx.fillRect(cx + cw, cy, displayW - cx - cw, ch);

        // Draw crop border
        cropCtx.strokeStyle = '#6c63ff';
        cropCtx.lineWidth = 2;
        cropCtx.setLineDash([6, 4]);
        cropCtx.strokeRect(cx, cy, cw, ch);
        cropCtx.setLineDash([]);

        // Draw corner handles
        const handleSize = 8;
        cropCtx.fillStyle = '#6c63ff';
        // Top-left
        cropCtx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        // Top-right
        cropCtx.fillRect(cx + cw - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        // Bottom-left
        cropCtx.fillRect(cx - handleSize / 2, cy + ch - handleSize / 2, handleSize, handleSize);
        // Bottom-right
        cropCtx.fillRect(cx + cw - handleSize / 2, cy + ch - handleSize / 2, handleSize, handleSize);
        // Midpoints
        cropCtx.fillRect(cx + cw / 2 - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        cropCtx.fillRect(cx + cw / 2 - handleSize / 2, cy + ch - handleSize / 2, handleSize, handleSize);
        cropCtx.fillRect(cx - handleSize / 2, cy + ch / 2 - handleSize / 2, handleSize, handleSize);
        cropCtx.fillRect(cx + cw - handleSize / 2, cy + ch / 2 - handleSize / 2, handleSize, handleSize);

        // Draw rule-of-thirds grid lines inside crop
        cropCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        cropCtx.lineWidth = 1;
        cropCtx.setLineDash([]);
        for (let i = 1; i <= 2; i++) {
            cropCtx.beginPath();
            cropCtx.moveTo(cx + (cw * i) / 3, cy);
            cropCtx.lineTo(cx + (cw * i) / 3, cy + ch);
            cropCtx.stroke();
            cropCtx.beginPath();
            cropCtx.moveTo(cx, cy + (ch * i) / 3);
            cropCtx.lineTo(cx + cw, cy + (ch * i) / 3);
            cropCtx.stroke();
        }
    }

    // ---- Drag-to-Crop ----
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    function getCanvasPos(e) {
        const rect = cropCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function onDragStart(e) {
        if (!originalImage) return;
        e.preventDefault();
        isDragging = true;
        const pos = getCanvasPos(e);
        dragStartX = pos.x;
        dragStartY = pos.y;
    }

    function onDragMove(e) {
        if (!isDragging || !originalImage) return;
        e.preventDefault();
        const pos = getCanvasPos(e);

        // Calculate in canvas (display) coordinates
        let x1 = Math.min(dragStartX, pos.x);
        let y1 = Math.min(dragStartY, pos.y);
        let x2 = Math.max(dragStartX, pos.x);
        let y2 = Math.max(dragStartY, pos.y);

        // Clamp to canvas bounds
        x1 = Math.max(0, x1);
        y1 = Math.max(0, y1);
        x2 = Math.min(cropCanvas.width, x2);
        y2 = Math.min(cropCanvas.height, y2);

        // Convert back to original image coordinates
        const scale = getCropScale();
        cropX.value = Math.round(x1 / scale);
        cropY.value = Math.round(y1 / scale);
        cropWidth.value = Math.round((x2 - x1) / scale);
        cropHeight.value = Math.round((y2 - y1) / scale);

        drawCropPreview();
    }

    function onDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;

        // Ensure minimum crop size
        const cw = parseInt(cropWidth.value) || 0;
        const ch = parseInt(cropHeight.value) || 0;
        if (cw < 5 || ch < 5) {
            cropX.value = 0;
            cropY.value = 0;
            cropWidth.value = originalWidth;
            cropHeight.value = originalHeight;
            drawCropPreview();
        }
    }

    // Mouse events
    cropCanvas.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);

    // Touch events
    cropCanvas.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);

    // Update crop preview on input change
    [cropX, cropY, cropWidth, cropHeight].forEach(input => {
        input.addEventListener('input', drawCropPreview);
    });

    // Crop ratio presets
    presetCropBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetCropBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const ratio = btn.dataset.ratio;
            if (ratio === 'free') {
                cropX.value = 0;
                cropY.value = 0;
                cropWidth.value = originalWidth;
                cropHeight.value = originalHeight;
            } else {
                const parts = ratio.split(':');
                const rw = parseInt(parts[0]);
                const rh = parseInt(parts[1]);
                const targetRatio = rw / rh;

                let cw, ch;
                if (originalWidth / originalHeight > targetRatio) {
                    ch = originalHeight;
                    cw = Math.round(ch * targetRatio);
                } else {
                    cw = originalWidth;
                    ch = Math.round(cw / targetRatio);
                }

                cropX.value = Math.round((originalWidth - cw) / 2);
                cropY.value = Math.round((originalHeight - ch) / 2);
                cropWidth.value = cw;
                cropHeight.value = ch;
            }
            drawCropPreview();
        });
    });

    applyCrop.addEventListener('click', () => {
        if (!originalImage) return;

        const cx = parseInt(cropX.value) || 0;
        const cy = parseInt(cropY.value) || 0;
        const cw = parseInt(cropWidth.value);
        const ch = parseInt(cropHeight.value);

        if (!cw || !ch || cw < 1 || ch < 1) {
            showToast('দয়া করে সঠিক ক্রপ ডাইমেনশন দিন', 'error');
            return;
        }

        if (cx + cw > originalWidth || cy + ch > originalHeight) {
            showToast('ক্রপ এরিয়া ছবির বাইরে যাচ্ছে!', 'error');
            return;
        }

        applyCrop.classList.add('loading');

        setTimeout(() => {
            canvas.width = cw;
            canvas.height = ch;
            ctx.drawImage(originalImage, cx, cy, cw, ch, 0, 0, cw, ch);

            canvas.toBlob(blob => {
                processedBlob = blob;
                cropResult.style.display = 'block';
                newCropDimension.textContent = `${cw} × ${ch}`;
                downloadSection.style.display = 'block';
                updatePreview(blob);
                pushHistory(blob, `ক্রপ → ${cw}×${ch}`);
                applyCrop.classList.remove('loading');
                showToast('✅ ক্রপ সফলভাবে সম্পন্ন হয়েছে!', 'success');
            }, 'image/png');
        }, 100);
    });

    // ============================================
    // Social Media Auto-Size Tool (Facebook Feed / Reels-Story)
    // ============================================
    const socialPresetGrid = document.getElementById('socialPresetGrid');
    const socialCanvasPreview = document.getElementById('socialCanvas');
    const socialCtxPreview = socialCanvasPreview ? socialCanvasPreview.getContext('2d') : null;
    const applySocialBtn = document.getElementById('applySocial');
    const socialResult = document.getElementById('socialResult');
    const newSocialDimension = document.getElementById('newSocialDimension');
    const safeZoneToggleWrap = document.getElementById('safeZoneToggleWrap');
    const showSafeZone = document.getElementById('showSafeZone');
    const socialModeHint = document.getElementById('socialModeHint');

    let selectedSocialPreset = null;

    function buildSocialPresetGrid() {
        if (!socialPresetGrid) return;
        socialPresetGrid.innerHTML = '';
        (window.SOCIAL_PRESETS || []).forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'preset-btn-social';
            btn.dataset.presetId = p.id;
            btn.innerHTML = `<strong>${p.label}</strong><small>${p.w}×${p.h} · ${p.ratioLabel}</small><em>${p.note}</em>`;
            btn.addEventListener('click', () => {
                socialPresetGrid.querySelectorAll('.preset-btn-social').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSocialPreset = p;
                if (safeZoneToggleWrap) safeZoneToggleWrap.style.display = (p.id === 'fb_reels') ? 'block' : 'none';
                drawSocialPreview();
            });
            if (idx === 0) {
                btn.classList.add('active');
                selectedSocialPreset = p;
            }
            socialPresetGrid.appendChild(btn);
        });
        if (safeZoneToggleWrap) {
            safeZoneToggleWrap.style.display = (selectedSocialPreset && selectedSocialPreset.id === 'fb_reels') ? 'block' : 'none';
        }
    }

    function getSocialMode() {
        const el = document.querySelector('input[name="socialMode"]:checked');
        return el ? el.value : 'fit';
    }

    function syncModeOptionClasses(name) {
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
            const label = r.closest('.mode-option');
            if (label) label.classList.toggle('active', r.checked);
        });
    }

    document.querySelectorAll('input[name="socialMode"]').forEach(r => {
        r.addEventListener('change', () => {
            syncModeOptionClasses('socialMode');
            if (socialModeHint) {
                socialModeHint.textContent = getSocialMode() === 'fit'
                    ? '"ফিট" মোডে পুরো ছবিটাই থাকবে, খালি জায়গা ব্লার ব্যাকগ্রাউন্ড দিয়ে ভরাট হবে — এটাই বুস্ট/অ্যাড চালানোর সময় সাইড কেটে যাওয়া বন্ধ করার আসল সমাধান।'
                    : '"ফিল" মোডে ছবি পুরো ফ্রেম ভরাট করবে কিন্তু বাড়তি অংশ (সাধারণত দুই পাশ বা উপর-নিচ) ক্রপ হয়ে বাদ যাবে।';
            }
            drawSocialPreview();
        });
    });

    if (showSafeZone) {
        showSafeZone.addEventListener('change', drawSocialPreview);
    }

    function drawSocialPreview() {
        if (!originalImage || !selectedSocialPreset || !socialCtxPreview || typeof window.renderSocialCanvas !== 'function') return;
        const p = selectedSocialPreset;
        const mode = getSocialMode();

        const maxPreviewW = 320;
        const scale = Math.min(1, maxPreviewW / p.w);
        const pw = Math.round(p.w * scale);
        const ph = Math.round(p.h * scale);

        const rendered = window.renderSocialCanvas(originalImage, p.w, p.h, mode);

        socialCanvasPreview.width = pw;
        socialCanvasPreview.height = ph;
        socialCtxPreview.clearRect(0, 0, pw, ph);
        socialCtxPreview.drawImage(rendered, 0, 0, p.w, p.h, 0, 0, pw, ph);

        if (p.id === 'fb_reels' && showSafeZone && showSafeZone.checked) {
            const topSafe = ph * (250 / 1920);
            const bottomSafe = ph * (340 / 1920);
            socialCtxPreview.fillStyle = 'rgba(255, 0, 60, 0.28)';
            socialCtxPreview.fillRect(0, 0, pw, topSafe);
            socialCtxPreview.fillRect(0, ph - bottomSafe, pw, bottomSafe);
            socialCtxPreview.strokeStyle = 'rgba(255,255,255,0.7)';
            socialCtxPreview.setLineDash([4, 3]);
            socialCtxPreview.strokeRect(pw * 0.06, topSafe, pw * 0.88, ph - topSafe - bottomSafe);
            socialCtxPreview.setLineDash([]);
        }
    }

    if (applySocialBtn) {
        applySocialBtn.addEventListener('click', () => {
            if (!originalImage) return;
            if (!selectedSocialPreset || typeof window.renderSocialCanvas !== 'function') {
                showToast('একটি প্রিসেট বাছাই করুন', 'error');
                return;
            }
            const p = selectedSocialPreset;
            const mode = getSocialMode();

            applySocialBtn.classList.add('loading');
            setTimeout(() => {
                const rendered = window.renderSocialCanvas(originalImage, p.w, p.h, mode);
                canvas.width = p.w;
                canvas.height = p.h;
                ctx.drawImage(rendered, 0, 0);

                canvas.toBlob(blob => {
                    processedBlob = blob;
                    socialResult.style.display = 'block';
                    newSocialDimension.textContent = `${p.w} × ${p.h} (${p.label})`;
                    downloadSection.style.display = 'block';
                    updatePreview(blob);
                    pushHistory(blob, `সোশ্যাল সাইজ → ${p.label} ${p.w}×${p.h}`);
                    applySocialBtn.classList.remove('loading');
                    showToast('✅ সোশ্যাল মিডিয়া সাইজ তৈরি হয়েছে!', 'success');
                }, 'image/png');
            }, 100);
        });
    }

    buildSocialPresetGrid();
    syncModeOptionClasses('socialMode');

    // Redraw the social preview whenever a new image loads, or when the
    // user switches into the social tab (canvas needs real dimensions).
    document.addEventListener('app:newimage', () => {
        if (socialResult) socialResult.style.display = 'none';
        drawSocialPreview();
    });
    document.addEventListener('app:tabchange', (e) => {
        if (e.detail === 'social') drawSocialPreview();
    });

    // ============================================
    // Download
    // ============================================

    downloadBtn.addEventListener('click', () => {
        if (!processedBlob) {
            showToast('আগে একটি টুল অ্যাপ্লাই করুন', 'error');
            return;
        }

        const ext = processedBlob.type.split('/')[1] === 'jpeg' ? 'jpg' : processedBlob.type.split('/')[1];
        const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
        const fileName = `${baseName}_edited.${ext}`;

        const url = URL.createObjectURL(processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('📁 ফাইল ডাউনলোড হচ্ছে!', 'success');
    });

    // ============================================
    // Utilities
    // ============================================

    function updatePreview(blob) {
        const url = URL.createObjectURL(blob);
        previewImage.src = url;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function formatPixels(px) {
        if (px >= 1000000) {
            return (px / 1000000).toFixed(1) + ' MP (' + px.toLocaleString() + ' px)';
        }
        return px.toLocaleString() + ' px';
    }

    function showToast(message, type = '') {
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ============================================
    // Phase 6: Undo / Redo History
    // ============================================
    // A flat stack of {url, revoke} entries + a pointer (historyIndex).
    // Every successful "apply" across every tool (file size, pixel,
    // dimension, brightness, crop, and all 7 BG-remove methods) pushes
    // one entry here. Undo/redo just replays previewImage.src + keeps
    // `originalImage`/`processedBlob` in sync with whatever state is
    // restored, reusing the same "keep originalImage in sync" pattern
    // the Phase-0 AI-remove eyedropper bugfix established.
    let historyStack = [];
    let historyIndex = -1;
    const MAX_HISTORY = 30;
    let isRestoringHistory = false; // guards against a restore re-pushing itself

    // ============================================
    // INDEXEDDB AUTO-SAVE & SESSION PERSISTENCE
    // ============================================
    const DB_NAME = 'PhotoEditorSessionDB';
    const DB_STORE = 'editorState';

    function openSessionDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(DB_STORE)) {
                    db.createObjectStore(DB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function saveSessionToDB() {
        if (!historyStack || historyStack.length === 0) return;
        try {
            const db = await openSessionDB();
            const items = [];
            for (const h of historyStack) {
                let blob = h.blob;
                if (!blob && h.url) {
                    try { blob = await fetch(h.url).then(r => r.blob()); } catch (e) {}
                }
                if (blob) items.push({ label: h.label || 'এডিট ধাপ', blob });
            }
            if (items.length > 0) {
                const tx = db.transaction(DB_STORE, 'readwrite');
                tx.objectStore(DB_STORE).put({
                    id: 'active_session',
                    timestamp: Date.now(),
                    historyIndex: Math.min(historyIndex, items.length - 1),
                    items,
                    fileName: (originalFile && originalFile.name) || 'edited_photo.png'
                });
            }
        } catch (err) {
            console.warn('Session save error:', err);
        }
    }

    async function restoreSessionFromDB() {
        try {
            const db = await openSessionDB();
            const tx = db.transaction(DB_STORE, 'readonly');
            const req = tx.objectStore(DB_STORE).get('active_session');
            req.onsuccess = async () => {
                const data = req.result;
                if (!data || !data.items || data.items.length === 0) return;

                historyStack.forEach(h => { if (h.revoke) URL.revokeObjectURL(h.url); });
                historyStack = [];
                historyIndex = -1;

                for (const item of data.items) {
                    const url = URL.createObjectURL(item.blob);
                    historyStack.push({ url, blob: item.blob, revoke: true, label: item.label });
                }
                historyIndex = Math.min(data.historyIndex, historyStack.length - 1);
                if (historyIndex < 0) historyIndex = 0;

                await restoreHistoryAt(historyIndex, true);
                uploadSection.style.display = 'none';
                editorSection.style.display = 'grid';
                showToast('💾 আপনার পূর্বের সংরক্ষিত সেশন স্বয়ংক্রিয়ভাবে উদ্ধার করা হয়েছে!', 'info');
            };
        } catch (err) {
            console.warn('Session restore error:', err);
        }
    }

    async function clearSessionDB() {
        try {
            const db = await openSessionDB();
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).delete('active_session');
        } catch (err) {}
    }

    // Auto-restore saved session when browser loads or refreshes
    // (app.js runs at end of body so DOM is already ready)
    setTimeout(restoreSessionFromDB, 400);

    function resetHistory(urlOrBlob, label = '১. মূল ফটো আপলোড') {
        historyStack.forEach(h => { if (h.revoke) URL.revokeObjectURL(h.url); });
        historyStack = [];
        historyIndex = -1;
        pushHistory(urlOrBlob, label);
    }

    function pushHistory(urlOrBlob, label = 'এডিট ধাপ') {
        if (isRestoringHistory || !urlOrBlob) return;
        let url, revoke, blob;
        if (urlOrBlob instanceof Blob) {
            blob = urlOrBlob;
            url = URL.createObjectURL(urlOrBlob);
            revoke = true;
        } else {
            url = urlOrBlob;
            revoke = false;
        }

        if (historyIndex < historyStack.length - 1) {
            historyStack.slice(historyIndex + 1).forEach(h => { if (h.revoke) URL.revokeObjectURL(h.url); });
            historyStack = historyStack.slice(0, historyIndex + 1);
        }

        historyStack.push({ url, blob, revoke, label });
        historyIndex++;

        if (historyStack.length > MAX_HISTORY) {
            const removed = historyStack.shift();
            if (removed.revoke) URL.revokeObjectURL(removed.url);
            historyIndex--;
        }

        updateHistoryButtons();
        saveSessionToDB();
    }

    function loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    async function restoreHistoryAt(index, isAutoRestore = false) {
        if (index < 0 || index >= historyStack.length) return;
        const entry = historyStack[index];
        isRestoringHistory = true;
        try {
            const img = await loadImageFromUrl(entry.url);
            originalImage = img;
            originalWidth = img.naturalWidth;
            originalHeight = img.naturalHeight;
            aspectRatio = originalWidth / originalHeight;
            previewImage.src = entry.url;
            processedBlob = entry.blob || await fetch(entry.url).then(r => r.blob());
            downloadSection.style.display = 'block';
            historyIndex = index;
            document.dispatchEvent(new CustomEvent('app:historyrestored'));
            if (!isAutoRestore) {
                showToast(`↩️ ধাপ: ${entry.label || 'পূর্বে ফিরানো হয়েছে'}`, 'info');
            }
        } catch (err) {
            showToast('❌ পূর্বাবস্থায় ফেরানো যায়নি', 'error');
        } finally {
            isRestoringHistory = false;
            updateHistoryButtons();
            if (!isAutoRestore) saveSessionToDB();
        }
    }

    function undoEdit() {
        if (historyIndex <= 0) { showToast('আর পেছনে যাওয়ার কিছু নেই', 'error'); return; }
        restoreHistoryAt(historyIndex - 1);
    }

    function redoEdit() {
        if (historyIndex >= historyStack.length - 1) { showToast('আর সামনে যাওয়ার কিছু নেই', 'error'); return; }
        restoreHistoryAt(historyIndex + 1);
    }

    function renderHistoryList() {
        if (!historyList) return;
        historyList.innerHTML = '';
        historyStack.forEach((entry, idx) => {
            const li = document.createElement('li');
            li.className = 'history-item' + (idx === historyIndex ? ' active' : '');
            li.innerHTML = `
                <div class="history-item-label">
                    <span>${idx + 1}.</span>
                    <span>${entry.label || 'এডিট ধাপ'}</span>
                </div>
                <span class="history-item-badge">${idx === historyIndex ? 'বর্তমান' : (idx === 0 ? 'মূল ফটো' : 'ধাপ ' + (idx + 1))}</span>
            `;
            li.addEventListener('click', () => {
                restoreHistoryAt(idx);
                renderHistoryList();
            });
            historyList.appendChild(li);
        });
    }

    function openHistoryModal() {
        renderHistoryList();
        if (historyModalOverlay) historyModalOverlay.style.display = 'flex';
    }

    function closeHistoryModal() {
        if (historyModalOverlay) historyModalOverlay.style.display = 'none';
    }

    if (historyToggleBtn) historyToggleBtn.addEventListener('click', openHistoryModal);
    if (historyCloseBtn) historyCloseBtn.addEventListener('click', closeHistoryModal);
    if (historyDoneBtn) historyDoneBtn.addEventListener('click', closeHistoryModal);
    if (historyModalOverlay) {
        historyModalOverlay.addEventListener('click', (e) => {
            if (e.target === historyModalOverlay) closeHistoryModal();
        });
    }

    async function clearAllEdits() {
        if (!historyStack || historyStack.length === 0 || !originalImage) {
            showToast('কোনো ফটো ওপেন করা নেই', 'error');
            return;
        }
        await restoreHistoryAt(0);
        // Reset results display
        if (fileSizeResult) fileSizeResult.style.display = 'none';
        if (pixelResult) pixelResult.style.display = 'none';
        if (dimensionResult) dimensionResult.style.display = 'none';
        if (brightnessResult) brightnessResult.style.display = 'none';
        if (cropResult) cropResult.style.display = 'none';

        // Reset sliders & values
        if (brightnessSlider) {
            brightnessSlider.value = 100;
            if (brightnessValue) brightnessValue.textContent = '100';
            brightnessSlider.style.setProperty('--slider-percent', '33.3%');
        }
        if (contrastSlider) {
            contrastSlider.value = 100;
            if (contrastValue) contrastValue.textContent = '100';
            contrastSlider.style.setProperty('--slider-percent', '33.3%');
        }
        if (saturationSlider) {
            saturationSlider.value = 100;
            if (saturationValue) saturationValue.textContent = '100';
            saturationSlider.style.setProperty('--slider-percent', '33.3%');
        }

        presetGrayscale = 0;
        presetSepia = 0;
        presetHueRotate = 0;
        if (presetBrightBtns) presetBrightBtns.forEach(b => b.classList.remove('active'));

        if (cropX) cropX.value = 0;
        if (cropY) cropY.value = 0;
        if (cropWidth) cropWidth.value = originalWidth;
        if (cropHeight) cropHeight.value = originalHeight;
        if (typeof drawCropPreview === 'function') drawCropPreview();

        if (typeof clearColorPreview === 'function') clearColorPreview();
        if (bgLassoCanvas && typeof lassoCtx !== 'undefined' && lassoCtx) lassoCtx.clearRect(0, 0, bgLassoCanvas.width, bgLassoCanvas.height);
        if (bgCloneCanvas && typeof cloneCtx !== 'undefined' && cloneCtx) cloneCtx.clearRect(0, 0, bgCloneCanvas.width, bgCloneCanvas.height);
        if (bgEraseCanvas && typeof eraseCtx !== 'undefined' && eraseCtx) eraseCtx.clearRect(0, 0, bgEraseCanvas.width, bgEraseCanvas.height);
        if (bgWandCanvas && typeof wandCtx !== 'undefined' && wandCtx) wandCtx.clearRect(0, 0, bgWandCanvas.width, bgWandCanvas.height);

        renderHistoryList();
        showToast('🧹 সব এডিট মুছে আপলোড করা মূল ফটোতে ফিরিয়ে আনা হয়েছে', 'success');
    }

    if (clearAllEditsBtn) {
        clearAllEditsBtn.addEventListener('click', clearAllEdits);
    }

    if (revertOriginalBtn) {
        revertOriginalBtn.addEventListener('click', () => {
            restoreHistoryAt(0);
            renderHistoryList();
            showToast('⏪ মূল আপলোডকৃত ছবিতে ফিরিয়ে নেওয়া হয়েছে', 'info');
        });
    }

    if (resetSessionBtn) {
        resetSessionBtn.addEventListener('click', async () => {
            if (confirm('আপনি কি নিশ্চিত যে বর্তমান ফটো সেশন মুছে নতুন করে শুরু করতে চান?')) {
                await clearSessionDB();
                historyStack.forEach(h => { if (h.revoke) URL.revokeObjectURL(h.url); });
                historyStack = [];
                historyIndex = -1;
                originalImage = null;
                processedBlob = null;
                previewImage.src = '';
                fileInput.value = '';
                editorSection.style.display = 'none';
                uploadSection.style.display = 'block';
                showToast('🗑️ সেশন মুছে ফেলা হয়েছে। নতুন ফটো আপলোড করুন।', 'info');
            }
        });
    }

    if (undoPaintBucketBtn) {
        undoPaintBucketBtn.addEventListener('click', () => {
            if (historyIndex <= 0) {
                showToast('বাতিল করার মতো কোনো পেইন্ট ফিল নেই', 'error');
                return;
            }
            undoEdit();
            showToast('↩️ পেইন্ট বাকেট ফিল বাতিল করা হয়েছে', 'info');
        });
    }

    function updateHistoryButtons() {
        if (undoBtn) undoBtn.disabled = historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
        if (compareBtn) compareBtn.disabled = historyStack.length === 0;
    }

    if (undoBtn) undoBtn.addEventListener('click', undoEdit);
    if (redoBtn) redoBtn.addEventListener('click', redoEdit);

    // Global keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (!(e.ctrlKey || e.metaKey)) return;
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) { e.preventDefault(); undoEdit(); }
        else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); redoEdit(); }
    });

    // ============================================
    // BACKGROUND REMOVE MODULE
    // ============================================

    (function initBgRemoveModule() {

        // --- DOM Refs ---
        const bgApiKey        = document.getElementById('bgApiKey');
        const bgRemoveAiBtn   = document.getElementById('bgRemoveAiBtn');
        const bgAiLoading     = document.getElementById('bgAiLoading');

        const bgTargetColor   = document.getElementById('bgTargetColor');
        const bgEyedropperBtn = document.getElementById('bgEyedropperBtn');
        const bgEyedropperStatus = document.getElementById('bgEyedropperStatus');
        const bgTolerance     = document.getElementById('bgTolerance');
        const bgToleranceVal  = document.getElementById('bgToleranceVal');
        const bgFeather       = document.getElementById('bgFeather');
        const bgFeatherVal    = document.getElementById('bgFeatherVal');
        const bgColorRemoveBtn= document.getElementById('bgColorRemoveBtn');
        const bgColorCanvas   = document.getElementById('bgColorCanvas');
        const bgScopeGlobal   = document.getElementById('bgScopeGlobal');
        const bgScopeContiguous = document.getElementById('bgScopeContiguous');
        const bgDespill       = document.getElementById('bgDespill');
        const bgLivePreview   = document.getElementById('bgLivePreview');

        const bgLassoFreeBtn  = document.getElementById('bgLassoFreeBtn');
        const bgLassoPolyBtn  = document.getElementById('bgLassoPolyBtn');
        const bgStartLassoBtn = document.getElementById('bgStartLassoBtn');
        const bgLassoActions  = document.getElementById('bgLassoActions');
        const bgRemoveOutside = document.getElementById('bgRemoveOutsideBtn');
        const bgRemoveInside  = document.getElementById('bgRemoveInsideBtn');
        const bgCancelLasso   = document.getElementById('bgCancelLassoBtn');
        const bgLassoHint     = document.getElementById('bgLassoHint');
        const bgLassoCanvas   = document.getElementById('bgLassoCanvas');

        // Phase 14: single-image solid background replace
        const bgSolidReplaceWrap = document.getElementById('bgSolidReplaceWrap');
        const bgSolidReplaceToggle = document.getElementById('bgSolidReplaceToggle');
        const bgSolidReplaceColor = document.getElementById('bgSolidReplaceColor');

        const bgCloneCanvas       = document.getElementById('bgCloneCanvas');
        const cloneBrushSize      = document.getElementById('cloneBrushSize');
        const cloneBrushSizeVal   = document.getElementById('cloneBrushSizeVal');
        const cloneHardness       = document.getElementById('cloneHardness');
        const cloneHardnessVal    = document.getElementById('cloneHardnessVal');
        const cloneHint           = document.getElementById('cloneHint');
        const cloneStatus         = document.getElementById('cloneStatus');
        const cloneStartBtn       = document.getElementById('cloneStartBtn');
        const cloneActionBtns     = document.getElementById('cloneActionBtns');
        const cloneResetSourceBtn = document.getElementById('cloneResetSourceBtn');
        const cloneApplyBtn       = document.getElementById('cloneApplyBtn');
        const cloneCancelBtn      = document.getElementById('cloneCancelBtn');
        const cloneLongPressRing  = document.getElementById('cloneLongPressRing');

        const paintFillColor    = document.getElementById('paintFillColor');
        const paintTolerance    = document.getElementById('paintTolerance');
        const paintToleranceVal = document.getElementById('paintToleranceVal');
        const paintContiguous   = document.getElementById('paintContiguous');
        const paintStatus       = document.getElementById('paintStatus');
        const paintBucketBtn    = document.getElementById('paintBucketBtn');

        // Phase 6 — Method 6: Erase/Restore Brush
        const bgEraseCanvas       = document.getElementById('bgEraseCanvas');
        const eraseModeEraseBtn   = document.getElementById('eraseModeEraseBtn');
        const eraseModeRestoreBtn = document.getElementById('eraseModeRestoreBtn');
        const eraseBrushSize      = document.getElementById('eraseBrushSize');
        const eraseBrushSizeVal   = document.getElementById('eraseBrushSizeVal');
        const eraseHardness       = document.getElementById('eraseHardness');
        const eraseHardnessVal    = document.getElementById('eraseHardnessVal');
        const eraseHint           = document.getElementById('eraseHint');
        const eraseStatus         = document.getElementById('eraseStatus');
        const eraseStartBtn       = document.getElementById('eraseStartBtn');
        const eraseActionBtns     = document.getElementById('eraseActionBtns');
        const eraseApplyBtn       = document.getElementById('eraseApplyBtn');
        const eraseCancelBtn      = document.getElementById('eraseCancelBtn');

        // Phase 6 — Method 7: Magic Wand Selection
        const bgWandCanvas      = document.getElementById('bgWandCanvas');
        const wandTolerance     = document.getElementById('wandTolerance');
        const wandToleranceVal  = document.getElementById('wandToleranceVal');
        const wandContiguous    = document.getElementById('wandContiguous');
        const wandFillColor     = document.getElementById('wandFillColor');
        const wandStatus        = document.getElementById('wandStatus');
        const wandBtn            = document.getElementById('wandBtn');
        const wandActionBtns    = document.getElementById('wandActionBtns');
        const wandRemoveBtn     = document.getElementById('wandRemoveBtn');
        const wandFillBtn       = document.getElementById('wandFillBtn');
        const wandCancelBtn     = document.getElementById('wandCancelBtn');

        let lassoMode = 'free'; // 'free' or 'poly'
        let lassoPoints = [];
        let isDrawingLasso = false;
        let isEyedropperActive = false;
        let isCloneActive = false;
        let isPaintBucketActive = false;
        let isEraseBrushActive = false;
        let isWandActive = false;
        let animFrame = null;

        // Restore saved API key
        bgApiKey.value = localStorage.getItem('removebg_api_key') || '';
        bgApiKey.addEventListener('change', () => {
            localStorage.setItem('removebg_api_key', bgApiKey.value.trim());
        });

        // Phase 13: extracted so bulk.js can reuse the exact same network
        // call (same pattern as window.drawWatermark / window.applyLocalUpscaleToCanvas
        // being shared between the single-image tab and the bulk modal).
        // Non-pure (does a fetch), so no standalone Node unit test — same
        // limitation as the rest of the network-dependent BG-remove code.
        async function removeBackgroundViaRemoveBg(imageBlob, apiKey) {
            const formData = new FormData();
            formData.append('image_file', imageBlob, 'image.png');
            formData.append('size', 'auto');

            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: { 'X-Api-Key': apiKey },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const msg = errData?.errors?.[0]?.title || `HTTP ${response.status}`;
                throw new Error(msg);
            }

            return response.blob();
        }
        window.removeBackgroundAI = removeBackgroundViaRemoveBg;

        // Phase 14: shared helper — composites an image onto a solid-color
        // background. Exposed on `window` so bulk.js can reuse the exact same
        // logic (same pattern as removeBackgroundAI above).
        window.fillSolidBackground = function (img, hexColor) {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const octx = off.getContext('2d');
            octx.fillStyle = hexColor || '#ffffff';
            octx.fillRect(0, 0, w, h);
            octx.drawImage(img, 0, 0, w, h);
            return off;
        };

        // Phase 14: toggle solid-color replace visibility
        if (bgSolidReplaceToggle && bgSolidReplaceWrap) {
            bgSolidReplaceWrap.style.display = 'none';
            bgSolidReplaceToggle.addEventListener('change', () => {
                bgSolidReplaceWrap.style.display = bgSolidReplaceToggle.checked ? 'block' : 'none';
            });
        }

        // Copy the Remove.bg signup link to the clipboard
        const copyApiLinkBtn = document.getElementById('copyApiLinkBtn');
        if (copyApiLinkBtn) {
            copyApiLinkBtn.addEventListener('click', async () => {
                const link = 'https://www.remove.bg/api';
                try {
                    await navigator.clipboard.writeText(link);
                    showToast('✅ লিংক কপি হয়েছে', 'success');
                } catch (err) {
                    // Fallback for browsers/contexts without Clipboard API access
                    const tmp = document.createElement('textarea');
                    tmp.value = link;
                    tmp.style.position = 'fixed';
                    tmp.style.opacity = '0';
                    document.body.appendChild(tmp);
                    tmp.select();
                    try {
                        document.execCommand('copy');
                        showToast('✅ লিংক কপি হয়েছে', 'success');
                    } catch (e2) {
                        showToast('❌ কপি করা যায়নি, লিংকে ক্লিক করুন', 'error');
                    }
                    document.body.removeChild(tmp);
                }
            });
        }

        // Slider live display
        bgTolerance.addEventListener('input', () => { bgToleranceVal.textContent = bgTolerance.value; scheduleColorPreview(); });
        bgFeather.addEventListener('input',   () => { bgFeatherVal.textContent   = bgFeather.value; });
        bgTargetColor.addEventListener('input', () => scheduleColorPreview());
        if (bgScopeGlobal)      bgScopeGlobal.addEventListener('change', scheduleColorPreview);
        if (bgScopeContiguous)  bgScopeContiguous.addEventListener('change', scheduleColorPreview);
        if (bgDespill)          bgDespill.addEventListener('change', scheduleColorPreview);
        if (bgLivePreview)      bgLivePreview.addEventListener('change', () => { if (!bgLivePreview.checked) clearColorPreview(); else scheduleColorPreview(); });

        // Lasso mode toggle
        bgLassoFreeBtn.addEventListener('click', () => {
            lassoMode = 'free';
            bgLassoFreeBtn.classList.add('active');
            bgLassoPolyBtn.classList.remove('active');
            bgLassoHint.textContent = 'প্রথমে "লাসো আঁকা শুরু করুন" চাপুন, তারপর ছবির উপর মাউস ধরে টেনে আঁকুন।';
        });
        bgLassoPolyBtn.addEventListener('click', () => {
            lassoMode = 'poly';
            bgLassoPolyBtn.classList.add('active');
            bgLassoFreeBtn.classList.remove('active');
            bgLassoHint.textContent = 'প্রথমে "লাসো আঁকা শুরু করুন" চাপুন, তারপর ছবিতে পয়েন্ট ক্লিক করুন। শেষে Enter বা প্রথম পয়েন্টে ক্লিক করুন।';
        });

        // ──────────────────────────────────────────
        // METHOD 1: AI Remove via Remove.bg API
        // ──────────────────────────────────────────
        bgRemoveAiBtn.addEventListener('click', async () => {
            if (!originalFile && !processedBlob) {
                showToast('প্রথমে একটি ছবি আপলোড করুন', 'error');
                return;
            }
            const apiKey = bgApiKey.value.trim();
            if (!apiKey) {
                showToast('Remove.bg API Key দিন', 'error');
                return;
            }
            localStorage.setItem('removebg_api_key', apiKey);

            bgAiLoading.style.display = 'flex';
            bgRemoveAiBtn.disabled = true;

            try {
                // Use the latest processed blob or fall back to original file
                const blobToSend = processedBlob || originalFile;
                const resultBlob = await removeBackgroundViaRemoveBg(blobToSend, apiKey);
                let finalBlob = resultBlob;
                let finalUrl = URL.createObjectURL(resultBlob);

                // Phase 14: if solid background replace is enabled, composite
                // the BG-removed image onto the chosen solid color.
                if (bgSolidReplaceToggle && bgSolidReplaceToggle.checked) {
                    const removedImg = await new Promise((resolve, reject) => {
                        const im = new Image();
                        im.onload = () => resolve(im);
                        im.onerror = reject;
                        im.src = finalUrl;
                    });
                    const solidCanvas = window.fillSolidBackground(removedImg, bgSolidReplaceColor.value);
                    finalBlob = await new Promise(resolve => solidCanvas.toBlob(resolve, 'image/jpeg', 0.92));
                    URL.revokeObjectURL(finalUrl);
                    finalUrl = URL.createObjectURL(finalBlob);
                }

                processedBlob = finalBlob;

                // IMPORTANT: keep `originalImage` in sync with the new pixels.
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => { originalImage = img; resolve(); };
                    img.onerror = reject;
                    img.src = finalUrl;
                });

                previewImage.src = finalUrl;
                downloadSection.style.display = 'block';
                // Solid color replacement outputs JPEG; transparent BG outputs PNG.
                downloadBtn.setAttribute('data-ext', bgSolidReplaceToggle?.checked ? 'jpg' : 'png');
                const actionLabel = bgSolidReplaceToggle?.checked ? 'AI ব্যাকগ্রাউন্ড রিমুভ + সলিড রঙ বসানো হয়েছে!' : '✅ AI ব্যাকগ্রাউন্ড সফলভাবে রিমুভ হয়েছে!';
                pushHistory(finalBlob, 'AI ব্যাকগ্রাউন্ড রিমুভ' + (bgSolidReplaceToggle?.checked ? ' + সলিড BG' : ''));
                showToast(actionLabel, 'success');
            } catch (err) {
                showToast(`❌ ত্রুটি: ${err.message}`, 'error');
            } finally {
                bgAiLoading.style.display = 'none';
                bgRemoveAiBtn.disabled = false;
            }
        });

        // ──────────────────────────────────────────
        // METHOD 2: Color Tolerance Eraser
        // ──────────────────────────────────────────

        // Eyedropper: pick colour from the displayed image, with a
        // Photoshop-style zoomed loupe for pixel-accurate picking.
        const loupe       = document.getElementById('eyedropperLoupe');
        const loupeCanvas = document.getElementById('loupeCanvas');
        const loupeCtx    = loupeCanvas ? loupeCanvas.getContext('2d') : null;
        const loupeHex    = document.getElementById('loupeHex');

        let pickCanvas = null, pickCtx = null; // cached full-res copy of the current image
        let lastPick = null; // {px, py, hex} from the most recent mousemove

        bgEyedropperBtn.addEventListener('click', () => {
            if (!originalImage || !originalImage.naturalWidth) {
                showToast('প্রথমে ছবি আপলোড করুন', 'error');
                return;
            }
            isEyedropperActive = !isEyedropperActive;
            if (isEyedropperActive) {
                activateEyedropper();
            } else {
                deactivateEyedropper();
            }
        });

        function activateEyedropper() {
            ensurePickCanvas();
            bgEyedropperStatus.textContent = '👆 ছবিতে ক্লিক করুন (নিখুঁত পিক্সেলের জন্য জুম দেখুন)';
            bgEyedropperBtn.classList.add('active');
            bgEyedropperBtn.style.outline = '2px solid var(--accent)';
            previewImage.style.cursor = 'crosshair';
            previewImage.addEventListener('mousemove', onEyedropperMove);
            previewImage.addEventListener('click', onEyedropperClick);
            document.addEventListener('keydown', onEyedropperEscape);
        }

        function deactivateEyedropper() {
            isEyedropperActive = false;
            bgEyedropperStatus.textContent = '';
            bgEyedropperBtn.classList.remove('active');
            bgEyedropperBtn.style.outline = '';
            previewImage.style.cursor = '';
            previewImage.removeEventListener('mousemove', onEyedropperMove);
            previewImage.removeEventListener('click', onEyedropperClick);
            document.removeEventListener('keydown', onEyedropperEscape);
            if (loupe) loupe.style.display = 'none';
            lastPick = null;
        }

        function onEyedropperEscape(e) {
            if (e.key === 'Escape') deactivateEyedropper();
        }

        // Redraw the cached sample canvas from whatever image is current.
        // Always call this right before a picking session starts so we
        // never sample stale pixels (e.g. from before an AI/color/lasso edit).
        function ensurePickCanvas() {
            if (!pickCanvas) {
                pickCanvas = document.createElement('canvas');
                pickCtx = pickCanvas.getContext('2d');
            }
            const w = originalImage.naturalWidth  || canvas.width;
            const h = originalImage.naturalHeight || canvas.height;
            pickCanvas.width  = w;
            pickCanvas.height = h;
            pickCtx.clearRect(0, 0, w, h);
            pickCtx.drawImage(originalImage, 0, 0, w, h);
        }

        // Map a client (viewport) point to a clamped pixel coordinate on
        // the full-resolution image, based on the image's own rendered box.
        function clientPointToPixel(clientX, clientY) {
            const rect = previewImage.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;
            let xRatio = (clientX - rect.left) / rect.width;
            let yRatio = (clientY - rect.top)  / rect.height;
            xRatio = Math.min(1, Math.max(0, xRatio));
            yRatio = Math.min(1, Math.max(0, yRatio));
            const px = Math.min(pickCanvas.width  - 1, Math.floor(xRatio * pickCanvas.width));
            const py = Math.min(pickCanvas.height - 1, Math.floor(yRatio * pickCanvas.height));
            return { px, py };
        }

        function rgbToHex(r, g, b) {
            return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        }

        function onEyedropperMove(e) {
            const pt = clientPointToPixel(e.clientX, e.clientY);
            if (!pt) return;
            const pixel = pickCtx.getImageData(pt.px, pt.py, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            lastPick = { px: pt.px, py: pt.py, hex };
            updateLoupe(pt.px, pt.py, hex, e.clientX, e.clientY);
        }

        function onEyedropperClick(e) {
            const pt = clientPointToPixel(e.clientX, e.clientY);
            if (!pt) { showToast('ছবির উপরে ক্লিক করুন', 'error'); return; }
            const pixel = pickCtx.getImageData(pt.px, pt.py, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            bgTargetColor.value = hex;
            showToast(`✅ রঙ নির্বাচিত: ${hex}`, 'success');
            deactivateEyedropper();
        }

        function updateLoupe(px, py, hex, clientX, clientY) {
            if (!loupe || !loupeCtx) return;
            const GRID = 9;              // 9x9 source pixels shown
            const CELL = loupeCanvas.width / GRID;

            loupeCtx.imageSmoothingEnabled = false;
            loupeCtx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);

            const half = Math.floor(GRID / 2);
            const sx = Math.max(0, Math.min(pickCanvas.width  - GRID, px - half));
            const sy = Math.max(0, Math.min(pickCanvas.height - GRID, py - half));
            const sw = Math.min(GRID, pickCanvas.width);
            const sh = Math.min(GRID, pickCanvas.height);

            loupeCtx.drawImage(pickCanvas, sx, sy, sw, sh, 0, 0, sw * CELL, sh * CELL);

            // Grid lines
            loupeCtx.strokeStyle = 'rgba(0,0,0,0.25)';
            loupeCtx.lineWidth = 1;
            for (let i = 0; i <= GRID; i++) {
                loupeCtx.beginPath();
                loupeCtx.moveTo(i * CELL, 0);
                loupeCtx.lineTo(i * CELL, loupeCanvas.height);
                loupeCtx.stroke();
                loupeCtx.beginPath();
                loupeCtx.moveTo(0, i * CELL);
                loupeCtx.lineTo(loupeCanvas.width, i * CELL);
                loupeCtx.stroke();
            }

            // Highlight the exact centre pixel being picked
            const cx = (px - sx) * CELL;
            const cy = (py - sy) * CELL;
            loupeCtx.strokeStyle = '#ffffff';
            loupeCtx.lineWidth = 2;
            loupeCtx.strokeRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
            loupeCtx.strokeStyle = '#2563eb';
            loupeCtx.lineWidth = 1;
            loupeCtx.strokeRect(cx + 1, cy + 1, CELL - 2, CELL - 2);

            if (loupeHex) {
                loupeHex.textContent = hex.toUpperCase();
                loupeHex.style.background = hex;
                // Pick readable text colour for the swatch
                const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                loupeHex.style.color = luminance > 150 ? '#000' : '#fff';
            }

            // Position the loupe near the cursor, offset so the fingertip
            // never blocks the view, and clamped to stay on-screen.
            const OFFSET = 24, SIZE = 132;
            let left = clientX + OFFSET;
            let top  = clientY - SIZE - OFFSET;
            if (left + SIZE > window.innerWidth)  left = clientX - SIZE - OFFSET;
            if (top < 0) top = clientY + OFFSET;
            loupe.style.left = left + 'px';
            loupe.style.top  = top + 'px';
            loupe.style.display = 'block';
        }

        bgColorRemoveBtn.addEventListener('click', async () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            if (bgColorRemoveBtn.disabled) return;
            bgColorRemoveBtn.disabled = true;
            bgColorRemoveBtn.textContent = '⏳ প্রসেস করছে...';
            // Yield to browser so the button UI updates before heavy CPU work
            await new Promise(r => setTimeout(r, 0));
            try {
                await removeByColor();
            } finally {
                bgColorRemoveBtn.disabled = false;
                bgColorRemoveBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> রঙ-ভিত্তিক রিমুভ করুন`;
            }
        });

        function hexToRgb(hex) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        }

        // ── Color matching ──────────────────────────────────────────────────
        // Dual-mode strategy:
        //  • For CHROMATIC targets (high saturation): compare by Hue only.
        //    Dark-green shadows and bright-green lit areas share the same hue
        //    (~120°) so ALL lightness variants are removed in one pass.
        //    tolerance 1-100 maps to 0-50 hue-degrees of allowed deviation.
        //  • For NEUTRAL targets (grays/whites/blacks, low saturation): fall
        //    back to CIE-Lab Euclidean distance which works well for those.
        const SRGB_LUT = (() => {
            const lut = new Float32Array(256);
            for (let i = 0; i < 256; i++) {
                const c = i / 255;
                lut[i] = c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
            }
            return lut;
        })();

        function rgbToLab(r, g, b) {
            const rL = SRGB_LUT[r], gL = SRGB_LUT[g], bL = SRGB_LUT[b];
            const x = (0.4124564 * rL + 0.3575761 * gL + 0.1804375 * bL) / 0.95047;
            const y = (0.2126729 * rL + 0.7151522 * gL + 0.0721750 * bL);
            const z = (0.0193339 * rL + 0.1191920 * gL + 0.9503041 * bL) / 1.08883;
            const eps = 0.008856, k = 903.3;
            const fx = x > eps ? Math.cbrt(x) : (k * x + 16) / 116;
            const fy = y > eps ? Math.cbrt(y) : (k * y + 16) / 116;
            const fz = z > eps ? Math.cbrt(z) : (k * z + 16) / 116;
            return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
        }

        function rgbToHsl(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            const l = (max + min) / 2;
            if (max === min) return [0, 0, l]; // achromatic
            const d = max - min;
            const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            let h;
            if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else                h = ((r - g) / d + 4) / 6;
            return [h * 360, s, l]; // [0-360, 0-1, 0-1]
        }

        function hueDist(h1, h2) {
            const d = Math.abs(h1 - h2);
            return d > 180 ? 360 - d : d;
        }

        // Pre-computed target info for the current removal session
        let _matchMode   = 'lab';  // 'hue' | 'lab'
        let _targetHsl   = null;
        let _targetLab   = null;
        let _labLW       = 1.0;
        let _hueTolDeg   = 20;
        let _labThresh   = 30;
        let _minSat      = 0.08;   // pixels below this saturation are never hue-matched

        function prepareMatchTarget(targetHex, toleranceValue) {
            const t = hexToRgb(targetHex);
            const tol = parseInt(toleranceValue, 10);   // 1–100
            _targetHsl = rgbToHsl(t.r, t.g, t.b);
            _targetLab = rgbToLab(t.r, t.g, t.b);
            const tChroma = Math.sqrt(_targetLab[1] ** 2 + _targetLab[2] ** 2);
            // Use hue mode when the target itself has meaningful saturation
            _matchMode = (_targetHsl[1] > 0.20) ? 'hue' : 'lab';
            if (_matchMode === 'hue') {
                // tol 1-100 → hue tolerance 3-60°
                _hueTolDeg = 3 + (tol / 100) * 57;
                // Minimum saturation a pixel must have to be hue-matched
                // (prevents matching near-white or near-black neutrals)
                _minSat = Math.max(0.06, _targetHsl[1] * 0.15);
            } else {
                _labLW = tChroma < 12 ? 1.0 : 0.6;
                _labThresh = tol;
            }
        }

        // Returns true if pixel (r,g,b) with existing alpha matches the target.
        function pixelMatches(r, g, b, existingAlpha) {
            if (existingAlpha === 0) return false; // already transparent
            if (_matchMode === 'hue') {
                const hsl = rgbToHsl(r, g, b);
                // Must have enough saturation to have a meaningful hue
                if (hsl[1] < _minSat) return false;
                return hueDist(hsl[0], _targetHsl[0]) <= _hueTolDeg;
            } else {
                const lab = rgbToLab(r, g, b);
                const dL  = (lab[0] - _targetLab[0]) * _labLW;
                const da  = lab[1] - _targetLab[1];
                const db  = lab[2] - _targetLab[2];
                return Math.sqrt(dL * dL + da * da + db * db) <= _labThresh;
            }
        }

        // Legacy wrapper kept for floodFillMask (paint-bucket) which still
        // compares from a specific start pixel rather than a fixed target.
        function colorDistance(r1, g1, b1, r2, g2, b2) {
            const lab1 = rgbToLab(r1, g1, b1);
            const lab2 = rgbToLab(r2, g2, b2);
            const chroma = Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]);
            const lW = chroma < 12 ? 1.0 : 0.6;
            const dL = (lab1[0] - lab2[0]) * lW;
            const da = lab1[1] - lab2[1];
            const db = lab1[2] - lab2[2];
            return Math.sqrt(dL * dL + da * da + db * db);
        }

        // ── Live preview ─────────────────────────────────────────────────────
        let colorPreviewRAF = null;
        const bgColorCtx = bgColorCanvas ? bgColorCanvas.getContext('2d') : null;

        function clearColorPreview() {
            if (!bgColorCtx) return;
            bgColorCanvas.style.display = 'none';
            bgColorCtx.clearRect(0, 0, bgColorCanvas.width, bgColorCanvas.height);
        }

        function scheduleColorPreview() {
            if (!bgLivePreview || !bgLivePreview.checked || !originalImage || !bgColorCtx) return;
            if (colorPreviewRAF) cancelAnimationFrame(colorPreviewRAF);
            colorPreviewRAF = requestAnimationFrame(drawColorPreview);
        }

        function drawColorPreview() {
            colorPreviewRAF = null;
            if (!originalImage || !bgColorCtx) return;
            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            ensurePickCanvas();
            const imageData = pickCtx.getImageData(0, 0, w, h);
            const data = imageData.data;
            prepareMatchTarget(bgTargetColor.value, bgTolerance.value);
            const contiguous = bgScopeContiguous && bgScopeContiguous.checked;

            let mask;
            if (contiguous) {
                mask = buildColorMaskContiguous(data, w, h);
            } else {
                mask = new Uint8Array(w * h);
                for (let i = 0; i < w * h; i++) {
                    mask[i] = pixelMatches(data[i*4], data[i*4+1], data[i*4+2], data[i*4+3]) ? 1 : 0;
                }
            }

            // Draw red tinted overlay
            bgColorCanvas.width  = w;
            bgColorCanvas.height = h;
            const overlay = bgColorCtx.createImageData(w, h);
            for (let i = 0; i < w * h; i++) {
                if (mask[i]) {
                    overlay.data[i * 4]     = 255;
                    overlay.data[i * 4 + 1] = 30;
                    overlay.data[i * 4 + 2] = 30;
                    overlay.data[i * 4 + 3] = 140;
                }
            }
            bgColorCtx.putImageData(overlay, 0, 0);
            bgColorCanvas.style.display = 'block';
        }

        // Contiguous flood-fill using the unified pixelMatches() function
        function buildColorMaskContiguous(data, w, h) {
            const total = w * h;
            const mask    = new Uint8Array(total);
            const visited = new Uint8Array(total);
            // Seeds: all 4 corners + center.  For complex backgrounds the user
            // can switch to Global mode, which catches disconnected patches too.
            const seeds = [
                0, w - 1, (h - 1) * w, h * w - 1,
                Math.floor(h / 2) * w + Math.floor(w / 2)
            ];
            const stack = [];
            for (const s of seeds) {
                if (!visited[s]) { visited[s] = 1; stack.push(s); }
            }
            while (stack.length) {
                const idx = stack.pop();
                if (!pixelMatches(data[idx*4], data[idx*4+1], data[idx*4+2], data[idx*4+3])) continue;
                mask[idx] = 1;
                const x = idx % w, y = (idx - x) / w;
                if (x > 0)     { const n = idx - 1; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
                if (x < w - 1) { const n = idx + 1; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
                if (y > 0)     { const n = idx - w; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
                if (y < h - 1) { const n = idx + w; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
            }
            return mask;
        }

        async function removeByColor() {
            clearColorPreview();
            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            canvas.width  = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(originalImage, 0, 0);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            // Prepare unified matcher (hue-mode for chromatic colors, Lab for neutrals)
            prepareMatchTarget(bgTargetColor.value, bgTolerance.value);

            const feather    = parseInt(bgFeather.value, 10);
            const contiguous = bgScopeContiguous && bgScopeContiguous.checked;
            const doDespill  = bgDespill && bgDespill.checked;

            // Pass 1: build removal mask
            let mask;
            if (contiguous) {
                mask = buildColorMaskContiguous(data, w, h);
            } else {
                mask = new Uint8Array(w * h);
                for (let i = 0; i < w * h; i++) {
                    mask[i] = pixelMatches(data[i*4], data[i*4+1], data[i*4+2], data[i*4+3]) ? 1 : 0;
                }
            }

            // Convert mask to float alpha (0=keep, 1=remove)
            const alpha = new Float32Array(w * h);
            for (let i = 0; i < w * h; i++) alpha[i] = mask[i];

            // Pass 2: feathering (simple box blur on alpha mask)
            if (feather > 0) {
                const blurred = new Float32Array(w * h);
                const f = feather;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let sum = 0, count = 0;
                        for (let dy = -f; dy <= f; dy++) {
                            for (let dx = -f; dx <= f; dx++) {
                                const nx = x + dx, ny = y + dy;
                                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                    sum += alpha[ny * w + nx];
                                    count++;
                                }
                            }
                        }
                        blurred[y * w + x] = sum / count;
                    }
                }
                for (let i = 0; i < w * h; i++) alpha[i] = blurred[i];
            }

            // Pass 3: apply alpha mask + optional despill
            // doDs only applies when the target is a chromatic color.
            const doDs = doDespill && _targetHsl && _targetHsl[1] > 0.20;
            for (let i = 0; i < w * h; i++) {
                const a = alpha[i];
                if (a <= 0) {
                    if (doDs && data[i * 4 + 3] > 0) {
                        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
                        const lab  = rgbToLab(r, g, b);
                        const dL   = (lab[0] - _targetLab[0]) * _labLW;
                        const da   = lab[1] - _targetLab[1];
                        const db   = lab[2] - _targetLab[2];
                        const dist = Math.sqrt(dL * dL + da * da + db * db);
                        const sThresh = _labThresh * 1.5;
                        if (dist < sThresh) {
                            const spillStr = 1.0 - dist / sThresh;
                            const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                            data[i * 4]     = Math.round(r + (lum - r) * spillStr * 0.7);
                            data[i * 4 + 1] = Math.round(g + (lum - g) * spillStr * 0.7);
                            data[i * 4 + 2] = Math.round(b + (lum - b) * spillStr * 0.7);
                        }
                    }
                } else {
                    data[i * 4 + 3] = Math.round((1 - a) * data[i * 4 + 3]);
                }
            }
            ctx.putImageData(imageData, 0, 0);

            // Await blob creation and image load before updating originalImage
            // so that the next click always samples the freshly updated pixels.
            await new Promise((resolve, reject) => {
                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('blob null')); return; }
                    processedBlob = blob;
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        originalImage = img;
                        previewImage.src = url;
                        // Refresh pick-canvas so eyedropper/preview uses new pixels
                        if (pickCanvas) {
                            pickCanvas.width  = img.naturalWidth;
                            pickCanvas.height = img.naturalHeight;
                            pickCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
                            pickCtx.drawImage(img, 0, 0);
                        }
                        downloadSection.style.display = 'block';
                        downloadBtn.setAttribute('data-ext', 'png');
                        pushHistory(blob, 'রঙ-ভিত্তিক BG রিমুভ');
                        showToast('✅ রঙ-ভিত্তিক রিমুভ সম্পন্ন! আবার করতে পারেন বা PNG ডাউনলোড করুন।', 'success');
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = url;
                }, 'image/png');
            });
        }

        // ──────────────────────────────────────────
        // METHOD 3: Lasso / Polygon Selection
        // ──────────────────────────────────────────

        let lassoCtx = bgLassoCanvas.getContext('2d');

        // Compute the image's actual rendered box relative to its wrapper.
        // Because the wrapper centers the image with flexbox (object-fit
        // style letterboxing), the <img> element usually does NOT fill the
        // whole wrapper — so the overlay canvas must be positioned/sized to
        // match the IMAGE, not the wrapper, or drawing will be stretched
        // and misaligned with the cursor (this was the root cause of the
        // "can't drag-select" bug).
        function getImageDisplayRect() {
            const wrapper = previewImage.parentElement;
            const imgRect = previewImage.getBoundingClientRect();
            const wrapRect = wrapper.getBoundingClientRect();
            return {
                left: imgRect.left - wrapRect.left,
                top: imgRect.top - wrapRect.top,
                width: imgRect.width,
                height: imgRect.height
            };
        }

        function syncLassoCanvasSize() {
            const rect = getImageDisplayRect();
            const w = Math.max(1, Math.round(rect.width));
            const h = Math.max(1, Math.round(rect.height));
            // Position & CSS size exactly over the visible image...
            bgLassoCanvas.style.left   = rect.left + 'px';
            bgLassoCanvas.style.top    = rect.top + 'px';
            bgLassoCanvas.style.width  = w + 'px';
            bgLassoCanvas.style.height = h + 'px';
            // ...and make the drawing buffer match 1:1 so nothing is
            // stretched/warped between the canvas pixels and screen pixels.
            bgLassoCanvas.width  = w;
            bgLassoCanvas.height = h;
        }

        // If the window resizes while a lasso session is open, the overlay
        // position/size and all recorded points would go stale — safest is
        // to cancel the in-progress selection rather than silently corrupt it.
        window.addEventListener('resize', () => {
            if (bgLassoCanvas.style.display !== 'none') {
                showToast('উইন্ডো সাইজ পরিবর্তনের কারণে সিলেকশন বাতিল হয়েছে, আবার আঁকুন', 'error');
                bgCancelLasso.click();
            }
            // Unlike the lasso overlay, the clone/erase canvases' drawing
            // buffers are fixed at the image's full resolution (not the
            // display size), so a resize only needs to reposition/resize
            // the CSS box — nothing painted so far is lost.
            if (isCloneActive) syncCloneCanvasBox();
            if (isEraseBrushActive) syncEraseCanvasBox();
            if (isWandActive) syncWandCanvasBox();
        });

        // Leaving the BG-remove tab mid-selection (or mid-eyedropper/clone/erase/wand)
        // should not leave stray listeners/overlays behind.
        document.addEventListener('app:tabchange', (e) => {
            if (e.detail !== 'bgremove') {
                if (isEyedropperActive) deactivateEyedropper();
                if (bgLassoCanvas.style.display !== 'none') bgCancelLasso.click();
                if (isCloneActive) endCloneSession(false);
                if (isPaintBucketActive) deactivatePaintBucket();
                if (isEraseBrushActive) endEraseSession(false);
                if (isWandActive) deactivateWand();
            }
        });

        // Phase 2: the preview panel can now float, zoom, and get dragged
        // or resized — any of those change previewImage's on-screen box,
        // so the lasso overlay (which is positioned to match that box
        // exactly, see getImageDisplayRect() above) needs to be resynced
        // whenever that happens. Reusing the same event the floating/zoom
        // module dispatches keeps this in one place instead of scattering
        // resize listeners everywhere.
        document.addEventListener('app:previewlayoutchange', () => {
            if (bgLassoCanvas.style.display !== 'none') {
                syncLassoCanvasSize();
            }
            if (isCloneActive) {
                syncCloneCanvasBox();
            }
            if (isEraseBrushActive) {
                syncEraseCanvasBox();
            }
            if (isWandActive) {
                syncWandCanvasBox();
            }
        });

        bgStartLassoBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            syncLassoCanvasSize();
            lassoPoints = [];
            isDrawingLasso = false;
            bgLassoCanvas.style.display = 'block';
            bgLassoActions.style.display = 'none';
            bgStartLassoBtn.style.display = 'none';

            if (lassoMode === 'free') {
                startFreeLasso();
            } else {
                startPolyLasso();
            }
        });

        // --- Freehand Lasso ---
        function startFreeLasso() {
            bgLassoHint.textContent = '🖱️ মাউস চেপে ধরুন এবং বিষয়বস্তুর চারপাশে টেনে আঁকুন।';

            function onMouseDown(e) {
                isDrawingLasso = true;
                lassoPoints = [];
                const pos = getLassoPos(e);
                lassoPoints.push(pos);
            }
            function onMouseMove(e) {
                if (!isDrawingLasso) return;
                const pos = getLassoPos(e);
                lassoPoints.push(pos);
                drawLassoPath();
            }
            function onMouseUp() {
                if (!isDrawingLasso || lassoPoints.length < 3) return;
                isDrawingLasso = false;
                drawLassoPath(true); // closed
                showLassoActions();
                bgLassoCanvas.removeEventListener('mousedown', onMouseDown);
                bgLassoCanvas.removeEventListener('mousemove', onMouseMove);
                bgLassoCanvas.removeEventListener('mouseup',   onMouseUp);
                // Touch support
                bgLassoCanvas.removeEventListener('touchstart', onTouchStart);
                bgLassoCanvas.removeEventListener('touchmove',  onTouchMove);
                bgLassoCanvas.removeEventListener('touchend',   onMouseUp);
            }
            // Touch helpers
            function onTouchStart(e) { e.preventDefault(); onMouseDown(e.touches[0]); }
            function onTouchMove(e)  { e.preventDefault(); onMouseMove(e.touches[0]); }

            bgLassoCanvas.addEventListener('mousedown', onMouseDown);
            bgLassoCanvas.addEventListener('mousemove', onMouseMove);
            bgLassoCanvas.addEventListener('mouseup',   onMouseUp);
            bgLassoCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
            bgLassoCanvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
            bgLassoCanvas.addEventListener('touchend',   onMouseUp);
        }

        // --- Polygon Lasso ---
        function startPolyLasso() {
            bgLassoHint.textContent = '🖱️ ক্লিক করুন পয়েন্ট যোগ করতে। প্রথম পয়েন্টে ক্লিক করুন বা Enter চাপুন শেষ করতে।';
            lassoPoints = [];

            function onPolyClick(e) {
                const pos = getLassoPos(e);
                // Close if clicking near first point
                if (lassoPoints.length > 2) {
                    const dx = pos.x - lassoPoints[0].x;
                    const dy = pos.y - lassoPoints[0].y;
                    if (Math.sqrt(dx * dx + dy * dy) < 12) {
                        closePoly();
                        return;
                    }
                }
                lassoPoints.push(pos);
                drawLassoPath();
            }
            function onPolyMove(e) {
                if (lassoPoints.length === 0) return;
                const pos = getLassoPos(e);
                drawLassoPath();
                // Draw rubber-band line to cursor
                lassoCtx.setLineDash([4, 4]);
                lassoCtx.beginPath();
                lassoCtx.moveTo(lassoPoints[lassoPoints.length - 1].x, lassoPoints[lassoPoints.length - 1].y);
                lassoCtx.lineTo(pos.x, pos.y);
                lassoCtx.stroke();
                lassoCtx.setLineDash([]);
            }
            function closePoly() {
                if (lassoPoints.length < 3) return;
                drawLassoPath(true);
                showLassoActions();
                bgLassoCanvas.removeEventListener('click',     onPolyClick);
                bgLassoCanvas.removeEventListener('mousemove', onPolyMove);
                document.removeEventListener('keydown', onEnter);
            }
            function onEnter(e) { if (e.key === 'Enter') closePoly(); }

            bgLassoCanvas.addEventListener('click',     onPolyClick);
            bgLassoCanvas.addEventListener('mousemove', onPolyMove);
            document.addEventListener('keydown', onEnter);
        }

        function getLassoPos(e) {
            const rect = bgLassoCanvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (bgLassoCanvas.width  / rect.width),
                y: (e.clientY - rect.top)  * (bgLassoCanvas.height / rect.height)
            };
        }

        // Draw the lasso path with marching-ants effect
        let dashOffset = 0;
        function drawLassoPath(closed = false) {
            lassoCtx.clearRect(0, 0, bgLassoCanvas.width, bgLassoCanvas.height);
            if (lassoPoints.length < 2) return;

            // Filled selection tint
            lassoCtx.beginPath();
            lassoCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            lassoPoints.forEach(p => lassoCtx.lineTo(p.x, p.y));
            if (closed) lassoCtx.closePath();
            lassoCtx.fillStyle = 'rgba(99, 179, 237, 0.15)';
            lassoCtx.fill();

            // Marching ants outline
            lassoCtx.beginPath();
            lassoCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            lassoPoints.forEach(p => lassoCtx.lineTo(p.x, p.y));
            if (closed) lassoCtx.closePath();

            lassoCtx.strokeStyle = '#fff';
            lassoCtx.lineWidth = 2;
            lassoCtx.setLineDash([8, 4]);
            lassoCtx.lineDashOffset = dashOffset;
            lassoCtx.stroke();

            lassoCtx.strokeStyle = '#2563eb';
            lassoCtx.setLineDash([8, 4]);
            lassoCtx.lineDashOffset = dashOffset + 8;
            lassoCtx.stroke();
            lassoCtx.setLineDash([]);

            // Animate
            cancelAnimationFrame(animFrame);
            if (!closed) {
                animFrame = requestAnimationFrame(() => { dashOffset -= 0.5; drawLassoPath(false); });
            }

            // Points markers
            lassoPoints.forEach((p, i) => {
                lassoCtx.beginPath();
                lassoCtx.arc(p.x, p.y, i === 0 ? 6 : 3, 0, Math.PI * 2);
                lassoCtx.fillStyle = i === 0 ? '#f59e0b' : '#2563eb';
                lassoCtx.fill();
            });
        }

        function showLassoActions() {
            bgLassoActions.style.display = 'flex';
            bgLassoHint.textContent = '✅ সিলেকশন সম্পন্ন। নিচের বোতাম থেকে অ্যাকশন বেছে নিন।';
            // Animate the final closed path
            (function animate() {
                dashOffset -= 0.5;
                drawLassoPath(true);
                animFrame = requestAnimationFrame(animate);
            })();
        }

        bgRemoveOutside.addEventListener('click', () => applyLassoMask(false)); // keep inside
        bgRemoveInside.addEventListener('click',  () => applyLassoMask(true));  // keep outside

        function applyLassoMask(removeInside) {
            cancelAnimationFrame(animFrame);
            if (lassoPoints.length < 3) { showToast('আঁকা সম্পন্ন হয়নি', 'error'); return; }

            // Work on full resolution
            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            canvas.width  = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(originalImage, 0, 0);

            // Scale lasso points from overlay canvas → full image
            const scaleX = w / bgLassoCanvas.width;
            const scaleY = h / bgLassoCanvas.height;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(lassoPoints[0].x * scaleX, lassoPoints[0].y * scaleY);
            lassoPoints.forEach(p => ctx.lineTo(p.x * scaleX, p.y * scaleY));
            ctx.closePath();

            if (removeInside) {
                // Remove inside: keep area outside the path
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.fill();
            } else {
                // Remove outside: clip to path
                ctx.clip();
                // Re-draw in a temporary canvas then composite
                const tmp = document.createElement('canvas');
                tmp.width = w; tmp.height = h;
                const tmpCtx = tmp.getContext('2d');
                tmpCtx.drawImage(originalImage, 0, 0);

                ctx.restore();
                ctx.clearRect(0, 0, w, h);
                // Draw clipped version
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(lassoPoints[0].x * scaleX, lassoPoints[0].y * scaleY);
                lassoPoints.forEach(p => ctx.lineTo(p.x * scaleX, p.y * scaleY));
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(tmp, 0, 0);
            }
            ctx.restore();

            canvas.toBlob(blob => {
                processedBlob = blob;
                const url = URL.createObjectURL(blob);
                originalImage = new Image();
                originalImage.src = url;
                previewImage.src = url;
                bgLassoCanvas.style.display = 'none';
                bgLassoActions.style.display = 'none';
                bgStartLassoBtn.style.display = '';
                lassoPoints = [];
                downloadSection.style.display = 'block';
                downloadBtn.setAttribute('data-ext', 'png');
                pushHistory(blob, 'লাসো সিলেকশন রিমুভ');
                showToast('✅ লাসো রিমুভ সম্পন্ন! PNG ডাউনলোড করুন।', 'success');
            }, 'image/png');
        }

        bgCancelLasso.addEventListener('click', () => {
            cancelAnimationFrame(animFrame);
            lassoPoints = [];
            lassoCtx.clearRect(0, 0, bgLassoCanvas.width, bgLassoCanvas.height);
            bgLassoCanvas.style.display = 'none';
            bgLassoActions.style.display = 'none';
            bgStartLassoBtn.style.display = '';
            bgLassoHint.textContent = 'প্রথমে নিচের বোতামে ক্লিক করুন, তারপর ছবির উপর আঁকুন।';
        });

        // ──────────────────────────────────────────
        // METHOD 4: Clone Stamp Tool
        // ──────────────────────────────────────────
        // Design: bgCloneCanvas sits directly over previewImage (same
        // wrapper, same box via getImageDisplayRect() — reusing the exact
        // helper the lasso overlay uses). Unlike the lasso overlay though,
        // its DRAWING BUFFER is the image's full resolution, not the
        // on-screen display size — so cloned pixels stay full quality and
        // window/zoom/float changes never need to touch the buffer, only
        // the CSS box (see syncCloneCanvasBox()).
        //
        // Alt/Option + click sets the source point. The offset between
        // source and destination locks the moment painting starts (the
        // first non-Alt mousedown) and stays fixed across the whole
        // session ("aligned" mode, Photoshop's default) until the user
        // resets it or Alt-clicks a new source.

        const cloneCtx = bgCloneCanvas.getContext('2d');
        let cloneSourcePoint = null;   // {x,y} in full-res image pixels
        let cloneOffset = null;        // {dx,dy} locked once painting starts
        let isPainting = false;
        let lastPaintPoint = null;

        // Touch-device source selection: Alt+click has no touch equivalent,
        // so a long-press on the canvas sets the source point instead. A
        // touchstart starts this timer rather than painting immediately;
        // if the finger holds still past CLONE_LONG_PRESS_MS it's a
        // source-pick, if it moves past the tolerance first it's the start
        // of a normal paint drag, and if it lifts before either happens
        // it's a quick tap-to-stamp (mirrors a plain desktop click).
        const CLONE_LONG_PRESS_MS = 550;
        const CLONE_LONG_PRESS_MOVE_TOLERANCE = 12; // client px
        let cloneTouchTimer = null;
        let cloneTouchStartClient = null;  // {x,y} in client coords
        let cloneTouchLongPressFired = false;

        // Cached brush + patch canvases so every stamp doesn't allocate new
        // ones — only rebuilt when the brush size/hardness actually change.
        const cloneBrushCanvas = document.createElement('canvas');
        const cloneBrushCtx    = cloneBrushCanvas.getContext('2d');
        const clonePatchCanvas = document.createElement('canvas');
        const clonePatchCtx    = clonePatchCanvas.getContext('2d');
        let lastBrushRadius = -1, lastBrushHardness = -1;

        cloneBrushSize.addEventListener('input', () => cloneBrushSizeVal.textContent = cloneBrushSize.value);
        cloneHardness.addEventListener('input',  () => cloneHardnessVal.textContent  = cloneHardness.value);

        cloneStartBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            startCloneSession();
        });

        function startCloneSession() {
            isCloneActive = true;
            cloneSourcePoint = null;
            cloneOffset = null;
            isPainting = false;
            lastPaintPoint = null;
            cloneTouchTimer = null;
            cloneTouchStartClient = null;
            cloneTouchLongPressFired = false;

            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            bgCloneCanvas.width  = w;
            bgCloneCanvas.height = h;
            cloneCtx.clearRect(0, 0, w, h);
            cloneCtx.drawImage(originalImage, 0, 0, w, h);

            syncCloneCanvasBox();
            bgCloneCanvas.style.display = 'block';
            previewImage.style.visibility = 'hidden'; // canvas overlays the exact same box
            cloneActionBtns.style.display = 'flex';
            cloneStartBtn.style.display = 'none';
            updateCloneStatus();

            bgCloneCanvas.addEventListener('mousedown', onCloneMouseDown);
            bgCloneCanvas.addEventListener('mousemove', onCloneMouseMove);
            document.addEventListener('mouseup', onCloneMouseUp);
            bgCloneCanvas.addEventListener('touchstart',  onCloneTouchStart,  { passive: false });
            bgCloneCanvas.addEventListener('touchmove',   onCloneTouchMove,   { passive: false });
            bgCloneCanvas.addEventListener('touchend',    onCloneTouchEnd,    { passive: false });
            bgCloneCanvas.addEventListener('touchcancel', onCloneTouchCancel, { passive: false });
            document.addEventListener('touchend', onCloneMouseUp);
        }

        function endCloneSession(apply) {
            if (!isCloneActive) return;
            bgCloneCanvas.removeEventListener('mousedown', onCloneMouseDown);
            bgCloneCanvas.removeEventListener('mousemove', onCloneMouseMove);
            document.removeEventListener('mouseup', onCloneMouseUp);
            bgCloneCanvas.removeEventListener('touchstart',  onCloneTouchStart);
            bgCloneCanvas.removeEventListener('touchmove',   onCloneTouchMove);
            bgCloneCanvas.removeEventListener('touchend',    onCloneTouchEnd);
            bgCloneCanvas.removeEventListener('touchcancel', onCloneTouchCancel);
            document.removeEventListener('touchend', onCloneMouseUp);
            cancelCloneLongPress();

            if (apply) {
                bgCloneCanvas.toBlob(blob => {
                    processedBlob = blob;
                    const url = URL.createObjectURL(blob);
                    originalImage = new Image();
                    originalImage.src = url;
                    previewImage.src = url;
                    downloadSection.style.display = 'block';
                    downloadBtn.setAttribute('data-ext', 'png');
                    pushHistory(blob, 'ক্লোন স্ট্যাম্প');
                    showToast('✅ ক্লোন স্ট্যাম্প প্রয়োগ হয়েছে! PNG হিসেবে ডাউনলোড করুন।', 'success');
                }, 'image/png');
            }

            isCloneActive = false;
            isPainting = false;
            lastPaintPoint = null;
            cloneSourcePoint = null;
            cloneOffset = null;
            bgCloneCanvas.style.display = 'none';
            previewImage.style.visibility = '';
            cloneActionBtns.style.display = 'none';
            cloneStartBtn.style.display = '';
            cloneStatus.textContent = '';
            cloneHint.textContent = 'প্রথমে নিচের বোতামে ক্লিক করুন, তারপর ছবিতে Alt/Option + ক্লিক করে সোর্স বাছাই করুন।';
        }

        cloneApplyBtn.addEventListener('click', () => endCloneSession(true));
        cloneCancelBtn.addEventListener('click', () => endCloneSession(false));
        cloneResetSourceBtn.addEventListener('click', () => {
            if (!isCloneActive) return;
            cloneSourcePoint = null;
            cloneOffset = null;
            updateCloneStatus();
            showToast('সোর্স রিসেট হয়েছে — Alt/Option + ক্লিক করে নতুন সোর্স বাছাই করুন', '');
        });

        function updateCloneStatus() {
            if (!cloneSourcePoint) {
                cloneStatus.textContent = '⚪ সোর্স নেই — Alt/Option + ক্লিক (টাচে চেপে ধরুন) করে সোর্স বাছাই করুন';
            } else if (!cloneOffset) {
                cloneStatus.textContent = `🟢 সোর্স সেট হয়েছে (${cloneSourcePoint.x}, ${cloneSourcePoint.y}) — এখন ব্রাশ দিয়ে টানুন`;
            } else {
                cloneStatus.textContent = '🖌️ ক্লোনিং চলছে — নতুন সোর্সের জন্য আবার Alt+ক্লিক করুন অথবা রিসেট করুন';
            }
        }

        // CSS box only — reuses the same "match the image's rendered box"
        // logic as the lasso overlay (getImageDisplayRect(), defined above).
        function syncCloneCanvasBox() {
            const rect = getImageDisplayRect();
            bgCloneCanvas.style.left   = rect.left + 'px';
            bgCloneCanvas.style.top    = rect.top + 'px';
            bgCloneCanvas.style.width  = Math.max(1, Math.round(rect.width))  + 'px';
            bgCloneCanvas.style.height = Math.max(1, Math.round(rect.height)) + 'px';
        }

        // Client (viewport) point → full-res pixel coordinate on bgCloneCanvas,
        // same ratio-based mapping style as clientPointToPixel() above.
        function clonePointFromClient(clientX, clientY) {
            const rect = bgCloneCanvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;
            let xRatio = (clientX - rect.left) / rect.width;
            let yRatio = (clientY - rect.top)  / rect.height;
            xRatio = Math.min(1, Math.max(0, xRatio));
            yRatio = Math.min(1, Math.max(0, yRatio));
            const x = Math.min(bgCloneCanvas.width  - 1, Math.floor(xRatio * bgCloneCanvas.width));
            const y = Math.min(bgCloneCanvas.height - 1, Math.floor(yRatio * bgCloneCanvas.height));
            return { x, y };
        }

        function onCloneMouseDown(e) {
            if (!isCloneActive) return;
            const pt = clonePointFromClient(e.clientX, e.clientY);
            if (!pt) return;

            if (e.altKey) {
                cloneSourcePoint = pt;
                cloneOffset = null; // a new source re-locks the offset on the next stroke
                updateCloneStatus();
                return;
            }

            if (!cloneSourcePoint) {
                showToast('আগে সোর্স বাছাই করুন — Alt/Option + ক্লিক (টাচে চেপে ধরুন)', 'error');
                return;
            }

            if (!cloneOffset) {
                cloneOffset = { dx: cloneSourcePoint.x - pt.x, dy: cloneSourcePoint.y - pt.y };
            }

            isPainting = true;
            lastPaintPoint = pt;
            stampAt(pt.x, pt.y);
            updateCloneStatus();
        }

        function onCloneMouseMove(e) {
            if (!isCloneActive || !isPainting || !cloneOffset) return;
            const pt = clonePointFromClient(e.clientX, e.clientY);
            if (!pt) return;
            strokeTo(pt);
        }

        function onCloneMouseUp() {
            isPainting = false;
            lastPaintPoint = null;
        }

        // ── Touch long-press source selection ──────────────────────────
        // touchstart never paints/sets-source immediately (unlike
        // mousedown) — it starts a timer and shows the progress ring.
        // What happens next depends on what the finger does before the
        // timer fires: see onCloneTouchMove/onCloneTouchEnd below.
        function onCloneTouchStart(e) {
            e.preventDefault();
            if (!isCloneActive) return;
            const touch = e.touches[0];
            cloneTouchStartClient = { x: touch.clientX, y: touch.clientY };
            cloneTouchLongPressFired = false;

            showCloneLongPressRing(touch.clientX, touch.clientY);

            cloneTouchTimer = setTimeout(() => {
                cloneTouchTimer = null;
                cloneTouchLongPressFired = true;
                hideCloneLongPressRing(true);

                const pt = clonePointFromClient(touch.clientX, touch.clientY);
                if (!pt) return;
                cloneSourcePoint = pt;
                cloneOffset = null; // a new source re-locks the offset on the next stroke
                updateCloneStatus();
                if (navigator.vibrate) navigator.vibrate(20);
                showToast('🎯 সোর্স সেট হয়েছে — এখন আঙুল দিয়ে টেনে ক্লোন করুন', 'success');
            }, CLONE_LONG_PRESS_MS);
        }

        function onCloneTouchMove(e) {
            e.preventDefault();
            if (!isCloneActive) return;
            const touch = e.touches[0];

            // Still deciding tap vs long-press vs drag: if the finger has
            // moved past the tolerance, this is a paint drag, not a
            // long-press — cancel the timer/ring and start painting from
            // right here (mirrors a desktop mousedown at this point).
            if (cloneTouchTimer) {
                const dx = touch.clientX - cloneTouchStartClient.x;
                const dy = touch.clientY - cloneTouchStartClient.y;
                if (Math.sqrt(dx * dx + dy * dy) > CLONE_LONG_PRESS_MOVE_TOLERANCE) {
                    clearTimeout(cloneTouchTimer);
                    cloneTouchTimer = null;
                    hideCloneLongPressRing(false);
                    onCloneMouseDown(touch);
                }
                return;
            }

            // This touch already fired a long-press (source was just set
            // by this same finger) — ignore the rest of the gesture so it
            // doesn't also start painting.
            if (cloneTouchLongPressFired) return;

            onCloneMouseMove(touch);
        }

        function onCloneTouchEnd(e) {
            e.preventDefault();
            if (cloneTouchTimer) {
                // Finger lifted before the long-press fired and before it
                // moved past the tolerance — treat it as a quick tap, same
                // as a plain desktop click-and-release.
                clearTimeout(cloneTouchTimer);
                cloneTouchTimer = null;
                hideCloneLongPressRing(false);
                const touch = e.changedTouches[0];
                onCloneMouseDown(touch);
            }
            cloneTouchLongPressFired = false;
            onCloneMouseUp();
        }

        function onCloneTouchCancel(e) {
            if (cloneTouchTimer) {
                clearTimeout(cloneTouchTimer);
                cloneTouchTimer = null;
            }
            hideCloneLongPressRing(false);
            cloneTouchLongPressFired = false;
            onCloneMouseUp();
        }

        function cancelCloneLongPress() {
            if (cloneTouchTimer) {
                clearTimeout(cloneTouchTimer);
                cloneTouchTimer = null;
            }
            cloneTouchLongPressFired = false;
            hideCloneLongPressRing(false);
        }

        function showCloneLongPressRing(clientX, clientY) {
            const ringFill = cloneLongPressRing.querySelector('.ring-fill');
            cloneLongPressRing.style.left = clientX + 'px';
            cloneLongPressRing.style.top  = clientY + 'px';
            cloneLongPressRing.classList.remove('filling', 'fired');
            cloneLongPressRing.style.display = 'block';
            // Force a reflow so the dashoffset transition restarts cleanly
            // on every new press instead of animating from wherever the
            // previous press left off.
            void cloneLongPressRing.offsetWidth;
            ringFill.style.transitionDuration = CLONE_LONG_PRESS_MS + 'ms';
            cloneLongPressRing.classList.add('filling');
        }

        function hideCloneLongPressRing(fired) {
            if (fired) {
                cloneLongPressRing.classList.add('fired');
                setTimeout(() => { cloneLongPressRing.style.display = 'none'; }, 180);
            } else {
                cloneLongPressRing.style.display = 'none';
            }
            cloneLongPressRing.classList.remove('filling');
        }

        // Soft radial brush shape (hardness 100 = solid disc, 0 = fully
        // feathered from centre to edge), cached until size/hardness change.
        function rebuildBrush(radius, hardnessPct) {
            if (radius === lastBrushRadius && hardnessPct === lastBrushHardness) return;
            lastBrushRadius = radius;
            lastBrushHardness = hardnessPct;

            const size = Math.max(2, Math.round(radius * 2));
            cloneBrushCanvas.width  = clonePatchCanvas.width  = size;
            cloneBrushCanvas.height = clonePatchCanvas.height = size;
            cloneBrushCtx.clearRect(0, 0, size, size);

            const cx = size / 2, cy = size / 2;
            const inner = Math.max(0, (hardnessPct / 100) * radius);
            const grad = cloneBrushCtx.createRadialGradient(cx, cy, inner, cx, cy, radius);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            cloneBrushCtx.fillStyle = grad;
            cloneBrushCtx.beginPath();
            cloneBrushCtx.arc(cx, cy, radius, 0, Math.PI * 2);
            cloneBrushCtx.fill();
        }

        // Copy a brush-shaped patch of pixels from (destX+offset) to (destX),
        // masked by the soft brush shape so edges blend instead of hard-cutting.
        function stampAt(destX, destY) {
            const radius = parseInt(cloneBrushSize.value, 10) / 2;
            rebuildBrush(radius, parseInt(cloneHardness.value, 10));

            const srcX = destX + cloneOffset.dx;
            const srcY = destY + cloneOffset.dy;
            if (srcX < 0 || srcY < 0 || srcX >= bgCloneCanvas.width || srcY >= bgCloneCanvas.height) return;

            const size = cloneBrushCanvas.width;
            clonePatchCtx.clearRect(0, 0, size, size);
            clonePatchCtx.globalCompositeOperation = 'source-over';
            clonePatchCtx.drawImage(bgCloneCanvas, srcX - size / 2, srcY - size / 2, size, size, 0, 0, size, size);
            clonePatchCtx.globalCompositeOperation = 'destination-in';
            clonePatchCtx.drawImage(cloneBrushCanvas, 0, 0);

            cloneCtx.drawImage(clonePatchCanvas, destX - size / 2, destY - size / 2);
        }

        // Interpolate along the drag path so fast mouse movement doesn't
        // leave gaps between individual brush stamps.
        function strokeTo(pt) {
            const radius = parseInt(cloneBrushSize.value, 10) / 2;
            const spacing = Math.max(2, radius / 4);
            const from = lastPaintPoint || pt;
            const dx = pt.x - from.x, dy = pt.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(1, Math.floor(dist / spacing));
            for (let i = 1; i <= steps; i++) {
                const ix = from.x + (dx * i) / steps;
                const iy = from.y + (dy * i) / steps;
                stampAt(Math.round(ix), Math.round(iy));
            }
            lastPaintPoint = pt;
        }

        // ──────────────────────────────────────────
        // METHOD 5: Paint Bucket / Flood Fill
        // ──────────────────────────────────────────
        // Design: click-to-activate, same activate/deactivate pattern as
        // Method 2's eyedropper (reuses its ensurePickCanvas() /
        // clientPointToPixel() helpers directly — no new coordinate-mapping
        // code needed here).
        //
        // floodFillMask() is a pure function of a flat RGBA array + width/
        // height — no canvas/DOM inside it — so it can be lifted out and
        // unit-tested in plain Node the same way Method 4's offset-lock/
        // interpolation math was (see README "What's tested").
        //
        // Two modes via the "শুধু সংযুক্ত এলাকা" checkbox:
        //  - Contiguous (default, real paint-bucket behaviour): iterative
        //    stack-based flood fill outward from the clicked pixel — only
        //    the connected region of similar colour gets painted.
        //  - Non-contiguous: the same threshold test applied to every pixel
        //    in the image regardless of position — this is removeByColor()'s
        //    scan, painting a colour in instead of zeroing alpha out (the
        //    plan's "reverse version of removeByColor()").

        function floodFillMask(data, w, h, startX, startY, threshold, contiguous) {
            const total = w * h;
            const mask = new Uint8Array(total);
            const startIdx = startY * w + startX;
            const tr = data[startIdx * 4];
            const tg = data[startIdx * 4 + 1];
            const tb = data[startIdx * 4 + 2];

            if (!contiguous) {
                for (let i = 0; i < total; i++) {
                    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
                    if (colorDistance(r, g, b, tr, tg, tb) <= threshold) mask[i] = 1;
                }
                return mask;
            }

            // Iterative (not recursive) stack-based flood fill — avoids
            // call-stack overflow on large images that recursion would hit.
            const visited = new Uint8Array(total);
            const stack = [startIdx];
            visited[startIdx] = 1;
            while (stack.length) {
                const idx = stack.pop();
                const r = data[idx * 4], g = data[idx * 4 + 1], b = data[idx * 4 + 2];
                if (colorDistance(r, g, b, tr, tg, tb) > threshold) continue;
                mask[idx] = 1;
                const x = idx % w;
                const y = (idx - x) / w;
                if (x > 0)     { const n = idx - 1; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
                if (x < w - 1) { const n = idx + 1; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
                if (y > 0)     { const n = idx - w; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
                if (y < h - 1) { const n = idx + w; if (!visited[n]) { visited[n] = 1; stack.push(n); } }
            }
            return mask;
        }

        function paintBucketFill(px, py) {
            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            canvas.width  = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(originalImage, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const threshold  = (parseInt(paintTolerance.value, 10) / 100) * 441.67;
            const contiguous = paintContiguous.checked;
            const mask = floodFillMask(data, w, h, px, py, threshold, contiguous);
            const fill = hexToRgb(paintFillColor.value);

            let filledCount = 0;
            for (let i = 0; i < w * h; i++) {
                if (mask[i]) {
                    data[i * 4]     = fill.r;
                    data[i * 4 + 1] = fill.g;
                    data[i * 4 + 2] = fill.b;
                    data[i * 4 + 3] = 255;
                    filledCount++;
                }
            }

            if (filledCount === 0) {
                showToast('কোনো পিক্সেল ভরাট হয়নি — টলারেন্স বাড়িয়ে দেখুন', 'error');
                return;
            }

            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(blob => {
                processedBlob = blob;
                const url = URL.createObjectURL(blob);
                originalImage = new Image();
                originalImage.src = url;
                previewImage.src = url;
                downloadSection.style.display = 'block';
                downloadBtn.setAttribute('data-ext', 'png');
                pushHistory(blob, 'Paint Bucket Fill');
                showToast('✅ পেইন্ট বাকেট প্রয়োগ হয়েছে! PNG হিসেবে ডাউনলোড করুন।', 'success');
            }, 'image/png');
        }

        paintTolerance.addEventListener('input', () => paintToleranceVal.textContent = paintTolerance.value);

        function activatePaintBucket() {
            ensurePickCanvas();
            isPaintBucketActive = true;
            paintBucketBtn.classList.add('active');
            paintBucketBtn.style.outline = '2px solid var(--accent)';
            paintStatus.textContent = '👆 ছবিতে ক্লিক করুন যেখানে রঙ ঢালতে চান (আবার বোতাম চাপলে বন্ধ হবে)';
            previewImage.style.cursor = 'crosshair';
            previewImage.addEventListener('click', onPaintBucketClick);
            document.addEventListener('keydown', onPaintBucketEscape);
        }

        function deactivatePaintBucket() {
            isPaintBucketActive = false;
            paintBucketBtn.classList.remove('active');
            paintBucketBtn.style.outline = '';
            paintStatus.textContent = '';
            previewImage.style.cursor = '';
            previewImage.removeEventListener('click', onPaintBucketClick);
            document.removeEventListener('keydown', onPaintBucketEscape);
        }

        function onPaintBucketEscape(e) {
            if (e.key === 'Escape') deactivatePaintBucket();
        }

        function onPaintBucketClick(e) {
            const pt = clientPointToPixel(e.clientX, e.clientY);
            if (!pt) { showToast('ছবির উপরে ক্লিক করুন', 'error'); return; }
            paintBucketFill(pt.px, pt.py);
        }

        paintBucketBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            if (isPaintBucketActive) deactivatePaintBucket();
            else activatePaintBucket();
        });

        // ──────────────────────────────────────────
        // METHOD 6: Manual Erase/Restore Brush (Phase 6)
        // ──────────────────────────────────────────
        // Same full-res overlay-canvas architecture as Method 4 (Clone
        // Stamp): bgEraseCanvas sits over previewImage via
        // syncEraseCanvasBox() (the same getImageDisplayRect() CSS-box
        // pattern), but its drawing buffer is the image's own resolution
        // so brushed pixels stay full quality regardless of zoom/float.
        //
        // Erase mode: destination-out compositing with the same soft
        // radial brush shape Method 4 uses — punches transparent holes
        // with a feathered edge instead of a hard-edged cutout.
        // Restore mode: paints back pixels from the history entry just
        // BEFORE the current one (historyIndex - 1 at session start) —
        // i.e. "undo, but only where I brush". This is what actually
        // lets a user fix a bad AI/color-remove edge by hand: painting
        // "restore" brings back the pixels that specific edit erased,
        // without discarding every other edit made since.

        const eraseCtx = bgEraseCanvas.getContext('2d');
        let eraseMode = 'erase'; // 'erase' | 'restore'
        let eraseRestoreCanvas = null; // offscreen full-res copy of the "before" state for this session
        let isErasePainting = false;
        let lastErasePoint = null;

        const eraseBrushCanvas = document.createElement('canvas');
        const eraseBrushCtx    = eraseBrushCanvas.getContext('2d');
        let lastEraseBrushRadius = -1, lastEraseBrushHardness = -1;

        eraseBrushSize.addEventListener('input', () => eraseBrushSizeVal.textContent = eraseBrushSize.value);
        eraseHardness.addEventListener('input',  () => eraseHardnessVal.textContent  = eraseHardness.value);

        eraseModeEraseBtn.addEventListener('click', () => {
            eraseMode = 'erase';
            eraseModeEraseBtn.classList.add('active');
            eraseModeRestoreBtn.classList.remove('active');
        });
        eraseModeRestoreBtn.addEventListener('click', () => {
            if (!eraseRestoreCanvas) {
                showToast('রিস্টোরের জন্য কোনো আগের অবস্থা নেই (এটাই প্রথম এডিট)', 'error');
                return;
            }
            eraseMode = 'restore';
            eraseModeRestoreBtn.classList.add('active');
            eraseModeEraseBtn.classList.remove('active');
        });

        eraseStartBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            startEraseSession();
        });

        async function startEraseSession() {
            isEraseBrushActive = true;
            isErasePainting = false;
            lastErasePoint = null;

            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            bgEraseCanvas.width  = w;
            bgEraseCanvas.height = h;
            eraseCtx.clearRect(0, 0, w, h);
            eraseCtx.drawImage(originalImage, 0, 0, w, h);

            // Build the "restore from" snapshot: the history state right
            // before this one, scaled to the current canvas size. If this
            // is the very first edit (nothing to go "back" to), Restore
            // mode simply stays unavailable for this session.
            eraseRestoreCanvas = null;
            if (typeof historyStack !== 'undefined' && historyIndex > 0) {
                try {
                    const prevEntry = historyStack[historyIndex - 1];
                    const prevImg = await loadImageFromUrl(prevEntry.url);
                    const rc = document.createElement('canvas');
                    rc.width = w; rc.height = h;
                    rc.getContext('2d').drawImage(prevImg, 0, 0, w, h);
                    eraseRestoreCanvas = rc;
                } catch (err) {
                    eraseRestoreCanvas = null;
                }
            }

            syncEraseCanvasBox();
            bgEraseCanvas.style.display = 'block';
            previewImage.style.visibility = 'hidden';
            eraseActionBtns.style.display = 'flex';
            eraseStartBtn.style.display = 'none';
            eraseMode = 'erase';
            eraseModeEraseBtn.classList.add('active');
            eraseModeRestoreBtn.classList.remove('active');
            eraseStatus.textContent = eraseRestoreCanvas
                ? '🧽 ইরেজ মোড চালু — ব্রাশ দিয়ে টানুন। রিস্টোর মোডে আগের অবস্থা ফিরিয়ে আনা যাবে।'
                : '🧽 ইরেজ মোড চালু — ব্রাশ দিয়ে টানুন। (এটাই প্রথম এডিট বলে রিস্টোর মোড এখন অকার্যকর)';

            bgEraseCanvas.addEventListener('mousedown', onEraseMouseDown);
            bgEraseCanvas.addEventListener('mousemove', onEraseMouseMove);
            document.addEventListener('mouseup', onEraseMouseUp);
            bgEraseCanvas.addEventListener('touchstart', onEraseTouchStart, { passive: false });
            bgEraseCanvas.addEventListener('touchmove',  onEraseTouchMove,  { passive: false });
            document.addEventListener('touchend', onEraseMouseUp);
        }

        function endEraseSession(apply) {
            if (!isEraseBrushActive) return;
            bgEraseCanvas.removeEventListener('mousedown', onEraseMouseDown);
            bgEraseCanvas.removeEventListener('mousemove', onEraseMouseMove);
            document.removeEventListener('mouseup', onEraseMouseUp);
            bgEraseCanvas.removeEventListener('touchstart', onEraseTouchStart);
            bgEraseCanvas.removeEventListener('touchmove',  onEraseTouchMove);
            document.removeEventListener('touchend', onEraseMouseUp);

            if (apply) {
                bgEraseCanvas.toBlob(blob => {
                    processedBlob = blob;
                    const url = URL.createObjectURL(blob);
                    originalImage = new Image();
                    originalImage.src = url;
                    previewImage.src = url;
                    downloadSection.style.display = 'block';
                    downloadBtn.setAttribute('data-ext', 'png');
                    pushHistory(blob, 'ইরেজ/রিস্টোর ব্রাশ');
                    showToast('✅ ব্রাশ প্রয়োগ হয়েছে! PNG হিসেবে ডাউনলোড করুন।', 'success');
                }, 'image/png');
            }

            isEraseBrushActive = false;
            isErasePainting = false;
            lastErasePoint = null;
            eraseRestoreCanvas = null;
            bgEraseCanvas.style.display = 'none';
            previewImage.style.visibility = '';
            eraseActionBtns.style.display = 'none';
            eraseStartBtn.style.display = '';
            eraseStatus.textContent = '';
            eraseHint.textContent = 'প্রথমে নিচের বোতামে ক্লিক করুন, তারপর ছবিতে ব্রাশ দিয়ে টানুন।';
        }

        eraseApplyBtn.addEventListener('click', () => endEraseSession(true));
        eraseCancelBtn.addEventListener('click', () => endEraseSession(false));

        function syncEraseCanvasBox() {
            const rect = getImageDisplayRect();
            bgEraseCanvas.style.left   = rect.left + 'px';
            bgEraseCanvas.style.top    = rect.top + 'px';
            bgEraseCanvas.style.width  = Math.max(1, Math.round(rect.width))  + 'px';
            bgEraseCanvas.style.height = Math.max(1, Math.round(rect.height)) + 'px';
        }

        function erasePointFromClient(clientX, clientY) {
            const rect = bgEraseCanvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;
            let xRatio = (clientX - rect.left) / rect.width;
            let yRatio = (clientY - rect.top)  / rect.height;
            xRatio = Math.min(1, Math.max(0, xRatio));
            yRatio = Math.min(1, Math.max(0, yRatio));
            const x = Math.min(bgEraseCanvas.width  - 1, Math.floor(xRatio * bgEraseCanvas.width));
            const y = Math.min(bgEraseCanvas.height - 1, Math.floor(yRatio * bgEraseCanvas.height));
            return { x, y };
        }

        function rebuildEraseBrush(radius, hardnessPct) {
            if (radius === lastEraseBrushRadius && hardnessPct === lastEraseBrushHardness) return;
            lastEraseBrushRadius = radius;
            lastEraseBrushHardness = hardnessPct;

            const size = Math.max(2, Math.round(radius * 2));
            eraseBrushCanvas.width  = size;
            eraseBrushCanvas.height = size;
            eraseBrushCtx.clearRect(0, 0, size, size);

            const cx = size / 2, cy = size / 2;
            const inner = Math.max(0, (hardnessPct / 100) * radius);
            const grad = eraseBrushCtx.createRadialGradient(cx, cy, inner, cx, cy, radius);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            eraseBrushCtx.fillStyle = grad;
            eraseBrushCtx.beginPath();
            eraseBrushCtx.arc(cx, cy, radius, 0, Math.PI * 2);
            eraseBrushCtx.fill();
        }

        function eraseStampAt(x, y) {
            const radius = parseInt(eraseBrushSize.value, 10) / 2;
            rebuildEraseBrush(radius, parseInt(eraseHardness.value, 10));
            const size = eraseBrushCanvas.width;

            if (eraseMode === 'erase') {
                eraseCtx.globalCompositeOperation = 'destination-out';
                eraseCtx.drawImage(eraseBrushCanvas, x - size / 2, y - size / 2);
                eraseCtx.globalCompositeOperation = 'source-over';
            } else {
                if (!eraseRestoreCanvas) return;
                // Same masked-patch trick Method 4 uses: cut a brush-shaped
                // piece out of the restore-source at the SAME coordinates
                // (no offset — this isn't cloning from elsewhere, it's
                // recovering what used to be at this exact spot) and paint
                // it back with source-over so it blends softly.
                eraseBrushCtx.save();
                const patchCanvas = document.createElement('canvas');
                patchCanvas.width = size; patchCanvas.height = size;
                const patchCtx = patchCanvas.getContext('2d');
                patchCtx.drawImage(eraseRestoreCanvas, x - size / 2, y - size / 2, size, size, 0, 0, size, size);
                patchCtx.globalCompositeOperation = 'destination-in';
                patchCtx.drawImage(eraseBrushCanvas, 0, 0);
                eraseCtx.drawImage(patchCanvas, x - size / 2, y - size / 2);
                eraseBrushCtx.restore();
            }
        }

        function eraseStrokeTo(pt) {
            const radius = parseInt(eraseBrushSize.value, 10) / 2;
            const spacing = Math.max(2, radius / 4);
            const from = lastErasePoint || pt;
            const dx = pt.x - from.x, dy = pt.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.max(1, Math.floor(dist / spacing));
            for (let i = 1; i <= steps; i++) {
                eraseStampAt(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
            }
            lastErasePoint = pt;
        }

        function onEraseMouseDown(e) {
            if (!isEraseBrushActive) return;
            const pt = erasePointFromClient(e.clientX, e.clientY);
            if (!pt) return;
            isErasePainting = true;
            lastErasePoint = pt;
            eraseStampAt(pt.x, pt.y);
        }
        function onEraseMouseMove(e) {
            if (!isEraseBrushActive || !isErasePainting) return;
            const pt = erasePointFromClient(e.clientX, e.clientY);
            if (!pt) return;
            eraseStrokeTo(pt);
        }
        function onEraseMouseUp() { isErasePainting = false; lastErasePoint = null; }
        function onEraseTouchStart(e) { e.preventDefault(); onEraseMouseDown(e.touches[0]); }
        function onEraseTouchMove(e)  { e.preventDefault(); onEraseMouseMove(e.touches[0]); }

        // ──────────────────────────────────────────
        // METHOD 7: Magic Wand Selection (Phase 6)
        // ──────────────────────────────────────────
        // Click-to-activate like Method 5 (Paint Bucket) — reuses the exact
        // same ensurePickCanvas()/clientPointToPixel() coordinate mapping.
        // Also reuses floodFillMask() directly, so the "connected region of
        // similar colour" logic (and its 7 standalone unit tests) is shared
        // with Method 5 rather than re-implemented.
        //
        // Unlike Paint Bucket (which fills immediately on click), the wand
        // shows the selection first (a tinted overlay) and only acts once
        // the user picks Remove or Fill — closer to Photoshop's actual
        // magic-wand-then-act workflow.

        const wandCtx = bgWandCanvas.getContext('2d');
        let wandMask = null;   // Uint8Array, full-res
        let wandMaskW = 0, wandMaskH = 0;

        wandTolerance.addEventListener('input', () => wandToleranceVal.textContent = wandTolerance.value);

        function syncWandCanvasBox() {
            const rect = getImageDisplayRect();
            bgWandCanvas.style.left   = rect.left + 'px';
            bgWandCanvas.style.top    = rect.top + 'px';
            bgWandCanvas.style.width  = Math.max(1, Math.round(rect.width))  + 'px';
            bgWandCanvas.style.height = Math.max(1, Math.round(rect.height)) + 'px';
        }

        function activateWand() {
            isWandActive = true;
            wandBtn.classList.add('active');
            wandStatus.textContent = '👆 ছবিতে ক্লিক করুন যেখান থেকে সিলেক্ট করতে চান';
            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            bgWandCanvas.width  = w;
            bgWandCanvas.height = h;
            syncWandCanvasBox();
            bgWandCanvas.style.display = 'block';
            bgWandCanvas.style.cursor = 'crosshair';
            bgWandCanvas.addEventListener('click', onWandClick);
            document.addEventListener('keydown', onWandEscape);
        }

        function deactivateWand() {
            isWandActive = false;
            wandMask = null;
            wandBtn.classList.remove('active');
            wandStatus.textContent = '';
            wandActionBtns.style.display = 'none';
            bgWandCanvas.style.display = 'none';
            bgWandCanvas.removeEventListener('click', onWandClick);
            document.removeEventListener('keydown', onWandEscape);
            if (wandCtx) wandCtx.clearRect(0, 0, bgWandCanvas.width, bgWandCanvas.height);
        }

        function onWandEscape(e) { if (e.key === 'Escape') deactivateWand(); }

        function onWandClick(e) {
            const rect = bgWandCanvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            let xRatio = (e.clientX - rect.left) / rect.width;
            let yRatio = (e.clientY - rect.top)  / rect.height;
            xRatio = Math.min(1, Math.max(0, xRatio));
            yRatio = Math.min(1, Math.max(0, yRatio));
            const px = Math.min(bgWandCanvas.width  - 1, Math.floor(xRatio * bgWandCanvas.width));
            const py = Math.min(bgWandCanvas.height - 1, Math.floor(yRatio * bgWandCanvas.height));

            const w = bgWandCanvas.width, h = bgWandCanvas.height;
            canvas.width = w; canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(originalImage, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const threshold = (parseInt(wandTolerance.value, 10) / 100) * 441.67;
            const mask = floodFillMask(data, w, h, px, py, threshold, wandContiguous.checked);

            let selectedCount = 0;
            for (let i = 0; i < w * h; i++) if (mask[i]) selectedCount++;
            if (selectedCount === 0) {
                showToast('কোনো এলাকা সিলেক্ট হয়নি — টলারেন্স বাড়িয়ে দেখুন', 'error');
                return;
            }

            wandMask = mask;
            wandMaskW = w;
            wandMaskH = h;

            // Visual feedback: tint the selected pixels so the user can see
            // exactly what will be affected before committing to an action.
            wandCtx.clearRect(0, 0, w, h);
            const overlay = wandCtx.createImageData(w, h);
            for (let i = 0; i < w * h; i++) {
                if (mask[i]) {
                    overlay.data[i * 4]     = 56;
                    overlay.data[i * 4 + 1] = 132;
                    overlay.data[i * 4 + 2] = 255;
                    overlay.data[i * 4 + 3] = 130;
                }
            }
            wandCtx.putImageData(overlay, 0, 0);

            wandStatus.textContent = `🔵 ${selectedCount.toLocaleString()} পিক্সেল সিলেক্ট হয়েছে — এখন রিমুভ বা রঙ ভরাট করুন`;
            wandActionBtns.style.display = 'flex';
        }

        function applyWandAction(mode) {
            if (!wandMask) return;
            const w = wandMaskW, h = wandMaskH;
            canvas.width = w; canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(originalImage, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            if (mode === 'remove') {
                for (let i = 0; i < w * h; i++) {
                    if (wandMask[i]) data[i * 4 + 3] = 0;
                }
            } else {
                const fill = hexToRgb(wandFillColor.value);
                for (let i = 0; i < w * h; i++) {
                    if (wandMask[i]) {
                        data[i * 4]     = fill.r;
                        data[i * 4 + 1] = fill.g;
                        data[i * 4 + 2] = fill.b;
                        data[i * 4 + 3] = 255;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(blob => {
                processedBlob = blob;
                const url = URL.createObjectURL(blob);
                originalImage = new Image();
                originalImage.src = url;
                previewImage.src = url;
                downloadSection.style.display = 'block';
                downloadBtn.setAttribute('data-ext', 'png');
                pushHistory(blob, mode === 'remove' ? 'ম্যাজিক ওয়ান্ড → রিমুভ' : 'ম্যাজিক ওয়ান্ড → রঙ ভরাট');
                showToast(mode === 'remove'
                    ? '✅ সিলেকশন রিমুভ হয়েছে! PNG হিসেবে ডাউনলোড করুন।'
                    : '✅ সিলেকশনে রঙ ভরাট হয়েছে! PNG হিসেবে ডাউনলোড করুন।', 'success');
                deactivateWand();
            }, 'image/png');
        }

        wandRemoveBtn.addEventListener('click', () => applyWandAction('remove'));
        wandFillBtn.addEventListener('click',   () => applyWandAction('fill'));
        wandCancelBtn.addEventListener('click', () => deactivateWand());

        wandBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            if (isWandActive) deactivateWand();
            else activateWand();
        });

        // ──────────────────────────────────────────
        // Phase 6: Keyboard shortcuts
        // ──────────────────────────────────────────
        // E = eyedropper, L = lasso, C = clone stamp, B = erase brush,
        // W = magic wand, P = paint bucket — only while the BG-remove tab
        // is active, an image is loaded, and focus isn't in a text field.
        // Esc cancels whichever tool (of the ones that don't already
        // listen for Escape themselves) is currently active.
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (!originalImage) return;

            if (e.key === 'Escape') {
                if (bgLassoCanvas.style.display !== 'none') bgCancelLasso.click();
                if (isCloneActive) endCloneSession(false);
                if (isEraseBrushActive) endEraseSession(false);
                if (isWandActive) deactivateWand();
                return;
            }

            const bgTabActive = document.getElementById('tab-bgremove').classList.contains('active');
            if (!bgTabActive || e.ctrlKey || e.metaKey || e.altKey) return;

            switch (e.key.toLowerCase()) {
                case 'e': bgEyedropperBtn.click(); break;
                case 'l': if (bgLassoCanvas.style.display === 'none') bgStartLassoBtn.click(); break;
                case 'c': if (!isCloneActive) cloneStartBtn.click(); break;
                case 'b': if (!isEraseBrushActive) eraseStartBtn.click(); break;
                case 'w': wandBtn.click(); break;
                case 'p': paintBucketBtn.click(); break;
            }
        });

    })(); // end initBgRemoveModule

    // ================================================================
    // Phase 2 — Preview: bigger/flexible layout, zoom controls, and a
    // draggable + resizable floating preview window.
    // See photo-editor/PLAN_BG_Remove_Advanced.md → "Phase 2".
    // ================================================================
    (function initPreviewZoomFloatModule() {

        const previewCard        = document.getElementById('previewCard');
        const previewHeader      = document.getElementById('previewHeader');
        const previewPlaceholder = document.getElementById('previewPlaceholder');
        const previewImageWrapper = document.getElementById('previewImageWrapper');
        const previewFloatBtn    = document.getElementById('previewFloatBtn');
        const previewDockBtn     = document.getElementById('previewDockBtn');

        const zoomInBtn   = document.getElementById('zoomInBtn');
        const zoomOutBtn  = document.getElementById('zoomOutBtn');
        const zoomFitBtn  = document.getElementById('zoomFitBtn');
        const zoom100Btn  = document.getElementById('zoom100Btn');
        const zoomLevelLabel = document.getElementById('zoomLevelLabel');

        const ZOOM_MIN = 25;
        const ZOOM_MAX = 400;
        const ZOOM_STEP = 25;

        let zoomMode = 'fit';   // 'fit' | 'percent'
        let zoomPercent = 100;
        let isFloating = false;

        function notifyLayoutChange() {
            document.dispatchEvent(new CustomEvent('app:previewlayoutchange'));
        }

        // ---------- Zoom ----------
        function applyZoom() {
            if (zoomMode === 'fit' || !previewImage.naturalWidth) {
                previewImage.classList.remove('zoomed');
                previewImageWrapper.classList.remove('zoomed');
                previewImage.style.width = '';
                previewImage.style.height = '';
                zoomLevelLabel.textContent = 'ফিট';
            } else {
                const targetWidth = Math.round(previewImage.naturalWidth * (zoomPercent / 100));
                previewImage.classList.add('zoomed');
                previewImageWrapper.classList.add('zoomed');
                previewImage.style.width = targetWidth + 'px';
                previewImage.style.height = 'auto';
                zoomLevelLabel.textContent = zoomPercent + '%';
            }
            notifyLayoutChange();
        }

        zoomInBtn.addEventListener('click', () => {
            zoomPercent = Math.min(ZOOM_MAX, (zoomMode === 'percent' ? zoomPercent : 100) + ZOOM_STEP);
            zoomMode = 'percent';
            applyZoom();
        });

        zoomOutBtn.addEventListener('click', () => {
            zoomPercent = Math.max(ZOOM_MIN, (zoomMode === 'percent' ? zoomPercent : 100) - ZOOM_STEP);
            zoomMode = 'percent';
            applyZoom();
        });

        zoomFitBtn.addEventListener('click', () => {
            zoomMode = 'fit';
            applyZoom();
        });

        zoom100Btn.addEventListener('click', () => {
            zoomMode = 'percent';
            zoomPercent = 100;
            applyZoom();
        });

        // Reset to "fit" whenever a genuinely new photo is uploaded, so an
        // old zoom level from a previous image doesn't carry over and look
        // broken/oversized on the new one. Edits on the SAME image (crop,
        // bg-remove, resize preview, etc.) intentionally keep the current
        // zoom, since those just swap previewImage.src in place.
        document.addEventListener('app:newimage', () => {
            zoomMode = 'fit';
            zoomPercent = 100;
            applyZoom();
        });

        // Re-apply the current zoom whenever a new src finishes loading
        // (dimensions may differ from before, e.g. after a crop/resize).
        previewImage.addEventListener('load', () => {
            if (zoomMode === 'percent') applyZoom();
        });

        // ---------- Floating window ----------
        function setFloating(on) {
            isFloating = on;
            previewCard.classList.toggle('floating', on);
            previewFloatBtn.classList.toggle('active', on);
            previewPlaceholder.style.display = on ? 'flex' : 'none';

            if (on) {
                previewFloatBtn.title = 'প্যানেলে ফিরিয়ে আনুন';
                // First time floating: drop it near the top-right corner
                // instead of wherever the CSS defaults would put it, then
                // keep whatever position/size the user leaves it at.
                if (!previewCard.dataset.positioned) {
                    previewCard.style.top = '90px';
                    previewCard.style.left = (window.innerWidth - 420 - 24) + 'px';
                    previewCard.dataset.positioned = '1';
                }
            } else {
                previewFloatBtn.title = 'ফ্লোটিং উইন্ডো হিসেবে খুলুন';
            }
            // Layout just changed size/visibility — let dependent overlays
            // (lasso canvas) resync, and let the resize-observer below
            // pick up the card's new box on the next frame.
            requestAnimationFrame(notifyLayoutChange);
        }

        previewFloatBtn.addEventListener('click', () => setFloating(!isFloating));
        previewDockBtn.addEventListener('click', () => setFloating(false));

        // Dragging: only active while floating, and only when grabbing the
        // header (not the buttons inside it).
        let dragOffsetX = 0, dragOffsetY = 0, isDragging = false;

        function startDrag(clientX, clientY) {
            if (!isFloating) return;
            isDragging = true;
            const rect = previewCard.getBoundingClientRect();
            dragOffsetX = clientX - rect.left;
            dragOffsetY = clientY - rect.top;
            previewCard.classList.add('dragging');
        }

        function moveDrag(clientX, clientY) {
            if (!isDragging) return;
            const rect = previewCard.getBoundingClientRect();
            let left = clientX - dragOffsetX;
            let top = clientY - dragOffsetY;
            // Keep the header grabbable within the viewport at all times.
            left = Math.min(Math.max(left, -rect.width + 80), window.innerWidth - 80);
            top = Math.min(Math.max(top, 0), window.innerHeight - 40);
            previewCard.style.left = left + 'px';
            previewCard.style.top = top + 'px';
            previewCard.style.right = 'auto';
            notifyLayoutChange();
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            previewCard.classList.remove('dragging');
        }

        previewHeader.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return; // don't drag when clicking header buttons
            startDrag(e.clientX, e.clientY);
        });
        document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup', endDrag);

        previewHeader.addEventListener('touchstart', (e) => {
            if (e.target.closest('button')) return;
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            moveDrag(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', endDrag);

        // Resizing uses the browser's native `resize: both` handle (see
        // .preview-card.floating in style.css) — simplest, accessible, and
        // consistent with how the user already resizes native windows.
        // We just need to know when it happens so the lasso overlay stays
        // in sync while the user drags the corner.
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                if (isFloating) notifyLayoutChange();
            });
            ro.observe(previewCard);
        }

        // Keep the floating panel from being stranded off-screen if the
        // browser window is resized.
        window.addEventListener('resize', () => {
            if (!isFloating) return;
            const rect = previewCard.getBoundingClientRect();
            let left = Math.min(rect.left, window.innerWidth - 80);
            let top = Math.min(rect.top, window.innerHeight - 40);
            previewCard.style.left = Math.max(left, -rect.width + 80) + 'px';
            previewCard.style.top = Math.max(top, 0) + 'px';
            notifyLayoutChange();
        });

    })(); // end initPreviewZoomFloatModule

    // ================================================================
    // Phase 6 — Before/After comparison slider.
    // See photo-editor/PLAN_BG_Remove_Advanced.md → "Phase 6".
    // ================================================================
    // Design: baBeforeImg is an absolutely-positioned <img> laid directly
    // over previewImage inside the same wrapper, using the exact same
    // sizing rule (width/height:100% + object-fit:contain — see CSS) that
    // previewImage itself uses via its max-width/max-height + flex-center
    // rules. Because object-fit:contain always centers same-content at the
    // same scale within its box regardless of *how* that box was sized,
    // the two images land in the same rendered rectangle without any of
    // the getImageDisplayRect() pixel-math the lasso/clone/erase/wand
    // canvases need — this overlay is a plain <img>, not a canvas, so no
    // JS box-syncing is required at all, only the divider's 0–100% split.
    (function initBeforeAfterModule() {

        const baOverlay   = document.getElementById('baOverlay');
        const baBeforeImg = document.getElementById('baBeforeImg');
        const baDivider   = document.getElementById('baDivider');

        let isComparing = false;
        let isDraggingDivider = false;

        function setDividerPercent(pct) {
            pct = Math.min(100, Math.max(0, pct));
            baBeforeImg.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
            baDivider.style.left = pct + '%';
        }

        // Expose a helper to load any generated blob (e.g. from Collage) directly into the main editor workspace
        window.setEditorImageFromBlob = function (blob, fileName, label = 'কোলাজ তৈরি করা হয়েছে') {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function () {
                originalImage = img;
                originalWidth = img.naturalWidth;
                originalHeight = img.naturalHeight;
                aspectRatio = originalWidth / originalHeight;
                if (previewImage) previewImage.src = url;
                processedBlob = blob;

                if (infoName) infoName.textContent = fileName || 'collage.png';
                if (infoSize) infoSize.textContent = formatBytes(blob.size);
                if (infoDimension) infoDimension.textContent = `${originalWidth} × ${originalHeight}`;
                if (infoType) infoType.textContent = 'PNG';
                if (currentPixels) currentPixels.textContent = formatPixels(originalWidth * originalHeight);
                if (targetWidth) targetWidth.value = originalWidth;
                if (targetHeight) targetHeight.value = originalHeight;

                if (downloadSection) downloadSection.style.display = 'inline-flex';
                pushHistory(blob, label);
                document.dispatchEvent(new CustomEvent('app:historyrestored'));
                updatePreview(blob);
            };
            img.src = url;
        };

        function enterCompare() {
            if (typeof historyStack === 'undefined' || historyStack.length === 0) {
                showToast('তুলনা করার মতো কোনো ইতিহাস নেই', 'error');
                return;
            }
            baBeforeImg.src = historyStack[0].url; // always the original upload
            isComparing = true;
            compareBtn.classList.add('active');
            baOverlay.style.display = 'block';
            setDividerPercent(50);
        }

        function exitCompare() {
            isComparing = false;
            compareBtn.classList.remove('active');
            baOverlay.style.display = 'none';
        }

        compareBtn.addEventListener('click', () => {
            if (isComparing) exitCompare();
            else enterCompare();
        });

        // If a brand-new photo is uploaded, or an undo/redo just fired,
        // close any open comparison rather than show a stale/mismatched
        // "before" image — the user can re-open it with the fresh state.
        document.addEventListener('app:newimage', () => { if (isComparing) exitCompare(); });
        document.addEventListener('app:historyrestored', () => { if (isComparing) exitCompare(); });

        function percentFromClientX(clientX) {
            const rect = baOverlay.getBoundingClientRect();
            if (rect.width === 0) return 50;
            return ((clientX - rect.left) / rect.width) * 100;
        }

        function onDividerDown(e) {
            isDraggingDivider = true;
            e.preventDefault();
        }
        function onDividerMove(clientX) {
            if (!isDraggingDivider) return;
            setDividerPercent(percentFromClientX(clientX));
        }
        function onDividerUp() { isDraggingDivider = false; }

        baDivider.addEventListener('mousedown', onDividerDown);
        document.addEventListener('mousemove', (e) => onDividerMove(e.clientX));
        document.addEventListener('mouseup', onDividerUp);

        baDivider.addEventListener('touchstart', (e) => { isDraggingDivider = true; }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!isDraggingDivider) return;
            onDividerMove(e.touches[0].clientX);
        }, { passive: true });
        document.addEventListener('touchend', onDividerUp);

    })(); // end initBeforeAfterModule

    // ============================================
    // Phase 7: Rotate / Flip
    // ============================================
    // normalizeAngle()/getRotatedDimensions() are PURE functions (no
    // canvas/DOM), unit-testable standalone in plain Node.
    function normalizeAngle(deg) {
        return ((deg % 360) + 360) % 360;
    }

    function getRotatedDimensions(width, height, angleDeg) {
        const angle = normalizeAngle(angleDeg);
        if (angle === 90 || angle === 270) {
            return { width: height, height: width };
        }
        return { width, height };
    }

    (function initRotateFlipModule() {
        const rotateLeftBtn = document.getElementById('rotateLeftBtn');
        const rotateRightBtn = document.getElementById('rotateRightBtn');
        const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
        const flipVerticalBtn = document.getElementById('flipVerticalBtn');
        if (!rotateLeftBtn || !rotateRightBtn || !flipHorizontalBtn || !flipVerticalBtn) return;

        const allBtns = [rotateLeftBtn, rotateRightBtn, flipHorizontalBtn, flipVerticalBtn];

        // Draws the transformed image into the main canvas, converts it to
        // a blob, and — same "keep originalImage in sync with the new
        // pixels" fix the BG-remove module needed — reloads that blob into
        // a fresh Image so every tool that reads originalImage/Width/Height
        // afterwards (crop, dimension, another rotate, ...) sees the
        // transformed result instead of stale pre-transform pixels.
        function finalizeTransform(label) {
            allBtns.forEach(b => b.classList.add('loading'));

            canvas.toBlob(blob => {
                if (!blob) {
                    allBtns.forEach(b => b.classList.remove('loading'));
                    showToast('❌ প্রয়োগ করা যায়নি', 'error');
                    return;
                }

                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    originalImage = img;
                    originalWidth = img.naturalWidth;
                    originalHeight = img.naturalHeight;
                    aspectRatio = originalWidth / originalHeight;

                    // Refresh the other tabs' cached-dimension UI so a
                    // subsequent crop/dimension edit starts from the new
                    // (possibly width/height-swapped) size, not the old one.
                    infoDimension.textContent = `${originalWidth} × ${originalHeight}`;
                    currentPixels.textContent = formatPixels(originalWidth * originalHeight);
                    targetWidth.value = originalWidth;
                    targetHeight.value = originalHeight;
                    cropX.value = 0;
                    cropY.value = 0;
                    cropWidth.value = originalWidth;
                    cropHeight.value = originalHeight;
                    drawCropPreview();

                    processedBlob = blob;
                    downloadSection.style.display = 'block';
                    updatePreview(blob);
                    pushHistory(blob, label);
                    document.dispatchEvent(new CustomEvent('app:historyrestored'));

                    allBtns.forEach(b => b.classList.remove('loading'));
                    showToast(`✅ ${label} সম্পন্ন হয়েছে!`, 'success');
                };
                img.onerror = () => {
                    allBtns.forEach(b => b.classList.remove('loading'));
                    showToast('❌ প্রয়োগ করা যায়নি', 'error');
                };
                img.src = url;
            }, 'image/png');
        }

        function applyRotate(deltaDeg, label) {
            if (!originalImage) return;
            setTimeout(() => {
                const { width: newW, height: newH } = getRotatedDimensions(originalWidth, originalHeight, deltaDeg);
                canvas.width = newW;
                canvas.height = newH;
                ctx.save();
                ctx.translate(newW / 2, newH / 2);
                ctx.rotate(deltaDeg * Math.PI / 180); // canvas rotate() is clockwise for positive angles
                ctx.drawImage(originalImage, -originalWidth / 2, -originalHeight / 2);
                ctx.restore();
                finalizeTransform(label);
            }, 100);
        }

        function applyFlip(axis, label) {
            if (!originalImage) return;
            setTimeout(() => {
                canvas.width = originalWidth;
                canvas.height = originalHeight;
                ctx.save();
                if (axis === 'horizontal') {
                    ctx.translate(originalWidth, 0);
                    ctx.scale(-1, 1);
                } else {
                    ctx.translate(0, originalHeight);
                    ctx.scale(1, -1);
                }
                ctx.drawImage(originalImage, 0, 0);
                ctx.restore();
                finalizeTransform(label);
            }, 100);
        }

        rotateLeftBtn.addEventListener('click', () => applyRotate(-90, 'রোটেট ৯০° বামে'));
        rotateRightBtn.addEventListener('click', () => applyRotate(90, 'রোটেট ৯০° ডানে'));
        flipHorizontalBtn.addEventListener('click', () => applyFlip('horizontal', 'হরাইজন্টাল ফ্লিপ'));
        flipVerticalBtn.addEventListener('click', () => applyFlip('vertical', 'ভার্টিক্যাল ফ্লিপ'));
    })(); // end initRotateFlipModule

    // ============================================
    // Phase 9: Text / Logo Watermark
    // ============================================
    (function initWatermarkModule() {
        const wmTextEnabled = document.getElementById('wmTextEnabled');
        const wmTextFields = document.getElementById('wmTextFields');
        const wmText = document.getElementById('wmText');
        const wmFontSize = document.getElementById('wmFontSize');
        const wmFontSizeValue = document.getElementById('wmFontSizeValue');
        const wmFontFamily = document.getElementById('wmFontFamily');
        const wmTextColor = document.getElementById('wmTextColor');
        const wmTextOpacity = document.getElementById('wmTextOpacity');
        const wmTextOpacityValue = document.getElementById('wmTextOpacityValue');
        const wmTextPositionGrid = document.getElementById('wmTextPositionGrid');

        const wmLogoEnabled = document.getElementById('wmLogoEnabled');
        const wmLogoFields = document.getElementById('wmLogoFields');
        const wmLogoFile = document.getElementById('wmLogoFile');
        const wmLogoScale = document.getElementById('wmLogoScale');
        const wmLogoScaleValue = document.getElementById('wmLogoScaleValue');
        const wmLogoOpacity = document.getElementById('wmLogoOpacity');
        const wmLogoOpacityValue = document.getElementById('wmLogoOpacityValue');
        const wmLogoPositionGrid = document.getElementById('wmLogoPositionGrid');

        const applyWatermarkBtn = document.getElementById('applyWatermark');
        const wmOverlay = document.getElementById('wmOverlay');
        const wmTextHandle = document.getElementById('wmTextHandle');
        const wmTextHandleLabel = document.getElementById('wmTextHandleLabel');
        const wmLogoHandle = document.getElementById('wmLogoHandle');
        const wmLogoHandleImg = document.getElementById('wmLogoHandleImg');
        const wmTemplateGrid = document.getElementById('wmTemplateGrid');

        if (!wmTextEnabled || !wmLogoEnabled || !applyWatermarkBtn || !wmOverlay) return;

        // Default: Enable Text Watermark with Warisha Fashion so controls are immediately visible and usable
        wmTextEnabled.checked = true;
        if (wmTextFields) wmTextFields.style.display = 'block';
        if (wmText && !wmText.value.trim()) wmText.value = 'Warisha Fashion';

        let wmTextPos = { fx: 0.88, fy: 0.88 };
        let wmLogoPos = { fx: 0.88, fy: 0.88 };
        let wmTextRotation = 0;
        let wmLogoRotation = 0;
        let wmLogoImage = null;   // loaded HTMLImageElement for the uploaded logo
        let wmLogoAspect = 1;     // naturalHeight / naturalWidth, for preserving logo proportions

        // Same "image's own rendered box, not the wrapper's" positioning
        // approach the BG-remove module's lasso/clone/erase canvases use —
        // written as its own local copy here since that helper lives inside
        // initBgRemoveModule's closure and isn't reachable from other modules.
        function getImageDisplayRect() {
            const wrapper = previewImage.parentElement;
            const imgRect = previewImage.getBoundingClientRect();
            const wrapRect = wrapper.getBoundingClientRect();
            return {
                left: imgRect.left - wrapRect.left,
                top: imgRect.top - wrapRect.top,
                width: imgRect.width,
                height: imgRect.height
            };
        }

        function refreshSliderLabels() {
            wmFontSizeValue.textContent = wmFontSize.value;
            wmTextOpacityValue.textContent = wmTextOpacity.value;
            wmLogoScaleValue.textContent = wmLogoScale.value;
            wmLogoOpacityValue.textContent = wmLogoOpacity.value;
        }

        function isWatermarkTabActive() {
            const activeTab = document.querySelector('.tab-btn.active');
            return !!activeTab && activeTab.dataset.tab === 'watermark';
        }

        function syncOverlayVisibility() {
            const shouldShow = isWatermarkTabActive() && !!originalImage &&
                (wmTextEnabled.checked || wmLogoEnabled.checked);
            wmOverlay.style.display = shouldShow ? 'block' : 'none';
        }

        // Positions text/logo preview handles using the same fx/fy anchor
        // fractions that get burned into the full-resolution canvas on
        // Apply, so the drag-preview is a faithful (WYSIWYG) match.
        function updateTextHandle() {
            if (!wmTextEnabled.checked || !originalImage) {
                wmTextHandle.style.display = 'none';
                return;
            }
            const rect = getImageDisplayRect();
            const refDim = Math.min(rect.width, rect.height);
            const fontPx = Math.max(8, Math.round(refDim * (parseFloat(wmFontSize.value) / 100)));
            wmTextHandleLabel.textContent = wmText.value || 'নমুনা টেক্সট';
            wmTextHandle.style.left = (wmTextPos.fx * 100) + '%';
            wmTextHandle.style.top = (wmTextPos.fy * 100) + '%';
            wmTextHandle.style.transform = `translate(-50%, -50%) rotate(${wmTextRotation}deg)`;
            wmTextHandle.style.fontSize = fontPx + 'px';
            wmTextHandle.style.fontFamily = wmFontFamily.value;
            wmTextHandle.style.fontWeight = wmFontFamily.value.includes('Noto Sans Bengali') ? '900' : '700';
            wmTextHandle.style.color = wmTextColor.value;
            wmTextHandle.style.opacity = parseFloat(wmTextOpacity.value) / 100;
            wmTextHandle.style.display = 'block';
        }

        function updateLogoHandle() {
            if (!wmLogoEnabled.checked || !originalImage || !wmLogoImage) {
                wmLogoHandle.style.display = 'none';
                return;
            }
            const rect = getImageDisplayRect();
            const width = Math.max(4, Math.round(rect.width * (parseFloat(wmLogoScale.value) / 100)));
            const height = Math.round(width * wmLogoAspect);
            wmLogoHandleImg.src = wmLogoImage.src;
            wmLogoHandleImg.style.width = width + 'px';
            wmLogoHandleImg.style.height = height + 'px';
            wmLogoHandle.style.left = (wmLogoPos.fx * 100) + '%';
            wmLogoHandle.style.top = (wmLogoPos.fy * 100) + '%';
            wmLogoHandle.style.transform = `translate(-50%, -50%) rotate(${wmLogoRotation}deg)`;
            wmLogoHandle.style.opacity = parseFloat(wmLogoOpacity.value) / 100;
            wmLogoHandle.style.display = 'block';
        }

        function refreshAll() {
            syncOverlayVisibility();
            updateTextHandle();
            updateLogoHandle();
        }

        // ---------- Toggle sections ----------
        wmTextEnabled.addEventListener('change', () => {
            wmTextFields.style.display = wmTextEnabled.checked ? 'block' : 'none';
            refreshAll();
        });
        wmLogoEnabled.addEventListener('change', () => {
            wmLogoFields.style.display = wmLogoEnabled.checked ? 'block' : 'none';
            refreshAll();
        });

        // Phase 16: quick ad text templates
        const WM_TEMPLATES = {
            'new-collection': { text: '🆕 নতুন কালেকশন', fontFamily: "'Montserrat', sans-serif", fontSizeRatio: 0.08, color: '#ffffff', textOpacity: 90, fx: 0.5, fy: 0.12 },
            'special-offer': { text: '🔥 স্পেশাল অফার', fontFamily: "'Montserrat', sans-serif", fontSizeRatio: 0.09, color: '#ff4500', textOpacity: 95, fx: 0.5, fy: 0.12 },
            'price-tag': { text: '৳___ মাত্র', fontFamily: "'Montserrat', sans-serif", fontSizeRatio: 0.07, color: '#ffffff', textOpacity: 90, fx: 0.5, fy: 0.88 },
            'sale': { text: '🏷️ সেল!', fontFamily: "'Montserrat', sans-serif", fontSizeRatio: 0.1, color: '#ff0000', textOpacity: 95, fx: 0.5, fy: 0.12 },
            'limited': { text: '⏳ লিমিটেড অফার', fontFamily: "'Montserrat', sans-serif", fontSizeRatio: 0.07, color: '#ffd700', textOpacity: 90, fx: 0.5, fy: 0.88 },
            'free-shipping': { text: '🚚 ফ্রি ডেলিভারি', fontFamily: "'Montserrat', sans-serif", fontSizeRatio: 0.07, color: '#00c853', textOpacity: 90, fx: 0.5, fy: 0.88 },
        };

        if (wmTemplateGrid) {
            wmTemplateGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.preset-btn');
                if (!btn) return;
                const tpl = WM_TEMPLATES[btn.dataset.wmTemplate];
                if (!tpl) return;
                wmTextEnabled.checked = true;
                wmTextFields.style.display = 'block';
                wmText.value = tpl.text;
                wmFontFamily.value = tpl.fontFamily;
                wmFontSize.value = Math.round(tpl.fontSizeRatio * 100);
                wmFontSizeValue.textContent = wmFontSize.value;
                wmTextColor.value = tpl.color;
                wmTextOpacity.value = tpl.textOpacity;
                wmTextOpacityValue.textContent = tpl.textOpacity;
                wmTextPos = { fx: tpl.fx, fy: tpl.fy };
                wmTemplateGrid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                refreshAll();
                showToast(`টেমপ্লেট "${tpl.text}" অ্যাপ্লাই করা হয়েছে — প্রয়োজনীয় পরিবর্তন করুন এবং "ওয়াটারমার্ক প্রয়োগ করুন" চাপুন`);
            });
        }

        // ---------- Text field inputs ----------
        wmText.addEventListener('input', updateTextHandle);
        wmFontSize.addEventListener('input', () => { refreshSliderLabels(); updateTextHandle(); });
        wmFontFamily.addEventListener('change', updateTextHandle);
        wmTextColor.addEventListener('input', updateTextHandle);
        wmTextOpacity.addEventListener('input', () => { refreshSliderLabels(); updateTextHandle(); });

        // ---------- Logo field inputs ----------
        wmLogoScale.addEventListener('input', () => { refreshSliderLabels(); updateLogoHandle(); });
        wmLogoOpacity.addEventListener('input', () => { refreshSliderLabels(); updateLogoHandle(); });

        wmLogoFile.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    wmLogoImage = img;
                    wmLogoAspect = img.naturalHeight / img.naturalWidth;
                    updateLogoHandle();
                    showToast('✅ লোগো লোড হয়েছে', 'success');
                };
                img.onerror = () => showToast('❌ লোগো ছবি লোড করা যায়নি', 'error');
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        // ---------- 9-grid position presets ----------
        function wirePositionGrid(grid, posState, onPick) {
            grid.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    grid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    posState.fx = parseFloat(btn.dataset.fx);
                    posState.fy = parseFloat(btn.dataset.fy);
                    onPick();
                });
            });
        }
        wirePositionGrid(wmTextPositionGrid, wmTextPos, updateTextHandle);
        wirePositionGrid(wmLogoPositionGrid, wmLogoPos, updateLogoHandle);

        // ---------- Direct mouse transform: move, corner-resize, rotate ----------
        function wireTransform(handle, posState, grid, onMove, sizeInput, minSize, maxSize, getRotation, setRotation) {
            let interaction = null;

            function clientToFraction(clientX, clientY) {
                const rect = getImageDisplayRect();
                if (rect.width === 0 || rect.height === 0) return null;
                const imgRect = previewImage.getBoundingClientRect();
                let fx = (clientX - imgRect.left) / rect.width;
                let fy = (clientY - imgRect.top) / rect.height;
                fx = Math.min(1, Math.max(0, fx));
                fy = Math.min(1, Math.max(0, fy));
                return { fx, fy };
            }

            function getCenter() {
                const rect = handle.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }

            function onPointerMove(e) {
                if (!interaction) return;
                if (interaction.kind === 'move') {
                    const pt = clientToFraction(e.clientX, e.clientY);
                    if (!pt) return;
                    posState.fx = pt.fx;
                    posState.fy = pt.fy;
                } else if (interaction.kind === 'resize') {
                    const distance = Math.max(1, Math.hypot(e.clientX - interaction.center.x, e.clientY - interaction.center.y));
                    sizeInput.value = String(Math.max(minSize, Math.min(maxSize, interaction.size * distance / interaction.distance)));
                    refreshSliderLabels();
                } else if (interaction.kind === 'rotate') {
                    const angle = Math.atan2(e.clientY - interaction.center.y, e.clientX - interaction.center.x) * 180 / Math.PI + 90;
                    setRotation(Math.round(angle));
                }
                onMove();
            }

            function onPointerUp() {
                if (!interaction) return;
                const moved = interaction.kind === 'move';
                interaction = null;
                handle.classList.remove('dragging');
                if (moved && grid) grid.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
            }

            handle.addEventListener('pointerdown', (e) => {
                if (e.button !== undefined && e.button !== 0) return;
                e.preventDefault();
                const actionControl = e.target.closest('[data-wm-action]');
                const kind = actionControl ? actionControl.dataset.wmAction : 'move';
                const center = getCenter();
                interaction = {
                    kind,
                    center,
                    size: Number(sizeInput.value),
                    distance: Math.max(1, Math.hypot(e.clientX - center.x, e.clientY - center.y)),
                    rotation: getRotation()
                };
                handle.classList.add('dragging');
                document.addEventListener('pointermove', onPointerMove);
                document.addEventListener('pointerup', onPointerUp);
            });
        }
        wireTransform(wmTextHandle, wmTextPos, wmTextPositionGrid, updateTextHandle, wmFontSize, 2, 20,
            () => wmTextRotation, (value) => { wmTextRotation = value; });
        wireTransform(wmLogoHandle, wmLogoPos, wmLogoPositionGrid, updateLogoHandle, wmLogoScale, 5, 60,
            () => wmLogoRotation, (value) => { wmLogoRotation = value; });

        // ---------- Tab / image lifecycle ----------
        document.addEventListener('app:tabchange', syncOverlayVisibility);
        document.addEventListener('app:newimage', refreshAll);
        document.addEventListener('app:historyrestored', refreshAll);
        previewImage.addEventListener('load', refreshAll);
        window.addEventListener('resize', () => { updateTextHandle(); updateLogoHandle(); });

        // ---------- Apply ----------
        function currentSettings() {
            return {
                textEnabled: wmTextEnabled.checked,
                text: wmText.value,
                fontSizeRatio: parseFloat(wmFontSize.value) / 100,
                fontFamily: wmFontFamily.value,
                color: wmTextColor.value,
                textOpacity: parseFloat(wmTextOpacity.value),
                textPos: { fx: wmTextPos.fx, fy: wmTextPos.fy },
                textRotation: wmTextRotation,
                logoEnabled: wmLogoEnabled.checked,
                logoScaleRatio: parseFloat(wmLogoScale.value) / 100,
                logoAspect: wmLogoAspect,
                logoOpacity: parseFloat(wmLogoOpacity.value),
                logoPos: { fx: wmLogoPos.fx, fy: wmLogoPos.fy },
                logoRotation: wmLogoRotation
            };
        }

        // Exposed for bulk.js — reads live off the DOM/state each call so
        // it always reflects whatever is currently configured on this tab.
        window.getWatermarkSettings = function () {
            return {
                enabled: wmTextEnabled.checked || wmLogoEnabled.checked,
                settings: currentSettings(),
                logoImage: wmLogoImage
            };
        };

        applyWatermarkBtn.addEventListener('click', () => {
            if (!originalImage) return;
            if (!wmTextEnabled.checked && !wmLogoEnabled.checked) {
                showToast('কমপক্ষে একটি ওয়াটারমার্ক (টেক্সট বা লোগো) সক্রিয় করুন', 'error');
                return;
            }
            if (wmTextEnabled.checked && !wmText.value.trim()) {
                showToast('টেক্সট লিখুন', 'error');
                return;
            }
            if (wmLogoEnabled.checked && !wmLogoImage) {
                showToast('লোগো ছবি আপলোড করুন', 'error');
                return;
            }

            applyWatermarkBtn.classList.add('loading');

            setTimeout(() => {
                canvas.width = originalWidth;
                canvas.height = originalHeight;
                ctx.drawImage(originalImage, 0, 0);
                window.drawWatermark(ctx, canvas.width, canvas.height, currentSettings(), wmLogoImage);

                canvas.toBlob(blob => {
                    if (!blob) {
                        applyWatermarkBtn.classList.remove('loading');
                        showToast('❌ প্রয়োগ করা যায়নি', 'error');
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        // Keep originalImage in sync with the new (watermarked)
                        // pixels — same fix as the BG-remove and Rotate/Flip
                        // modules — so a later crop/rotate/brightness edit
                        // doesn't silently discard the watermark.
                        originalImage = img;
                        originalWidth = img.naturalWidth;
                        originalHeight = img.naturalHeight;
                        aspectRatio = originalWidth / originalHeight;

                        processedBlob = blob;
                        downloadSection.style.display = 'block';
                        updatePreview(blob);
                        pushHistory(blob, 'ওয়াটারমার্ক যোগ করা হয়েছে');
                        document.dispatchEvent(new CustomEvent('app:historyrestored'));

                        applyWatermarkBtn.classList.remove('loading');
                        showToast('✅ ওয়াটারমার্ক প্রয়োগ হয়েছে!', 'success');
                    };
                    img.onerror = () => {
                        applyWatermarkBtn.classList.remove('loading');
                        showToast('❌ প্রয়োগ করা যায়নি', 'error');
                    };
                    img.src = url;
                }, 'image/png');
            }, 100);
        });
    })(); // end initWatermarkModule

    // ============================================
    // Phase 11: Upscale — pure helpers
    // ============================================

    // Works out the final pixel size for a local upscale request, clamped to
    // maxDimension on the longer side so a big multi-MP photo at 4x can't
    // blow past what a canvas (and the user's RAM) can comfortably hold.
    function computeUpscaleDimensions(width, height, factor, maxDimension) {
        maxDimension = maxDimension || 6000;
        width = Math.max(1, Math.round(width) || 0);
        height = Math.max(1, Math.round(height) || 0);
        factor = (typeof factor === 'number' && factor > 0) ? factor : 1;

        let targetW = Math.max(1, Math.round(width * factor));
        let targetH = Math.max(1, Math.round(height * factor));
        let clamped = false;

        const longSide = Math.max(targetW, targetH);
        if (longSide > maxDimension) {
            const scale = maxDimension / longSide;
            targetW = Math.max(1, Math.round(targetW * scale));
            targetH = Math.max(1, Math.round(targetH * scale));
            clamped = true;
        }

        return { width: targetW, height: targetH, clamped };
    }

    // Breaks a single upscale factor into a chain of ≤2x hops. Scaling up in
    // several smaller steps (each re-sampled by the browser's own "high
    // quality" resampler) keeps edges noticeably crisper than one huge
    // single-hop stretch — canvas has no true bicubic/Lanczos mode, so this
    // is the standard trick to approximate one.
    function planUpscaleSteps(factor) {
        factor = (typeof factor === 'number' && factor > 0) ? factor : 1;
        if (factor <= 1) return [1];

        const steps = [];
        let remaining = factor;
        while (remaining > 2) {
            steps.push(2);
            remaining /= 2;
        }
        if (remaining > 1.0001) steps.push(remaining);
        return steps.length ? steps : [factor];
    }

    // Simple variable-strength 3x3 sharpen convolution — pure (no canvas),
    // so it's Node-testable. `imageData` only needs {data, width, height};
    // a real ImageData satisfies that, and so does a plain mock in tests.
    // amount === 0 (or a too-small image) must be a byte-for-byte no-op —
    // that's the regression guard for the "sharpen off" default.
    function sharpenImageData(imageData, amount) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const out = new Uint8ClampedArray(data.length);

        if (!amount || amount <= 0 || width < 3 || height < 3) {
            out.set(data);
            return { data: out, width, height };
        }

        const center = 1 + 4 * amount;
        const edge = -amount;

        function at(x, y, c) {
            x = Math.min(width - 1, Math.max(0, x));
            y = Math.min(height - 1, Math.max(0, y));
            return data[(y * width + x) * 4 + c];
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                for (let c = 0; c < 3; c++) { // RGB only — alpha passes through untouched
                    out[idx + c] = center * at(x, y, c)
                        + edge * at(x - 1, y, c)
                        + edge * at(x + 1, y, c)
                        + edge * at(x, y - 1, c)
                        + edge * at(x, y + 1, c);
                }
                out[idx + 3] = data[idx + 3];
            }
        }
        return { data: out, width, height };
    }

    // Shared with bulk.js (same window-exposure pattern as watermark.js /
    // social-presets.js) so a bulk-resize run can optionally run the exact
    // same progressive-resample + sharpen pipeline as the single-image tab
    // before handing the result to renderSocialCanvas(). Pure helpers first,
    // so bulk.js (or a future standalone test) can call them independently.
    window.computeUpscaleDimensions = computeUpscaleDimensions;
    window.planUpscaleSteps = planUpscaleSteps;
    window.sharpenImageData = sharpenImageData;

    // Not pure (real canvas calls) — runs the same progressive-resample +
    // optional-sharpen pipeline the single-image "লোকাল আপস্কেল" button uses,
    // but on any source (an <img> OR a <canvas>, e.g. one bulk.js already
    // watermarked) and returns a canvas instead of mutating the shared
    // originalImage/canvas/ctx globals — so it's safe to call once per bulk
    // item in a loop.
    window.applyLocalUpscaleToCanvas = function (img, factor, sharpenAmount, maxDimension) {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const target = computeUpscaleDimensions(srcW, srcH, factor, maxDimension || 6000);
        const steps = planUpscaleSteps(target.width / srcW);

        let stepSrc = document.createElement('canvas');
        stepSrc.width = srcW;
        stepSrc.height = srcH;
        stepSrc.getContext('2d').drawImage(img, 0, 0, srcW, srcH);

        let curW = srcW, curH = srcH;
        for (let i = 0; i < steps.length; i++) {
            const isLast = i === steps.length - 1;
            const nextW = isLast ? target.width : Math.round(curW * steps[i]);
            const nextH = isLast ? target.height : Math.round(curH * steps[i]);

            const stepCanvas = document.createElement('canvas');
            stepCanvas.width = nextW;
            stepCanvas.height = nextH;
            const stepCtx = stepCanvas.getContext('2d');
            stepCtx.imageSmoothingEnabled = true;
            stepCtx.imageSmoothingQuality = 'high';
            stepCtx.drawImage(stepSrc, 0, 0, nextW, nextH);

            stepSrc = stepCanvas;
            curW = nextW;
            curH = nextH;
        }

        if (sharpenAmount > 0) {
            const outCtx = stepSrc.getContext('2d');
            const imgData = outCtx.getImageData(0, 0, curW, curH);
            const sharpened = sharpenImageData(imgData, sharpenAmount);
            outCtx.putImageData(new ImageData(sharpened.data, sharpened.width, sharpened.height), 0, 0);
        }

        return { canvas: stepSrc, width: curW, height: curH, clamped: target.clamped };
    };

    // ============================================
    // Phase 11: Upscale — local canvas resample + Cloud AI (DeepAI torch-srgan)
    // ============================================
    (function initUpscaleModule() {
        // Cloud (AI) elements
        const upApiKey = document.getElementById('upApiKey');
        const copyUpscaleApiLinkBtn = document.getElementById('copyUpscaleApiLinkBtn');
        const upAiBtn = document.getElementById('upAiBtn');
        const upAiLoading = document.getElementById('upAiLoading');

        // Local elements
        const upFactor = document.getElementById('upFactor');
        const upSharpen = document.getElementById('upSharpen');
        const upSharpenValue = document.getElementById('upSharpenValue');
        const upLocalBtn = document.getElementById('upLocalBtn');

        // Shared result readout
        const upResult = document.getElementById('upResult');
        const upResultText = document.getElementById('upResultText');

        if (!upAiBtn || !upLocalBtn) return;

        // Exposed for bulk.js (same pattern as window.getWatermarkSettings) —
        // called fresh at process time, so it always reflects whatever is
        // currently set on the "আপস্কেল" tab's local-upscale controls, even
        // if the user never clicked "প্রয়োগ করুন" here themselves.
        window.getUpscaleSettings = function () {
            const factor = upFactor ? (parseFloat(upFactor.value) || 2) : 2;
            const sharpenAmount = upSharpen ? (parseInt(upSharpen.value, 10) / 100) * 0.5 : 0;
            return { factor, sharpenAmount };
        };

        // Restore saved API key (same pattern as Remove.bg's bgApiKey)
        if (upApiKey) {
            upApiKey.value = localStorage.getItem('deepai_api_key') || '';
            upApiKey.addEventListener('change', () => {
                localStorage.setItem('deepai_api_key', upApiKey.value.trim());
            });
        }

        // Copy the DeepAI signup link to the clipboard (same pattern as
        // Remove.bg's copyApiLinkBtn)
        if (copyUpscaleApiLinkBtn) {
            copyUpscaleApiLinkBtn.addEventListener('click', async () => {
                const link = 'https://deepai.org/';
                try {
                    await navigator.clipboard.writeText(link);
                    showToast('✅ লিংক কপি হয়েছে', 'success');
                } catch (err) {
                    const tmp = document.createElement('textarea');
                    tmp.value = link;
                    tmp.style.position = 'fixed';
                    tmp.style.opacity = '0';
                    document.body.appendChild(tmp);
                    tmp.select();
                    try {
                        document.execCommand('copy');
                        showToast('✅ লিংক কপি হয়েছে', 'success');
                    } catch (e2) {
                        showToast('❌ কপি করা যায়নি, লিংকে ক্লিক করুন', 'error');
                    }
                    document.body.removeChild(tmp);
                }
            });
        }

        if (upSharpen && upSharpenValue) {
            upSharpen.addEventListener('input', () => {
                upSharpenValue.textContent = upSharpen.value;
            });
        }

        // Refreshes the dimension-dependent UI other tabs cache — same fix
        // Rotate/Flip's finalizeTransform needed — otherwise a later
        // crop/dimension edit would start from the pre-upscale size.
        function syncDimensionDependentUI(w, h) {
            infoDimension.textContent = `${w} × ${h}`;
            currentPixels.textContent = formatPixels(w * h);
            targetWidth.value = w;
            targetHeight.value = h;
            cropX.value = 0;
            cropY.value = 0;
            cropWidth.value = w;
            cropHeight.value = h;
            if (typeof drawCropPreview === 'function') drawCropPreview();
        }

        function showResult(text) {
            if (!upResult || !upResultText) return;
            upResultText.textContent = text;
            upResult.style.display = 'block';
        }

        // ──────────────────────────────────────────
        // Local upscale — canvas resample + optional sharpen, fully offline
        // ──────────────────────────────────────────
        upLocalBtn.addEventListener('click', () => {
            if (!originalImage) {
                showToast('প্রথমে একটি ছবি আপলোড করুন', 'error');
                return;
            }

            const factor = parseFloat(upFactor.value) || 2;
            const sharpenAmount = upSharpen ? (parseInt(upSharpen.value, 10) / 100) * 0.5 : 0;

            upLocalBtn.classList.add('loading');

            setTimeout(() => {
                // Reuse the exact same progressive-resample + sharpen pipeline
                // that bulk.js calls for batch upscaling (window.applyLocalUpscaleToCanvas)
                // so the two paths can never silently drift apart.
                const result = window.applyLocalUpscaleToCanvas(originalImage, factor, sharpenAmount, 6000);
                const target = { width: result.width, height: result.height, clamped: result.clamped };

                canvas.width = result.width;
                canvas.height = result.height;
                ctx.drawImage(result.canvas, 0, 0);

                canvas.toBlob(blob => {
                    if (!blob) {
                        upLocalBtn.classList.remove('loading');
                        showToast('❌ প্রয়োগ করা যায়নি', 'error');
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        originalImage = img;
                        originalWidth = img.naturalWidth;
                        originalHeight = img.naturalHeight;
                        aspectRatio = originalWidth / originalHeight;
                        syncDimensionDependentUI(originalWidth, originalHeight);

                        processedBlob = blob;
                        downloadSection.style.display = 'block';
                        updatePreview(blob);
                        pushHistory(blob, `লোকাল আপস্কেল ${factor}x`);
                        document.dispatchEvent(new CustomEvent('app:historyrestored'));

                        showResult(`নতুন সাইজ: ${originalWidth} × ${originalHeight}px${target.clamped ? ' (মেমরি সীমার কারণে সর্বোচ্চ সাইজে ক্ল্যাম্প করা হয়েছে)' : ''}`);
                        upLocalBtn.classList.remove('loading');
                        showToast('✅ লোকাল আপস্কেল সম্পন্ন হয়েছে!', 'success');
                    };
                    img.onerror = () => {
                        upLocalBtn.classList.remove('loading');
                        showToast('❌ প্রয়োগ করা যায়নি', 'error');
                    };
                    img.src = url;
                }, 'image/png');
            }, 100);
        });

        // ──────────────────────────────────────────
        // Cloud AI upscale — DeepAI torch-srgan (fixed 4x, needs an API key)
        // ──────────────────────────────────────────
        upAiBtn.addEventListener('click', async () => {
            if (!originalFile && !processedBlob) {
                showToast('প্রথমে একটি ছবি আপলোড করুন', 'error');
                return;
            }
            const apiKey = upApiKey ? upApiKey.value.trim() : '';
            if (!apiKey) {
                showToast('DeepAI API Key দিন', 'error');
                return;
            }
            localStorage.setItem('deepai_api_key', apiKey);

            if (upAiLoading) upAiLoading.style.display = 'flex';
            upAiBtn.disabled = true;

            try {
                // Use the latest processed blob or fall back to original file
                const blobToSend = processedBlob || originalFile;
                const formData = new FormData();
                formData.append('image', blobToSend, 'image.png');

                const response = await fetch('https://api.deepai.org/api/torch-srgan', {
                    method: 'POST',
                    headers: { 'api-key': apiKey },
                    body: formData
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const msg = (errData && (errData.err || errData.status)) || `HTTP ${response.status}`;
                    throw new Error(msg);
                }

                const result = await response.json();
                if (!result || !result.output_url) {
                    throw new Error('output_url পাওয়া যায়নি');
                }

                const resultBlob = await fetch(result.output_url).then(r => r.blob());
                const url = URL.createObjectURL(resultBlob);

                // Same "keep originalImage in sync" fix every other apply
                // path needs — otherwise the next tool silently edits the
                // stale pre-upscale pixels.
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        originalImage = img;
                        originalWidth = img.naturalWidth;
                        originalHeight = img.naturalHeight;
                        aspectRatio = originalWidth / originalHeight;
                        syncDimensionDependentUI(originalWidth, originalHeight);
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = url;
                });

                processedBlob = resultBlob;
                downloadSection.style.display = 'block';
                downloadBtn.setAttribute('data-ext', 'jpg');
                previewImage.src = url;
                pushHistory(resultBlob, 'AI আপস্কেল (৪x)');
                document.dispatchEvent(new CustomEvent('app:historyrestored'));

                showResult(`নতুন সাইজ: ${originalWidth} × ${originalHeight}px (DeepAI ৪x)`);
                showToast('✅ AI আপস্কেল সম্পন্ন হয়েছে!', 'success');
            } catch (err) {
                showToast(`❌ ত্রুটি: ${err.message}`, 'error');
            } finally {
                if (upAiLoading) upAiLoading.style.display = 'none';
                upAiBtn.disabled = false;
            }
        });
    })(); // end initUpscaleModule

    // ============================================
    // Phase 12: PWA — অফলাইন সাপোর্ট, ইনস্টল প্রম্পট, আপডেট ব্যানার
    // ============================================
    (function initPwaModule() {
        const pwaInstallBtn = document.getElementById('pwaInstallBtn');
        const pwaUpdateBanner = document.getElementById('pwaUpdateBanner');
        const pwaUpdateReloadBtn = document.getElementById('pwaUpdateReloadBtn');

        let deferredInstallPrompt = null;
        let waitingWorker = null;
        let refreshingAfterUpdate = false;

        // --- Service worker রেজিস্ট্রেশন (ব্রাউজার সাপোর্ট না থাকলে চুপচাপ স্কিপ) ---
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then((registration) => {
                    // ইতিমধ্যে একটা নতুন ভার্সন 'waiting' অবস্থায় থাকতে পারে (আগের সেশনে ডাউনলোড হয়ে থেমে ছিল)
                    if (registration.waiting) {
                        waitingWorker = registration.waiting;
                        if (pwaUpdateBanner) pwaUpdateBanner.classList.add('show');
                    }

                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // পুরনো কন্ট্রোলার আগে থেকেই আছে মানে এটা আপডেট, প্রথমবার install না
                                waitingWorker = newWorker;
                                if (pwaUpdateBanner) pwaUpdateBanner.classList.add('show');
                            }
                        });
                    });
                }).catch(() => {
                    // অফলাইন ফার্স্ট-লোড বা রেজিস্ট্রেশন ফেইল হলেও মূল এডিটর কাজ করা উচিত,
                    // তাই এখানে কোনো toast/error দেখানো হচ্ছে না — sw.js শুধু একটা enhancement
                });

                // নতুন SW কন্ট্রোল নেওয়ার পর পেজ একবারই রিলোড হবে
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshingAfterUpdate) return;
                    refreshingAfterUpdate = true;
                    window.location.reload();
                });
            });
        }

        if (pwaUpdateReloadBtn) {
            pwaUpdateReloadBtn.addEventListener('click', () => {
                if (waitingWorker) {
                    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
                if (pwaUpdateBanner) pwaUpdateBanner.classList.remove('show');
            });
        }

        // --- "হোম স্ক্রিনে যোগ করুন" ইনস্টল প্রম্পট ---
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            if (pwaInstallBtn) pwaInstallBtn.classList.add('show');
        });

        if (pwaInstallBtn) {
            pwaInstallBtn.addEventListener('click', async () => {
                if (!deferredInstallPrompt) return;
                pwaInstallBtn.disabled = true;
                try {
                    deferredInstallPrompt.prompt();
                    const choice = await deferredInstallPrompt.userChoice;
                    if (choice && choice.outcome === 'accepted') {
                        showToast('✅ অ্যাপ ইনস্টল হয়েছে!', 'success');
                    }
                } catch (err) {
                    // ইউজার ডিসমিস করলে বা ব্রাউজার সাপোর্ট না করলে চুপচাপ ইগনোর
                } finally {
                    deferredInstallPrompt = null;
                    pwaInstallBtn.classList.remove('show');
                    pwaInstallBtn.disabled = false;
                }
            });
        }

        // ইনস্টল হয়ে গেলে (এই ইভেন্ট বা manual ইনস্টল — দুই ক্ষেত্রেই) বাটন লুকিয়ে ফেলা
        window.addEventListener('appinstalled', () => {
            deferredInstallPrompt = null;
            if (pwaInstallBtn) pwaInstallBtn.classList.remove('show');
        });

        // --- অনলাইন/অফলাইন ট্রানজিশন নোটিফাই করা ---
        window.addEventListener('offline', () => {
            showToast('📴 ইন্টারনেট সংযোগ নেই — লোকাল এডিটিং কাজ করবে, তবে AI ফিচারগুলো (রিমুভ.bg, DeepAI) কাজ করবে না', 'info');
        });
        window.addEventListener('online', () => {
            showToast('🌐 ইন্টারনেট সংযোগ ফিরে এসেছে', 'success');
        });
    })(); // end initPwaModule

    // ============================================
    // OCR Module (Image to Text)
    // ============================================
    (function initOcrModule() {
        const ocrLanguage = document.getElementById('ocrLanguage');
        const ocrUseCurrentImage = document.getElementById('ocrUseCurrentImage');
        const ocrUploadWrap = document.getElementById('ocrUploadWrap');
        const ocrFileInput = document.getElementById('ocrFileInput');
        const ocrProgress = document.getElementById('ocrProgress');
        const ocrProgressFill = document.getElementById('ocrProgressFill');
        const ocrStatus = document.getElementById('ocrStatus');
        const ocrRunBtn = document.getElementById('ocrRunBtn');
        const ocrResult = document.getElementById('ocrResult');
        const ocrTextResult = document.getElementById('ocrTextResult');
        const ocrCopyBtn = document.getElementById('ocrCopyBtn');
        const ocrClearBtn = document.getElementById('ocrClearBtn');

        let isOcrRunning = false;

        ocrUseCurrentImage.addEventListener('change', () => {
            ocrUploadWrap.style.display = ocrUseCurrentImage.checked ? 'none' : 'block';
        });

        ocrFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                ocrUseCurrentImage.checked = false;
                ocrUploadWrap.style.display = 'block';
            }
        });

        function getOcrImageSource() {
            if (ocrUseCurrentImage.checked) {
                const img = originalImage || previewImage;
                if (!img || !img.src) {
                    showToast('প্রথমে একটি ছবি আপলোড করুন', 'error');
                    return null;
                }
                return img;
            }
            if (!ocrFileInput.files.length) {
                showToast('অনুগ্রহ করে একটি ছবি আপলোড করুন', 'error');
                return null;
            }
            return ocrFileInput.files[0];
        }

        ocrRunBtn.addEventListener('click', async () => {
            if (isOcrRunning) return;

            const imageSource = getOcrImageSource();
            if (!imageSource) return;

            const lang = ocrLanguage.value;
            isOcrRunning = true;
            ocrRunBtn.disabled = true;
            ocrRunBtn.classList.add('loading');
            ocrProgress.style.display = 'block';
            ocrResult.style.display = 'none';
            ocrProgressFill.style.width = '0%';
            ocrStatus.textContent = 'প্রসেস করছে... (প্রথমবারে ল্যাঙ্গুয়েজ ডাউনলোড হতে পারে)';

            try {
                const worker = await Tesseract.createWorker(lang, 1, {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round((m.progress || 0) * 100);
                            ocrProgressFill.style.width = pct + '%';
                            ocrStatus.textContent = 'টেক্সট রিকগনাইজ করছে... ' + pct + '%';
                        } else if (m.status === 'loading language traineddata') {
                            ocrStatus.textContent = 'ল্যাঙ্গুয়েজ ডাটা লোড হচ্ছে...';
                        } else if (m.status === 'initializing api') {
                            ocrStatus.textContent = 'OCR ইঞ্জিন প্রস্তুত হচ্ছে...';
                        } else {
                            ocrStatus.textContent = m.status || 'প্রসেস করছে...';
                        }
                    }
                });

                const { data: { text } } = await worker.recognize(imageSource);
                await worker.terminate();

                ocrTextResult.value = text.trim();
                ocrResult.style.display = 'block';
                ocrProgressFill.style.width = '100%';
                ocrStatus.textContent = 'সম্পন্ন!';

                if (text.trim()) {
                    showToast('✅ টেক্সট সফলভাবে এক্সট্র্যাক্টেড হয়েছে!', 'success');
                } else {
                    showToast('⚠️ কোনো টেক্সট খুঁজে পাওয়া যায়নি', 'info');
                }
            } catch (err) {
                console.error('OCR error:', err);
                showToast('❌ OCR ত্রুটি: ' + err.message, 'error');
                ocrStatus.textContent = 'ত্রুটি হয়েছে';
            } finally {
                isOcrRunning = false;
                ocrRunBtn.disabled = false;
                ocrRunBtn.classList.remove('loading');
            }
        });

        ocrCopyBtn.addEventListener('click', async () => {
            const text = ocrTextResult.value;
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
                showToast('📋 টেক্সট কপি করা হয়েছে!', 'success');
            } catch (err) {
                showToast('❌ কপি করা যায়নি', 'error');
            }
        });

        ocrClearBtn.addEventListener('click', () => {
            ocrTextResult.value = '';
            ocrResult.style.display = 'none';
            ocrProgress.style.display = 'none';
            ocrProgressFill.style.width = '0%';
            ocrFileInput.value = '';
            ocrStatus.textContent = 'প্রসেস করছে...';
        });

        document.addEventListener('app:tabchange', (e) => {
            if (e.detail !== 'ocr') return;
            ocrUploadWrap.style.display = ocrUseCurrentImage.checked ? 'none' : 'block';
        });
    })(); // end initOcrModule

})(); // end main app IIFE
