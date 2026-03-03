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
            console.error('Import Persons Error:', error.message);
            res.status(500).json({ error: 'Failed to fetch or process persons data. Check if URL is correct and reachable.' });
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

            // Find valid 'User' role ID (UUID)
            // Try to find by name 'User' first, case-insensitive
            let userRole = await Role.findOne({
                where: sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('name')),
                    'user'
                )
            });

            // Fallback UUID if role is not found in DB yet
            const roleId = userRole ? userRole.id : '2f3d79a9-ebfe-4937-98c2-46012a18b7c7';

            let imported = 0;
            let updated = 0;

            for (const item of data) {
                // Parse Name: "Badeth Serra" -> "Badeth" (first), "Serra" (last)
                const nameParts = (item.name || '').trim().split(/\s+/);
                const first_name = nameParts[0] || 'Unknown';
                const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '---';

                // Unique Key: username
                const username = item.user_name || item.username;
                if (!username) continue;

                // Hash password using Argon2id as requested
                const hashedPassword = await argon2.hash(item.password, {
                    type: argon2.argon2id
                });

                const existingUser = await User.findOne({ where: { username } });

                if (existingUser) {
                    await existingUser.update({
                        first_name,
                        last_name,
                        password: hashedPassword,
                        role: roleId
                    });
                    updated++;
                } else {
                    await User.create({
                        first_name,
                        last_name,
                        email: `${username}@lms.local`,
                        username: username,
                        password: hashedPassword,
                        role: roleId
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
