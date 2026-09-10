// The card composer.
//
// Three fields and a theme. The preview is the real card page, so what the
// sender sees is what arrives — there is no second implementation of anything.

import { THEMES, orderForEdition } from '/assets/themes.js';
import { mountPreview } from '/assets/preview.js?v=2';
import { localDateString } from '/assets/core.js?v=2';

const form = document.getElementById('compose');
const els = Object.fromEntries(['name', 'date', 'work', 'theme', 'note', 'from', 'reads',
                                'url', 'preview', 'submit', 'status', 'left', 'count']
  .map((k) => [k, document.getElementById('c-' + k)]));

els.date.max = localDateString();
let previewKey = '';
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
  els.left.textContent = String(140 - els.note.value.length);
  const date = els.date.value;
  const name = els.name.value.trim();
  if (!date || !els.date.validity.valid || !name) {
    previewKey = '';
    previewObserver?.disconnect();
    els.preview.replaceChildren();
    els.reads.textContent = '—';
    return;
  }

  const edition = els.work.checked ? 'work' : 'birthday';
  const card = { name, date, theme: els.theme.value, occasion: edition,
    note: els.note.value.trim(), from: els.from.value.trim() };
  const key = JSON.stringify(card);
  if (key === previewKey) return;
  previewKey = key;
  previewObserver?.disconnect();
  els.reads.textContent = '—';

  // Use the same card-data and edition renderer as the delivered card. Keep
  // the draft in this document: no API write or personal data in preview URLs.
  const frame = mountPreview(els.preview, 'about:blank', 'Card preview');
  frame.style.height = '630px';
  els.preview.style.aspectRatio = '1000 / 630';
  frame.addEventListener('load', async () => {
    if (!frame.isConnected) return;
    const doc = frame.contentDocument;
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
  frame.srcdoc = `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Card preview</title>
    <link rel="stylesheet" href="/${edition}/assets/base.css?v=5">
    <link id="theme-css" rel="stylesheet" href="/assets/themes/${card.theme}.css">
    <script id="card-data" type="application/json">${key.replace(/</g, '\\u003c')}</script>
    </head><body data-og><main id="app"></main>
    <script type="module" src="/${edition}/assets/app.js?v=5"></script></body></html>`;
}

for (const el of [els.name, els.date, els.note, els.from]) el.addEventListener('input', refresh);
els.theme.addEventListener('change', refresh);
els.work.addEventListener('change', () => { fillThemes(); refresh(); });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.submit.disabled = true;
  els.status.textContent = 'Creating…';
  try {
    const res = await fetch('/api/card', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: els.name.value.trim(),
        date: els.date.value,
        occasion: els.work.checked ? 'work' : 'birthday',
        theme: els.theme.value,
        note: els.note.value.trim(),
        from: els.from.value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'could not create the card');
    const link = `${location.origin}/c/${data.code}`;
    els.url.textContent = `/c/${data.code}`;
    els.status.innerHTML = '';
    const a = document.createElement('a');
    a.href = link;
    a.textContent = link;
    els.status.append('Ready — ', a, '. Send it now; it will be counting down when they open it.');
    try { await navigator.clipboard.writeText(link); } catch (_) { /* clipboard is a nicety */ }
  } catch (err) {
    els.status.textContent = err.message;
  } finally {
    els.submit.disabled = false;
  }
});

fillThemes();
refresh();
