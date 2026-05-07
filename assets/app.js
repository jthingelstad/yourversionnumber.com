// `swatch` is a 3-color palette used to render a tiny preview chip next to the
// theme picker. Pick the most representative colors of the theme.
const THEMES = [
  { name: 'dark',       label: 'Dark',       kind: 'dark',  animate: false, swatch: ['#0f0f10', '#222', '#fafafa'] },
  { name: 'family',     label: 'Family',     kind: 'light', animate: false, swatch: ['#fff8e7', '#d97757', '#3d2914'] },
  { name: 'pastel',     label: 'Pastel',     kind: 'light', animate: false, swatch: ['#fde7f3', '#c8e1ff', '#fff5d6'] },
  { name: 'birthday',   label: 'Birthday',   kind: 'fun',   animate: false, swatch: ['#ff5f8a', '#ffd23f', '#3aaed8'] },
  { name: 'nature',     label: 'Nature',     kind: 'light', animate: false, swatch: ['#f6f1e3', '#4a7c3a', '#3d2f1f'] },
  { name: 'ocean',      label: 'Ocean',      kind: 'dark',  animate: false, swatch: ['#0a2540', '#1a6f9c', '#7fc6d9'] },
  { name: 'galaxy',     label: 'Galaxy',     kind: 'dark',  animate: true,  swatch: ['#0b0524', '#7c3aed', '#f0abfc'] },
  { name: 'zen',        label: 'Zen',        kind: 'light', animate: false, swatch: ['#f5f3ee', '#9b8e7c', '#2c2a26'] },
  { name: 'weather',    label: 'Weather',    kind: 'light', animate: false, swatch: ['#bde0fe', '#ffd166', '#264653'] },
  { name: 'polaroid',   label: 'Polaroid',   kind: 'light', animate: false, swatch: ['#f4ead5', '#fffdf7', '#3a3a3a'] },
  { name: 'tarot',      label: 'Tarot',      kind: 'light', animate: false, swatch: ['#1a0e2e', '#d4af37', '#f4ead5'] },
  { name: 'newspaper',  label: 'Newspaper',  kind: 'light', animate: false, swatch: ['#f4f1ea', '#1a1a1a', '#8b7355'] },
  { name: 'subway',     label: 'Subway',     kind: 'dark',  animate: false, swatch: ['#000', '#fff', '#ee352e'] },
  { name: 'receipt',    label: 'Receipt',    kind: 'light', animate: false, swatch: ['#f9f6ee', '#1a1a1a', '#888'] },
  { name: 'steampunk',  label: 'Steampunk',  kind: 'dark',  animate: false, swatch: ['#2a1810', '#b8860b', '#704214'] },
  { name: 'brutalist',  label: 'Brutalist',  kind: 'light', animate: false, swatch: ['#fff', '#000', '#ff4500'] },
  { name: 'comic',      label: 'Comic',      kind: 'fun',   animate: false, swatch: ['#fff200', '#ed1c24', '#000'] },
  { name: 'memphis',    label: 'Memphis',    kind: 'fun',   animate: false, swatch: ['#ff6b9d', '#fbc846', '#3aaed8'] },
  { name: 'vinyl',      label: 'Vinyl',      kind: 'fun',   animate: true,  swatch: ['#0d0d0d', '#c8a96b', '#e63946'] },
  { name: 'terminal',   label: 'Terminal',   kind: 'retro', animate: true,  swatch: ['#0a0e0a', '#33ff33', '#fff'] },
  { name: 'arcade',     label: 'Arcade',     kind: 'retro', animate: true,  swatch: ['#0a0a23', '#ff2e88', '#ffd23f'] },
  { name: 'vaporwave',  label: 'Vaporwave',  kind: 'retro', animate: true,  swatch: ['#1a0a2e', '#ff71ce', '#01cdfe'] },
  { name: 'y2k',        label: 'Y2K',        kind: 'retro', animate: true,  swatch: ['#c0c0c0', '#ff00ff', '#00ffff'] },
  { name: 'pixel',      label: 'Pixel',      kind: 'retro', animate: true,  swatch: ['#0f380f', '#9bbc0f', '#306230'] },
  { name: 'gameboy',    label: 'Gameboy',    kind: 'retro', animate: true,  swatch: ['#9bbc0f', '#306230', '#0f380f'] },
];
const THEME_NAMES = THEMES.map(t => t.name);
const THEME_BY_NAME = Object.fromEntries(THEMES.map(t => [t.name, t]));
const THEME_KINDS = ['light', 'dark', 'fun', 'retro'];
const KIND_LABELS = { light: 'Light', dark: 'Dark', fun: 'Fun', retro: 'Retro' };
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

function parseURL() {
  const params = new URLSearchParams(location.search);
  const urlTheme = params.get('theme');
  let theme, themeIsExplicit;
  if (urlTheme && THEME_NAMES.includes(urlTheme)) {
    theme = urlTheme;
    themeIsExplicit = true;
  } else {
    if (urlTheme) console.warn(`Unknown theme "${urlTheme}", picking a random one.`);
    theme = pickRandomTheme();
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
  document.getElementById('theme-css').href = `themes/${theme}.css`;
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
  return `v${v.major}.${v.minor}.${v.patch}`;
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
    if (!DATE_RE.test(p.birthday) || !isRealDate(p.birthday)) continue;
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
  attribution.innerHTML = 'Concept by <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html">Jamie Thingelstad</a>. Source on <a href="https://github.com/jthingelstad/yourversionnumber.com">GitHub</a> &mdash; new themes welcome via pull request. Bookmark this URL to save what’s here.';
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

  const swatch = document.createElement('span');
  swatch.className = 'theme-swatch';
  swatch.setAttribute('aria-hidden', 'true');
  paintSwatch(swatch, state.theme);
  wrap.appendChild(swatch);

  const select = document.createElement('select');
  select.className = 'theme-select';
  select.setAttribute('aria-label', 'Theme');

  const randomOpt = document.createElement('option');
  randomOpt.value = RANDOM_THEME;
  randomOpt.textContent = '🎲 Surprise me';
  select.appendChild(randomOpt);

  for (const kind of THEME_KINDS) {
    const group = document.createElement('optgroup');
    group.label = KIND_LABELS[kind];
    for (const t of THEMES.filter(t => t.kind === kind)) {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.label;
      if (t.name === state.theme) opt.selected = true;
      group.appendChild(opt);
    }
    select.appendChild(group);
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

function paintSwatch(el, themeName) {
  const t = THEME_BY_NAME[themeName];
  const s = t?.swatch || ['#888', '#bbb', '#eee'];
  el.style.background =
    `conic-gradient(from 210deg, ${s[0]} 0 33.3%, ${s[1]} 33.3% 66.6%, ${s[2]} 66.6% 100%)`;
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
          <p>Someone who is 46 years old and 52 days past their birthday is on <code>v4.6.52</code>.</p>
          <p class="app-dialog__credit">Concept from Jamie Thingelstad&rsquo;s 2018 post <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html" target="_blank" rel="noopener">&ldquo;Your Version Number&rdquo;</a>. Now available in a thrilling new flavor &mdash; <a href="/work/">Your Version Number: Work Edition</a>™.</p>
          <p class="app-dialog__tip">Tip: the URL holds everything &mdash; names, birthdays, theme. Bookmark a URL to save the view.</p>
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
    if (!DATE_RE.test(newDate) || !isRealDate(newDate)) return;
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
    el.textContent = `v${major}.${minor}.${patch}`;
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = formatVersion(version);
  }
  requestAnimationFrame(frame);
}

function updateVersionDisplay(el, birthday) {
  if (!DATE_RE.test(birthday) || !isRealDate(birthday)) {
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
