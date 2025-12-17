import './app.css';
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.min.js';
// Expose bootstrap globally for legacy code
window.bootstrap = bootstrap;

// Import Tesseract.js for OCR functionality
import Tesseract from 'tesseract.js';
window.Tesseract = Tesseract;

import './setup/api.js';
import './setup/cookies.js';

import './legacy/config.js';
import './legacy/utils.js';
import './legacy/translate.js';
import './legacy/emoticons.js';
import './legacy/PhienAm.js';
import './legacy/auth.js';
import './legacy/main.js';
import './legacy/favorite-forums.js';
import './legacy/forum-list.js';
import './legacy/forum-page.js';
import './legacy/forum-cache.js';
import './legacy/forum.js';
import './legacy/history-page.js';
import './legacy/bookmarks-page.js';
import './legacy/login.js';
import './legacy/glossary.js';
import './legacy/search.js';
import './legacy/read.js';
import './legacy/pwa.js';

import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
