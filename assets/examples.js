// Live previews for the examples page.
//
// The rosters, links and captions are static HTML — they work with no
// JavaScript and they are what search engines read. This only adds the moving
// picture on top, injecting one lazily-loaded frame per example.

import { scaleToFit } from '/assets/preview.js';

for (const slot of document.querySelectorAll('[data-example-url]')) {
  const frame = document.createElement('iframe');
  frame.loading = 'lazy';
  frame.src = slot.dataset.exampleUrl;
  frame.title = `${slot.dataset.exampleTitle} preview`;
  // Duplicates the link in the caption beneath it; keep it off the tab path.
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('scrolling', 'no');
  slot.style.setProperty('--preview-h', slot.dataset.exampleHeight || '620');
  slot.appendChild(frame);
  scaleToFit(slot);
}
