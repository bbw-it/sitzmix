import { describe, it, expect } from 'vitest';
import {
  defaultSketch, createRect, createEllipse, insertVertex, removeVertex, moveVertex,
  validateSketchFile, toFileFormat, toBox, fromBox, resizeBox, rotatePoint, rotateShape,
  moveShape, rectToPolygon, normalizeShapes, angleFromPointer, normalizeAngle, snapValue,
} from './sketch';

describe('shape factories', () => {
  it('creates an axis-aligned rect within canvas', () => {
    const r = createRect(1000, 700);
    expect(r.type).toBe('rect');
    expect(r.w).toBeGreaterThan(0);
    expect(r.h).toBeGreaterThan(0);
    expect(r.rot).toBe(0);
    expect(r.id).toBeTruthy();
  });

  it('creates a round ellipse (rx == ry)', () => {
    const e = createEllipse(1000, 700);
    expect(e.type).toBe('ellipse');
    expect(e.rx).toBeGreaterThan(0);
    expect(e.rx).toBe(e.ry);
  });
});

describe('box <-> shape conversion', () => {
  it('round-trips a rect through toBox/fromBox', () => {
    const r = { id: 'a', type: 'rect', x: 10, y: 20, w: 100, h: 60, rot: 0 };
    const box = toBox(r);
    expect(box).toEqual({ cx: 60, cy: 50, w: 100, h: 60, rot: 0 });
    expect(fromBox('rect', box, 'a')).toEqual(r);
  });

  it('treats legacy circle as a round box', () => {
    const box = toBox({ type: 'circle', cx: 50, cy: 50, r: 20 });
    expect(box).toEqual({ cx: 50, cy: 50, w: 40, h: 40, rot: 0 });
  });
});

describe('resizeBox (rot = 0)', () => {
  const box = { cx: 50, cy: 50, w: 40, h: 40, rot: 0 }; // 30..70 in both axes
  it('dragging SE corner grows from the NW anchor', () => {
    const next = resizeBox(box, 'se', { x: 90, y: 90 }, { min: 1 });
    // left/top stay at 30, right/bottom move to 90 → w/h = 60, center = (60,60)
    expect(next.w).toBeCloseTo(60);
    expect(next.h).toBeCloseTo(60);
    expect(next.cx).toBeCloseTo(60);
    expect(next.cy).toBeCloseTo(60);
  });

  it('dragging E edge changes only width', () => {
    const next = resizeBox(box, 'e', { x: 100, y: 999 }, { min: 1 });
    expect(next.w).toBeCloseTo(70);  // 30..100
    expect(next.h).toBeCloseTo(40);  // unchanged
    expect(next.cy).toBeCloseTo(50);
  });

  it('enforces a minimum size instead of flipping', () => {
    const next = resizeBox(box, 'e', { x: 0, y: 50 }, { min: 5 });
    expect(next.w).toBeCloseTo(5); // right clamped to left+min
  });

  it('snaps the moving edge to the grid', () => {
    const next = resizeBox(box, 'e', { x: 87, y: 50 }, { min: 1, snapStep: 10 });
    expect(next.w).toBeCloseTo(60); // 87 → snapped 90, minus left 30
  });

  it('keeps aspect ratio on corner drag', () => {
    const wide = { cx: 50, cy: 50, w: 80, h: 40, rot: 0 }; // aspect 2:1
    const next = resizeBox(wide, 'se', { x: 100, y: 200 }, { keepAspect: true, min: 1 });
    expect(next.w / next.h).toBeCloseTo(2);
  });
});

describe('rotation', () => {
  it('rotatePoint turns 90° clockwise about center', () => {
    const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
  });

  it('angleFromPointer points up = 0°', () => {
    expect(normalizeAngle(angleFromPointer({ x: 0, y: 0 }, { x: 0, y: -10 }))).toBeCloseTo(0);
  });

  it('rotateShape sets rot for rect/ellipse', () => {
    const r = rotateShape({ id: 'a', type: 'rect', x: 0, y: 0, w: 10, h: 10, rot: 0 }, 45);
    expect(r.rot).toBeCloseTo(45);
  });

  it('rotateShape bakes rotation into polygon points', () => {
    const poly = { id: 'p', type: 'polygon', rot: 0, points: [{ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 }] };
    const rotated = rotateShape(poly, 90);
    expect(rotated.rot).toBe(0);
    // centroid is (10/3, 10/3); points should differ from original
    expect(rotated.points[0]).not.toEqual(poly.points[0]);
  });
});

describe('move + convert', () => {
  it('moveShape shifts a rect', () => {
    expect(moveShape({ type: 'rect', x: 1, y: 2, w: 3, h: 4 }, 10, 20)).toMatchObject({ x: 11, y: 22 });
  });

  it('rectToPolygon yields 4 corners and rot 0', () => {
    const poly = rectToPolygon({ id: 'r', type: 'rect', x: 0, y: 0, w: 10, h: 10, rot: 0 });
    expect(poly.type).toBe('polygon');
    expect(poly.points).toHaveLength(4);
    expect(poly.rot).toBe(0);
  });
});

describe('polygon vertex ops', () => {
  it('inserts a vertex at the edge midpoint', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const next = insertVertex(pts, 0);
    expect(next).toHaveLength(5);
    expect(next[1]).toEqual({ x: 5, y: 0 });
  });

  it('does not remove below 3 points', () => {
    const tri = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    expect(removeVertex(tri, 0)).toBe(tri);
  });

  it('moves a vertex immutably', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const next = moveVertex(pts, 0, 5, 5);
    expect(next[0]).toEqual({ x: 5, y: 5 });
    expect(pts[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('snapValue', () => {
  it('snaps to nearest step, passes through when step 0', () => {
    expect(snapValue(23, 10)).toBe(20);
    expect(snapValue(26, 10)).toBe(30);
    expect(snapValue(23, 0)).toBe(23);
  });
});

describe('migration + validation', () => {
  it('migrates legacy circle to ellipse', () => {
    const out = normalizeShapes([{ type: 'circle', cx: 5, cy: 6, r: 7 }]);
    expect(out[0]).toMatchObject({ type: 'ellipse', cx: 5, cy: 6, rx: 7, ry: 7, rot: 0 });
    expect(out[0].id).toBeTruthy();
  });

  it('adds ids and default rot to shapes missing them', () => {
    const out = normalizeShapes([{ type: 'rect', x: 0, y: 0, w: 1, h: 1 }]);
    expect(out[0].id).toBeTruthy();
    expect(out[0].rot).toBe(0);
  });

  it('accepts a current v2 file', () => {
    const f = toFileFormat({ ...defaultSketch(), shapes: [createRect(1000, 700), createEllipse(1000, 700)] });
    expect(f.version).toBe(2);
    expect(validateSketchFile(f)).toBeNull();
  });

  it('still accepts legacy v1 circle/polygon files', () => {
    const f = { type: 'sitzmix-floorplan', version: 1, width: 1000, height: 700, shapes: [{ type: 'circle', cx: 1, cy: 1, r: 1 }] };
    expect(validateSketchFile(f)).toBeNull();
  });

  it('rejects bad type, future version, broken shapes', () => {
    expect(validateSketchFile({ type: 'x' })).toMatch(/Kein SitzMix-Grundriss/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 3, width: 1, height: 1, shapes: [] })).toMatch(/Version/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 2, width: 1, height: 1, shapes: [{ type: 'rect', x: 0, y: 0, w: -1, h: 1 }] })).toMatch(/Rechteck/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 2, width: 1, height: 1, shapes: [{ type: 'star' }] })).toMatch(/Unbekannter Formtyp/);
  });
});
