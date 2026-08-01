// ============================================================
// VaultPad — Workspace Orchestrator
// Manages tabs, sidebar, settings, toast notifications, theme
// ============================================================

'use strict';

// ── Global toast helper ────────────────────────────────────
window.showToast = function (message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
    warning: 'bg-yellow-500'
  };
  const icons = {
    success: 'fa-check-circle',
    error:   'fa-triangle-exclamation',
    info:    'fa-circle-info',
    warning: 'fa-circle-exclamation'
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg pointer-events-auto toast-enter ${colors[type] || colors.info}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
};

// ── Main Workspace Manager ─────────────────────────────────
window.WorkspaceManager = {
  TEXT_CATEGORIES: ['notes', 'python', 'java', 'cpp', 'sql', 'javascript', 'html', 'css'],
  FILE_CATEGORIES: ['images', 'videos', 'pdf', 'excel', 'word', 'audio'],

  init() {
    const app = document.getElementById('app');
    if (!app) return;

    this.workspaceId = app.dataset.workspaceId;
    this.currentCategory = 'notes';

    this.cacheDOM();
    this.applyTheme();
    this.bindEvents();
    this.loadCategory('notes');
    this.loadSidebar();
    this.renderTrashPanel();
    this.renderSettingsPanel();
  },

  cacheDOM() {
    this.tabBtns         = document.querySelectorAll('.tab-btn');
    this.textPanel       = document.getElementById('text-panel');
    this.filesPanel      = document.getElementById('files-panel');
    this.categoryTitle   = document.getElementById('files-category-title');
    this.mobileMenuBtn   = document.getElementById('mobile-menu-btn');
    this.sidebar         = document.getElementById('sidebar');
    this.sidebarOverlay  = document.getElementById('sidebar-overlay');
    this.saveStatus      = document.getElementById('save-status');
    this.nameContainer   = document.getElementById('workspace-name-container');
    this.nameDisplay     = document.getElementById('workspace-name-display');
    this.nameInput       = document.getElementById('workspace-name-input');
    this.themeToggle     = document.getElementById('theme-toggle-workspace');
    this.trashBtn        = document.getElementById('trash-btn');
    this.settingsBtn     = document.getElementById('settings-btn');
  },

  applyTheme() {
    const saved = localStorage.getItem('vaultpad-theme') ||
                  document.documentElement.getAttribute('data-theme') || 'light';
    this.setTheme(saved);
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vaultpad-theme', theme);

    const icon = this.themeToggle?.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    // Persist to server
    fetch(`/api/workspace/${this.workspaceId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    }).catch(() => {});
  },

  bindEvents() {
    // Tab switching
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', e => this.switchTab(e.currentTarget.dataset.category));
    });

    // Mobile sidebar
    this.mobileMenuBtn?.addEventListener('click', () => this.toggleSidebar(true));
    this.sidebarOverlay?.addEventListener('click', () => this.toggleSidebar(false));

    // Theme toggle
    this.themeToggle?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      this.setTheme(current === 'dark' ? 'light' : 'dark');
    });

    // Workspace name editing
    this.nameContainer?.addEventListener('click', () => {
      this.nameContainer.classList.add('hidden');
      this.nameInput.classList.remove('hidden');
      this.nameInput.focus();
      this.nameInput.select();
    });
    this.nameInput?.addEventListener('blur', () => this.saveWorkspaceName());
    this.nameInput?.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.saveWorkspaceName();
    });
    this.nameInput?.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.nameInput.value = this.nameDisplay.textContent;
        this.nameInput.classList.add('hidden');
        this.nameContainer.classList.remove('hidden');
      }
    });

    // Trash & Settings overlay buttons
    this.trashBtn?.addEventListener('click', () => this.openPanel('trash'));
    this.settingsBtn?.addEventListener('click', () => this.openPanel('settings'));

    // Ctrl+S global save
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (window.EditorManager && this.TEXT_CATEGORIES.includes(this.currentCategory)) {
          window.EditorManager.forceSave();
        }
      }
    });
  },

  // ── Tab Switching ────────────────────────────────────────
  switchTab(category) {
    if (this.currentCategory === category) return;
    this.currentCategory = category;

    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    if (this.TEXT_CATEGORIES.includes(category)) {
      this.filesPanel.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        this.textPanel.classList.remove('opacity-0', 'pointer-events-none');
        window.EditorManager?.setCategory(category);
      }, 150);
    } else {
      this.textPanel.classList.add('opacity-0', 'pointer-events-none');
      this.categoryTitle.textContent = category.toUpperCase();
      setTimeout(() => {
        this.filesPanel.classList.remove('opacity-0', 'pointer-events-none');
        window.FileManager?.setCategory(category);
      }, 150);
    }
  },

  loadCategory(category) {
    if (this.TEXT_CATEGORIES.includes(category)) {
      window.EditorManager?.setCategory(category);
    } else {
      window.FileManager?.setCategory(category);
    }
  },

  toggleSidebar(show) {
    if (show) {
      this.sidebar.classList.remove('-translate-x-full');
      this.sidebarOverlay.classList.remove('hidden');
    } else {
      this.sidebar.classList.add('-translate-x-full');
      this.sidebarOverlay.classList.add('hidden');
    }
  },

  // ── Workspace Name ───────────────────────────────────────
  async saveWorkspaceName() {
    const newName = (this.nameInput.value || '').trim() || 'My Workspace';
    this.nameDisplay.textContent = newName;
    this.nameInput.classList.add('hidden');
    this.nameContainer.classList.remove('hidden');
    document.title = `${newName} | VaultPad`;

    try {
      await fetch(`/api/workspace/${this.workspaceId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      this.showSaveSuccess();
    } catch {
      showToast('Failed to save name', 'error');
    }
  },

  // ── Sidebar ──────────────────────────────────────────────
  async loadSidebar() {
    try {
      const [pinRes, favRes, recRes] = await Promise.all([
        fetch(`/api/notes/${this.workspaceId}/pinned`),
        fetch(`/api/notes/${this.workspaceId}/favorites`),
        fetch(`/api/notes/${this.workspaceId}/recent`)
      ]);
      const [pinData, favData, recData] = await Promise.all([
        pinRes.json(), favRes.json(), recRes.json()
      ]);

      this.renderSidebarList('sidebar-pinned-list',   pinData.data || []);
      this.renderSidebarList('sidebar-favorites-list', favData.data || []);
      this.renderSidebarList('sidebar-recent-list',   recData.data || []);
    } catch {
      // Silently fail sidebar load — non-critical
    }
  },

  renderSidebarList(id, notes) {
    const list = document.getElementById(id);
    if (!list) return;
    if (!notes.length) {
      list.innerHTML = '<li class="text-xs text-[var(--text-muted)] px-3 py-1 italic">None</li>';
      return;
    }
    list.innerHTML = notes.map(note => `
      <li>
        <button class="w-full text-left px-3 py-1.5 rounded-md text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors truncate flex items-center gap-2"
          onclick="window.WorkspaceManager.navigateToNote('${note.category}', '${note._id}')">
          <i class="${this.getCategoryIcon(note.category)} text-xs w-4 text-center"></i>
          <span class="truncate">${this.escapeHtml(note.title || 'Untitled')}</span>
        </button>
      </li>
    `).join('');
  },

  refreshSidebar() { this.loadSidebar(); },

  navigateToNote(category, id) {
    // Set the pending ID BEFORE switching tabs so loadNotes() can pick it up
    if (window.EditorManager) window.EditorManager.pendingSelectId = id;
    this.switchTab(category);
    this.toggleSidebar(false);
  },

  // ── Panels (Trash / Settings) ────────────────────────────
  openPanel(type) {
    const existing = document.getElementById('overlay-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'overlay-panel';
    panel.className = 'fixed inset-y-0 right-0 w-96 bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl z-40 flex flex-col transform translate-x-full transition-transform duration-300';

    if (type === 'trash') panel.innerHTML = this.buildTrashPanel();
    else panel.innerHTML = this.buildSettingsPanel();

    document.body.appendChild(panel);
    requestAnimationFrame(() => panel.classList.remove('translate-x-full'));

    panel.querySelector('.close-panel-btn')?.addEventListener('click', () => this.closePanel());

    if (type === 'trash') this.loadTrashContent(panel);
    if (type === 'settings') this.bindSettingsEvents(panel);
  },

  closePanel() {
    const panel = document.getElementById('overlay-panel');
    if (!panel) return;
    panel.classList.add('translate-x-full');
    setTimeout(() => panel.remove(), 300);
  },

  buildTrashPanel() {
    return `
      <div class="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-sidebar)]">
        <h3 class="font-bold text-lg flex items-center gap-2"><i class="fa-solid fa-trash-can text-red-500"></i> Trash</h3>
        <button class="close-panel-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded"><i class="fa-solid fa-times"></i></button>
      </div>
      <div id="trash-content" class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        <div class="text-center py-8 text-[var(--text-muted)]"><i class="fa-solid fa-circle-notch fa-spin text-2xl"></i></div>
      </div>
      <div class="p-4 border-t border-[var(--border)]">
        <button id="empty-trash-btn" class="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
          <i class="fa-solid fa-trash mr-2"></i>Empty Trash
        </button>
      </div>
    `;
  },

  buildSettingsPanel() {
    const theme = localStorage.getItem('vaultpad-theme') || 'light';
    return `
      <div class="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-sidebar)]">
        <h3 class="font-bold text-lg flex items-center gap-2"><i class="fa-solid fa-gear text-primary"></i> Settings</h3>
        <button class="close-panel-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded"><i class="fa-solid fa-times"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <div>
          <h4 class="font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4">Appearance</h4>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Theme</span>
              <div class="flex gap-2">
                <button class="settings-theme-btn px-3 py-1.5 rounded-lg text-sm border transition-colors ${theme === 'light' ? 'bg-primary text-white border-primary' : 'border-[var(--border)] text-[var(--text-secondary)]'}" data-theme="light">
                  <i class="fa-solid fa-sun mr-1"></i> Light
                </button>
                <button class="settings-theme-btn px-3 py-1.5 rounded-lg text-sm border transition-colors ${theme === 'dark' ? 'bg-primary text-white border-primary' : 'border-[var(--border)] text-[var(--text-secondary)]'}" data-theme="dark">
                  <i class="fa-solid fa-moon mr-1"></i> Dark
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4">Workspace</h4>
          <div class="space-y-3">
            <label class="block text-sm font-medium mb-1">Name</label>
            <div class="flex gap-2">
              <input id="settings-name-input" type="text" value="${this.escapeHtml(this.nameDisplay?.textContent || '')}" class="flex-1 bg-[var(--bg-main)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-[var(--text-primary)]">
              <button id="settings-name-save" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">Save</button>
            </div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-4 text-red-500">Danger Zone</h4>
          <button id="settings-empty-trash" class="w-full py-2 px-4 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors">
            <i class="fa-solid fa-trash mr-2"></i>Empty Trash
          </button>
        </div>
      </div>
    `;
  },

  async loadTrashContent(panel) {
    const content = panel.querySelector('#trash-content');
    try {
      const res = await fetch(`/api/trash/${this.workspaceId}`);
      const data = await res.json();
      const notes = data.data?.notes || [];
      const files = data.data?.files || [];
      const all = [
        ...notes.map(n => ({ ...n, _type: 'note' })),
        ...files.map(f => ({ ...f, _type: 'file' }))
      ];

      if (!all.length) {
        content.innerHTML = '<div class="text-center py-12 text-[var(--text-muted)]"><i class="fa-solid fa-check text-3xl mb-3 text-green-500"></i><p class="font-medium">Trash is empty</p></div>';
        return;
      }

      content.innerHTML = all.map(item => `
        <div class="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border)] group">
          <i class="fa-solid ${item._type === 'note' ? 'fa-note-sticky text-yellow-500' : 'fa-file text-blue-500'} text-lg w-6 text-center"></i>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${this.escapeHtml(item.title || item.displayName || item.originalName || 'Untitled')}</p>
            <p class="text-xs text-[var(--text-muted)]">${item._type} · ${new Date(item.deletedAt).toLocaleDateString()}</p>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors restore-btn" data-id="${item._id}" data-type="${item._type}">
              <i class="fa-solid fa-rotate-left text-xs"></i>
            </button>
            <button class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors perm-del-btn" data-id="${item._id}" data-type="${item._type}">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      `).join('');

      content.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', () => this.restoreTrashItem(btn.dataset.id, btn.dataset.type, panel));
      });
      content.querySelectorAll('.perm-del-btn').forEach(btn => {
        btn.addEventListener('click', () => this.permanentDelete(btn.dataset.id, btn.dataset.type, panel));
      });
    } catch {
      content.innerHTML = '<div class="text-center py-8 text-red-500">Failed to load trash</div>';
    }

    panel.querySelector('#empty-trash-btn')?.addEventListener('click', () => this.emptyTrash(panel));
  },

  async restoreTrashItem(id, type, panel) {
    try {
      await fetch(`/api/trash/restore/${type}/${id}`, { method: 'POST' });
      showToast('Restored successfully', 'success');
      this.loadTrashContent(panel);
      if (type === 'note') this.refreshSidebar();
    } catch {
      showToast('Restore failed', 'error');
    }
  },

  async permanentDelete(id, type, panel) {
    if (!confirm('Permanently delete? This cannot be undone.')) return;
    try {
      await fetch(`/api/trash/permanent/${type}/${id}`, { method: 'DELETE' });
      showToast('Permanently deleted', 'success');
      this.loadTrashContent(panel);
    } catch {
      showToast('Delete failed', 'error');
    }
  },

  async emptyTrash(panel) {
    if (!confirm('Empty all trash? This cannot be undone.')) return;
    try {
      await fetch(`/api/trash/empty/${this.workspaceId}`, { method: 'DELETE' });
      showToast('Trash emptied', 'success');
      this.loadTrashContent(panel);
    } catch {
      showToast('Failed to empty trash', 'error');
    }
  },

  bindSettingsEvents(panel) {
    // Theme buttons
    panel.querySelectorAll('.settings-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTheme(btn.dataset.theme);
        panel.querySelectorAll('.settings-theme-btn').forEach(b => {
          b.classList.toggle('bg-primary', b.dataset.theme === btn.dataset.theme);
          b.classList.toggle('text-white', b.dataset.theme === btn.dataset.theme);
          b.classList.toggle('border-primary', b.dataset.theme === btn.dataset.theme);
        });
      });
    });

    // Name save
    panel.querySelector('#settings-name-save')?.addEventListener('click', async () => {
      const val = panel.querySelector('#settings-name-input')?.value.trim();
      if (!val) return;
      this.nameInput.value = val;
      await this.saveWorkspaceName();
    });

    // Empty trash
    panel.querySelector('#settings-empty-trash')?.addEventListener('click', async () => {
      if (!confirm('Empty all trash? This cannot be undone.')) return;
      try {
        await fetch(`/api/trash/empty/${this.workspaceId}`, { method: 'DELETE' });
        showToast('Trash emptied', 'success');
      } catch { showToast('Failed', 'error'); }
    });
  },

  renderTrashPanel() {},
  renderSettingsPanel() {},

  // ── Save Status ──────────────────────────────────────────
  showSaving() {
    this.saveStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Saving...</span>';
    this.saveStatus.classList.remove('opacity-0', 'text-green-500', 'text-red-500');
    this.saveStatus.classList.add('text-[var(--text-muted)]');
    this.saveStatus.style.opacity = '1';
  },

  showSaveSuccess() {
    this.saveStatus.innerHTML = '<i class="fa-solid fa-check"></i> <span>Saved</span>';
    this.saveStatus.classList.remove('text-[var(--text-muted)]', 'text-red-500');
    this.saveStatus.classList.add('text-green-500');
    this.saveStatus.style.opacity = '1';
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => { this.saveStatus.style.opacity = '0'; }, 3000);
  },

  showSaveError() {
    this.saveStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Error</span>';
    this.saveStatus.classList.remove('text-[var(--text-muted)]', 'text-green-500');
    this.saveStatus.classList.add('text-red-500');
    this.saveStatus.style.opacity = '1';
  },

  // ── Helpers ──────────────────────────────────────────────
  getCategoryIcon(cat) {
    const icons = {
      notes: 'fa-solid fa-note-sticky text-yellow-500',
      python: 'fa-brands fa-python text-blue-500',
      java: 'fa-brands fa-java text-red-500',
      cpp: 'fa-solid fa-c text-blue-700',
      sql: 'fa-solid fa-database text-gray-500',
      javascript: 'fa-brands fa-js text-yellow-400',
      html: 'fa-brands fa-html5 text-orange-500',
      css: 'fa-brands fa-css3-alt text-blue-400'
    };
    return icons[cat] || 'fa-solid fa-file';
  },

  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
