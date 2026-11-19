// Neon Coast Cover Studio — the editor.
// Wires the page: photos in, panels arranged, caption lettered, PNGs out.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
// Every cover change goes through `commit`, which snapshots the state so
// Undo / Redo (and Ctrl+Z / Ctrl+Shift+Z) can step back through the session.
import { drawCover, defaultState, panelRects, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const tray = document.getElementById('tray');
const panelBox = document.getElementById('panel-editor');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

export const SIZES = [
  { key: 'square', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { key: 'wide', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

const state = defaultState();
let photos = [];
let selectedPanel = 0;
let previewSize = SIZES[0];
let drag = null;

// ---- History: one snapshot per committed change, capped so a long session stays light.
const history = { past: [], future: [] };
const HISTORY_LIMIT = 60;

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function restore(snap) {
  const keep = state.panels;
  Object.assign(state, JSON.parse(JSON.stringify(snap)));
  state.panels = state.panels || keep;
}

function commit() {
  // Snapshot the state BEFORE the change, so Undo restores it. Callers redraw.
  history.past.push(snapshot());
  if (history.past.length > HISTORY_LIMIT) history.past.shift();
  history.future.length = 0;
  syncHistoryButtons();
}

function undo() {
  if (!history.past.length) return;
  history.future.push(snapshot());
  restore(history.past.pop());
  syncHistoryButtons();
  syncControls();
  renderPanelEditor();
  redraw();
}

function redo() {
  if (!history.future.length) return;
  history.past.push(snapshot());
  restore(history.future.pop());
  syncHistoryButtons();
  syncControls();
  renderPanelEditor();
  redraw();
}

function syncHistoryButtons() {
  undoBtn.disabled = history.past.length === 0;
  redoBtn.disabled = history.future.length === 0;
}

function redraw() {
  canvas.width = previewSize.w;
  canvas.height = previewSize.h;
  drawCover(canvas, photos, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamplePhotos() {
  const names = ['boulevard', 'pier'];
  photos = [];
  for (const name of names) {
    photos.push(await loadImage(`samples/${name}.jpg`));
  }
  renderTray();
}

function renderTray() {
  tray.innerHTML = '';
  photos.forEach((img, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = `Photo ${i + 1} — click to put it in the selected panel`;
    thumb.setAttribute('aria-label', `Use photo ${i + 1} in the selected panel`);
    const t = document.createElement('canvas');
    t.width = 96;
    t.height = 96;
    const c = t.getContext('2d');
    const s = Math.max(96 / img.naturalWidth, 96 / img.naturalHeight);
    c.drawImage(img, (96 - img.naturalWidth * s) / 2, (96 - img.naturalHeight * s) / 2,
      img.naturalWidth * s, img.naturalHeight * s);
    thumb.appendChild(t);
    thumb.appendChild(document.createTextNode(`Photo ${i + 1}`));
    thumb.addEventListener('click', () => {
      commit();
      state.panels[selectedPanel].photo = i;
      renderPanelEditor();
      redraw();
    });
    tray.appendChild(thumb);
  });
  if (photos.length === 0) {
    tray.textContent = 'No photos yet — add one, or load the samples.';
  }
}

function renderPanelEditor() {
  const count = LAYOUTS[state.layout].panels;
  if (selectedPanel >= count) selectedPanel = 0;
  const panel = state.panels[selectedPanel];
  panelBox.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = `Panel ${selectedPanel + 1} of ${count}`;
  panelBox.appendChild(title);

  const photoLabel = document.createElement('label');
  photoLabel.textContent = 'Photo';
  const photoSelect = document.createElement('select');
  photos.forEach((_, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Photo ${i + 1}`;
    photoSelect.appendChild(opt);
  });
  photoSelect.value = String(panel.photo);
  photoSelect.addEventListener('change', () => {
    commit();
    panel.photo = Number(photoSelect.value);
    redraw();
  });
  photoLabel.appendChild(photoSelect);
  panelBox.appendChild(photoLabel);

  const zoomLabel = document.createElement('label');
  zoomLabel.textContent = `Zoom — ${panel.zoom.toFixed(2)}x`;
  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.min = '1';
  zoom.max = '2.5';
  zoom.step = '0.05';
  zoom.value = String(panel.zoom);
  // Snapshot once at the start of a slider drag, before the first change,
  // so one drag is one Undo step — and never rebuild the panel editor
  // mid-drag, or the slider under the pointer would vanish.
  let zoomSnapshotTaken = false;
  zoom.addEventListener('input', () => {
    if (!zoomSnapshotTaken) { commit(); zoomSnapshotTaken = true; }
    panel.zoom = Number(zoom.value);
    zoomLabel.firstChild.textContent = `Zoom — ${panel.zoom.toFixed(2)}x`;
    redraw();
  });
  zoom.addEventListener('change', () => { zoomSnapshotTaken = false; });
  zoomLabel.appendChild(zoom);
  panelBox.appendChild(zoomLabel);

  const centre = document.createElement('button');
  centre.type = 'button';
  centre.textContent = 'Centre photo in panel';
  centre.addEventListener('click', () => {
    commit();
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    renderPanelEditor();
    redraw();
  });
  panelBox.appendChild(centre);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Drag the photo inside the preview to move it. Scroll over a panel to zoom it.';
  panelBox.appendChild(hint);
}

/** Re-marks the layout/grade buttons and inputs from the state (used by shot scenes). */
function syncControls() {
  document.querySelectorAll('#layouts .choice').forEach((b, i) => {
    b.classList.toggle('on', Object.keys(LAYOUTS)[i] === state.layout);
  });
  document.querySelectorAll('#grades .choice').forEach((b, i) => {
    b.classList.toggle('on', Object.keys(GRADES)[i] === state.grade);
  });
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
}

function buildControls() {
  const layoutBox = document.getElementById('layouts');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.className = 'choice';
    if (key === state.layout) b.classList.add('on');
    b.addEventListener('click', () => {
      commit();
      state.layout = key;
      layoutBox.querySelectorAll('.choice').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      renderPanelEditor();
      redraw();
    });
    layoutBox.appendChild(b);
  });

  const gradeBox = document.getElementById('grades');
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.className = 'choice';
    if (key === state.grade) b.classList.add('on');
    b.addEventListener('click', () => {
      commit();
      state.grade = key;
      gradeBox.querySelectorAll('.choice').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      redraw();
    });
    gradeBox.appendChild(b);
  });

  const sizeSelect = document.getElementById('preview-size');
  SIZES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.key;
    opt.textContent = s.label;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener('change', () => {
    previewSize = SIZES.find((s) => s.key === sizeSelect.value) || SIZES[0];
    redraw();
  });
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  return { x, y };
}

function panelAt(x, y) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const p = rects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  selectedPanel = i;
  renderPanelEditor();
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  drag = { panel: state.panels[i], rect: rects[i], x, y, moved: false };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  if (x !== drag.x || y !== drag.y) {
    if (!drag.moved) { commit(); drag.moved = true; }
    drag.panel.ox += (x - drag.x) / drag.rect.w;
    drag.panel.oy += (y - drag.y) / drag.rect.h;
    drag.x = x;
    drag.y = y;
    redraw();
  }
});

canvas.addEventListener('pointerup', () => { drag = null; });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { x, y } = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  selectedPanel = i;
  const panel = state.panels[i];
  commit();
  panel.zoom = Math.min(2.5, Math.max(1, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  renderPanelEditor();
  redraw();
}, { passive: false });

document.getElementById('photo').addEventListener('change', async (e) => {
  const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    if (photos.length >= 4) break;
    photos.push(await loadImage(URL.createObjectURL(file)));
  }
  renderTray();
  renderPanelEditor();
  redraw();
  status.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded.`;
});

document.getElementById('samples').addEventListener('click', async () => {
  await loadSamplePhotos();
  renderPanelEditor();
  redraw();
  status.textContent = 'Sample photos loaded.';
});

// Snapshot once when typing starts in a caption field, before the first
// keystroke changes the state, so one edit is one Undo step.
let captionSnapshotTaken = false;
captionInput.addEventListener('focus', () => { captionSnapshotTaken = false; });
captionInput.addEventListener('input', () => {
  if (!captionSnapshotTaken) { commit(); captionSnapshotTaken = true; }
  state.caption = captionInput.value;
  redraw();
});
let subtitleSnapshotTaken = false;
subtitleInput.addEventListener('focus', () => { subtitleSnapshotTaken = false; });
subtitleInput.addEventListener('input', () => {
  if (!subtitleSnapshotTaken) { commit(); subtitleSnapshotTaken = true; }
  state.subtitle = subtitleInput.value;
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  commit();
  state.grain = e.target.checked;
  redraw();
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
});

document.getElementById('shuffle').addEventListener('click', () => {
  commit();
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  // Deal the photos round the panels in a fresh order.
  const order = state.panels.map((p) => p.photo);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  state.panels.forEach((p, i) => { p.photo = order[i]; p.zoom = 1; p.ox = 0; p.oy = 0; });
  syncControls();
  renderPanelEditor();
  redraw();
  status.textContent = `Surprise: ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label}.`;
});

document.getElementById('export').addEventListener('click', async () => {
  const btn = document.getElementById('export');
  btn.disabled = true;
  status.textContent = 'Exporting…';
  const off = document.createElement('canvas');
  for (const size of SIZES) {
    off.width = size.w;
    off.height = size.h;
    drawCover(off, photos, state);
    await new Promise((resolve) => {
      off.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cover-${size.w}x${size.h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        resolve();
      }, 'image/png');
    });
  }
  status.textContent = 'Saved 3 PNGs: 1080 x 1080, 1080 x 1350 and 1920 x 1080.';
  btn.disabled = false;
});

buildControls();
renderPanelEditor();
syncHistoryButtons();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSamples: loadSamplePhotos,
    getState: () => state,
    setState: (patch) => Object.assign(state, patch),
    setPanels: (panels) => { state.panels = panels; },
    setPhotos: (list) => { photos = list; },
    getPhotos: () => photos,
    renderTray,
    renderPanelEditor,
    syncControls,
    redraw,
    canvas,
    captionInput,
    subtitleInput,
    loadImage,
  });
} else {
  await document.fonts.ready;
  await loadSamplePhotos();
  renderPanelEditor();
  redraw();
}
