import { describe, it, expect } from 'vitest';
import { defaultSketch, createRectangle, createCircle, insertVertex, removeVertex, moveVertex, validateSketchFile, toFileFormat } from './sketch';

describe('sketch helpers', () => {
  it('creates a 4-point rectangle polygon', () => {
    const r = createRectangle(1000, 700);
    expect(r.type).toBe('polygon');
    expect(r.points).toHaveLength(4);
    expect(r.id).toBeTruthy();
  });

  it('creates a circle within canvas', () => {
    const c = createCircle(1000, 700);
    expect(c.type).toBe('circle');
    expect(c.r).toBeGreaterThan(0);
  });

  it('inserts a vertex at the edge midpoint', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const next = insertVertex(pts, 0);
    expect(next).toHaveLength(5);
    expect(next[1]).toEqual({ x: 5, y: 0 });
  });

  it('does not remove a vertex below 3 points', () => {
    const tri = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    expect(removeVertex(tri, 0)).toBe(tri);
    const quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(removeVertex(quad, 1)).toHaveLength(3);
  });

  it('moves a vertex immutably', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const next = moveVertex(pts, 0, 5, 5);
    expect(next[0]).toEqual({ x: 5, y: 5 });
    expect(pts[0]).toEqual({ x: 0, y: 0 });
  });

  it('validates a good file as null', () => {
    const ok = toFileFormat(defaultSketch());
    ok.shapes = [createRectangle(1000, 700)];
    expect(validateSketchFile(ok)).toBeNull();
  });

  it('rejects wrong type, version, broken shapes', () => {
    expect(validateSketchFile({ type: 'x' })).toMatch(/Kein SitzMix-Grundriss/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 2, width: 1, height: 1, shapes: [] })).toMatch(/Version/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 1, width: 1, height: 1, shapes: [{ type: 'polygon', points: [{ x: 0, y: 0 }] }] })).toMatch(/zu wenigen Punkten/);
    expect(validateSketchFile({ type: 'sitzmix-floorplan', version: 1, width: 1, height: 1, shapes: [{ type: 'star' }] })).toMatch(/Unbekannter Formtyp/);
  });
});
