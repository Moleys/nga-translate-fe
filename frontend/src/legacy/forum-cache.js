/**
 * Forum Cache Manager
 * Manages caching of forum data and scroll positions to improve navigation performance
 */

const ForumCache = {
    // Cache keys
    CACHE_PREFIX: 'nga-forum-cache',
    SCROLL_PREFIX: 'nga-forum-scroll',
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    /**
     * Generate cache key for forum
     */
    getCacheKey(fid, act = 'list') {
        return `${this.CACHE_PREFIX}-${fid}-${act}`;
    },

    /**
     * Generate scroll key for forum
     */
    getScrollKey(fid) {
        return `${this.SCROLL_PREFIX}-${fid}`;
    },

    /**
     * Save forum state to cache
     */
    saveForumState(fid, act, state) {
        try {
            const cacheKey = this.getCacheKey(fid, act);
            const cacheData = {
                timestamp: Date.now(),
                state: state,
                fid: fid,
                act: act
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('[ForumCache] Failed to save forum state:', error);
        }
    },

    /**
     * Get cached forum state
     */
    getForumState(fid, act) {
        try {
            const cacheKey = this.getCacheKey(fid, act);
            const cached = sessionStorage.getItem(cacheKey);
            
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            
            // Check if cache is still valid
            if (Date.now() - cacheData.timestamp > this.CACHE_DURATION) {
                this.clearForumState(fid, act);
                return null;
            }

            return cacheData.state;
        } catch (error) {
            console.warn('[ForumCache] Failed to get forum state:', error);
            return null;
        }
    },

    /**
     * Clear cached forum state
     */
    clearForumState(fid, act) {
        try {
            const cacheKey = this.getCacheKey(fid, act);
            sessionStorage.removeItem(cacheKey);
        } catch (error) {
            console.warn('[ForumCache] Failed to clear forum state:', error);
        }
    },

    /**
     * Save scroll position
     */
    saveScrollPosition(fid) {
        try {
            const scrollKey = this.getScrollKey(fid);
            const scrollData = {
                position: window.scrollY || window.pageYOffset,
                timestamp: Date.now()
            };
            sessionStorage.setItem(scrollKey, JSON.stringify(scrollData));
        } catch (error) {
            console.warn('[ForumCache] Failed to save scroll position:', error);
        }
    },

    /**
     * Get saved scroll position
     */
    getScrollPosition(fid) {
        try {
            const scrollKey = this.getScrollKey(fid);
            const cached = sessionStorage.getItem(scrollKey);
            
            if (!cached) return null;

            const scrollData = JSON.parse(cached);
            
            // Check if scroll cache is still valid (within 10 minutes)
            if (Date.now() - scrollData.timestamp > 10 * 60 * 1000) {
                this.clearScrollPosition(fid);
                return null;
            }

            return scrollData.position;
        } catch (error) {
            console.warn('[ForumCache] Failed to get scroll position:', error);
            return null;
        }
    },

    /**
     * Clear scroll position
     */
    clearScrollPosition(fid) {
        try {
            const scrollKey = this.getScrollKey(fid);
            sessionStorage.removeItem(scrollKey);
        } catch (error) {
            console.warn('[ForumCache] Failed to clear scroll position:', error);
        }
    },

    /**
     * Restore scroll position
     */
    restoreScrollPosition(fid) {
        const position = this.getScrollPosition(fid);
        if (position !== null) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                window.scrollTo({
                    top: position,
                    behavior: 'instant'
                });
                console.log('[ForumCache] Restored scroll position:', position);
            }, 100);
            return true;
        }
        return false;
    },

    /**
     * Clear all forum caches (useful for cleanup)
     */
    clearAll() {
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_PREFIX) || key.startsWith(this.SCROLL_PREFIX)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('[ForumCache] Failed to clear all caches:', error);
        }
    }
};

// Export for use in other modules
window.ForumCache = ForumCache;

