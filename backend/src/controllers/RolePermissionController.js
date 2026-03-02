const { RolePermission, Role } = require('../models/associations');

class RolePermissionController {
    static async getAll(req, res) {
        try {
            const results = await RolePermission.findAll({
                include: [{ model: Role }]
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getByRole(req, res) {
        try {
            const results = await RolePermission.findAll({
                where: { role_id: req.params.roleId }
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateMultiple(req, res) {
        try {
            const { role_id, permissions } = req.body;

            // Basic validation
            if (!role_id || !Array.isArray(permissions)) {
                return res.status(400).json({ error: 'Invalid payload' });
            }

            // Upsert permissions for this role
            for (const p of permissions) {
                const { page_name, can_view, can_create, can_edit, can_delete, can_special } = p;

                await RolePermission.upsert({
                    role_id,
                    page_name,
                    can_view: !!can_view,
                    can_create: !!can_create,
                    can_edit: !!can_edit,
                    can_delete: !!can_delete,
                    can_special: !!can_special
                });
            }

            res.json({ message: 'Permissions updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getRolesWithPermissions(req, res) {
        try {
            const roles = await Role.findAll({
                include: [{ model: RolePermission, as: 'permissions' }]
            });
            res.json(roles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = RolePermissionController;
