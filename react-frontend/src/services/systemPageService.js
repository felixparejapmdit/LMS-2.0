import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/system-pages`;

const systemPageService = {
    getAll: async () => {
        const response = await axios.get(API_URL);
        return response.data;
    },

    syncPages: async (pages) => {
        if (!Array.isArray(pages) || pages.length === 0) return [];
        const response = await axios.post(`${API_URL}/sync`, { pages });
        return response.data;
    },

    ensurePage: async (page) => {
        if (!page?.page_id) return null;
        const response = await axios.post(API_URL, page);
        return response.data;
    },

    create: async (data) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    }
};

export default systemPageService;
