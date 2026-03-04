import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/trays`;

class TrayService {
    async getAllTrays(deptId = null) {
        try {
            const url = deptId ? `${API_URL}?department_id=${deptId}` : API_URL;
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            console.error('Error in TrayService.getAllTrays:', error);
            throw error;
        }
    }

    async getTrayById(id) {
        try {
            const response = await axios.get(`${API_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error in TrayService.getTrayById:', error);
            throw error;
        }
    }

    async createTray(trayData) {
        try {
            const response = await axios.post(API_URL, trayData);
            return response.data;
        } catch (error) {
            console.error('Error in TrayService.createTray:', error);
            throw error;
        }
    }

    async updateTray(id, trayData) {
        try {
            const response = await axios.put(`${API_URL}/${id}`, trayData);
            return response.data;
        } catch (error) {
            console.error('Error in TrayService.updateTray:', error);
            throw error;
        }
    }

    async deleteTray(id) {
        try {
            const response = await axios.delete(`${API_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error in TrayService.deleteTray:', error);
            throw error;
        }
    }
}

export default new TrayService();
