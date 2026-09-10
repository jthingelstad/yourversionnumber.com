import { THEMES, orderForEdition } from '/assets/themes.js';
import { applyEnvironment, applyCountdown, renderVersionDigits, watchForInteraction, playChime, readCardData, renderCardMessage } from '/assets/core.js';

const EDITION = 'work';
const THEME_NAMES = THEMES.map(t => t.name);
const THEME_BY_NAME = Object.fromEntries(THEMES.map(t => [t.name, t]));
const RANDOM_THEME = '__random__';

function pickRandomTheme(except) {
  const pool = except ? THEME_NAMES.filter(n => n !== except) : THEME_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

const state = { theme: null, themeIsExplicit: false, roles: [] };

// Default theme when no ?theme= is in the URL. Pinned to 'earnings' so the
// first paint matches the og-image people see in link previews.
const DEFAULT_THEME = 'earnings';

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
  const roles = [];
  for (const value of params.getAll('j')) {
    const idx = value.indexOf(':');
    const title = idx === -1 ? '' : value.slice(0, idx);
    const startDate = idx === -1 ? value : value.slice(idx + 1);
    if (!DATE_RE.test(startDate) || !isRealDate(startDate)) {
      console.warn(`Skipping invalid date in j=${value}`);
      continue;
    }
    if (isFutureDate(startDate)) {
      console.warn(`Skipping future start date in j=${value}`);
      continue;
    }
    roles.push({ title, startDate });
  }
  return { theme, themeIsExplicit, roles };
}

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
  for (const r of state.roles) {
    params.append('j', r.title ? `${r.title}:${r.startDate}` : r.startDate);
  }
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function applyTheme(theme) {
  document.getElementById('theme-css').href = `/assets/themes/${theme}.css`;
  document.documentElement.dataset.theme = theme;
}

// Feb 29 starts: new Date(y, 1, 29) silently rolls to March 1 in non-leap years,
// matching the convention used by the birthday version.
function anniversaryDate(year, month1Indexed, day) {
  return new Date(year, month1Indexed - 1, day);
}

function computeWorkVersion(startDate, today = new Date()) {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const startMid = new Date(sy, sm - 1, sd);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (todayMid < startMid) return null;

  let anniversaryYear = todayMid.getFullYear();
  let anniversary = anniversaryDate(anniversaryYear, sm, sd);
  if (todayMid < anniversary) {
    anniversaryYear -= 1;
    anniversary = anniversaryDate(anniversaryYear, sm, sd);
  }

  const tenureYears = anniversaryYear - sy;

  // Quarters are 3 calendar months on the anniversary day-of-month.
  // Start Feb 10 → Q1 May 10, Q2 Aug 10, Q3 Nov 10. End-of-month rollover
  // (e.g. Aug 31 → Nov 31 → Dec 1) follows JS's Date convention, matching
  // how anniversaryDate handles Feb 29.
  let minor = 0;
  let quarterStart = anniversary;
  for (let q = 1; q <= 3; q++) {
    const candidate = anniversaryDate(anniversaryYear, sm + q * 3, sd);
    if (todayMid >= candidate) {
      minor = q;
      quarterStart = candidate;
    } else {
      break;
    }
  }

  const patch = businessDaysBetween(quarterStart, todayMid);

  // The quarter this patch sits in, measured the same way the patch is — in
  // business days — so --patch-pct is a real fraction of the quarter.
  const nextQuarterStart = anniversaryDate(anniversaryYear, sm + (minor + 1) * 3, sd);
  const cycleDays = Math.max(1, businessDaysBetween(quarterStart, nextQuarterStart));
  const nextAnniversary = anniversaryDate(anniversaryYear + 1, sm, sd);
  const daysUntil = Math.round((nextAnniversary - todayMid) / 86_400_000);

  return { major: tenureYears, minor, patch, cycleDays, daysUntil };
}

// Counts business days (Mon–Fri) strictly after `start`, up to and including `end`.
// PATCH = 0 on the quarter-start date; weekends do not tick PATCH.
function businessDaysBetween(start, end) {
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) count++;
  }
  return count;
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

  document.body.dataset.mode = 'work';

  const count = state.roles.length;
  document.body.dataset.peopleCount = count === 0 ? '0' : count === 1 ? '1' : 'many';

  let anyQuarterStart = false;
  let anyAnniversary = false;
  let anyPalindrome = false;
  let anyRoundDecade = false;
  let soonest = null;
  let soonestVersion = '';
  let firstPct = null;
  for (const r of state.roles) {
    if (!DATE_RE.test(r.startDate) || !isRealDate(r.startDate) || isFutureDate(r.startDate)) continue;
    const v = computeWorkVersion(r.startDate);
    if (!v) continue;
    if (v.patch === 0) anyQuarterStart = true;
    if (v.minor === 0 && v.patch === 0) anyAnniversary = true;
    const digits = `${v.major}${v.minor}${v.patch}`;
    if (digits.length > 1 && digits === digits.split('').reverse().join('')) anyPalindrome = true;
    if (v.major > 0 && v.major % 10 === 0 && v.minor === 0 && v.patch === 0) anyRoundDecade = true;
    if (firstPct === null) firstPct = v.patch / v.cycleDays;
    if (soonest === null || v.daysUntil < soonest) {
      soonest = v.daysUntil;
      soonestVersion = `${v.major + 1}.0.0`;
    }
  }

  if (firstPct === null) document.body.style.removeProperty('--patch-pct');
  else document.body.style.setProperty('--patch-pct', firstPct.toFixed(4));
  setFlag('quarterStart', anyQuarterStart);
  setFlag('tenureAnniversary', anyAnniversary);
  setFlag('palindrome', anyPalindrome);
  setFlag('roundDecade', anyRoundDecade);

  const header = document.createElement('header');
  header.className = 'site-header';
  const title = document.createElement('h1');
  title.className = 'site-title';
  title.innerHTML = 'Your Version Number: <span class="edition">Work Edition</span><sup class="tm">™</sup>';
  header.appendChild(title);
  if (!CARD) header.appendChild(renderHeaderControls());
  else header.appendChild(renderHomeOnly());
  app.appendChild(header);

  if (state.roles.length === 0) {
    const intro = document.createElement('p');
    intro.className = 'intro';
    intro.innerHTML = 'It’s the version number you know and love &mdash; now <strong>ENTERPRISE-READY</strong>. The <strong>Work Edition</strong>™ ships with <code>YEARS.QUARTERS.DAYS</code>, where days are <em>business</em> days, because real work doesn’t happen on weekends. Synergize your timeline. Add a role to begin.';
    app.appendChild(intro);
  }

  const fx = document.createElement('div');
  fx.className = 'theme-fx';
  fx.setAttribute('aria-hidden', 'true');
  app.appendChild(fx);

  const list = document.createElement('div');
  list.className = 'people';
  state.roles.forEach((role, i) => list.appendChild(renderRow(role, i)));
  app.appendChild(list);

  if (state.roles.length === 0) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-btn';
    addBtn.textContent = '+ Onboard a role';
    addBtn.setAttribute('data-tinylytics-event', 'role.add');
    addBtn.addEventListener('click', () => openEdit({ addBlankRow: true }));
    app.appendChild(addBtn);
  }

  if (CARD) app.appendChild(renderCardMessage(CARD));

  applyCountdown(soonest, soonestVersion);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';

  const crossLink = document.createElement('div');
  crossLink.className = 'site-cross-link';
  crossLink.innerHTML = 'A wholly-owned subsidiary of <a href="/birthday/">Your Version Number</a> &mdash; the original birthday-powered semver.';
  footer.appendChild(crossLink);

  const attribution = document.createElement('div');
  attribution.className = 'site-attribution';
  attribution.innerHTML = 'Concept by <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html">Jamie Thingelstad</a>. Source on <a href="https://github.com/jthingelstad/yourversionnumber.com">GitHub</a>. Bookmark this URL to lock in your value proposition, or ';
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

function renderRow(role, index) {
  const row = document.createElement('div');
  row.className = 'person';
  row.dataset.rowIndex = String(index);
  const h = hashStr((role.title || '') + '|' + role.startDate);
  row.dataset.rowVariant = String(h % 8);
  row.style.setProperty('--row-hue', String(h % 360));
  row.style.setProperty('--row-tilt', `${((h % 7) - 3) * 0.6}deg`);

  if (role.title) {
    const nameEl = document.createElement('div');
    nameEl.className = 'person-name';
    nameEl.textContent = role.title;
    row.appendChild(nameEl);
  }

  const version = document.createElement('div');
  version.className = 'version';
  row.appendChild(version);
  updateVersionDisplay(version, role.startDate, row);

  return row;
}

// On a card there is nothing to configure, so the header keeps only the way out.
function renderHomeOnly() {
  const wrap = document.createElement('div');
  wrap.className = 'header-controls';
  const homeBtn = document.createElement('a');
  homeBtn.className = 'home-btn';
  homeBtn.href = '/';
  homeBtn.textContent = 'Home';
  homeBtn.title = 'Back to yourversionnumber.com';
  wrap.appendChild(homeBtn);
  return wrap;
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
  editBtn.textContent = 'Roles';
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
          <p>Introducing the <strong>Work Edition</strong>™ &mdash; the same beloved <code>MAJOR.MINOR.PATCH</code> you trust, now <strong>OPTIMIZED FOR THE MODERN ENTERPRISE</strong>. Where the original tracked your trip around the sun, the Work Edition™ tracks your trip through the corporate calendar. Quarters. OKRs. Earnings. The eternal march of fiscal time.</p>
          <ul>
            <li><strong>MAJOR</strong> &mdash; years of tenure. Bumps when HR sends the anniversary email.</li>
            <li><strong>MINOR</strong> &mdash; quarter (0&ndash;3). Three calendar months from your start date &mdash; if you started Feb 10, Q1 begins May 10. The unit of all things scheduled, planned, and reviewed.</li>
            <li><strong>PATCH</strong> &mdash; business days into the quarter. Weekends do not tick, because real work doesn&rsquo;t happen on weekends. <em>You&rsquo;re welcome.</em></li>
          </ul>
          <p>Hired on 2024-01-15? Today you&rsquo;re shipping <code>2.1.15</code>. That&rsquo;s two years of impact, into the second quarter (0-indexed, because we&rsquo;re engineers), fifteen work-days deep. <strong>Ship it.</strong></p>
          <p class="app-dialog__privacy"><strong>Your dates stay yours.</strong> The URL is the only place this site keeps them &mdash; no server, no database, nothing collected anywhere. Bookmark a URL to lock it in; share it to brag.</p>
          <p class="app-dialog__credit">Concept from Jamie Thingelstad&rsquo;s 2018 post <a href="https://www.thingelstad.com/2018/02/24/your-version-number.html" target="_blank" rel="noopener">&ldquo;Your Version Number&rdquo;</a>. For the birthday version, see <a href="/birthday/">Your Version Number</a>.</p>
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
      state.roles.push({ title: '', startDate: today });
      writeURL();
      render();
      appendEditRow(list, true);
    });
    document.body.appendChild(dialog);
  } else {
    list = dialog.querySelector('.edit-list');
  }

  list.innerHTML = '';
  if (addBlankRow && state.roles.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    state.roles.push({ title: '', startDate: today });
    writeURL();
    render();
  }
  state.roles.forEach(() => appendEditRow(list, false));

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
  nameInput.placeholder = 'Title (optional)';
  nameInput.setAttribute('aria-label', 'Title');

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'edit-row__date';
  dateInput.max = new Date().toISOString().slice(0, 10);
  dateInput.setAttribute('aria-label', 'Start date');

  list.appendChild(row);
  const i = findIndex();
  nameInput.value = state.roles[i].title;
  dateInput.value = state.roles[i].startDate;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'edit-row__remove';
  removeBtn.textContent = '×';
  removeBtn.setAttribute('aria-label', 'Remove');
  removeBtn.setAttribute('data-tinylytics-event', 'role.remove');

  const commitName = () => {
    const idx = findIndex();
    if (idx < 0) return;
    const newName = nameInput.value.trim();
    if (newName !== state.roles[idx].title) {
      state.roles[idx].title = newName;
      writeURL();
      render();
    }
  };

  const commitDate = () => {
    const idx = findIndex();
    if (idx < 0) return;
    const newDate = dateInput.value;
    if (!DATE_RE.test(newDate) || !isRealDate(newDate) || isFutureDate(newDate)) return;
    if (newDate !== state.roles[idx].startDate) {
      state.roles[idx].startDate = newDate;
      writeURL();
      render();
    }
  };

  removeBtn.addEventListener('click', () => {
    const idx = findIndex();
    if (idx < 0) return;
    state.roles.splice(idx, 1);
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
    renderVersionDigits(el, formatVersion(version));
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
    else renderVersionDigits(el, formatVersion(version));
  }
  requestAnimationFrame(frame);
}

function updateVersionDisplay(el, startDate, row) {
  if (!DATE_RE.test(startDate) || !isRealDate(startDate)) {
    el.textContent = '';
    el.removeAttribute('aria-label');
    return;
  }
  const v = computeWorkVersion(startDate);
  if (!v) {
    el.textContent = '';
    el.removeAttribute('aria-label');
    return;
  }
  if (row) {
    row.style.setProperty('--major', String(v.major));
    row.style.setProperty('--minor', String(v.minor));
    row.style.setProperty('--patch', String(v.patch));
    row.style.setProperty('--patch-pct', (v.patch / v.cycleDays).toFixed(4));
  }
  countUp(el, v);
  const yearWord = v.major === 1 ? 'year' : 'years';
  const dayWord = v.patch === 1 ? 'day' : 'days';
  el.title = `${v.major} ${yearWord} of tenure, quarter ${v.minor} of 4, ${v.patch} business ${dayWord} in`;
}

let midnightTimer = null;
function scheduleMidnightTick() {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  midnightTimer = setTimeout(() => {
    applyEnvironment(EDITION);
    render();
    playChime(THEME_BY_NAME[state.theme]?.chime);
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

applyEnvironment(EDITION);
watchForInteraction();

// A card page carries its record in a script tag rather than the URL. When one
// is present the page shows exactly that person and hides everything that
// would let you change it.
const CARD = readCardData();
if (CARD) document.body.dataset.card = '';

const parsed = parseURL();
state.theme = CARD?.theme || parsed.theme;
state.themeIsExplicit = CARD ? true : parsed.themeIsExplicit;
state.roles = CARD
  ? [{ name: CARD.name, startDate: CARD.date }]
  : parsed.roles;
applyTheme(state.theme);
render();
isFirstRender = false;
scheduleMidnightTick();
setTimeout(() => trackEvent('theme.viewed', state.theme), 0);

// First-visit nudge: pop the About dialog once so new visitors understand the
// YEARS.QUARTERS.DAYS framing. Single boolean in localStorage — no PII.
// The gallery embeds this page 28 times over, and the link-preview renderer
// loads it in a fresh browser every time — an auto-opening modal would bury the
// previews it exists to show, and would be the photograph in every unfurl. The
// nudge is for top-level visits that are not cards.
const isFramed = (() => {
  try { return window.top !== window.self; } catch (_) { return true; }
})();

try {
  if (!isFramed && !CARD && !localStorage.getItem('yvnw-about-seen')) {
    localStorage.setItem('yvnw-about-seen', '1');
    requestAnimationFrame(() => requestAnimationFrame(openAbout));
  }
} catch (_) { /* localStorage unavailable (private mode, etc.) — skip */ }
