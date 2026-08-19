// ================================================================
// Bulk Resize — upload 5, 7, or more photos at once, pick one
// Facebook size preset, and get every photo back at the exact same
// size in a single ZIP download.
// Phase 18 additions:
//   1. SEO-friendly filename pattern (prefix + auto-numbering)
//   2. WebP / JPEG / PNG output format selector
//   3. Generic recipe save/load/delete (localStorage JSON)
// ================================================================
(function () {
    "use strict";

    const bulkOpenBtn = document.getElementById("bulkOpenBtn");
    const bulkModalOverlay = document.getElementById("bulkModalOverlay");
    const bulkCloseBtn = document.getElementById("bulkCloseBtn");
    const bulkUploadArea = document.getElementById("bulkUploadArea");
    const bulkFileInput = document.getElementById("bulkFileInput");
    const bulkThumbs = document.getElementById("bulkThumbs");
    const bulkBgRemoveWrap = document.getElementById("bulkBgRemoveWrap");
    const bulkApplyBgRemove = document.getElementById("bulkApplyBgRemove");
    const bulkBgRemoveHint = document.getElementById("bulkBgRemoveHint");
    const bulkBgColorWrap = document.getElementById("bulkBgColorWrap");
    const bulkBgReplaceColor = document.getElementById("bulkBgReplaceColor");
    const bulkBgColor = document.getElementById("bulkBgColor");
    const bulkWarishaPipelineBtn = document.getElementById("bulkWarishaPipelineBtn");
    const bulkPresetWrap = document.getElementById("bulkPresetWrap");
    const bulkPresetGrid = document.getElementById("bulkPresetGrid");
    const bulkModeWrap = document.getElementById("bulkModeWrap");
    const bulkWatermarkWrap = document.getElementById("bulkWatermarkWrap");
    const bulkApplyWatermark = document.getElementById("bulkApplyWatermark");
    const bulkWatermarkHint = document.getElementById("bulkWatermarkHint");
    const bulkUpscaleWrap = document.getElementById("bulkUpscaleWrap");
    const bulkApplyUpscale = document.getElementById("bulkApplyUpscale");
    const bulkUpscaleHint = document.getElementById("bulkUpscaleHint");
    const bulkClearBtn = document.getElementById("bulkClearBtn");
    const bulkProcessBtn = document.getElementById("bulkProcessBtn");
    const bulkProgress = document.getElementById("bulkProgress");
    const bulkProgressFill = document.getElementById("bulkProgressFill");
    const bulkProgressLabel = document.getElementById("bulkProgressLabel");
    // Phase 18: SEO filename, format, recipe
    const bulkFilenameWrap = document.getElementById("bulkFilenameWrap");
    const bulkFilenamePrefix = document.getElementById("bulkFilenamePrefix");
    const bulkFilenameStyle = document.getElementById("bulkFilenameStyle");
    const bulkFormatWrap = document.getElementById("bulkFormatWrap");
    const bulkOutputFormat = document.getElementById("bulkOutputFormat");
    const bulkRecipeWrap = document.getElementById("bulkRecipeWrap");
    const bulkRecipeName = document.getElementById("bulkRecipeName");
    const bulkRecipeSelect = document.getElementById("bulkRecipeSelect");
    const bulkSaveRecipeBtn = document.getElementById("bulkSaveRecipeBtn");
    const bulkLoadRecipeBtn = document.getElementById("bulkLoadRecipeBtn");
    const bulkDeleteRecipeBtn = document.getElementById("bulkDeleteRecipeBtn");

    if (!bulkOpenBtn || !bulkModalOverlay) return;

    let items = [];
    let selectedPreset = null;
    let nextId = 1;

    function openModal() {
        bulkModalOverlay.style.display = "flex";
        refreshBulkWatermarkHint();
        refreshBulkUpscaleHint();
        refreshBulkBgRemoveHint();
        refreshRecipeSelect();
    }
    function closeModal() { bulkModalOverlay.style.display = "none"; }

    bulkOpenBtn.addEventListener("click", openModal);
    bulkCloseBtn.addEventListener("click", closeModal);
    bulkModalOverlay.addEventListener("click", (e) => { if (e.target === bulkModalOverlay) closeModal(); });

    function buildPresetGrid() {
        bulkPresetGrid.innerHTML = "";
        (window.SOCIAL_PRESETS || []).forEach((p, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "preset-btn-social";
            btn.dataset.presetId = p.id;
            btn.innerHTML = "<strong>" + p.label + "</strong><small>" + p.w + "x" + p.h + " . " + p.ratioLabel + "</small><em>" + p.note + "</em>";
            btn.addEventListener("click", () => {
                bulkPresetGrid.querySelectorAll(".preset-btn-social").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                selectedPreset = p;
                updateProcessButtonState();
            });
            if (idx === 0) { btn.classList.add("active"); selectedPreset = p; }
            bulkPresetGrid.appendChild(btn);
        });
    }
    buildPresetGrid();

    if (bulkWarishaPipelineBtn) {
        bulkWarishaPipelineBtn.addEventListener("click", () => {
            if (!items.length) { showToast("প্রথমে ছবি আপলোড করুন"); return; }
            if (bulkApplyBgRemove) bulkApplyBgRemove.checked = true;
            if (bulkBgReplaceColor) bulkBgReplaceColor.checked = true;
            if (bulkBgColor) bulkBgColor.value = "#ffffff";
            if (bulkBgColorWrap) bulkBgColorWrap.style.display = "block";
            const warishaPreset = (window.SOCIAL_PRESETS || []).find(p => p.id === "warisha_square_1_1");
            if (warishaPreset) {
                selectedPreset = warishaPreset;
                bulkPresetGrid.querySelectorAll(".preset-btn-social").forEach(b => {
                    b.classList.toggle("active", b.dataset.presetId === "warisha_square_1_1");
                });
            }
            const fillRadio = document.querySelector("input[name=\"bulkMode\"][value=\"fill\"]");
            if (fillRadio) fillRadio.checked = true;
            document.querySelectorAll("input[name=\"bulkMode\"]").forEach(r => {
                const label = r.closest(".mode-option");
                if (label) label.classList.toggle("active", r.checked);
            });
            if (bulkFilenamePrefix) bulkFilenamePrefix.value = "warisha-product";
            if (bulkFilenameStyle) bulkFilenameStyle.value = "prefix_num";
            updateProcessButtonState();
            showToast("Warisha Product Pipeline সেট হয়েছে — BG-remove + সাদা ব্যাকগ্রাউন্ড + Square 1:1 + ফিল মোড");
        });
    }

    function getBulkMode() {
        const el = document.querySelector("input[name=\"bulkMode\"]:checked");
        return el ? el.value : "fit";
    }

    document.querySelectorAll("input[name=\"bulkMode\"]").forEach(r => {
        r.addEventListener("change", () => {
            document.querySelectorAll("input[name=\"bulkMode\"]").forEach(rr => {
                const label = rr.closest(".mode-option");
                if (label) label.classList.toggle("active", rr.checked);
            });
        });
    });

    bulkUploadArea.addEventListener("click", () => bulkFileInput.click());
    bulkFileInput.addEventListener("change", (e) => addFiles(e.target.files));
    bulkUploadArea.addEventListener("dragover", (e) => { e.preventDefault(); bulkUploadArea.classList.add("drag-over"); });
    bulkUploadArea.addEventListener("dragleave", () => { bulkUploadArea.classList.remove("drag-over"); });
    bulkUploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        bulkUploadArea.classList.remove("drag-over");
        if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    function addFiles(fileList) {
        const files = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
        if (!files.length) return;
        files.forEach(file => {
            const id = "bulk_" + (nextId++);
            const url = URL.createObjectURL(file);
            const img = new Image();
            const item = { id, file, img: null, url, thumbEl: null };
            items.push(item);
            const thumb = document.createElement("div");
            thumb.className = "bulk-thumb";
            thumb.dataset.id = id;
            thumb.innerHTML = "<img src=\"" + url + "\" alt=\"" + file.name + "\"><button type=\"button\" class=\"bulk-thumb-remove\" title=\"মুছুন\">&times;</button><span class=\"bulk-thumb-name\">" + file.name + "</span><div class=\"bulk-thumb-status\">OK</div>";
            thumb.querySelector(".bulk-thumb-remove").addEventListener("click", (ev) => { ev.stopPropagation(); removeItem(id); });
            bulkThumbs.appendChild(thumb);
            item.thumbEl = thumb;
            img.onload = () => { item.img = img; };
            img.onerror = () => { showBulkError("\"" + file.name + "\" ফাইলটি লোড করা যায়নি"); removeItem(id); };
            img.src = url;
        });
        bulkPresetWrap.style.display = "block";
        bulkModeWrap.style.display = "block";
        if (bulkBgRemoveWrap) { bulkBgRemoveWrap.style.display = "block"; refreshBulkBgRemoveHint(); }
        if (bulkWatermarkWrap) { bulkWatermarkWrap.style.display = "block"; refreshBulkWatermarkHint(); }
        if (bulkUpscaleWrap) { bulkUpscaleWrap.style.display = "block"; refreshBulkUpscaleHint(); }
        if (bulkFilenameWrap) bulkFilenameWrap.style.display = "block";
        if (bulkFormatWrap) bulkFormatWrap.style.display = "block";
        if (bulkRecipeWrap) bulkRecipeWrap.style.display = "block";
        updateProcessButtonState();
        bulkFileInput.value = "";
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
            bulkPresetWrap.style.display = "none";
            bulkModeWrap.style.display = "none";
            if (bulkFilenameWrap) bulkFilenameWrap.style.display = "none";
            if (bulkFormatWrap) bulkFormatWrap.style.display = "none";
            if (bulkRecipeWrap) bulkRecipeWrap.style.display = "none";
        }
    }

    function clearAll() {
        items.forEach(it => URL.revokeObjectURL(it.url));
        items = [];
        bulkThumbs.innerHTML = "";
        bulkPresetWrap.style.display = "none";
        bulkModeWrap.style.display = "none";
        if (bulkBgRemoveWrap) bulkBgRemoveWrap.style.display = "none";
        if (bulkWatermarkWrap) bulkWatermarkWrap.style.display = "none";
        if (bulkUpscaleWrap) bulkUpscaleWrap.style.display = "none";
        if (bulkFilenameWrap) bulkFilenameWrap.style.display = "none";
        if (bulkFormatWrap) bulkFormatWrap.style.display = "none";
        if (bulkRecipeWrap) bulkRecipeWrap.style.display = "none";
        bulkProgress.style.display = "none";
        updateProcessButtonState();
    }
    bulkClearBtn.addEventListener("click", clearAll);

    function refreshBulkBgRemoveHint() {
        if (!bulkBgRemoveWrap || !bulkBgRemoveHint) return;
        const apiKey = (localStorage.getItem("removebg_api_key") || "").trim();
        if (!apiKey) {
            bulkBgRemoveHint.textContent = "\"ব্যাকগ্রাউন্ড রিমুভ\" ট্যাবে আগে Remove.bg API Key দিন, তারপর এখানে টিক দিন";
            if (bulkApplyBgRemove) { bulkApplyBgRemove.checked = false; bulkApplyBgRemove.disabled = true; }
        } else {
            bulkBgRemoveHint.textContent = "প্রতিটা ছবির জন্য Remove.bg-এর ১টা ক্রেডিট খরচ হবে — অনেক ছবি একসাথে করলে দ্রুত ক্রেডিট শেষ হতে পারে";
            if (bulkApplyBgRemove) bulkApplyBgRemove.disabled = false;
        }
    }
    if (bulkApplyBgRemove) {
        bulkApplyBgRemove.addEventListener("change", () => {
            if (bulkBgColorWrap) bulkBgColorWrap.style.display = bulkApplyBgRemove.checked ? "block" : "none";
        });
    }

    function refreshBulkWatermarkHint() {
        if (!bulkWatermarkWrap || !bulkWatermarkHint) return;
        const wm = (typeof window.getWatermarkSettings === "function") ? window.getWatermarkSettings() : null;
        if (!wm || !wm.enabled) {
            bulkWatermarkHint.textContent = "\"ওয়াটারমার্ক\" ট্যাবে আগে টেক্সট বা লোগো সক্রিয় করুন, তারপর এখানে টিক দিন";
            if (bulkApplyWatermark) bulkApplyWatermark.checked = false;
        } else {
            bulkWatermarkHint.textContent = "\"ওয়াটারমার্ক\" ট্যাবে যা সেট করা আছে, ঠিক সেটাই প্রতিটা ছবিতে বসবে";
        }
    }

    function refreshBulkUpscaleHint() {
        if (!bulkUpscaleWrap || !bulkUpscaleHint) return;
        if (typeof window.getUpscaleSettings !== "function") { bulkUpscaleWrap.style.display = "none"; return; }
        const settings = window.getUpscaleSettings();
        bulkUpscaleHint.textContent = "\"আপস্কেল\" ট্যাবের লোকাল সেকশনে বর্তমানে " + settings.factor + "x সেট করা আছে — সেটাই প্রতিটা ছবিতে প্রয়োগ হবে (প্রিসেট সাইজে বসানোর আগে)";
    }

    function updateProcessButtonState() {
        bulkProcessBtn.disabled = !(items.length > 0 && selectedPreset);
    }

    function showBulkError(msg) {
        const toast = document.getElementById("toast");
        if (toast) {
            toast.textContent = msg;
            toast.className = "toast show error";
            setTimeout(() => toast.classList.remove("show"), 3000);
        } else { alert(msg); }
    }

    // ---------- Phase 18: SEO Filename ----------
    function slugify(str) {
        return (str || "").trim().toLowerCase()
            .replace(/[^\w\u0980-\u09FF]+/g, "-")
            .replace(/-+/g, "-").replace(/^-|-$/g, "");
    }

    function getOutputFormat(hasTransparency) {
        const fmt = (bulkOutputFormat && bulkOutputFormat.value) || "auto";
        if (fmt === "webp") return { mime: "image/webp", ext: "webp", quality: 0.90 };
        if (fmt === "jpg")  return { mime: "image/jpeg", ext: "jpg",  quality: 0.92 };
        if (fmt === "png")  return { mime: "image/png",  ext: "png",  quality: undefined };
        // auto
        return hasTransparency
            ? { mime: "image/png",  ext: "png",  quality: undefined }
            : { mime: "image/jpeg", ext: "jpg",  quality: 0.92 };
    }

    function generateFileName(item, index, preset, usedNames) {
        const style = (bulkFilenameStyle && bulkFilenameStyle.value) || "original";
        const rawPrefix = (bulkFilenamePrefix && bulkFilenamePrefix.value) || "";
        const prefix = slugify(rawPrefix);
        const hasTransparency = (item._exportMeta && item._exportMeta.hasTransparency) || false;
        const ext = getOutputFormat(hasTransparency).ext;
        const dim = preset.w + "x" + preset.h;

        let base;
        if (style === "prefix_num" && prefix) {
            base = prefix + "-" + String(index + 1).padStart(3, "0") + "_" + dim;
        } else if (style === "prefix_preset" && prefix) {
            base = prefix + "_" + preset.id;
        } else {
            const orig = item.file.name.replace(/\.[^/.]+$/, "") || ("image_" + (index + 1));
            base = orig + "_" + preset.id;
        }

        let fileName = base + "." + ext;
        let d = 1;
        while (usedNames.has(fileName)) { fileName = base + "_" + (d++) + "." + ext; }
        return fileName;
    }

    // ---------- Phase 18: Recipe System ----------
    const RECIPE_KEY = "bulk_recipes_v1";

    function loadAllRecipes() {
        try { return JSON.parse(localStorage.getItem(RECIPE_KEY) || "[]"); }
        catch (_) { return []; }
    }
    function saveAllRecipes(recipes) { localStorage.setItem(RECIPE_KEY, JSON.stringify(recipes)); }

    function refreshRecipeSelect() {
        if (!bulkRecipeSelect) return;
        const recipes = loadAllRecipes();
        bulkRecipeSelect.innerHTML = "<option value=\"\">— সেভ করা রেসিপি লোড করুন —</option>";
        recipes.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r.name; opt.textContent = r.name;
            bulkRecipeSelect.appendChild(opt);
        });
    }

    function getCurrentSettings() {
        return {
            presetId: selectedPreset ? selectedPreset.id : null,
            mode: getBulkMode(),
            outputFormat: (bulkOutputFormat && bulkOutputFormat.value) || "auto",
            filenameStyle: (bulkFilenameStyle && bulkFilenameStyle.value) || "original",
            filenamePrefix: (bulkFilenamePrefix && bulkFilenamePrefix.value) || "",
            applyBgRemove: !!(bulkApplyBgRemove && bulkApplyBgRemove.checked),
            bgReplaceColor: !!(bulkBgReplaceColor && bulkBgReplaceColor.checked),
            bgColor: (bulkBgColor && bulkBgColor.value) || "#ffffff",
            applyWatermark: !!(bulkApplyWatermark && bulkApplyWatermark.checked),
            applyUpscale: !!(bulkApplyUpscale && bulkApplyUpscale.checked),
        };
    }

    function applySettings(s) {
        if (s.presetId) {
            const p = (window.SOCIAL_PRESETS || []).find(pr => pr.id === s.presetId);
            if (p) {
                selectedPreset = p;
                bulkPresetGrid.querySelectorAll(".preset-btn-social").forEach(b => {
                    b.classList.toggle("active", b.dataset.presetId === s.presetId);
                });
            }
        }
        if (s.mode) {
            const radio = document.querySelector("input[name=\"bulkMode\"][value=\"" + s.mode + "\"]");
            if (radio) {
                radio.checked = true;
                document.querySelectorAll("input[name=\"bulkMode\"]").forEach(r => {
                    const lbl = r.closest(".mode-option");
                    if (lbl) lbl.classList.toggle("active", r.checked);
                });
            }
        }
        if (bulkOutputFormat && s.outputFormat) bulkOutputFormat.value = s.outputFormat;
        if (bulkFilenameStyle && s.filenameStyle) bulkFilenameStyle.value = s.filenameStyle;
        if (bulkFilenamePrefix && s.filenamePrefix !== undefined) bulkFilenamePrefix.value = s.filenamePrefix;
        if (bulkApplyBgRemove) {
            bulkApplyBgRemove.checked = !!s.applyBgRemove;
            if (bulkBgColorWrap) bulkBgColorWrap.style.display = s.applyBgRemove ? "block" : "none";
        }
        if (bulkBgReplaceColor) bulkBgReplaceColor.checked = !!s.bgReplaceColor;
        if (bulkBgColor && s.bgColor) bulkBgColor.value = s.bgColor;
        if (bulkApplyWatermark) bulkApplyWatermark.checked = !!s.applyWatermark;
        if (bulkApplyUpscale) bulkApplyUpscale.checked = !!s.applyUpscale;
        updateProcessButtonState();
    }

    if (bulkSaveRecipeBtn) {
        bulkSaveRecipeBtn.addEventListener("click", () => {
            const name = (bulkRecipeName && bulkRecipeName.value.trim()) || "";
            if (!name) { showBulkError("রেসিপির নাম দিন"); return; }
            const recipes = loadAllRecipes();
            const existing = recipes.findIndex(r => r.name === name);
            const entry = { name, settings: getCurrentSettings(), savedAt: new Date().toISOString() };
            if (existing >= 0) recipes[existing] = entry; else recipes.push(entry);
            saveAllRecipes(recipes);
            refreshRecipeSelect();
            if (bulkRecipeSelect) bulkRecipeSelect.value = name;
            showToast("রেসিপি \"" + name + "\" সেভ হয়েছে");
        });
    }

    if (bulkLoadRecipeBtn) {
        bulkLoadRecipeBtn.addEventListener("click", () => {
            const name = bulkRecipeSelect && bulkRecipeSelect.value;
            if (!name) { showBulkError("লোড করার জন্য একটা রেসিপি বাছাই করুন"); return; }
            const recipe = loadAllRecipes().find(r => r.name === name);
            if (!recipe) { showBulkError("রেসিপি পাওয়া যায়নি"); return; }
            applySettings(recipe.settings);
            showToast("রেসিপি \"" + name + "\" লোড হয়েছে");
        });
    }

    if (bulkDeleteRecipeBtn) {
        bulkDeleteRecipeBtn.addEventListener("click", () => {
            const name = bulkRecipeSelect && bulkRecipeSelect.value;
            if (!name) { showBulkError("মুছতে প্রথমে একটা রেসিপি বাছাই করুন"); return; }
            if (!confirm("\"" + name + "\" রেসিপিটি মুছে ফেলবেন?")) return;
            saveAllRecipes(loadAllRecipes().filter(r => r.name !== name));
            refreshRecipeSelect();
            showToast("রেসিপি \"" + name + "\" মুছে ফেলা হয়েছে");
        });
    }

    // ---------- Process & ZIP ----------
    function waitForImage(item) {
        if (item.img) return Promise.resolve(item.img);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { item.img = img; resolve(img); };
            img.onerror = reject;
            img.src = item.url;
        });
    }

    function blobFromCanvas(canvasEl, mime, quality) {
        return new Promise(resolve =>
            quality !== undefined
                ? canvasEl.toBlob(resolve, mime, quality)
                : canvasEl.toBlob(resolve, mime)
        );
    }

    async function applyBulkBgRemoveIfNeeded(item, img) {
        if (!bulkApplyBgRemove || !bulkApplyBgRemove.checked) return { image: img, hasTransparency: false };
        if (typeof window.removeBackgroundAI !== "function") return { image: img, hasTransparency: false };
        const apiKey = (localStorage.getItem("removebg_api_key") || "").trim();
        if (!apiKey) return { image: img, hasTransparency: false };
        try {
            const resultBlob = await window.removeBackgroundAI(item.file, apiKey);
            const removedImg = await new Promise((resolve, reject) => {
                const url = URL.createObjectURL(resultBlob);
                const im = new Image();
                im.onload = () => resolve(im);
                im.onerror = reject;
                im.src = url;
            });
            if (bulkBgReplaceColor && bulkBgReplaceColor.checked) {
                const w = removedImg.naturalWidth || removedImg.width;
                const h = removedImg.naturalHeight || removedImg.height;
                const off = document.createElement("canvas");
                off.width = w; off.height = h;
                const octx = off.getContext("2d");
                octx.fillStyle = (bulkBgColor && bulkBgColor.value) || "#ffffff";
                octx.fillRect(0, 0, w, h);
                octx.drawImage(removedImg, 0, 0, w, h);
                return { image: off, hasTransparency: false };
            }
            return { image: removedImg, hasTransparency: true };
        } catch (err) {
            showBulkError("\"" + item.file.name + "\" থেকে ব্যাকগ্রাউন্ড রিমুভ করা যায়নি, মূল ছবি দিয়ে বাকি প্রসেস চলছে");
            return { image: img, hasTransparency: false };
        }
    }

    function applyBulkWatermarkIfNeeded(img) {
        if (!bulkApplyWatermark || !bulkApplyWatermark.checked) return img;
        const wm = (typeof window.getWatermarkSettings === "function") ? window.getWatermarkSettings() : null;
        if (!wm || !wm.enabled || typeof window.drawWatermark !== "function") return img;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const off = document.createElement("canvas");
        off.width = w; off.height = h;
        const octx = off.getContext("2d");
        octx.drawImage(img, 0, 0, w, h);
        window.drawWatermark(octx, w, h, wm.settings, wm.logoImage);
        return off;
    }

    function applyBulkUpscaleIfNeeded(img) {
        if (!bulkApplyUpscale || !bulkApplyUpscale.checked) return img;
        if (typeof window.applyLocalUpscaleToCanvas !== "function" || typeof window.getUpscaleSettings !== "function") return img;
        const settings = window.getUpscaleSettings();
        const result = window.applyLocalUpscaleToCanvas(img, settings.factor, settings.sharpenAmount, 6000);
        return result.canvas;
    }

    function preprocessBulkImage(img) {
        return applyBulkWatermarkIfNeeded(applyBulkUpscaleIfNeeded(img));
    }

    function triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    bulkProcessBtn.addEventListener("click", async () => {
        if (!items.length || !selectedPreset || typeof window.renderSocialCanvas !== "function") return;
        const useZip = typeof JSZip !== "undefined";
        const mode = getBulkMode();
        const preset = selectedPreset;

        bulkProcessBtn.disabled = true;
        bulkClearBtn.disabled = true;
        bulkProgress.style.display = "block";
        bulkProgressFill.style.width = "0%";
        bulkProgressLabel.textContent = "প্রসেস হচ্ছে... 0 / " + items.length;

        const zip = useZip ? new JSZip() : null;
        const usedNames = new Set();
        let successCount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                const img = await waitForImage(item);
                const bgResult = await applyBulkBgRemoveIfNeeded(item, img);
                item._exportMeta = { hasTransparency: bgResult.hasTransparency };
                const preprocessed = preprocessBulkImage(bgResult.image);
                const rendered = window.renderSocialCanvas(preprocessed, preset.w, preset.h, mode);
                const fmt = getOutputFormat(bgResult.hasTransparency);
                const blob = await blobFromCanvas(rendered, fmt.mime, fmt.quality);
                const fileName = generateFileName(item, i, preset, usedNames);
                usedNames.add(fileName);
                if (useZip) {
                    zip.file(fileName, blob);
                } else {
                    triggerDownload(blob, fileName);
                    await new Promise(res => setTimeout(res, 350));
                }
                successCount++;
                if (item.thumbEl) item.thumbEl.classList.add("done");
            } catch (err) {
                showBulkError("\"" + item.file.name + "\" প্রসেস করতে সমস্যা হয়েছে, বাদ দেওয়া হলো");
            }
            const pct = Math.round(((i + 1) / items.length) * 100);
            bulkProgressFill.style.width = pct + "%";
            bulkProgressLabel.textContent = "প্রসেস হচ্ছে... " + (i + 1) + " / " + items.length;
        }

        const fmtLabel = (bulkOutputFormat && bulkOutputFormat.value !== "auto") ? " (" + bulkOutputFormat.value.toUpperCase() + ")" : "";

        if (useZip && successCount > 0) {
            bulkProgressLabel.textContent = "ZIP তৈরি হচ্ছে...";
            try {
                const zipBlob = await zip.generateAsync({ type: "blob" });
                const zipName = (selectedPreset ? selectedPreset.id : "bulk") + "_export.zip";
                triggerDownload(zipBlob, zipName);
                bulkProgressLabel.textContent = "সম্পন্ন! " + successCount + "টি ছবি" + fmtLabel + " ZIP আকারে ডাউনলোড হয়েছে";
            } catch (err) {
                showBulkError("ZIP তৈরি করতে সমস্যা হয়েছে, আলাদাভাবে ডাউনলোড করা হচ্ছে...");
                for (const [fileName, fileObj] of Object.entries(zip.files)) {
                    if (fileObj.dir) continue;
                    const b = await fileObj.async("blob");
                    triggerDownload(b, fileName);
                    await new Promise(res => setTimeout(res, 350));
                }
            }
        } else if (!useZip && successCount > 0) {
            bulkProgressLabel.textContent = "সম্পন্ন! " + successCount + "টি ছবি" + fmtLabel + " ডাউনলোড হয়েছে";
        } else {
            bulkProgressLabel.textContent = "কোনো ছবি প্রসেস করা যায়নি";
        }
        bulkProcessBtn.disabled = false;
        bulkClearBtn.disabled = false;
    });
})();