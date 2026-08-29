(()=>{
  const $=id=>document.getElementById(id);
  const select=$('elementAnimation');
  if(!select)return;

  function getAnimFrames(name, rot = 0) {
    const r = Number(rot) || 0;
    const rotStr = r ? (' rotate(' + r + 'deg)') : '';
    const baseMap = {
      // ── Entrance Animations ──────────────────────────
      fade: [
        { opacity: 0, transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, transform: 'rotate(' + r + 'deg)' }
      ],
      appear: [
        { opacity: 0, transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, transform: 'rotate(' + r + 'deg)' }
      ],
      slideLeft: [
        { opacity: 0, transform: 'translateX(-90px)' + rotStr },
        { opacity: 1, transform: 'translateX(0)' + rotStr }
      ],
      slideRight: [
        { opacity: 0, transform: 'translateX(90px)' + rotStr },
        { opacity: 1, transform: 'translateX(0)' + rotStr }
      ],
      slideUp: [
        { opacity: 0, transform: 'translateY(70px)' + rotStr },
        { opacity: 1, transform: 'translateY(0)' + rotStr }
      ],
      slideDown: [
        { opacity: 0, transform: 'translateY(-70px)' + rotStr },
        { opacity: 1, transform: 'translateY(0)' + rotStr }
      ],
      zoom: [
        { opacity: 0, transform: 'scale(.2)' + rotStr },
        { opacity: 1, transform: 'scale(1)' + rotStr }
      ],
      pop: [
        { opacity: 0, transform: 'scale(.2)' + rotStr },
        { opacity: 1, transform: 'scale(1.15)' + rotStr, offset: 0.7 },
        { opacity: 1, transform: 'scale(1)' + rotStr }
      ],
      flipX: [
        { opacity: 0, transform: 'perspective(500px) rotateX(90deg)' + rotStr },
        { opacity: 1, transform: 'perspective(500px) rotateX(0deg)' + rotStr }
      ],
      flipY: [
        { opacity: 0, transform: 'perspective(500px) rotateY(90deg)' + rotStr },
        { opacity: 1, transform: 'perspective(500px) rotateY(0deg)' + rotStr }
      ],
      wipeLeft: [
        { opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' }
      ],
      wipeRight: [
        { opacity: 0, clipPath: 'inset(0 0 0 100%)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' }
      ],
      wipeDown: [
        { opacity: 0, clipPath: 'inset(0 0 100% 0)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' }
      ],
      wipeUp: [
        { opacity: 0, clipPath: 'inset(100% 0 0 0)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' }
      ],
      curtainWipe: [
        { opacity: 0, clipPath: 'circle(0% at 50% 50%)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 1, clipPath: 'circle(100% at 50% 50%)', transform: 'rotate(' + r + 'deg)' }
      ],
      zoomRotate: [
        { opacity: 0, transform: 'scale(0.1) rotate(' + (r - 180) + 'deg)' },
        { opacity: 1, transform: 'scale(1) rotate(' + r + 'deg)' }
      ],
      elasticDrop: [
        { opacity: 0, transform: 'translateY(-140px) scale(0.7, 1.3)' + rotStr },
        { opacity: 1, transform: 'translateY(18px) scale(1.12, 0.88)' + rotStr, offset: 0.65 },
        { opacity: 1, transform: 'translateY(-6px) scale(0.96, 1.04)' + rotStr, offset: 0.85 },
        { opacity: 1, transform: 'translateY(0) scale(1, 1)' + rotStr }
      ],
      swingDown: [
        { opacity: 0, transform: 'perspective(600px) rotateX(-90deg)' + rotStr, transformOrigin: 'top center' },
        { opacity: 1, transform: 'perspective(600px) rotateX(25deg)' + rotStr, transformOrigin: 'top center', offset: 0.6 },
        { opacity: 1, transform: 'perspective(600px) rotateX(-10deg)' + rotStr, transformOrigin: 'top center', offset: 0.8 },
        { opacity: 1, transform: 'perspective(600px) rotateX(0deg)' + rotStr, transformOrigin: 'top center' }
      ],
      blurFadeIn: [
        { opacity: 0, filter: 'blur(20px)', transform: 'scale(1.15)' + rotStr },
        { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' + rotStr }
      ],
      stamp: [
        { opacity: 0, transform: 'scale(3)' + rotStr },
        { opacity: 1, transform: 'scale(1)' + rotStr, offset: 0.6 },
        { opacity: 1, transform: 'scale(1.08)' + rotStr, offset: 0.8 },
        { opacity: 1, transform: 'scale(1)' + rotStr }
      ],
      rollIn: [
        { opacity: 0, transform: 'translateX(-120px) rotate(' + (r - 120) + 'deg)' },
        { opacity: 1, transform: 'translateX(0) rotate(' + r + 'deg)' }
      ],
      lightSpeed: [
        { opacity: 0, transform: 'translateX(120px) skewX(-25deg)' + rotStr },
        { opacity: 1, transform: 'translateX(-15px) skewX(10deg)' + rotStr, offset: 0.7 },
        { opacity: 1, transform: 'translateX(0) skewX(0deg)' + rotStr }
      ],
      rubberBandIn: [
        { opacity: 0, transform: 'scale(0.3)' + rotStr },
        { opacity: 1, transform: 'scale(1.25, 0.75)' + rotStr, offset: 0.5 },
        { opacity: 1, transform: 'scale(0.75, 1.25)' + rotStr, offset: 0.7 },
        { opacity: 1, transform: 'scale(1.1, 0.9)' + rotStr, offset: 0.85 },
        { opacity: 1, transform: 'scale(1, 1)' + rotStr }
      ],
      spiralIn: [
        { opacity: 0, filter: 'blur(8px)', transform: 'scale(0.1) rotate(' + (r + 360) + 'deg)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'scale(1) rotate(' + r + 'deg)' }
      ],
      backInDown: [
        { opacity: 0.2, transform: 'translateY(-180px) scale(0.6)' + rotStr },
        { opacity: 1, transform: 'translateY(12px) scale(1.05)' + rotStr, offset: 0.7 },
        { opacity: 1, transform: 'translateY(0) scale(1)' + rotStr }
      ],
      backInUp: [
        { opacity: 0.2, transform: 'translateY(180px) scale(0.6)' + rotStr },
        { opacity: 1, transform: 'translateY(-12px) scale(1.05)' + rotStr, offset: 0.7 },
        { opacity: 1, transform: 'translateY(0) scale(1)' + rotStr }
      ],

      // ── Emphasis / Continuous / Attention Animations ──
      pulse: [
        { transform: 'scale(1)' + rotStr },
        { transform: 'scale(1.12)' + rotStr, offset: 0.5 },
        { transform: 'scale(1)' + rotStr }
      ],
      bounce: [
        { transform: 'translateY(0)' + rotStr },
        { transform: 'translateY(-28px)' + rotStr, offset: 0.4 },
        { transform: 'translateY(0)' + rotStr, offset: 0.7 },
        { transform: 'translateY(-12px)' + rotStr, offset: 0.85 },
        { transform: 'translateY(0)' + rotStr }
      ],
      spin: [
        { transform: 'rotate(' + r + 'deg)' },
        { transform: 'rotate(' + (r + 360) + 'deg)' }
      ],
      spin3d: [
        { transform: 'perspective(700px) rotateY(0deg)' + rotStr },
        { transform: 'perspective(700px) rotateY(360deg)' + rotStr }
      ],
      flip3dX: [
        { transform: 'perspective(700px) rotateX(0deg)' + rotStr },
        { transform: 'perspective(700px) rotateX(360deg)' + rotStr }
      ],
      swing: [
        { transform: 'rotate(' + r + 'deg)' },
        { transform: 'rotate(' + (r + 15) + 'deg)', offset: 0.25 },
        { transform: 'rotate(' + (r - 10) + 'deg)', offset: 0.5 },
        { transform: 'rotate(' + (r + 6) + 'deg)', offset: 0.75 },
        { transform: 'rotate(' + r + 'deg)' }
      ],
      float: [
        { transform: 'translateY(0)' + rotStr },
        { transform: 'translateY(-18px)' + rotStr, offset: 0.5 },
        { transform: 'translateY(0)' + rotStr }
      ],
      jello: [
        { transform: 'skew(0)' + rotStr },
        { transform: 'skew(-12deg,-12deg)' + rotStr, offset: 0.3 },
        { transform: 'skew(7deg,7deg)' + rotStr, offset: 0.6 },
        { transform: 'skew(-3deg,-3deg)' + rotStr, offset: 0.8 },
        { transform: 'skew(0)' + rotStr }
      ],
      shake: [
        { transform: 'translateX(0)' + rotStr },
        { transform: 'translateX(-18px)' + rotStr, offset: 0.2 },
        { transform: 'translateX(18px)' + rotStr, offset: 0.4 },
        { transform: 'translateX(-12px)' + rotStr, offset: 0.6 },
        { transform: 'translateX(12px)' + rotStr, offset: 0.8 },
        { transform: 'translateX(0)' + rotStr }
      ],
      heartbeat: [
        { transform: 'scale(1)' + rotStr },
        { transform: 'scale(1.18)' + rotStr, offset: 0.14 },
        { transform: 'scale(1)' + rotStr, offset: 0.28 },
        { transform: 'scale(1.24)' + rotStr, offset: 0.42 },
        { transform: 'scale(1)' + rotStr, offset: 0.7 },
        { transform: 'scale(1)' + rotStr }
      ],
      glowPulse: [
        { filter: 'drop-shadow(0 0 0 rgba(79,141,247,0)) brightness(1)' },
        { filter: 'drop-shadow(0 0 20px rgba(79,141,247,0.95)) brightness(1.3)', offset: 0.5 },
        { filter: 'drop-shadow(0 0 0 rgba(79,141,247,0)) brightness(1)' }
      ],
      tilt3d: [
        { transform: 'perspective(600px) rotateX(0deg) rotateY(0deg)' + rotStr },
        { transform: 'perspective(600px) rotateX(15deg) rotateY(-18deg)' + rotStr, offset: 0.33 },
        { transform: 'perspective(600px) rotateX(-12deg) rotateY(15deg)' + rotStr, offset: 0.66 },
        { transform: 'perspective(600px) rotateX(0deg) rotateY(0deg)' + rotStr }
      ],
      tada: [
        { transform: 'scale(1)' + rotStr },
        { transform: 'scale(0.9) rotate(' + (r - 4) + 'deg)', offset: 0.15 },
        { transform: 'scale(1.15) rotate(' + (r + 4) + 'deg)', offset: 0.35 },
        { transform: 'scale(1.15) rotate(' + (r - 4) + 'deg)', offset: 0.55 },
        { transform: 'scale(1.15) rotate(' + (r + 3) + 'deg)', offset: 0.75 },
        { transform: 'scale(1) rotate(' + r + 'deg)' }
      ],
      wobble: [
        { transform: 'translateX(0) rotate(' + r + 'deg)' },
        { transform: 'translateX(-15px) rotate(' + (r - 5) + 'deg)', offset: 0.2 },
        { transform: 'translateX(15px) rotate(' + (r + 4) + 'deg)', offset: 0.4 },
        { transform: 'translateX(-10px) rotate(' + (r - 3) + 'deg)', offset: 0.6 },
        { transform: 'translateX(8px) rotate(' + (r + 2) + 'deg)', offset: 0.8 },
        { transform: 'translateX(0) rotate(' + r + 'deg)' }
      ],
      rubberBand: [
        { transform: 'scale3d(1, 1, 1)' + rotStr },
        { transform: 'scale3d(1.25, 0.75, 1)' + rotStr, offset: 0.3 },
        { transform: 'scale3d(0.75, 1.25, 1)' + rotStr, offset: 0.4 },
        { transform: 'scale3d(1.15, 0.85, 1)' + rotStr, offset: 0.6 },
        { transform: 'scale3d(0.95, 1.05, 1)' + rotStr, offset: 0.8 },
        { transform: 'scale3d(1, 1, 1)' + rotStr }
      ],
      flash: [
        { opacity: 1 },
        { opacity: 0.15, offset: 0.25 },
        { opacity: 1, offset: 0.5 },
        { opacity: 0.15, offset: 0.75 },
        { opacity: 1 }
      ],
      glitch: [
        { transform: 'translate(0, 0)' + rotStr },
        { transform: 'translate(-6px, 3px) skewX(4deg)' + rotStr, offset: 0.2 },
        { transform: 'translate(6px, -3px) skewX(-4deg)' + rotStr, offset: 0.4 },
        { transform: 'translate(-4px, -2px) skewX(3deg)' + rotStr, offset: 0.6 },
        { transform: 'translate(4px, 2px) skewX(-2deg)' + rotStr, offset: 0.8 },
        { transform: 'translate(0, 0)' + rotStr }
      ],
      breath: [
        { transform: 'scale(1)' + rotStr, filter: 'brightness(1)' },
        { transform: 'scale(1.06)' + rotStr, filter: 'brightness(1.15)', offset: 0.5 },
        { transform: 'scale(1)' + rotStr, filter: 'brightness(1)' }
      ],
      vibrate: [
        { transform: 'translate(0, 0)' + rotStr },
        { transform: 'translate(-3px, 2px)' + rotStr, offset: 0.15 },
        { transform: 'translate(3px, -2px)' + rotStr, offset: 0.35 },
        { transform: 'translate(-3px, -2px)' + rotStr, offset: 0.55 },
        { transform: 'translate(3px, 2px)' + rotStr, offset: 0.75 },
        { transform: 'translate(0, 0)' + rotStr }
      ],
      shimmer: [
        { filter: 'brightness(1) contrast(1)' },
        { filter: 'brightness(1.7) contrast(1.25)', offset: 0.5 },
        { filter: 'brightness(1) contrast(1)' }
      ],

      // ── Exit Animations ──────────────────────────────
      fadeOut: [
        { opacity: 1, transform: 'rotate(' + r + 'deg)' },
        { opacity: 0, transform: 'rotate(' + r + 'deg)' }
      ],
      zoomOut: [
        { opacity: 1, transform: 'scale(1)' + rotStr },
        { opacity: 0, transform: 'scale(.2)' + rotStr }
      ],
      slideOutRight: [
        { opacity: 1, transform: 'translateX(0)' + rotStr },
        { opacity: 0, transform: 'translateX(120px)' + rotStr }
      ],
      slideOutLeft: [
        { opacity: 1, transform: 'translateX(0)' + rotStr },
        { opacity: 0, transform: 'translateX(-120px)' + rotStr }
      ],
      slideOutUp: [
        { opacity: 1, transform: 'translateY(0)' + rotStr },
        { opacity: 0, transform: 'translateY(-100px)' + rotStr }
      ],
      slideOutDown: [
        { opacity: 1, transform: 'translateY(0)' + rotStr },
        { opacity: 0, transform: 'translateY(100px)' + rotStr }
      ],
      spinOut: [
        { opacity: 1, transform: 'scale(1) rotate(' + r + 'deg)' },
        { opacity: 0, transform: 'scale(0.1) rotate(' + (r + 360) + 'deg)' }
      ],
      flipOutX: [
        { opacity: 1, transform: 'perspective(500px) rotateX(0deg)' + rotStr },
        { opacity: 0, transform: 'perspective(500px) rotateX(90deg)' + rotStr }
      ],
      flipOutY: [
        { opacity: 1, transform: 'perspective(500px) rotateY(0deg)' + rotStr },
        { opacity: 0, transform: 'perspective(500px) rotateY(90deg)' + rotStr }
      ],
      blurFadeOut: [
        { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' + rotStr },
        { opacity: 0, filter: 'blur(20px)', transform: 'scale(0.85)' + rotStr }
      ],
      shrinkPop: [
        { opacity: 1, transform: 'scale(1)' + rotStr },
        { opacity: 1, transform: 'scale(1.2)' + rotStr, offset: 0.3 },
        { opacity: 0, transform: 'scale(0.1)' + rotStr }
      ],
      wipeOutLeft: [
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 0, clipPath: 'inset(0 100% 0 0)', transform: 'rotate(' + r + 'deg)' }
      ],
      wipeOutRight: [
        { opacity: 1, clipPath: 'inset(0 0 0 0)', transform: 'rotate(' + r + 'deg)' },
        { opacity: 0, clipPath: 'inset(0 0 0 100%)', transform: 'rotate(' + r + 'deg)' }
      ]
    };
    return baseMap[name] || baseMap.fade;
  }

  window.getAnimFrames = getAnimFrames;
  window.animFrames = getAnimFrames('fade', 0);

  function previewLiveAnimation(el) {
    const e = el || (typeof selectedEl === 'function' ? selectedEl() : null);
    if (!e || !e.id || !e.animation || e.animation === 'none') return;
    const slide = $('slide');
    if (!slide) return;
    const node = slide.querySelector('.element[data-id="' + e.id + '"]') || slide.querySelector('[data-id="' + e.id + '"]');
    const f = getAnimFrames(e.animation, e.rotation);
    if (!node || !f) return;

    node.getAnimations().forEach(a => a.cancel());
    const dur = Math.max(0.1, Number(e.animationDuration) || 0.6) * 1000;
    const del = Math.max(0, Number(e.animationDelay) || 0) * 1000;

    const anim = node.animate(f, {
      duration: dur,
      delay: del,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      fill: 'both'
    });

    if (!e.animationLoop) {
      anim.onfinish = () => {
        setTimeout(() => {
          if (node && node.style) {
            node.style.opacity = '';
            node.style.transform = (e.rotation ? ('rotate(' + e.rotation + 'deg)') : '');
            node.style.clipPath = '';
            node.style.filter = '';
            node.style.transformOrigin = '';
          }
        }, 100);
      };
    }
  }

  window.previewElementAnimation = previewLiveAnimation;

  const inspector = $('animationInspector');
  if (inspector && !$('btnPreviewAnimation')) {
    const pBtn = document.createElement('button');
    pBtn.id = 'btnPreviewAnimation';
    pBtn.type = 'button';
    pBtn.textContent = '▶ Play / Replay Animation';
    pBtn.style.cssText = 'width:100%;margin-top:10px;padding:8px;background:#1769e8;border:1px solid #79abff;border-radius:6px;color:#fff;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;';
    pBtn.onclick = () => previewLiveAnimation();
    inspector.appendChild(pBtn);
  }

  select.innerHTML = '<option value="none">None (কোনোটি নয়)</option>'
    + '<optgroup label="🌟 Entrance (প্রবেশ মোশন)">'
    + '<option value="fade">Fade In (সহজ ফেইড)</option>'
    + '<option value="appear">Appear (সরাসরি প্রকাশ)</option>'
    + '<option value="slideLeft">Slide Left (বাম থেকে)</option>'
    + '<option value="slideRight">Slide Right (ডান থেকে)</option>'
    + '<option value="slideUp">Rise Up (নিচ থেকে উপরে)</option>'
    + '<option value="slideDown">Drop Down (উপর থেকে নিচে)</option>'
    + '<option value="zoom">Zoom In (জুম ইন)</option>'
    + '<option value="pop">Pop / Bounce (পপ জাম্প)</option>'
    + '<option value="flipX">Flip In X (৩ডি ফ্লিপ X)</option>'
    + '<option value="flipY">Flip In Y (৩ডি ফ্লিপ Y)</option>'
    + '<option value="zoomRotate">🚀 Zoom & Spin In (স্পিন জুম)</option>'
    + '<option value="elasticDrop">⚡ Elastic Drop (ইলাস্টিক ড্রপ)</option>'
    + '<option value="swingDown">🪝 Swing Down (ঝুলে পড়া)</option>'
    + '<option value="curtainWipe">✨ Iris Circle Expand (সার্কেল উন্মোচন)</option>'
    + '<option value="wipeLeft">👉 Wipe from Left (বাম থেকে মোছা)</option>'
    + '<option value="wipeRight">👈 Wipe from Right (ডান থেকে মোছা)</option>'
    + '<option value="wipeDown">👇 Wipe from Top (উপর থেকে মোছা)</option>'
    + '<option value="wipeUp">☝️ Wipe from Bottom (নিচ থেকে মোছা)</option>'
    + '<option value="blurFadeIn">🌫️ Soft Blur In (সফট সিনেমাটিক ব্লার)</option>'
    + '<option value="stamp">🔨 Heavy Stamp (স্ট্যাম্প ইমপ্যাক্ট)</option>'
    + '<option value="rollIn">🌀 Roll In (ঘুরতে ঘুরতে আসা)</option>'
    + '<option value="lightSpeed">🏎️ Lightspeed In (লাইটস্পিড গতি)</option>'
    + '<option value="rubberBandIn">🎗️ Rubber Band Snap (রাবার ব্যান্ড স্ন্যাপ)</option>'
    + '<option value="spiralIn">🌀 Vortex Spiral (ঘূর্ণিঝড় স্পাইরাল)</option>'
    + '<option value="backInDown">🎯 Back In Drop (উঁচু থেকে ড্রপ)</option>'
    + '<option value="backInUp">🚀 Rocket Rise (রকেট রাইজ)</option>'
    + '</optgroup>'
    + '<optgroup label="💫 Emphasis & Continuous (আকর্ষণ ও লুপ মোশন)">'
    + '<option value="pulse">Pulse (ধীর স্পন্দন)</option>'
    + '<option value="heartbeat">💓 Heartbeat (হার্টবিট ডাবল পালস)</option>'
    + '<option value="bounce">Bounce (লাফানো)</option>'
    + '<option value="glowPulse">✨ Neon Glow Pulse (নিয়ন গ্লো পালস)</option>'
    + '<option value="tilt3d">🎴 Hologram 3D Tilt (হলোগ্রাম ৩ডি টিল্ট)</option>'
    + '<option value="spin">Spin (৩৬০° ঘূর্ণন)</option>'
    + '<option value="spin3d">3D Spin Y (৩ডি ঘূর্ণন Y)</option>'
    + '<option value="flip3dX">3D Flip X (৩ডি ফ্লিপ X)</option>'
    + '<option value="swing">Swing (দোলনা দোলন)</option>'
    + '<option value="float">Float (ভাসমান / হোভার)</option>'
    + '<option value="tada">🎉 Ta-Da (সারপ্রাইজ তা-দা)</option>'
    + '<option value="wobble">〰️ Wobble (দুলুনি ওয়েভ)</option>'
    + '<option value="jello">Jello (জেলির মত কম্পন)</option>'
    + '<option value="rubberBand">🪀 Rubber Band (ইলাস্টিক টান)</option>'
    + '<option value="shake">Shake (কাঁপাকাপি)</option>'
    + '<option value="glitch">👾 Cyber Glitch (সাইবার গ্লিচ)</option>'
    + '<option value="flash">⚡ Strobe Flash (ফ্ল্যাশ লাইট)</option>'
    + '<option value="breath">🌬️ Soft Breathing (শ্বাসপ্রশ্বাস স্কেল)</option>'
    + '<option value="vibrate">📳 Haptic Vibrate (মাইক্রো ভাইব্রেশন)</option>'
    + '<option value="shimmer">💎 Shimmer & Shine (চকচকে দ্যুতি)</option>'
    + '</optgroup>'
    + '<optgroup label="🚪 Exit (বিদায় মোশন)">'
    + '<option value="fadeOut">Fade Out (ফেইড আউট)</option>'
    + '<option value="zoomOut">Zoom Out (জুম আউট)</option>'
    + '<option value="slideOutRight">Slide Out Right (ডানে সরে যাওয়া)</option>'
    + '<option value="slideOutLeft">Slide Out Left (বামে সরে যাওয়া)</option>'
    + '<option value="slideOutUp">Shoot Up (উপরে উড়ে যাওয়া)</option>'
    + '<option value="slideOutDown">Drop Down Out (নিচে পড়ে যাওয়া)</option>'
    + '<option value="spinOut">🌀 Spin & Vanish (ঘুরতে ঘুরতে ভ্যানিশ)</option>'
    + '<option value="flipOutX">🔄 3D Flip Out X (৩ডি ফ্লিপ X)</option>'
    + '<option value="flipOutY">🔄 3D Flip Out Y (৩ডি ফ্লিপ Y)</option>'
    + '<option value="blurFadeOut">🌫️ Blur Out (ব্লার হয়ে মিলিয়ে যাওয়া)</option>'
    + '<option value="shrinkPop">💥 Shrink & Pop Out (ছোট হয়ে মিলিয়ে যাওয়া)</option>'
    + '<option value="wipeOutLeft">👈 Wipe Out Left (বামে মুছা)</option>'
    + '<option value="wipeOutRight">👉 Wipe Out Right (ডানে মুছা)</option>'
    + '</optgroup>';

  ['elementAnimation', 'animationDelay', 'animationDuration'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const e = typeof selectedEl === 'function' ? selectedEl() : null;
      if (e && e.animation && e.animation !== 'none') {
        setTimeout(() => previewLiveAnimation(e), 50);
      }
    });
    el.addEventListener('input', () => {
      const e = typeof selectedEl === 'function' ? selectedEl() : null;
      if (e && e.animation && e.animation !== 'none') {
        setTimeout(() => previewLiveAnimation(e), 50);
      }
    });
  });
})();