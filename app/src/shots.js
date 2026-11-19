// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone, drawn by the app's own renderer at the window's size.
// `photo` picks the sample, `caption` the words, `layout` and `grade` the look.
// window.__shotReady is set once the fonts are in and the cover is painted.
import { defaultState, drawCover } from './cover.js';

const GRADES = ['sunset', 'neon', 'golden', 'noir', 'haze'];
const LAYOUTS = ['grid', 'hero', 'solo'];

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query, api) {
  const caption = query.get('caption') ?? 'Neon Coast';
  const subtitle = query.get('subtitle') ?? 'Chasing the golden hour';
  const layout = LAYOUTS.includes(query.get('layout')) ? query.get('layout') : 'grid';
  const grade = GRADES.includes(query.get('grade')) ? query.get('grade') : 'sunset';
  const state = defaultState();
  state.caption = caption;
  state.subtitle = subtitle;
  state.layout = layout;
  state.grade = grade;

  const photoName = query.get('photo') ?? 'boulevard';
  const other = photoName === 'pier' ? 'boulevard' : 'pier';
  const main = await api.loadImage(`samples/${photoName}.jpg`);
  const second = await api.loadImage(`samples/${other}.jpg`);
  // `oy` lifts the photos in their panels (faces sit high in a portrait photo,
  // and a wide panel crops hardest vertically): 0 keeps them centred.
  const oy = Number(query.get('oy') ?? '0') || 0;
  state.panels = [
    { photo: 0, zoom: 1, ox: 0, oy },
    { photo: 1, zoom: 1, ox: 0, oy },
    { photo: 1, zoom: 1, ox: 0, oy },
    { photo: 0, zoom: 1, ox: 0, oy },
  ];
  api.setPhotos([main, second]);
  api.setState(state);

  await document.fonts.load('100px Anton');
  await document.fonts.load('40px Pacifico');
  await document.fonts.ready;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    api.captionInput.value = caption;
    api.subtitleInput.value = subtitle;
    // Draw at the window's own aspect, so the shot is the cover itself, undistorted.
    const c = api.canvas;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    drawCover(c, api.getPhotos(), state);
    ready();
    return;
  }

  // Editor scene: the full page, photos loaded, first panel selected.
  api.captionInput.value = caption;
  api.subtitleInput.value = subtitle;
  api.syncControls();
  api.renderTray();
  api.renderPanelEditor();
  api.redraw();
  ready();
}
