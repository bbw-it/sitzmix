import { describe, it, expect } from 'vitest';
import { computeExportPixelRatio, MAX_EXPORT_DIMENSION } from './pngExport';

describe('computeExportPixelRatio', () => {
  it('uses 2 for a normal-sized plan on an unknown device', () => {
    expect(computeExportPixelRatio({ width: 1038, height: 670 })).toBe(2);
  });

  it('drops to 1.5 on a low-memory device', () => {
    expect(computeExportPixelRatio({ width: 1038, height: 670, deviceMemory: 4 })).toBe(1.5);
  });

  it('keeps 2 on a well-equipped device', () => {
    expect(computeExportPixelRatio({ width: 1038, height: 670, deviceMemory: 8 })).toBe(2);
  });

  it('caps the ratio so the bitmap never exceeds the max dimension', () => {
    const ratio = computeExportPixelRatio({ width: 1400, height: 900 });
    expect(ratio).toBeCloseTo(MAX_EXPORT_DIMENSION / 1400, 5);
    expect(1400 * ratio).toBeLessThanOrEqual(MAX_EXPORT_DIMENSION + 0.001);
  });

  it('never goes below 1 even for a very wide plan', () => {
    expect(computeExportPixelRatio({ width: 4000, height: 2600 })).toBe(1);
  });

  it('is robust to missing dimensions', () => {
    expect(computeExportPixelRatio({})).toBe(2);
    expect(computeExportPixelRatio()).toBe(2);
  });
});
