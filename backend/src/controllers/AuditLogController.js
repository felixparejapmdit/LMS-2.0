const AuditLog = require('../models/AuditLog');
const { Op } = require('sequelize');

class AuditLogController {
    // GET /api/audit-logs
    static async getAll(req, res) {
        try {
            const { page = 1, limit = 25, search = '', action = '' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const where = {};

            if (search) {
                where[Op.or] = [
                    { user_name: { [Op.like]: `%${search}%` } },
                    { ip_address: { [Op.like]: `%${search}%` } },
                    { browser: { [Op.like]: `%${search}%` } },
                    { device_os: { [Op.like]: `%${search}%` } }
                ];
            }

            if (action) {
                where.action = action;
            }

            const User = require('../models/User');

            const { count, rows } = await AuditLog.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'avatar']
                }],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset
            });

            res.json({
                data: rows,
                total: count,
                page: parseInt(page),
                totalPages: Math.ceil(count / parseInt(limit))
            });
        } catch (error) {
            console.error('[AUDIT LOG] Error fetching logs:', error);
            res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    }

    // POST /api/audit-logs (internal use from login)
    static async create(req, res) {
        try {
            const log = await AuditLog.create(req.body);
            res.status(201).json(log);
        } catch (error) {
            console.error('[AUDIT LOG] Error creating log:', error);
            res.status(500).json({ error: 'Failed to create audit log' });
        }
    }

    // Helper: log a login event (called from AuthController)
    static async logLogin({ user_id, user_name, ip_address, browser, device_os, details }) {
        try {
            await AuditLog.create({
                user_id,
                user_name,
                action: 'LOGIN',
                ip_address,
                browser,
                device_os,
                details
            });
        } catch (error) {
            console.error('[AUDIT LOG] Failed to log login:', error.message);
        }
    }
}

module.exports = AuditLogController;
