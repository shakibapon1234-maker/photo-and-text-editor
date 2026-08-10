// 3D Text Module — PLAN_3 §3, Phase B1: Curved Text — arc layout math
//
// Deliberately framework-agnostic, same reasoning as animations.js: a pure
// function of plain numbers, no `three`/canvas/DOM dependency at all, so it
// can be sanity-checked with plain `node` and reused unchanged by both the
// plain-text canvas card (main.js's Bangla/curved path) and the
// Sticker/Badge canvas card (PLAN_3 §2's buildStickerCardMesh) — curved text
// is available "inside the badge" too (plan §3.2), not just for the Text
// content mode.
//
// The model: characters sit on a circular arc. `curveIntensity` (-100..100)
// controls how much of that circle the line's text sweeps across; 0 is a
// perfectly straight line (and is guaranteed to reduce to the exact same
// left-to-right, un-rotated layout a plain `ctx.fillText` would produce, so
// turning curve off is a true no-op, not an approximation of straight).
// `direction` controls which way the arc bulges:
//   - 'up'   (⌣, "arc up" / smile / classic logo curve): the *center* of the
//     line is the lowest point, the two ends curve upward — text sits on the
//     inside-bottom of a circle whose center is above the text.
//   - 'down' (⌢, "arc down" / dome / stamp arc): the center is the highest
//     point, the ends dip down — text sits on the outside-top of a circle
//     whose center is below the text.
//
// Derivation note (so the signs below aren't "magic"): parametrize the
// circle as P(θ) = C + r·(sin θ, cos θ) for 'up' (bottom-of-circle case, C
// above the text) and P(θ) = C + r·(sin θ, -cos θ) for 'down' (top-of-circle
// case, C below the text), with θ measured from the line's center (θ=0).
// Solving "which on-canvas rotation makes a glyph's local up vector (0,-1)
// point away from C" gives rotation = -θ for 'up' and rotation = +θ for
// 'down' — that's the `rotation` formula below. The `y` formula falls out of
// P(θ) - P(0) directly.
//
// Contract:
//   - charWidths: array of per-character (per-grapheme-cluster) advance
//     widths, in whatever px space the caller measured in (canvas
//     `measureText(...).width`).
//   - spacing: multiplier >= 0 applied to every character's advance width
//     before layout — lets the caller open up letter-spacing, which curved
//     text needs at tight curves or the glyphs start overlapping.
//   - Returns { chars: [{x, y, rotation}], width, height }. `chars[i]` is
//     the offset (in the same px space) of charWidths[i]'s *center* from the
//     line's own center (0,0); `rotation` is in radians, 0 = upright.
//     `width`/`height` are the layout's bounding-box extent, useful for
//     sizing the canvas that will actually draw this.
//   - At curveIntensity === 0 (or every width being 0), this is exactly a
//     centered, left-to-right, unrotated layout — the straight-text case.

const MAX_SWEEP_DEG = 170; // clamp short of a full half-circle so the two ends don't start meeting at the seam

export function computeArcLayout(charWidths, { curveIntensity = 0, direction = 'up', spacing = 1 } = {}) {
  const spacingMul = Math.max(0, spacing);
  const widths = charWidths.map((w) => Math.max(0, w) * spacingMul);
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  // Straight-line fallback — also what curveIntensity === 0 always resolves
  // to, by construction (no trig at all on this path, so it's an exact
  // no-op relative to plain fillText layout, not just a small-angle one).
  if (!totalWidth || !curveIntensity) {
    let x = -totalWidth / 2;
    const chars = widths.map((w) => {
      const cx = x + w / 2;
      x += w;
      return { x: cx, y: 0, rotation: 0 };
    });
    return { chars, width: totalWidth, height: 0 };
  }

  const clampedIntensity = Math.max(-100, Math.min(100, curveIntensity));
  // Sign of curveIntensity doesn't matter — direction alone decides bulge —
  // but magnitude sets how much of the (up to MAX_SWEEP_DEG) arc is used.
  const sweepRad = (Math.abs(clampedIntensity) / 100) * (MAX_SWEEP_DEG * Math.PI) / 180;
  const radius = totalWidth / sweepRad; // keeps arc length ≈ the straight-line width, so curved text doesn't balloon or shrink much vs. straight at the same font size

  const bulgeSign = direction === 'down' ? 1 : -1;

  let cumulative = 0;
  const chars = widths.map((w) => {
    const centerArcLen = cumulative + w / 2;
    cumulative += w;
    const theta = (centerArcLen / totalWidth - 0.5) * sweepRad; // -sweep/2 .. +sweep/2, 0 at line center
    const x = radius * Math.sin(theta);
    const y = bulgeSign * radius * (1 - Math.cos(theta));
    const rotation = direction === 'down' ? theta : -theta;
    return { x, y, rotation };
  });

  const xs = chars.map((c) => c.x);
  const ys = chars.map((c) => c.y);
  const lastW = widths[widths.length - 1] || 0;
  return {
    chars,
    width: Math.max(...xs) - Math.min(...xs) + lastW,
    height: Math.max(...ys) - Math.min(...ys),
  };
}

// Splits a line into the units curved layout should treat as one "character"
// — Unicode grapheme clusters, not UTF-16 code points. This matters
// specifically for Bangla: a conjunct like ক্ষ is several code points
// (consonant + virama + consonant, sometimes more) that the browser's own
// shaping engine normally renders as one joined glyph inside a plain
// `ctx.fillText(wholeLine, ...)` call. Curved text has to draw one cluster
// per `fillText` call to place/rotate it individually, which bypasses that
// cross-cluster shaping — so grouping by grapheme cluster (via
// Intl.Segmenter where available) at least keeps each conjunct itself intact
// as a single draw call, rather than shattering it into individual
// code-point glyphs that definitely wouldn't join correctly.
// Falls back to Array.from (code-point-aware, still better than raw
// String.split('')) if Intl.Segmenter isn't available in the runtime.
export function splitGraphemes(line) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(line), (s) => s.segment);
  }
  return Array.from(line);
}
