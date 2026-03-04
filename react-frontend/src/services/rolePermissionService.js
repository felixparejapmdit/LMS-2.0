import axios from 'axios';
import API_BASE from '../config/apiConfig';

const API_URL = `${API_BASE}/role-permissions`;

const rolePermissionService = {
    getRolesWithPermissions: async () => {
        const response = await axios.get(`${API_URL}/roles-with-permissions`);
        return response.data;
    },

    getPermissionsByRole: async (roleId) => {
        const response = await axios.get(`${API_URL}/role/${roleId}`);
        return response.data;
    },

    updateRolePermissions: async (role_id, permissions) => {
        const response = await axios.post(`${API_URL}/bulk-update`, {
            role_id,
            permissions
        });
        return response.data;
    }
};

export default rolePermissionService;
