// Central API base URL — reads from .env for deployment flexibility
// Set VITE_API_URL in react-frontend/.env to change the server address
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default API_BASE;
