import { describe, it, expect, beforeEach } from 'vitest';
import {
  THEMES, DEFAULT_THEME, CUSTOM_THEME, FONT_OPTIONS, isValidTheme, getTheme, setTheme,
  applyTheme, getCustomConfig, setCustomConfig, buildScale, _resetTheme,
} from './theme';

beforeEach(() => {
  try {
    localStorage.removeItem('sitzmix-theme');
    localStorage.removeItem('sitzmix-theme-custom');
  } catch { /* ignore */ }
  _resetTheme();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
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

describe('custom theme', () => {
  it('is offered as the last theme card', () => {
    expect(THEMES[THEMES.length - 1].id).toBe(CUSTOM_THEME);
    expect(isValidTheme(CUSTOM_THEME)).toBe(true);
  });

  it('buildScale anchors the picked color at step 600 and fills all 11 steps', () => {
    const scale = buildScale('#7C3AED');
    expect(Object.keys(scale)).toHaveLength(11);
    expect(scale[600].toLowerCase()).toBe('#7c3aed');
    expect(scale[50]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(scale[950]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('setCustomConfig sanitizes invalid color/font', () => {
    const cfg = setCustomConfig({ color: 'kaputt', font: 'comic-sans' });
    expect(cfg.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(FONT_OPTIONS.some(f => f.id === cfg.font)).toBe(true);
  });

  it('selecting custom sets inline CSS variables, switching away clears them', () => {
    setCustomConfig({ color: '#336699', font: 'serif' });
    setTheme(CUSTOM_THEME);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-lime-600')).toBe('#336699');
    expect(root.style.getPropertyValue('--app-font')).toContain('Georgia');
    setTheme('winterthur');
    expect(root.style.getPropertyValue('--color-lime-600')).toBe('');
    expect(root.style.getPropertyValue('--app-font')).toBe('');
  });

  it('updating the config re-applies live while custom is active', () => {
    setTheme(CUSTOM_THEME);
    setCustomConfig({ color: '#112233' });
    expect(document.documentElement.style.getPropertyValue('--color-lime-600')).toBe('#112233');
    expect(getCustomConfig().color).toBe('#112233');
  });
});
