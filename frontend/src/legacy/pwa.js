/**
 * PWA Registration and Installation
 */

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000); // Check every hour

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    });
}

// Show update notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'alert alert-info position-fixed bottom-0 start-50 translate-middle-x mb-3';
    notification.style.zIndex = '10000';
    notification.innerHTML = `
        <div class="d-flex align-items-center justify-content-between">
            <div>
                <i class="fa-solid fa-arrow-rotate-right"></i>
                <strong>Update Available</strong>
                <p class="mb-0 small">A new version is available. Refresh to update.</p>
            </div>
            <button class="btn btn-sm btn-success ms-3" onclick="window.location.reload()">
                Refresh
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 30 seconds
    setTimeout(() => {
        notification.remove();
    }, 30000);
}

// Install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Store the event for later use
    deferredPrompt = e;

    // Show custom install button
    showInstallPrompt();
});

function showInstallPrompt() {
    const installButton = document.createElement('button');
    installButton.className = 'btn btn-success position-fixed bottom-0 end-0 m-3';
    installButton.style.zIndex = '10000';
    installButton.innerHTML = '<i class="fa-solid fa-download"></i> Install App';
    installButton.id = 'pwa-install-btn';

    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;

        console.log('[PWA] Install prompt outcome:', outcome);

        // Clear the deferred prompt
        deferredPrompt = null;

        // Remove button
        installButton.remove();
    });

    // Only show if not already installed
    if (!isAppInstalled()) {
        document.body.appendChild(installButton);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (document.getElementById('pwa-install-btn')) {
                installButton.style.opacity = '0';
                setTimeout(() => installButton.remove(), 300);
            }
        }, 10000);
    }
}

// Check if app is already installed
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

// Track app install
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');

    // Hide install button if exists
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.remove();
    }

    // Show success message
    const toast = document.createElement('div');
    toast.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
    toast.style.zIndex = '10000';
    toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> App installed successfully!';

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
});

// Display mode detection
if (isAppInstalled()) {
    console.log('[PWA] Running as installed app');
    document.body.classList.add('pwa-installed');
} else {
    console.log('[PWA] Running in browser');
}

// Online/Offline status
window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    showConnectionStatus('online');
});

window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline');
    showConnectionStatus('offline');
});

function showConnectionStatus(status) {
    const existingToast = document.getElementById('connection-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'connection-toast';
    toast.className = `alert alert-${status === 'online' ? 'success' : 'warning'} position-fixed top-0 start-50 translate-middle-x mt-3`;
    toast.style.zIndex = '10000';

    toast.innerHTML = status === 'online'
        ? '<i class="fa-solid fa-wifi"></i> Back online'
        : '<i class="fa-solid fa-wifi-slash"></i> You are offline';

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

console.log('[PWA] Initialization complete');
