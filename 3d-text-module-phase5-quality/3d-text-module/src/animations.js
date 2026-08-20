// 3D Text Module — Phase 3: Animation System
// Preset animation library + easing functions.
//
// Deliberately framework-agnostic: no `three` import here at all. Every
// preset is a pure function of a single number `t` (already-eased progress)
// and returns plain-number offsets. main.js is the only place that touches
// live THREE.Mesh/Material objects — it takes what this module returns and
// applies it. Two reasons for splitting it out this way:
//   1. It means this file can be sanity-checked with plain `node`, no
//      browser/WebGL/bundler needed — useful in a sandbox session with no
//      npm registry access (see README "What's tested" for Phase 3).
//   2. Keeps main.js from growing a huge switch-statement inline.
//
// Contract every preset's `apply(t)` must satisfy:
//   - Returns { pos: [x,y,z], rot: [rx,ry,rz] (radians), scaleMul, opacityMul }
//   - This is an OFFSET/multiplier on top of the mesh's current
//     slider-configured base transform, not an absolute transform.
//   - At t=1 it must resolve to the neutral offset (pos 0,0,0 / rot 0,0,0 /
//     scaleMul 1 / opacityMul 1) so playback always *lands* on exactly what
//     the Text/Rotate panel sliders say, no matter which preset, duration,
//     delay, or easing was used to get there.
//   - `t` may be < 0 or > 1 when called with an overshoot easing
//     (easeOutElastic, easeOutBounce) — that overshoot is intentional, it's
//     what makes those read as elastic/bouncy rather than just "eased".
//     Presets should not clamp `t` internally for that reason; main.js
//     clamps the *display* values (opacity, scale) where an overshoot would
//     be visually wrong (e.g. opacity > 1).

const TAU = Math.PI * 2;

export const EASINGS = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOutElastic: (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const c4 = TAU / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      t -= 1.5 / d1;
      return n1 * t * t + 0.75;
    }
    if (t < 2.5 / d1) {
      t -= 2.25 / d1;
      return n1 * t * t + 0.9375;
    }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  },
};

export const EASING_LABELS = {
  linear: 'Linear',
  easeInQuad: 'Ease In',
  easeOutQuad: 'Ease Out',
  easeInOutQuad: 'Ease In-Out',
  easeOutElastic: 'Elastic (Out)',
  easeOutBounce: 'Bounce (Out)',
};

// Finalized library (Phase 3 follow-up, animation list finalization): 16
// effect presets + "none" = 17 buttons. Original 8 (fadeIn..wobble) plus 8
// new ones added below (zoomBlast..squashDrop) to round out common
// entrance/attention effects, well past the plan's original "5-10" target.
export const ANIMATION_PRESETS = {
  none: {
    label: 'কোনোটাই না',
    apply: () => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  fadeIn: {
    label: 'Fade In',
    apply: (t) => ({ pos: [0, 0, (1 - t) * -45], rot: [0, 0, 0], scaleMul: 0.88 + 0.12 * t, opacityMul: t }),
  },
  popIn: {
    label: 'Pop In',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: t, opacityMul: 1 }),
  },
  typewriter: {
    // The mesh layer uses `reveal` to show its pre-built glyph meshes one by
    // one. Keeping the transform neutral means the typed text lands exactly
    // on the user's configured position, rotation, and scale.
    label: 'Typewriter (এক অক্ষর করে)',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1, reveal: t }),
  },
  rotateIn: {
    label: 'Rotate In',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, TAU * (1 - t), 0], scaleMul: 1, opacityMul: 1 }),
  },
  flipIn: {
    label: 'Flip In',
    apply: (t) => ({ pos: [0, 0, 0], rot: [Math.PI * (1 - t), 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  slideInLeft: {
    label: 'Slide In (বাম থেকে)',
    apply: (t) => ({ pos: [-260 * (1 - t), 0, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  slideInRight: {
    label: 'Slide In (ডান থেকে)',
    apply: (t) => ({ pos: [260 * (1 - t), 0, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  dropIn: {
    label: 'Drop In (উপর থেকে)',
    apply: (t) => ({ pos: [0, 220 * (1 - t), 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  wobble: {
    // Not an entrance from an extreme — a decaying settle-in wiggle. Still
    // satisfies the t=1 contract because sin(TAU * integer) = 0.
    label: 'Wobble',
    apply: (t) => {
      const decay = Math.max(0, 1 - t);
      const wag = Math.sin(t * TAU * 3) * decay * 0.35; // radians
      return { pos: [0, 0, 0], rot: [0, 0, wag], scaleMul: 1, opacityMul: 1 };
    },
  },

  // ---- Added in the animation-list finalization pass ----

  zoomBlast: {
    // Starts big (as if flying toward camera) and settles to scale 1 — the
    // opposite read from popIn (which starts from nothing).
    label: 'Zoom Blast (কাছ থেকে)',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: 1 + 2 * (1 - t), opacityMul: 1 }),
  },
  riseUp: {
    label: 'Rise Up (নিচ থেকে)',
    apply: (t) => ({ pos: [0, -220 * (1 - t), 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  flipInY: {
    // Vertical-axis flip, distinct from flipIn's horizontal-axis (X) flip.
    label: 'Flip In (উল্লম্ব)',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, Math.PI * (1 - t), 0], scaleMul: 1, opacityMul: 1 }),
  },
  rotateInReverse: {
    // Same idea as rotateIn but spins the opposite direction — kept as a
    // separate preset (not a "reverse" checkbox) so it stays a single-click
    // choice like every other preset.
    label: 'Rotate In (উল্টো দিকে)',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, -TAU * (1 - t), 0], scaleMul: 1, opacityMul: 1 }),
  },
  spinPop: {
    // Combo preset: two full spins while scaling up from nothing.
    label: 'Spin + Pop',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, TAU * 2 * (1 - t), 0], scaleMul: t, opacityMul: 1 }),
  },
  swingIn: {
    // Pendulum-style decaying tilt on the X axis (front/back), distinct from
    // wobble's Z-axis (roll) wiggle. Starts at a wide swing and settles flat.
    label: 'Swing In (দোলনা)',
    apply: (t) => {
      const decay = Math.max(0, 1 - t);
      const swing = Math.sin((1 - t) * TAU * 1.5) * decay * 0.5; // radians
      return { pos: [0, 0, 0], rot: [swing, 0, 0], scaleMul: 1, opacityMul: 1 };
    },
  },
  diagonalIn: {
    // Slides in from the top-left corner (combined X+Y offset) rather than a
    // single axis like slideInLeft/dropIn.
    label: 'Diagonal In (কোণ থেকে)',
    apply: (t) => ({ pos: [-200 * (1 - t), 150 * (1 - t), 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  squashDrop: {
    // Drop In with a squash-and-stretch landing: falls from above, and right
    // as it lands the scale briefly squashes (wide/short) before settling to
    // exactly 1 — a cheap but effective "weight" cue. `landPhase` is clamped
    // to [0,1] and the squash uses sin(landPhase * PI), which is exactly 0
    // at both landPhase=0 (still falling) and landPhase=1 (t=1, landed) —
    // no floating-point residue to worry about at the t=1 neutral check.
    label: 'Drop In (স্কোয়াশ সহ)',
    apply: (t) => {
      const fall = 220 * (1 - t);
      const landPhase = Math.min(1, Math.max(0, (t - 0.85) / 0.15)); // 0→1 over the last 15%
      const squash = t >= 1 ? 0 : Math.sin(landPhase * Math.PI) * 0.25;
      return { pos: [0, fall, 0], rot: [0, 0, 0], scaleMul: 1 + squash, opacityMul: 1 };
    },
  },

  // ---- Video Editor থেকে যোগ করা — Entry/Exit ----

  slideUp: {
    // Slides in from below upward — the mirror of dropIn (which comes from above).
    label: 'Slide Up (নিচ থেকে উপরে)',
    apply: (t) => ({ pos: [0, -220 * (1 - t), 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: t }),
  },
  slideDown: {
    // Slides in from above downward — the mirror of riseUp.
    label: 'Slide Down (উপর থেকে নিচে)',
    apply: (t) => ({ pos: [0, 220 * (1 - t), 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: t }),
  },
  zoomOut: {
    // Starts tiny (far away) and grows to fill — opposite of zoomBlast.
    label: 'Zoom Out (ছোট থেকে বড়)',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: 0.05 + 0.95 * t, opacityMul: t }),
  },
  zoomPop: {
    // Quickly overshoot to 1.25× then settle — "snap in" energy. Keeps the
    // t=1 contract: at t=1 the overshoot term is 0 (sin(π)=0) so scaleMul=1.
    label: 'Zoom Pop (হঠাৎ পপ করে আসবে)',
    apply: (t) => {
      const overshoot = t < 1 ? Math.sin(t * Math.PI) * 0.3 * (1 - t) : 0;
      return { pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: t + overshoot, opacityMul: Math.min(1, t * 2) };
    },
  },
  glitch: {
    // Cyber-glitch: random-looking positional jitter + opacity flicker.
    // Uses deterministic sin harmonics so it's reproducible frame-to-frame
    // at a given `t` value (needed for export). Settles cleanly at t=1.
    label: '⚡ Cyber Glitch (সাইবার গ্লিচ)',
    apply: (t) => {
      const decay = Math.max(0, 1 - t);
      const jx = (Math.sin(t * 47.3) * 0.5 + Math.sin(t * 113.7) * 0.5) * decay * 18;
      const jy = (Math.sin(t * 61.1) * 0.5 + Math.sin(t * 89.3) * 0.5) * decay * 12;
      const flicker = t < 0.8 ? 0.5 + 0.5 * Math.abs(Math.sin(t * 60)) : 1;
      return { pos: [jx, jy, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: flicker };
    },
  },
  dvdBounce: {
    // Screen-edge bounce: the text travels a diagonal path across the 3D
    // space and reverses direction at each wall (like the classic DVD logo).
    // At t=1 it returns to the origin — satisfies the neutral contract.
    label: '🎯 Screen Bounce (স্ক্রিন জুড়ে বাউন্স)',
    apply: (t) => {
      // Full round-trip in X and Y using absolute-value "bounce" waves.
      const cycles = 2;
      const xWave = Math.abs(Math.sin(t * Math.PI * cycles)) * 180;
      const yWave = Math.abs(Math.cos(t * Math.PI * cycles * 0.7)) * 120;
      // Return to origin at t=1: multiply by (1-t)^0.1 to keep motion most
      // of the way and only snap home in the last few percent.
      const taper = t < 1 ? Math.pow(1 - t, 0.08) : 0;
      return { pos: [xWave * taper, yWave * taper, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 };
    },
  },

  // ---- Continuous / Loop অ্যানিমেশন (Video Editor থেকে) ----
  // These are designed to be played with loop=true. Each `apply(t)` describes
  // one cycle (0→1), so looping re-enters cleanly at t=0. The `continuous`
  // flag tells main.js to treat them as looping idle effects by default and
  // to use a linear easing (so the cycle feels steady, not eased in/out).

  pulse: {
    label: 'Pulse (স্পন্দন)',
    continuous: true,
    apply: (t) => {
      const scale = 1 + Math.sin(t * Math.PI * 2) * 0.14;
      return { pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: scale, opacityMul: 1 };
    },
  },
  float: {
    label: 'Float (ভাসমান)',
    continuous: true,
    apply: (t) => {
      const y = Math.sin(t * Math.PI * 2) * 22;
      return { pos: [0, y, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 };
    },
  },
  glowPulse: {
    label: 'Glow Pulse (জ্বলা-নেভা)',
    continuous: true,
    apply: (t) => {
      // Vibrant rhythmic expansion pulse: scale expands and contracts with glowing emissive surge
      const wave = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0 to 1
      const scale = 1 + wave * 0.16;
      const y = Math.sin(t * Math.PI * 2) * 8;
      const opacity = 0.65 + 0.35 * wave;
      const emissiveMul = 0.4 + 1.6 * wave;
      return { pos: [0, y, 0], rot: [Math.sin(t * Math.PI * 2) * 0.06, 0, 0], scaleMul: scale, opacityMul: opacity, emissiveMul };
    },
  },
  breathe: {
    label: '🫁 Breathe (শ্বাস-প্রশ্বাস)',
    continuous: true,
    apply: (t) => {
      // Organic deep breathing rhythm: chest-expansion scale and Z-depth forward inhale / backward exhale
      const wave = Math.sin(t * Math.PI * 2);
      const scale = 1 + wave * 0.10;
      const z = wave * 28;
      const y = wave * 6;
      return { pos: [0, y, z], rot: [0, 0, 0], scaleMul: scale, opacityMul: 1 };
    },
  },
  neonFlash: {
    label: '💡 Neon Flash (নিয়ন ফ্লাশ/স্পার্ক)',
    continuous: true,
    apply: (t) => {
      // Electrical high-voltage strobe: rapid multi-burst pulse of brightness, scale jitter & neon flash
      const p = (t * 8) % 1;
      const strobe = (Math.sin(t * Math.PI * 16) > 0 ? 1 : 0.15) * (p > 0.4 ? 1 : 0.35);
      const scale = 1 + (strobe > 0.6 ? 0.08 : -0.05);
      const emissiveMul = strobe > 0.6 ? 2.5 : 0.2;
      return { pos: [0, 0, 0], rot: [0, 0, (Math.sin(t * 50) * 0.02) * (1 - strobe)], scaleMul: scale, opacityMul: strobe, emissiveMul };
    },
  },
  shineSweep: {
    label: '🌟 Shine Sweep (মেটালিক গ্লো ও সুইপ)',
    continuous: true,
    apply: (t) => {
      // Dazzling 3D spotlight sweep: dynamic tilt rotation across Y/X axes that catches metallic bevel highlights
      const rotY = Math.sin(t * Math.PI * 2) * 0.35; // sweeps 20 deg left to right
      const rotX = Math.cos(t * Math.PI * 2) * 0.10;
      const posX = Math.sin(t * Math.PI * 2) * 20;
      const scale = 1 + Math.pow(Math.sin(t * Math.PI), 2) * 0.08;
      const emissiveMul = 0.8 + 1.2 * Math.pow(Math.sin(t * Math.PI), 2);
      return { pos: [posX, 0, 0], rot: [rotX, rotY, 0], scaleMul: scale, opacityMul: 1, emissiveMul };
    },
  },
};
