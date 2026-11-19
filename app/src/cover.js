// Neon Coast Cover Studio — the cover renderer.
// Draws the multi-panel GTA-style poster: a photo (or several) in framed panels,
// a Vice City sunset/neon colour grade, bold genre lettering and a title band.
// Pure canvas 2D, no libraries. Everything drawn here is original art.
// Layouts: grid (2x2), hero (one tall + three stacked), duo (two tall), solo (full-bleed).
// Grades: sunset, neon, golden, noir, haze, miami — each a gradient wash over the photo.

export const LAYOUTS = {
  grid: { panels: 4, label: 'Four-panel grid' },
  hero: { panels: 4, label: 'Hero and three' },
  duo: { panels: 2, label: 'Two tall panels' },
  solo: { panels: 1, label: 'Full-bleed' },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset' },
  neon: { label: 'Neon Nights' },
  golden: { label: 'Golden Hour' },
  noir: { label: 'Palm Noir' },
  haze: { label: 'Heat Haze' },
  miami: { label: 'Miami Duotone' },
};

// The colour wash each grade paints over a photo, as gradient stops.
// Stops are [offset, colour]; `mode` is how the wash blends with the photo.
const GRADE_WASHES = {
  sunset: {
    mode: 'overlay', alpha: 0.35, vertical: true,
    stops: [[0, 'rgba(255, 190, 90, 0.10)'], [0.55, 'rgba(255, 110, 70, 0.16)'], [1, 'rgba(214, 40, 130, 0.42)']],
  },
  neon: {
    mode: 'overlay', alpha: 0.35, vertical: false,
    stops: [[0, 'rgba(0, 229, 204, 0.20)'], [0.5, 'rgba(120, 40, 180, 0.12)'], [1, 'rgba(255, 45, 150, 0.40)']],
  },
  golden: {
    mode: 'overlay', alpha: 0.35, vertical: true,
    stops: [[0, 'rgba(255, 214, 120, 0.22)'], [1, 'rgba(255, 140, 40, 0.30)']],
  },
  haze: {
    mode: 'overlay', alpha: 0.35, vertical: false,
    stops: [[0, 'rgba(255, 120, 200, 0.22)'], [1, 'rgba(120, 80, 255, 0.30)']],
  },
  miami: {
    mode: 'overlay', alpha: 0.4, vertical: false,
    stops: [[0, 'rgba(0, 210, 190, 0.28)'], [0.5, 'rgba(90, 60, 200, 0.10)'], [1, 'rgba(255, 40, 140, 0.38)']],
  },
  noir: null, // Noir is a filter on the photo itself, not a wash (see drawPanelPhoto).
};

/** A fresh default state: two sample photos across four panels. */
export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    caption: 'NEON COAST',
    subtitle: 'Chasing the golden hour',
    grain: true,
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

/** Panel rectangles for a layout inside the cover area above the title band. */
export function panelRects(layout, w, h) {
  const band = Math.round(h * 0.22);
  const top = 0;
  const areaH = h - band;
  const m = Math.max(10, Math.round(w * 0.018));
  const g = Math.max(6, Math.round(w * 0.012));
  const iw = w - m * 2;
  const ih = areaH - m;
  if (layout === 'solo') {
    return [{ x: m, y: m, w: iw, h: ih }];
  }
  if (layout === 'duo') {
    const cw = (iw - g) / 2;
    return [
      { x: m, y: m, w: cw, h: ih },
      { x: m + cw + g, y: m, w: cw, h: ih },
    ];
  }
  if (layout === 'hero') {
    const leftW = Math.round(iw * 0.58);
    const rightX = m + leftW + g;
    const rightW = w - m - rightX;
    const rh = (ih - g * 2) / 3;
    return [
      { x: m, y: m, w: leftW, h: ih },
      { x: rightX, y: m, w: rightW, h: rh },
      { x: rightX, y: m + rh + g, w: rightW, h: rh },
      { x: rightX, y: m + (rh + g) * 2, w: rightW, h: rh },
    ];
  }
  const cw = (iw - g) / 2;
  const ch = (ih - g) / 2;
  return [
    { x: m, y: m, w: cw, h: ch },
    { x: m + cw + g, y: m, w: cw, h: ch },
    { x: m, y: m + ch + g, w: cw, h: ch },
    { x: m + cw + g, y: m + ch + g, w: cw, h: ch },
  ];
}

/** The sunset/neon grade for one panel, painted over its photo. */
function paintGrade(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const wash = GRADE_WASHES[grade];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (wash) {
    const grad = wash.vertical
      ? ctx.createLinearGradient(0, y, 0, y + h)
      : ctx.createLinearGradient(x, y, x + w, y + h);
    for (const [offset, colour] of wash.stops) grad.addColorStop(offset, colour);
    ctx.globalCompositeOperation = wash.mode;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = wash.alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
  // A kiss of light from the top edge, like a low sun.
  const light = ctx.createLinearGradient(0, y, 0, y + h * 0.3);
  light.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  light.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, h * 0.3);
  ctx.restore();
}

/** The poster's inked frame: a dark keyline, then the white poster border. */
function drawPanelFrame(ctx, rect) {
  const { x, y, w, h } = rect;
  const outer = Math.max(2, Math.round(w * 0.008));
  const inner = Math.max(2, Math.round(w * 0.006));
  ctx.save();
  ctx.strokeStyle = 'rgba(12, 2, 20, 0.85)';
  ctx.lineWidth = outer;
  ctx.strokeRect(x + outer / 2, y + outer / 2, w - outer, h - outer);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = inner;
  ctx.strokeRect(x + outer + inner / 2, y + outer + inner / 2, w - outer * 2 - inner, h - outer * 2 - inner);
  ctx.restore();
}

/** One photo, cover-fitted into its panel with the panel's crop and position. */
function drawPanelPhoto(ctx, img, rect, panel, grade) {
  const { x, y, w, h } = rect;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const scale = base * (panel.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  // The offset is clamped so the photo always covers the panel: a wide panel
  // can slide a long way toward the faces at the top, a tall one barely at all.
  const maxOx = Math.max(0, (pw - w) / 2);
  const maxOy = Math.max(0, (ph - h) / 2);
  const oxPx = Math.max(-maxOx, Math.min(maxOx, (panel.ox || 0) * w));
  const oyPx = Math.max(-maxOy, Math.min(maxOy, (panel.oy || 0) * h));
  const cx = x + w / 2 + oxPx;
  const cy = y + h / 2 + oyPx;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (grade === 'noir') ctx.filter = 'grayscale(0.85) contrast(1.18) brightness(1.06)';
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.filter = 'none';
  paintGrade(ctx, rect, grade);
  ctx.restore();
  drawPanelFrame(ctx, rect);
}

/** A tiny deterministic random stream, so the grain looks the same on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** A tile of film grain, made once and stamped over the whole cover. */
function grain(ctx, w, h) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 180;
    grainTile.height = 180;
    const g = grainTile.getContext('2d');
    const data = g.createImageData(180, 180);
    const rand = mulberry32(20261119);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 118 + Math.floor(rand() * 40);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 26;
    }
    g.putImageData(data, 0, 0);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The title band: bold genre lettering over a dusk gradient, neon script beneath. */
function drawTitleBand(ctx, state, w, h) {
  const band = Math.round(h * 0.22);
  const y0 = h - band;
  const fade = ctx.createLinearGradient(0, y0 - h * 0.08, 0, h);
  fade.addColorStop(0, 'rgba(16, 6, 28, 0)');
  fade.addColorStop(0.35, 'rgba(16, 6, 28, 0.88)');
  fade.addColorStop(1, 'rgba(10, 3, 20, 0.96)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, y0 - h * 0.08, w, h - (y0 - h * 0.08));

  // A thin neon rule above the caption, like a marquee strip.
  const rule = ctx.createLinearGradient(0, 0, w, 0);
  rule.addColorStop(0, '#ff2d96');
  rule.addColorStop(0.5, '#ffb35c');
  rule.addColorStop(1, '#00e5cc');
  ctx.fillStyle = rule;
  ctx.fillRect(w * 0.045, y0 + band * 0.10, w * 0.30, Math.max(2, Math.round(h * 0.004)));

  const caption = (state.caption || '').trim().toUpperCase();
  if (caption) {
    let size = Math.round(h * 0.115);
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    while (ctx.measureText(caption).width > w * 0.92 && size > 16) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    }
    const tx = w * 0.045;
    const ty = y0 + band * 0.52;
    const ink = ctx.createLinearGradient(0, ty - size, 0, ty);
    ink.addColorStop(0, '#ffe9a8');
    ink.addColorStop(0.45, '#ffb35c');
    ink.addColorStop(1, '#ff4d8d');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 2, 18, 0.95)';
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeText(caption, tx, ty);
    ctx.fillStyle = ink;
    ctx.fillText(caption, tx, ty);
  }

  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const size = Math.max(14, Math.round(h * 0.038));
    ctx.font = `${size}px Pacifico, cursive`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff2d96';
    ctx.shadowBlur = size * 0.7;
    ctx.fillStyle = '#ff8fd1';
    ctx.fillText(subtitle, w * 0.05, y0 + band * 0.82);
    ctx.shadowBlur = 0;
  }

  // The maker's mark, small and original.
  const mark = 'NEON COAST STUDIO';
  const msize = Math.max(10, Math.round(h * 0.016));
  ctx.font = `700 ${msize}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(mark, w * 0.96, y0 + band * 0.88);
}

/**
 * Draws the whole cover onto a canvas's 2D context at the canvas's own size.
 * `photos` is an array of loaded images; a panel whose photo is missing stays a dusk panel.
 */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#2b0f3d');
  bg.addColorStop(1, '#12041f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo];
    if (img) {
      drawPanelPhoto(ctx, img, rects[i], panel, state.grade);
    } else {
      ctx.save();
      ctx.fillStyle = '#3a1445';
      ctx.fillRect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
      ctx.restore();
      drawPanelFrame(ctx, rects[i]);
    }
  }

  drawTitleBand(ctx, state, w, h);

  // Vignette: the poster's dusk corners.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 16, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  if (state.grain) grain(ctx, w, h);
  return rects;
}
