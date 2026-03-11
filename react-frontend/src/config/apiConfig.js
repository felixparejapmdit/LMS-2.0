// Central API base URL — reads from .env for deployment flexibility
// Local dev:  .env.local → VITE_API_URL=http://localhost:5000/api
// Production: .env       → VITE_API_URL=http://172.18.162.169:5000/api
// Robust URL resolution: prioritize env var, then current hostname (port 5000), then fallback to localhost
const getApiBase = () => {
    let url = import.meta.env.VITE_API_URL;

    if (!url) {
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            url = '/api';
        } else {
            url = 'http://localhost:5000/api';
        }
    }

    // SDKs and Axios often need an absolute URL instead of a relative one
    if (url && url.startsWith('/') && typeof window !== 'undefined') {
        return window.location.origin + url;
    }

    return url;
};

const API_BASE = getApiBase();

export default API_BASE;
