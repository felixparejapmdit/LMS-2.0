import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || '`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}'}/role-permissions`;

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
