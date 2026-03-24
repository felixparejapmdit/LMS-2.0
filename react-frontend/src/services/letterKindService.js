import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/letter-kinds`;

const letterKindService = {
    getAll: async (params = {}) => {
        try {
            const options = {
                params: (params && typeof params === 'object') ? params : {}
            };
            const response = await axios.get(API_URL, options);
            return response.data;
        } catch (error) {
            console.error('Error in letterKindService.getAll:', error.message);
            throw error;
        }
    },
    getById: async (id) => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },
    create: async (data) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    }
};

export default letterKindService;
