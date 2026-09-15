// The one theme manifest. Both editions read this array; there is no per-edition
// copy any more, and no per-edition theme folder — every stylesheet lives in
// assets/themes/.
//
//   name     file at assets/themes/<name>.css
//   label    display name in the picker
//   home     'birthday' | 'work' — which PRODUCT the theme belongs to. Not
//            ordering: a theme is only offered in its own product's picker,
//            gallery and composer. The two front doors have different voices
//            and do not share a wardrobe. A stylesheet still renders if someone
//            hand-edits a URL across products; it is simply never offered there.
//   animate  count-up on first render
//   chime    null | 'tick' | 'buzzer' | 'crackle' — core plays it, never a theme
//   card     true once the theme styles .card-message in its own voice
//   blurb    one sentence, shown beside the picker and in the gallery
//
// Twenty birthday themes, nine work themes. Boarding Pass is the one theme that
// belongs to both — a boarding pass is equally a holiday and a business trip —
// so it is forked: `holiday` (birthday) and `boardingpass` (work), two
// stylesheets sharing one label. design_handoff_spine_joy/12-theme-split.md.

export const THEMES = [
  // — home: birthday —
  { name: 'birthday',    label: 'Birthday',    home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Confetti, balloons and party-hat pink. The default, and unapologetic about it.' },
  { name: 'severe',      label: 'Severe',      home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'One typeface, no colour at all, and an enormous number. Nothing else does restraint.' },
  { name: 'zen',         label: 'Zen',         home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Quiet cream, generous space, one vermillion first-letter doing all the work.' },
  { name: 'receipt',     label: 'Receipt',     home: 'birthday', animate: false, chime: 'tick',    card: true,
    blurb: 'Thermal-printer monospace, QTY 1, thank you for your business.' },
  { name: 'newspaper',   label: 'Newspaper',   home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Broadsheet typography and section rules. Your age, above the fold.' },
  { name: 'vinyl',       label: 'Vinyl',       home: 'birthday', animate: true,  chime: 'crackle', card: true,
    blurb: 'Records spinning at 33⅓, one per person, forever mid-side-A.' },
  { name: 'polaroid',    label: 'Polaroid',    home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Instant photos taped to the page, each one tilted a degree or two off true.' },
  { name: 'fridge',      label: 'Fridge Door', home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Brushed steel, drawn magnets, crayon names and a height chart. The one true multi-person theme.' },
  { name: 'brutalist',   label: 'Brutalist',   home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Yellow, red and black, type set far too large. Refuses to be tasteful.' },
  { name: 'interchange', label: 'Interchange', home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'A black transit map where every person gets their own coloured route bullet.' },
  { name: 'terminal',    label: 'Terminal',    home: 'birthday', animate: true,  chime: null,      card: true,
    blurb: 'Green on black at a blinking prompt. Your age as command output.' },
  { name: 'gameboy',     label: 'Gameboy',     home: 'birthday', animate: true,  chime: null,      card: true,
    blurb: 'The DMG palette and a cartridge silhouette. Four shades of green is plenty.' },
  { name: 'tarot',       label: 'Tarot',       home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Purple and stars, with the Fool, the Priestess and the Empress dealt across the table.' },
  { name: 'steampunk',   label: 'Steampunk',   home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'A sepia ledger of gears and cogs, as though age were an engineering concern.' },
  { name: 'memphis',     label: 'Memphis',     home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Eighties squiggles, triangles and dots in every direction at once.' },

  { name: 'teletext',    label: 'Teletext',    home: 'birthday', animate: false, chime: null,      card: true,
    blurb: 'Six flat colours, one font, no gradients anywhere. Each person is a page you turn to.' },

  // — home: work —
  { name: 'ooo',         label: 'OOO',         home: 'work',     animate: false, chime: null,      card: true,
    blurb: 'An out-of-office auto-reply, signed by hand. Back never.' },
  { name: 'cubicle',     label: 'Cubicle',     home: 'work',     animate: false, chime: null,      card: true,
    blurb: 'A manila-folder corporate newsletter, photocopied one too many times.' },
  { name: 'spreadsheet', label: 'Spreadsheet', home: 'work',     animate: true,  chime: null,      card: true,
    blurb: 'A grid with row numbers, because eventually everything becomes a spreadsheet.' },
  { name: 'ticker',      label: 'Ticker',      home: 'work',     animate: true,  chime: 'tick',    card: true,
    blurb: 'A live ticker on a black trading screen. Your career, but as a stock.' },
  { name: 'slidedeck',   label: 'Slide Deck',  home: 'work',     animate: false, chime: null,      card: true,
    blurb: 'A confidential business review slide, three bullets, no further context offered.' },
  { name: 'unread',      label: 'Unread',      home: 'work',     animate: false, chime: null,      card: true,
    blurb: 'An inbox view where every role is an unread thread you cannot archive.' },
  { name: 'progress',    label: 'In Progress', home: 'work',     animate: false, chime: null,      card: true,
    blurb: 'Cards sitting in the In Progress column, where they have been for some years.' },
  { name: 'timesheet',   label: 'Timesheet',   home: 'work',     animate: false, chime: null,      card: true,
    blurb: 'Green-bar fanfold, an off-register stamp, and totals that are always one day out.' },
  { name: 'boardingpass', label: 'Boarding Pass', home: 'work', animate: false, chime: null,      card: true,
    blurb: 'A perforated pass with a barcode down the stub, set in the typeface drawn for cockpits.' },
  { name: 'nixie',       label: 'Nixie',       home: 'birthday', animate: false, chime: 'tick',    card: true,
    blurb: 'Six glass tubes on walnut, with the unlit numerals still ghosting behind the lit ones.' },
  { name: 'jumbotron',   label: 'Jumbotron',   home: 'birthday', animate: false, chime: 'buzzer',  card: true,
    blurb: 'A bulb-matrix scoreboard where the unlit lamps between the lit ones are the whole point.' },
  { name: 'departures',  label: 'Departures',  home: 'birthday', animate: false, chime: 'tick',    card: true,
    blurb: 'A split-flap board where the status is derived from the date, and the flaps really flip.' },
  { name: 'holiday',     label: 'Boarding Pass', home: 'birthday', animate: false, chime: null,    card: true,
    blurb: 'A sun-faded pass for the trip from BORN to TODAY, seat 1A, first birthday class.' },
];

// A theme is only ever offered in its own product. `rest` stays in the return
// shape so nothing downstream changes signature; it is permanently empty and
// the pickers already skip their separator when it is.
export function orderForEdition(edition) {
  return { native: THEMES.filter(t => t.home === edition), rest: [] };
}
