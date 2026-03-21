const { UserDeptAccess, Department, User } = require('../models/associations');

class InterDeptController {
    // Get all department assignments for a specific user
    static async getUserAssignedDepts(req, res) {
        try {
            const { userId } = req.params;
            const assignments = await UserDeptAccess.findAll({
                where: { user_id: userId },
                include: [{ model: Department, as: 'department' }]
            });
            res.json(assignments);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Save department assignments for a user
    static async saveUserAssignments(req, res) {
        try {
            const { userId } = req.params;
            const { departmentIds } = req.body; // Array of IDs

            // 1. Remove existing
            await UserDeptAccess.destroy({ where: { user_id: userId } });

            // 2. Create new ones
            const newAssignments = departmentIds.map(id => ({
                user_id: userId,
                department_id: id
            }));

            await UserDeptAccess.bulkCreate(newAssignments);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // List users with interdepartment access
    static async getInterDeptUsers(req, res) {
        try {
            const users = await User.findAll({
                where: { interdepartment: true }
            });
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = InterDeptController;
