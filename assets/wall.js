// One preview mounter for every scaled-down live page on the spine.
//
// The preview is always the real page at the real link — there is no second
// renderer anywhere on this site, and there must never be one.
//
// Two things the old preview.js did not do: it scales fluidly (a
// ResizeObserver sets --s from the well's real width, instead of a hardcoded
// ratio, which is what broke at 390px), and it loads lazily (an
// IntersectionObserver, so /themes/ does not open twenty iframes at once).

const W = 1000;   // the iframe's own width; .shot's aspect-ratio decides the height

export function mountPreview(well, url, title) {
  well.replaceChildren();
  const frame = document.createElement('iframe');
  frame.src = url;
  frame.title = title || 'Preview';
  frame.loading = 'lazy';
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('tabindex', '-1');       // the card is the link, not this
  frame.setAttribute('aria-hidden', 'true');  // decorative: the page says it in text
  well.appendChild(frame);
  fit(well);
  resize.observe(well);
  return frame;
}

// clientWidth, not getBoundingClientRect(): the .wall items are rotated a
// fraction of a degree, and the bounding box of a rotated element is wider
// than the element.
function fit(well) {
  well.style.setProperty('--s', (well.clientWidth / W).toFixed(4));
}

const resize = new ResizeObserver((entries) => { for (const e of entries) fit(e.target); });

// Mount each [data-preview] well the first time it comes near the viewport.
export function mountWall(root = document) {
  const wells = [...root.querySelectorAll('.shot[data-preview]')];
  if (!wells.length) return;
  for (const well of wells) { fit(well); resize.observe(well); }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      mountPreview(e.target, e.target.dataset.preview, e.target.dataset.title);
    }
  }, { rootMargin: '400px 0px' });

  for (const well of wells) io.observe(well);
}

// Point an already-mounted (or not-yet-mounted) well at a new URL.
export function setPreview(well, url) {
  if (well.dataset.preview === url) return;
  well.dataset.preview = url;
  const frame = well.querySelector('iframe');
  if (frame) frame.src = url;
}
