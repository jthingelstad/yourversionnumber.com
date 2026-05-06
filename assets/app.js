const THEMES = [
  { name: 'dark',       label: 'Dark',       kind: 'dark',  animate: false },
  { name: 'family',     label: 'Family',     kind: 'light', animate: false },
  { name: 'pastel',     label: 'Pastel',     kind: 'light', animate: false },
  { name: 'birthday',   label: 'Birthday',   kind: 'fun',   animate: false },
  { name: 'nature',     label: 'Nature',     kind: 'light', animate: false },
  { name: 'ocean',      label: 'Ocean',      kind: 'dark',  animate: false },
  { name: 'galaxy',     label: 'Galaxy',     kind: 'dark',  animate: true  },
  { name: 'zen',        label: 'Zen',        kind: 'light', animate: false },
  { name: 'terminal',   label: 'Terminal',   kind: 'retro', animate: true  },
  { name: 'arcade',     label: 'Arcade',     kind: 'retro', animate: true  },
  { name: 'vaporwave',  label: 'Vaporwave',  kind: 'retro', animate: true  },
  { name: 'y2k',        label: 'Y2K',        kind: 'retro', animate: true  },
  { name: 'newspaper',  label: 'Newspaper',  kind: 'light', animate: false },
  { name: 'steampunk',  label: 'Steampunk',  kind: 'dark',  animate: false },
  { name: 'brutalist',  label: 'Brutalist',  kind: 'light', animate: false },
  { name: 'comic',      label: 'Comic',      kind: 'fun',   animate: false },
  { name: 'memphis',    label: 'Memphis',    kind: 'fun',   animate: false },
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

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const count = state.people.length;
  document.body.dataset.peopleCount = count === 0 ? '0' : count === 1 ? '1' : 'many';

  const anyBirthday = state.people.some(p => {
    if (!DATE_RE.test(p.birthday) || !isRealDate(p.birthday)) return false;
    return computeVersion(p.birthday).patch === 0;
  });
  if (anyBirthday) document.body.dataset.birthday = 'true';
  else delete document.body.dataset.birthday;

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

  const list = document.createElement('div');
  list.className = 'people';
  state.people.forEach(person => list.appendChild(renderRow(person)));
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

function renderRow(person) {
  const row = document.createElement('div');
  row.className = 'person';

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
  return select;
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
