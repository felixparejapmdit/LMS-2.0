import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const sectionService = {
    getRegistry: async () => {
        const response = await axios.get(`${API_URL}/sections/registry`);
        return response.data;
    },
    getOverview: async () => {
        const response = await axios.get(`${API_URL}/sections/overview`);
        return response.data;
    },
    getDeptHistory: async (deptId) => {
        const response = await axios.get(`${API_URL}/sections/dept/${deptId}/history`);
        return response.data;
    },
    forceNewSection: async (deptId) => {
        const response = await axios.post(`${API_URL}/sections/force-new`, { deptId });
        return response.data;
    }
};

export default sectionService;
