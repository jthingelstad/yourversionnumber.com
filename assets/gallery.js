// Theme gallery.
//
// Reads the shared manifest directly — it used to scrape the THEMES array out
// of each edition's app.js with a positional regex, which broke the moment the
// entry shape changed. There is one manifest now and this imports it.
//
// Every theme works in both editions, so the page is one list rather than two.
// Each card previews the theme in its home edition, which is the framing it was
// designed for. Phase 6 replaces this page with rack rows showing the visitor's
// own number.

import { THEMES } from '/assets/themes.js';
import { scaleToFit } from '/assets/preview.js';

const DEMO = {
  birthday: { base: '/birthday/', param: 'p', people: ['Ada:1979-04-12', 'Grace:1991-11-30', 'Linus:2015-06-08'] },
  work: { base: '/work/', param: 'j', people: ['Engineer:2022-03-14', 'Designer:2024-09-02'] },
};

function previewUrl(theme) {
  const demo = DEMO[theme.home] || DEMO.birthday;
  const params = new URLSearchParams();
  params.set('theme', theme.name);
  for (const person of demo.people) params.append(demo.param, person);
  return demo.base + '?' + params.toString();
}

function makeCard(theme) {
  const href = previewUrl(theme);
  const item = document.createElement('li');
  item.className = 'theme-card';
  item.id = theme.name;

  const preview = document.createElement('div');
  preview.className = 'theme-card__preview';

  const frame = document.createElement('iframe');
  frame.loading = 'lazy';
  frame.src = href;
  frame.title = `${theme.label} theme preview`;
  // Duplicates the link beneath it; keep it out of the tab order so keyboard
  // users aren't walked through every nested document.
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('scrolling', 'no');
  preview.appendChild(frame);
  scaleToFit(preview);
  item.appendChild(preview);

  const body = document.createElement('div');
  body.className = 'theme-card__body';

  const heading = document.createElement('h3');
  const link = document.createElement('a');
  link.href = href;
  link.textContent = theme.label;
  heading.appendChild(link);
  body.appendChild(heading);

  const home = document.createElement('span');
  home.className = 'theme-card__kind';
  home.textContent = theme.home ? `${theme.home} edition` : 'both editions';
  body.appendChild(home);

  const blurb = document.createElement('p');
  blurb.textContent = theme.blurb;
  body.appendChild(blurb);

  item.appendChild(body);
  return item;
}

const list = document.getElementById('gallery');
const count = document.getElementById('theme-count');
if (count) count.textContent = `${THEMES.length} of them.`;
const frag = document.createDocumentFragment();
for (const theme of THEMES) frag.appendChild(makeCard(theme));
list.appendChild(frag);
