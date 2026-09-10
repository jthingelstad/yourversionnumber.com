// Theme gallery — a menu, not a directory.
//
// The page's job is helping someone find the theme they want, which is why
// every preview shows the visitor's own number rather than sample data. That
// is only affordable because the set was cut to 28; it should not grow back.

import { THEMES } from '/assets/themes.js';
import { mountPreview } from '/assets/preview.js';
import { localDateString } from '/assets/core.js?v=2';

const list = document.getElementById('gallery');
const dateInput = document.getElementById('gallery-date');
const readout = document.getElementById('gallery-readout');
if (dateInput) dateInput.max = localDateString();

function version(dateStr, today = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let year = midnight.getFullYear();
  let anniversary = new Date(year, m - 1, d);
  if (midnight < anniversary) { year -= 1; anniversary = new Date(year, m - 1, d); }
  const age = year - y;
  return `${Math.floor(age / 10)}.${age % 10}.${Math.round((midnight - anniversary) / 86_400_000)}`;
}

function previewUrl(theme, date) {
  const params = new URLSearchParams();
  params.set('theme', theme.name);
  params.append('p', `You:${date}`);
  return '/birthday/?' + params.toString();
}

function row(theme, index, date) {
  const href = previewUrl(theme, date);
  const li = document.createElement('li');
  li.className = 'rack__row';
  li.id = theme.name;

  const screen = document.createElement('div');
  screen.className = 'rack__screen';
  li.appendChild(screen);
  mountPreview(screen, href, `${theme.label} theme preview`);

  const plate = document.createElement('div');
  plate.className = 'rack__plate';
  plate.innerHTML =
    `<div class="rack__head">
       <i class="rack__led"></i>
       <h3 class="rack__name"></h3>
       <span class="rack__unit">UNIT ${String(index + 1).padStart(2, '0')}</span>
     </div>
     <p class="rack__blurb"></p>
     <div class="rack__chips">
       <span class="chip">${theme.home ? theme.home + ' edition' : 'both editions'}</span>
       <span class="chip">${theme.chime ? theme.chime : 'silent'}</span>
     </div>
     <div class="rack__actions">
       <a class="btn btn--primary" href="${href}">Wear this</a>
       <a class="btn btn--secondary" href="/assets/themes/${theme.name}.css">View source</a>
     </div>`;
  plate.querySelector('.rack__name').textContent = theme.label;
  plate.querySelector('.rack__blurb').textContent = theme.blurb;
  li.appendChild(plate);
  return li;
}

function render() {
  if (dateInput?.value && !dateInput.validity.valid) {
    readout.textContent = 'Choose a birthday on or before today.';
    list.replaceChildren();
    return;
  }
  const date = dateInput?.value || '1979-04-12';
  if (readout) readout.textContent = `reads as ${version(date)}`;
  const frag = document.createDocumentFragment();
  THEMES.forEach((theme, i) => frag.appendChild(row(theme, i, date)));
  list.replaceChildren(frag);
}

dateInput?.addEventListener('change', render);
render();
