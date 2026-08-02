// ============================================================
// VaultPad — File Manager
// Handles all media categories with real API calls
// ============================================================

'use strict';

window.FileManager = {
  files: [],
  category: 'images',
  workspaceId: null,
  lightboxIndex: 0,

  init(workspaceId) {
    this.workspaceId = workspaceId;
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM() {
    this.uploadInput   = document.getElementById('file-upload-input');
    this.dropzone      = document.getElementById('upload-dropzone');
    this.gridContainer = document.getElementById('files-grid-container');
    this.listContainer = document.getElementById('files-list-container');
    this.loadingState  = document.getElementById('files-loading-state');
    this.emptyState    = document.getElementById('files-empty-state');
    this.panel         = document.getElementById('files-panel');
    this.lightbox      = document.getElementById('lightbox-modal');
    this.lightboxImg   = document.getElementById('lightbox-image');
    this.lightboxCap   = document.getElementById('lightbox-caption');
    this.lightboxPrev  = document.getElementById('lightbox-prev');
    this.lightboxNext  = document.getElementById('lightbox-next');
    this.videoModal    = document.getElementById('video-modal');
    this.videoPlayer   = document.getElementById('modal-video-player');
    this.videoTitle    = document.getElementById('video-modal-title');
  },

  bindEvents() {
    // File input change
    this.uploadInput?.addEventListener('change', e => this.handleUpload(Array.from(e.target.files)));

    // Drag and drop on the files panel
    if (this.panel) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        this.panel.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
      });
      this.panel.addEventListener('dragenter', () => this.dropzone?.classList.remove('hidden'));
      this.panel.addEventListener('dragover',  () => this.dropzone?.classList.remove('hidden'));
      this.panel.addEventListener('drop', e => {
        this.dropzone?.classList.add('hidden');
        this.handleUpload(Array.from(e.dataTransfer.files));
      });
    }
    if (this.dropzone) {
      this.dropzone.addEventListener('dragleave', () => this.dropzone.classList.add('hidden'));
    }

    // Lightbox navigation
    this.lightboxPrev?.addEventListener('click', () => this.navigateLightbox(-1));
    this.lightboxNext?.addEventListener('click', () => this.navigateLightbox(1));

    // Close modals on backdrop click
    this.lightbox?.addEventListener('click', e => {
      if (e.target === this.lightbox) this.closeLightbox();
    });
    this.videoModal?.addEventListener('click', e => {
      if (e.target === this.videoModal) this.closeVideo();
    });

    // Close buttons
    document.querySelectorAll('.close-lightbox-btn').forEach(b => b.addEventListener('click', () => this.closeLightbox()));
    document.querySelectorAll('#video-modal .close-modal-btn').forEach(b => b.addEventListener('click', () => this.closeVideo()));

    // Keyboard navigation for lightbox
    document.addEventListener('keydown', e => {
      if (!this.lightbox?.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft')  this.navigateLightbox(-1);
        if (e.key === 'ArrowRight') this.navigateLightbox(1);
        if (e.key === 'Escape')     this.closeLightbox();
      }
      if (!this.videoModal?.classList.contains('hidden') && e.key === 'Escape') {
        this.closeVideo();
      }
    });
  },

  // ── Set Category & Load ──────────────────────────────────
  setCategory(category) {
    this.category = category;
    // Update file input accept attribute
    const acceptMap = {
      images: 'image/*',
      videos: 'video/*',
      audio:  'audio/*',
      pdf:    'application/pdf',
      word:   '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      excel:  '.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'
    };
    if (this.uploadInput) {
      this.uploadInput.accept = acceptMap[category] || '*/*';
      this.uploadInput.value  = '';
    }
    this.loadFiles();
  },

  // ── Load Files from API ──────────────────────────────────
  async loadFiles() {
    this.showLoading();
    try {
      const res  = await fetch(`/api/files/${this.workspaceId}?category=${this.category}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      this.files = data.data || [];
      this.renderFiles();
    } catch {
      this.hideLoading();
      showToast('Failed to load files', 'error');
    }
  },

  showLoading() {
    this.gridContainer?.classList.add('hidden');
    this.listContainer?.classList.add('hidden');
    this.emptyState?.classList.add('hidden');
    this.loadingState?.classList.remove('hidden');
  },

  hideLoading() {
    this.loadingState?.classList.add('hidden');
  },

  renderFiles() {
    this.hideLoading();
    if (!this.files.length) {
      this.emptyState?.classList.remove('hidden');
      this.gridContainer?.classList.add('hidden');
      this.listContainer?.classList.add('hidden');
      return;
    }
    this.emptyState?.classList.add('hidden');

    if (['images', 'videos'].includes(this.category)) {
      this.renderGrid();
    } else {
      this.renderList();
    }
  },

  // ── Image/Video Grid ─────────────────────────────────────
  renderGrid() {
    this.gridContainer?.classList.remove('hidden');
    this.listContainer?.classList.add('hidden');

    this.gridContainer.innerHTML = this.files.map((file, idx) => {
      const preview = this.category === 'images'
        ? `<img src="/uploads/${file.storedName}" alt="${this.esc(file.displayName || file.originalName)}" class="w-full h-40 object-cover border-b border-[var(--border)] transition-transform duration-300 group-hover:scale-105" loading="lazy">`
        : `<div class="w-full h-40 bg-black flex items-center justify-center relative">
             <video class="w-full h-full object-cover opacity-70" preload="metadata" muted>
               <source src="/uploads/${file.storedName}" type="${file.mimeType}">
             </video>
             <div class="absolute inset-0 flex items-center justify-center">
               <i class="fa-solid fa-play text-4xl text-white drop-shadow-lg"></i>
             </div>
           </div>`;
      return `
        <div class="file-card group flex flex-col overflow-hidden" data-id="${file._id}" data-idx="${idx}">
          <div class="overflow-hidden cursor-pointer preview-trigger">${preview}</div>
          <div class="p-3 flex-1 flex flex-col">
            <h4 class="font-medium text-sm truncate mb-1 text-[var(--text-primary)]" title="${this.esc(file.displayName || file.originalName)}">${this.esc(file.displayName || file.originalName)}</h4>
            <div class="flex justify-between items-center text-xs text-[var(--text-muted)] mt-auto">
              <span>${file.formattedSize || this.formatSize(file.fileSize)}</span>
              <div class="flex gap-2">
                <a href="/api/files/${file._id}/download" class="hover:text-primary transition-colors" title="Download"><i class="fa-solid fa-download"></i></a>
                <button class="hover:text-yellow-500 transition-colors rename-btn" title="Rename"><i class="fa-solid fa-pencil"></i></button>
                <button class="hover:text-red-500 transition-colors delete-btn" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.bindGridEvents();
  },

  // ── PDF / Audio / Word / Excel List ──────────────────────
  renderList() {
    this.listContainer?.classList.remove('hidden');
    this.gridContainer?.classList.add('hidden');

    const iconMap = {
      pdf:   'fa-file-pdf text-red-500',
      excel: 'fa-file-excel text-green-600',
      word:  'fa-file-word text-blue-600',
      audio: 'fa-music text-pink-500'
    };
    const icon = iconMap[this.category] || 'fa-file text-gray-500';

    this.listContainer.innerHTML = this.files.map((file, idx) => {
      const audioPlayer = this.category === 'audio'
        ? `<audio controls src="/uploads/${file.storedName}" class="w-full h-8 mt-2" preload="none"></audio>`
        : '';
      const pdfBtn = this.category === 'pdf'
        ? `<button class="w-8 h-8 rounded-md bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-primary transition-colors flex items-center justify-center preview-trigger" title="Preview" data-idx="${idx}">
             <i class="fa-solid fa-eye text-sm"></i>
           </button>` : '';

      return `
        <div class="list-item" data-id="${file._id}" data-idx="${idx}">
          <div class="w-10 h-10 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-2xl shrink-0 mr-4">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-sm truncate text-[var(--text-primary)]" title="${this.esc(file.displayName || file.originalName)}">${this.esc(file.displayName || file.originalName)}</h4>
            <div class="text-xs text-[var(--text-muted)] flex gap-3 mt-0.5">
              <span>${file.formattedSize || this.formatSize(file.fileSize)}</span>
              <span>${new Date(file.uploadDate).toLocaleDateString()}</span>
              <span class="uppercase font-mono">${file.extension}</span>
            </div>
            ${audioPlayer}
          </div>
          <div class="flex gap-1 shrink-0 ml-3">
            ${pdfBtn}
            <a href="/api/files/${file._id}/download" class="w-8 h-8 rounded-md bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-primary transition-colors flex items-center justify-center" title="Download">
              <i class="fa-solid fa-download text-sm"></i>
            </a>
            <button class="w-8 h-8 rounded-md bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-yellow-500 transition-colors flex items-center justify-center rename-btn" title="Rename">
              <i class="fa-solid fa-pencil text-sm"></i>
            </button>
            <button class="w-8 h-8 rounded-md bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-red-500 transition-colors flex items-center justify-center delete-btn" title="Move to trash">
              <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.bindListEvents();
  },

  bindGridEvents() {
    this.gridContainer?.querySelectorAll('.file-card').forEach(card => {
      const id  = card.dataset.id;
      const idx = parseInt(card.dataset.idx);
      const file = this.files[idx];

      card.querySelector('.preview-trigger')?.addEventListener('click', () => {
        if (this.category === 'images') this.openLightbox(idx);
        else if (this.category === 'videos') this.openVideo(file);
      });
      card.querySelector('.rename-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        this.renameFile(id, file.displayName || file.originalName);
      });
      card.querySelector('.delete-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        this.deleteFile(id, card);
      });
    });
  },

  bindListEvents() {
    this.listContainer?.querySelectorAll('.list-item').forEach(item => {
      const id  = item.dataset.id;
      const idx = parseInt(item.dataset.idx);
      const file = this.files[idx];

      item.querySelector('.preview-trigger')?.addEventListener('click', () => {
        this.openPdfPreview(file);
      });
      item.querySelector('.rename-btn')?.addEventListener('click', () => {
        this.renameFile(id, file.displayName || file.originalName);
      });
      item.querySelector('.delete-btn')?.addEventListener('click', () => {
        this.deleteFile(id, item);
      });
    });
  },

  // ── Upload ───────────────────────────────────────────────
  async handleUpload(fileList) {
    if (!fileList?.length) return;

    for (const file of fileList) {
      showToast(`Uploading ${file.name}...`, 'info');
      const formData = new FormData();
      formData.append('workspaceId', this.workspaceId);
      formData.append('category',    this.category);
      formData.append('file',        file);

      try {
        const res  = await fetch(`/api/files/upload?category=${this.category}`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Upload failed');

        this.files.unshift(data.data);
        showToast(`${file.name} uploaded!`, 'success');
      } catch (err) {
        showToast(err.message || 'Upload failed', 'error');
      }
    }

    if (this.uploadInput) this.uploadInput.value = '';
    this.renderFiles();
  },

  // ── Delete ───────────────────────────────────────────────
  async deleteFile(id, el) {
    if (!confirm('Move this file to trash?')) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      this.files = this.files.filter(f => f._id !== id);
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';
      setTimeout(() => this.renderFiles(), 300);
      showToast('Moved to trash', 'info');
    } catch { showToast('Delete failed', 'error'); }
  },

  // ── Rename ───────────────────────────────────────────────
  async renameFile(id, currentName) {
    const newName = prompt('Enter new name:', currentName);
    if (!newName || newName === currentName) return;
    try {
      const res  = await fetch(`/api/files/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newName })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const idx = this.files.findIndex(f => f._id === id);
      if (idx !== -1) this.files[idx].displayName = data.data.displayName;
      this.renderFiles();
      showToast('Renamed successfully', 'success');
    } catch { showToast('Rename failed', 'error'); }
  },

  // ── Image Lightbox ───────────────────────────────────────
  openLightbox(idx) {
    this.lightboxIndex = idx;
    const imageFiles = this.files.filter(f => f.category === 'images' || this.category === 'images');
    const file = this.files[idx];
    if (!file) return;

    this.lightboxImg.src = `/uploads/${file.storedName}`;
    this.lightboxCap.textContent = file.displayName || file.originalName;

    this.lightbox.classList.remove('hidden');
    requestAnimationFrame(() => this.lightbox.classList.remove('opacity-0'));

    const total = this.files.length;
    if (this.lightboxPrev) this.lightboxPrev.style.display = total > 1 ? 'block' : 'none';
    if (this.lightboxNext) this.lightboxNext.style.display = total > 1 ? 'block' : 'none';
  },

  navigateLightbox(dir) {
    this.lightboxIndex = (this.lightboxIndex + dir + this.files.length) % this.files.length;
    const file = this.files[this.lightboxIndex];
    if (file) {
      this.lightboxImg.src = `/uploads/${file.storedName}`;
      this.lightboxCap.textContent = file.displayName || file.originalName;
    }
  },

  closeLightbox() {
    this.lightbox.classList.add('opacity-0');
    setTimeout(() => { this.lightbox.classList.add('hidden'); this.lightboxImg.src = ''; }, 300);
  },

  // ── Video Modal ──────────────────────────────────────────
  openVideo(file) {
    const src = this.videoPlayer.querySelector('source');
    if (src) { src.src = `/uploads/${file.storedName}`; src.type = file.mimeType; }
    else this.videoPlayer.src = `/uploads/${file.storedName}`;

    this.videoTitle.textContent = file.displayName || file.originalName;
    this.videoModal.classList.remove('hidden');
    requestAnimationFrame(() => this.videoModal.classList.remove('opacity-0'));
    this.videoPlayer.load();
    this.videoPlayer.play().catch(() => {});
  },

  closeVideo() {
    this.videoPlayer.pause();
    this.videoModal.classList.add('opacity-0');
    setTimeout(() => {
      this.videoModal.classList.add('hidden');
      this.videoPlayer.src = '';
    }, 300);
  },


  // ── PDF Preview (blob URL — bypasses X-Frame-Options completely) ──
  async openPdfPreview(file) {
    const fileName = this.esc(file.displayName || file.originalName);

    // Create modal with loading state first
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-[var(--bg-card)] w-full max-w-5xl h-[88vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-[var(--border)]">
        <div class="px-4 py-3 bg-[var(--bg-sidebar)] flex justify-between items-center border-b border-[var(--border)] shrink-0">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-file-pdf text-red-500"></i>
            <span class="font-semibold text-[var(--text-primary)] text-sm truncate max-w-[280px]">${fileName}</span>
          </div>
          <div class="flex gap-2">
            <a href="/api/files/${file._id}/download" download class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
              <i class="fa-solid fa-download text-xs"></i> Download
            </a>
            <button class="px-3 py-1.5 bg-[var(--bg-main)] hover:bg-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-colors border border-[var(--border)] close-pdf">
              <i class="fa-solid fa-xmark"></i> Close
            </button>
          </div>
        </div>
        <div id="pdf-loader" class="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-500"></i>
          <span class="text-sm">Loading PDF…</span>
        </div>
        <iframe id="pdf-frame" class="flex-1 w-full border-0 hidden" title="PDF Preview"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    const close = () => { modal.remove(); };
    modal.querySelector('.close-pdf')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    // Fetch as blob → create local URL (no X-Frame-Options applies to blob:)
    try {
      const resp = await fetch(`/api/files/${file._id}/download`);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      const frame  = modal.querySelector('#pdf-frame');
      const loader = modal.querySelector('#pdf-loader');

      frame.src = blobUrl;
      frame.onload = () => {
        loader.remove();
        frame.classList.remove('hidden');
      };
      // Clean up blob URL when modal is removed
      const obs = new MutationObserver(() => {
        if (!document.body.contains(modal)) {
          URL.revokeObjectURL(blobUrl);
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true });
    } catch (err) {
      modal.querySelector('#pdf-loader').innerHTML = `
        <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-500"></i>
        <p class="text-sm text-[var(--text-secondary)]">Could not load PDF preview.</p>
        <a href="/api/files/${file._id}/download" class="text-sm text-blue-500 hover:underline font-medium">
          <i class="fa-solid fa-download mr-1"></i>Download instead
        </a>`;
    }
  },


  // ── Helpers ──────────────────────────────────────────────
  formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }
};
