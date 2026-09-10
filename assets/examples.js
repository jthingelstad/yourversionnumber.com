// Live previews for the examples page.
//
// The rosters, links and captions are static HTML — they work with no
// JavaScript and they are what search engines read. This only adds the moving
// picture on top.

import { mountPreview } from '/assets/preview.js';

for (const screen of document.querySelectorAll('[data-example-url]')) {
  mountPreview(screen, screen.dataset.exampleUrl, `${screen.dataset.exampleTitle} preview`);
}
