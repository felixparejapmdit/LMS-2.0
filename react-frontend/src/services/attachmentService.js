import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}';

class AttachmentService {
    async getAll() {
        const response = await axios.get(`${API_URL}/attachments`);
        return response.data;
    }

    async create(data) {
        const response = await axios.post(`${API_URL}/attachments`, data);
        return response.data;
    }

    async update(id, data) {
        const response = await axios.put(`${API_URL}/attachments/${id}`, data);
        return response.data;
    }

    async delete(id) {
        const response = await axios.delete(`${API_URL}/attachments/${id}`);
        return response.data;
    }
}

export default new AttachmentService();
