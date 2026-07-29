// ============================================================
// VaultPad — Theme Manager (loaded first on all pages)
// Sets theme immediately to prevent flash of wrong theme
// ============================================================

(function () {
  'use strict';

  // Apply theme immediately (before DOMContentLoaded) to prevent FOUC
  const saved = localStorage.getItem('vaultpad-theme');
  const serverTheme = document.documentElement.getAttribute('data-theme');
  const systemDark  = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || serverTheme || (systemDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', initial);
  if (initial === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();

// Full ThemeManager exposed globally — used by workspace.js and main.js
window.ThemeManager = {
  init() {
    // Icons are updated by WorkspaceManager / main.js — no conflict
    // This manager just ensures early application of theme
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vaultpad-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Sync all toggle icons
    ['theme-toggle', 'theme-toggle-mobile', 'theme-toggle-workspace'].forEach(id => {
      const btn = document.getElementById(id);
      const i   = btn && btn.querySelector('i');
      if (i) i.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });

    // Sync with server if in workspace
    const app = document.getElementById('app');
    if (app && app.dataset.workspaceId) {
      fetch(`/api/workspace/${app.dataset.workspaceId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      }).catch(() => {});
    }
  },

  toggle() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    this.setTheme(cur === 'dark' ? 'light' : 'dark');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Bind toggle buttons on landing page (workspace.js handles its own)
  ['theme-toggle', 'theme-toggle-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => window.ThemeManager.toggle());
      // Set correct icon
      const theme = localStorage.getItem('vaultpad-theme') || 'light';
      const i = btn.querySelector('i');
      if (i) i.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  });
});
