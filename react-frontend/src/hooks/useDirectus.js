import { createDirectus, rest, authentication, readMe } from "@directus/sdk";

// Robust URL resolution: prioritize env var, then current hostname, then fallback to localhost
const getDirectusUrl = () => {
    if (import.meta.env.VITE_DIRECTUS_URL) return import.meta.env.VITE_DIRECTUS_URL;

    // If we're in a browser, use relative paths for production so nginx proxy is hit
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return '/directus';
    }

    return "http://localhost:8055";
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
    let url = `${directusUrl}/assets/${assetId}`;
    try {
        const authData = localStorage.getItem("directus_auth");
        if (authData) {
            const { access_token } = JSON.parse(authData);
            if (access_token) {
                // If there's already a query string (e.g. ?width=200), append with &
                const seperator = queryParams.includes('?') || url.includes('?') ? '&' : '?';
                url += `${queryParams}${seperator}access_token=${access_token}`;
                return url;
            }
        }
    } catch (e) {
        // Fallback to anonymous access if parsing fails
    }
    return url + queryParams;
};
