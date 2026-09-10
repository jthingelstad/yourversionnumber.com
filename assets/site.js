// Spine chrome: the site's own version number, and the days-since readout.
//
// yourversionnumber.com shipped on 2026-05-01, so it has an age, so it has a
// version number. It is the shortest possible explanation of what the site
// does, and it stays true without maintenance.

const LAUNCH = '2026-05-01';

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
    major: Math.floor(age / 10),
    minor: age % 10,
    patch: Math.round((midnight - anniversary) / 86_400_000),
  };
}

const v = computeVersion(LAUNCH);
const text = `${v.major}.${v.minor}.${v.patch}`;

for (const id of ['site-vnum', 'site-hero-vnum']) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

const since = document.getElementById('days-since');
if (since) {
  const days = Math.round((Date.now() - Date.parse(LAUNCH + 'T00:00:00')) / 86_400_000);
  since.textContent = `${days} days since first commit`;
}
