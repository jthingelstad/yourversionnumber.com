// The Work Edition's front door: the start-date field, the live tenure number,
// the ledger rows and the previews. The mirror of home.js, in a worse suit.
//
// The arithmetic is copied from work/assets/app.js computeWorkVersion() and
// must stay identical to it: the number on this door has to be the number the
// visitor sees one click later. No circle, no confetti — nobody circles
// anything on a form.

import { renderVnum, onMidnight, localDate, computeTenure, tenureString, buildString } from '/assets/site.js?v=5';
import { mountWall, setPreview } from '/assets/wall.js?v=1';

// The worked example in the static markup. Fixed, so it never disagrees.
const EXAMPLE = { years: 3, quarters: 2, days: 40, build: 888 };
const SAMPLE = 'j=Engineer:2019-09-03&j=Analyst:2023-02-13';

const num = document.getElementById('hero-vnum');
const buildEl = document.getElementById('hero-build');
const says = document.getElementById('hero-says');
const date = document.getElementById('ask-date');
const go = document.getElementById('ask-go');
const wall = document.getElementById('work-wall');
const cells = {
  years: document.getElementById('w-years'),
  quarters: document.getElementById('w-quarters'),
  days: document.getElementById('w-days'),
  build: document.getElementById('w-build'),
};

date.max = localDate();

function strong(text) {
  const el = document.createElement('strong');
  el.textContent = text;
  return el;
}

// "Tomorrow adds one" is only true Sunday to Thursday. Friday and Saturday
// promise nothing.
function tomorrowLine() {
  const dow = new Date().getDay();
  if (dow === 5 || dow === 6) return 'Nothing ships this weekend.';
  return 'Tomorrow adds one, assuming tomorrow is a workday.';
}

function paint(ticking) {
  const value = date.value;
  const today = localDate();
  const mine = Boolean(value) && value <= today;

  if (value && value > today) {
    says.textContent = 'That start date is in the future. Tenure is not accrued in advance.';
    go.disabled = true;
    return;
  }
  go.disabled = false;

  const t = mine ? computeTenure(value) : EXAMPLE;
  const text = tenureString(t);
  renderVnum(num, text);
  num.classList.toggle('is-ticking', Boolean(ticking));
  cells.years.textContent = String(t.years);
  cells.quarters.textContent = String(t.quarters);
  cells.days.textContent = String(t.days);
  cells.build.textContent = buildString(t);
  // Metadata, not a fourth digit: no animation when it ticks.
  buildEl.textContent = buildString(t);
  num.setAttribute('aria-label', `${text}+${t.build}`);

  says.replaceChildren();
  if (mine) {
    says.append(`${t.years} ${t.years === 1 ? 'year' : 'years'} in, quarter ${t.quarters} of your tenure year, ${t.days} business ${t.days === 1 ? 'day' : 'days'} into it. Build ${t.build.toLocaleString()} — every business day you have ever logged. `, tomorrowLine());
    go.textContent = 'Retain this page';
  } else {
    says.append('A worked example: ', strong(text + '+888'), ' is 3 years in, quarter 2 of the year, 40 business days into it. Build 888 — every business day they have ever logged. ', tomorrowLine());
    go.textContent = 'Read my tenure';
  }

  const roster = mine ? `j=${value}` : SAMPLE;
  for (const well of wall.querySelectorAll('.shot[data-preview]')) {
    setPreview(well, well.dataset.preview.replace(/j=[^&]*(&j=[^&]*)*/, roster));
  }
}

date.addEventListener('input', () => paint(false));
paint(false);
onMidnight(() => paint(true));
mountWall(document);
