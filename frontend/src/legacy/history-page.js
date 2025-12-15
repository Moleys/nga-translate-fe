// History Page - Display thread reading history
const HistoryPage = {
    history: [],

    init() {
        // Load history from localStorage
        this.loadHistory();

        // Translate and render history
        this.translateAndRenderHistory();

        // Setup clear button
        this.setupClearButton();
    },

    loadHistory() {
        const stored = localStorage.getItem('nga_thread_history');
        this.history = stored ? JSON.parse(stored) : [];
    },

    saveHistory() {
        localStorage.setItem('nga_thread_history', JSON.stringify(this.history));
    },

    clearHistory() {
        if (confirm('Are you sure you want to clear all reading history?')) {
            this.history = [];
            this.saveHistory();
            this.translateAndRenderHistory();
        }
    },

    setupClearButton() {
        const btn = document.getElementById('clear-history-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.clearHistory();
            });
        }
    },

    async translateAndRenderHistory() {
        // Check if translation is enabled
        if (typeof TranslationUtil === 'undefined' || !TranslationUtil.enabled) {
            this.renderHistory(this.history);
            return;
        }

        if (this.history.length === 0) {
            this.renderHistory([]);
            return;
        }

        try {
            // Clone history to avoid modifying original raw data
            const translatedHistory = JSON.parse(JSON.stringify(this.history));

            // Collect all texts to translate
            let textsToTranslate = [];
            let textMap = [];

            translatedHistory.forEach((thread, idx) => {
                if (thread.subject) {
                    textMap.push({ type: 'subject', idx, index: textsToTranslate.length });
                    textsToTranslate.push(thread.subject);
                }
                if (thread.author) {
                    textMap.push({ type: 'author', idx, index: textsToTranslate.length });
                    textsToTranslate.push(thread.author);
                }
                if (thread.forumName) {
                    textMap.push({ type: 'forumName', idx, index: textsToTranslate.length });
                    textsToTranslate.push(thread.forumName);
                }
            });

            if (textsToTranslate.length === 0) {
                this.renderHistory(translatedHistory);
                return;
            }

            // Translate all texts
            const translated = await TranslationUtil.translateVietphrase(textsToTranslate);

            // Apply translations
            textMap.forEach(mapping => {
                const translatedText = translated[mapping.index]?.translations?.[0]?.text || textsToTranslate[mapping.index];
                const formattedText = TranslationUtil.formatTranslatedText(translatedText);
                translatedHistory[mapping.idx][mapping.type] = formattedText;
            });

            // Render with translated data
            this.renderHistory(translatedHistory);
        } catch (error) {
            console.error('[History] Translation failed:', error);
            // Fallback: render raw data
            this.renderHistory(this.history);
        }
    },

    renderHistory(historyToRender) {
        const container = document.getElementById('thread-history-list');
        const emptyState = document.getElementById('empty-history-state');
        const countElem = document.getElementById('history-count');

        if (!container || !emptyState) return;

        // Use original history for count
        const historyCount = this.history.length;

        // Update count
        if (countElem) {
            countElem.textContent = historyCount === 1
                ? '1 thread'
                : `${historyCount} threads`;
        }

        if (historyCount === 0) {
            // Show empty state
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        // Hide empty state
        container.style.display = 'block';
        emptyState.style.display = 'none';

        let html = '<div class="list-group">';

        historyToRender.forEach((thread, index) => {
            const timeAgo = this.getTimeAgo(thread.timestamp);
            const fullDate = new Date(thread.timestamp).toLocaleString();

            // Get title styling from API
            const titleStyle = Utils.getTitleStyle(thread.titlefont_api);

            html += `
                <a href="/thread/${Utils.escapeHtml(thread.tid)}" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <h5 class="mb-0 flex-grow-1" ${titleStyle}>${Utils.escapeHtml(thread.subject)}</h5>
                                <span class="badge bg-secondary ms-2">#${index + 1}</span>
                            </div>
                            <p class="mb-1 text-muted">
                                <i class="fa-solid fa-user"></i> ${Utils.escapeHtml(thread.author)}
                                ${thread.forumName ? `<span class="mx-2">•</span><i class="fa-solid fa-folder"></i> ${Utils.escapeHtml(thread.forumName)}` : ''}
                            </p>
                            <small class="text-muted">
                                <i class="fa-solid fa-clock"></i> ${timeAgo}
                                <span class="mx-2">•</span>
                                <span title="${fullDate}">${fullDate}</span>
                            </small>
                        </div>
                    </div>
                </a>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;

        return new Date(timestamp).toLocaleDateString();
    }
};

// Initialize history page
document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('thread-history-list');
    if (historyList) {
        HistoryPage.init();
    }
});
