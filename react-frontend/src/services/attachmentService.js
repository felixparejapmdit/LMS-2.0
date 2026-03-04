import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/attachments`;

class AttachmentService {
    async getAll() {
        const response = await axios.get(API_URL);
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
}

export default new AttachmentService();
