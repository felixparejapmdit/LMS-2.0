const { RolePermission, Role } = require('../models/associations');
const sequelize = require('../config/db');

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

            // Transactional update for data integrity
            await sequelize.transaction(async (t) => {
                for (const p of permissions) {
                    const { page_name, can_view, can_create, can_edit, can_delete, can_special, field_permissions } = p;

                    // Manually find and update or create to avoid upsert issues with custom unique indexes
                    const [record, created] = await RolePermission.findOrCreate({
                        where: { role_id, page_name },
                        defaults: {
                            can_view: !!can_view,
                            can_create: !!can_create,
                            can_edit: !!can_edit,
                            can_delete: !!can_delete,
                            can_special: !!can_special,
                            field_permissions: field_permissions || {}
                        },
                        transaction: t
                    });

                    if (!created) {
                        await record.update({
                            can_view: !!can_view,
                            can_create: !!can_create,
                            can_edit: !!can_edit,
                            can_delete: !!can_delete,
                            can_special: !!can_special,
                            field_permissions: field_permissions || {}
                        }, { transaction: t });
                    }
                }
            });

            res.json({ message: 'Permissions updated successfully' });
        } catch (error) {
            console.error('Update multiple failed:', error);
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

    static async getRoles(req, res) {
        try {
            const roles = await Role.findAll();
            res.json(roles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = RolePermissionController;
