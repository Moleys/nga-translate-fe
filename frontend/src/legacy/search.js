const SearchApp = {
    keyword: '',
    threadPage: 1,
    forumPage: 1,
    loadingThreads: false,
    loadingForums: false,
    hasMoreThreads: true,
    hasMoreForums: true,
    threadObserver: null,
    forumObserver: null,

    init() {
        // Get keyword from URL parameters (more reliable than template variable)
        const urlParams = new URLSearchParams(window.location.search);
        this.keyword = urlParams.get('q') || '';

        if (!this.keyword) {
            document.getElementById('thread-results').innerHTML = '<div class="alert alert-warning">Please enter a search keyword</div>';
            document.getElementById('forum-results').innerHTML = '<div class="alert alert-warning">Please enter a search keyword</div>';
            return;
        }

        // Check if keyword is an NGA thread URL and redirect
        const ngaThreadInfo = this.extractNgaThreadId(this.keyword);
        if (ngaThreadInfo) {
            const redirectUrl = ngaThreadInfo.page
                ? `/thread/${ngaThreadInfo.tid}?page=${ngaThreadInfo.page}`
                : `/thread/${ngaThreadInfo.tid}`;
            console.log('[Search] Detected NGA thread URL, redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
            return;
        }

        // Setup tab switching
        this.setupTabs();

        // Load initial results
        this.searchThreads();

        // Setup infinite scroll
        this.setupInfiniteScroll();
    },

    extractNgaThreadId(keyword) {
        // Match NGA thread URLs with tid parameter at any position:
        // - https://ngabbs.com/read.php?tid=45452628&rand=681
        // - https://nga.178.com/read.php?tid=45453759
        // - https://nga.178.com/read.php?tid=45452628&_fp=2&rand=588
        // - http://bbs.nga.cn/read.php?rand=123&tid=45452628
        // - https://ngabbs.com/read.php?tid=45445417&page=2

        // Match tid parameter anywhere in the query string
        const tidMatch = keyword.match(/[?&]tid=(\d+)/i);

        // Match page parameter if exists
        const pageMatch = keyword.match(/[?&]page=(\d+)/i);

        // Also verify it's an NGA domain
        const ngaDomainPattern = /https?:\/\/(?:ngabbs\.com|nga\.178\.com|bbs\.nga\.cn)\//i;
        const isDomainMatch = ngaDomainPattern.test(keyword);

        if (tidMatch && tidMatch[1] && isDomainMatch) {
            const tid = tidMatch[1];
            const page = pageMatch && pageMatch[1] ? pageMatch[1] : null;

            console.log('[Search] Extracted tid from URL:', tid, 'page:', page);

            // Return object with tid and optional page
            return { tid, page };
        }

        return null;
    },

    setupTabs() {
        const threadsTab = document.getElementById('threads-tab');
        const forumsTab = document.getElementById('forums-tab');

        threadsTab.addEventListener('shown.bs.tab', () => {
            if (this.threadPage === 1) {
                this.searchThreads();
            }
        });

        forumsTab.addEventListener('shown.bs.tab', () => {
            if (this.forumPage === 1) {
                this.searchForums();
            }
        });
    },

    setupInfiniteScroll() {
        // Thread sentinel
        const threadSentinel = document.getElementById('thread-sentinel');
        this.threadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMoreThreads && !this.loadingThreads) {
                    this.threadPage++;
                    this.searchThreads(true);
                }
            });
        }, { rootMargin: '100px' });
        this.threadObserver.observe(threadSentinel);

        // Forum sentinel
        const forumSentinel = document.getElementById('forum-sentinel');
        this.forumObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMoreForums && !this.loadingForums) {
                    this.forumPage++;
                    this.searchForums(true);
                }
            });
        }, { rootMargin: '100px' });
        this.forumObserver.observe(forumSentinel);
    },

    async searchThreads(append = false) {
        if (this.loadingThreads) return;

        this.loadingThreads = true;
        const container = document.getElementById('thread-results');

        if (!append) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-3">Searching threads...</p></div>';
        } else {
            document.getElementById('thread-sentinel').querySelector('.spinner-border').style.display = 'inline-block';
            document.getElementById('thread-sentinel-text').style.display = 'block';
        }

        try {
            const url = `/api/search/threads?q=${encodeURIComponent(this.keyword)}&page=${this.threadPage}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                this.showError(container, data.error);
            } else if (data.code !== 0) {
                this.showError(container, data.msg || 'Search failed');
            } else {
                this.renderThreads(data, append);
            }
        } catch (error) {
            this.showError(container, error.message);
        } finally {
            this.loadingThreads = false;
            document.getElementById('thread-sentinel').querySelector('.spinner-border').style.display = 'none';
            document.getElementById('thread-sentinel-text').style.display = 'none';
        }
    },

    async searchForums(append = false) {
        if (this.loadingForums) return;

        this.loadingForums = true;
        const container = document.getElementById('forum-results');

        if (!append) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-3">Searching forums...</p></div>';
        } else {
            document.getElementById('forum-sentinel').querySelector('.spinner-border').style.display = 'inline-block';
            document.getElementById('forum-sentinel-text').style.display = 'block';
        }

        try {
            const url = `/api/search/forums?q=${encodeURIComponent(this.keyword)}&page=${this.forumPage}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                this.showError(container, data.error);
            } else if (data.code !== 0) {
                this.showError(container, data.msg || 'Search failed');
            } else {
                this.renderForums(data, append);
            }
        } catch (error) {
            this.showError(container, error.message);
        } finally {
            this.loadingForums = false;
            document.getElementById('forum-sentinel').querySelector('.spinner-border').style.display = 'none';
            document.getElementById('forum-sentinel-text').style.display = 'none';
        }
    },

    renderThreads(apiData, append = false) {
        const container = document.getElementById('thread-results');

        let threads = [];
        let totalPages = 1;
        let currentPage = 1;
        let attachPrefix = apiData.attachPrefix || '';

        if (apiData.result && apiData.result.data) {
            threads = apiData.result.data;
            attachPrefix = apiData.result.attachPrefix || attachPrefix;
        } else if (Array.isArray(apiData.result)) {
            threads = apiData.result;
        }

        totalPages = apiData.totalPage || apiData.result?.totalPage || 1;
        currentPage = apiData.currentPage || apiData.result?.currentPage || 1;

        if (!threads || threads.length === 0) {
            if (!append) {
                container.innerHTML = '<div class="alert alert-info">No threads found</div>';
            }
            this.hasMoreThreads = false;
            document.getElementById('thread-sentinel').style.display = 'none';
            document.getElementById('thread-end').style.display = 'block';
            return;
        }

        this.hasMoreThreads = currentPage < totalPages;

        if (!this.hasMoreThreads) {
            document.getElementById('thread-sentinel').style.display = 'none';
            document.getElementById('thread-end').style.display = 'block';
        } else {
            document.getElementById('thread-sentinel').style.display = 'block';
            document.getElementById('thread-end').style.display = 'none';
        }

        const threadItems = threads.map(thread => {
            const title = thread.subject || 'Untitled';
            const author = thread.author || 'Unknown';
            const replies = thread.replies || 0;
            const tid = thread.tid;
            const fid = thread.fid;
            const postDate = thread.postdate ? new Date(thread.postdate * 1000).toLocaleString('vi-VN') : '';

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
                                <h5 class="card-title mb-2">
                                    <a href="/thread/${tid}" class="${titleClass}" ${titleStyle}>
                                        ${hasAttachment ? '<i class="fa-solid fa-image text-muted me-2"></i>' : ''}${Utils.escapeHtml(title)}
                                    </a>
                                </h5>
                                <p class="text-muted small mb-2">
                                    <i class="fa-solid fa-user-circle"></i> ${Utils.escapeHtml(author)}
                                    ${postDate ? ` • <i class="fa-solid fa-calendar-days"></i> ${postDate}` : ''}
                                    ${fid ? ` • <a href="/forum/${fid}" class="text-decoration-none">View Forum</a>` : ''}
                                </p>
                                <span class="badge bg-success rounded-pill">
                                    <i class="fa-solid fa-comment-dots"></i> ${replies} ${replies === 1 ? 'reply' : 'replies'}
                                </span>
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

    renderForums(apiData, append = false) {
        const container = document.getElementById('forum-results');

        let forums = [];
        let totalPages = 1;
        let currentPage = 1;

        if (apiData.result && Array.isArray(apiData.result)) {
            forums = apiData.result;
        } else if (apiData.result && apiData.result.data) {
            forums = apiData.result.data;
        }

        totalPages = apiData.totalPage || apiData.result?.totalPage || 1;
        currentPage = apiData.currentPage || apiData.result?.currentPage || 1;

        if (!forums || forums.length === 0) {
            if (!append) {
                container.innerHTML = '<div class="alert alert-info">No forums found</div>';
            }
            this.hasMoreForums = false;
            document.getElementById('forum-sentinel').style.display = 'none';
            document.getElementById('forum-end').style.display = 'block';
            return;
        }

        this.hasMoreForums = currentPage < totalPages;

        if (!this.hasMoreForums) {
            document.getElementById('forum-sentinel').style.display = 'none';
            document.getElementById('forum-end').style.display = 'block';
        } else {
            document.getElementById('forum-sentinel').style.display = 'block';
            document.getElementById('forum-end').style.display = 'none';
        }

        const forumItems = forums.map(forum => {
            const name = forum.name || 'Unnamed Forum';
            const fid = forum.fid || forum.id;
            const description = forum.info || forum.description || '';

            return `
                <div class="card mb-3 hover-shadow">
                    <div class="card-body">
                        <h5 class="card-title mb-2">
                            <a href="/forum/${fid}" class="text-decoration-none text-dark">
                                <i class="fa-solid fa-folder"></i> ${Utils.escapeHtml(name)}
                            </a>
                        </h5>
                        ${description ? `<p class="text-muted small mb-0">${Utils.escapeHtml(description)}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', forumItems);
        } else {
            container.innerHTML = forumItems;
        }
    },

    showError(container, message) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5 class="alert-heading">Error</h5>
                <p>${Utils.escapeHtml(message)}</p>
            </div>
        `;
    }
};

// Initialize search page if on search page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the search page by looking for search-specific elements
    const threadResults = document.getElementById('thread-results');
    const forumResults = document.getElementById('forum-results');

    if (threadResults && forumResults) {
        SearchApp.init();
    }
});
