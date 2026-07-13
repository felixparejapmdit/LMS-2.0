const axios = require('axios');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientDirectusError = (error) => {
  const status = error?.response?.status;
  const code = String(error?.code || "").toUpperCase();
  return (
    [429, 500, 502, 503, 504].includes(status) ||
    ["ECONNREFUSED", "ECONNABORTED", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"].includes(code)
  );
};

const retryDirectusValidation = async (operation, attempts = 3, baseDelayMs = 300) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientDirectusError(error)) throw error;
      await sleep(baseDelayMs * attempt);
    }
  }
  throw lastError;
};

/**
 * Middleware to check if the incoming request is authenticated.
 * It checks for a valid Authorization Bearer Token or Session Cookie from Directus.
 */
const ensureAuthenticated = async (req, res, next) => {
    try {
        let authHeader = req.headers.authorization;
        const cookieHeader = req.headers.cookie;

        if (!authHeader && req.query.token) {
            authHeader = `Bearer ${req.query.token}`;
        }

        // Express `req.path` may vary depending on mount points, so check a few variants.
        const pathToCheck = (req.path || req.url || '').split('?')[0];
        const originalPathToCheck = (req.originalUrl || '').split('?')[0];
        const method = (req.method || '').toUpperCase();

        // Whitelisted paths and methods for guest portal operations
        const isGuestPath =
            method === 'OPTIONS' ||
            ((pathToCheck === '/departments' || originalPathToCheck.endsWith('/departments')) && method === 'GET') ||
            ((pathToCheck === '/letter-kinds' || originalPathToCheck.endsWith('/letter-kinds')) && method === 'GET') ||
            ((pathToCheck === '/attachments' || originalPathToCheck.endsWith('/attachments')) && method === 'GET') ||
            ((pathToCheck === '/app-settings' || originalPathToCheck.endsWith('/app-settings')) && method === 'GET') ||
            ((pathToCheck === '/letters/preview/ids' || originalPathToCheck.endsWith('/letters/preview/ids')) && method === 'GET') ||
            ((pathToCheck === '/letters/track' || pathToCheck === '/track' || originalPathToCheck.endsWith('/letters/track')) && method === 'GET') ||
            ((pathToCheck === '/persons/search' || originalPathToCheck.endsWith('/persons/search')) && method === 'GET') ||
            ((pathToCheck === '/letters/summary-suggestions' || originalPathToCheck.endsWith('/letters/summary-suggestions')) && method === 'GET') ||
            ((pathToCheck === '/attachments/upload' || originalPathToCheck.endsWith('/attachments/upload')) && method === 'POST') ||
            ((pathToCheck === '/letters' || originalPathToCheck.endsWith('/letters')) && method === 'POST');

        if (!authHeader && !cookieHeader) {
            if (isGuestPath) {
                req.user = { id: null, first_name: "Guest", last_name: "User", username: "guest" };
                return next();
            }

            return res.status(401).json({ error: "Unauthorized access. Please log in first." });
        }

        // Use the internal Directus URL for docker communication, or localhost fallback
        const directusUrl = process.env.DIRECTUS_INTERNAL_URL || 'http://localhost:8055';

        // Forward headers to Directus to validate token/session
        const response = await retryDirectusValidation(() =>
            axios.get(`${directusUrl}/users/me`, {
                headers: {
                    ...(authHeader && { Authorization: authHeader }),
                    ...(cookieHeader && { Cookie: cookieHeader })
                }
            }),
        );

        // If Directus responds with user data, the token/session is valid
        if (response.data && response.data.data) {
            req.user = response.data.data; // Attach user info to the request
            return next();
        } else {
            if (isGuestPath) {
                req.user = { id: null, first_name: "Guest", last_name: "User", username: "guest" };
                return next();
            }
            return res.status(401).json({ error: "Unauthorized access. Please log in first." });
        }
    } catch (error) {
        const pathToCheck = (req.path || req.url || '').split('?')[0];
        const originalPathToCheck = (req.originalUrl || '').split('?')[0];
        const method = (req.method || '').toUpperCase();
        const isGuestPath =
            method === 'OPTIONS' ||
            ((pathToCheck === '/departments' || originalPathToCheck.endsWith('/departments')) && method === 'GET') ||
            ((pathToCheck === '/letter-kinds' || originalPathToCheck.endsWith('/letter-kinds')) && method === 'GET') ||
            ((pathToCheck === '/attachments' || originalPathToCheck.endsWith('/attachments')) && method === 'GET') ||
            ((pathToCheck === '/app-settings' || originalPathToCheck.endsWith('/app-settings')) && method === 'GET') ||
            ((pathToCheck === '/letters/preview/ids' || originalPathToCheck.endsWith('/letters/preview/ids')) && method === 'GET') ||
            ((pathToCheck === '/letters/track' || pathToCheck === '/track' || originalPathToCheck.endsWith('/letters/track')) && method === 'GET') ||
            ((pathToCheck === '/persons/search' || originalPathToCheck.endsWith('/persons/search')) && method === 'GET') ||
            ((pathToCheck === '/letters/summary-suggestions' || originalPathToCheck.endsWith('/letters/summary-suggestions')) && method === 'GET') ||
            ((pathToCheck === '/attachments/upload' || originalPathToCheck.endsWith('/attachments/upload')) && method === 'POST') ||
            ((pathToCheck === '/letters' || originalPathToCheck.endsWith('/letters')) && method === 'POST');

        // Directus will return 401 if the token/cookie is invalid or expired
        if (error.response && error.response.status === 401) {
            if (isGuestPath) {
                req.user = { id: null, first_name: "Guest", last_name: "User", username: "guest" };
                return next();
            }

            return res.status(401).json({ error: "Unauthorized access. Please log in first." });
        }

        if (isTransientDirectusError(error)) {
            console.error('[AUTH ERROR] Directus unavailable during validation:', error.message);
            return res.status(503).json({
                error: "Authentication service temporarily unavailable. Please try again."
            });
        }
        
        console.error('[AUTH ERROR] Validation failed:', error.message);
        if (isGuestPath) {
            req.user = { id: null, first_name: "Guest", last_name: "User", username: "guest" };
            return next();
        }
        return res.status(401).json({ error: "Unauthorized access. Please log in first." });
    }
};

module.exports = { ensureAuthenticated };
