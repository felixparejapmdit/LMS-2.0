import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = API_BASE;

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
    },
    assignSpecificSection: async (deptId, sectionCode) => {
        const response = await axios.post(`${API_URL}/sections/assign-section`, { deptId, sectionCode });
        return response.data;
    },
    unassignSection: async (sectionCode) => {
        const response = await axios.post(`${API_URL}/sections/unassign-section`, { sectionCode });
        return response.data;
    }
};

export default sectionService;
