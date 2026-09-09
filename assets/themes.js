// The one theme manifest. Both editions read this array; there is no per-edition
// copy any more, and no per-edition theme folder — every stylesheet lives in
// assets/themes/ and works in both.
//
//   name     file at assets/themes/<name>.css
//   label    display name in the picker
//   home     'birthday' | 'work' | null — ordering only. Every theme is
//            selectable in both editions; a picker lists its natives first.
//   animate  count-up on first render
//   chime    null | 'tick' | 'buzzer' | 'crackle' — core plays it, never a theme
//   card     true once the theme styles .card-message in its own voice
//   blurb    one sentence, shown beside the picker and in the gallery
//
// Phase 1 ships the 22 surviving originals. The six new themes (nixie,
// departures, teletext, jumbotron, boardingpass, timesheet) each land here in
// their own commit in phase 4, alongside their stylesheet — a manifest entry
// without a file would break the picker on a deploy.

export const THEMES = [
  // — home: birthday —
  { name: 'birthday',    label: 'Birthday',    home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Confetti, balloons and party-hat pink. The default, and unapologetic about it.' },
  { name: 'severe',      label: 'Severe',      home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Minimalist dark mode, violet accents, nothing shouting. The one to pick when the number is the point.' },
  { name: 'zen',         label: 'Zen',         home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Quiet cream, generous space, one vermillion first-letter doing all the work.' },
  { name: 'receipt',     label: 'Receipt',     home: 'birthday', animate: false, chime: 'tick',    card: false,
    blurb: 'Thermal-printer monospace, QTY 1, thank you for your business.' },
  { name: 'newspaper',   label: 'Newspaper',   home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Broadsheet typography and section rules. Your age, above the fold.' },
  { name: 'vinyl',       label: 'Vinyl',       home: 'birthday', animate: true,  chime: 'crackle', card: false,
    blurb: 'Records spinning at 33⅓, one per person, forever mid-side-A.' },
  { name: 'polaroid',    label: 'Polaroid',    home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Instant photos taped to the page, each one tilted a degree or two off true.' },
  { name: 'fridge',      label: 'Fridge Door', home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Warm cream and handwritten Caveat. Built for a page with the whole household on it.' },
  { name: 'brutalist',   label: 'Brutalist',   home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Yellow, red and black, type set far too large. Refuses to be tasteful.' },
  { name: 'interchange', label: 'Interchange', home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'A black transit map where every person gets their own coloured route bullet.' },
  { name: 'terminal',    label: 'Terminal',    home: 'birthday', animate: true,  chime: null,      card: false,
    blurb: 'Green on black at a blinking prompt. Your age as command output.' },
  { name: 'gameboy',     label: 'Gameboy',     home: 'birthday', animate: true,  chime: null,      card: false,
    blurb: 'The DMG palette and a cartridge silhouette. Four shades of green is plenty.' },
  { name: 'tarot',       label: 'Tarot',       home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Purple and stars, with the Fool, the Priestess and the Empress dealt across the table.' },
  { name: 'steampunk',   label: 'Steampunk',   home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'A sepia ledger of gears and cogs, as though age were an engineering concern.' },
  { name: 'memphis',     label: 'Memphis',     home: 'birthday', animate: false, chime: null,      card: false,
    blurb: 'Eighties squiggles, triangles and dots in every direction at once.' },

  // — home: work —
  { name: 'ooo',         label: 'OOO',         home: 'work',     animate: false, chime: null,      card: false,
    blurb: 'An out-of-office auto-reply, signed by hand. Back never.' },
  { name: 'cubicle',     label: 'Cubicle',     home: 'work',     animate: false, chime: null,      card: false,
    blurb: 'A manila-folder corporate newsletter, photocopied one too many times.' },
  { name: 'spreadsheet', label: 'Spreadsheet', home: 'work',     animate: true,  chime: null,      card: false,
    blurb: 'A grid with row numbers, because eventually everything becomes a spreadsheet.' },
  { name: 'ticker',      label: 'Ticker',      home: 'work',     animate: true,  chime: 'tick',    card: false,
    blurb: 'A live ticker on a black trading screen. Your career, but as a stock.' },
  { name: 'slidedeck',   label: 'Slide Deck',  home: 'work',     animate: false, chime: null,      card: false,
    blurb: 'A confidential business review slide, three bullets, no further context offered.' },
  { name: 'unread',      label: 'Unread',      home: 'work',     animate: false, chime: null,      card: false,
    blurb: 'An inbox view where every role is an unread thread you cannot archive.' },
  { name: 'progress',    label: 'In Progress', home: 'work',     animate: false, chime: null,      card: false,
    blurb: 'Cards sitting in the In Progress column, where they have been for some years.' },
];

// Natives first, then everything else, each group keeping manifest order.
// Callers insert their own separator between the two runs.
export function orderForEdition(edition) {
  const native = THEMES.filter(t => t.home === edition || t.home === null);
  const rest = THEMES.filter(t => !(t.home === edition || t.home === null));
  return { native, rest };
}
