const { RefSectionRegistry, DeptSectionUsage, Department } = require('../models/associations');
const SectionService = require('../services/SectionService');

class SectionController {
    /**
     * Get all sections from the registry for the admin view.
     */
    static async getRegistry(req, res) {
        try {
            const sections = await RefSectionRegistry.findAll({
                include: [{ model: Department, as: 'department', attributes: ['id', 'dept_name', 'dept_code'] }],
                order: [['section_code', 'ASC']]
            });
            res.json(sections);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get usage history for a specific department.
     */
    static async getDeptUsage(req, res) {
        try {
            const { deptId } = req.params;
            const usages = await DeptSectionUsage.findAll({
                where: { dept_id: deptId },
                order: [['created_at', 'DESC']]
            });
            res.json(usages);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Force a new section for a department (Admin only logic).
     */
    static async forceNewSection(req, res) {
        try {
            const { deptId } = req.body;
            if (!deptId) return res.status(400).json({ error: 'deptId is required' });
            
            const newUsage = await SectionService.forceNewSection(deptId);
            res.json(newUsage);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Assign a specific section code to a department.
     */
    static async assignSection(req, res) {
        try {
            const { deptId, sectionCode } = req.body;
            if (!deptId || !sectionCode) {
                return res.status(400).json({ error: 'deptId and sectionCode are required' });
            }

            const newUsage = await SectionService.assignSpecificSection(deptId, sectionCode);
            res.json(newUsage);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Unassign a section code.
     */
    static async unassignSection(req, res) {
        try {
            const { sectionCode } = req.body;
            if (!sectionCode) {
                return res.status(400).json({ error: 'sectionCode is required' });
            }

            await SectionService.unassignSection(sectionCode);
            res.json({ message: 'Section unassigned successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get overview for the department dashboard (progress, etc).
     */
    static async getDashboardOverview(req, res) {
        try {
            const departments = await Department.findAll({
                include: [{
                    model: DeptSectionUsage,
                    as: 'sectionUsage',
                    where: { is_active: true },
                    required: false
                }],
                order: [
                    [{ model: DeptSectionUsage, as: 'sectionUsage' }, 'section_code', 'ASC']
                ]
            });

            const overview = departments.map(d => {
                const isATGOffice = d.dept_code === "ATG" || d.dept_name === "ATG's Office";
                
                // Sort the active usages in-memory to ensure correct priority
                // For ATG's Office, we prioritize the lowest section code (01 -> 02 -> 03)
                // For others, we prioritize the latest assigned (DESC)
                const sortedUsages = (d.sectionUsage || []).sort((a, b) => {
                    if (isATGOffice) {
                        return a.section_code.localeCompare(b.section_code);
                    } else {
                        return b.section_code.localeCompare(a.section_code);
                    }
                });

                const active = sortedUsages[0];
                return {
                    id: d.id,
                    dept_name: d.dept_name,
                    dept_code: d.dept_code,
                    active_section: active ? active.section_code : null,
                    current_sequence: active ? active.current_sequence : 0,
                    progress: active ? Math.round((active.current_sequence / 999) * 100) : 0
                };
            });

            res.json(overview);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = SectionController;
