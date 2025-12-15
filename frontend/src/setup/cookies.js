const Cookies = {
  get(name) {
    const pattern = `; ${document.cookie}`;
    const parts = pattern.split(`; ${encodeURIComponent(name)}=`);
    if (parts.length === 2) {
      const value = parts.pop().split(';').shift();
      return decodeURIComponent(value);
    }
    return undefined;
  },

  set(name, value, options = {}) {
    const opts = { path: '/', ...options };
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (opts.expires) {
      const expires = typeof opts.expires === 'number'
        ? new Date(Date.now() + opts.expires * 864e5)
        : opts.expires;
      cookie += `; expires=${expires.toUTCString()}`;
    }

    if (opts.path) cookie += `; path=${opts.path}`;
    if (opts.domain) cookie += `; domain=${opts.domain}`;
    if (opts.secure) cookie += '; Secure';
    if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;

    document.cookie = cookie;
  },

  remove(name, options = {}) {
    this.set(name, '', { ...options, expires: -1 });
  }
};

window.Cookies = Cookies;
export default Cookies;
