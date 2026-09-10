// Shared by the theme gallery, the examples page and the card composer.
//
// A preview is a fixed-width viewport showing the real edition; the screen it
// sits in is whatever the layout gives it. Scale the frame by the ratio between
// the two and keep it in step as things reflow. Rendering the iframe at screen
// width instead would show the mobile layout cropped to its header — all
// chrome, no version number.

export const PREVIEW_WIDTH = 1000;

const scaledScreens = new WeakSet();

export function scaleToFit(screen) {
  if (scaledScreens.has(screen)) return;
  scaledScreens.add(screen);
  const apply = () => {
    const width = screen.clientWidth;
    if (width > 0) screen.style.setProperty('--preview-scale', width / PREVIEW_WIDTH);
  };
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(screen);
  else window.addEventListener('resize', apply);
  apply();
}

// A gallery of 28 previews is 28 whole page loads if they all fetch at once,
// and `loading="lazy"` does not prevent it: the gallery builds its rows inside a
// detached fragment, so at the moment src is assigned the iframe has no box for
// the browser to compare against the viewport and it fetches straight away.
// Measured at 1280x900 that was every one of the 28 -- twice over. Holding the
// URL until the row is actually near the screen is what makes it lazy, and
// unlike the attribute it behaves the same in every browser.
const deferred = new WeakMap();

const nearViewport = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, self) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const src = deferred.get(entry.target);
        if (src) {
          entry.target.src = src;
          deferred.delete(entry.target);
        }
        self.unobserve(entry.target);
      }
    }, { rootMargin: '400px' })
  : null;

// Every preview on the spine is one of these: a screen in a bezel, with the
// frame the only chrome it gets.
export function mountPreview(screen, src, title) {
  for (const previous of screen.querySelectorAll('iframe')) {
    nearViewport?.unobserve(previous);
    deferred.delete(previous);
  }
  const frame = document.createElement('iframe');
  frame.loading = 'lazy';
  frame.title = title;
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  // Duplicates a link beside it; keep it off the tab path.
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('scrolling', 'no');
  screen.replaceChildren(frame);
  if (nearViewport) {
    deferred.set(frame, src);
    nearViewport.observe(frame);
  } else {
    frame.src = src;
  }
  scaleToFit(screen);
  return frame;
}
