const axios = require('axios');
const argon2 = require('argon2');
const sequelize = require('../config/db');
const { Person, User, Role } = require('../models/associations');

class ImportController {
    /**
     * Import persons from external PHP API
     * Target collection: persons
     */
    static async importPersons(req, res) {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'URL is required' });

            const response = await axios.get(url);

            // Handle different data wrap formats (API might return {data: [...]})
            const data = response.data.data || response.data;
            if (!data || !Array.isArray(data)) {
                return res.status(400).json({ error: 'Invalid data format from API. Expected "data" array.' });
            }

            let imported = 0;
            let updated = 0;

            for (const item of data) {
                // Find existing person by name or system-specific unique ID if available
                // Based on user request, we use name as unique identifier for persons
                const [person, created] = await Person.findOrCreate({
                    where: { name: item.name },
                    defaults: {
                        name_id: item.name_id,
                        area: item.area,
                        telegram: item.telegram
                    }
                });

                if (created) {
                    imported++;
                } else {
                    await person.update({
                        name_id: item.name_id,
                        area: item.area,
                        telegram: item.telegram
                    });
                    updated++;
                }
            }

            res.json({
                success: true,
                message: 'Persons sync complete',
                stats: { imported, updated, total: data.length }
            });
        } catch (error) {
            console.error('Import Persons Error:', error);
            res.status(500).json({
                error: 'Import Failed',
                message: error.message,
                details: error.response?.data || 'No additional details'
            });
        }
    }

    /**
     * Import users from external PHP API
     * Target collection: directus_users
     */
    static async importUsers(req, res) {
        try {
            const { url } = req.body;
            if (!url) return res.status(400).json({ error: 'URL is required' });

            const response = await axios.get(url);
            const data = response.data.data || response.data;
            if (!data || !Array.isArray(data)) {
                return res.status(400).json({ error: 'Invalid data format from API. Expected "data" array.' });
            }

            // Find valid roles and prefer the built-in 'Administrator' for admins
            const roles = await Role.findAll();
            let adminRoleId = null;
            let userRoleId = null;

            // Directus traditionally uses "Administrator" for the super-admin role
            // We want to find the ID for "Administrator" or "Admin"
            roles.forEach(r => {
                const name = r.name.toLowerCase();
                if (name === 'administrator') adminRoleId = r.id;
                if (name === 'user' && !userRoleId) userRoleId = r.id;
                if (name === 'admin' && !adminRoleId) adminRoleId = r.id; // Fallback if Administrator not found
            });

            // Absolute Fallbacks from your DB check
            const FINAL_ADMIN_ROLE = adminRoleId || 'ec986bba-2c97-47a8-968f-f8a163e5f014';
            const FINAL_USER_ROLE = userRoleId || 'ebceed4d-42e4-4f97-8a45-873b1298d310';

            let imported = 0;
            let updated = 0;

            for (const item of data) {
                const username = (item.user_name || item.username || '').toLowerCase();
                if (!username) continue;

                // PROTECT THE CORE ADMIN: Don't overwrite the main system admin if it exists
                if (username === 'admin' || username === 'superadmin') {
                    console.log(`Skipping protected account: ${username}`);
                    continue;
                }

                const nameParts = (item.name || '').trim().split(/\s+/);
                const first_name = nameParts[0] || 'Unknown';
                const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '---';

                const hashedPassword = await argon2.hash(item.password, { type: argon2.argon2id });

                const isLegacyAdmin = (item.level || '').toLowerCase().includes('admin');
                const roleId = isLegacyAdmin ? FINAL_ADMIN_ROLE : FINAL_USER_ROLE;

                const existingUser = await User.findOne({ where: { username } });

                if (existingUser) {
                    await existingUser.update({
                        first_name,
                        last_name,
                        password: hashedPassword,
                        role: roleId,
                        status: 'active'
                    });
                    updated++;
                } else {
                    await User.create({
                        first_name,
                        last_name,
                        email: `${username}@lms-app.com`,
                        username: username,
                        password: hashedPassword,
                        role: roleId,
                        status: 'active'
                    });
                    imported++;
                }
            }

            res.json({
                success: true,
                message: 'Users sync complete',
                stats: { imported, updated, total: data.length }
            });
        } catch (error) {
            console.error('Import Users Error:', error.message);
            res.status(500).json({ error: 'Failed to fetch or process users data.' });
        }
    }
}

module.exports = ImportController;
