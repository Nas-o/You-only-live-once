import type { CustomTheme, SkinTone, ThemeBase, ThemeName } from '@yolo/core';

const THEME_KEY = 'yolo-theme';

const CUSTOM_VARS = [
  '--paper',
  '--paper-raised',
  '--paper-sunken',
  '--ink',
  '--ink-soft',
  '--ink-mute',
  '--bg',
  '--bg-deep',
  '--panel',
  '--panel-2',
  '--panel-3',
  '--line',
  '--line-strong',
  '--text',
  '--text-dim',
  '--text-mute',
  '--gold',
  '--gold-strong',
  '--gold-soft',
  '--jade',
  '--azure',
  '--rose',
  '--violet',
  '--danger',
  '--seal',
  '--seal-strong',
  '--input-bg',
  '--ring-track',
  '--bar-track',
  '--chart-grid',
  '--chart-track',
  '--chart-bar',
  '--constellation-line',
  '--constellation-locked',
  '--constellation-fill',
  '--constellation-core',
  '--shadow',
] as const;

export function isThemeBase(value: unknown): value is ThemeBase {
  return value === 'paper' || value === 'ink' || value === 'swiss';
}

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'custom' || value === 'lulu' || isThemeBase(value);
}

type Rgb = { r: number; g: number; b: number };

function parseHex(value: string): Rgb {
  const fallback: Rgb = { r: 243, g: 238, b: 228 };
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match?.[1]) return fallback;
  const hex = match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const t = Math.min(1, Math.max(0, amount));
  const channel = (x: number, y: number) => Math.round(x * (1 - t) + y * t);
  return `#${[channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

function alpha(value: string, opacity: number): string {
  const { r, g, b } = parseHex(value);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function luminance(value: string): number {
  const { r, g, b } = parseHex(value);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function setCustomVars(custom: CustomTheme): void {
  const root = document.documentElement;
  const c = custom.colors;
  const dark = luminance(c.paper) < 0.45;
  const inkSoft = mix(c.ink, c.paper, 0.26);
  const inkMute = mix(c.ink, c.paper, 0.44);
  const values: Record<(typeof CUSTOM_VARS)[number], string> = {
    '--paper': c.paper,
    '--paper-raised': c.paperRaised,
    '--paper-sunken': c.paperSunken,
    '--ink': c.ink,
    '--ink-soft': inkSoft,
    '--ink-mute': inkMute,
    '--bg': c.paper,
    '--bg-deep': c.paperSunken,
    '--panel': c.paperRaised,
    '--panel-2': mix(c.paperRaised, c.paper, 0.38),
    '--panel-3': mix(c.paperSunken, c.paperRaised, 0.45),
    '--line': alpha(c.ink, dark ? 0.18 : 0.16),
    '--line-strong': alpha(c.ink, dark ? 0.38 : 0.34),
    '--text': c.ink,
    '--text-dim': inkSoft,
    '--text-mute': inkMute,
    '--gold': c.gold,
    '--gold-strong': mix(c.gold, c.ink, 0.22),
    '--gold-soft': alpha(c.gold, 0.1),
    '--jade': c.jade,
    '--azure': c.azure,
    '--rose': c.seal,
    '--violet': c.violet,
    '--danger': c.seal,
    '--seal': c.seal,
    '--seal-strong': mix(c.seal, c.ink, 0.18),
    '--input-bg': c.paperRaised,
    '--ring-track': alpha(c.ink, 0.14),
    '--bar-track': alpha(c.ink, 0.11),
    '--chart-grid': alpha(c.ink, 0.1),
    '--chart-track': alpha(c.ink, 0.06),
    '--chart-bar': c.jade,
    '--constellation-line': alpha(c.ink, 0.22),
    '--constellation-locked': alpha(c.ink, 0.34),
    '--constellation-fill': c.paperRaised,
    '--constellation-core': c.paperRaised,
    '--shadow': `0 30px 80px ${alpha(c.ink, dark ? 0.48 : 0.16)}`,
  };
  for (const [key, value] of Object.entries(values)) root.style.setProperty(key, value);
}

function clearCustomVars(): void {
  const root = document.documentElement;
  for (const key of CUSTOM_VARS) root.style.removeProperty(key);
  delete root.dataset.customTheme;
}

function cacheTheme(theme: ThemeName): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* localStorage 不可用时只影响首屏缓存，不影响本次主题 */
  }
}

export function applyCustomTheme(custom: CustomTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = custom.base;
  root.dataset.customTheme = 'true';
  delete root.dataset.skinTone;
  setCustomVars(custom);
  cacheTheme('custom');
}

export function applyTheme(
  theme: ThemeName,
  custom?: CustomTheme | null,
  skinTone: SkinTone = 'light',
): void {
  if (typeof document === 'undefined') return;
  if (theme === 'custom' && custom) {
    applyCustomTheme(custom);
    return;
  }
  const root = document.documentElement;
  clearCustomVars();
  if (theme === 'lulu') {
    root.dataset.theme = 'lulu';
    root.dataset.skinTone = skinTone;
    cacheTheme('lulu');
    return;
  }
  delete root.dataset.skinTone;
  root.dataset.theme = isThemeBase(theme) ? theme : 'paper';
  cacheTheme(root.dataset.theme as ThemeBase);
}

/** 在 React 挂载前调用，避免深色/网格主题先闪一下纸色 */
export function applyCachedTheme(): void {
  if (typeof document === 'undefined') return;
  let cached: string | null = null;
  try {
    cached = window.localStorage.getItem(THEME_KEY);
  } catch {
    cached = null;
  }
  const root = document.documentElement;
  root.dataset.theme = isThemeBase(cached) || cached === 'lulu' ? cached : 'paper';
}
