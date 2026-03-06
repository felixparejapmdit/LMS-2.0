import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/system-pages`;
const SYNCED_PAGES_CACHE_KEY = 'synced_system_pages_v1';

const normalizePageId = (value = '') => value.toString().trim().toLowerCase();
const isBrowser = typeof window !== 'undefined';

const readSyncedPageIds = () => {
    if (!isBrowser) return new Set();
    try {
        const raw = sessionStorage.getItem(SYNCED_PAGES_CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
};

const syncedPageIds = readSyncedPageIds();
const pendingPageIds = new Set();

const persistSyncedPageIds = () => {
    if (!isBrowser) return;
    try {
        sessionStorage.setItem(SYNCED_PAGES_CACHE_KEY, JSON.stringify([...syncedPageIds]));
    } catch {
        // Ignore storage errors
    }
};

const markPagesSynced = (pageIds = []) => {
    pageIds.forEach((id) => {
        if (!id) return;
        syncedPageIds.add(normalizePageId(id));
        pendingPageIds.delete(normalizePageId(id));
    });
    persistSyncedPageIds();
};

const getUnsyncedPages = (pages = []) => {
    const deduped = new Map();
    pages.forEach((page) => {
        const pageId = normalizePageId(page?.page_id);
        if (!pageId) return;
        if (syncedPageIds.has(pageId) || pendingPageIds.has(pageId)) return;
        deduped.set(pageId, { ...page, page_id: page.page_id.toString().trim() });
    });
    return [...deduped.values()];
};

const systemPageService = {
    getAll: async () => {
        const response = await axios.get(API_URL);
        return response.data;
    },

    syncPages: async (pages) => {
        if (!Array.isArray(pages) || pages.length === 0) return [];
        const unsyncedPages = getUnsyncedPages(pages);
        if (unsyncedPages.length === 0) return [];

        unsyncedPages.forEach((page) => pendingPageIds.add(normalizePageId(page.page_id)));
        try {
            const response = await axios.post(`${API_URL}/sync`, { pages: unsyncedPages });
            markPagesSynced(unsyncedPages.map((page) => page.page_id));
            return response.data;
        } catch (error) {
            unsyncedPages.forEach((page) => pendingPageIds.delete(normalizePageId(page.page_id)));
            throw error;
        }
    },

    ensurePage: async (page) => {
        if (!page?.page_id) return null;
        const normalizedId = normalizePageId(page.page_id);
        if (syncedPageIds.has(normalizedId) || pendingPageIds.has(normalizedId)) return null;

        pendingPageIds.add(normalizedId);
        try {
            const response = await axios.post(API_URL, page);
            markPagesSynced([page.page_id]);
            return response.data;
        } catch (error) {
            pendingPageIds.delete(normalizedId);
            throw error;
        }
    },

    create: async (data) => {
        const response = await axios.post(API_URL, data);
        if (data?.page_id) markPagesSynced([data.page_id]);
        return response.data;
    },

    delete: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    }
};

export default systemPageService;
