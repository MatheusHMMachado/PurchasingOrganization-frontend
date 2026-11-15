// Applies the theme before the first paint (same rule as src/theme/theme.ts):
// choice made this session, otherwise the device theme. External file, not inline,
// so the Content-Security-Policy can forbid inline scripts.
(function () {
  var t = null;
  try {
    t = sessionStorage.getItem('theme-override');
  } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-bs-theme', t);
  document.documentElement.style.colorScheme = t;
})();
