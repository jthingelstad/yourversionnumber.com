// The theme gallery, for both faces. Imports the manifest — it is the one
// source of truth — and shows the themes that belong to the face the page is
// standing in: twenty on /themes/, nine on /work/themes/.
//
// The date field is a control here, not a way out: every tile's link and
// preview carry whatever date is in it. "Surprise me" opens a random theme
// with that date.

import { THEMES } from '/assets/themes.js';
import { localDate } from '/assets/site.js?v=6';
import { mountWall, setPreview } from '/assets/wall.js?v=1';

const FACE = document.body.dataset.face || 'birthday';
const APP = FACE === 'work' ? '/work/edition/' : '/birthday/';
const KEY = FACE === 'work' ? 'j' : 'p';

const list = document.getElementById('gallery');
const date = document.getElementById('ask-date');
const themes = THEMES.filter((t) => t.home === FACE);

// The gallery stays open across midnights and deploys should never bake a date
// ceiling into HTML. Match the two front doors and derive today's local date.
date.max = localDate();

function urlFor(theme) {
  return `${APP}?theme=${theme}&${KEY}=${date.value}`;
}

for (const theme of themes) {
  const li = document.createElement('li');
  li.id = theme.name;
  const a = document.createElement('a');
  a.href = urlFor(theme.name);
  const shot = document.createElement('div');
  shot.className = 'shot';
  shot.dataset.preview = a.getAttribute('href');
  shot.dataset.title = `${theme.label} theme preview`;
  const h3 = document.createElement('h3');
  h3.textContent = theme.label;
  const p = document.createElement('p');
  p.textContent = theme.blurb;
  a.append(shot, h3, p);
  li.append(a);
  list.append(li);
}

mountWall(document);

let timer;
date.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!date.value) return;
    for (const li of list.children) {
      const url = urlFor(li.id);
      li.querySelector('a').href = url;
      setPreview(li.querySelector('.shot'), url);
    }
  }, 250);
});

document.querySelector('[data-surprise]')?.addEventListener('click', () => {
  const theme = themes[Math.floor(Math.random() * themes.length)].name;
  location.href = urlFor(theme);
});
