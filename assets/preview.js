// Shared by the theme gallery, the examples page and the card composer.
//
// A preview is a fixed-width viewport showing the real edition; the screen it
// sits in is whatever the layout gives it. Scale the frame by the ratio between
// the two and keep it in step as things reflow. Rendering the iframe at screen
// width instead would show the mobile layout cropped to its header — all
// chrome, no version number.

export const PREVIEW_WIDTH = 1000;

export function scaleToFit(screen) {
  const apply = () => {
    const width = screen.clientWidth;
    if (width > 0) screen.style.setProperty('--preview-scale', width / PREVIEW_WIDTH);
  };
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(screen);
  else window.addEventListener('resize', apply);
  apply();
}

// Every preview on the spine is one of these: a screen in a bezel, with the
// frame the only chrome it gets.
export function mountPreview(screen, src, title) {
  const frame = document.createElement('iframe');
  frame.loading = 'lazy';
  frame.src = src;
  frame.title = title;
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  // Duplicates a link beside it; keep it off the tab path.
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('scrolling', 'no');
  screen.replaceChildren(frame);
  scaleToFit(screen);
  return frame;
}
