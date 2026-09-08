// Shared by the theme gallery and the examples page.
//
// A preview iframe is a fixed-width viewport showing the real edition; the card
// it sits in is whatever the grid gives it. Scale the frame by the ratio between
// the two and keep it in step as the layout reflows. Rendering the iframe at
// card width instead would show the mobile layout cropped to its header — all
// chrome, no version number.

export const PREVIEW_WIDTH = 1000;

export function scaleToFit(preview) {
  const apply = () => {
    const width = preview.clientWidth;
    if (width > 0) preview.style.setProperty('--preview-scale', width / PREVIEW_WIDTH);
  };
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(preview);
  else window.addEventListener('resize', apply);
  apply();
}
