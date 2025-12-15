// Navbar search form handler
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = searchInput.value.trim();

            if (!keyword) return;

            // Check if keyword is an NGA forum URL
            const forumUrl = parseNgaForumUrl(keyword);
            if (forumUrl) {
                // Redirect to local forum page
                window.location.href = `/forum/${forumUrl.fid}`;
                return;
            }

            // Normal search
            window.location.href = `/search?q=${encodeURIComponent(keyword)}`;
        });
    }
});

/**
 * Parse NGA forum URLs and extract forum ID
 * Supports:
 * - https://ngabbs.com/thread.php?fid=524
 * - https://nga.178.com/thread.php?fid=524
 * - http://ngabbs.com/thread.php?fid=524
 * - ngabbs.com/thread.php?fid=524 (without protocol)
 */
function parseNgaForumUrl(text) {
    // Match NGA forum URL patterns
    const patterns = [
        // With protocol
        /^https?:\/\/(?:www\.)?(?:ngabbs\.com|nga\.178\.com)\/thread\.php\?.*fid=(\d+)/i,
        // Without protocol
        /^(?:www\.)?(?:ngabbs\.com|nga\.178\.com)\/thread\.php\?.*fid=(\d+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return {
                fid: match[1]
            };
        }
    }

    return null;
}

window.parseNgaForumUrl = parseNgaForumUrl;

export { parseNgaForumUrl };
