// ============================================================
// VaultPad — Editor Manager
// Handles notes & code categories with full real API calls
// ============================================================

'use strict';

window.EditorManager = {
  notes: [],
  currentNote: null,
  isDirty: false,
  saveTimeout: null,
  category: 'notes',
  workspaceId: null,

  configs: {
    notes:      { lang: null,         showGutter: false, monospace: false },
    python:     { lang: 'python',     showGutter: true,  monospace: true  },
    java:       { lang: 'java',       showGutter: true,  monospace: true  },
    cpp:        { lang: 'cpp',        showGutter: true,  monospace: true  },
    sql:        { lang: 'sql',        showGutter: true,  monospace: true  },
    javascript: { lang: 'javascript', showGutter: true,  monospace: true  },
    html:       { lang: 'xml',        showGutter: true,  monospace: true  },
    css:        { lang: 'css',        showGutter: true,  monospace: true  }
  },

  init(workspaceId) {
    this.workspaceId = workspaceId;
    this.cacheDOM();
    this.bindEvents();
    this.bindVersionHistory();
  },

  cacheDOM() {
    this.listContainer = document.getElementById('note-list-container');
    this.searchInput   = document.getElementById('list-search-input');
    this.newNoteBtn    = document.getElementById('new-note-btn');
    this.emptyState    = document.getElementById('editor-empty-state');
    this.activeState   = document.getElementById('editor-active-state');
    this.titleInput    = document.getElementById('note-title-input');
    this.contentInput  = document.getElementById('note-content-input');
    this.gutter        = document.getElementById('editor-gutter');
    this.statsEl       = document.getElementById('note-stats');
    this.langBadge     = document.getElementById('language-badge');
    this.btnPin        = document.getElementById('btn-pin');
    this.btnFav        = document.getElementById('btn-favorite');
    this.btnDel        = document.getElementById('btn-delete-note');
    this.btnRead       = document.getElementById('btn-reading-mode');
    this.btnCopy       = document.getElementById('btn-copy-code');
    this.btnHistory    = document.getElementById('btn-history');
    this.readingOverlay   = document.getElementById('reading-mode-overlay');
    this.readingClose     = document.getElementById('close-reading-mode');
    this.readingTitle     = document.getElementById('reading-mode-title');
    this.readingContent   = document.getElementById('reading-mode-content');
    this.readingMeta      = document.getElementById('reading-mode-meta');
    this.versionDrawer    = document.getElementById('version-history-drawer');
    this.versionList      = document.getElementById('version-list-container');
    this.versionPreview   = document.getElementById('version-preview-modal');
    this.versionPreviewDate    = document.getElementById('version-preview-date');
    this.versionPreviewTitle   = document.getElementById('version-preview-title');
    this.versionPreviewContent = document.getElementById('version-preview-content');
    this.restoreVersionBtn     = document.getElementById('restore-version-btn');
  },

  bindEvents() {
    this.newNoteBtn?.addEventListener('click', () => this.createNewNote());
    this.searchInput?.addEventListener('input', e => this.filterList(e.target.value));

    this.titleInput?.addEventListener('input', () => this.handleInput());
    this.contentInput?.addEventListener('input', () => {
      this.handleInput();
      this.updateStats();
      this.updateGutter();
    });
    this.contentInput?.addEventListener('scroll', () => {
      if (this.gutter) this.gutter.scrollTop = this.contentInput.scrollTop;
    });

    this.btnPin?.addEventListener('click', () => this.togglePin());
    this.btnFav?.addEventListener('click', () => this.toggleFavorite());
    this.btnDel?.addEventListener('click', () => this.deleteCurrentNote());
    this.btnCopy?.addEventListener('click', () => this.copyCode());
    this.btnRead?.addEventListener('click', () => this.openReadingMode());
    this.btnHistory?.addEventListener('click', () => this.openVersionHistory());

    this.readingClose?.addEventListener('click', () => this.closeReadingMode());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (this.readingOverlay && !this.readingOverlay.classList.contains('hidden')) this.closeReadingMode();
        if (this.versionDrawer && !this.versionDrawer.classList.contains('translate-x-full')) this.closeVersionHistory();
        if (this.versionPreview && !this.versionPreview.classList.contains('hidden')) this.closeVersionPreview();
      }
    });
  },

  bindVersionHistory() {
    // Close drawer buttons
    document.querySelectorAll('.close-drawer-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeVersionHistory());
    });
    // Close version preview modal
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeVersionPreview());
    });
  },

  // ── Category Switching ──────────────────────────────────
  async setCategory(category) {
    this.category = category;
    this.config = this.configs[category] || this.configs.notes;

    // Configure editor appearance
    if (this.config.monospace) {
      this.contentInput?.classList.add('code-editor-font', 'editor-dark-theme');
      if (this.langBadge) {
        this.langBadge.textContent = category.toUpperCase();
        this.langBadge.classList.remove('hidden');
      }
      this.btnCopy?.classList.remove('hidden');
    } else {
      this.contentInput?.classList.remove('code-editor-font', 'editor-dark-theme');
      this.langBadge?.classList.add('hidden');
      this.btnCopy?.classList.add('hidden');
    }

    this.gutter?.classList.toggle('hidden', !this.config.showGutter);

    if (this.newNoteBtn) {
      this.newNoteBtn.innerHTML = `<i class="fa-solid fa-plus"></i> New ${category === 'notes' ? 'Note' : 'Snippet'}`;
    }

    await this.loadNotes();
  },

  // ── Load Notes from API ─────────────────────────────────
  async loadNotes() {
    this.listContainer.innerHTML = '<div class="text-center py-10 text-[var(--text-muted)]"><i class="fa-solid fa-circle-notch fa-spin text-2xl"></i></div>';
    this.showEmptyState();

    try {
      const res  = await fetch(`/api/notes/${this.workspaceId}?category=${this.category}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      this.notes = data.data || [];
      this.renderList();

      if (this.notes.length) {
        this.selectNote(this.notes[0]);
      } else {
        this.showEmptyState();
      }
    } catch (err) {
      this.listContainer.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Failed to load notes</div>';
    }
  },

  renderList(filter = '') {
    if (!this.notes.length) {
      this.listContainer.innerHTML = '<div class="text-center text-[var(--text-muted)] text-sm py-10">No items yet</div>';
      return;
    }

    const filtered = filter
      ? this.notes.filter(n =>
          (n.title || '').toLowerCase().includes(filter) ||
          (n.content || '').toLowerCase().includes(filter)
        )
      : this.notes;

    const sorted = [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    this.listContainer.innerHTML = sorted.map(note => `
      <div class="note-item ${this.currentNote && this.currentNote._id === note._id ? 'active' : ''}" data-id="${note._id}">
        <div class="flex items-start justify-between">
          <h4 class="font-medium text-sm text-[var(--text-primary)] truncate pr-2">${this.escapeHtml(note.title || 'Untitled')}</h4>
          <div class="flex gap-1 shrink-0 mt-0.5">
            ${note.isPinned   ? '<i class="fa-solid fa-thumbtack text-xs text-primary"></i>' : ''}
            ${note.isFavorite ? '<i class="fa-solid fa-star text-xs text-yellow-500"></i>'  : ''}
          </div>
        </div>
        <div class="text-[11px] text-[var(--text-muted)] mt-1 flex justify-between">
          <span>${new Date(note.updatedAt).toLocaleDateString()}</span>
          <span>${note.charCount || 0} chars</span>
        </div>
      </div>
    `).join('');

    this.listContainer.querySelectorAll('.note-item').forEach(el => {
      el.addEventListener('click', () => {
        const note = this.notes.find(n => n._id === el.dataset.id);
        if (note) this.selectNote(note);
      });
    });
  },

  filterList(query) {
    this.renderList(query.toLowerCase());
  },

  // ── Select / Display Note ────────────────────────────────
  selectNote(note) {
    if (this.isDirty && this.currentNote) this.forceSave();

    this.currentNote = note;
    this.emptyState?.classList.add('hidden');
    this.activeState?.classList.remove('hidden');

    this.titleInput.value   = note.title   || '';
    this.contentInput.value = note.content || '';

    this.updatePinButton(note.isPinned);
    this.updateFavButton(note.isFavorite);
    this.updateStats();
    this.updateGutter();

    // Re-render list to update active class
    const all = this.listContainer.querySelectorAll('.note-item');
    all.forEach(el => el.classList.toggle('active', el.dataset.id === note._id));

    if (this.category === 'notes') this.contentInput.focus();
  },

  selectNoteById(id) {
    const note = this.notes.find(n => n._id === id);
    if (note) this.selectNote(note);
  },

  showEmptyState() {
    this.currentNote = null;
    this.emptyState?.classList.remove('hidden');
    this.activeState?.classList.add('hidden');
  },

  // ── Create Note ──────────────────────────────────────────
  async createNewNote() {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: this.workspaceId,
          category: this.category,
          title: '',
          content: ''
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      this.notes.unshift(data.data);
      this.renderList();
      this.selectNote(data.data);
      this.titleInput.focus();
    } catch {
      showToast('Failed to create note', 'error');
    }
  },

  // ── Auto-Save with Debounce ──────────────────────────────
  handleInput() {
    if (!this.currentNote) return;
    this.isDirty = true;
    window.WorkspaceManager?.showSaving();
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.forceSave(), 1500);
  },

  async forceSave() {
    if (!this.isDirty || !this.currentNote) return;
    clearTimeout(this.saveTimeout);
    this.isDirty = false;

    const title   = this.titleInput.value;
    const content = this.contentInput.value;

    // Update local state immediately
    this.currentNote.title   = title;
    this.currentNote.content = content;
    this.currentNote.updatedAt = new Date().toISOString();

    try {
      const res = await fetch(`/api/notes/${this.currentNote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Update with server response
      const idx = this.notes.findIndex(n => n._id === this.currentNote._id);
      if (idx !== -1) this.notes[idx] = { ...this.notes[idx], ...data.data.note };

      this.renderList();
      window.WorkspaceManager?.showSaveSuccess();
      window.WorkspaceManager?.refreshSidebar();
    } catch {
      window.WorkspaceManager?.showSaveError();
      showToast('Auto-save failed', 'error');
    }
  },

  // ── Pin / Favorite ───────────────────────────────────────
  async togglePin() {
    if (!this.currentNote) return;
    try {
      const res = await fetch(`/api/notes/${this.currentNote._id}/pin`, { method: 'PATCH' });
      const data = await res.json();
      if (!data.success) throw new Error();

      this.currentNote.isPinned = data.data.isPinned;
      const idx = this.notes.findIndex(n => n._id === this.currentNote._id);
      if (idx !== -1) this.notes[idx].isPinned = data.data.isPinned;

      this.updatePinButton(data.data.isPinned);
      this.renderList();
      window.WorkspaceManager?.refreshSidebar();
      showToast(data.data.isPinned ? 'Note pinned' : 'Note unpinned', 'success');
    } catch { showToast('Failed to toggle pin', 'error'); }
  },

  async toggleFavorite() {
    if (!this.currentNote) return;
    try {
      const res = await fetch(`/api/notes/${this.currentNote._id}/favorite`, { method: 'PATCH' });
      const data = await res.json();
      if (!data.success) throw new Error();

      this.currentNote.isFavorite = data.data.isFavorite;
      const idx = this.notes.findIndex(n => n._id === this.currentNote._id);
      if (idx !== -1) this.notes[idx].isFavorite = data.data.isFavorite;

      this.updateFavButton(data.data.isFavorite);
      this.renderList();
      window.WorkspaceManager?.refreshSidebar();
      showToast(data.data.isFavorite ? 'Added to favorites' : 'Removed from favorites', 'success');
    } catch { showToast('Failed to toggle favorite', 'error'); }
  },

  // ── Delete ───────────────────────────────────────────────
  async deleteCurrentNote() {
    if (!this.currentNote || !confirm('Move this note to trash?')) return;
    try {
      const res = await fetch(`/api/notes/${this.currentNote._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error();

      this.notes = this.notes.filter(n => n._id !== this.currentNote._id);
      this.showEmptyState();
      this.renderList();
      showToast('Moved to trash', 'info');
      window.WorkspaceManager?.refreshSidebar();
    } catch { showToast('Delete failed', 'error'); }
  },

  // ── Version History ──────────────────────────────────────
  async openVersionHistory() {
    if (!this.currentNote) return;
    this._previewingVersionNumber = null;

    this.versionDrawer.classList.remove('translate-x-full');

    try {
      const res = await fetch(`/api/notes/${this.currentNote._id}/versions`);
      const data = await res.json();
      const versions = data.data || [];

      if (!versions.length) {
        this.versionList.innerHTML = '<div class="text-center py-8 text-[var(--text-muted)] text-sm">No version history yet.<br><span class="text-xs">Versions are saved when meaningful changes are made.</span></div>';
        return;
      }

      this.versionList.innerHTML = versions.map(v => `
        <div class="version-item p-3 rounded-lg border border-[var(--border)] hover:border-primary cursor-pointer transition-all bg-[var(--bg-main)] hover:bg-blue-50 dark:hover:bg-blue-900/10 mb-2" data-ver="${v.versionNumber}">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-primary">Version ${v.versionNumber}</span>
            <span class="text-xs text-[var(--text-muted)]">${v.charCount || 0} chars</span>
          </div>
          <div class="text-xs text-[var(--text-secondary)]">${new Date(v.savedAt).toLocaleString()}</div>
        </div>
      `).join('');

      this._versions = versions;
      this.versionList.querySelectorAll('.version-item').forEach(el => {
        el.addEventListener('click', () => {
          const ver = this._versions.find(v => v.versionNumber === Number(el.dataset.ver));
          if (ver) this.previewVersion(ver);
        });
      });
    } catch {
      this.versionList.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Failed to load versions</div>';
    }
  },

  closeVersionHistory() {
    this.versionDrawer?.classList.add('translate-x-full');
  },

  previewVersion(ver) {
    this._previewingVersionNumber = ver.versionNumber;
    this.versionPreviewDate.textContent = new Date(ver.savedAt).toLocaleString();
    this.versionPreviewTitle.textContent = this.currentNote?.title || 'Untitled';
    this.versionPreviewContent.textContent = ver.content;

    this.versionPreview.classList.remove('hidden');
    requestAnimationFrame(() => this.versionPreview.classList.remove('opacity-0'));

    this.restoreVersionBtn.onclick = () => this.restoreVersion(ver.versionNumber);
  },

  closeVersionPreview() {
    this.versionPreview.classList.add('opacity-0');
    setTimeout(() => this.versionPreview.classList.add('hidden'), 200);
  },

  async restoreVersion(versionNumber) {
    if (!this.currentNote) return;
    try {
      const res = await fetch(`/api/notes/${this.currentNote._id}/restore-version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber })
      });
      const data = await res.json();
      if (!data.success) throw new Error();

      this.currentNote = { ...this.currentNote, ...data.data };
      this.contentInput.value = data.data.content;
      this.titleInput.value   = data.data.title;
      this.updateStats();
      this.updateGutter();
      this.closeVersionPreview();
      this.closeVersionHistory();
      showToast('Version restored successfully', 'success');
    } catch { showToast('Restore failed', 'error'); }
  },

  // ── Reading Mode ─────────────────────────────────────────
  openReadingMode() {
    if (!this.currentNote) return;
    this.readingTitle.textContent   = this.currentNote.title || 'Untitled';
    this.readingContent.textContent = this.contentInput.value;
    this.readingMeta.innerHTML      = `<i class="${window.WorkspaceManager?.getCategoryIcon(this.category) || 'fa-solid fa-file'}"></i> <span class="ml-1">${this.category.toUpperCase()}</span> &bull; <span>${this.statsEl?.textContent || ''}</span>`;

    this.readingOverlay.classList.remove('hidden');
    requestAnimationFrame(() => this.readingOverlay.classList.remove('opacity-0'));
    document.body.style.overflow = 'hidden';
  },

  closeReadingMode() {
    this.readingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      this.readingOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  },

  // ── Copy Code ────────────────────────────────────────────
  copyCode() {
    navigator.clipboard.writeText(this.contentInput.value)
      .then(() => showToast('Copied to clipboard!', 'success'))
      .catch(() => showToast('Copy failed', 'error'));
  },

  // ── UI Helpers ───────────────────────────────────────────
  updateStats() {
    if (!this.statsEl) return;
    const text  = this.contentInput.value;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    this.statsEl.textContent = `${words} words | ${text.length} chars`;
  },

  updateGutter() {
    if (!this.gutter || this.gutter.classList.contains('hidden')) return;
    const count = this.contentInput.value.split('\n').length;
    this.gutter.innerHTML = Array.from({ length: Math.max(count, 1) }, (_, i) => `<div>${i + 1}</div>`).join('');
  },

  updatePinButton(isPinned) {
    if (!this.btnPin) return;
    this.btnPin.style.color = isPinned ? 'var(--primary)' : '';
    this.btnPin.title = isPinned ? 'Unpin note' : 'Pin note';
  },

  updateFavButton(isFavorite) {
    if (!this.btnFav) return;
    const icon = this.btnFav.querySelector('i');
    if (icon) icon.className = isFavorite ? 'fa-solid fa-star' : 'fa-regular fa-star';
    this.btnFav.style.color = isFavorite ? '#EAB308' : '';
  },

  escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
