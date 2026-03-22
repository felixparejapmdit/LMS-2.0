import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/role-permissions`;

const rolePermissionService = {
    getRolesWithPermissions: async (params = {}) => {
        const response = await axios.get(`${API_URL}/roles-with-permissions`, { params });
        return response.data;
    },

    getPermissionsByRole: async (roleId) => {
        const response = await axios.get(`${API_URL}/role/${roleId}`);
        return response.data;
    },

    getRoles: async (params = {}) => {
        const response = await axios.get(`${API_URL}/roles`, { params });
        return response.data;
    },

    createRole: async (data) => {
        const response = await axios.post(`${API_URL}/roles`, data);
        return response.data;
    },

    updateRole: async (id, data) => {
        const response = await axios.put(`${API_URL}/roles/${id}`, data);
        return response.data;
    },

    deleteRole: async (id) => {
        const response = await axios.delete(`${API_URL}/roles/${id}`);
        return response.data;
    },

    updateRolePermissions: async (role_id, permissions) => {
        const response = await axios.post(`${API_URL}/bulk-update`, {
            role_id,
            permissions
        });
        return response.data;
    },
    getSetupStatus: async (dept_id) => {
        const response = await axios.get(`${API_URL}/setup-status`, { params: { dept_id } });
        return response.data;
    }
};

export default rolePermissionService;
