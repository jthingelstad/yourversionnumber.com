// The spine's shared behaviour: the site's own version number, the .vnum
// renderer every page uses, the days-since line, and the midnight tick.
//
// yourversionnumber.com shipped on 2026-05-01, so it has an age, so it has a
// version number. It is the shortest possible explanation of what the site
// does, and it stays true without maintenance.

const LAUNCH = '2026-05-01';

// Same arithmetic as birthday/assets/app.js computeVersion(), kept in step by
// hand: the spine must never disagree with the edition it links to.
export function computeVersion(since, today = new Date()) {
  const [y, m, d] = since.split('-').map(Number);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let year = midnight.getFullYear();
  let anniversary = new Date(year, m - 1, d);
  if (midnight < anniversary) {
    year -= 1;
    anniversary = new Date(year, m - 1, d);
  }
  const age = year - y;
  return {
    age,
    major: Math.floor(age / 10),
    minor: age % 10,
    patch: Math.round((midnight - anniversary) / 86_400_000),
  };
}

export function versionString(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

// Same as work/edition/assets/app.js computeWorkVersion(), kept in step by
// hand. YEARS = completed years in the seat; QUARTERS =
// which three-month step of the tenure year (1-4, from the start date, not
// January); DAYS = business days since that quarter began. Month-end
// anniversaries roll forward the way JS dates do: three months after 31
// January is 1 May.
export function computeTenure(start, today = new Date()) {
  const [sy, sm, sd] = start.split('-').map(Number);
  const startMid = new Date(sy, sm - 1, sd);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (todayMid < startMid) return null;

  let anniversaryYear = todayMid.getFullYear();
  let anniversary = new Date(anniversaryYear, sm - 1, sd);
  if (todayMid < anniversary) {
    anniversaryYear -= 1;
    anniversary = new Date(anniversaryYear, sm - 1, sd);
  }
  const years = anniversaryYear - sy;

  let quarters = 1;
  let quarterStart = anniversary;
  for (let q = 1; q <= 3; q++) {
    const candidate = new Date(anniversaryYear, sm - 1 + q * 3, sd);
    if (todayMid >= candidate) { quarters = q + 1; quarterStart = candidate; }
    else break;
  }

  const workdays = (from, to) => {
    let n = 0;
    const cur = new Date(from);
    while (cur < to) {
      cur.setDate(cur.getDate() + 1);
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) n++;
    }
    return n;
  };
  // BUILD: every business day ever logged. Exact, not years * 261.
  return { years, quarters, days: workdays(quarterStart, todayMid), build: workdays(startMid, todayMid) };
}

// The triple only; the build is rendered as its own element beside it.
export function tenureString(t) {
  return `${t.years}.${t.quarters}.${t.days}`;
}

export function buildString(t) {
  return `+${t.build.toLocaleString()}`;
}

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// One span per character, separators marked, aria-label carrying the whole
// number so a screen reader announces one thing. Same contract as the
// editions' .version — deliberately, so the motif behaves identically
// everywhere it appears.
//
// Re-rendering REUSES any span whose character is unchanged and only replaces
// the ones that differ, marking those .is-new. That is what makes the change
// animation land on the digits that actually changed: 5.2.113 -> 5.2.114 rolls
// one digit, not seven. (See .vnum .d.is-new in site.css.)
export function renderVnum(el, text) {
  el.setAttribute('aria-label', text);
  // Static markup may carry bare text nodes; the reuse below indexes element
  // children only, so start clean the first time.
  if (el.childNodes.length !== el.children.length) el.replaceChildren();
  const chars = [...text];
  const existing = [...el.children];

  chars.forEach((ch, i) => {
    const current = existing[i];
    if (current && current.textContent === ch) {
      current.classList.remove('is-new');    // unchanged: leave the node alone
      return;
    }
    const span = document.createElement('span');
    span.className = ch === '.' ? 'sep' : 'd is-new';
    span.textContent = ch;
    if (current) el.replaceChild(span, current);
    else el.appendChild(span);
  });

  // The number got shorter (113 -> 9): drop the tail.
  while (el.children.length > chars.length) el.lastElementChild.remove();
}

// Fires once per local midnight while the tab is open. setTimeout is capped at
// ~24 days, which is far more than the longest wait here, and re-scheduling
// from the new "now" keeps it from drifting or firing twice.
export function onMidnight(fn) {
  const schedule = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    setTimeout(() => { fn(); schedule(); }, next - now);
  };
  schedule();
}

// Every .vnum[data-since] on the page renders that date's live number: the bar
// pill and the about page's closing number. On the work face the pill is
// .vnum[data-tenure] and shows the site's tenure instead. (The hero is
// home.js's business.)
function paintSiteVersions() {
  for (const el of document.querySelectorAll('.vnum[data-since]')) {
    renderVnum(el, versionString(computeVersion(el.dataset.since)));
  }
  for (const el of document.querySelectorAll('.vnum[data-tenure]')) {
    const t = computeTenure(el.dataset.tenure);
    if (t) renderVnum(el, tenureString(t));
  }
}

paintSiteVersions();
onMidnight(paintSiteVersions);

// Measured from local midnight, exactly like computeVersion's patch. The old
// site.js used Date.now() here, so the footer could read "0.0.136 · 137 days"
// — the same elapsed time, disagreeing with itself by one. Never mix the two
// clocks in one line.
function daysSince(since, today = new Date()) {
  const [y, m, d] = since.split('-').map(Number);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((midnight - new Date(y, m - 1, d)) / 86_400_000);
}

const days = document.getElementById('days-since');
if (days) {
  const paintDays = () => { days.textContent = `${daysSince(LAUNCH)} days since the first commit`; };
  paintDays();
  onMidnight(paintDays);
}
