// Central API base URL — reads from .env for deployment flexibility
// Local dev:  .env.local → VITE_API_URL=http://localhost:5000/api
// Production: .env       → VITE_API_URL=http://172.18.162.169:5000/api
// Robust URL resolution: prioritize env var, then current hostname (port 5000), then fallback to localhost
const getApiBase = () => {
    // 1. Check for explicit environment variable (set at build time)
    let url = import.meta.env.VITE_API_URL;

    // 2. If no env var, use relative path if we are on a browser (most common for Docker/Nginx)
    if (!url) {
        if (typeof window !== 'undefined') {
            // Relative path ensures it works through the same port/protocol as the frontend
            url = '/api';
        } else {
            // Fallback for SSR or local dev outside browser
            url = 'http://localhost:5000/api';
        }
    }

    // 3. Ensure absolute URL if needed (some SDKs prefer this)
    if (url && url.startsWith('/') && typeof window !== 'undefined') {
        return window.location.origin + url;
    }

    return url;
};

const API_BASE = getApiBase();

export default API_BASE;
