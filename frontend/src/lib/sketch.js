const uid = () => crypto.randomUUID();

export const SCHEMA_VERSION = 2;

export function defaultSketch() {
  return { version: SCHEMA_VERSION, width: 1000, height: 700, shapes: [] };
}

// ── Form-Fabriken ──────────────────────────────────────────
export function createRect(width, height) {
  const w = width * 0.35, h = height * 0.35;
  return { id: uid(), type: 'rect', x: (width - w) / 2, y: (height - h) / 2, w, h, rot: 0 };
}

export function createEllipse(width, height) {
  const r = Math.min(width, height) * 0.2;
  return { id: uid(), type: 'ellipse', cx: width / 2, cy: height / 2, rx: r, ry: r, rot: 0 };
}

// ── Geometrie-Helfer ───────────────────────────────────────
const rad = (deg) => (deg * Math.PI) / 180;

// Punkt p um Zentrum c um deg Grad drehen
export function rotatePoint(p, c, deg) {
  if (!deg) return { x: p.x, y: p.y };
  const a = rad(deg), cos = Math.cos(a), sin = Math.sin(a);
  const dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

// Vektor (ohne Zentrum) um deg Grad drehen
function rotateVec(v, deg) {
  if (!deg) return { x: v.x, y: v.y };
  const a = rad(deg), cos = Math.cos(a), sin = Math.sin(a);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

export function shapeCenter(shape) {
  if (shape.type === 'rect') return { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 };
  if (shape.type === 'ellipse') return { x: shape.cx, y: shape.cy };
  if (shape.type === 'circle') return { x: shape.cx, y: shape.cy }; // Legacy
  // polygon
  const n = shape.points.length;
  const s = shape.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / n, y: s.y / n };
}

export function snapValue(v, step) {
  if (!step) return v;
  return Math.round(v / step) * step;
}

// ── Bounding-Box-Form für rect/ellipse ─────────────────────
// Einheitliche Center-Form {cx, cy, w, h, rot} für Resize/Rotate.
export function toBox(shape) {
  if (shape.type === 'rect') return { cx: shape.x + shape.w / 2, cy: shape.y + shape.h / 2, w: shape.w, h: shape.h, rot: shape.rot || 0 };
  if (shape.type === 'ellipse' || shape.type === 'circle') {
    const rx = shape.rx ?? shape.r, ry = shape.ry ?? shape.r;
    return { cx: shape.cx, cy: shape.cy, w: rx * 2, h: ry * 2, rot: shape.rot || 0 };
  }
  return null;
}

export function fromBox(type, box, id) {
  if (type === 'rect') return { id, type: 'rect', x: box.cx - box.w / 2, y: box.cy - box.h / 2, w: box.w, h: box.h, rot: box.rot || 0 };
  // ellipse (circle wird beim Laden zu ellipse migriert)
  return { id, type: 'ellipse', cx: box.cx, cy: box.cy, rx: box.w / 2, ry: box.h / 2, rot: box.rot || 0 };
}

// Eckpunkte (world) einer Box, im Uhrzeigersinn ab oben-links
export function boxCorners(box) {
  const c = { x: box.cx, y: box.cy };
  const hw = box.w / 2, hh = box.h / 2;
  return [
    rotatePoint({ x: box.cx - hw, y: box.cy - hh }, c, box.rot),
    rotatePoint({ x: box.cx + hw, y: box.cy - hh }, c, box.rot),
    rotatePoint({ x: box.cx + hw, y: box.cy + hh }, c, box.rot),
    rotatePoint({ x: box.cx - hw, y: box.cy + hh }, c, box.rot),
  ];
}

// Griff-Positionen (world): 8 Resize-Griffe nach Himmelsrichtung
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export function boxHandles(box) {
  const c = { x: box.cx, y: box.cy };
  const hw = box.w / 2, hh = box.h / 2;
  const local = {
    nw: { x: box.cx - hw, y: box.cy - hh }, n: { x: box.cx, y: box.cy - hh }, ne: { x: box.cx + hw, y: box.cy - hh },
    e: { x: box.cx + hw, y: box.cy }, se: { x: box.cx + hw, y: box.cy + hh }, s: { x: box.cx, y: box.cy + hh },
    sw: { x: box.cx - hw, y: box.cy + hh }, w: { x: box.cx - hw, y: box.cy },
  };
  const out = {};
  for (const h of HANDLES) out[h] = rotatePoint(local[h], c, box.rot);
  return out;
}

// Position des Dreh-Griffs (world): über der Oberkante
export function rotationHandle(box, gap) {
  const c = { x: box.cx, y: box.cy };
  const local = { x: box.cx, y: box.cy - box.h / 2 - gap };
  return rotatePoint(local, c, box.rot);
}

// Box anhand eines Griffs auf den Zeiger skalieren.
// pointer = world-Koordinaten des Zeigers; opts.snapStep, opts.keepAspect, opts.min
export function resizeBox(box, handle, pointer, opts = {}) {
  const { snapStep = 0, keepAspect = false, min = 1 } = opts;
  const c = { x: box.cx, y: box.cy };
  // Zeiger in lokalen (unrotierten) Rahmen bringen
  const pLocal = rotatePoint(pointer, c, -box.rot);

  let left = box.cx - box.w / 2, right = box.cx + box.w / 2;
  let top = box.cy - box.h / 2, bottom = box.cy + box.h / 2;

  const movesE = handle.includes('e'), movesW = handle.includes('w');
  const movesS = handle.includes('s'), movesN = handle.includes('n');

  let px = pLocal.x, py = pLocal.y;
  if (snapStep) { px = snapValue(px, snapStep); py = snapValue(py, snapStep); }

  if (movesE) right = Math.max(left + min, px);
  if (movesW) left = Math.min(right - min, px);
  if (movesS) bottom = Math.max(top + min, py);
  if (movesN) top = Math.min(bottom - min, py);

  let newW = right - left, newH = bottom - top;

  // Seitenverhältnis halten (nur Eck-Griffe sinnvoll)
  if (keepAspect && (movesE || movesW) && (movesS || movesN)) {
    const aspect = box.w / box.h;
    if (newW / newH > aspect) newH = newW / aspect; else newW = newH * aspect;
    if (movesE) right = left + newW; else left = right - newW;
    if (movesS) bottom = top + newH; else top = bottom - newH;
  }

  const newCenterLocal = { x: (left + right) / 2, y: (top + bottom) / 2 };

  // Anker = fixe Gegenseite; in lokalen Koords unverändert
  const anchorLocal = {
    x: movesE ? (box.cx - box.w / 2) : movesW ? (box.cx + box.w / 2) : box.cx,
    y: movesS ? (box.cy - box.h / 2) : movesN ? (box.cy + box.h / 2) : box.cy,
  };
  const anchorWorld = rotatePoint(anchorLocal, c, box.rot);
  const delta = { x: anchorLocal.x - newCenterLocal.x, y: anchorLocal.y - newCenterLocal.y };
  const rotated = rotateVec(delta, box.rot);
  const newCenterWorld = { x: anchorWorld.x - rotated.x, y: anchorWorld.y - rotated.y };

  return { cx: newCenterWorld.x, cy: newCenterWorld.y, w: newW, h: newH, rot: box.rot };
}

// Drehwinkel aus Zeigerposition (Griff zeigt bei rot=0 nach oben)
export function angleFromPointer(center, pointer) {
  const deg = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI;
  return deg + 90;
}

export function normalizeAngle(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// Form drehen. rect/ellipse: rot setzen. polygon: Rotation in Punkte einbacken.
export function rotateShape(shape, deg) {
  if (shape.type === 'rect' || shape.type === 'ellipse') {
    return { ...shape, rot: normalizeAngle(deg) };
  }
  // polygon: um Schwerpunkt drehen, rot bleibt 0
  const c = shapeCenter(shape);
  const cur = shape.rot || 0;
  const diff = deg - cur;
  return { ...shape, rot: 0, points: shape.points.map(p => rotatePoint(p, c, diff)) };
}

// Form verschieben
export function moveShape(shape, dx, dy) {
  if (shape.type === 'rect') return { ...shape, x: shape.x + dx, y: shape.y + dy };
  if (shape.type === 'ellipse' || shape.type === 'circle') return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
  return { ...shape, points: shape.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
}

// Rechteck in editierbares Polygon umwandeln (Rotation einbacken)
export function rectToPolygon(rect) {
  const box = toBox(rect);
  const corners = boxCorners(box);
  return { id: rect.id, type: 'polygon', points: corners, rot: 0 };
}

// ── Polygon-Punkt-Operationen ──────────────────────────────
export function insertVertex(points, edgeIndex) {
  const a = points[edgeIndex];
  const b = points[(edgeIndex + 1) % points.length];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const next = points.slice();
  next.splice(edgeIndex + 1, 0, mid);
  return next;
}

export function removeVertex(points, index) {
  if (points.length <= 3) return points;
  return points.filter((_, i) => i !== index);
}

export function moveVertex(points, index, x, y) {
  return points.map((p, i) => (i === index ? { x, y } : p));
}

// ── Persistenz / Migration / Validierung ───────────────────
export function toFileFormat(sketch) {
  return { type: 'sitzmix-floorplan', version: SCHEMA_VERSION, width: sketch.width, height: sketch.height, shapes: normalizeShapes(sketch.shapes) };
}

function isNum(n) { return typeof n === 'number' && Number.isFinite(n); }

// Legacy- und Import-Formen vereinheitlichen: ids ergänzen, circle → ellipse, rot default 0
export function normalizeShapes(shapes) {
  return (shapes || []).map(s => {
    const id = s.id || uid();
    if (s.type === 'circle') return { id, type: 'ellipse', cx: s.cx, cy: s.cy, rx: s.r, ry: s.r, rot: 0 };
    if (s.type === 'ellipse') return { id, type: 'ellipse', cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry, rot: s.rot || 0 };
    if (s.type === 'rect') return { id, type: 'rect', x: s.x, y: s.y, w: s.w, h: s.h, rot: s.rot || 0 };
    return { id, type: 'polygon', points: s.points.map(p => ({ x: p.x, y: p.y })), rot: 0 };
  });
}

export function validateSketchFile(json) {
  if (!json || typeof json !== 'object') return 'Datei ist kein gültiges JSON-Objekt.';
  if (json.type !== 'sitzmix-floorplan') return 'Kein SitzMix-Grundriss (falscher Typ).';
  if (!isNum(json.version) || json.version > SCHEMA_VERSION) return `Version ${json.version} wird nicht unterstützt.`;
  if (!isNum(json.width) || !isNum(json.height) || json.width <= 0 || json.height <= 0) return 'Ungültige Canvas-Masse.';
  if (!Array.isArray(json.shapes)) return 'Formen fehlen oder sind ungültig.';
  for (const s of json.shapes) {
    if (s.rot !== undefined && !isNum(s.rot)) return 'Form mit ungültigem Drehwinkel.';
    if (s.type === 'polygon') {
      if (!Array.isArray(s.points) || s.points.length < 3) return 'Polygon mit zu wenigen Punkten.';
      if (!s.points.every(p => isNum(p.x) && isNum(p.y))) return 'Polygon mit ungültigen Punkten.';
    } else if (s.type === 'rect') {
      if (!isNum(s.x) || !isNum(s.y) || !isNum(s.w) || !isNum(s.h) || s.w <= 0 || s.h <= 0) return 'Rechteck mit ungültigen Werten.';
    } else if (s.type === 'ellipse') {
      if (!isNum(s.cx) || !isNum(s.cy) || !isNum(s.rx) || !isNum(s.ry) || s.rx <= 0 || s.ry <= 0) return 'Ellipse mit ungültigen Werten.';
    } else if (s.type === 'circle') {
      if (!isNum(s.cx) || !isNum(s.cy) || !isNum(s.r) || s.r <= 0) return 'Kreis mit ungültigen Werten.';
    } else {
      return `Unbekannter Formtyp: ${s.type}.`;
    }
  }
  return null;
}

// Stellt sicher, dass jede Form eine id hat (z.B. nach Datei-Import)
export function withIds(shapes) {
  return normalizeShapes(shapes);
}
