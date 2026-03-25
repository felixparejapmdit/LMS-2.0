import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/letters`;

class LetterService {
    async getAll(params = {}) {
        try {
            const options = {
                params: (params && typeof params === 'object') ? params : {}
            };
            const response = await axios.get(API_URL, options);
            return response.data;
        } catch (error) {
            console.error('Error in LetterService.getAll:', error.message);
            throw error;
        }
    }

    async getByLmsId(lms_id) {
        const response = await axios.get(`${API_URL}/lms-id/${lms_id}`);
        return response.data;
    }

    async getById(id) {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    }

    async create(data) {
        const response = await axios.post(API_URL, data);
        return response.data;
    }

    async update(id, data) {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    }

    async delete(id) {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    }

    async getPreviewIds() {
        try {
            const response = await axios.get(`${API_URL}/preview/ids`);
            return response.data;
        } catch (error) {
            console.error('Error in LetterService.getPreviewIds:', error);
            throw error;
        }
    }

    async getLegacyData(page = 1, limit = 10, search = '') {
        // Direct PHP endpoint as remote MySQL is restricted
        const response = await axios.get(`http://172.18.162.84/api/letters_detailed.php?page=${page}&limit=${limit}&search=${search}`);
        return response.data;
    }
}

export default new LetterService();
