const uid = () => crypto.randomUUID();

export function defaultSketch() {
  return { version: 1, width: 1000, height: 700, shapes: [] };
}

export function createRectangle(width, height) {
  const w = width * 0.4, h = height * 0.4;
  const x = (width - w) / 2, y = (height - h) / 2;
  return { id: uid(), type: 'polygon', points: [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
  ] };
}

export function createCircle(width, height) {
  return { id: uid(), type: 'circle', cx: width / 2, cy: height / 2, r: Math.min(width, height) * 0.2 };
}

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

export function toFileFormat(sketch) {
  return { type: 'sitzmix-floorplan', version: 1, width: sketch.width, height: sketch.height, shapes: sketch.shapes };
}

function isNum(n) { return typeof n === 'number' && Number.isFinite(n); }

export function validateSketchFile(json) {
  if (!json || typeof json !== 'object') return 'Datei ist kein gültiges JSON-Objekt.';
  if (json.type !== 'sitzmix-floorplan') return 'Kein SitzMix-Grundriss (falscher Typ).';
  if (!isNum(json.version) || json.version > 1) return `Version ${json.version} wird nicht unterstützt.`;
  if (!isNum(json.width) || !isNum(json.height) || json.width <= 0 || json.height <= 0) return 'Ungültige Canvas-Masse.';
  if (!Array.isArray(json.shapes)) return 'Formen fehlen oder sind ungültig.';
  for (const s of json.shapes) {
    if (s.type === 'polygon') {
      if (!Array.isArray(s.points) || s.points.length < 3) return 'Polygon mit zu wenigen Punkten.';
      if (!s.points.every(p => isNum(p.x) && isNum(p.y))) return 'Polygon mit ungültigen Punkten.';
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
  return shapes.map(s => (s.id ? s : { ...s, id: uid() }));
}
