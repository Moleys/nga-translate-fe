// Auth Utility - Manage NGA authentication (using js-cookie)
const AuthUtil = {
    getAuth() {
        const access_uid = Cookies.get('nga_access_uid');
        const access_token = Cookies.get('nga_access_token');
        const app_id = Cookies.get('nga_app_id');

        if (access_uid && access_token) {
            return {
                access_uid: access_uid,
                access_token: access_token,
                app_id: app_id || '1010'
            };
        }

        return null;
    },

    isLoggedIn() {
        const auth = this.getAuth();
        return auth !== null;
    },

    getAuthHeaders() {
        const auth = this.getAuth();
        if (!auth) return {};

        return {
            'X-USER-AGENT': 'Nga_Official/90954(Xiaomi POCOPHONE F1;Android 10.0)',
            'X-NGA-VERSION-NAME': '9.9.54',
            'X-NGA-VERSION-CODE': '90954',
            'X-NGA-CHANNEL': 'YINGYONGBAO'
        };
    },

    getAuthParams() {
        const auth = this.getAuth();
        if (!auth) return {};

        return {
            access_uid: auth.access_uid,
            access_token: auth.access_token,
            app_id: auth.app_id || '1010',
            __output: '14',
            __inchst: 'utf-8'
        };
    },

    buildAuthUrl(baseUrl, extraParams = {}) {
        const auth = this.getAuth();
        if (!auth) return baseUrl;

        const params = new URLSearchParams({
            ...this.getAuthParams(),
            ...extraParams
        });

        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}${params.toString()}`;
    },

    async fetchWithAuth(url, options = {}) {
        const auth = this.getAuth();
        if (!auth) {
            throw new Error('Not logged in. Please login first.');
        }

        const authHeaders = this.getAuthHeaders();
        const authParams = this.getAuthParams();

        // Merge headers
        const headers = {
            ...authHeaders,
            ...options.headers
        };

        // For POST requests, add auth params to body
        if (options.method === 'POST') {
            const formData = new URLSearchParams();

            // Add auth params
            Object.entries(authParams).forEach(([key, value]) => {
                formData.append(key, value);
            });

            // Add custom params from options
            if (options.body) {
                if (typeof options.body === 'string') {
                    // Parse existing URLSearchParams
                    const existingParams = new URLSearchParams(options.body);
                    existingParams.forEach((value, key) => {
                        formData.append(key, value);
                    });
                } else if (options.body instanceof URLSearchParams) {
                    options.body.forEach((value, key) => {
                        formData.append(key, value);
                    });
                } else if (typeof options.body === 'object') {
                    Object.entries(options.body).forEach(([key, value]) => {
                        formData.append(key, value);
                    });
                }
            }

            options.body = formData.toString();
            headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        } else {
            // For GET requests, add auth params to URL
            const separator = url.includes('?') ? '&' : '?';
            const params = new URLSearchParams(authParams);
            url = `${url}${separator}${params.toString()}`;
        }

        return fetch(url, {
            ...options,
            headers
        });
    },

    clearAuth() {
        try {
            Cookies.remove('nga_access_uid');
            Cookies.remove('nga_access_token');
            Cookies.remove('nga_app_id');
            Cookies.remove('nga_auth_saved_at');
            window.dispatchEvent(new Event('nga_auth_updated'));
        } catch (error) {
            console.error('[Auth] Failed to clear auth:', error);
        }
    }
};

// Update navbar login status
function updateNavbarAuthStatus() {
    const isLoggedIn = AuthUtil.isLoggedIn();
    const auth = AuthUtil.getAuth();

    // Find or create auth status element in navbar
    const navbar = document.querySelector('.navbar-nav');
    if (!navbar) return;

    let authStatus = document.getElementById('navbar-auth-status');
    if (!authStatus) {
        authStatus = document.createElement('li');
        authStatus.id = 'navbar-auth-status';
        authStatus.className = 'nav-item';
        navbar.appendChild(authStatus);
    }

    if (isLoggedIn) {
        authStatus.innerHTML = `
            <a class="nav-link" href="/login" title="User ID: ${auth.access_uid}">
                <i class="fa-solid fa-user-check text-success"></i> 
            </a>
        `;
    } else {
        authStatus.innerHTML = `
            <a class="nav-link" href="/login">
                <i class="fa-solid fa-user-xmark text-warning"></i> 
            </a>
        `;
    }
}

// Initialize auth status on page load
document.addEventListener('DOMContentLoaded', updateNavbarAuthStatus);

// Update auth status when credentials change
window.addEventListener('nga_auth_updated', updateNavbarAuthStatus);

window.AuthUtil = AuthUtil;
window.updateNavbarAuthStatus = updateNavbarAuthStatus;

export { AuthUtil, updateNavbarAuthStatus };
