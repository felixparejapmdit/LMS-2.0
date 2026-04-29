const { DeptSectionUsage, RefSectionRegistry, Department } = require('../backend/src/models/associations');

(async () => {
    try {
        const dept = await Department.findOne({ where: { dept_code: 'ATG' } });
        if (!dept) {
            console.log('ATG Department not found');
            return;
        }

        const usages = await DeptSectionUsage.findAll({ 
            where: { dept_id: dept.id },
            order: [['section_code', 'ASC']]
        });

        const registry = await RefSectionRegistry.findAll({ 
            where: { assigned_to_dept_id: dept.id },
            order: [['section_code', 'ASC']]
        });

        console.log('--- ATG DEPARTMENT ---');
        console.log(`ID: ${dept.id}, Name: ${dept.dept_name}`);

        console.log('\n--- DEPT SECTION USAGE (History) ---');
        usages.forEach(u => {
            console.log(`Section: ${u.section_code}, Active: ${u.is_active}, FilledAt: ${u.filled_at}, Seq: ${u.current_sequence}`);
        });

        console.log('\n--- REF SECTION REGISTRY ---');
        registry.forEach(r => {
            console.log(`Section: ${r.section_code}, Status: ${r.status}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
})();
