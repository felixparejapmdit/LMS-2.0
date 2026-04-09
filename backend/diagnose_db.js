/**
 * LMS Deep Diagnostic Script
 * Checks exactly why the dashboard returns 0 active letters for Administrators
 */
const { User, Letter, LetterAssignment } = require('./src/models/associations');
const sequelize = require('./src/config/db');
const { Op } = require('sequelize');

async function diagnose() {
    console.log('\n====== LMS DEEP DIAGNOSTIC ======\n');
    try {
        // 1. Show all users and their dept + role
        console.log('--- ALL USERS ---');
        const users = await User.findAll({
            attributes: ['id', 'first_name', 'last_name', 'role', 'dept_id'],
        });
        users.forEach(u => {
            console.log(`  [${u.dept_id ?? 'NO DEPT'}] ${u.first_name} ${u.last_name} | role UUID: ${u.role}`);
        });

        // 2. Show all letters
        console.log('\n--- ALL LETTERS ---');
        const letters = await Letter.findAll({
            attributes: ['id', 'subject', 'dept_id', 'global_status', 'encoder_id', 'sender', 'endorsed', 'direction'],
            limit: 10,
            order: [['created_at', 'DESC']]
        });
        if (letters.length === 0) {
            console.log('  !! NO LETTERS FOUND IN DATABASE !!');
        }
        letters.forEach(l => {
            console.log(`  Letter #${l.id} | dept_id=${l.dept_id} | global_status=${l.global_status} | direction=${l.direction}`);
            console.log(`    encoder_id: ${l.encoder_id}`);
            console.log(`    sender: ${l.sender}`);
            console.log(`    endorsed: ${l.endorsed}`);
        });

        // 3. Count letters by global_status
        console.log('\n--- LETTER COUNT BY global_status ---');
        const counts = await Letter.findAll({
            attributes: ['global_status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
            group: ['global_status']
        });
        counts.forEach(c => {
            console.log(`  global_status=${c.global_status}: ${c.dataValues.cnt} letters`);
        });

        // 4. Pick first admin user and simulate the exact dashboard logic
        console.log('\n--- SIMULATING DASHBOARD FOR ADMINISTRATORS ---');
        const adminUsers = users.filter(u => u.dept_id); // have a dept
        if (adminUsers.length === 0) {
            console.log('  !! NO USERS WITH dept_id FOUND !!');
            console.log('  This is the root cause: dept_id is NULL for all users');
        } else {
            for (const admin of adminUsers.slice(0, 3)) {
                console.log(`\n  Simulating for: ${admin.first_name} ${admin.last_name} (dept_id=${admin.dept_id})`);
                
                const role = admin.role; // This is a UUID in the DB
                const myDeptId = admin.dept_id;
                
                // Test getSharedWorkSql — checks if it would return any letters
                const sharedSql = `EXISTS (
                    SELECT 1 FROM directus_users colleagues 
                    LEFT JOIN directus_roles dr ON colleagues.role = dr.id
                    WHERE colleagues.dept_id = ${sequelize.escape(myDeptId)} 
                    AND (colleagues.role = ${sequelize.escape(role)} OR dr.name = 'Administrator')
                    AND (
                        colleagues.id IN (Letter.encoder_id, Letter.sender, Letter.endorsed)
                        OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.sender
                        OR (colleagues.first_name || ' ' || colleagues.last_name) = Letter.endorsed
                    )
                )`;

                const matchedViaSharedWork = await Letter.count({
                    where: { [Op.or]: [sequelize.literal(sharedSql)] }
                });
                console.log(`    Letters via getSharedWorkSql: ${matchedViaSharedWork}`);

                // Test simple dept_id match
                const matchedByDept = await Letter.count({
                    where: { dept_id: myDeptId }
                });
                console.log(`    Letters via dept_id=${myDeptId}: ${matchedByDept}`);

                // Test direct user involvement
                const matchedByUserId = await Letter.count({
                    where: { [Op.or]: [
                        { encoder_id: admin.id },
                        { sender: admin.id },
                        { endorsed: admin.id }
                    ]}
                });
                console.log(`    Letters via direct involvement (encoder/sender/endorsed): ${matchedByUserId}`);

                // Final: active count with global_status IN (1, 2, 8)
                const activeCount = await Letter.count({
                    where: { dept_id: myDeptId, global_status: [1, 2, 8] }
                });
                console.log(`    Active letters (status 1/2/8) in dept=${myDeptId}: ${activeCount}`);
            }
        }

    } catch (err) {
        console.error('\n!! DIAGNOSTIC FAILED !!', err.message);
        console.error(err.stack);
    } finally {
        await sequelize.close();
    }
    console.log('\n====== DIAGNOSTIC END ======\n');
}

diagnose();
