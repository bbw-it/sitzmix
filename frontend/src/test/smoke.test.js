import { describe, it, expect } from 'vitest';
describe('tooling', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
  it('has indexedDB', () => { expect(typeof indexedDB).toBe('object'); });
});
