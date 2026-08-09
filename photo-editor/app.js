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

    function loadImage(file) {
        originalFile = file;
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                originalImage = img;
                originalWidth = img.naturalWidth;
                originalHeight = img.naturalHeight;
                aspectRatio = originalWidth / originalHeight;
                previewImage.src = e.target.result;
                showEditor(file);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showEditor(file) {
        uploadSection.style.display = 'none';
        editorSection.style.display = 'grid';
        downloadSection.style.display = 'none';
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
    }

    // ============================================
    // Tab Navigation
    // ============================================

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

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

    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = brightnessSlider.value;
        updateSliderPercent(brightnessSlider);
    });
    contrastSlider.addEventListener('input', () => {
        contrastValue.textContent = contrastSlider.value;
        updateSliderPercent(contrastSlider);
    });
    saturationSlider.addEventListener('input', () => {
        saturationValue.textContent = saturationSlider.value;
        updateSliderPercent(saturationSlider);
    });

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
        });
    });

    applyBrightness.addEventListener('click', () => {
        if (!originalImage) return;

        const brightness = parseInt(brightnessSlider.value) / 100;
        const contrast = parseInt(contrastSlider.value) / 100;
        const saturation = parseInt(saturationSlider.value) / 100;

        applyBrightness.classList.add('loading');

        setTimeout(() => {
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
            ctx.drawImage(originalImage, 0, 0);
            ctx.filter = 'none';

            canvas.toBlob(blob => {
                processedBlob = blob;
                brightnessResult.style.display = 'block';
                newBrightness.textContent = `B:${brightnessSlider.value}% C:${contrastSlider.value}% S:${saturationSlider.value}%`;
                downloadSection.style.display = 'block';
                updatePreview(blob);
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
                applyCrop.classList.remove('loading');
                showToast('✅ ক্রপ সফলভাবে সম্পন্ন হয়েছে!', 'success');
            }, 'image/png');
        }, 100);
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

        const bgLassoFreeBtn  = document.getElementById('bgLassoFreeBtn');
        const bgLassoPolyBtn  = document.getElementById('bgLassoPolyBtn');
        const bgStartLassoBtn = document.getElementById('bgStartLassoBtn');
        const bgLassoActions  = document.getElementById('bgLassoActions');
        const bgRemoveOutside = document.getElementById('bgRemoveOutsideBtn');
        const bgRemoveInside  = document.getElementById('bgRemoveInsideBtn');
        const bgCancelLasso   = document.getElementById('bgCancelLassoBtn');
        const bgLassoHint     = document.getElementById('bgLassoHint');
        const bgLassoCanvas   = document.getElementById('bgLassoCanvas');

        let lassoMode = 'free'; // 'free' or 'poly'
        let lassoPoints = [];
        let isDrawingLasso = false;
        let isEyedropperActive = false;
        let animFrame = null;

        // Restore saved API key
        bgApiKey.value = localStorage.getItem('removebg_api_key') || '';
        bgApiKey.addEventListener('change', () => {
            localStorage.setItem('removebg_api_key', bgApiKey.value.trim());
        });

        // Slider live display
        bgTolerance.addEventListener('input', () => bgToleranceVal.textContent = bgTolerance.value);
        bgFeather.addEventListener('input',   () => bgFeatherVal.textContent   = bgFeather.value);

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
                const formData = new FormData();
                formData.append('image_file', blobToSend, 'image.png');
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

                const resultBlob = await response.blob();
                processedBlob = resultBlob;
                const url = URL.createObjectURL(resultBlob);
                previewImage.src = url;
                downloadSection.style.display = 'block';
                // Make download use PNG
                downloadBtn.setAttribute('data-ext', 'png');
                showToast('✅ AI ব্যাকগ্রাউন্ড সফলভাবে রিমুভ হয়েছে!', 'success');
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

        // Eyedropper: pick colour from the displayed image
        bgEyedropperBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            isEyedropperActive = !isEyedropperActive;
            if (isEyedropperActive) {
                bgEyedropperStatus.textContent = '👆 ছবিতে ক্লিক করুন';
                bgEyedropperBtn.style.outline = '2px solid var(--accent)';
                previewImage.style.cursor = 'crosshair';
                previewImage.addEventListener('click', pickColour, { once: false });
            } else {
                deactivateEyedropper();
            }
        });

        function pickColour(e) {
            // Draw image to off-screen canvas and read pixel
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width  = originalImage.naturalWidth  || canvas.width;
            tmpCanvas.height = originalImage.naturalHeight || canvas.height;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.drawImage(originalImage, 0, 0);

            const rect   = previewImage.getBoundingClientRect();
            const scaleX = tmpCanvas.width  / rect.width;
            const scaleY = tmpCanvas.height / rect.height;
            const px = Math.floor((e.clientX - rect.left) * scaleX);
            const py = Math.floor((e.clientY - rect.top)  * scaleY);
            const pixel = tmpCtx.getImageData(px, py, 1, 1).data;
            const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
            bgTargetColor.value = hex;
            showToast(`✅ রঙ নির্বাচিত: ${hex}`);
            deactivateEyedropper();
        }

        function deactivateEyedropper() {
            isEyedropperActive = false;
            bgEyedropperStatus.textContent = '';
            bgEyedropperBtn.style.outline = '';
            previewImage.style.cursor = '';
            previewImage.removeEventListener('click', pickColour);
        }

        bgColorRemoveBtn.addEventListener('click', () => {
            if (!originalImage) { showToast('প্রথমে ছবি আপলোড করুন', 'error'); return; }
            removeByColor();
        });

        function hexToRgb(hex) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        }

        function colorDistance(r1, g1, b1, r2, g2, b2) {
            return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
        }

        function removeByColor() {
            // Draw current image onto canvas
            const w = originalImage.naturalWidth  || originalWidth;
            const h = originalImage.naturalHeight || originalHeight;
            canvas.width  = w;
            canvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(originalImage, 0, 0);

            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            const target = hexToRgb(bgTargetColor.value);
            // tolerance 0–100 maps to 0–441.67 (max RGB distance)
            const threshold = (parseInt(bgTolerance.value) / 100) * 441.67;
            const feather   = parseInt(bgFeather.value);

            // Pass 1: mark pixels for removal
            const alpha = new Float32Array(w * h); // 0 = keep, 1 = remove
            for (let i = 0; i < w * h; i++) {
                const ri = data[i * 4];
                const gi = data[i * 4 + 1];
                const bi = data[i * 4 + 2];
                const dist = colorDistance(ri, gi, bi, target.r, target.g, target.b);
                alpha[i] = dist <= threshold ? 1.0 : 0.0;
            }

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

            // Apply alpha mask
            for (let i = 0; i < w * h; i++) {
                data[i * 4 + 3] = Math.round((1 - alpha[i]) * data[i * 4 + 3]);
            }
            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob(blob => {
                processedBlob = blob;
                const url = URL.createObjectURL(blob);
                // Update the source image so eyedropper and future ops use new state
                originalImage = new Image();
                originalImage.src = url;
                previewImage.src = url;
                downloadSection.style.display = 'block';
                downloadBtn.setAttribute('data-ext', 'png');
                showToast('✅ রঙ-ভিত্তিক রিমুভ সম্পন্ন! PNG হিসেবে ডাউনলোড করুন।', 'success');
            }, 'image/png');
        }

        // ──────────────────────────────────────────
        // METHOD 3: Lasso / Polygon Selection
        // ──────────────────────────────────────────

        let lassoCtx = bgLassoCanvas.getContext('2d');

        function syncLassoCanvasSize() {
            // Match pixel size of the preview image
            bgLassoCanvas.width  = previewImage.offsetWidth  || 400;
            bgLassoCanvas.height = previewImage.offsetHeight || 300;
        }

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

    })(); // end initBgRemoveModule

})();
