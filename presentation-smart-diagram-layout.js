(() => {
  // Keep the round hub-and-spoke template editable while automatically
  // redistributing its circular points when the user adds or removes one.
  if (typeof window.render !== 'function' || !Array.isArray(window.slides)) return;

  const previousRender = window.render;
  const initializedSlides = new WeakSet();
  const knownCounts = new WeakMap();

  function getHub(slide) {
    const circles = slide.elements.filter(el => el.type === 'shape' && el.shape === 'circle');
    const connectors = slide.elements.filter(el => el.type === 'shape' && el.shape === 'dottedLine');
    if (circles.length < 2) return null;

    const center = circles.reduce((largest, el) =>
      !largest || (Number(el.w) * Number(el.h) > Number(largest.w) * Number(largest.h)) ? el : largest, null);
    const points = circles.filter(el => el !== center);
    const wasHub = initializedSlides.has(slide);
    if (!wasHub && (points.length < 3 || connectors.length < 2)) return null;
    return { center, points, connectors };
  }

  function arrange(slide, hub) {
    const { center, points } = hub;
    const centerX = Number(center.x) + Number(center.w) / 2;
    const centerY = Number(center.y) + Number(center.h) / 2;
    const rx = Math.min(36, Math.max(25, 42 - points.length * 0.75));
    const ry = Math.min(35, Math.max(23, 40 - points.length * 0.75));

    points.forEach((point, index) => {
      const angle = (-135 + index * 360 / points.length) * Math.PI / 180;
      const pointCenterX = centerX + Math.cos(angle) * rx;
      const pointCenterY = centerY + Math.sin(angle) * ry;
      point.x = Math.max(2, Math.min(98 - Number(point.w), pointCenterX - Number(point.w) / 2));
      point.y = Math.max(2, Math.min(98 - Number(point.h), pointCenterY - Number(point.h) / 2));
    });

    let connectors = hub.connectors;
    const lineModel = connectors[0] || {
      id: crypto.randomUUID(), type: 'shape', shape: 'dottedLine',
      fill: '#94a3b8', stroke: '#94a3b8', line: 2.5, opacity: 100, h: 4
    };
    while (connectors.length < points.length) {
      const clone = { ...lineModel, id: crypto.randomUUID() };
      const centerIndex = slide.elements.indexOf(center);
      slide.elements.splice(centerIndex + 1 + connectors.length, 0, clone);
      connectors.push(clone);
    }
    while (connectors.length > points.length) {
      const extra = connectors.pop();
      slide.elements = slide.elements.filter(el => el !== extra);
    }

    const slideWidth = 16;
    const slideHeight = 9;
    connectors.forEach((line, index) => {
      const point = points[index];
      const px = Number(point.x) + Number(point.w) / 2;
      const py = Number(point.y) + Number(point.h) / 2;
      const dx = (px - centerX) * slideWidth;
      const dy = (py - centerY) * slideHeight;
      const distance = Math.hypot(dx, dy);
      const centerRadius = Math.min(Number(center.w) * slideWidth, Number(center.h) * slideHeight) / 2;
      const pointRadius = Math.min(Number(point.w) * slideWidth, Number(point.h) * slideHeight) / 2;
      const lengthPx = Math.max(1, distance - centerRadius - pointRadius);
      const width = lengthPx / slideWidth;
      const height = Number(line.h) || 4;
      const midX = (centerX + px) / 2;
      const midY = (centerY + py) / 2;
      line.w = width;
      line.h = height;
      line.x = midX - width / 2;
      line.y = midY - height / 2;
      line.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
    });
  }

  window.render = function(...args) {
    const slide = window.slides?.[window.current];
    if (slide && Array.isArray(slide.elements)) {
      const hub = getHub(slide);
      if (hub) {
        const count = hub.points.length;
        if (!initializedSlides.has(slide)) {
          initializedSlides.add(slide);
          knownCounts.set(slide, count);
        } else if (knownCounts.get(slide) !== count) {
          // Record before rendering again so model updates cannot recurse.
          knownCounts.set(slide, count);
          arrange(slide, hub);
        }
      }
    }
    return previousRender.apply(this, args);
  };
})();
