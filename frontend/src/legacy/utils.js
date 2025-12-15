// Shared Utility Functions for NGA Forums Application
const Utils = {
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Convert timestamp to human-readable "time ago" format
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} Formatted time ago string
     */
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
        if (days < 30) {
            const weeks = Math.floor(days / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }

        return new Date(timestamp).toLocaleDateString();
    },

    /**
     * Generate inline style from NGA titlefont_api
     * @param {Object} titlefont_api - Title font styling from API
     * @returns {string} Inline style string
     */
    getTitleStyle(titlefont_api) {
        if (!titlefont_api) return '';

        const styles = [];

        if (titlefont_api.color) {
            styles.push(`color: ${titlefont_api.color} !important`);
        }
        if (titlefont_api.bold) {
            styles.push('font-weight: bold');
        }
        if (titlefont_api.italic) {
            styles.push('font-style: italic');
        }
        if (titlefont_api.underline) {
            styles.push('text-decoration: underline');
        }

        return styles.length > 0 ? `style="${styles.join('; ')}"` : '';
    },

    /**
     * Validate and sanitize CSS color value
     * @param {string} color - Color value from user input
     * @returns {string} Safe color or 'inherit'
     */
    sanitizeColor(color) {
        if (!color) return 'inherit';

        // Allow: hex colors, rgb/rgba, hsl/hsla, named colors
        const COLOR_REGEX = /^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|[a-z]+)$/i;

        return COLOR_REGEX.test(color.trim()) ? color.trim() : 'inherit';
    },

    /**
     * Validate and sanitize CSS size value
     * @param {string} size - Size value from user input
     * @returns {string} Safe size or '1em'
     */
    sanitizeSize(size) {
        if (!size) return '1em';

        // Allow: px, em, rem, %, pt
        const SIZE_REGEX = /^\d+(\.\d+)?(px|em|rem|%|pt)$/i;

        return SIZE_REGEX.test(size.trim()) ? size.trim() : '1em';
    },

    /**
     * Validate and sanitize CSS text-align value
     * @param {string} align - Align value from user input
     * @returns {string} Safe align or 'left'
     */
    sanitizeAlign(align) {
        if (!align) return 'left';

        const VALID_ALIGNS = ['left', 'center', 'right', 'justify'];

        return VALID_ALIGNS.includes(align.toLowerCase()) ? align.toLowerCase() : 'left';
    },

    /**
     * Remove [style] BBCode tags but preserve inner text content
     * Handles nested [style] tags properly using balanced bracket counting
     * @param {string} content - Content with [style] tags
     * @returns {string} Content with [style] tags removed, text preserved
     */
    removeStyleBlocks(content) {
        if (!content) return content;

        let result = content;
        let maxIterations = 20; // Safety limit for deeply nested tags

        while (result.includes('[style') && maxIterations-- > 0) {
            let pos = 0;
            let modified = false;

            while (pos < result.length) {
                const startIdx = result.indexOf('[style', pos);
                if (startIdx === -1) break;

                // Find end of opening tag
                const openTagEnd = result.indexOf(']', startIdx);
                if (openTagEnd === -1) break;

                // Count nested depth using balanced bracket algorithm
                let depth = 1;
                let searchPos = openTagEnd + 1;

                while (searchPos < result.length && depth > 0) {
                    const nextStyle = result.indexOf('[style', searchPos);
                    const nextClose = result.indexOf('[/style]', searchPos);

                    if (nextClose === -1) break; // No closing tag found

                    if (nextStyle !== -1 && nextStyle < nextClose) {
                        // Found nested opening tag
                        depth++;
                        searchPos = nextStyle + 6; // '[style'.length
                    } else {
                        // Found closing tag
                        depth--;
                        if (depth === 0) {
                            // Found matching closing tag - extract inner content
                            const innerContent = result.substring(openTagEnd + 1, nextClose);
                            const endPos = nextClose + 8; // '[/style]'.length

                            // Replace [style...]CONTENT[/style] with just CONTENT
                            result = result.substring(0, startIdx) + innerContent + result.substring(endPos);
                            modified = true;
                            break;
                        }
                        searchPos = nextClose + 8;
                    }
                }

                if (!modified) {
                    pos = openTagEnd + 1;
                } else {
                    pos = startIdx; // Restart from current position for nested tags
                }
            }

            if (!modified) break; // No more [style] tags found
        }

        return result;
    },

    /**
     * Strip all BBCode ([tag], [/tag], [tag=...]) and HTML tags from content
     * Optionally trims whitespace and normalizes line breaks
     * @param {string} content
     * @param {Object} [opts]
     * @param {boolean} [opts.trim=true]
     * @returns {string}
     */
    stripBBCodeAndHtml(content, opts = {}) {
        if (!content) return '';
        const { trim = true } = opts;

        // Remove special blocks first where content should be removed entirely
        let text = String(content);
        // Remove [comment]...[/comment] fully
        text = text.replace(/\[comment[^\]]*\][\s\S]*?\[\/comment\]/gi, '');
        // Remove [fixsize] opening tags
        text = text.replace(/\[fixsize[^\]]*\]/gi, '');
        // Remove media blocks entirely (including their inner URLs/content)
        text = text.replace(/\[img\][\s\S]*?\[\/img\]/gi, '');
        text = text.replace(/\[flash\][\s\S]*?\[\/flash\]/gi, '');
        // Remove [style]...[/style] but keep inner text via existing util
        text = this.removeStyleBlocks(text);
        // Remove emoticons like [s:cat:name]
        text = text.replace(/\[s:[^:\]]+:[^\]]+\]/gi, '');

        // Remove all remaining BBCode tags like [b], [/b], [url=...], [img]...[/img]
        text = text.replace(/\[(?:\/)?[a-z0-9_:.-]+(?:=[^\]]*)?\]/gi, '');

        // Remove any residual HTML tags
        text = text.replace(/<[^>]*>/g, '');

        // Remove standalone URLs to avoid polluting raw lines
        text = text.replace(/https?:\/\/\S+/g, '');

        // Decode HTML entities via textarea trick
        try {
            const ta = document.createElement('textarea');
            ta.innerHTML = text;
            text = ta.value;
        } catch {}

        // Normalize line endings
        text = text.replace(/\r\n?/g, '\n');
        // Collapse excessive blank lines to single blanks
        text = text.replace(/\n{3,}/g, '\n\n');
        // Trim spaces around line content
        text = text.split('\n').map(l => l.trim()).join('\n');
        return trim ? text.trim() : text;
    }
};

// Expose globally for legacy consumers
window.Utils = Utils;
export default Utils;
