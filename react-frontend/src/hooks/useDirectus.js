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
        const raw = localStorage.getItem('directus_auth');
        if (!raw) return url + queryParams;

        const authData = JSON.parse(raw);
        if (authData.pending) {
            // Prevent 403 by not attempting to load authenticated assets while token is resolving
            return null;
        }

        const { access_token } = authData;
        if (access_token) {
            const separator = queryParams.includes('?') || url.includes('?') ? '&' : '?';
            url += `${queryParams}${separator}access_token=${access_token}`;
            return url;
        }
    } catch (e) {
        // Fallback to anonymous
    }
    return url + queryParams;
};
