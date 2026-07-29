// ============================================================
// VaultPad — Global Search
// Real API calls with debounce, result highlighting, navigation
// ============================================================

'use strict';

window.SearchManager = {
  workspaceId: null,
  searchTimer: null,

  init(workspaceId) {
    this.workspaceId = workspaceId;
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM() {
    this.modal          = document.getElementById('search-modal');
    this.modalContent   = document.getElementById('search-modal-content');
    this.input          = document.getElementById('global-search-input');
    this.resultsEl      = document.getElementById('search-results-container');
    this.placeholder    = document.getElementById('search-placeholder');
    this.loadingEl      = document.getElementById('search-loading');
    this.btn            = document.getElementById('search-btn');
  },

  bindEvents() {
    this.btn?.addEventListener('click', () => this.open());

    // Close on backdrop click
    this.modal?.addEventListener('click', e => {
      if (e.target === this.modal) this.close();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && !this.modal?.classList.contains('hidden')) {
        this.close();
      }
    });

    // Debounced input
    this.input?.addEventListener('input', e => {
      const q = e.target.value.trim();
      clearTimeout(this.searchTimer);
      if (!q) { this.showPlaceholder(); return; }
      this.searchTimer = setTimeout(() => this.search(q), 300);
    });
  },

  open() {
    if (!this.modal) return;
    this.modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.modal.classList.remove('opacity-0');
      this.modalContent?.classList.remove('scale-95');
    });
    this.input.value = '';
    this.showPlaceholder();
    setTimeout(() => this.input?.focus(), 100);
  },

  close() {
    this.modal?.classList.add('opacity-0');
    this.modalContent?.classList.add('scale-95');
    setTimeout(() => this.modal?.classList.add('hidden'), 200);
    clearTimeout(this.searchTimer);
  },

  showPlaceholder() {
    if (this.loadingEl)  this.loadingEl.classList.add('hidden');
    if (this.placeholder) this.placeholder.classList.remove('hidden');
    if (this.resultsEl) {
      // Clear results but keep placeholder child
      Array.from(this.resultsEl.children).forEach(c => {
        if (c !== this.placeholder && c !== this.loadingEl) c.remove();
      });
      this.placeholder.classList.remove('hidden');
    }
  },

  showLoading() {
    if (this.placeholder) this.placeholder.classList.add('hidden');
    if (this.loadingEl)   this.loadingEl.classList.remove('hidden');
  },

  async search(query) {
    this.showLoading();
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&workspaceId=${this.workspaceId}`);
      const data = await res.json();
      this.loadingEl?.classList.add('hidden');

      if (!data.success) throw new Error(data.message);
      this.renderResults(data.data || { notes: [], files: [] }, query);
    } catch (err) {
      this.loadingEl?.classList.add('hidden');
      this.renderError(err.message || 'Search failed');
    }
  },

  highlight(text, query) {
    if (!query || !text) return this.esc(text || '');
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.esc(text).replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="bg-yellow-200 dark:bg-yellow-700/50 rounded px-0.5">$1</mark>'
    );
  },

  renderResults({ notes = [], files = [] }, query) {
    // Remove old results (keep placeholder & loading)
    Array.from(this.resultsEl.children).forEach(c => {
      if (c !== this.placeholder && c !== this.loadingEl) c.remove();
    });

    if (!notes.length && !files.length) {
      const empty = document.createElement('div');
      empty.className = 'py-12 text-center text-[var(--text-muted)]';
      empty.innerHTML = `
        <i class="fa-solid fa-magnifying-glass text-3xl mb-3 opacity-30"></i>
        <p>No results for "<span class="text-[var(--text-primary)] font-medium">${this.esc(query)}</span>"</p>
      `;
      this.resultsEl.appendChild(empty);
      return;
    }

    const icons = {
      notes: 'fa-note-sticky text-yellow-500', python: 'fa-brands fa-python text-blue-500',
      java: 'fa-brands fa-java text-red-500',  cpp: 'fa-c text-blue-700',
      sql: 'fa-database text-gray-500',         javascript: 'fa-brands fa-js text-yellow-400',
      html: 'fa-brands fa-html5 text-orange-500', css: 'fa-brands fa-css3-alt text-blue-400'
    };
    const fileIcons = {
      images: 'fa-image text-green-500', videos: 'fa-video text-purple-500',
      pdf: 'fa-file-pdf text-red-500',   excel: 'fa-file-excel text-green-600',
      word: 'fa-file-word text-blue-600', audio: 'fa-music text-pink-500'
    };

    if (notes.length) {
      const section = document.createElement('div');
      section.className = 'mb-4';
      section.innerHTML = `
        <div class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
          <i class="fa-solid fa-file-lines"></i> Notes & Code
          <span class="bg-[var(--bg-main)] px-1.5 py-0.5 rounded text-[10px]">${notes.length}</span>
        </div>
        <div class="space-y-1">
          ${notes.slice(0, 6).map(note => `
            <div class="p-3 rounded-lg cursor-pointer transition-all flex items-start gap-3 hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border)] search-result-item"
              data-category="${note.category}" data-id="${note._id}">
              <i class="fa-solid ${icons[note.category] || 'fa-file'} mt-0.5 text-sm"></i>
              <div class="min-w-0 flex-1">
                <h4 class="font-medium text-sm text-[var(--text-primary)] truncate">${this.highlight(note.title || 'Untitled', query)}</h4>
                <p class="text-xs text-[var(--text-secondary)] mt-0.5 truncate">${this.highlight((note.content || '').substring(0, 100), query)}</p>
                <span class="text-[10px] text-[var(--text-muted)] font-mono uppercase mt-1 inline-block">${note.category}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      this.resultsEl.appendChild(section);
    }

    if (files.length) {
      const section = document.createElement('div');
      section.innerHTML = `
        <div class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
          <i class="fa-solid fa-folder"></i> Files
          <span class="bg-[var(--bg-main)] px-1.5 py-0.5 rounded text-[10px]">${files.length}</span>
        </div>
        <div class="space-y-1">
          ${files.slice(0, 6).map(file => `
            <div class="p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 hover:bg-[var(--bg-main)] border border-transparent hover:border-[var(--border)] search-result-item"
              data-category="${file.category}" data-id="${file._id}">
              <i class="fa-solid ${fileIcons[file.category] || 'fa-file'} text-sm"></i>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm text-[var(--text-primary)] truncate">${this.highlight(file.displayName || file.originalName, query)}</h4>
                <span class="text-xs text-[var(--text-muted)]">${file.formattedSize || ''} · ${file.extension}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      this.resultsEl.appendChild(section);
    }

    // Bind navigation clicks
    this.resultsEl.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const category = el.dataset.category;
        const id       = el.dataset.id;
        this.close();
        if (window.WorkspaceManager) {
          window.WorkspaceManager.switchTab(category);
          if (window.WorkspaceManager.TEXT_CATEGORIES.includes(category)) {
            setTimeout(() => window.EditorManager?.selectNoteById(id), 350);
          }
        }
      });
    });
  },

  renderError(message) {
    Array.from(this.resultsEl.children).forEach(c => {
      if (c !== this.placeholder && c !== this.loadingEl) c.remove();
    });
    const err = document.createElement('div');
    err.className = 'py-8 text-center text-red-500 text-sm';
    err.textContent = message;
    this.resultsEl.appendChild(err);
  },

  esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
};
