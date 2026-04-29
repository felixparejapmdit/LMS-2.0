const { DeptSectionUsage, Department } = require('../backend/src/models/associations');

(async () => {
    try {
        const dept = await Department.findOne({ where: { dept_code: 'ARCH' } });
        if (!dept) {
            console.log('ARCH Department not found');
            return;
        }

        const usages = await DeptSectionUsage.findAll({ 
            where: { dept_id: dept.id },
            order: [['section_code', 'ASC']]
        });

        console.log('--- ARCHIVING DEPARTMENT ---');
        console.log(`ID: ${dept.id}`);

        console.log('\n--- DEPT SECTION USAGE ---');
        usages.forEach(u => {
            console.log(`Section: ${u.section_code}, Active: ${u.is_active}, FilledAt: ${u.filled_at}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
})();
