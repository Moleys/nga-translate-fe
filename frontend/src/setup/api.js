const API_BASE = 'https://nga.nhimmeo.ovh';
const API_PREFIX = '/api';
const originalFetch = window.fetch.bind(window);

const rewriteUrl = (input) => {
  if (typeof input === 'string') {
    if (input.startsWith(API_PREFIX + '/')) {
      return `${API_BASE}${input}`;
    }
    return input;
  }

  if (input instanceof Request) {
    const target = new URL(input.url, window.location.origin);
    if (target.pathname.startsWith(API_PREFIX + '/')) {
      const nextUrl = `${API_BASE}${target.pathname}${target.search}`;
      return new Request(nextUrl, input);
    }
  }

  return input;
};

window.fetch = (input, init) => {
  const rewritten = rewriteUrl(input);
  return originalFetch(rewritten, init);
};

window.API_BASE = API_BASE;
