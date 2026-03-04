import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/letters`;

class LetterService {
    async getAll() {
        const response = await axios.get(API_URL);
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
}

export default new LetterService();
