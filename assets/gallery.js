// Theme gallery.
//
// Cards are built from each edition's THEMES manifest at runtime rather than
// hand-listed here, so adding a theme stays a two-step job: drop the stylesheet
// in, add one manifest entry. The gallery picks it up on the next load. This is
// the same manifest-scraping trick themes-preview.html uses.

const DEMO = {
  birthday: ['Ada:1979-04-12', 'Grace:1991-11-30', 'Linus:2015-06-08'],
  work: ['Engineer:2022-03-14', 'Designer:2024-09-02'],
};

const EDITIONS = [
  { key: 'birthday', script: '/birthday/assets/app.js', base: '/birthday/', param: 'p', people: DEMO.birthday },
  { key: 'work', script: '/work/assets/app.js', base: '/work/', param: 'j', people: DEMO.work },
];

async function fetchManifest(scriptPath) {
  const source = await fetch(scriptPath).then((r) => r.text());
  const block = source.match(/const THEMES = \[([\s\S]*?)\n\];/);
  if (!block) return [];
  const entry = /\{\s*name:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'[\s\S]*?kind:\s*'([^']+)'[\s\S]*?blurb:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
  const themes = [];
  let match;
  while ((match = entry.exec(block[1])) !== null) {
    themes.push({
      name: match[1],
      label: match[2],
      kind: match[3],
      blurb: match[4].replace(/\\'/g, "'"),
    });
  }
  return themes;
}

// The iframe is a fixed 1000px-wide viewport; the card is whatever the grid
// gives it. Scale the frame by the ratio between them and keep it in step as
// the layout reflows.
const PREVIEW_WIDTH = 1000;

function scaleToFit(preview) {
  const apply = () => {
    const width = preview.clientWidth;
    if (width > 0) preview.style.setProperty('--preview-scale', width / PREVIEW_WIDTH);
  };
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(preview);
  else window.addEventListener('resize', apply);
  apply();
}

function previewUrl(edition, theme) {
  const params = new URLSearchParams();
  params.set('theme', theme.name);
  for (const person of edition.people) params.append(edition.param, person);
  return edition.base + '?' + params.toString();
}

function makeCard(edition, theme) {
  const href = previewUrl(edition, theme);
  const item = document.createElement('li');
  item.className = 'theme-card';
  item.id = `${edition.key}-${theme.name}`;

  const preview = document.createElement('div');
  preview.className = 'theme-card__preview';

  const frame = document.createElement('iframe');
  frame.loading = 'lazy';
  frame.src = href;
  frame.title = `${theme.label} theme preview`;
  // The preview duplicates the link beneath it; keep it out of the tab order so
  // keyboard users aren't walked through 42 nested documents.
  frame.setAttribute('tabindex', '-1');
  frame.setAttribute('scrolling', 'no');
  preview.appendChild(frame);
  scaleToFit(preview);
  item.appendChild(preview);

  const body = document.createElement('div');
  body.className = 'theme-card__body';
  const heading = document.createElement('h3');
  const link = document.createElement('a');
  link.href = href;
  link.textContent = theme.label;
  heading.appendChild(link);
  body.appendChild(heading);

  const kind = document.createElement('span');
  kind.className = 'theme-card__kind';
  kind.textContent = theme.kind;
  body.appendChild(kind);

  const blurb = document.createElement('p');
  blurb.textContent = theme.blurb;
  body.appendChild(blurb);

  item.appendChild(body);
  return item;
}

async function renderEdition(edition) {
  const list = document.getElementById(`${edition.key}-gallery`);
  const count = document.getElementById(`${edition.key}-count`);
  let themes = [];
  try {
    themes = await fetchManifest(edition.script);
  } catch (e) {
    console.error('Could not read the theme manifest for', edition.key, e);
  }
  if (themes.length === 0) {
    count.textContent = '';
    list.innerHTML = `<li>Could not load these themes. <a href="${edition.base}">Open the edition</a> and use the theme picker instead.</li>`;
    return;
  }
  count.textContent = `${themes.length} themes`;
  const frag = document.createDocumentFragment();
  for (const theme of themes) frag.appendChild(makeCard(edition, theme));
  list.appendChild(frag);
}

for (const edition of EDITIONS) renderEdition(edition);
