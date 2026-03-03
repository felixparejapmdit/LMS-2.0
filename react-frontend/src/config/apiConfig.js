// Central API base URL — reads from .env for deployment flexibility
// Local dev:  .env.local → VITE_API_URL=http://localhost:5000/api
// Production: .env       → VITE_API_URL=http://172.18.162.169:5000/api
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default API_BASE;
