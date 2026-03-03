import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}';

class LetterService {
    async getAll() {
        const response = await axios.get(`${API_URL}/letters`);
        return response.data;
    }

    async getById(id) {
        const response = await axios.get(`${API_URL}/letters/${id}`);
        return response.data;
    }

    async create(data) {
        const response = await axios.post(`${API_URL}/letters`, data);
        return response.data;
    }

    async update(id, data) {
        const response = await axios.put(`${API_URL}/letters/${id}`, data);
        return response.data;
    }

    async delete(id) {
        const response = await axios.delete(`${API_URL}/letters/${id}`);
        return response.data;
    }

    async getPreviewIds() {
        try {
            const response = await axios.get(`${API_URL}/letters/preview/ids`);
            return response.data;
        } catch (error) {
            console.error('Error in LetterService.getPreviewIds:', error);
            throw error;
        }
    }
}

export default new LetterService();
