// Central API base URL — reads from .env for deployment flexibility
// Local dev:  .env.local → VITE_API_URL=http://localhost:5000/api
// Production: .env       → VITE_API_URL=http://172.18.162.169:5000/api
// Robust URL resolution: prioritize env var, then current hostname (port 5000), then fallback to localhost
const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return '/api';
    }
    return 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

export default API_BASE;
