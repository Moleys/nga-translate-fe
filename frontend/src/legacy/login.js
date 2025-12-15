// Login Page - Handle NGA authentication credentials (using js-cookie)
const LoginPage = {
    init() {
        this.loadExistingCredentials();
        this.setupFormHandlers();
        this.updateLoginStatus();
    },

    loadExistingCredentials() {
        const access_uid = Cookies.get('nga_access_uid');
        const access_token = Cookies.get('nga_access_token');
        const app_id = Cookies.get('nga_app_id') || '1010';

        if (access_uid) {
            document.getElementById('access_uid').value = access_uid;
        }
        if (access_token) {
            document.getElementById('access_token').value = access_token;
        }
        if (app_id) {
            document.getElementById('app_id').value = app_id;
        }
    },

    setupFormHandlers() {
        const form = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCredentials();
        });

        logoutBtn.addEventListener('click', () => {
            this.clearCredentials();
        });
    },

    saveCredentials() {
        const access_uid = document.getElementById('access_uid').value.trim();
        const access_token = document.getElementById('access_token').value.trim();
        const app_id = document.getElementById('app_id').value.trim();

        if (!access_uid || !access_token || !app_id) {
            this.showStatus('Please fill in all required fields', 'danger');
            return;
        }

        try {
            // Save to cookies (1 year expiry)
            Cookies.set('nga_access_uid', access_uid, { expires: 365, sameSite: 'Lax' });
            Cookies.set('nga_access_token', access_token, { expires: 365, sameSite: 'Lax' });
            Cookies.set('nga_app_id', app_id, { expires: 365, sameSite: 'Lax' });
            Cookies.set('nga_auth_saved_at', Date.now(), { expires: 365, sameSite: 'Lax' });

            this.showStatus('Credentials saved successfully!', 'success');
            this.updateLoginStatus();

            // Dispatch event for other modules to update
            window.dispatchEvent(new Event('nga_auth_updated'));
        } catch (error) {
            this.showStatus('Failed to save credentials: ' + error.message, 'danger');
        }
    },

    clearCredentials() {
        if (confirm('Are you sure you want to clear all saved credentials?')) {
            try {
                // Delete cookies
                Cookies.remove('nga_access_uid');
                Cookies.remove('nga_access_token');
                Cookies.remove('nga_app_id');
                Cookies.remove('nga_auth_saved_at');

                // Clear form
                document.getElementById('access_uid').value = '';
                document.getElementById('access_token').value = '';
                document.getElementById('app_id').value = '1010';

                this.showStatus('Credentials cleared successfully', 'info');
                this.updateLoginStatus();

                // Dispatch event
                window.dispatchEvent(new Event('nga_auth_updated'));
            } catch (error) {
                this.showStatus('Failed to clear credentials: ' + error.message, 'danger');
            }
        }
    },

    getAuth() {
        const access_uid = Cookies.get('nga_access_uid');
        const access_token = Cookies.get('nga_access_token');
        const app_id = Cookies.get('nga_app_id');
        const saved_at = Cookies.get('nga_auth_saved_at');

        if (access_uid && access_token) {
            return {
                access_uid: access_uid,
                access_token: access_token,
                app_id: app_id || '1010',
                saved_at: saved_at ? parseInt(saved_at) : null
            };
        }

        return null;
    },

    updateLoginStatus() {
        const auth = this.getAuth();
        const statusDiv = document.getElementById('login-status');

        if (auth) {
            const savedDate = auth.saved_at ? new Date(auth.saved_at).toLocaleString() : 'Unknown';
            statusDiv.className = 'alert alert-success';
            statusDiv.innerHTML = `
                <i class="fa-solid fa-circle-check"></i> <strong>Logged in</strong>
                <div class="small mt-1">
                    User ID: <code>${Utils.escapeHtml(auth.access_uid)}</code><br>
                    Token: <code>${this.maskToken(auth.access_token)}</code><br>
                    Saved: ${savedDate}
                </div>
            `;
        } else {
            statusDiv.className = 'alert alert-warning';
            statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Not logged in</strong> - Enter your credentials below';
        }
    },

    showStatus(message, type) {
        const statusDiv = document.getElementById('login-status');
        statusDiv.className = `alert alert-${type}`;
        statusDiv.textContent = message;
        statusDiv.classList.remove('d-none');

        // Auto hide after 3 seconds
        setTimeout(() => {
            statusDiv.classList.add('d-none');
        }, 3000);
    },

    maskToken(token) {
        if (!token) return '';
        if (token.length <= 8) return token;
        return token.substring(0, 6) + '...' + token.substring(token.length - 6);
    }
};

// Initialize login page
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        LoginPage.init();
    }
});
