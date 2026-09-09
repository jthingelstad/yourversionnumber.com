// Core hooks — the mechanism that lets themes be ambitious while staying
// CSS-only. Core computes, themes opt in from CSS, no theme ships a script.
// Both editions import this; it is the one place the shared behaviour lives,
// so the two app.js files cannot drift on it.

// — Hook 0/5 · body context ————————————————————————————————————————————————

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function seasonOf(date) {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

// Northern-hemisphere seasons, from the visitor's local date. Cheap, and it
// lets a theme shift without core learning anything about that theme.
export function applyEnvironment(edition, today = new Date()) {
  document.body.dataset.edition = edition;
  document.body.dataset.weekday = WEEKDAYS[today.getDay()];
  document.body.dataset.season = seasonOf(today);
}

// — Hook 4 · per-digit spans ———————————————————————————————————————————————

// One span per *character*: "52" is two digits. data-d carries the value so a
// theme can select .digit[data-d="0"]. No whitespace between the spans — they
// are inline-block, and a newline between them would render as a space.
export function renderVersionDigits(el, text) {
  el.textContent = '';
  el.setAttribute('aria-label', text);
  for (const ch of text) {
    const span = document.createElement('span');
    if (ch === '.') {
      span.className = 'sep';
    } else {
      span.className = 'digit';
      span.dataset.d = ch;
    }
    span.textContent = ch;
    el.appendChild(span);
  }
}

// — Hook 6 · countdown —————————————————————————————————————————————————————

const COUNTDOWN_WINDOW = 7;

// Absent entirely when the date is further out, so body[data-countdown] is a
// clean "is this imminent" selector rather than something themes must compare.
export function applyCountdown(daysUntil, nextVersion) {
  const body = document.body;
  const existing = document.querySelector('.countdown');
  if (existing) existing.remove();

  if (daysUntil === null || daysUntil > COUNTDOWN_WINDOW || daysUntil < 0) {
    delete body.dataset.countdown;
    body.style.removeProperty('--days-until');
    return;
  }

  body.dataset.countdown = String(daysUntil);
  body.style.setProperty('--days-until', String(daysUntil));

  const note = document.createElement('p');
  note.className = 'countdown';
  note.textContent = daysUntil === 0
    ? `Released today — ${nextVersion}`
    : `${daysUntil} day${daysUntil === 1 ? '' : 's'} until ${nextVersion}`;
  document.getElementById('app')?.appendChild(note);
}

// — Hook 7 · chime —————————————————————————————————————————————————————————

// Sound is the one thing CSS cannot do, so it lives here and never in a theme:
// no contributor ever ships audio. Synthesised with oscillators — no files, no
// network, no assets.
let audioContext = null;
let hasInteracted = false;

export function watchForInteraction() {
  const mark = () => { hasInteracted = true; };
  addEventListener('pointerdown', mark, { once: true, passive: true });
  addEventListener('keydown', mark, { once: true });
}

// All four conditions must hold. This fires on a page someone left open
// overnight, so it stays quiet unless every one of them is true.
export function playChime(kind) {
  if (!kind || !hasInteracted) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) {
    return;
  }
  const ctx = audioContext;
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  if (kind === 'tick') {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1800;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.02);
  } else if (kind === 'buzzer') {
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.12);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    for (const detune of [0, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 220;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } else if (kind === 'crackle') {
    const frames = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) channel[i] = (Math.random() * 2 - 1) * 0.5;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2600;
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    source.connect(filter).connect(gain);
    source.start(now);
    source.stop(now + 0.4);
  }
}
