const ForumApp = {
    currentPage: 1,
    currentFid: null,
    currentAct: 'list',
    loading: false,
    hasMorePages: true,
    observer: null,
    cachedHtml: null,

    init() {
        const forumPage = document.getElementById('forum-threads');
        if (forumPage) {
            this.currentFid = forumPage.dataset.fid;
            
            // Try to restore from cache first
            if (this.restoreFromCache()) {
                console.log('[ForumApp] Restored from cache');
            } else {
                this.loadThreads();
            }
            
            this.attachFilterListeners();
            this.setupInfiniteScroll();
            this.setupScrollSaving();
        }
    },

    /**
     * Setup scroll position saving before navigation
     */
    setupScrollSaving() {
        // Save scroll position periodically and on navigation
        let scrollSaveTimer = null;
        const saveScroll = () => {
            if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
            scrollSaveTimer = setTimeout(() => {
                if (window.ForumCache && this.currentFid) {
                    window.ForumCache.saveScrollPosition(this.currentFid);
                }
            }, 200); // Debounce scroll saving
        };

        window.addEventListener('scroll', saveScroll);

        // Save on clicking thread links
        document.addEventListener('click', (e) => {
            const threadLink = e.target.closest('a[href^="/thread/"]');
            if (threadLink && this.currentFid) {
                // Save current state before navigating
                this.saveCurrentState();
            }
        });

        // Save on beforeunload
        window.addEventListener('beforeunload', () => {
            if (this.currentFid) {
                this.saveCurrentState();
            }
        });
    },

    /**
     * Save current forum state to cache
     */
    saveCurrentState() {
        if (!window.ForumCache || !this.currentFid) return;

        const state = {
            currentPage: this.currentPage,
            currentAct: this.currentAct,
            hasMorePages: this.hasMorePages,
            threadsHtml: document.getElementById('threads-list')?.innerHTML || '',
            forumName: document.getElementById('forum-name')?.textContent || '',
            subforumHtml: document.getElementById('subforum-list')?.innerHTML || ''
        };

        window.ForumCache.saveForumState(this.currentFid, this.currentAct, state);
        window.ForumCache.saveScrollPosition(this.currentFid);
        console.log('[ForumApp] Saved forum state and scroll position');
    },

    /**
     * Restore forum state from cache
     */
    restoreFromCache() {
        if (!window.ForumCache || !this.currentFid) return false;

        const cachedState = window.ForumCache.getForumState(this.currentFid, this.currentAct);
        if (!cachedState) return false;

        // Restore state
        this.currentPage = cachedState.currentPage || 1;
        this.currentAct = cachedState.currentAct || 'list';
        this.hasMorePages = cachedState.hasMorePages !== false;

        // Restore HTML
        if (cachedState.threadsHtml) {
            document.getElementById('threads-list').innerHTML = cachedState.threadsHtml;
        }
        if (cachedState.forumName) {
            document.getElementById('forum-name').textContent = cachedState.forumName;
        }
        if (cachedState.subforumHtml) {
            const subforumList = document.getElementById('subforum-list');
            if (subforumList) {
                subforumList.innerHTML = cachedState.subforumHtml;
                document.getElementById('subforum-container').style.display = 'block';
            }
        }

        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.act === this.currentAct) {
                btn.classList.add('active');
            }
        });

        // Hide loading, show content
        document.getElementById('threads-list').style.display = 'block';
        document.getElementById('loading-state').style.display = 'none';

        // Restore scroll position
        window.ForumCache.restoreScrollPosition(this.currentFid);

        return true;
    },

    attachFilterListeners() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const act = e.target.dataset.act;
                this.changeFilter(act);
            });
        });
    },

    changeFilter(act) {
        this.currentAct = act;
        this.currentPage = 1;
        this.hasMorePages = true;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-act="${act}"]`).classList.add('active');

        // Reset UI state
        document.getElementById('threads-list').innerHTML = '';
        document.getElementById('scroll-end').style.display = 'none';
        document.getElementById('scroll-sentinel').style.display = 'block';

        this.loadThreads();
    },

    setupInfiniteScroll() {
        const sentinel = document.getElementById('scroll-sentinel');

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMorePages && !this.loading) {
                    this.currentPage++;
                    this.loadThreads(true); // true = append mode
                }
            });
        }, {
            rootMargin: '100px' // Trigger 100px before reaching sentinel
        });

        this.observer.observe(sentinel);
    },

    async loadThreads(append = false) {
        if (this.loading) return;

        this.loading = true;

        if (!append) {
            this.showLoading();
        } else {
            // Show loading spinner inside sentinel
            const sentinel = document.getElementById('scroll-sentinel');
            sentinel.querySelector('.spinner-border').style.display = 'inline-block';
            sentinel.querySelector('#sentinel-text').style.display = 'block';
        }

        try {
            const url = `/api/forum/${this.currentFid}/threads?page=${this.currentPage}&act=${this.currentAct}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                this.showError(data.error);
            } else if (data.code !== 0) {
                this.showError(data.msg || 'API Error');
            } else {
                // Translate API data before rendering
                await this.translateAndRender(data, append);
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.loading = false;
            // Hide loading spinner
            const sentinel = document.getElementById('scroll-sentinel');
            if (sentinel) {
                sentinel.querySelector('.spinner-border').style.display = 'none';
                sentinel.querySelector('#sentinel-text').style.display = 'none';
            }
        }
    },

    async translateAndRender(apiData, append = false) {
        // Check if translation is enabled
        if (typeof TranslationUtil === 'undefined' || !TranslationUtil.enabled) {
            this.renderThreads(apiData, append);
            return;
        }

        try {
            // Collect all texts to translate
            let textsToTranslate = [];
            let textMap = [];

            // Forum name (only on first load)
            if (!append && apiData.forumname) {
                textMap.push({ type: 'forumname', index: textsToTranslate.length });
                textsToTranslate.push(apiData.forumname);
            }

            // Subforums (only on first load)
            if (!append && apiData.result && apiData.result.subForum) {
                const subforumArray = Object.values(apiData.result.subForum || {});
                subforumArray.forEach((subforum, idx) => {
                    const name = subforum['1'] || subforum.name;
                    const description = subforum['2'] || subforum.info || '';

                    if (name) {
                        textMap.push({ type: 'subforum_name', subforumIdx: idx, index: textsToTranslate.length });
                        textsToTranslate.push(name);
                    }
                    if (description) {
                        textMap.push({ type: 'subforum_desc', subforumIdx: idx, index: textsToTranslate.length });
                        textsToTranslate.push(description);
                    }
                });
            }

            // Extract threads array
            let threads = [];
            if (apiData.result && apiData.result.data) {
                threads = apiData.result.data;
            } else if (Array.isArray(apiData.result)) {
                threads = apiData.result;
            }

            // Thread titles
            threads.forEach((thread, threadIdx) => {
                if (thread.subject) {
                    textMap.push({ type: 'thread_title', threadIdx, index: textsToTranslate.length });
                    textsToTranslate.push(thread.subject);
                }
                if (thread.author) {
                    textMap.push({ type: 'thread_author', threadIdx, index: textsToTranslate.length });
                    textsToTranslate.push(thread.author);
                }
                if (thread.lastposter) {
                    textMap.push({ type: 'thread_lastposter', threadIdx, index: textsToTranslate.length });
                    textsToTranslate.push(thread.lastposter);
                }
            });

            console.log(`[Translation] Translating ${textsToTranslate.length} forum texts...`);

            // Translate all texts
            const translated = await TranslationUtil.translateVietphrase(textsToTranslate);

            if (translated && translated.length > 0) {
                // Apply translations back to apiData
                textMap.forEach(mapping => {
                    const result = translated[mapping.index];
                    let translatedText = result?.translations?.[0]?.text || textsToTranslate[mapping.index];

                    // Format translated text
                    translatedText = TranslationUtil.formatTranslatedText(translatedText);

                    if (mapping.type === 'forumname') {
                        apiData.forumname = translatedText;
                    } else if (mapping.type === 'subforum_name') {
                        const subforumArray = Object.values(apiData.result.subForum);
                        const subforum = subforumArray[mapping.subforumIdx];
                        if (subforum) {
                            // Update both numeric and named properties
                            subforum['1'] = translatedText;
                            if (subforum.name !== undefined) subforum.name = translatedText;
                        }
                    } else if (mapping.type === 'subforum_desc') {
                        const subforumArray = Object.values(apiData.result.subForum);
                        const subforum = subforumArray[mapping.subforumIdx];
                        if (subforum) {
                            subforum['2'] = translatedText;
                            if (subforum.info !== undefined) subforum.info = translatedText;
                        }
                    } else if (mapping.type === 'thread_title') {
                        threads[mapping.threadIdx].subject = translatedText;
                    } else if (mapping.type === 'thread_author') {
                        threads[mapping.threadIdx].author = translatedText;
                    } else if (mapping.type === 'thread_lastposter') {
                        threads[mapping.threadIdx].lastposter = translatedText;
                    }
                });

                console.log('[Translation] Forum translation complete!');
            }
        } catch (error) {
            console.error('[Translation] Error during forum translation:', error);
        }

        // Update document title with translated forum name
        if (!append && apiData.forumname) {
            document.title = `${apiData.forumname} - NGA Forums`;
        }

        // Render with translated data
        this.renderThreads(apiData, append);
    },

    renderThreads(apiData, append = false) {
        const container = document.getElementById('threads-list');

        let threads = [];
        let totalPages = 1;
        let currentPage = 1;
        let attachPrefix = apiData.attachPrefix || '';

        // Extract and display forum name (only on first load)
        if (!append && apiData.forumname) {
            document.getElementById('forum-name').textContent = apiData.forumname;
            document.title = `${apiData.forumname} - NGA Forums`;
        }

        // Extract and display subforums (only on first load)
        if (!append && apiData.result && apiData.result.subForum) {
            this.renderSubforums(apiData.result.subForum);
        }

        // Parse API response - Check top-level first!
        if (apiData.result && apiData.result.data) {
            // Object format: result.data = threads array
            threads = apiData.result.data;
            attachPrefix = apiData.result.attachPrefix || attachPrefix;
        } else if (Array.isArray(apiData.result)) {
            // Array format: result = threads array
            threads = apiData.result;
        }

        // Extract pagination from TOP LEVEL (not from result)
        totalPages = apiData.totalPage || apiData.result?.totalPage || 1;
        currentPage = apiData.currentPage || apiData.result?.currentPage || 1;

        if (!threads || threads.length === 0) {
            if (!append) {
                container.innerHTML = '<div class="alert alert-warning">No threads found</div>';
            }
            this.hasMorePages = false;
            document.getElementById('scroll-end').style.display = 'block';
            return;
        }

        // Check if we have more pages
        this.hasMorePages = currentPage < totalPages;

        if (!this.hasMorePages) {
            document.getElementById('scroll-sentinel').style.display = 'none';
            document.getElementById('scroll-end').style.display = 'block';
        } else {
            document.getElementById('scroll-sentinel').style.display = 'block';
            document.getElementById('scroll-end').style.display = 'none';
        }

        const threadItems = threads.map(thread => {
            const title = thread.subject || 'Untitled';
            const author = thread.author || 'Unknown';
            const lastPoster = thread.lastposter || author;
            const replies = thread.replies || 0;
            const tid = thread.tid;
            const postDate = thread.postdate ? new Date(thread.postdate * 1000).toLocaleString('vi-VN') : '';
            const lastPostDate = thread.lastpost ? new Date(thread.lastpost * 1000).toLocaleString('vi-VN') : '';

            const hasAttachment = thread.attachs && thread.attachs.length > 0;
            const thumbnailUrl = hasAttachment ? attachPrefix + thread.attachs[0].attachurl : '';

            // Get title styling from API
            const titleStyle = Utils.getTitleStyle(thread.titlefont_api);
            const titleClass = titleStyle ? 'text-decoration-none' : 'text-decoration-none text-dark';

            return `
                <div class="card mb-3 hover-shadow">
                    <div class="card-body">
                        <div class="row">
                            ${hasAttachment ? `
                            <div class="col-auto">
                                <img src="https://wsrv.nl/?url=${thumbnailUrl}&w=100&h=100&fit=cover&a=attention" alt="Thumbnail" class="thread-thumbnail" loading="lazy">
                            </div>
                            ` : ''}
                            <div class="${hasAttachment ? 'col' : 'col-12'}">
                                <h5 class="card-title mb-3">
                                    <a href="/thread/${tid}" class="${titleClass}" ${titleStyle}>
                                        ${hasAttachment ? '<i class="fa-solid fa-image text-muted me-2"></i>' : ''}${Utils.escapeHtml(title)}
                                    </a>
                                </h5>
                                <div class="row">
                                    <div class="col-md-6">
                                        <small class="text-muted">
                                            <i class="fa-solid fa-user-circle"></i> <strong>Author:</strong> ${Utils.escapeHtml(author)}<br>
                                            ${postDate ? `<i class="fa-solid fa-calendar-days"></i> <strong>Posted:</strong> ${postDate}` : ''}
                                        </small>
                                    </div>
                                    <div class="col-md-6 text-md-end">
                                        <small class="text-muted">
                                            ${lastPostDate ? `<i class="fa-solid fa-clock-rotate-left"></i> <strong>Last:</strong> ${lastPostDate}<br>` : ''}
                                            <i class="fa-solid fa-user"></i> ${Utils.escapeHtml(lastPoster)}
                                        </small>
                                    </div>
                                </div>
                                <div class="mt-2">
                                    <span class="badge bg-success rounded-pill">
                                        <i class="fa-solid fa-comment-dots"></i> ${replies} ${replies === 1 ? 'reply' : 'replies'}
                                    </span>
                                    ${hasAttachment ? `<span class="badge bg-secondary rounded-pill ms-1"><i class="fa-solid fa-paperclip"></i> ${thread.attachs.length}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', threadItems);
        } else {
            container.innerHTML = threadItems;
        }
    },

    showLoading() {
        const container = document.getElementById('threads-list');
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading threads...</p>
            </div>
        `;
    },

    showError(message) {
        const container = document.getElementById('threads-list');
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5 class="alert-heading">Error</h5>
                <p>${Utils.escapeHtml(message)}</p>
                <button class="btn btn-sm btn-outline-danger" onclick="ForumApp.loadThreads()">Retry</button>
            </div>
        `;
    },

    renderSubforums(subForums) {
        const container = document.getElementById('subforum-container');
        const listContainer = document.getElementById('subforum-list');

        // subForum is an object where each key is a subforum entry
        // Each entry: {"0": fid, "1": name, "2": description, "id": fid, "name": name, ...}
        const subforumArray = Object.values(subForums || {});

        if (subforumArray.length === 0) {
            container.style.display = 'none';
            return;
        }

        const subforumItems = subforumArray.map(subforum => {
            // Extract using both numeric indices and named properties as fallback
            const fid = subforum['0'] || subforum.id;
            const name = subforum['1'] || subforum.name || 'Unnamed Forum';
            const description = subforum['2'] || subforum.info || '';

            if (!fid) return ''; // Skip invalid entries

            return `
                <a href="/forum/${fid}" class="btn btn-outline-success btn-sm" title="${Utils.escapeHtml(description)}">
                    <i class="fa-solid fa-folder"></i> ${Utils.escapeHtml(name)}
                </a>
            `;
        }).filter(item => item).join(''); // Remove empty strings

        if (subforumItems) {
            listContainer.innerHTML = subforumItems;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ForumApp.init();
});
