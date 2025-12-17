const ThreadReader = {
    currentPage: 1,
    currentTid: null,
    loading: false,
    totalPages: 1,
    threadInfo: null,
    rawThreadInfo: null, // Store raw Chinese data before translation

    init() {
        const threadPage = document.getElementById('thread-posts');
        if (threadPage) {
            this.currentTid = threadPage.dataset.tid;

            // Get page from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            this.currentPage = parseInt(urlParams.get('page')) || 1;

            this.loadPosts();
            this.setupPaginationHandlers();
            this.setupBookmarkButton();
            this.setupGlobalModalHandlers();
        }
    },

    setupPaginationHandlers() {
        // Previous page button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prev-page' || e.target.closest('#prev-page')) {
                e.preventDefault();
                if (this.currentPage > 1) {
                    this.goToPage(this.currentPage - 1);
                }
            }
        });

        // Next page button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'next-page' || e.target.closest('#next-page')) {
                e.preventDefault();
                if (this.currentPage < this.totalPages) {
                    this.goToPage(this.currentPage + 1);
                }
            }
        });

        // Page number buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-num-btn')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.goToPage(page);
                }
            }
        });

        // Page input form
        const pageForm = document.getElementById('page-jump-form');
        if (pageForm) {
            pageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('page-input');
                const page = parseInt(input.value);translateGlossaryGoogle
                if (page && page >= 1 && page <= this.totalPages) {
                    this.goToPage(page);
                } else {
                    input.value = this.currentPage;
                }
            });
        }
    },

    goToPage(page) {
        this.currentPage = page;

        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Load posts
        this.loadPosts();
    },

    async loadPosts(silent = false) {
        if (this.loading) return;

        this.loading = true;
        if (!silent) {
            this.showLoading();
        }

        try {
            const url = `/api/thread/${this.currentTid}/posts?page=${this.currentPage}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                this.showError(data.error);
            } else if (data.code !== 0) {
                this.showError(data.msg || 'API Error');
            } else {
                // Translate API data before rendering
                await this.translateAndRender(data);
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.loading = false;
        }
    },

    // Extract raw text lines by splitting original content at <br> and then stripping BBCode/HTML per-line
    extractRawLines(bbcode) {
        const src = String(bbcode || '');
        // Split by <br/> boundaries from original API content
        const parts = src.split(/<br\s*\/?>(?![^<]*>)/i);
        // Clean each part separately so line alignment matches display segments
        return parts.map(p => Utils.stripBBCodeAndHtml(p || '', { trim: true }));
    },
    // Align raw text to match number of display segments using punctuation-aware heuristics
    alignRawToSegments(segCount, rawLines) {
        if (segCount <= 0) return [];
        const safeLines = Array.isArray(rawLines) ? rawLines.filter(l => typeof l === 'string') : [];
        if (safeLines.length === segCount) return safeLines;

        const base = safeLines.join('\n').trim();
        if (!base) return Array(segCount).fill('');

        // Prefer splitting by strong sentence punctuation first
        const sentenceDelims = /([。！？?!])/g; // keep delimiters
        const weakDelims = /([；;，、])/g;

        const splitByDelim = (text, regex) => {
            const parts = [];
            let last = 0;
            let m;
            while ((m = regex.exec(text)) !== null) {
                const end = regex.lastIndex;
                parts.push(text.slice(last, end));
                last = end;
            }
            if (last < text.length) parts.push(text.slice(last));
            return parts.map(p => p.trim()).filter(Boolean);
        };

        let units = splitByDelim(base, sentenceDelims);
        if (units.length < segCount) {
            // Further split using weaker punctuation
            const tmp = [];
            units.forEach(u => {
                const subs = splitByDelim(u, weakDelims);
                if (subs.length > 1) tmp.push(...subs); else tmp.push(u);
            });
            units = tmp;
        }

        if (units.length >= segCount) {
            // Merge tail to fit segCount
            const out = [];
            for (let i = 0; i < segCount - 1; i++) out.push(units[i] || '');
            out.push(units.slice(segCount - 1).join(' ').trim());
            return out;
        }

        // Fallback: split by approximate equal lengths
        const total = base.length;
        const out = [];
        let start = 0;
        for (let i = 1; i <= segCount; i++) {
            const target = Math.round(i * total / segCount);
            let end = target;
            // try to snap to nearest punctuation within window
            const window = 12;
            let snap = -1;
            for (let d = 0; d <= window; d++) {
                const idx1 = target - d;
                const idx2 = target + d;
                const isPunc = (ch) => '。！？?!；;,、'.includes(ch);
                if (idx1 > start && idx1 < total && isPunc(base[idx1])) { snap = idx1 + 1; break; }
                if (idx2 > start && idx2 < total && isPunc(base[idx2])) { snap = idx2 + 1; break; }
            }
            if (snap !== -1) end = snap;
            out.push(base.slice(start, end).trim());
            start = end;
        }
        return out;
    },

    // Wrap parsed HTML content into per-line blocks (.comment-line) with per-line data-raw
    wrapParsedContentWithLines(parsedHtml, rawLines) {
        if (!parsedHtml) return '';

        // Extract blockquotes first to preserve their internal structure
        const blockquotes = [];
        const placeholders = [];
        let workingHtml = parsedHtml;

        // Replace blockquotes with placeholders
        workingHtml = workingHtml.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, (match, offset) => {
            const placeholder = `__BLOCKQUOTE_${blockquotes.length}__`;
            blockquotes.push(match);
            placeholders.push(placeholder);
            return placeholder;
        });

        // Split remaining content by <br>
        const segments = workingHtml.split(/<br\s*\/?>(?![^<]*>)/i);
        const alignedRaw = this.alignRawToSegments(segments.length, rawLines);

        // Wrap each segment, restoring blockquotes
        const blocks = segments.map((seg, idx) => {
            let content = seg;
            // Restore blockquotes in this segment
            blockquotes.forEach((bq, bqIdx) => {
                content = content.replace(placeholders[bqIdx], bq);
            });

            const raw = (alignedRaw && alignedRaw[idx] !== undefined) ? alignedRaw[idx] : '';
            const rawEsc = Utils.escapeHtml(raw);
            return `<div class="comment-line" data-line-index="${idx}" data-raw="${rawEsc}">${content}</div>`;
        });

        return blocks.join('');
    },

    async translateAndRender(apiData) {
        // Save raw thread info BEFORE translation
        if (!this.rawThreadInfo || this.currentPage === 1) {
            this.rawThreadInfo = {
                subject: apiData.tsubject || 'Untitled Thread',
                author: apiData.tauthor || 'Unknown',
                replies: apiData.vrows || 0,
                fid: apiData.fid || null,
                forumName: apiData.forum_name || 'Forum',
                titlefont_api: apiData.titlefont_api || null
            };
        }

        // Check if translation is enabled
        if (typeof TranslationUtil === 'undefined' || !TranslationUtil.enabled) {
            this.renderPosts(apiData);
            return;
        }

        try {
            // Preserve RAW Chinese content for posts and hot posts before any translation occurs
            if (Array.isArray(apiData.result)) {
                apiData.result.forEach(p => {
                    if (typeof p._raw_content === 'undefined') {
                        p._raw_content = p.content || '';
                    }
                });
            }
            if (Array.isArray(apiData.hot_post)) {
                apiData.hot_post.forEach(p => {
                    if (typeof p._raw_content === 'undefined') {
                        p._raw_content = p.content || '';
                    }
                });
            }

            // Collect all texts to translate
            let textsToTranslate = [];
            let textMap = [];

            // Thread info
            if (apiData.tsubject) {
                textMap.push({ type: 'tsubject', index: textsToTranslate.length });
                textsToTranslate.push(apiData.tsubject);
            }
            if (apiData.tauthor) {
                textMap.push({ type: 'tauthor', index: textsToTranslate.length });
                textsToTranslate.push(apiData.tauthor);
            }
            if (apiData.forum_name) {
                textMap.push({ type: 'forum_name', index: textsToTranslate.length });
                textsToTranslate.push(apiData.forum_name);
            }

            // Posts content
            const posts = Array.isArray(apiData.result) ? apiData.result : [];
            posts.forEach((post, postIdx) => {
                if (post.author?.username || post.author) {
                    textMap.push({ type: 'post_author', postIdx, index: textsToTranslate.length });
                    textsToTranslate.push(post.author?.username || post.author);
                }
                if (post.content) {
                    // Preprocess BBCode - extract text segments
                    const {textSegments, structure, emptyLines} = BBCodeTranslator.prepareBBCodeForTranslation(post.content);
                    textMap.push({
                        type: 'post_content',
                        postIdx,
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

            // Hot posts
            const hotPosts = apiData.hot_post || [];
            hotPosts.forEach((post, postIdx) => {
                if (post.author?.username || post.author) {
                    textMap.push({ type: 'hot_author', postIdx, index: textsToTranslate.length });
                    textsToTranslate.push(post.author?.username || post.author);
                }
                if (post.content) {
                    // Preprocess BBCode - extract text segments
                    const {textSegments, structure, emptyLines} = BBCodeTranslator.prepareBBCodeForTranslation(post.content);
                    textMap.push({
                        type: 'hot_content',
                        postIdx,
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

            console.log(`[Translation] Translating ${textsToTranslate.length} texts...`);

            // Translate all texts
            const translated = await TranslationUtil.translateVietphrase(textsToTranslate);

            if (translated && translated.length > 0) {
                // Apply translations back to apiData
                textMap.forEach(mapping => {
                    const result = translated[mapping.index];
                    const translatedText = result?.translations?.[0]?.text || textsToTranslate[mapping.index];

                    if (mapping.type === 'tsubject') {
                        apiData.tsubject = translatedText;
                    } else if (mapping.type === 'tauthor') {
                        apiData.tauthor = translatedText;
                    } else if (mapping.type === 'forum_name') {
                        apiData.forum_name = translatedText;
                    } else if (mapping.type === 'post_author') {
                        const post = posts[mapping.postIdx];
                        if (post.author?.username) {
                            post.author.username = translatedText;
                        } else {
                            post.author = translatedText;
                        }
                    } else if (mapping.type === 'post_content') {
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
                        posts[mapping.postIdx].content = restored;
                    } else if (mapping.type === 'hot_author') {
                        const post = hotPosts[mapping.postIdx];
                        if (post.author?.username) {
                            post.author.username = translatedText;
                        } else {
                            post.author = translatedText;
                        }
                    } else if (mapping.type === 'hot_content') {
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
                        hotPosts[mapping.postIdx].content = restored;
                    }
                });

                console.log('[Translation] Translation complete!');
            }
        } catch (error) {
            console.error('[Translation] Error during translation:', error);
        }

        // Render with translated data
        this.renderPosts(apiData);
    },

    renderPosts(apiData) {
        const container = document.getElementById('posts-list');

        let posts = [];
        let attachPrefix = apiData.attachPrefix || '';
        let hotPosts = apiData.hot_post || [];

        // Extract thread info if not yet loaded or on first page
        if (!this.threadInfo || this.currentPage === 1) {
            this.threadInfo = {
                subject: apiData.tsubject || 'Untitled Thread',
                author: apiData.tauthor || 'Unknown',
                replies: apiData.vrows || 0,
                postdate: '',
                fid: apiData.fid || null,
                forumName: apiData.forum_name || 'Forum'
            };
            this.updateThreadHeader(this.threadInfo);
            this.updateBreadcrumb(this.threadInfo);

            // Save thread to history (only once per thread)
            if (!this.threadInfo.historySaved) {
                this.saveThreadToHistory();
                this.threadInfo.historySaved = true;
            }

            // Update bookmark button state
            this.updateBookmarkButton();
        }

        // Parse posts - result is a direct array
        if (Array.isArray(apiData.result)) {
            posts = apiData.result;
        }

        // Pagination info is at top level
        this.totalPages = apiData.totalPage || 1;
        const currentPage = apiData.currentPage || 1;

        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No posts found</div>';
            this.renderPagination();
            return;
        }

        let postItems = '';

        // Render regular posts
        posts.forEach((post, index) => {
            const author = post.author?.username || post.author || 'Unknown';
            const postDate = post.postdate || '';
            const contentParsed = this.parseContent(post.content || '', attachPrefix);
            const rawLines = this.extractRawLines(post._raw_content || post.content || '');
            const content = this.wrapParsedContentWithLines(contentParsed, rawLines);
            const floor = post.lou !== undefined ? post.lou : (this.currentPage - 1) * 20 + index;
            const pid = post.pid || '';
            const isOriginalPost = floor === 0;
            const voteGood = post.vote_good || 0;
            const voteBad = post.vote_bad || 0;

            postItems += `
                <div class="card mb-3 post-card ${isOriginalPost ? 'original-post' : ''}" id="post-${pid}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="flex-grow-1">
                                <span class="post-author">${Utils.escapeHtml(author)}</span>
                                ${isOriginalPost ? '<span class="badge bg-success ms-2">OP</span>' : ''}
                                <br>
                                <small class="text-muted">
                                    <i class="fa-solid fa-clock"></i> ${postDate}
                                </small>
                            </div>
                            <div class="d-flex flex-column align-items-end gap-2">
                                <span class="post-floor">#${floor}</span>
                                ${voteGood > 0 || voteBad > 0 ? `
                                    <div class="vote-info">
                                        ${voteGood > 0 ? `<span class="badge bg-success"><i class="fa-solid fa-thumbs-up"></i> ${voteGood}</span>` : ''}
                                        ${voteBad > 0 ? `<span class="badge bg-secondary ms-1"><i class="fa-solid fa-thumbs-down"></i> ${voteBad}</span>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="post-content">
                            ${content}
                        </div>
                    </div>
                </div>
            `;

            // Insert hot posts after #0 (only on first page)
            if (isOriginalPost && this.currentPage === 1 && hotPosts && hotPosts.length > 0) {
                postItems += this.renderHotPosts(hotPosts, attachPrefix);
            }
        });

        container.innerHTML = postItems;
        this.renderPagination();
    },

    renderHotPosts(hotPosts, attachPrefix) {
        if (!hotPosts || hotPosts.length === 0) return '';

        let hotPostsHtml = `
            <div class="hot-posts-section mb-4">
                <div class="hot-posts-header">
                    <i class="fa-solid fa-fire"></i> Hot Comments
                </div>
        `;

        hotPosts.forEach((post, index) => {
            const author = post.author?.username || post.author || 'Unknown';
            const postDate = post.postdate || '';
            const contentParsed = this.parseContent(post.content || '', attachPrefix);
            const rawLines = this.extractRawLines(post._raw_content || post.content || '');
            const content = this.wrapParsedContentWithLines(contentParsed, rawLines);
            const floor = post.lou || 0;
            const pid = post.pid || '';
            const voteGood = post.vote_good || 0;
            const voteBad = post.vote_bad || 0;

            hotPostsHtml += `
                <div class="card hot-post-card mb-2" id="hot-post-${pid}">
                    <div class="card-body py-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="flex-grow-1">
                                <span class="post-author">${Utils.escapeHtml(author)}</span>
                                <span class="badge bg-danger ms-2">Hot</span>
                                <span class="badge bg-light text-dark ms-1">#${floor}</span>
                                <br>
                                <small class="text-muted">
                                    <i class="fa-solid fa-clock"></i> ${postDate}
                                </small>
                            </div>
                            <div class="vote-info text-end">
                                ${voteGood > 0 ? `<span class="badge bg-success"><i class="fa-solid fa-thumbs-up"></i> ${voteGood}</span>` : ''}
                                ${voteBad > 0 ? `<span class="badge bg-secondary ms-1"><i class="fa-solid fa-thumbs-down"></i> ${voteBad}</span>` : ''}
                            </div>
                        </div>
                        <div class="post-content small">
                            ${content}
                        </div>
                    </div>
                </div>
            `;
        });

        hotPostsHtml += `</div>`;
        return hotPostsHtml;
    },

    updateThreadHeader(result) {
        const subject = result.subject || 'Untitled Thread';
        const author = result.author || 'Unknown';
        // postdate is already formatted
        const postDate = result.postdate || '';
        const replies = result.replies || 0;

        const titleEl = document.getElementById('thread-title');
        titleEl.textContent = subject;
        // Attach raw attribute (strip any potential tags from rawThreadInfo.subject)
        try {
            const rawSubject = Utils.stripBBCodeAndHtml(this.rawThreadInfo?.subject || subject || '');
            titleEl.setAttribute('data-raw', rawSubject);
        } catch {}
        document.title = `${subject} - NGA Forums`;

        document.getElementById('thread-info').innerHTML = `
            <i class="fa-solid fa-user-circle"></i> <strong>${Utils.escapeHtml(author)}</strong>
            ${postDate ? ` • <i class="fa-solid fa-calendar-days"></i> ${postDate}` : ''}
            • <i class="fa-solid fa-comment-dots"></i> ${replies} ${replies === 1 ? 'reply' : 'replies'}
        `;
    },

    updateBreadcrumb(result) {
        const fid = result.fid;
        const forumName = result.forumName || 'Forum';
        const breadcrumb = document.getElementById('thread-breadcrumb');

        if (!breadcrumb) return;

        const breadcrumbHtml = `
            <li class="breadcrumb-item"><a href="/"><i class="fa-solid fa-house"></i> Home</a></li>
            ${fid ? `<li class="breadcrumb-item active" aria-current="page"><a href="/forum/${fid}">${Utils.escapeHtml(forumName)}</a></li>` : ''}
        `;

        breadcrumb.innerHTML = breadcrumbHtml;
    },

    setupGlobalModalHandlers() {
        // Save button handler for glossary modal
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'glossary-save-btn') {
                const middleSpan = document.getElementById('glossary-raw-text');
                const raw = middleSpan?.textContent?.trim() || '';
                const meaning = document.getElementById('glossary-meaning-input')?.value?.trim() || '';
                if (!raw) return this.closeGlossaryModal();
                this.saveToGlossary(raw, meaning);
                this.closeGlossaryModal();

                // Reload and re-translate the current thread silently (no loading spinner)
                await this.loadPosts(true);
            }
        });

        // Handle ESC key for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Check which modal is open
                const glossaryModal = document.getElementById('glossaryEditModal');
                const ocrModal = document.getElementById('ocrModal');

                if (glossaryModal && glossaryModal.classList.contains('show')) {
                    this.closeGlossaryModal();
                } else if (ocrModal && ocrModal.classList.contains('show')) {
                    this.closeOcrModal();
                }
            }
        });

        // Delegate click on any line or h1 title to open edit modal (use element's own data-raw)
        document.addEventListener('click', (e) => {
            // Don't intercept clicks inside modals
            if (e.target.closest('.modal')) return;
            // If clicking on an image, let OCR handler handle it
            if (e.target && (e.target.tagName === 'IMG' || e.target.closest('img'))) return;
            
            // Check if clicked on thread title (h1)
            const titleEl = e.target.closest('#thread-title');
            if (titleEl) {
                const raw = titleEl.getAttribute('data-raw') || '';
                if (raw) this.openGlossaryModal(raw);
                return;
            }
            
            // Check if clicked on comment line
            const lineEl = e.target.closest('.comment-line');
            if (!lineEl) return;
            const raw = lineEl.getAttribute('data-raw') || '';
            this.openGlossaryModal(raw);
        });

        // Delegate click on images within post-content to open OCR modal
        document.addEventListener('click', async (e) => {
            // Don't intercept clicks inside modals
            if (e.target.closest('.modal')) return;
            const img = e.target.closest('img');
            if (!img) return;
            // Only handle images inside post content
            if (!img.closest('.post-content')) return;
            e.preventDefault();
            e.stopPropagation();
            await this.openOcrModal(img.getAttribute('src') || '');
        });

        // OCR modal buttons
        document.addEventListener('click', async (e) => {
            if (e.target.id === 'ocr-translate-btn') {
                await this.translateOcrText();
            } else if (e.target.id === 'ocr-run-btn') {
                if (this.lastOcrImageUrl) await this.runOcr(this.lastOcrImageUrl);
            } else if (e.target.id === 'ocr-copy-text') {
                const ta = document.getElementById('ocr-text');
                if (ta) navigator.clipboard.writeText(ta.value || '');
            } else if (e.target.id === 'ocr-copy-translation') {
                const el = document.getElementById('ocr-translation');
                if (el) navigator.clipboard.writeText(el.textContent || '');
            } else if (e.target.id === 'ocr-fix-breaks') {
                const ta = document.getElementById('ocr-text');
                if (ta) ta.value = this.fix_breaks(ta.value || '');
            }
        });
    },

    // Global state for glossary modal
    _glossaryFullText: '',
    _glossaryStartIndex: 0,

    openGlossaryModal(rawText) {
        const modalEl = document.getElementById('glossaryEditModal');
        if (!modalEl) return;

        // Store full text and reset index
        this._glossaryFullText = (rawText || '').trim();
        this._glossaryStartIndex = 0;

        // Set initial selection (full text)
        const rawTarget = document.getElementById('glossary-raw-text');
        const rawLeft = document.getElementById('glossary-raw-left');
        const rawRight = document.getElementById('glossary-raw-right');
        const input = document.getElementById('glossary-meaning-input');

        if (rawTarget) rawTarget.textContent = this._glossaryFullText;
        if (rawLeft) rawLeft.textContent = '';
        if (rawRight) rawRight.textContent = '';

        if (input) {
            // Prefill existing meaning if any
            input.value = this.getGlossaryMap()[this._glossaryFullText] || '';
        }

        // Setup navigation handlers
        this.setupGlossaryNavigationHandlers();

        // Set translation suggestion and word segmentation
        this.setGlossaryTranslationSuggestion();

        this._showModal('glossaryEditModal');
    },

    setupGlossaryNavigationHandlers() {
        // Remove existing listeners to avoid duplicates
        const prevLeft = document.getElementById('glossary-prevLeft');
        const prevRight = document.getElementById('glossary-prevRight');
        const nextLeft = document.getElementById('glossary-nextLeft');
        const nextRight = document.getElementById('glossary-nextRight');

        if (prevLeft) {
            prevLeft.onclick = () => this.glossaryNavigate('prevLeft');
        }
        if (prevRight) {
            prevRight.onclick = () => this.glossaryNavigate('prevRight');
        }
        if (nextLeft) {
            nextLeft.onclick = () => this.glossaryNavigate('nextLeft');
        }
        if (nextRight) {
            nextRight.onclick = () => this.glossaryNavigate('nextRight');
        }
    },

    glossaryNavigate(direction) {
        const leftSpan = document.getElementById('glossary-raw-left');
        const middleSpan = document.getElementById('glossary-raw-text');
        const rightSpan = document.getElementById('glossary-raw-right');

        if (!leftSpan || !middleSpan || !rightSpan) return;

        switch(direction) {
            case 'prevLeft':
                // Move left boundary left
                if (leftSpan.textContent.length > 0) {
                    this._glossaryStartIndex--;
                    const lastChar = leftSpan.textContent.slice(-1);
                    middleSpan.textContent = lastChar + middleSpan.textContent;
                    leftSpan.textContent = leftSpan.textContent.slice(0, -1);
                }
                break;
            case 'prevRight':
                // Move left boundary right
                if (middleSpan.textContent.length > 1) {
                    this._glossaryStartIndex++;
                    const firstChar = middleSpan.textContent.charAt(0);
                    middleSpan.textContent = middleSpan.textContent.slice(1);
                    leftSpan.textContent = leftSpan.textContent + firstChar;
                }
                break;
            case 'nextLeft':
                // Move right boundary left
                if (middleSpan.textContent.length > 1) {
                    const lastChar = middleSpan.textContent.slice(-1);
                    middleSpan.textContent = middleSpan.textContent.slice(0, -1);
                    rightSpan.textContent = lastChar + rightSpan.textContent;
                }
                break;
            case 'nextRight':
                // Move right boundary right
                if (rightSpan.textContent.length > 0) {
                    const firstChar = rightSpan.textContent.charAt(0);
                    middleSpan.textContent = middleSpan.textContent + firstChar;
                    rightSpan.textContent = rightSpan.textContent.slice(1);
                }
                break;
        }

        // Update translation suggestion after navigation
        this.setGlossaryTranslationSuggestion();
    },

    setGlossaryIndexToText(start, end) {
        end++;
        this._glossaryStartIndex = start;
        const fullText = this._glossaryFullText;
        const slicedText = fullText.slice(start, end);

        const leftSpan = document.getElementById('glossary-raw-left');
        const middleSpan = document.getElementById('glossary-raw-text');
        const rightSpan = document.getElementById('glossary-raw-right');

        if (middleSpan) middleSpan.textContent = slicedText;
        if (leftSpan) leftSpan.textContent = fullText.slice(0, start);
        if (rightSpan) rightSpan.textContent = fullText.slice(end);

        this.setGlossaryTranslationSuggestion();
    },

    async setGlossaryTranslationSuggestion() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (!middleSpan) return;

        const selectedText = middleSpan.textContent || '';
        if (!selectedText.trim()) return;

        // Get translation suggestion from VietPhrase API
        const translatedText = await this.translateTextVietPhrase(selectedText);
        const input = document.getElementById('glossary-meaning-input');
        if (input) input.value = translatedText;

        // Perform word segmentation and create clickable suggestions
        await this.cutGlossaryString();
    },

    async translateTextVietPhrase(text) {
        try {
            if (typeof TranslationUtil === 'undefined' || !TranslationUtil.translateVietphrase) {
                console.warn('VietPhrase API not available');
                return text;
            }

            const results = await TranslationUtil.translateVietphrase([text]);
            if (results && results.length > 0 && results[0]?.translations?.[0]?.text) {
                return results[0].translations[0].text;
            }
            return text;
        } catch (error) {
            console.error('VietPhrase translation error:', error);
            return text;
        }
    },

    async cutGlossaryString() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (!middleSpan) return;

        const txtChinese = middleSpan.textContent || '';
        if (!txtChinese.trim()) return;

        // Segment the text
        const segChinese = await this.segmentLine(txtChinese);

        if (segChinese.length === 0) return;

        // Word colors for visual segmentation (from edit-mode-form.js)
        const WORD_COLORS = ["#7a57d1", "#2f89fc", "#aa530e", "#278ea5"];

        // Build colored HTML with zuro class for tooltip
        const spans = segChinese.map((word, index) => {
            const color = WORD_COLORS[index % WORD_COLORS.length];
            return `<span class="zuro" style="color:${color};" data-text="${Utils.escapeHtml(word)}">${Utils.escapeHtml(word)}</span>`;
        });

        // Update middle span with colored segments
        middleSpan.innerHTML = spans.join('');

        // Create word-by-word translation for suggestions
        await this.setGlossaryWordSuggestions(segChinese, segChinese);
    },

    async setGlossaryWordSuggestions(inputText, segChinese) {
        try {
            // Translate each segment using VietPhrase API
            const translatedResults = await TranslationUtil.translateVietphrase(segChinese);

            const targetElement = document.getElementById('glossary-word-suggestion');
            if (!targetElement) return;

            targetElement.innerHTML = '';

            // Create clickable word suggestions
            let currentIndex = 0;
            for (let i = 0; i < segChinese.length; i++) {
                const result = translatedResults[i];
                const word = result?.translations?.[0]?.text || segChinese[i];

                if (!word.trim()) continue;

                const mark = document.createElement('mark');
                mark.className = 'badge bg-info';
                mark.style.margin = '1px';
                mark.style.fontSize = '80%';
                mark.style.cursor = 'pointer';
                mark.textContent = word.trim();

                // Calculate positions for this segment
                const start = this._glossaryStartIndex + currentIndex;
                const end = start + segChinese[i].length - 1;

                mark.onclick = () => {
                    this.setGlossaryIndexToText(start, end);
                };

                currentIndex += segChinese[i].length;

                targetElement.appendChild(mark);
                targetElement.appendChild(document.createTextNode(' '));
            }
        } catch (error) {
            console.error('Word suggestion error:', error);
        }
    },

    // Utility functions for glossary modal
    emptyGlossaryInput() {
        const input = document.getElementById('glossary-meaning-input');
        if (input) input.value = '';
    },

    copyGlossaryRaw() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (middleSpan) {
            navigator.clipboard.writeText(middleSpan.textContent || '');
        }
    },

    capWords(number, inputString) {
        const words = inputString.split(" ");

        if (number === 0) return inputString.toLowerCase();
        if (number === 10)
            return words
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        for (let i = 0; i < words.length; i++) {
            words[i] =
            i < number
                ? words[i].charAt(0).toUpperCase() + words[i].slice(1)
                : words[i].toLowerCase();
        }

        return words.join(" ");
    },


    setCapWords(mode) {
        const input = document.getElementById('glossary-meaning-input');
        if (!input) return;

        let value = input.value;
        switch(mode) {
            case 1:
                // Capitalize first letter
                input.value = this.capWords(1, value);
                break;
            case 2:
                // Title Case (capitalize each word, lowercase rest)
                input.value = this.capWords(2, value);
                break;
            case 3:
                // Capitalize Each Word (preserve case of rest)
                input.value = this.capWords(3, value);
                break;
            case 30:
                // ALL UPPERCASE
                input.value = this.capWords(30, value);
                break;
            case 0:
                // all lowercase
                input.value = this.capWords(0, value);
                break;
        }
    },

    translateGlossaryPhienAm() {
        const middleSpan = document.getElementById('glossary-raw-text');
        const input = document.getElementById('glossary-meaning-input');
        if (!middleSpan || !input) return;

        const text = middleSpan.textContent || '';
        if (!text.trim()) return;

        // Check if PhienAm dictionary is available
        if (typeof PhienAm === 'undefined' || !Array.isArray(PhienAm)) {
            console.error('PhienAm dictionary not loaded');
            input.value = text;
            return;
        }

        // Convert each Chinese character to Hán Việt phonetic reading
        const characters = Array.from(text);
        const phonetics = characters.map(char => {
            // Skip whitespace and punctuation
            if (char.trim() === '' || /[\p{P}\p{S}]/u.test(char)) {
                return char;
            }

            // Look up character in PhienAm dictionary
            const entry = PhienAm.find(item => item.zh === char);
            return entry ? entry.vi : char;
        });

        // Join with spaces
        input.value = phonetics.join(' ').replace(/\s+/g, ' ').trim();
    },

    async translateGlossaryMoldich() {
        const middleSpan = document.getElementById('glossary-raw-text');
        const input = document.getElementById('glossary-meaning-input');
        if (!middleSpan || !input) return;

        const text = middleSpan.textContent || '';
        if (!text.trim()) return;

        try {
            const response = await fetch('https://cors.moldich.eu.org/?q=https://jpname.tomatomtl.com/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await response.json();
            input.value = this.capWords(30, data.translation || text);
        } catch (error) {
            console.error('Moldich translation error:', error);
            input.value = text;
        }
    },

    async translateGlossaryGemini(targetLang = 'vi') {
        const middleSpan = document.getElementById('glossary-raw-text');
        const input = document.getElementById('glossary-meaning-input');
        if (!middleSpan || !input) return;

        const text = middleSpan.textContent || '';
        if (!text.trim()) return;

        try {
            let prompt;
            if (targetLang === 'vi') {
                prompt = `Hãy dịch, giải thích từ tiếng Trung này, trả lời nhanh gọn dễ hiểu nhất. Output Vietnamese translation ONLY. NO explanations. NO notes.: ${text}`;
            } else if (targetLang === 'jp') {
                prompt = `Translate the following text into Romaji for Japanese names, ensuring accuracy and maintaining the original format, only return the result without any explanation: ${text}`;
            } else {
                prompt = `Translate the following text into Western-style names, ensuring accuracy and consistency with Western naming conventions, only return the result without any explanation: ${text}`;
            }

            const response = await fetch('http://cors.moldich.eu.org/?q=https://moldich.gq/gemini2.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            const result = (data.response || text).split('\n').filter(l => l.trim() !== '').join('\n');
            input.value = result;
        } catch (error) {
            console.error('Gemini translation error:', error);
            input.value = text;
        }
    },

    async translateGlossaryGoogle(targetLang = 'vi') {
        const middleSpan = document.getElementById('glossary-raw-text');
        const input = document.getElementById('glossary-meaning-input');
        if (!middleSpan || !input) return;

        const text = middleSpan.textContent || '';
        if (!text.trim()) return;

        try {
            const bodyJSON = [[text, "zh-CN", targetLang], "te"];
            const response = await fetch('https://translate-pa.googleapis.com/v1/translateHtml', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json+protobuf',
                    'x-client-data': 'CIH/ygE=',
                    'x-goog-api-key': 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520'
                },
                body: JSON.stringify(bodyJSON)
            });
            const data = await response.json();
            input.value = data[0] || text;
        } catch (error) {
            console.error('Google translation error:', error);
            input.value = text;
        }
    },

    async translateGlossaryDeepL() {
        const middleSpan = document.getElementById('glossary-raw-text');
        const input = document.getElementById('glossary-meaning-input');
        if (!middleSpan || !input) return;

        const text = middleSpan.textContent || '';
        if (!text.trim()) return;

        try {
            const response = await fetch('https://api.deeplx.org/f4jXcPGCkdz1sPLQXzmvPSJgH5Ggxa0obPC7Mr8AvDM/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, source_lang: 'zh', target_lang: 'en' })
            });
            const data = await response.json();
            input.value = data.data || text;
        } catch (error) {
            console.error('DeepL translation error:', error);
            input.value = text;
        }
    },

    openGoogleTranslate() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (middleSpan) {
            const text = middleSpan.textContent || '';
            window.open("https://translate.google.com/?sl=zh-CN&tl=vi&op=translate&text=" +
                encodeURIComponent(text), "_blank");
        }
    },

    openGoogle() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (middleSpan) {
            const text = middleSpan.textContent || '';
            window.open("https://www.google.com/search?q=" +
                encodeURIComponent(text), "_blank");
        }
    },

    openHanzii() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (middleSpan) {
            const text = middleSpan.textContent || '';
            window.open("https://hanzii.net/search/word/" +
                encodeURIComponent(text) + "?hl=vi", "_blank");
        }
    },

    openMdbg() {
        const middleSpan = document.getElementById('glossary-raw-text');
        if (middleSpan) {
            const text = middleSpan.textContent || '';
            window.open("https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=" +
                encodeURIComponent(text), "_blank");
        }
    },

    closeGlossaryModal() {
        this._hideModal('glossaryEditModal');
    },

    closeOcrModal() {
        this._hideModal('ocrModal');
    },

    getGlossaryMap() {
        try {
            const raw = localStorage.getItem('nga_glossary');
            if (!raw) return {};
            const arr = JSON.parse(raw);
            const map = {};
            if (Array.isArray(arr)) {
                arr.forEach(it => {
                    if (it && typeof it.raw === 'string') map[it.raw] = it.mean || '';
                });
            }
            return map;
        } catch { return {}; }
    },

    saveToGlossary(raw, mean) {
        try {
            const key = 'nga_glossary';
            let arr = [];
            try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
            if (!Array.isArray(arr)) arr = [];
            const idx = arr.findIndex(it => (it?.raw || '') === raw);
            if (idx >= 0) {
                arr[idx].mean = mean;
            } else {
                arr.push({ raw, mean });
            }
            localStorage.setItem(key, JSON.stringify(arr));
            localStorage.setItem('nga_glossary_updated_at', String(Date.now()));
            this.showNotification('Saved to glossary', 'success');
        } catch (e) {
            console.error('Failed to save glossary:', e);
            this.showNotification('Failed to save glossary', 'danger');
        }
    },

    // ===== OCR helpers =====
    ensureWsrvProxiedUrl(src) {
        if (!src) return src;
        try {
            const u = new URL(src, window.location.origin);
            // Already proxied via wsrv
            if (u.hostname.includes('wsrv.nl')) return src;
            const original = u.href;
            return `https://wsrv.nl/?url=${encodeURIComponent(original)}`;
        } catch {
            // Fallback: assume src is absolute
            return `https://wsrv.nl/?url=${encodeURIComponent(src)}`;
        }
    },

    lastOcrImageUrl: null,

    async openOcrModal(imgSrc) {
        const modalEl = document.getElementById('ocrModal');
        if (!modalEl) return;
        const ta = document.getElementById('ocr-text');
        const out = document.getElementById('ocr-translation');
        if (ta) ta.value = 'Recognizing...';
        if (out) out.textContent = 'Waiting...';
        this._showModal('ocrModal');

        const proxiedUrl = this.ensureWsrvProxiedUrl(imgSrc);
        this.lastOcrImageUrl = proxiedUrl;
        await this.runOcr(proxiedUrl);
        // Auto-translate after OCR
        await this.translateOcrText();
    },

    async runOcr(imageUrl) {
        try {
            if (!window.Tesseract || !Tesseract.recognize) {
                console.warn('Tesseract not loaded');
                return;
            }
            const ta = document.getElementById('ocr-text');
            if (ta) ta.value = 'Recognizing with Tesseract...';
            const progressEl = document.getElementById('ocr-progress');
            if (progressEl) progressEl.style.width = '0%';
            const res = await Tesseract.recognize(imageUrl, 'chi_sim', {
                logger: (m) => {
                    if (m && typeof m.progress === 'number' && progressEl) {
                        const pct = Math.max(0, Math.min(100, Math.round(m.progress * 100)));
                        progressEl.style.width = pct + '%';
                    }
                }
            });

            // Filter by confidence threshold (80%)
            const CONFIDENCE_THRESHOLD = 80;
            let text = '';

            if (res && res.data) {
                // Use line-level confidence filtering to preserve line breaks
                if (res.data.lines && res.data.lines.length > 0) {
                    text = res.data.lines
                        .map(line => {
                            // Filter words in each line by confidence
                            if (line.words && line.words.length > 0) {
                                return line.words
                                    .filter(word => word.confidence >= CONFIDENCE_THRESHOLD)
                                    .map(word => word.text)
                                    .join('');
                            }
                            return '';
                        })
                        .filter(Boolean)
                        .join('\n');
                } else {
                    // Fallback to raw text if line data unavailable
                    text = res.data.text || '';
                }
            }

            // Normalize OCR output (remove extra spaces, keep line breaks)
            text = text.replace(/ +/g, '');
            if (ta) ta.value = text || '';
            if (progressEl) progressEl.style.width = '100%';
        } catch (err) {
            console.error('OCR error:', err);
            const ta = document.getElementById('ocr-text');
            if (ta) ta.value = '[OCR error]';
        }
    },

    async translateOcrText() {
        try {
            const ta = document.getElementById('ocr-text');
            const out = document.getElementById('ocr-translation');
            if (!ta || !out) return;
            const text = (ta.value || '').trim();
            if (!text) { out.textContent = ''; return; }
            out.textContent = 'Translating...';
            const results = await TranslationUtil.translateVietphrase([text]);
            const translated = Array.isArray(results) && results[0]?.translations?.[0]?.text ? results[0].translations[0].text : '';
            out.textContent = translated || '';
        } catch (e) {
            console.error('OCR translate error:', e);
            const out = document.getElementById('ocr-translation');
            if (out) out.textContent = '[Translate error]';
        }
    },

    // Modal helpers - simplified, Bootstrap JS is always loaded
    _showModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const inst = window.bootstrap.Modal.getOrCreateInstance(el);
        inst.show();
    },

    _hideModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const inst = window.bootstrap.Modal.getOrCreateInstance(el);
        inst.hide();
    },

    // Fix broken lines heuristically (merge short lines until punctuation)
    fix_breaks(input, min_invalid = 15) {
        const lines = String(input || '').split(/\r\n?|\n/);
        let output = '';
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            output += line;
            if (this.is_full_line(line, min_invalid)) output += '\n';
        }
        return output;
    },
    is_full_line(line, min_invalid = 15) {
        if (line.length < min_invalid) return true;
        // ends with common punctuation
        const TRAIL_PUNCT_RE = /[。．！？!?…。，,；;：:）)〉》»”'’」】］\]]\s*$/u;
        return TRAIL_PUNCT_RE.test(line);
    },

    // ===== Jieba WASM loader (borrowed approach from page-translate.js) =====
    _jiebaCutInstance: null,
    async _loadWasmJieba() {
        try {
            const modulePath = '/assets/jieba-wasm-html/jieba_rs_wasm.js';
            const { default: init, cut: jiebaCut } = await import(/* @vite-ignore */ modulePath);
            await init();
            this._jiebaCutInstance = jiebaCut;
        } catch (e) {
            console.warn('Failed to init jieba wasm:', e);
        }
    },
    async _ensureJieba() {
        if (!this._jiebaCutInstance) {
            await this._loadWasmJieba();
        }
        return !!this._jiebaCutInstance;
    },
    _segmentWithIntl(text) {
        try {
            if (typeof Intl !== 'undefined' && Intl.Segmenter) {
                const seg = new Intl.Segmenter('zh', { granularity: 'word' });
                return Array.from(seg.segment(text)).map(s => s.segment).filter(t => t.trim());
            }
        } catch {}
        // fallback per-char
        return Array.from(text).filter(ch => ch.trim());
    },
    async segmentLine(text) {
        if (!text) return [];
        // Prefer jieba if available
        if (await this._ensureJieba()) {
            try { return this._jiebaCutInstance(text, true) || []; } catch {}
        }
        return this._segmentWithIntl(text);
    },

    renderPagination() {
        const container = document.getElementById('pagination-container');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHtml = '<nav aria-label="Thread pagination"><ul class="pagination justify-content-center">';

        // Previous button
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" id="prev-page" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        // Page numbers with ellipsis
        const maxVisible = 5;
        const half = Math.floor(maxVisible / 2);
        let startPage = Math.max(1, this.currentPage - half);
        let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

        // Adjust start if end is at max
        if (endPage === this.totalPages) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        // First page + ellipsis
        if (startPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link page-num-btn" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link page-num-btn" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // Ellipsis + last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `<li class="page-item"><a class="page-link page-num-btn" href="#" data-page="${this.totalPages}">${this.totalPages}</a></li>`;
        }

        // Next button
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" id="next-page" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        paginationHtml += '</ul></nav>';

        // Jump to page input
        paginationHtml += `
            <div class="d-flex justify-content-center align-items-center mt-2 gap-2">
                <span class="text-muted small">Jump to:</span>
                <form id="page-jump-form" class="d-flex gap-2">
                    <input type="number"
                           id="page-input"
                           class="form-control form-control-sm"
                           style="width: 80px;"
                           min="1"
                           max="${this.totalPages}"
                           value="${this.currentPage}"
                           autocomplete="off">
                    <button type="submit" class="btn btn-sm btn-success">Go</button>
                </form>
                <span class="text-muted small">/ ${this.totalPages}</span>
            </div>
        `;

        container.innerHTML = paginationHtml;
    },

    parseContent(content, attachPrefix) {
        if (!content) return '<p class="text-muted">No content</p>';

        let parsed = content;

        // Add CORS proxy to video URLs (src and poster attributes)
        const videoProxyUrl = 'https://cors.moldich.eu.org/?q=';

        // Replace video src and poster attributes together
        parsed = parsed.replace(/<video([^>]*)>/gi, (match, attrs) => {
            let modifiedAttrs = attrs;

            // Replace src attribute
            modifiedAttrs = modifiedAttrs.replace(/\ssrc=["']([^"']+)["']/gi, (m, url) => {
                if (!url.startsWith('http')) return m;
                const proxiedUrl = videoProxyUrl + encodeURIComponent(url);
                return ` src="${proxiedUrl}"`;
            });

            // Replace poster attribute
            modifiedAttrs = modifiedAttrs.replace(/\sposter=["']([^"']+)["']/gi, (m, url) => {
                if (!url.startsWith('http')) return m;
                const proxiedUrl = videoProxyUrl + encodeURIComponent(url);
                return ` poster="${proxiedUrl}"`;
            });

            return `<video${modifiedAttrs}>`;
        });

        // Parse [fixsize] tags: [fixsize height X width Y Z] - skip entirely (layout data)
        parsed = parsed.replace(/\[fixsize[^\]]*\]/gi, '');

        // Parse [comment] tags: [comment ...]...[/comment] - skip entirely (metadata)
        parsed = parsed.replace(/\[comment[^\]]*\][\s\S]*?\[\/comment\]/gi, '');

        // Parse [style] tags: Remove [style] TAGS but keep inner TEXT (using shared utility)
        parsed = Utils.removeStyleBlocks(parsed);

        // Parse emoticons first: [s:category:emoticon_name]
        parsed = parsed.replace(/\[s:([^:]+):([^\]]+)\]/g, (match, category, name) => {
            if (typeof getEmoticonUrl === 'function') {
                const emoticonUrl = getEmoticonUrl(name, category);
                if (emoticonUrl) {
                    return `<img src="${emoticonUrl}" alt="${Utils.escapeHtml(name)}" class="emoticon" loading="lazy" title="${Utils.escapeHtml(name)}">`;
                }
            }
            return match;
        });

        // Parse reply-to pattern OUTSIDE quote blocks (format: <b>Reply to [pid]...[/pid] Post by [uid]...[/uid] (date)</b>)
        // This pattern has <b> tags (not [b]), no colon after date, and "Reply to" instead of just "Reply"
        parsed = parsed.replace(/<b>Reply to \[pid=([^\]]+)\](.*?)\[\/pid\]\s+Post by \[uid=(\d+)\](.*?)\[\/uid\]\s*\(([^)]+)\)<\/b>/g,
            (match, pidData, pidText, uid, username, date) => {
                const parts = pidData.split(',');
                const pid = parts[0];
                const tid = parts[1] || '';
                const floor = parseInt(parts[2]) || 0;
                const page = Math.floor(floor / 20) + 1;
                const safeUsername = Utils.escapeHtml(username);
                const safeDate = Utils.escapeHtml(date);

                if (tid) {
                    return `<div class="reply-to-header mb-2"><i class="fa-solid fa-reply"></i> Reply to <a href="/thread/${Utils.escapeHtml(tid)}?page=${page}#post-${Utils.escapeHtml(pid)}" class="quote-reply-link" title="Jump to floor #${floor}"><span class="quote-author">${safeUsername}</span></a> <span class="text-muted">(${safeDate})</span></div>`;
                }
                return `<div class="reply-to-header mb-2"><i class="fa-solid fa-reply"></i> Reply to <span class="quote-author">${safeUsername}</span> <span class="text-muted">(${safeDate})</span></div>`;
            }
        );

        // Parse [quote] blocks BEFORE other BBCode (to preserve structure)
        parsed = parsed.replace(/\[quote\]([\s\S]*?)\[\/quote\]/g, (match, quoteContent) => {
            let quoteParsed = quoteContent;

            // Parse [tid] inside quote for topic link
            quoteParsed = quoteParsed.replace(/\[tid=([^\]]+)\](.*?)\[\/tid\]/g, (m, tid, text) => {
                const safeTid = Utils.escapeHtml(tid);
                const safeText = Utils.escapeHtml(text);
                return `<a href="/thread/${safeTid}" class="quote-reply-link" title="View thread">${safeText}</a>`;
            });

            // Parse reply header FIRST (before parsing individual [pid] and [uid] tags)
            // Pattern: [pid=...]text[/pid]<b>Post by[uid=...]username[/uid](date):</b>
            // NOTE: No spaces required because translation may remove them
            console.log('[DEBUG] Quote content before header parse:', quoteParsed.substring(0, 200));
            const headerPattern = /\[pid=([^\]]+)\](.*?)\[\/pid\]\s*<b>Post by\s*\[uid=(\d+)\](.*?)\[\/uid\]\s*\(([^)]+)\):<\/b>/g;
            const headerMatches = quoteParsed.match(headerPattern);
            if (headerMatches) {
                console.log('[DEBUG] Found reply header in quote:', headerMatches);
            } else {
                console.log('[DEBUG] NO header match found in quote');
            }
            quoteParsed = quoteParsed.replace(headerPattern,
                (m, pidData, pidText, uid, username, date) => {
                    console.log('[DEBUG] Replacing header:', {pidData, pidText, uid, username, date});
                    const parts = pidData.split(',');
                    const pid = parts[0];
                    const tid = parts[1] || '';
                    const floor = parseInt(parts[2]) || 0;
                    const page = Math.floor(floor / 20) + 1;
                    const safeUsername = Utils.escapeHtml(username);
                    const safeDate = Utils.escapeHtml(date);

                    if (tid) {
                        return `<div class="reply-to-header mb-2"><i class="fa-solid fa-reply"></i> Reply to <a href="/thread/${Utils.escapeHtml(tid)}?page=${page}#post-${Utils.escapeHtml(pid)}" class="quote-reply-link" title="Jump to floor #${floor}"><span class="quote-author">${safeUsername}</span></a> <span class="text-muted">(${safeDate})</span></div>`;
                    }
                    return `<div class="reply-to-header mb-2"><i class="fa-solid fa-reply"></i> Reply to <span class="quote-author">${safeUsername}</span> <span class="text-muted">(${safeDate})</span></div>`;
                }
            );

            // Parse remaining [pid] inside quote (after reply header is processed)
            quoteParsed = quoteParsed.replace(/\[pid=([^\]]+)\](.*?)\[\/pid\]/g, (m, pidData, text) => {
                const parts = pidData.split(',');
                const pid = parts[0];
                const tid = parts[1] || '';
                const floor = parseInt(parts[2]) || 0;
                const page = Math.floor(floor / 20) + 1;
                const safeText = Utils.escapeHtml(text);

                if (tid) {
                    return `<a href="/thread/${Utils.escapeHtml(tid)}?page=${page}#post-${Utils.escapeHtml(pid)}" class="badge bg-secondary text-decoration-none" title="Jump to floor #${floor}">${safeText}</a>`;
                }
                return `<span class="badge bg-secondary">${safeText}</span>`;
            });

            // Parse [uid] inside quote (after reply header is processed)
            quoteParsed = quoteParsed.replace(/\[uid=(\d+)\](.*?)\[\/uid\]/g, (m, uid, username) => {
                const safeUsername = Utils.escapeHtml(username);
                const safeUid = Utils.escapeHtml(uid);
                return `<span class="badge bg-info text-dark" title="UID: ${safeUid}">${safeUsername}</span>`;
            });

            // Parse [b] tags inside quote
            quoteParsed = quoteParsed.replace(/\[b\]([\s\S]*?)\[\/b\]/g, '<strong>$1</strong>');

            // Return parsed content wrapped in blockquote (quote tags converted to HTML here)
            return `<blockquote class="border-start border-3 border-secondary ps-3 py-2 my-2 bg-light">${quoteParsed}</blockquote>`;
        });

        // Parse text formatting BBCode
        // Bold: [b]...[/b]
        parsed = parsed.replace(/\[b\]([\s\S]*?)\[\/b\]/g, '<strong>$1</strong>');

        // Italic: [i]...[/i]
        parsed = parsed.replace(/\[i\]([\s\S]*?)\[\/i\]/g, '<em>$1</em>');

        // Underline: [u]...[/u]
        parsed = parsed.replace(/\[u\]([\s\S]*?)\[\/u\]/g, '<u>$1</u>');

        // Strikethrough: [del]...[/del]
        parsed = parsed.replace(/\[del\]([\s\S]*?)\[\/del\]/g, '<del>$1</del>');

        // Color: [color=red]...[/color]
        parsed = parsed.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/g, (match, color, text) => {
            const safeColor = Utils.sanitizeColor(color);
            return `<span style="color:${safeColor}">${text}</span>`;
        });

        // Size: [size=14px]...[/size]
        parsed = parsed.replace(/\[size=([^\]]+)\]([\s\S]*?)\[\/size\]/g, (match, size, text) => {
            const safeSize = Utils.sanitizeSize(size);
            return `<span style="font-size:${safeSize}">${text}</span>`;
        });

        // Align: [align=center]...[/align]
        parsed = parsed.replace(/\[align=([^\]]+)\]([\s\S]*?)\[\/align\]/g, (match, align, text) => {
            const safeAlign = Utils.sanitizeAlign(align);
            return `<div style="text-align:${safeAlign}">${text}</div>`;
        });

        // Collapse: [collapse]...[/collapse] or [collapse=title]...[/collapse]
        parsed = parsed.replace(/\[collapse(?:=([^\]]+))?\]([\s\S]*?)\[\/collapse\]/g, (match, title, content) => {
            const summary = title ? Utils.escapeHtml(title) : '已折叠，点击展开';
            return `<details class="collapse-block"><summary>${summary}</summary><div class="collapse-content">${content}</div></details>`;
        });

        // Parse remaining [pid] tags (outside quote/reply-to)
        // Format: [pid=pid,tid,floor]text[/pid]
        parsed = parsed.replace(/\[pid=([^\]]+)\](.*?)\[\/pid\]/g, (match, pidData, text) => {
            const parts = pidData.split(',');
            const pid = parts[0];
            const tid = parts[1] || '';
            const floor = parseInt(parts[2]) || 0;
            const page = Math.floor(floor / 20) + 1;
            const safeText = Utils.escapeHtml(text);

            if (tid) {
                return `<a href="/thread/${Utils.escapeHtml(tid)}?page=${page}#post-${Utils.escapeHtml(pid)}" class="badge bg-secondary text-decoration-none" title="Jump to floor #${floor}">${safeText}</a>`;
            }
            return `<span class="badge bg-secondary">${safeText}</span>`;
        });

        // Parse remaining [uid] tags (outside quote/reply-to)
        parsed = parsed.replace(/\[uid=(\d+)\](.*?)\[\/uid\]/g, (match, uid, username) => {
            const safeUsername = Utils.escapeHtml(username);
            const safeUid = Utils.escapeHtml(uid);
            return `<span class="badge bg-info text-dark" title="UID: ${safeUid}">${safeUsername}</span>`;
        });

        // Parse [url] tags: [url]link[/url] or [url=link]text[/url]
        parsed = parsed.replace(/\[url=([^\]]+)\](.*?)\[\/url\]/g, (match, url, text) => {
            const safeUrl = Utils.escapeHtml(url);
            const safeText = Utils.escapeHtml(text);
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
        });
        parsed = parsed.replace(/\[url\](.*?)\[\/url\]/g, (match, url) => {
            const safeUrl = Utils.escapeHtml(url);
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
        });

        // Parse [img] tags to actual images
        parsed = parsed.replace(/\[img\](.*?)\[\/img\]/g, (match, url) => {
            const cleanUrl = url.replace(/['"<>]/g, ''); // Remove potential XSS chars
            const fullUrl = cleanUrl.startsWith('http') ? cleanUrl : attachPrefix + cleanUrl;
            return `<img src="https://wsrv.nl/?url=${encodeURIComponent(fullUrl)}" class="img-fluid" loading="lazy" alt="Image">`;
        });

        // Parse [flash] video tags (bilibili, youtube, etc)
        parsed = parsed.replace(/\[flash\](.*?)\[\/flash\]/g, (match, url) => {
            const cleanUrl = url.trim();
            // Check if it's a bilibili video
            if (cleanUrl.includes('bilibili.com')) {
                const bvMatch = cleanUrl.match(/\/video\/(BV[a-zA-Z0-9]+)/);
                if (bvMatch) {
                    const bvid = Utils.escapeHtml(bvMatch[1]);
                    return `<div class="ratio ratio-16x9 my-3">
                        <iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
                    </div>`;
                }
            }
            // Fallback: show link
            const safeUrl = Utils.escapeHtml(cleanUrl);
            return `<a href="${safeUrl}" target="_blank" class="btn btn-sm btn-outline-success my-2"><i class="fa-solid fa-circle-play"></i> View Video</a>`;
        });

        // Convert standalone URLs to links (but not URLs in HTML attributes)
        // Split by existing HTML tags to avoid modifying URLs inside tags
        const parts = parsed.split(/(<[^>]+>)/);
        parsed = parts.map((part, index) => {
            // Skip HTML tags (odd indices after split)
            if (part.startsWith('<') && part.endsWith('>')) {
                return part;
            }
            // Convert URLs in text content only
            return part.replace(/(https?:\/\/[^\s<>"]+)/g, (url) => {
                const safeUrl = Utils.escapeHtml(url);
                return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
            });
        }).join('');

        // Convert line breaks
        parsed = parsed.replace(/\n/g, '<br>');

        return parsed || '<p class="text-muted">No content</p>';
    },

    showLoading() {
        const container = document.getElementById('posts-list');
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading posts...</p>
            </div>
        `;
    },

    showError(message) {
        const container = document.getElementById('posts-list');
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h5 class="alert-heading">Error</h5>
                <p>${Utils.escapeHtml(message)}</p>
                <button class="btn btn-sm btn-outline-danger" onclick="ThreadReader.loadPosts()">Retry</button>
            </div>
        `;
    },

    saveThreadToHistory() {
        // Load existing history
        const stored = localStorage.getItem('nga_thread_history');
        let history = stored ? JSON.parse(stored) : [];

        // Check if thread already exists in history
        const existingIndex = history.findIndex(item => item.tid === this.currentTid);
        if (existingIndex >= 0) {
            // Remove existing entry (we'll add it back at the beginning)
            history.splice(existingIndex, 1);
        }

        // Add current thread to beginning of history with RAW Chinese text
        history.unshift({
            tid: this.currentTid,
            subject: this.rawThreadInfo.subject,
            author: this.rawThreadInfo.author,
            forumName: this.rawThreadInfo.forumName,
            titlefont_api: this.rawThreadInfo.titlefont_api,
            timestamp: Date.now()
        });

        // Keep only the 60 most recent threads
        if (history.length > 60) {
            history = history.slice(0, 60);
        }

        // Save back to localStorage
        localStorage.setItem('nga_thread_history', JSON.stringify(history));
    },

    setupBookmarkButton() {
        const btn = document.getElementById('bookmark-btn');
        if (!btn) return;

        // Update button state after thread info loads
        btn.addEventListener('click', () => {
            this.toggleBookmark();
        });

        // Check bookmark state initially (will update when thread loads)
        this.updateBookmarkButton();
    },

    updateBookmarkButton() {
        const btn = document.getElementById('bookmark-btn');
        const icon = btn?.querySelector('i');
        const text = document.getElementById('bookmark-text');

        if (!btn || !icon || !text) return;

        const isBookmarked = this.isThreadBookmarked();

        if (isBookmarked) {
            icon.className = 'fa-solid fa-bookmark';
            text.textContent = 'Bookmarked';
            btn.classList.remove('btn-outline-warning');
            btn.classList.add('btn-warning');
        } else {
            icon.className = 'fa-regular fa-bookmark';
            text.textContent = 'Bookmark';
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-outline-warning');
        }
    },

    isThreadBookmarked() {
        const stored = localStorage.getItem('nga_thread_bookmarks');
        const bookmarks = stored ? JSON.parse(stored) : [];
        return bookmarks.some(b => b.tid === this.currentTid);
    },

    toggleBookmark() {
        if (!this.rawThreadInfo) {
            alert('Please wait for thread to load');
            return;
        }

        const stored = localStorage.getItem('nga_thread_bookmarks');
        let bookmarks = stored ? JSON.parse(stored) : [];

        const existingIndex = bookmarks.findIndex(b => b.tid === this.currentTid);

        if (existingIndex >= 0) {
            // Remove bookmark
            bookmarks.splice(existingIndex, 1);
            localStorage.setItem('nga_thread_bookmarks', JSON.stringify(bookmarks));
            this.updateBookmarkButton();

            // Show notification
            this.showNotification('Bookmark removed', 'info');
        } else {
            // Add bookmark with RAW Chinese text
            bookmarks.unshift({
                tid: this.currentTid,
                subject: this.rawThreadInfo.subject,
                author: this.rawThreadInfo.author,
                forumName: this.rawThreadInfo.forumName,
                titlefont_api: this.rawThreadInfo.titlefont_api,
                timestamp: Date.now()
            });

            localStorage.setItem('nga_thread_bookmarks', JSON.stringify(bookmarks));
            this.updateBookmarkButton();

            // Show notification
            this.showNotification('Thread bookmarked!', 'success');
        }
    },

    showNotification(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
        toast.style.zIndex = '9999';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
};

// Initialize thread reader - use a more robust detection
function initThreadReader() {
    const postsContainer = document.getElementById('posts-list');
    if (postsContainer) {
        ThreadReader.init();
    } else {
        // Retry after a short delay for Svelte to render
        setTimeout(initThreadReader, 100);
    }
}

document.addEventListener('DOMContentLoaded', initThreadReader);

// Also try on load event as backup
window.addEventListener('load', () => {
    const postsContainer = document.getElementById('posts-list');
    if (postsContainer && !ThreadReader.currentTid) {
        ThreadReader.init();
    }
});

window.ThreadReader = ThreadReader;

export default ThreadReader;
