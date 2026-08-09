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

// 8 effect presets + "none" = 9 buttons, within the plan's "5-10 common
// effects" target for Phase 3.
export const ANIMATION_PRESETS = {
  none: {
    label: 'কোনোটাই না',
    apply: () => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: 1 }),
  },
  fadeIn: {
    label: 'Fade In',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: 1, opacityMul: t }),
  },
  popIn: {
    label: 'Pop In',
    apply: (t) => ({ pos: [0, 0, 0], rot: [0, 0, 0], scaleMul: t, opacityMul: 1 }),
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
};
