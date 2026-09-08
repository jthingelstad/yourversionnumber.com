// The front page demonstrates the idea on itself.
//
// yourversionnumber.com shipped on 2026-05-01, so it has an age, so it has a
// version number — computed here with the same decade / year-in-decade / days
// arithmetic the birthday edition uses. It is the shortest possible
// explanation of what the site does, and it stays true on its own.

function computeVersion(since, today = new Date()) {
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

const el = document.getElementById('site-vnum');
if (el?.dataset.since) {
  const { major, minor, patch } = computeVersion(el.dataset.since);
  el.replaceChildren();
  [major, minor, patch].forEach((part, i) => {
    if (i > 0) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.textContent = '.';
      el.appendChild(dot);
    }
    el.appendChild(document.createTextNode(String(part)));
  });
}
