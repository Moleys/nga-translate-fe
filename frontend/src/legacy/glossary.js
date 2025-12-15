// Glossary Page - Premium Tailwind UI
const GlossaryPage = {
  key: 'nga_glossary',

  init() {
    this.textarea = document.getElementById('glossary-text');
    this.fileInput = document.getElementById('glossary-file-input');

    this.load();
    this.bindEvents();
    this.updateStats();
  },

  parse(text) {
    const lines = (text || '').split(/\r?\n/);
    const arr = [];
    lines.forEach(line => {
      const t = line.trim();
      if (!t) return;
      const idx = t.indexOf('=');
      if (idx <= 0) return;
      const raw = t.slice(0, idx).trim();
      const mean = t.slice(idx + 1).trim();
      if (raw) arr.push({ raw, mean });
    });
    return arr;
  },

  serialize(arr) {
    if (!Array.isArray(arr)) return '';
    return arr.map(it => `${it.raw}=${it.mean || ''}`).join('\n');
  },

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const arr = JSON.parse(raw);
      this.textarea.value = this.serialize(arr);
    } catch { }
  },

  updateStats() {
    const statsElem = document.getElementById('glossary-stats');
    if (!statsElem) return;

    const entries = this.parse(this.textarea.value);
    statsElem.textContent = `${entries.length} entries`;
  },

  save() {
    try {
      const arr = this.parse(this.textarea.value);
      localStorage.setItem(this.key, JSON.stringify(arr));
      localStorage.setItem('nga_glossary_updated_at', String(Date.now()));
      this.showToast('Glossary saved successfully!', 'success');
      this.updateStats();
    } catch (e) {
      console.error(e);
      this.showToast('Failed to save glossary', 'error');
    }
  },

  export() {
    try {
      const blob = new Blob([this.textarea.value || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'glossary.txt';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      this.showToast('Glossary exported!', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Export failed', 'error');
    }
  },

  importFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      // only keep lines with '='
      this.textarea.value = text.split(/\r?\n/).filter(l => l.includes('=')).join('\n');
      this.updateStats();
      this.showToast('File imported!', 'success');
    };
    reader.readAsText(file);
  },

  clear() {
    if (!confirm('Clear all glossary entries?')) return;
    localStorage.removeItem(this.key);
    this.textarea.value = '';
    this.updateStats();
    this.showToast('Glossary cleared', 'info');
  },

  showToast(message, type = 'info') {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed bottom-6 right-6 z-50 space-y-2';
      document.body.appendChild(toastContainer);
    }

    const colors = {
      success: 'bg-emerald-500',
      error: 'bg-red-500',
      info: 'bg-sky-500'
    };

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-circle-exclamation',
      info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 
                       transform translate-x-full opacity-0 transition-all duration-300`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type]}"></i>
      <span class="font-medium">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  bindEvents() {
    const saveBtn = document.getElementById('glossary-save-btn-page');
    const exportBtn = document.getElementById('glossary-export-btn');
    const importBtn = document.getElementById('glossary-import-btn');
    const clearBtn = document.getElementById('glossary-clear-btn');

    saveBtn?.addEventListener('click', () => this.save());
    exportBtn?.addEventListener('click', () => this.export());
    importBtn?.addEventListener('click', () => this.fileInput?.click());
    clearBtn?.addEventListener('click', () => this.clear());
    this.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.importFromFile(file);
      e.target.value = '';
    });

    // Update stats on input
    this.textarea?.addEventListener('input', () => this.updateStats());
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('glossary-text')) GlossaryPage.init();
});

window.GlossaryPage = GlossaryPage;

export default GlossaryPage;
