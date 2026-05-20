const axios = require('axios');

/**
 * Middleware to check if the incoming request is authenticated.
 * It checks for a valid Authorization Bearer Token or Session Cookie from Directus.
 */
const ensureAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const cookieHeader = req.headers.cookie;

        if (!authHeader && !cookieHeader) {
            const pathToCheck = (req.path || req.url || '').split('?')[0];
            
            // Whitelisted paths and methods for guest portal operations
            const isGuestPath = 
                (pathToCheck === '/departments' && req.method === 'GET') ||
                (pathToCheck === '/letter-kinds' && req.method === 'GET') ||
                (pathToCheck === '/attachments' && req.method === 'GET') ||
                (pathToCheck === '/letters/preview/ids' && req.method === 'GET') ||
                (pathToCheck === '/persons/search' && req.method === 'GET') ||
                (pathToCheck === '/letters/summary-suggestions' && req.method === 'GET') ||
                (pathToCheck === '/attachments/upload' && req.method === 'POST') ||
                (pathToCheck === '/letters' && req.method === 'POST');

            if (isGuestPath) {
                req.user = { id: null, first_name: "Guest", last_name: "User", username: "guest" };
                return next();
            }

            return res.status(401).json({ error: "Unauthorized access. Please log in first." });
        }

        // Use the internal Directus URL for docker communication, or localhost fallback
        const directusUrl = process.env.DIRECTUS_INTERNAL_URL || 'http://localhost:8055';

        // Forward headers to Directus to validate token/session
        const response = await axios.get(`${directusUrl}/users/me`, {
            headers: {
                ...(authHeader && { Authorization: authHeader }),
                ...(cookieHeader && { Cookie: cookieHeader })
            }
        });

        // If Directus responds with user data, the token/session is valid
        if (response.data && response.data.data) {
            req.user = response.data.data; // Attach user info to the request
            return next();
        } else {
            return res.status(401).json({ error: "Unauthorized access. Please log in first." });
        }
    } catch (error) {
        // Directus will return 401 if the token/cookie is invalid or expired
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ error: "Unauthorized access. Please log in first." });
        }
        
        console.error('[AUTH ERROR] Validation failed:', error.message);
        return res.status(401).json({ error: "Unauthorized access. Please log in first." });
    }
};

module.exports = { ensureAuthenticated };
