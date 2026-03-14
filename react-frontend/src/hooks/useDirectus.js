import { createDirectus, rest, authentication, readMe } from "@directus/sdk";

// Robust URL resolution: prioritize env var, then current hostname, then fallback to localhost
const getDirectusUrl = () => {
    const url = import.meta.env.VITE_DIRECTUS_URL || '/directus';

    // Directus SDK `createDirectus(url)` fails if url is relative because it uses `new URL()`
    if (url.startsWith('/') && typeof window !== 'undefined') {
        return window.location.origin + url;
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
