// ================================================================
// Social Media Size Presets — shared by app.js (single image) and
// bulk.js (batch resize). Sizes follow Meta's current published ad
// & organic image specs for Facebook.
// ================================================================
(function () {
    'use strict';

    window.SOCIAL_PRESETS = [
        {
            id: 'warisha_product_3_4',
            label: '👑 Warisha Fashion (Website 3:4)',
            w: 900,
            h: 1200,
            ratioLabel: '3:4',
            note: 'ওয়ারিশা ফ্যাশন ওয়েবসাইটে প্রোডাক্ট আপলোড করার আদর্শ সাইজ (ফুল ফ্রেম ফিট, কোনো গ্যাপ থাকবে না)'
        },
        {
            id: 'warisha_product_4_5',
            label: '👑 Warisha Fashion (Website 4:5)',
            w: 1080,
            h: 1350,
            ratioLabel: '4:5',
            note: 'ওয়েবসাইট ও ফেসবুক বুস্টিং উভয়ের জন্য প্রিমিয়াম পোর্ট্রেট সাইজ'
        },
        {
            id: 'warisha_square_1_1',
            label: '👑 Warisha Fashion (Square 1:1)',
            w: 1080,
            h: 1080,
            ratioLabel: '1:1',
            note: 'ওয়েবসাইট ও সোশ্যাল মিডিয়া ক্যাটালগের পারফেক্ট স্কয়ার সাইজ'
        },
        {
            id: 'fb_feed_portrait',
            label: 'Facebook Feed (পোর্ট্রেট)',
            w: 1080,
            h: 1350,
            ratioLabel: '4:5',
            note: 'নিউজফিড বুস্ট — মোবাইলে সবচেয়ে বেশি জায়গা নেয়, রিকমেন্ডেড'
        },
        {
            id: 'fb_feed_square',
            label: 'Facebook Feed (স্কয়ার)',
            w: 1080,
            h: 1080,
            ratioLabel: '1:1',
            note: 'নিউজফিড পোস্ট/অ্যাড — সবচেয়ে নিরাপদ, সব প্লেসমেন্টে ভালো ফিট হয়'
        },
        {
            id: 'fb_reels',
            label: 'Facebook Reels / Story',
            w: 1080,
            h: 1920,
            ratioLabel: '9:16',
            note: 'রিলস, স্টোরি, বুস্ট ভিডিও/ইমেজ অ্যাড (ফুল স্ক্রিন)'
        },
        {
            id: 'fb_feed_landscape',
            label: 'Facebook Feed (ল্যান্ডস্কেপ)',
            w: 1080,
            h: 565,
            ratioLabel: '1.91:1',
            note: 'লিংক/ওয়েবসাইট ক্লিক অ্যাড, কভার ফটোর ধরনের ছবি'
        }
    ];

    /**
     * Renders `img` onto a brand-new canvas sized exactly targetW x targetH.
     *
     * mode 'fit'  -> Nothing from the original photo is ever cut off. The
     *                full image is scaled down to fit completely inside the
     *                frame, and any leftover space (top/bottom or left/right)
     *                is filled with a softly blurred, darkened copy of the
     *                same image as a background — similar to Instagram's
     *                "add background" behaviour. Because the exported file
     *                already matches the exact placement ratio, Facebook's
     *                own auto-crop (which is what slices off the sides during
     *                Boost/Ads Manager delivery) has nothing left to crop.
     *
     * mode 'fill' -> Classic center-crop "cover" fill — frame is filled
     *                edge-to-edge but parts of the photo outside the target
     *                ratio are cut off (same behavior as a normal crop tool).
     */
    function renderSocialCanvas(img, targetW, targetH, mode) {
        const out = document.createElement('canvas');
        out.width = targetW;
        out.height = targetH;
        const octx = out.getContext('2d');

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const srcRatio = srcW / srcH;
        const targetRatio = targetW / targetH;

        if (mode === 'fill') {
            let sx, sy, sw, sh;
            if (srcRatio > targetRatio) {
                sh = srcH;
                sw = sh * targetRatio;
                sx = (srcW - sw) / 2;
                sy = 0;
            } else {
                sw = srcW;
                sh = sw / targetRatio;
                sx = 0;
                sy = (srcH - sh) / 2;
            }
            octx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
            return out;
        }

        // ---- 'fit' mode ----
        // 1) Blurred cover background so there's never an empty gap.
        try {
            octx.save();
            octx.filter = 'blur(28px) brightness(0.55)';
            let bsx, bsy, bsw, bsh;
            if (srcRatio > targetRatio) {
                bsh = srcH; bsw = bsh * targetRatio; bsx = (srcW - bsw) / 2; bsy = 0;
            } else {
                bsw = srcW; bsh = bsw / targetRatio; bsx = 0; bsy = (srcH - bsh) / 2;
            }
            // Slightly oversized draw so the blurred edge never shows a hard border.
            octx.drawImage(
                img, bsx, bsy, bsw, bsh,
                -targetW * 0.06, -targetH * 0.06, targetW * 1.12, targetH * 1.12
            );
            octx.restore();
        } catch (e) {
            // ctx.filter unsupported (very old browser) — fall back to a plain
            // dark background so the app still works, just without the blur.
            octx.fillStyle = '#111111';
            octx.fillRect(0, 0, targetW, targetH);
        }

        // 2) Foreground: the entire original photo, fully visible ("contain").
        let dw, dh;
        if (srcRatio > targetRatio) {
            dw = targetW;
            dh = dw / srcRatio;
        } else {
            dh = targetH;
            dw = dh * srcRatio;
        }
        const dx = (targetW - dw) / 2;
        const dy = (targetH - dh) / 2;
        octx.drawImage(img, 0, 0, srcW, srcH, dx, dy, dw, dh);

        return out;
    }

    window.renderSocialCanvas = renderSocialCanvas;
})();
