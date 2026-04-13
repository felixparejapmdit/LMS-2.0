import { createDirectus, rest, authentication, readMe } from "@directus/sdk";

// Robust URL resolution: prioritize env var, then current hostname, then fallback to localhost
const getDirectusUrl = () => {
    let url = import.meta.env.VITE_DIRECTUS_URL || '/directus';

    if ((url === '/directus' || url.startsWith('/')) && typeof window !== 'undefined') {
        return window.location.origin + (url.startsWith('/') ? url : '/' + url);
    }

    return url;
};

export const directusUrl = getDirectusUrl();

export const directus = createDirectus(directusUrl)
    .with(authentication('json', {
        storage: {
            get: () => {
                const data = localStorage.getItem('directus_auth');
                return data ? JSON.parse(data) : null;
            },
            set: (data) => {
                if (data === null) {
                    localStorage.removeItem('directus_auth');
                } else {
                    localStorage.setItem('directus_auth', JSON.stringify(data));
                }
            }
        }
    }))
    .with(rest());

export const getAssetUrl = (assetId, queryParams = "") => {
    if (!assetId) return null;
    
    // Base URL for the asset
    let url = `${directusUrl}/assets/${assetId}`;
    
    try {
        const raw = localStorage.getItem('directus_auth');
        if (!raw) return url + (queryParams ? (queryParams.startsWith('?') ? queryParams : '?' + queryParams) : '');

        const authData = JSON.parse(raw);
        
        // Robust token extraction (handle various structures: {access_token}, {data: {access_token}}, etc)
        const token = authData.access_token || authData.token || (authData.data && (authData.data.access_token || authData.data.token));
        
        if (token) {
            // Append token as first query param or additional one
            const hasExistingParams = queryParams && queryParams.includes('?');
            const tokenSeparator = hasExistingParams || url.includes('?') ? '&' : '?';
            
            // Build final URL
            if (queryParams) {
                // If queryParams starts with ?, and we already have a ?, we need to change it
                let cleanQuery = queryParams;
                if (cleanQuery.startsWith('?')) {
                    const hasUrlQuery = url.includes('?');
                    cleanQuery = hasUrlQuery ? '&' + cleanQuery.substring(1) : cleanQuery;
                } else if (cleanQuery) {
                    const hasUrlQuery = url.includes('?') || queryParams.includes('?');
                    cleanQuery = hasUrlQuery ? '&' + cleanQuery : '?' + cleanQuery;
                }
                url += cleanQuery;
            }
            
            // Append access token last
            const finalSeparator = url.includes('?') ? '&' : '?';
            url += `${finalSeparator}access_token=${token}`;
            return url;
        }
    } catch (e) {
        console.warn("[getAssetUrl] Failed to process auth data:", e);
    }

    // Default return with optional query params
    const finalQuery = queryParams ? (queryParams.startsWith('?') ? queryParams : '?' + queryParams) : '';
    return url + finalQuery;
};
