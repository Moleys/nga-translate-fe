// Forum Page - Display all forums with favorite functionality and premium Tailwind UI
const ForumPage = {
    favorites: [],

    init() {
        // Load favorites from localStorage
        this.loadFavorites();

        // Render all forums from forum-list.js with translation
        this.translateAndRender();
    },

    loadFavorites() {
        const stored = localStorage.getItem('nga_forum_favorites');
        this.favorites = stored ? JSON.parse(stored) : [];
    },

    saveFavorites() {
        localStorage.setItem('nga_forum_favorites', JSON.stringify(this.favorites));
    },

    isFavorited(fid) {
        return this.favorites.some(b => b.fid === fid);
    },

    toggleFavorite(forum) {
        const index = this.favorites.findIndex(b => b.fid === forum.fid);

        if (index >= 0) {
            // Remove favorite
            this.favorites.splice(index, 1);
        } else {
            // Find original forum data from forumList (not translated)
            let originalForum = null;
            if (typeof forumList !== 'undefined') {
                forumList.forEach(category => {
                    const found = category.forums.find(f => f.fid === forum.fid);
                    if (found) {
                        originalForum = found;
                    }
                });
            }

            // Add favorite with ORIGINAL Chinese text
            this.favorites.push({
                fid: forum.fid,
                name: originalForum ? originalForum.name : forum.name,
                subject: originalForum ? originalForum.subject : forum.subject,
                avatar: originalForum ? originalForum.avatar : forum.avatar
            });
        }

        this.saveFavorites();
        this.translateAndRender(); // Re-render with translation
    },

    async translateAndRender() {
        const container = document.getElementById('forum-categories');
        if (!container) return;

        if (typeof forumList === 'undefined' || forumList.length === 0) {
            container.innerHTML = `
                <div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl text-amber-800">
                    <i class="fa-solid fa-triangle-exclamation mr-2"></i>
                    No forums available
                </div>
            `;
            return;
        }

        // Check if translation is enabled
        if (typeof TranslationUtil === 'undefined' || !TranslationUtil.enabled) {
            this.renderForumList();
            return;
        }

        // Clone forumList to avoid modifying the original
        const translatedForumList = JSON.parse(JSON.stringify(forumList));

        try {
            // Collect all texts to translate
            let textsToTranslate = [];
            let textMap = [];

            translatedForumList.forEach((category, catIdx) => {
                if (category.category) {
                    textMap.push({ type: 'category', catIdx, index: textsToTranslate.length });
                    textsToTranslate.push(category.category);
                }

                category.forums.forEach((forum, forumIdx) => {
                    if (forum.name) {
                        textMap.push({ type: 'forum_name', catIdx, forumIdx, index: textsToTranslate.length });
                        textsToTranslate.push(forum.name);
                    }
                    if (forum.subject) {
                        // Preprocess BBCode - extract text segments
                        const { textSegments, structure, emptyLines } = BBCodeTranslator.prepareBBCodeForTranslation(forum.subject);
                        textMap.push({
                            type: 'forum_subject',
                            catIdx,
                            forumIdx,
                            startIndex: textsToTranslate.length,
                            segmentCount: textSegments.length,
                            structure: structure,
                            emptyLines: emptyLines
                        });
                        // Add all text segments to translation queue
                        textSegments.forEach(segment => {
                            textsToTranslate.push(segment);
                        });
                    }
                });
            });

            console.log(`[Translation] Translating ${textsToTranslate.length} forum texts...`);

            // Translate all texts
            const translated = await TranslationUtil.translateVietphrase(textsToTranslate);

            if (translated && translated.length > 0) {
                // Apply translations
                textMap.forEach(mapping => {
                    const result = translated[mapping.index];
                    const translatedText = result?.translations?.[0]?.text || textsToTranslate[mapping.index];

                    if (mapping.type === 'category') {
                        translatedForumList[mapping.catIdx].category = translatedText;
                    } else if (mapping.type === 'forum_name') {
                        translatedForumList[mapping.catIdx].forums[mapping.forumIdx].name = translatedText;
                    } else if (mapping.type === 'forum_subject') {
                        // Reconstruct BBCode content from translated segments
                        const translatedSegments = [];
                        for (let i = 0; i < mapping.segmentCount; i++) {
                            const result = translated[mapping.startIndex + i];
                            let segmentText = result?.translations?.[0]?.text || textsToTranslate[mapping.startIndex + i];
                            // Format: split by <br/>, trim, capitalize, join
                            segmentText = TranslationUtil.formatTranslatedText(segmentText);
                            translatedSegments.push(segmentText);
                        }
                        const restored = BBCodeTranslator.restoreBBCodeAfterTranslation(
                            translatedSegments,
                            mapping.structure,
                            mapping.emptyLines
                        );
                        translatedForumList[mapping.catIdx].forums[mapping.forumIdx].subject = restored;
                    }
                });

                console.log('[Translation] Forum list translation complete!');
            }
        } catch (error) {
            console.error('[Translation] Error during forum translation:', error);
        }

        // Render with translated data
        this.renderForumList(translatedForumList);
    },

    renderForumList(dataToRender) {
        const container = document.getElementById('forum-categories');
        if (!container) return;

        // Use provided data or fall back to original forumList
        const data = dataToRender || forumList;

        if (typeof data === 'undefined' || data.length === 0) {
            container.innerHTML = `
                <div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl text-amber-800">
                    <i class="fa-solid fa-triangle-exclamation mr-2"></i>
                    No forums available
                </div>
            `;
            return;
        }

        let html = '';
        let categoryIndex = 0;

        data.forEach(category => {
            html += `
                <div class="mb-4">
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0">
                                <i class="fa-solid fa-folder-open"></i>
                                ${Utils.escapeHtml(category.category)}
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
            `;

            category.forums.forEach((forum, forumIndex) => {
                const isFavorited = this.isFavorited(forum.fid);
                const favoriteClass = isFavorited
                    ? 'text-warning'
                    : 'text-muted';
                const favoriteIcon = isFavorited ? 'fa-solid fa-star' : 'fa-regular fa-star';

                html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="d-flex align-items-center gap-3 p-3 border rounded">
                            <img src="https://wsrv.nl/?url=${forum.avatar}"
                                 alt="${Utils.escapeHtml(forum.name)}"
                                 class="rounded" style="width: 48px; height: 48px; object-fit: cover;"
                                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect fill=%22%23e8efed%22 width=%2248%22 height=%2248%22/%3E%3C/svg%3E'">
                            <div class="flex-fill text-truncate">
                                <h6 class="fw-bold mb-0 text-truncate">
                                    <a href="/forum/${forum.fid}" class="text-decoration-none text-dark">
                                        ${Utils.escapeHtml(forum.name)}
                                    </a>
                                </h6>
                                <p class="small text-muted mb-0 text-truncate">${Utils.escapeHtml(forum.subject)}</p>
                            </div>
                            <button class="favorite-btn btn btn-sm ${favoriteClass}"
                                    data-fid="${forum.fid}"
                                    data-name="${Utils.escapeHtml(forum.name)}"
                                    data-subject="${Utils.escapeHtml(forum.subject)}"
                                    data-avatar="${forum.avatar}"
                                    title="${isFavorited ? 'Remove favorite' : 'Add favorite'}">
                                <i class="${favoriteIcon}"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `
                            </div>
                        </div>
                    </div>
                </div>
            `;
            categoryIndex++;
        });

        container.innerHTML = html;

        // Add event listeners for favorite buttons
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const forum = {
                    fid: btn.dataset.fid,
                    name: btn.dataset.name,
                    subject: btn.dataset.subject,
                    avatar: btn.dataset.avatar
                };
                this.toggleFavorite(forum);
            });
        });
    }
};

// Initialize forum page
document.addEventListener('DOMContentLoaded', () => {
    const categoriesContainer = document.getElementById('forum-categories');
    if (categoriesContainer) {
        ForumPage.init();
    }
});

window.ForumPage = ForumPage;

export default ForumPage;
