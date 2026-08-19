// ================================================================
// Text / Logo Watermark — shared by app.js (single image, Phase 9)
// and bulk.js (optional "apply to every bulk image" checkbox).
// Same sharing pattern as social-presets.js: everything needed by
// other files is hung off `window`.
// ================================================================
(function () {
    'use strict';

    // computeWatermarkLayout() is a PURE function — plain numbers in,
    // plain numbers out, no canvas/DOM — so it's unit-testable standalone
    // in plain Node (same pattern as floodFillMask()/parseExifOrientation()
    // /buildFilterString()). It turns user-facing settings (percentages,
    // 0–1 anchor fractions) into concrete pixel geometry for a canvas of
    // size canvasWidth x canvasHeight.
    //
    // settings shape:
    //   textEnabled, text, fontSizeRatio (0–1, relative to min(w,h)),
    //   textPos: { fx, fy } (0–1, anchor point as a fraction of the canvas),
    //   logoEnabled, logoScaleRatio (0–1, relative to canvasWidth),
    //   logoAspect (logo naturalHeight / naturalWidth),
    //   logoPos: { fx, fy }
    function computeWatermarkLayout(canvasWidth, canvasHeight, settings) {
        const layout = {};
        settings = settings || {};
        const refDim = Math.min(canvasWidth, canvasHeight);

        if (settings.textEnabled) {
            const fontPx = Math.max(8, Math.round(refDim * (settings.fontSizeRatio || 0.06)));
            const pos = settings.textPos || {};
            const fx = (typeof pos.fx === 'number') ? pos.fx : 0.5;
            const fy = (typeof pos.fy === 'number') ? pos.fy : 0.9;
            layout.text = {
                fontPx,
                x: Math.round(fx * canvasWidth),
                y: Math.round(fy * canvasHeight)
            };
        }

        if (settings.logoEnabled) {
            const width = Math.max(4, Math.round(canvasWidth * (settings.logoScaleRatio || 0.2)));
            const aspect = settings.logoAspect > 0 ? settings.logoAspect : 1;
            const height = Math.max(4, Math.round(width * aspect));
            const pos = settings.logoPos || {};
            const fx = (typeof pos.fx === 'number') ? pos.fx : 0.88;
            const fy = (typeof pos.fy === 'number') ? pos.fy : 0.88;
            layout.logo = {
                width,
                height,
                x: Math.round(fx * canvasWidth),
                y: Math.round(fy * canvasHeight)
            };
        }

        return layout;
    }

    // Not pure (issues real canvas calls) — burns the text/logo into `ctx`
    // (which must already have the base photo drawn) using the geometry
    // from computeWatermarkLayout(). logoImg may be a real <img>, a
    // <canvas>, or null/undefined when only a text watermark is active.
    function drawWatermark(ctx, canvasWidth, canvasHeight, settings, logoImg) {
        settings = settings || {};
        const layout = computeWatermarkLayout(canvasWidth, canvasHeight, settings);

        if (layout.text && settings.text) {
            ctx.save();
            ctx.globalAlpha = (settings.textOpacity != null ? settings.textOpacity : 100) / 100;
            ctx.fillStyle = settings.color || '#ffffff';
            ctx.font = `bold ${layout.text.fontPx}px ${settings.fontFamily || "'Inter', sans-serif"}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // A soft shadow keeps the text legible over busy/light photo areas.
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = Math.max(2, layout.text.fontPx * 0.08);
            ctx.fillText(settings.text, layout.text.x, layout.text.y);
            ctx.restore();
        }

        if (layout.logo && logoImg) {
            ctx.save();
            ctx.globalAlpha = (settings.logoOpacity != null ? settings.logoOpacity : 100) / 100;
            ctx.drawImage(
                logoImg,
                layout.logo.x - layout.logo.width / 2,
                layout.logo.y - layout.logo.height / 2,
                layout.logo.width,
                layout.logo.height
            );
            ctx.restore();
        }

        return layout;
    }

    window.computeWatermarkLayout = computeWatermarkLayout;
    window.drawWatermark = drawWatermark;
})();
