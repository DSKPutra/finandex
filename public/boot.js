/* © 2026 Dea Saka Kurnia Putra. All rights reserved. */
/* Pre-paint boot (external file because the CSP forbids inline scripts): apply the saved or device locale and theme
   to <html> so the matching prerendered Home shell and colours show on first paint. */
(function () {
  var s = {};
  try {
    s = (JSON.parse(localStorage.getItem('finandex-settings') || '{}').state) || {};
  } catch (e) {}
  var lang = s.locale || ((navigator.language || 'id').toLowerCase().indexOf('en') === 0 ? 'en' : 'id');
  var theme = s.theme || 'dark';
  if (theme === 'system') theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  var h = document.documentElement;
  h.lang = lang;
  h.setAttribute('data-theme', theme);
  h.setAttribute('data-colorblind', String(!!s.colorblind));
})();
