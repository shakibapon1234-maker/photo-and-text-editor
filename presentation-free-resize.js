(() => {
  const $ = id => document.getElementById(id);
  const MIN_SIZE = 4;
  let resizing = null;

  document.head.insertAdjacentHTML('beforeend', `<style>
    .free-resize-handle{position:absolute;z-index:12;width:12px;height:12px;background:#fff;border:2px solid #1769e8;border-radius:2px;box-shadow:0 1px 4px #0009;touch-action:none}
    .free-resize-handle.n,.free-resize-handle.s{left:50%;transform:translateX(-50%);cursor:ns-resize}.free-resize-handle.e,.free-resize-handle.w{top:50%;transform:translateY(-50%);cursor:ew-resize}
    .free-resize-handle.n{top:-8px}.free-resize-handle.s{bottom:-8px}.free-resize-handle.e{right:-8px}.free-resize-handle.w{left:-8px}
    .free-resize-handle.nw{left:-8px;top:-8px;cursor:nwse-resize}.free-resize-handle.ne{right:-8px;top:-8px;cursor:nesw-resize}.free-resize-handle.sw{left:-8px;bottom:-8px;cursor:nesw-resize}.free-resize-handle.se{right:-8px;bottom:-8px;cursor:nwse-resize}
    .text-el.selected,.image-el.selected{overflow:visible}
    #fitTextBox{width:100%;margin-top:6px}
  </style>`);

  function addHandles() {
    const item = selectedEl();
    if (!item || !['text','image'].includes(item.type)) return;
    const node = $('slide').querySelector(`.element[data-id="${item.id}"]`);
    if (!node || node.querySelector('.free-resize-handle')) return;
    ['n','e','s','w','nw','ne','sw','se'].forEach(side => {
      const handle = document.createElement('div');
      handle.className = `free-resize-handle ${side}`;
      handle.title = 'Drag to resize';
      handle.addEventListener('pointerdown', event => {
        event.preventDefault(); event.stopPropagation();
        const rect = $('slide').getBoundingClientRect();
        resizing = { item, side, rect, start: { x: item.x, y: item.y, w: item.w, h: item.h, size: item.size } };
        handle.setPointerCapture(event.pointerId);
      });
      node.append(handle);
    });
  }

  window.addEventListener('pointermove', event => {
    if (!resizing) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const { item, side, rect, start } = resizing;
    const px = (event.clientX - rect.left) / rect.width * 100;
    const py = (event.clientY - rect.top) / rect.height * 100;
    let x = start.x, y = start.y, w = start.w, h = start.h;
    if (side.includes('e')) w = Math.max(MIN_SIZE, px - x);
    if (side.includes('s')) h = Math.max(MIN_SIZE, py - y);
    if (side.includes('w')) { x = Math.min(start.x + start.w - MIN_SIZE, px); w = start.x + start.w - x; }
    if (side.includes('n')) { y = Math.min(start.y + start.h - MIN_SIZE, py); h = start.y + start.h - y; }
    item.x = x; item.y = y; item.w = w; item.h = h;
    // Corner resizing enlarges/shrinks text too, so a larger text box does
    // not leave the text looking tiny inside it.
    if (item.type === 'text' && side.length === 2 && start.size) item.size = Math.max(10, Math.min(180, Math.round(start.size * (w / start.w))));
    const node = $('slide').querySelector(`.element[data-id="${item.id}"]`);
    if (node) { node.style.left = `${x}%`; node.style.top = `${y}%`; node.style.width = `${w}%`; node.style.height = `${h}%`; if (item.type === 'text') node.style.fontSize = `${item.size}px`; }
  }, true);
  window.addEventListener('pointerup', () => { if (resizing) { resizing = null; render(); } }, true);

  function fitSelectedTextBox() {
    const item = selectedEl();
    const node = item && item.type === 'text' && $('slide').querySelector(`.text-el[data-id="${item.id}"]`);
    if (!node) return;
    const range = document.createRange(); range.selectNodeContents(node);
    const bounds = range.getBoundingClientRect(), slide = $('slide').getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    item.x = Math.max(0, (bounds.left - slide.left) / slide.width * 100 - 1);
    item.y = Math.max(0, (bounds.top - slide.top) / slide.height * 100 - 1);
    item.w = Math.min(100 - item.x, bounds.width / slide.width * 100 + 2);
    item.h = Math.min(100 - item.y, bounds.height / slide.height * 100 + 2);
    render();
  }

  const inspectorBeforeResize = renderInspector;
  renderInspector = function () {
    inspectorBeforeResize();
    const panel = $('textInspector');
    if (!panel.querySelector('#fitTextBox')) {
      const button = document.createElement('button'); button.id = 'fitTextBox'; button.type = 'button'; button.textContent = 'Fit box to text'; button.onclick = fitSelectedTextBox; panel.append(button);
    }
    const item = selectedEl();
    $('fitTextBox').classList.toggle('hidden', !item || item.type !== 'text');
  };
  const renderBeforeResize = render;
  render = function () { renderBeforeResize(); addHandles(); };
  render();
})();