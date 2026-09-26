// Single source of truth for interface icons.
//
// Every icon is drawn on a 24x24 grid with a 2px safe margin and rendered through one
// contract: 1.5px stroke, round caps and joins, currentColor. Shapes that need to read as
// solid at small sizes carry class="ico-fill". Icons used to be split between inline SVG in
// index.html, innerHTML strings in main.js and Unicode glyphs on buttons, which is why the
// product ended up with six sizes and four stroke weights; keep new icons here.
//
// Markup declares an icon with data-icon="<name>"; renderIcons() fills it in. Buttons that
// swap icon by state (rotation, tour) call icon() directly.

const HEX = 'M12 3.2 19.6 7.6V16.4L12 20.8 4.4 16.4V7.6Z';
const HEX_M = 'M12 6.4 17.2 9.4V15.4L12 18.4 6.8 15.4V9.4Z';
const HEX_S = 'M12 8.4 15.4 10.4V14.4L12 16.4 8.6 14.4V10.4Z';
const LENS = 'M10.6 3.6 16.4 7v6.8l-5.8 3.4-5.8-3.4V7Z';
const LENS_HANDLE = 'm15.2 15.4 4.6 4.6';
// Broken ring with the arrowhead where travel ends. Direction is not meaningful any more --
// the globe rotates one way -- but the open ring still reads as motion rather than refresh.
const RING = '<path d="M12 3.4A8.6 8.6 0 1 0 20.6 12"/><path d="M18.3 13.9 20.6 11.4 22.9 13.9"/>';

export const ICONS = {
  // Globe control rail. The rotation and tour buttons show the action, not the state.
  'rotate-start': `<path d="${HEX_S}"/>${RING}`,
  'rotate-pause': `<path d="${HEX_M}"/><path d="M10.3 9.9v4.6M13.7 9.9v4.6"/>`,
  'tour-start': `<path d="${HEX}"/><path class="ico-fill" d="m10.3 8.9 5.4 3.1-5.4 3.1Z"/>`,
  'tour-stop': `<path d="${HEX}"/><rect class="ico-fill" x="9.4" y="9.4" width="5.2" height="5.2" rx="1"/>`,
  search: `<path d="${LENS}"/><path d="${LENS_HANDLE}"/>`,
  'zoom-in': `<path d="${LENS}"/><path d="M10.6 7.6v5.6M7.8 10.4h5.6"/><path d="${LENS_HANDLE}"/>`,
  'zoom-out': `<path d="${LENS}"/><path d="M7.8 10.4h5.6"/><path d="${LENS_HANDLE}"/>`,
  home: `<path d="${HEX_S}"/><path d="M12 1.6v3.2M12 19.2v3.2M22.4 12h-3.2M4.8 12H1.6"/>`,
  // Hexagonal bow, shaft and two teeth. The previous mark was a circle with a diagonal and
  // read as an arrow rather than a key.
  key: `<path d="M7.4 8.2 10.9 10.2v4L7.4 16.2 3.9 14.2v-4Z"/><path d="M10.9 12.2h9.6M17.6 12.2v3.2M20.5 12.2v2.4"/>`,

  // Studio toolbar.
  image: `<path d="${HEX}"/><path d="m6.6 16.4 3.2-3.4 2.4 2.4 2.2-2.4 2.9 3.1"/><circle cx="14.6" cy="9.4" r="1.2"/>`,
  paint: `<path d="m16.4 3.4 4.2 4.2-10.6 10.6-4.2-4.2Z"/><path d="m5.8 14-2 6.2 6.2-2"/>`,
  // Tilted bucket pouring a drip. The previous mark was an abstract diamond that did not read
  // as "fill" at toolbar size.
  fill: `<path d="M9.4 2.6 7.2 4.8"/><path d="m11.6 5 5.9 5.9a1.2 1.2 0 0 1 0 1.7l-4.7 4.7a1.8 1.8 0 0 1-2.5 0l-4.6-4.6a1.8 1.8 0 0 1 0-2.5l4.7-4.7a1.2 1.2 0 0 1 1.2-.5Z"/><path d="M5.2 11.4h12.1"/><path class="ico-fill" d="M20.4 14.4s1.6 2 1.6 3a1.6 1.6 0 0 1-3.2 0c0-1 1.6-3 1.6-3Z"/>`,
  // Eraser tilted on the grid: the head crosses the baseline so it reads as removal.
  erase: `<path d="m13.4 4.6 6 6a1.4 1.4 0 0 1 0 2l-5.4 5.4H9.2l-4.6-4.6a1.4 1.4 0 0 1 0-2l7.4-7.4a1.4 1.4 0 0 1 1.4.6Z"/><path d="m8.4 9.6 6 6"/><path d="M4.2 20.2h15.6"/>`,
  // Four-way move: the globe can be dragged in any direction.
  move: `<path d="M12 3.4v17.2M3.4 12h17.2"/><path d="m9.6 5.8 2.4-2.4 2.4 2.4M9.6 18.2l2.4 2.4 2.4-2.4M5.8 9.6 3.4 12l2.4 2.4M18.2 9.6 20.6 12l-2.4 2.4"/>`,
  add: `<path d="${HEX}"/><path d="M12 8.4v7.2M8.4 12h7.2"/>`,
  remove: `<path d="${HEX}"/><path d="M8.4 12h7.2"/>`,
  pan: `<path d="M12 2.8v18.4M2.8 12h18.4"/><path d="m9.2 5.6 2.8-2.8 2.8 2.8M9.2 18.4l2.8 2.8 2.8-2.8M5.6 9.2 2.8 12l2.8 2.8M18.4 9.2 21.2 12l-2.8 2.8"/>`,
  undo: `<path d="M4.2 9.4h9.6a5.6 5.6 0 0 1 0 11.2H9"/><path d="M7.8 5.8 4.2 9.4l3.6 3.6"/>`,
  redo: `<path d="M19.8 9.4h-9.6a5.6 5.6 0 0 0 0 11.2H15"/><path d="m16.2 5.8 3.6 3.6-3.6 3.6"/>`,
  more: `<circle class="ico-fill" cx="5.4" cy="12" r="1.5"/><circle class="ico-fill" cx="12" cy="12" r="1.5"/><circle class="ico-fill" cx="18.6" cy="12" r="1.5"/>`,

  // Placement HUD. "visit" is an external-link mark rather than a globe, which collided with
  // the actual globe behind the panel.
  visit: `<path d="M13.6 4.4h6v6"/><path d="m19.6 4.4-8.4 8.4"/><path d="M17.4 13.8v4.8a1.8 1.8 0 0 1-1.8 1.8H5.4a1.8 1.8 0 0 1-1.8-1.8V8.4a1.8 1.8 0 0 1 1.8-1.8h4.8"/>`,
  link: `<path d="M10.2 14.2a4.4 4.4 0 0 0 6.3 0l3.1-3.1a4.4 4.4 0 1 0-6.3-6.3l-1.6 1.6"/><path d="M13.8 9.8a4.4 4.4 0 0 0-6.3 0l-3.1 3.1a4.4 4.4 0 1 0 6.3 6.3l1.6-1.6"/>`,
  pin: `<path d="M8.6 3.4h6.8l-1.2 6 3.4 3.4v1.8H6.4v-1.8l3.4-3.4Z"/><path d="M12 14.6v6"/>`,

  // Shared chrome.
  close: `<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>`,
  'arrow-right': `<path d="M3.6 12h16.2"/><path d="m13.8 6.2 6 5.8-6 5.8"/>`,
  'arrow-left': `<path d="M20.4 12H4.2"/><path d="m10.2 6.2-6 5.8 6 5.8"/>`,
  plus: `<path d="M12 5.4v13.2M5.4 12h13.2"/>`,
  minus: `<path d="M5.4 12h13.2"/>`,
  external: `<path d="M7.4 16.6 16.6 7.4"/><path d="M9.2 7.4h7.4v7.4"/>`,
  download: `<path d="M12 3.8v10.4"/><path d="m7.8 10.4 4.2 4.2 4.2-4.2"/><path d="M4.6 16.4v2.2a1.6 1.6 0 0 0 1.6 1.6h11.6a1.6 1.6 0 0 0 1.6-1.6v-2.2"/>`,

  // Activity feed.
  claim: `<path d="${HEX}"/><path d="m8.8 12.1 2.4 2.4 4-5"/>`,
  trend: `<path d="M3.6 17.4 9.6 11.4l3.6 3.6 7.2-8.4"/><path d="M15.6 6.6h4.8v4.8"/>`,
  milestone: `<path d="M8.4 3.4h7.2v4.4a3.6 3.6 0 0 1-7.2 0Z"/><path d="M8.4 5.2H5v1.6a3.4 3.4 0 0 0 3.4 3.4M15.6 5.2H19v1.6a3.4 3.4 0 0 1-3.4 3.4"/><path d="M12 11.4v4.6M8.8 20.6h6.4l-1-4.6h-4.4Z"/>`,

  // Share destinations. These are brand marks, so they are solid glyphs drawn
  // with the fill class instead of the stroke geometry used above.
  x: `<path class="ico-fill" d="M17.7 3h3.3l-7.2 8.3L22 21h-6.4l-4.6-6-5.3 6H2.4l7.7-8.8L2 3h6.6l4.2 5.5Zm-1.2 16h1.9L7.8 4.9H5.8Z"/>`,
  linkedin: `<path class="ico-fill" d="M4.6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M2.9 8.6h3.4V21H2.9Zm6 0h3.3v1.7a3.6 3.6 0 0 1 3.2-1.8c3 0 3.9 1.9 3.9 4.6V21h-3.4v-6.5c0-1.6-.5-2.5-1.8-2.5-1.1 0-1.8.8-1.8 2.4V21H8.9Z"/>`,
  facebook: `<path class="ico-fill" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12"/>`,
};

/** Returns the SVG markup for one icon, or an empty string when the name is unknown. */
export function icon(name) {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Fills every [data-icon] element under root. Safe to call more than once. */
export function renderIcons(root = document) {
  for (const element of root.querySelectorAll('[data-icon]')) {
    const name = element.dataset.icon;
    if (!ICONS[name]) continue;
    if (element.querySelector('svg.ico')) continue;
    element.insertAdjacentHTML('afterbegin', icon(name));
  }
}

/** Swaps the icon on an element that changes with state. */
export function setIcon(element, name) {
  if (!element || element.dataset.icon === name) return;
  element.dataset.icon = name;
  const existing = element.querySelector('svg.ico');
  if (existing) existing.remove();
  element.insertAdjacentHTML('afterbegin', icon(name));
}
