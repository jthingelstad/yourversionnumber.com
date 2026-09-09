import { THEMES, orderForEdition } from '/assets/themes.js';

const EDITION = 'birthday';
const THEME_NAMES = THEMES.map(t => t.name);
const THEME_BY_NAME = Object.fromEntries(THEMES.map(t => [t.name, t]));
const RANDOM_THEME = '__random__';

function pickRandomTheme(except) {
  const pool = except ? THEME_NAMES.filter(n => n !== except) : THEME_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Tinylytics has no JS API — events fire via clicks on elements with
// data-tinylytics-event. For events that don't originate from a click
// (page load, <select> change), proxy through a hidden button.
function trackEvent(name, value) {
  let proxy = document.getElementById('__tly_proxy');
  if (!proxy) {
    proxy = document.createElement('button');
    proxy.id = '__tly_proxy';
    proxy.type = 'button';
    proxy.tabIndex = -1;
    proxy.setAttribute('aria-hidden', 'true');
    proxy.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(proxy);
  }
  proxy.setAttribute('data-tinylytics-event', name);
  if (value != null) proxy.setAttribute('data-tinylytics-event-value', String(value));
  else proxy.removeAttribute('data-tinylytics-event-value');
  proxy.click();
}

const state = { theme: null, themeIsExplicit: false, people: [] };

// Default theme when no ?theme= is in the URL. Pinned to 'birthday' so the
// first paint matches the og-image people see in link previews; "🎲 Surprise
// me" in the picker is the way in to other themes.
const DEFAULT_THEME = 'birthday';

function parseURL() {
  const params = new URLSearchParams(location.search);
  const urlTheme = params.get('theme');
  let theme, themeIsExplicit;
  if (urlTheme && THEME_NAMES.includes(urlTheme)) {
    theme = urlTheme;
    themeIsExplicit = true;
  } else {
    if (urlTheme) console.warn(`Unknown theme "${urlTheme}", using default.`);
    theme = DEFAULT_THEME;
    themeIsExplicit = false;
  }
  const people = [];
  for (const value of params.getAll('p')) {
    const idx = value.indexOf(':');
    const name = idx === -1 ? '' : value.slice(0, idx);
    const birthday = idx === -1 ? value : value.slice(idx + 1);
    if (!DATE_RE.test(birthday) || !isRealDate(birthday)) {
      console.warn(`Skipping invalid date in p=${value}`);
      continue;
    }
    if (isFutureDate(birthday)) {
      console.warn(`Skipping future birthday in p=${value}`);
      continue;
    }
    people.push({ name, birthday });
  }
  return { theme, themeIsExplicit, people };
}

// Deterministic 32-bit hash of a string. Used for per-row visual variation
// that's stable for a given name+birthday — Alice always looks like Alice
// even when Bob is added above her.
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function isRealDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isFutureDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date > todayMid;
}

function writeURL() {
  const params = new URLSearchParams();
  if (state.themeIsExplicit) params.set('theme', state.theme);
  for (const p of state.people) {
    params.append('p', p.name ? `${p.name}:${p.birthday}` : p.birthday);
  }
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function applyTheme(theme) {
  document.getElementById('theme-css').href = `/assets/themes/${theme}.css`;
  document.documentElement.dataset.theme = theme;
}

function computeVersion(birthday, today = new Date()) {
  const [by, bm, bd] = birthday.split('-').map(Number);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let anniversaryYear = todayMid.getFullYear();
  let anniversary = anniversaryDate(anniversaryYear, bm, bd);
  if (todayMid < anniversary) {
    anniversaryYear -= 1;
    anniversary = anniversaryDate(anniversaryYear, bm, bd);
  }

  const age = anniversaryYear - by;
  const major = Math.floor(age / 10);
  const minor = age % 10;
  const patch = Math.round((todayMid - anniversary) / 86_400_000);

  return { major, minor, patch, age };
}

// For Feb 29 birthdays in non-leap years, JS new Date(y, 1, 29) silently rolls
// to March 1 — which matches the spec ("treat Mar 1 as the anniversary").
function anniversaryDate(year, month1Indexed, day) {
  return new Date(year, month1Indexed - 1, day);
}

function formatVersion(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function setFlag(key, on) {
  if (on) document.body.dataset[key] = 'true';
  else delete document.body.dataset[key];
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const count = state.people.length;
  document.body.dataset.peopleCount = count === 0 ? '0' : count === 1 ? '1' : 'many';

  let anyBirthday = false;
  let anyPalindrome = false;
  let anyRoundDecade = false;
  let anyZero = false;
  for (const p of state.people) {
    if (!DATE_RE.test(p.birthday) || !isRealDate(p.birthday) || isFutureDate(p.birthday)) continue;
    const v = computeVersion(p.birthday);
    if (v.patch === 0) anyBirthday = true;
    const digits = `${v.major}${v.minor}${v.patch}`;
    if (digits.length > 1 && digits === digits.split('').reverse().join('')) anyPalindrome = true;
    if (v.major > 0 && v.minor === 0 && v.patch === 0) anyRoundDecade = true;
    if (v.major === 0 && v.minor === 0 && v.patch === 0) anyZero = true;
  }
  setFlag('birthday', anyBirthday);
  setFlag('palindrome', anyPalindrome);
  setFlag('roundDecade', anyRoundDecade);
  setFlag('zero', anyZero);

  const header = document.createElement('header');
  header.className = 'site-header';
  const title = document.createElement('h1');
  title.className = 'site-title';
  title.textContent = 'Your Version Number';
  header.appendChild(title);
  header.appendChild(renderHeaderControls());
  app.appendChild(header);

  if (state.people.length === 0) {
    const intro = document.createElement('p');
    intro.className = 'intro';
    intro.innerHTML = 'A person’s version number is their age in <code>MAJOR.MINOR.PATCH</code> &mdash; decade, year-in-decade, days since their last birthday. Add a birthday to begin.';
    app.appendChild(intro);
  }

  // Decorative layer that themes can paint into (falling leaves, drifting waves,
  // confetti, etc). Empty by default; non-interactive; behind everything.
  const fx = document.createElement('div');
  fx.className = 'theme-fx';
  fx.setAttribute('aria-hidden', 'true');
  app.appendChild(fx);

  const list = document.createElement('div');
  list.className = 'people';
  state.people.forEach((person, i) => list.appendChild(renderRow(person, i)));
  app.appendChild(list);

  if (state.people.length === 0) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-btn';
    addBtn.textContent = '+ Add a birthday';
    addBtn.setAttribute('data-tinylytics-event', 'person.add');
    addBtn.addEventListener('click', () => openEdit({ addBlankRow: true }));
    app.appendChild(addBtn);
  }

  const footer = document.createElement('footer');
  footer.className = 'site-footer';

  const crossLink = document.createElement('div');
  crossLink.className = 'site-cross-link';
  crossLink.innerHTML = 'Now also available &mdash; <a href="/work/">Your Version Number: Work Edition</a>™.';
  footer.appendChild(crossLink);

  const attribution = document.createElement('div');
  attribution.className = 'site-attribution';
  attribution.innerHTML = 'Concept by <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html">Jamie Thingelstad</a>. Source on <a href="https://github.com/jthingelstad/yourversionnumber.com">GitHub</a> &mdash; new themes welcome via pull request. Bookmark this URL to save what’s here, or ';
  attribution.appendChild(makeShareButton());
  attribution.appendChild(document.createTextNode('.'));
  footer.appendChild(attribution);

  const stats = document.createElement('div');
  stats.className = 'site-stats';
  const hitsSpan = document.getElementById('hits-span');
  if (hitsSpan) {
    const hitsWrap = document.createElement('span');
    hitsWrap.className = 'hit-counter';
    hitsWrap.append(hitsSpan, ' visits');
    stats.appendChild(hitsWrap);
  }
  footer.appendChild(stats);
  app.appendChild(footer);
}

function renderRow(person, index) {
  const row = document.createElement('div');
  row.className = 'person';
  row.dataset.rowIndex = String(index);
  // Stable hash of name+birthday so visual variants don't shuffle when rows
  // are added/removed. Variant 0..7 picks one of eight content styles in
  // themes that opt in (slack reactions, polaroid tilt, tarot suits, ...).
  // Hue 0..359 gives each row a deterministic accent color.
  const h = hashStr((person.name || '') + '|' + person.birthday);
  row.dataset.rowVariant = String(h % 8);
  row.style.setProperty('--row-hue', String(h % 360));
  row.style.setProperty('--row-tilt', `${((h % 7) - 3) * 0.6}deg`);

  if (person.name) {
    const nameEl = document.createElement('div');
    nameEl.className = 'person-name';
    nameEl.textContent = person.name;
    row.appendChild(nameEl);
  }

  const version = document.createElement('div');
  version.className = 'version';
  updateVersionDisplay(version, person.birthday);
  row.appendChild(version);

  return row;
}

function renderHeaderControls() {
  const wrap = document.createElement('div');
  wrap.className = 'header-controls';

  // The way back out. An anchor rather than a button so middle-click and
  // open-in-new-tab behave; themes pick it up via the .home-btn selector they
  // already pair with .about-btn and .edit-btn.
  const homeBtn = document.createElement('a');
  homeBtn.className = 'home-btn';
  homeBtn.href = '/';
  homeBtn.textContent = 'Home';
  homeBtn.title = 'Back to yourversionnumber.com';
  homeBtn.setAttribute('data-tinylytics-event', 'home.click');
  wrap.appendChild(homeBtn);

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn';
  editBtn.textContent = 'Birthdays';
  editBtn.setAttribute('data-tinylytics-event', 'edit.open');
  editBtn.addEventListener('click', () => openEdit());
  wrap.appendChild(editBtn);

  wrap.appendChild(renderThemeSelector());

  const aboutBtn = document.createElement('button');
  aboutBtn.type = 'button';
  aboutBtn.className = 'about-btn';
  aboutBtn.textContent = '?';
  aboutBtn.setAttribute('aria-label', 'About');
  aboutBtn.title = 'About';
  aboutBtn.setAttribute('data-tinylytics-event', 'about.open');
  aboutBtn.addEventListener('click', openAbout);
  wrap.appendChild(aboutBtn);

  return wrap;
}

function renderThemeSelector() {
  const wrap = document.createElement('span');
  wrap.className = 'theme-picker';

  const select = document.createElement('select');
  select.className = 'theme-select';
  select.setAttribute('aria-label', 'Theme');

  const randomOpt = document.createElement('option');
  randomOpt.value = RANDOM_THEME;
  randomOpt.textContent = '🎲 Surprise me';
  select.appendChild(randomOpt);

  // Flat list, no optgroups: this edition's natives first, a rule, then the
  // rest. Every theme is selectable in both editions now — `home` only orders.
  const { native, rest } = orderForEdition(EDITION);
  const addOption = (t) => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.label;
    if (t.name === state.theme) opt.selected = true;
    select.appendChild(opt);
  };
  native.forEach(addOption);
  if (rest.length) {
    const rule = document.createElement('option');
    rule.disabled = true;
    rule.textContent = '\u2500'.repeat(10);
    select.appendChild(rule);
    rest.forEach(addOption);
  }

  select.addEventListener('change', () => {
    let next = select.value;
    if (next === RANDOM_THEME) next = pickRandomTheme(state.theme);
    if (state.theme === next) {
      select.value = state.theme;
      return;
    }
    state.theme = next;
    state.themeIsExplicit = true;
    applyTheme(next);
    writeURL();
    trackEvent('theme.change', next);
    render();
  });
  wrap.appendChild(select);
  return wrap;
}

function makeShareButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'share-btn';
  btn.textContent = 'copy link';
  btn.setAttribute('data-tinylytics-event', 'share.copy');
  let resetTimer = null;
  btn.addEventListener('click', async () => {
    const url = location.href;
    let label = null;
    try {
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ url });
        label = 'shared!';
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        label = 'copied!';
      }
    } catch (_) { /* user cancelled or denied */ }
    if (label) {
      btn.textContent = label;
      btn.classList.add('share-btn--ok');
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        btn.textContent = 'copy link';
        btn.classList.remove('share-btn--ok');
      }, 2000);
    }
  });
  return btn;
}

function attachBackdropClose(dialog) {
  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
}

function openAbout() {
  let dialog = document.getElementById('about-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'about-dialog';
    dialog.className = 'app-dialog';
    dialog.innerHTML = `
      <article class="app-dialog__content">
        <header class="app-dialog__header">
          <h2 class="app-dialog__title">About</h2>
          <button type="button" class="app-dialog__close" aria-label="Close">&times;</button>
        </header>
        <div class="app-dialog__body">
          <p>A <strong>version number</strong> for a person, based on their birthday &mdash; just like software.</p>
          <p>Software is versioned <code>MAJOR.MINOR.PATCH</code>. A major bump signals an incompatible change. Minor bumps add features but stay backwards-compatible. Patches are small fixes.</p>
          <p>People work the same way:</p>
          <ul>
            <li><strong>MAJOR</strong> &mdash; your decade. The 30s are not the 20s. Breaking changes.</li>
            <li><strong>MINOR</strong> &mdash; your age inside that decade. Backwards-compatible growth.</li>
            <li><strong>PATCH</strong> &mdash; days since your most recent birthday. Daily refinements.</li>
          </ul>
          <p>Someone who is 46 years old and 52 days past their birthday is on <code>4.6.52</code>.</p>
          <p class="app-dialog__privacy"><strong>Your birthdays stay yours.</strong> The URL is the only place this site keeps them &mdash; no server, no database, nothing collected anywhere. Bookmark a URL to save the view; share it to share the view.</p>
          <p class="app-dialog__credit">Concept from Jamie Thingelstad&rsquo;s 2018 post <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html" target="_blank" rel="noopener">&ldquo;Your Version Number&rdquo;</a>. Now available in a thrilling new flavor &mdash; <a href="/work/">Your Version Number: Work Edition</a>™.</p>
        </div>
      </article>
    `;
    dialog.querySelector('.app-dialog__close').addEventListener('click', () => dialog.close());
    attachBackdropClose(dialog);
    document.body.appendChild(dialog);
  }
  dialog.showModal();
}

function openEdit({ addBlankRow = false } = {}) {
  let dialog = document.getElementById('edit-dialog');
  let list;
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'edit-dialog';
    dialog.className = 'app-dialog';
    dialog.innerHTML = `
      <article class="app-dialog__content">
        <header class="app-dialog__header">
          <h2 class="app-dialog__title">Edit</h2>
          <button type="button" class="app-dialog__close" aria-label="Close">&times;</button>
        </header>
        <div class="app-dialog__body">
          <div class="edit-list"></div>
          <button type="button" class="edit-add">+ Add another</button>
        </div>
      </article>
    `;
    dialog.querySelector('.app-dialog__close').addEventListener('click', () => dialog.close());
    attachBackdropClose(dialog);
    list = dialog.querySelector('.edit-list');
    dialog.querySelector('.edit-add').addEventListener('click', () => {
      const today = new Date().toISOString().slice(0, 10);
      state.people.push({ name: '', birthday: today });
      writeURL();
      render();
      appendEditRow(list, true);
    });
    document.body.appendChild(dialog);
  } else {
    list = dialog.querySelector('.edit-list');
  }

  list.innerHTML = '';
  if (addBlankRow && state.people.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    state.people.push({ name: '', birthday: today });
    writeURL();
    render();
  }
  state.people.forEach(() => appendEditRow(list, false));

  dialog.showModal();

  if (addBlankRow) {
    const inputs = list.querySelectorAll('.edit-row__name');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }
}

function appendEditRow(list, focusName) {
  const row = document.createElement('div');
  row.className = 'edit-row';

  const findIndex = () => Array.from(list.children).indexOf(row);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'edit-row__name';
  nameInput.placeholder = 'Name (optional)';
  nameInput.setAttribute('aria-label', 'Name');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'edit-row__date';
  dateInput.max = new Date().toISOString().slice(0, 10);
  dateInput.setAttribute('aria-label', 'Birthday');

  list.appendChild(row); // append before reading state by index
  const i = findIndex();
  nameInput.value = state.people[i].name;
  dateInput.value = state.people[i].birthday;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'edit-row__remove';
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', 'Remove');
  removeBtn.setAttribute('data-tinylytics-event', 'person.remove');

  const commitName = () => {
    const idx = findIndex();
    if (idx < 0) return;
    const newName = nameInput.value.trim();
    if (newName !== state.people[idx].name) {
      state.people[idx].name = newName;
      writeURL();
      render();
    }
  };

  const commitDate = () => {
    const idx = findIndex();
    if (idx < 0) return;
    const newDate = dateInput.value;
    if (!DATE_RE.test(newDate) || !isRealDate(newDate) || isFutureDate(newDate)) return;
    if (newDate !== state.people[idx].birthday) {
      state.people[idx].birthday = newDate;
      writeURL();
      render();
    }
  };

  removeBtn.addEventListener('click', () => {
    const idx = findIndex();
    if (idx < 0) return;
    state.people.splice(idx, 1);
    writeURL();
    render();
    row.remove();
  });

  nameInput.addEventListener('change', commitName);
  nameInput.addEventListener('blur', commitName);
  dateInput.addEventListener('change', commitDate);
  dateInput.addEventListener('blur', commitDate);

  row.append(nameInput, dateInput, removeBtn);
  if (focusName) nameInput.focus();
}

let isFirstRender = true;

function countUp(el, version) {
  const themeMeta = THEME_BY_NAME[state.theme];
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = themeMeta?.animate && isFirstRender && !reduceMotion;

  if (!shouldAnimate) {
    el.textContent = formatVersion(version);
    return;
  }

  const start = performance.now();
  const duration = 700;
  const ease = t => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const k = ease(t);
    const major = Math.round(version.major * k);
    const minor = Math.round(version.minor * k);
    const patch = Math.round(version.patch * k);
    el.textContent = `${major}.${minor}.${patch}`;
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = formatVersion(version);
  }
  requestAnimationFrame(frame);
}

function updateVersionDisplay(el, birthday) {
  if (!DATE_RE.test(birthday) || !isRealDate(birthday) || isFutureDate(birthday)) {
    el.textContent = '';
    return;
  }
  const v = computeVersion(birthday);
  countUp(el, v);
  el.title = `${v.age} years old, ${v.patch} day${v.patch === 1 ? '' : 's'} since last birthday`;
}

let midnightTimer = null;
function scheduleMidnightTick() {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  midnightTimer = setTimeout(() => {
    render();
    // Flash every row so themes can opt into a "patch++" celebration without
    // tracking which row incremented (in practice, *every* row's patch ticks).
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      document.querySelectorAll('.person').forEach(row => {
        row.classList.add('is-bumping');
        setTimeout(() => row.classList.remove('is-bumping'), 1200);
      });
    }
    scheduleMidnightTick();
  }, next - now);
}

const parsed = parseURL();
state.theme = parsed.theme;
state.themeIsExplicit = parsed.themeIsExplicit;
state.people = parsed.people;
applyTheme(state.theme);
render();
isFirstRender = false;
scheduleMidnightTick();
// Fire after render so the proxy attaches and Tinylytics is more likely loaded.
// Wrapped in a microtask so it runs after the deferred Tinylytics script has had a chance to register its click listener.
setTimeout(() => trackEvent('theme.viewed', state.theme), 0);

// First-visit nudge: pop the About dialog once so new visitors understand the
// MAJOR.MINOR.PATCH framing. A single localStorage flag is the only persisted
// state on the site — no PII, no birthdays, no theme/people memory.
// The theme gallery embeds this page 42 times over. An auto-opening modal in
// every frame would bury the previews it exists to show, so the nudge is for
// top-level visits only.
const isFramed = (() => {
  try { return window.top !== window.self; } catch (_) { return true; }
})();

try {
  if (!isFramed && !localStorage.getItem('yvn-about-seen')) {
    localStorage.setItem('yvn-about-seen', '1');
    // Wait for two animation frames so the page paints once before the modal
    // pops. requestAnimationFrame fires reliably even where short-delay
    // setTimeouts get throttled.
    requestAnimationFrame(() => requestAnimationFrame(openAbout));
  }
} catch (_) { /* localStorage unavailable (private mode, etc.) — skip */ }
