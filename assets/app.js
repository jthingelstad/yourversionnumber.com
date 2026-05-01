const THEMES = ['default', 'family', 'terminal', 'vaporwave', 'brutalist', 'comic', 'newspaper', 'arcade'];
const DEFAULT_THEME = 'default';
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

const state = { theme: DEFAULT_THEME, people: [] };

function parseURL() {
  const params = new URLSearchParams(location.search);
  let theme = params.get('theme') || DEFAULT_THEME;
  if (!THEMES.includes(theme)) {
    console.warn(`Unknown theme "${theme}", falling back to "${DEFAULT_THEME}".`);
    theme = DEFAULT_THEME;
  }
  const people = [];
  for (const value of params.getAll('p')) {
    const idx = value.indexOf(':');
    if (idx === -1) {
      console.warn(`Skipping malformed p=${value} (missing ":")`);
      continue;
    }
    const name = value.slice(0, idx);
    const birthday = value.slice(idx + 1);
    if (!DATE_RE.test(birthday) || !isRealDate(birthday)) {
      console.warn(`Skipping invalid date in p=${value}`);
      continue;
    }
    people.push({ name, birthday });
  }
  return { theme, people };
}

function isRealDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function writeURL() {
  const params = new URLSearchParams();
  if (state.theme !== DEFAULT_THEME) params.set('theme', state.theme);
  for (const p of state.people) {
    params.append('p', `${p.name}:${p.birthday}`);
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
  state.people.forEach((person, i) => list.appendChild(renderRow(person, i)));
  app.appendChild(list);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-btn';
  addBtn.textContent = '+ Add a birthday';
  addBtn.setAttribute('data-tinylytics-event', 'person.add');
  addBtn.addEventListener('click', addNewRow);
  app.appendChild(addBtn);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = 'Concept by <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html">Jamie Thingelstad</a>. Bookmark this URL to save what’s here.';

  const stats = document.createElement('div');
  stats.className = 'site-stats';
  const hitsSpan = document.getElementById('hits-span');
  const countriesSpan = document.getElementById('countries-span');
  if (hitsSpan) {
    const hitsWrap = document.createElement('span');
    hitsWrap.className = 'hit-counter';
    hitsWrap.append(hitsSpan, ' visits');
    stats.appendChild(hitsWrap);
  }
  if (countriesSpan) {
    const flagsWrap = document.createElement('span');
    flagsWrap.className = 'visitor-flags';
    flagsWrap.append('Hello from ', countriesSpan);
    stats.appendChild(flagsWrap);
  }
  footer.appendChild(stats);
  app.appendChild(footer);
}

function renderRow(person, index) {
  const row = document.createElement('div');
  row.className = 'person';
  row.dataset.index = String(index);

  const version = document.createElement('div');
  version.className = 'version';
  updateVersionDisplay(version, person.birthday);

  const meta = document.createElement('div');
  meta.className = 'person-meta';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'name-input';
  nameInput.placeholder = 'Name (optional)';
  nameInput.value = person.name;
  nameInput.setAttribute('aria-label', 'Name');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'date-input';
  dateInput.value = person.birthday;
  dateInput.max = new Date().toISOString().slice(0, 10);
  dateInput.setAttribute('aria-label', 'Birthday');

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove';
  removeBtn.setAttribute('aria-label', 'Remove');
  removeBtn.setAttribute('data-tinylytics-event', 'person.remove');
  removeBtn.addEventListener('click', () => {
    state.people.splice(index, 1);
    writeURL();
    render();
  });

  const commitName = () => {
    const newName = nameInput.value.trim();
    if (newName !== state.people[index].name) {
      state.people[index].name = newName;
      writeURL();
    }
  };

  const commitDate = () => {
    const newDate = dateInput.value;
    if (!DATE_RE.test(newDate) || !isRealDate(newDate)) return;
    if (newDate !== state.people[index].birthday) {
      state.people[index].birthday = newDate;
      writeURL();
      updateVersionDisplay(version, newDate);
    }
  };

  nameInput.addEventListener('change', commitName);
  nameInput.addEventListener('blur', commitName);
  dateInput.addEventListener('change', commitDate);
  dateInput.addEventListener('blur', commitDate);

  meta.append(nameInput, dateInput, removeBtn);
  row.append(version, meta);
  return row;
}

function renderHeaderControls() {
  const wrap = document.createElement('div');
  wrap.className = 'header-controls';
  wrap.appendChild(renderThemeSelector());

  const aboutBtn = document.createElement('button');
  aboutBtn.type = 'button';
  aboutBtn.className = 'about-btn';
  aboutBtn.textContent = 'About';
  aboutBtn.setAttribute('data-tinylytics-event', 'about.open');
  aboutBtn.addEventListener('click', openAbout);
  wrap.appendChild(aboutBtn);

  return wrap;
}

function renderThemeSelector() {
  const select = document.createElement('select');
  select.className = 'theme-select';
  select.setAttribute('aria-label', 'Theme');
  for (const name of THEMES) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === state.theme) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    const next = select.value;
    if (state.theme === next) return;
    state.theme = next;
    applyTheme(next);
    writeURL();
    trackEvent('theme.change', next);
    render();
  });
  return select;
}

function openAbout() {
  let dialog = document.getElementById('about-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'about-dialog';
    dialog.className = 'about-dialog';
    dialog.innerHTML = `
      <article class="about-content">
        <header class="about-header">
          <h2>About</h2>
          <button type="button" class="about-close" aria-label="Close">&times;</button>
        </header>
        <p>A <strong>version number</strong> for a person, based on their birthday &mdash; just like software.</p>
        <p>Software is versioned <code>MAJOR.MINOR.PATCH</code>. A major bump signals an incompatible change. Minor bumps add features but stay backwards-compatible. Patches are small fixes.</p>
        <p>People work the same way:</p>
        <ul class="about-list">
          <li><strong>MAJOR</strong> &mdash; your decade. The 30s are not the 20s. Breaking changes.</li>
          <li><strong>MINOR</strong> &mdash; your age inside that decade. Backwards-compatible growth.</li>
          <li><strong>PATCH</strong> &mdash; days since your most recent birthday. Daily refinements.</li>
        </ul>
        <p>Someone who is 46 years old and 52 days past their birthday is on <code>v4.6.52</code>.</p>
        <p class="about-credit">Concept from Jamie Thingelstad&rsquo;s 2018 post <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html" target="_blank" rel="noopener">&ldquo;Your Version Number&rdquo;</a>.</p>
        <p class="about-tip">Tip: the URL holds everything &mdash; names, birthdays, theme. Bookmark a URL to save the view.</p>
      </article>
    `;
    dialog.querySelector('.about-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
    document.body.appendChild(dialog);
  }
  dialog.showModal();
}

function updateVersionDisplay(el, birthday) {
  if (!DATE_RE.test(birthday) || !isRealDate(birthday)) {
    el.textContent = '';
    return;
  }
  const v = computeVersion(birthday);
  el.textContent = formatVersion(v);
  el.title = `${v.age} years old, ${v.patch} day${v.patch === 1 ? '' : 's'} since last birthday`;
}

function addNewRow() {
  const today = new Date().toISOString().slice(0, 10);
  state.people.push({ name: '', birthday: today });
  writeURL();
  render();
  const rows = document.querySelectorAll('.person');
  const last = rows[rows.length - 1];
  if (last) last.querySelector('.name-input').focus();
}

const parsed = parseURL();
state.theme = parsed.theme;
state.people = parsed.people;
applyTheme(state.theme);
render();
// Fire after render so the proxy attaches and Tinylytics is more likely loaded.
// Wrapped in a microtask so it runs after the deferred Tinylytics script has had a chance to register its click listener.
setTimeout(() => trackEvent('theme.viewed', state.theme), 0);
