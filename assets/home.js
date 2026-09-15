// The landing page only: the birthday field, the live number, the three named
// parts, the sticky note, the button label and the three previews.
//
// The opening state is a worked example, identical to the static markup — NOT
// the site's own number, which lives in the bar pill and nowhere else. The form
// is a native GET to /birthday/?p=YYYY-MM-DD and is never intercepted; only the
// button's label changes.

import { computeVersion, versionString, renderVnum, onMidnight, localDate } from '/assets/site.js?v=6';
import { mountWall, setPreview } from '/assets/wall.js?v=1';

// A fixed worked example, so the static markup and the first paint agree on
// every day of the year. It is not a real date and it does not tick.
const EXAMPLE = { age: 52, major: 5, minor: 2, patch: 113 };
const EXAMPLE_TOMORROW = '5.2.114';
const SAMPLE = 'p=Jamie:1974-01-15&p=Sara:1976-03-20&p=Nora:2009-11-02';

const num = document.getElementById('hero-vnum');
const says = document.getElementById('hero-says');
const parts = document.getElementById('hero-parts');
const tomorrow = document.getElementById('hero-tomorrow');
const date = document.getElementById('ask-date');
const go = document.getElementById('ask-go');
const wall = document.getElementById('home-wall');

date.max = localDate();

let ring = null;          // the one hand-drawn circle; removed before redrawing
let confettiFired = false;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function tile(cls, n, label) {
  const li = document.createElement('li');
  li.className = `part part--${cls}`;
  const b = document.createElement('b');
  b.textContent = String(n);
  const s = document.createElement('span');
  s.textContent = label;
  li.append(b, s);
  return li;
}

function setParts(v, mine) {
  parts.replaceChildren(
    tile('major', v.major, v.major === 1 ? 'decade — you’re a different person in each one' : 'decades — you’re a different person in each one'),
    tile('minor', v.minor, 'years in — new goals, nothing breaking'),
    tile('patch', v.patch, mine ? 'days since your birthday — each one a bit better than the last' : 'days since the birthday — each one a bit better than the last'),
  );
}

function strong(text) {
  const el = document.createElement('strong');
  el.textContent = text;
  return el;
}

function inlineVnum(text) {
  const el = document.createElement('span');
  el.className = 'vnum vnum--inline';
  renderVnum(el, text);
  for (const d of el.querySelectorAll('.is-new')) d.classList.remove('is-new');
  return el;
}

// The scribbled circle: once, on the number you came for, and only when the
// library is present — rename the vendored file and this line is a no-op.
function circle() {
  ring?.remove();
  ring = null;
  if (reduceMotion() || !window.RoughNotation) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--orange').trim();
  ring = window.RoughNotation.annotate(num, {
    type: 'circle', color, strokeWidth: 3, padding: 14, animationDuration: 700,
  });
  ring.show();
}

// Confetti only on the day someone's patch is 0 — their birthday. Fires once.
function celebrate(v) {
  if (v.patch !== 0 || confettiFired || !window.confetti) return;
  confettiFired = true;
  window.confetti({
    particleCount: 90, spread: 70, startVelocity: 38, origin: { y: 0.35 },
    colors: ['#ff5a1f', '#1a4fe0', '#ffd43d', '#c9186a'],
    disableForReducedMotion: true,
  });
}

function paint(ticking) {
  const value = date.value;
  const today = localDate();
  const mine = Boolean(value) && value <= today;

  if (value && value > today) {
    says.textContent = 'That’s in the future. Version numbers only count up.';
    go.disabled = true;
    return;
  }
  go.disabled = false;

  const v = mine ? computeVersion(value) : EXAMPLE;
  const text = versionString(v);   // renderVnum animates only what changed
  renderVnum(num, text);
  num.classList.toggle('is-ticking', Boolean(ticking));
  setParts(v, mine);

  // Tomorrow's number, computed properly: on the day before a birthday it is
  // the next minor, not patch + 1.
  const next = new Date();
  next.setDate(next.getDate() + 1);
  const t = mine ? versionString(computeVersion(value, next)) : EXAMPLE_TOMORROW;
  tomorrow.replaceChildren(
    mine ? 'Tomorrow you’ll be ' : 'Tomorrow they’ll be ',
    inlineVnum(t),
    '. Nobody knows how that one will be different. Hopefully ever so slightly better.',
  );

  says.replaceChildren();
  if (mine) {
    says.append('You’re on ', strong(text), ` — ${v.patch} ${v.patch === 1 ? 'day' : 'days'} of small improvements since your last birthday.`);
    go.textContent = 'Make this my page';
  } else {
    says.append('A worked example: someone 52 years and 113 days old is on ', strong(text),
      '. The day they turn 53 they ship 5.3.0 — a minor bump, backwards compatible.');
    go.textContent = 'Read my number';
  }

  // The three previews show the visitor's own number once there is one.
  const roster = mine ? `p=${value}` : SAMPLE;
  for (const well of wall.querySelectorAll('.shot[data-preview]')) {
    setPreview(well, well.dataset.preview.replace(/p=[^&]*(&p=[^&]*)*/, roster));
  }

  if (mine && !ticking) {
    circle();
    celebrate(v);
  }
}

date.addEventListener('input', () => paint(false));
paint(false);
onMidnight(() => paint(true));
mountWall(document);
