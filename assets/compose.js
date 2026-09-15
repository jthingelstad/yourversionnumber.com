// The card composer, for both faces: /card/ writes birthday cards, /work/card/
// circulates anniversary notices. The product you are standing in decides the
// edition, so there is no "is this a work anniversary?" control.
//
// A recipient, date, theme, note, and sender. Nothing is created or saved: the
// link *is* the card, built here from the same helper the editions read it
// with, and the preview is that link in a frame, so what the sender sees is
// exactly what arrives.

import { THEMES } from '/assets/themes.js';
import { mountPreview } from '/assets/wall.js?v=1';
import { localDateString, cardURL, CARD_LIMITS, countPoints } from '/assets/core.js?v=4';

const FACE = document.body.dataset.face || 'birthday';
const DEFAULT_THEME = FACE === 'work' ? 'timesheet' : 'departures';
const themes = THEMES.filter((t) => t.home === FACE);

const form = document.getElementById('compose');
const els = Object.fromEntries(['name', 'date', 'theme', 'note', 'from', 'reads',
                                'preview', 'submit', 'status', 'left', 'count']
  .map((k) => [k, document.getElementById('c-' + k)]));

els.date.max = localDateString();
// No maxlength attributes: the browser would count UTF-16 units and stop an
// emoji-heavy note early while the counter (code points) said there was room.
// The counter is the limit; the link is clipped to it either way.
for (const el of [els.note, els.name, els.from]) el.removeAttribute('maxlength');
let link = '';
let previewObserver;

// The work app lives one level under its front door. cardURL() writes the
// product root; point it at the app.
function appURL(url) {
  return FACE === 'work' ? url.replace(/^\/work\//, '/work/edition/') : url;
}

function fillThemes() {
  els.theme.replaceChildren();
  for (const t of themes) {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.label;
    els.theme.appendChild(opt);
  }
  els.theme.value = DEFAULT_THEME;
  els.count.textContent = `${themes.length} ${FACE === 'work' ? 'approved options' : 'themes'}`;
}

function refresh() {
  const left = CARD_LIMITS.note - countPoints(els.note.value);
  els.left.textContent = String(left);
  els.left.classList.toggle('is-over', left < 0);
  const date = els.date.value;
  const name = els.name.value.trim();
  if (!date || !els.date.validity.valid || !name || left < 0) {
    link = '';
    previewObserver?.disconnect();
    els.preview.replaceChildren();
    els.reads.textContent = 'Reads as —';
    els.submit.disabled = true;
    return;
  }

  const next = appURL(cardURL(FACE, { name, date, theme: els.theme.value,
    note: els.note.value.trim(), from: els.from.value.trim() }));
  if (next === link) return;
  link = next;
  els.submit.disabled = false;
  previewObserver?.disconnect();
  els.reads.textContent = 'Reads as —';

  // The preview is the real page at the real link. Same origin, so the number
  // it renders can be read back for the "Reads as" line.
  const frame = mountPreview(els.preview, link, 'Card preview');
  frame.addEventListener('load', async () => {
    if (!frame.isConnected) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    const updateReadout = () => {
      const label = doc.querySelector('.version')?.getAttribute('aria-label');
      els.reads.textContent = label ? `Reads as ${label}` : 'Reads as —';
    };
    previewObserver = new MutationObserver(updateReadout);
    previewObserver.observe(doc.body, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['aria-label'] });
    updateReadout();
    await doc.fonts.ready;
    if (!frame.isConnected) return;
    // Some themes (records, photographs, slides) make tall cards. Show the
    // whole note instead of cropping every theme to the same box.
    const height = Math.max(700, doc.documentElement.scrollHeight);
    frame.style.height = `${height}px`;
    els.preview.style.aspectRatio = `1000 / ${height}`;
  });
}

for (const el of [els.name, els.date, els.note, els.from]) el.addEventListener('input', refresh);
els.theme.addEventListener('change', refresh);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!link) return;
  const full = location.origin + link;
  els.status.replaceChildren();
  const a = document.createElement('a');
  a.href = full;
  a.textContent = full;
  let copied = false;
  try { await navigator.clipboard.writeText(full); copied = true; } catch (_) { /* clipboard is a nicety */ }
  // The sender's half of the card funnel, as a view of a virtual path so it
  // sits beside the recipient views in the Cards segment. No names, no dates.
  window.yvnTrackPath?.(`/card/copied/${FACE}/${els.theme.value}/`);
  els.status.append(copied ? 'Copied — ' : 'Your link: ', a,
    FACE === 'work' ? '. Circulate as appropriate. No copy is retained.' : '. Everything on the card is in that link; nothing is kept here.');
});

fillThemes();
refresh();
