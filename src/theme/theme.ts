/*
 * Light/dark theme (Bootstrap 5.3 color modes: <html data-bs-theme="...">).
 *
 * - Every time the app opens it follows the device theme (prefers-color-scheme).
 * - The header button overrides it for the current session only (sessionStorage), so a
 *   reload keeps the choice but closing and reopening the app goes back to the device.
 * - If the device theme changes while the app is open, the app follows it again.
 *
 * index.html runs the same logic inline before React loads, to avoid a light flash.
 */

export type Theme = 'light' | 'dark';

const OVERRIDE_KEY = 'theme-override';
const media = window.matchMedia('(prefers-color-scheme: dark)');

const deviceTheme = (): Theme => (media.matches ? 'dark' : 'light');

function readOverride(): Theme | null {
  try {
    const v = sessionStorage.getItem(OVERRIDE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function writeOverride(theme: Theme | null) {
  try {
    if (theme) sessionStorage.setItem(OVERRIDE_KEY, theme);
    else sessionStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // Storage blocked (private mode): the choice simply lasts until the next reload
  }
}

let current: Theme = readOverride() ?? deviceTheme();
const listeners = new Set<() => void>();

function apply(theme: Theme) {
  current = theme;
  document.documentElement.setAttribute('data-bs-theme', theme);
  document.documentElement.style.colorScheme = theme;
  listeners.forEach((l) => l());
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): Theme => current,
};

export function toggleTheme() {
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  // Choosing the device theme again means "no override"
  writeOverride(next === deviceTheme() ? null : next);
  apply(next);
}

export function startTheme() {
  apply(current);
  media.addEventListener('change', () => {
    writeOverride(null);
    apply(deviceTheme());
  });
}
