// Bookmarks Page - Display bookmarked threads
const BookmarksPage = {
    bookmarks: [],

    init() {
        // Load bookmarks from localStorage
        this.loadBookmarks();

        // Translate and render bookmarks
        this.translateAndRenderBookmarks();

        // Setup clear button
        this.setupClearButton();
    },

    loadBookmarks() {
        const stored = localStorage.getItem('nga_thread_bookmarks');
        this.bookmarks = stored ? JSON.parse(stored) : [];
    },

    saveBookmarks() {
        localStorage.setItem('nga_thread_bookmarks', JSON.stringify(this.bookmarks));
    },

    clearBookmarks() {
        if (confirm('Are you sure you want to clear all bookmarks?')) {
            this.bookmarks = [];
            this.saveBookmarks();
            this.translateAndRenderBookmarks();
        }
    },

    removeBookmark(tid) {
        const index = this.bookmarks.findIndex(b => b.tid === tid);
        if (index >= 0) {
            this.bookmarks.splice(index, 1);
            this.saveBookmarks();
            this.translateAndRenderBookmarks();
        }
    },

    setupClearButton() {
        const btn = document.getElementById('clear-bookmarks-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.clearBookmarks();
            });
        }
    },

    async translateAndRenderBookmarks() {
        // Check if translation is enabled
        if (typeof TranslationUtil === 'undefined' || !TranslationUtil.enabled) {
            this.renderBookmarks(this.bookmarks);
            return;
        }

        if (this.bookmarks.length === 0) {
            this.renderBookmarks([]);
            return;
        }

        try {
            // Clone bookmarks to avoid modifying original raw data
            const translatedBookmarks = JSON.parse(JSON.stringify(this.bookmarks));

            // Collect all texts to translate
            let textsToTranslate = [];
            let textMap = [];

            translatedBookmarks.forEach((bookmark, idx) => {
                if (bookmark.subject) {
                    textMap.push({ type: 'subject', idx, index: textsToTranslate.length });
                    textsToTranslate.push(bookmark.subject);
                }
                if (bookmark.author) {
                    textMap.push({ type: 'author', idx, index: textsToTranslate.length });
                    textsToTranslate.push(bookmark.author);
                }
                if (bookmark.forumName) {
                    textMap.push({ type: 'forumName', idx, index: textsToTranslate.length });
                    textsToTranslate.push(bookmark.forumName);
                }
            });

            if (textsToTranslate.length === 0) {
                this.renderBookmarks(translatedBookmarks);
                return;
            }

            // Translate all texts
            const translated = await TranslationUtil.translateVietphrase(textsToTranslate);

            // Apply translations
            textMap.forEach(mapping => {
                const translatedText = translated[mapping.index]?.translations?.[0]?.text || textsToTranslate[mapping.index];
                const formattedText = TranslationUtil.formatTranslatedText(translatedText);
                translatedBookmarks[mapping.idx][mapping.type] = formattedText;
            });

            // Render with translated data
            this.renderBookmarks(translatedBookmarks);
        } catch (error) {
            console.error('[Bookmarks] Translation failed:', error);
            // Fallback: render raw data
            this.renderBookmarks(this.bookmarks);
        }
    },

    renderBookmarks(bookmarksToRender) {
        const container = document.getElementById('thread-bookmarks-list');
        const emptyState = document.getElementById('empty-bookmarks-state');
        const countElem = document.getElementById('bookmarks-count');

        if (!container || !emptyState) return;

        // Use original bookmarks for count
        const bookmarkCount = this.bookmarks.length;

        // Update count
        if (countElem) {
            countElem.textContent = bookmarkCount === 1
                ? '1 thread'
                : `${bookmarkCount} threads`;
        }

        if (bookmarkCount === 0) {
            // Show empty state
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        // Hide empty state
        container.style.display = 'block';
        emptyState.style.display = 'none';

        let html = '<div class="list-group">';

        bookmarksToRender.forEach((bookmark, index) => {
            const timeAgo = this.getTimeAgo(bookmark.timestamp);
            const fullDate = new Date(bookmark.timestamp).toLocaleString();

            // Get title styling from API
            const titleStyle = Utils.getTitleStyle(bookmark.titlefont_api);
            const titleClass = titleStyle ? 'text-decoration-none' : 'text-decoration-none text-dark';

            html += `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <i class="fa-solid fa-bookmark text-warning me-2"></i>
                                <h5 class="mb-0 flex-grow-1">
                                    <a href="/thread/${Utils.escapeHtml(bookmark.tid)}" class="${titleClass}" ${titleStyle}>
                                        ${Utils.escapeHtml(bookmark.subject)}
                                    </a>
                                </h5>
                            </div>
                            <p class="mb-1 text-muted">
                                <i class="fa-solid fa-user"></i> ${Utils.escapeHtml(bookmark.author)}
                                ${bookmark.forumName ? `<span class="mx-2">•</span><i class="fa-solid fa-folder"></i> ${Utils.escapeHtml(bookmark.forumName)}` : ''}
                            </p>
                            <small class="text-muted">
                                <i class="fa-solid fa-clock"></i> Bookmarked ${timeAgo}
                                <span class="mx-2">•</span>
                                <span title="${fullDate}">${fullDate}</span>
                            </small>
                        </div>
                        <div class="ms-3">
                            <button class="btn btn-outline-danger btn-sm remove-bookmark-btn"
                                    data-tid="${Utils.escapeHtml(bookmark.tid)}"
                                    title="Remove bookmark">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Add event listeners for remove buttons
        container.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tid = btn.dataset.tid;
                if (confirm('Remove this bookmark?')) {
                    this.removeBookmark(tid);
                }
            });
        });
    },

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;

        return new Date(timestamp).toLocaleDateString();
    }
};

// Initialize bookmarks page
document.addEventListener('DOMContentLoaded', () => {
    const bookmarksList = document.getElementById('thread-bookmarks-list');
    if (bookmarksList) {
        BookmarksPage.init();
    }
});
