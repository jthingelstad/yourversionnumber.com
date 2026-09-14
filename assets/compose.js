// The card composer.
//
// A recipient, date, theme, note, and sender. Nothing is created or saved: the
// link *is* the card, built here from the same helper the editions read it
// with, and the preview is that link in a frame, so what the sender sees is
// exactly what arrives.

import { THEMES, orderForEdition } from '/assets/themes.js';
import { mountPreview } from '/assets/preview.js?v=2';
import { localDateString, cardURL, CARD_LIMITS } from '/assets/core.js?v=3';

const form = document.getElementById('compose');
const els = Object.fromEntries(['name', 'date', 'work', 'theme', 'note', 'from', 'reads',
                                'url', 'preview', 'submit', 'status', 'left', 'count']
  .map((k) => [k, document.getElementById('c-' + k)]));

els.date.max = localDateString();
els.note.maxLength = CARD_LIMITS.note;
els.name.maxLength = CARD_LIMITS.name;
els.from.maxLength = CARD_LIMITS.from;
let link = '';
let previewObserver;

function fillThemes() {
  const edition = els.work.checked ? 'work' : 'birthday';
  const { native, rest } = orderForEdition(edition);
  const selected = els.theme.value;
  els.theme.replaceChildren();
  const add = (t) => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.label;
    els.theme.appendChild(opt);
  };
  native.forEach(add);
  if (rest.length) {
    const rule = document.createElement('option');
    rule.disabled = true;
    rule.textContent = '─'.repeat(10);
    els.theme.appendChild(rule);
    rest.forEach(add);
  }
  // Departures has the best countdown and the most compelling thing to receive.
  els.theme.value = selected || 'departures';
  els.count.textContent = `${THEMES.length} available`;
}

function refresh() {
  els.left.textContent = String(CARD_LIMITS.note - els.note.value.length);
  const date = els.date.value;
  const name = els.name.value.trim();
  if (!date || !els.date.validity.valid || !name) {
    link = '';
    previewObserver?.disconnect();
    els.preview.replaceChildren();
    els.reads.textContent = '—';
    els.url.textContent = '—';
    els.submit.disabled = true;
    return;
  }

  const edition = els.work.checked ? 'work' : 'birthday';
  const next = cardURL(edition, { name, date, theme: els.theme.value,
    note: els.note.value.trim(), from: els.from.value.trim() });
  if (next === link) return;
  link = next;
  els.url.textContent = link;
  els.submit.disabled = false;
  previewObserver?.disconnect();
  els.reads.textContent = '—';

  // The preview is the real page at the real link. Same origin, so the number
  // it renders can be read back for the "Reads as" readout.
  const frame = mountPreview(els.preview, link, 'Card preview');
  frame.style.height = '630px';
  els.preview.style.aspectRatio = '1000 / 630';
  frame.addEventListener('load', async () => {
    if (!frame.isConnected) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    const updateReadout = () => {
      els.reads.textContent = doc.querySelector('.version')?.getAttribute('aria-label') || '—';
    };
    previewObserver = new MutationObserver(updateReadout);
    previewObserver.observe(doc.body, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['aria-label'] });
    updateReadout();
    await doc.fonts.ready;
    if (!frame.isConnected) return;
    // Some themes (records, photographs, slides) make tall cards. Show the
    // whole note instead of cropping every theme to the same landscape box.
    const height = Math.max(630, doc.documentElement.scrollHeight);
    frame.style.height = `${height}px`;
    els.preview.style.aspectRatio = `1000 / ${height}`;
  });
}

for (const el of [els.name, els.date, els.note, els.from]) el.addEventListener('input', refresh);
els.theme.addEventListener('change', refresh);
els.work.addEventListener('change', () => { fillThemes(); refresh(); });

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
  els.status.append(copied ? 'Copied — ' : 'Your link: ', a, '. Everything on the card is in that link; nothing is kept here.');
});

fillThemes();
refresh();
