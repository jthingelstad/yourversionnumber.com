// The card composer.
//
// Three fields and a theme. The preview is the real card page, so what the
// sender sees is what arrives — there is no second implementation of anything.

import { THEMES, orderForEdition } from '/assets/themes.js';
import { mountPreview } from '/assets/preview.js';

const form = document.getElementById('compose');
const els = Object.fromEntries(['name', 'date', 'work', 'theme', 'note', 'from', 'reads',
                                'url', 'preview', 'submit', 'status', 'left', 'count']
  .map((k) => [k, document.getElementById('c-' + k)]));

function version(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = midnight.getFullYear();
  let anniversary = new Date(year, m - 1, d);
  if (midnight < anniversary) { year -= 1; anniversary = new Date(year, m - 1, d); }
  const age = year - y;
  return `${Math.floor(age / 10)}.${age % 10}.${Math.round((midnight - anniversary) / 86_400_000)}`;
}

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
  const date = els.date.value;
  els.reads.textContent = /^\d{4}-\d{2}-\d{2}$/.test(date) ? version(date) : '—';
  els.left.textContent = String(140 - els.note.value.length);

  if (!date || !els.name.value) return;
  const edition = els.work.checked ? 'work' : 'birthday';
  const params = new URLSearchParams();
  params.set('theme', els.theme.value);
  params.append(edition === 'work' ? 'j' : 'p', `${els.name.value}:${date}`);
  mountPreview(els.preview.parentElement, `/${edition}/?${params}`, 'Card preview');
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
