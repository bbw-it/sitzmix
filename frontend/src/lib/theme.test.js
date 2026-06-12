import { describe, it, expect, beforeEach } from 'vitest';
import { THEMES, DEFAULT_THEME, isValidTheme, getTheme, setTheme, applyTheme, _resetTheme } from './theme';

beforeEach(() => {
  try { localStorage.removeItem('sitzmix-theme'); } catch { /* ignore */ }
  _resetTheme();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme', () => {
  it('has Winterthur as the default', () => {
    expect(DEFAULT_THEME).toBe('winterthur');
    expect(THEMES[0].id).toBe('winterthur');
  });

  it('validates known/unknown ids', () => {
    expect(isValidTheme('zuerich')).toBe(true);
    expect(isValidTheme('nope')).toBe(false);
  });

  it('falls back to default when nothing stored', () => {
    expect(getTheme()).toBe('winterthur');
  });

  it('setTheme persists and applies to the document', () => {
    setTheme('lugano');
    expect(getTheme()).toBe('lugano');
    expect(document.documentElement.dataset.theme).toBe('lugano');
  });

  it('rejects invalid ids and falls back to default', () => {
    setTheme('atlantis');
    expect(getTheme()).toBe('winterthur');
    expect(document.documentElement.dataset.theme).toBe('winterthur');
  });

  it('applyTheme sets the document without changing the stored choice', () => {
    applyTheme('bern');
    expect(document.documentElement.dataset.theme).toBe('bern');
    expect(getTheme()).toBe('winterthur'); // nur DOM, nicht die Auswahl
  });
});
