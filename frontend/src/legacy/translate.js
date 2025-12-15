// BBCode Preprocessor - Extract text segments separately from BBCode tags
const BBCodeTranslator = {
    prepareBBCodeForTranslation(content) {
        if (!content) return {textSegments: [], structure: [], emptyLines: []};

        // FIRST: Remove [style] TAGS but keep text inside (using shared utility)
        content = Utils.removeStyleBlocks(content);

        // Also remove [fixsize] and [comment] blocks entirely (including content)
        content = content.replace(/\[fixsize[^\]]*\]/gi, '');
        content = content.replace(/\[comment[^\]]*\][\s\S]*?\[\/comment\]/gi, '');

        // First, extract and store empty line positions
        const lines = content.split('\n');
        const emptyLines = [];
        lines.forEach((line, idx) => {
            if (line.trim() === '') {
                emptyLines.push(idx);
            }
        });

        // Remove empty lines for translation
        let prepared = lines.filter(line => line.trim() !== '').join('\n');

        const textSegments = [];
        const structure = [];
        let currentIndex = 0;

        // Define BBCode patterns (order matters - match longer patterns first)
        const patterns = [
            // HTML tags with URLs - do NOT translate (case-insensitive for video)
            // Match OUTER span first, which contains video tag inside
            {regex: /<span\s+class="video">.*?<\/span>/gsi, translatable: false},
            // Standalone video tags (not wrapped in span)
            {regex: /<video[^>]*>.*?<\/video>/gsi, translatable: false},
            {regex: /<img[^>]*>/gi, translatable: false},
            {regex: /<a[^>]*>.*?<\/a>/gsi, translatable: false},
            {regex: /<source[^>]*>/gi, translatable: false},

            // Complex BBCode with content that should NOT be translated
            {regex: /\[img\].*?\[\/img\]/g, translatable: false},
            {regex: /\[flash\].*?\[\/flash\]/g, translatable: false},

            // NOTE: [style], [fixsize], [comment] already removed above
            // NOTE: [url] tags are handled by parseContent() AFTER translation

            // BBCode with parameters - split to translate text only
            {regex: /\[url=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/url\]/g, translatable: false},
            {regex: /\[pid=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/pid\]/g, translatable: false},
            {regex: /\[uid=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/uid\]/g, translatable: false},
            {regex: /\[tid=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/tid\]/g, translatable: false},
            {regex: /\[color=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/color\]/g, translatable: false},
            {regex: /\[size=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/size\]/g, translatable: false},
            {regex: /\[align=([^\]]+)\]/g, translatable: false},
            {regex: /\[\/align\]/g, translatable: false},
            {regex: /\[collapse(?:=([^\]]+))?\]/g, translatable: false},
            {regex: /\[\/collapse\]/g, translatable: false},

            // Simple formatting tags
            {regex: /\[b\]/g, translatable: false},
            {regex: /\[\/b\]/g, translatable: false},
            {regex: /\[i\]/g, translatable: false},
            {regex: /\[\/i\]/g, translatable: false},
            {regex: /\[u\]/g, translatable: false},
            {regex: /\[\/u\]/g, translatable: false},
            {regex: /\[del\]/g, translatable: false},
            {regex: /\[\/del\]/g, translatable: false},
            {regex: /\[quote\]/g, translatable: false},
            {regex: /\[\/quote\]/g, translatable: false},

            // Emoticons
            {regex: /\[s:([^:]+):([^\]]+)\]/g, translatable: false}
        ];

        // Find all BBCode tags and their positions
        const allMatches = [];
        patterns.forEach(pattern => {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;
            while ((match = regex.exec(prepared)) !== null) {
                allMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    value: match[0],
                    translatable: pattern.translatable
                });
            }
        });

        // Sort matches by position
        allMatches.sort((a, b) => a.start - b.start);

        // Remove overlapping matches (keep first/longest match)
        const filteredMatches = [];
        let lastEnd = 0;
        allMatches.forEach(match => {
            // Skip if this match overlaps with previous match
            if (match.start < lastEnd) {
                return;
            }
            filteredMatches.push(match);
            lastEnd = match.end;
        });

        // Build structure: alternate between text and tags
        lastEnd = 0;
        filteredMatches.forEach(match => {
            // Text before this tag
            if (match.start > lastEnd) {
                const text = prepared.substring(lastEnd, match.start);
                if (text) {
                    structure.push({type: 'text', index: textSegments.length});
                    textSegments.push(text);
                }
            }

            // The tag itself
            structure.push({type: 'tag', value: match.value});
            lastEnd = match.end;
        });

        // Remaining text after last tag
        if (lastEnd < prepared.length) {
            const text = prepared.substring(lastEnd);
            if (text) {
                structure.push({type: 'text', index: textSegments.length});
                textSegments.push(text);
            }
        }

        return {textSegments, structure, emptyLines};
    },

    restoreBBCodeAfterTranslation(translatedSegments, structure, emptyLines) {
        if (!structure || !translatedSegments) return '';

        let result = '';

        // Reconstruct from structure
        structure.forEach(item => {
            if (item.type === 'tag') {
                result += item.value;
            } else if (item.type === 'text') {
                result += translatedSegments[item.index] || '';
            }
        });

        // Restore empty lines
        if (emptyLines && emptyLines.length > 0) {
            const lines = result.split('\n');
            emptyLines.forEach(lineIdx => {
                if (lineIdx <= lines.length) {
                    lines.splice(lineIdx, 0, '');
                }
            });
            result = lines.join('\n');
        }

        return result;
    }
};

// Translation Utility - VietPhrase API Integration
const TranslationUtil = {
    enabled: true, // Default: translation ON
    translating: false,

    init() {
        // Load translation preference
        const saved = localStorage.getItem('nga_translation_enabled');
        this.enabled = saved !== null ? saved === 'true' : true;

        // Setup toggle button
        this.setupToggleButton();

        // Start translation if enabled
        if (this.enabled) {
            this.updateToggleButton();
        }
    },

    formatTranslatedText(text) {
        if (!text) return text;

        // Decode HTML entities first
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        let decoded = textarea.value;

        // Split by <br/> or <br> tags
        const lines = decoded.split(/<br\s*\/?>/gi);

        // Process each line: trim and capitalize first character
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return trimmed;

            // Capitalize first character (handle UTF-8 properly)
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        });

        // Join back with <br>
        return formattedLines.join('<br>');
    },

    setupToggleButton() {
        const btn = document.getElementById('translate-toggle');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.enabled = !this.enabled;
            localStorage.setItem('nga_translation_enabled', this.enabled);
            this.updateToggleButton();

            // Reload page to apply translation
            window.location.reload();
        });

        this.updateToggleButton();
    },

    updateToggleButton() {
        const btn = document.getElementById('translate-toggle');
        if (!btn) return;

        if (this.enabled) {
            btn.classList.remove('btn-outline-info');
            btn.classList.add('btn-info');
            btn.title = '';
        } else {
            btn.classList.remove('btn-info');
            btn.classList.add('btn-outline-info');
            btn.title = '';
        }
    },

    async translateVietphrase(texts) {
        if (!texts || texts.length === 0) return [];

        try {
            // Load glossary list from localStorage
            const glossary = (() => {
                try {
                    const raw = localStorage.getItem('nga_glossary');
                    const arr = JSON.parse(raw || '[]');
                    if (Array.isArray(arr)) return arr;
                } catch {}
                return [];
            })();

            // Format texts for VietPhrase API (add glossary along each item)
            const requestBody = texts.map(text => ({ text: text, glossary }));

            const response = await fetch('https://vietphrase.nhimmeo.cf/translate2?api-version=3.0&to=vi&from=zh-Hans', {
                method: 'POST',
                headers: {
                    'User-Agent': 'okhttp/4.9.1',
                    'Accept-Encoding': 'gzip',
                    'Content-Type': 'application/json',
                    'ocp-apim-subscription-key': 'jjj',
                    'content-type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Translation] API Response:', errorText);
                throw new Error(`VietPhrase API error: ${response.status}`);
            }

            const results = await response.json();
            return results;
        } catch (error) {
            console.error('[Translation] API Error:', error);
            return [];
        }
    },

    scanTextNodes(container) {
        const blacklist = ['svg', 'script', 'style', 'img', 'code', 'pre', 'iframe', 'noscript'];
        let nodes = [];
        let texts = [];

        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node;
        while ((node = walker.nextNode())) {
            const parentElement = node.parentNode;

            // Skip blacklisted tags
            if (blacklist.includes(parentElement.nodeName.toLowerCase())) continue;

            // Check ancestors
            let ancestor = parentElement;
            let shouldSkip = false;
            while (ancestor && ancestor !== container) {
                if (blacklist.includes(ancestor.nodeName.toLowerCase())) {
                    shouldSkip = true;
                    break;
                }
                ancestor = ancestor.parentNode;
            }
            if (shouldSkip) continue;

            const text = node.textContent.trim();
            if (!text) continue;

            texts.push(text);
            nodes.push(node);
        }

        return { nodes, texts };
    },

    isInlineElement(node) {
        if (!node || node.nodeType !== 1) return false;
        const inlineTags = new Set([
            'A','SPAN','EM','STRONG','I','B','U','SMALL','SUP','SUB','CODE','KBD','MARK','S','DEL','INS',
            'Q','ABBR','CITE','DFN','TIME','VAR','SAMP','RUBY','RT','RP','WBR','IMG','PICTURE','SVG'
        ]);
        return inlineTags.has(node.nodeName);
    },

    setTextPreserveSpacing(node, value) {
        if (!node) return;
        const original = node.textContent || '';
        const hasLeadingSpace = /^\s/.test(original);
        const hasTrailingSpace = /\s$/.test(original);

        // Extract text and decode HTML entities
        let text = typeof value === 'string' ? value : (value?.translations?.[0]?.text || '');
        if (typeof text !== 'string') text = '';

        // Decode HTML entities (like &#129300; for emojis)
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        text = textarea.value;

        const prev = node.previousSibling;
        const next = node.nextSibling;

        let needsLeading = false;
        let needsTrailing = false;

        if (!/^\s/.test(text)) {
            if (prev) {
                if (prev.nodeType === 1 && this.isInlineElement(prev)) {
                    needsLeading = true;
                } else if (prev.nodeType === 3) {
                    const prevText = prev.textContent || '';
                    if (prevText && !/\s$/.test(prevText)) needsLeading = true;
                }
            }
        }

        if (!/\s$/.test(text)) {
            if (next) {
                if (next.nodeType === 1 && this.isInlineElement(next)) {
                    needsTrailing = true;
                } else if (next.nodeType === 3) {
                    const nextText = next.textContent || '';
                    if (nextText && !/^\s/.test(nextText)) needsTrailing = true;
                }
            }
        }

        let finalText = text;

        if (hasLeadingSpace && !/^\s/.test(finalText)) finalText = ' ' + finalText;
        if (hasTrailingSpace && !/\s$/.test(finalText)) finalText = finalText + ' ';

        if (needsLeading && !/^\s/.test(finalText)) finalText = ' ' + finalText;
        if (needsTrailing && !/\s$/.test(finalText)) finalText = finalText + ' ';

        node.textContent = finalText;
    },

    applyTranslatedText(nodes, translatedResults) {
        translatedResults.forEach((result, idx) => {
            const node = nodes[idx];
            if (!node) return;
            this.setTextPreserveSpacing(node, result);
        });
    },

    async translateContainer(container, batchSize = 50) {
        if (!this.enabled || this.translating) return;

        this.translating = true;
        console.log('[Translation] Starting translation...');

        try {
            const { nodes, texts } = this.scanTextNodes(container);

            if (texts.length === 0) {
                console.log('[Translation] No text to translate');
                this.translating = false;
                return;
            }

            console.log(`[Translation] Found ${texts.length} text nodes`);

            // Batch translation
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchNodes = nodes.slice(i, i + batchSize);

                console.log(`[Translation] Translating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)}`);

                const results = await this.translateVietphrase(batch);

                if (results && results.length > 0) {
                    this.applyTranslatedText(batchNodes, results);
                }

                // Small delay between batches
                if (i + batchSize < texts.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log('[Translation] Complete!');
        } catch (error) {
            console.error('[Translation] Error:', error);
        } finally {
            this.translating = false;
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    TranslationUtil.init();
});

window.BBCodeTranslator = BBCodeTranslator;
window.TranslationUtil = TranslationUtil;

export { BBCodeTranslator, TranslationUtil };
