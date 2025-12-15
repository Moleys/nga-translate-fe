/**
 * NGA Forums Application Configuration
 * Centralized configuration constants
 */

const CONFIG = {
    // Pagination
    POSTS_PER_PAGE: 20,
    THREADS_PER_PAGE: 50,

    // Translation API
    TRANSLATION_API_URL: 'https://vietphrase.nhimmeo.cf/translate2',
    TRANSLATION_API_VERSION: '3.0',
    TRANSLATION_SOURCE_LANG: 'zh-Hans',
    TRANSLATION_TARGET_LANG: 'vi',
    TRANSLATION_BATCH_SIZE: 50,

    // CORS Proxy
    VIDEO_PROXY_URL: 'https://cors.moldich.eu.org/?q=',

    // IntersectionObserver Settings
    SCROLL_TRIGGER_MARGIN: '100px',

    // Storage Limits
    HISTORY_MAX_ITEMS: 60,
    BOOKMARKS_MAX_ITEMS: 100,

    // UI Timing
    NOTIFICATION_DURATION: 2000, // ms
    DEBOUNCE_DELAY: 300, // ms

    // Image Service
    IMAGE_PROXY: 'https://wsrv.nl/',
    THUMBNAIL_SIZE: {
        width: 100,
        height: 100,
        fit: 'cover',
        attention: true
    },

    // NGA API Endpoints
    NGA_BASE_URL: 'https://ngabbs.com',
    NGA_EMOTICON_PATH: '/nuke/post/emotions/default/',

    // Emoticon Categories
    EMOTICON_CATEGORIES: {
        'ac': 'AC (Post Icon)',
        'a2': 'A2 (Special)',
        'acn': 'ACN (Post Icon New)',
        'a4': 'A4 (Unknown)',
        'ais2': 'Aigis (Special)',
        'pt': 'Phantasy Star',
        'ld': 'Ludger (Tales Series)',
        'ac2': 'AC2 (General)',
        'ac3': 'AC3 (General)',
        'a1': 'A1 (Special)',
        'a3': 'A3 (Normal)',
        'acg': 'ACG (Anime/Comic/Game)',
        'ais': 'Aigis (Normal)',
        'ot': 'Other',
        'ac4': 'AC4 (General)',
        'ac5': 'AC5 (General)',
        'ac6': 'AC6 (General)'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.THUMBNAIL_SIZE);
Object.freeze(CONFIG.EMOTICON_CATEGORIES);

window.CONFIG = CONFIG;
export default CONFIG;
