const { LetterAssignment, Letter, Status, User, Person, ProcessStep, sequelize } = require('../models/associations');
const { Op } = require('sequelize');

class StatsController {
    static async getDashboardStats(req, res) {
        try {
            const { department_id } = req.query;
            const where = {};
            if (department_id && department_id !== 'null' && department_id !== 'undefined') {
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
            }

            const allAssignments = await LetterAssignment.findAll({
                where,
                include: [
                    {
                        model: Letter,
                        as: 'letter',
                        include: [{ model: Status, as: 'status' }]
                    }
                ]
            });

            let active = 0, archived = 0, outgoing = 0, incoming = 0;
            const activeStatuses = ['Incoming', 'Review', 'Forwarded', 'Endorsed'];

            allAssignments.forEach(a => {
                const statusName = a.letter?.status?.status_name || a.status || '';

                if (statusName === 'Filed') archived++;
                else if (activeStatuses.includes(statusName) || statusName === 'Pending') active++;

                if (a.letter?.direction === 'Outgoing') outgoing++;
                if (a.letter?.direction === 'Incoming') incoming++;
            });

            // Count letters that are Incoming (global_status=1) but have NO assignment record at all
            const unassignedLettersInDashboard = await Letter.findAll({
                where: {
                    global_status: 1,
                    tray_id: { [Op.or]: [0, null] }
                },
                include: [{
                    model: LetterAssignment,
                    as: 'assignments',
                    required: false
                }]
            });
            const purelyUnassignedInDashboard = unassignedLettersInDashboard.filter(l => (l.assignments || []).length === 0);
            active += purelyUnassignedInDashboard.length;
            incoming += purelyUnassignedInDashboard.length;

            // Priority Workflow: last 5 Incoming letters (queried directly from letters table
            // so newly received letters without an assignment are also shown)
            const recentTasks = await Letter.findAll({
                where: { global_status: 1 }, // 1 = Incoming
                include: [
                    { model: Status, as: 'status' },
                    'letterKind',
                    'attachment',
                    'tray'
                ],
                limit: 5,
                order: [['created_at', 'DESC']]
            });

            // ATG Letters: Filter manually after fetch to avoid complex join issues in SQLite
            const allPossibleAtg = await LetterAssignment.findAll({
                include: [
                    {
                        model: Letter,
                        as: 'letter',
                        where: { tray_id: 0 },
                        required: true,
                        include: [{ model: Status, as: 'status', required: false }, 'letterKind', 'attachment', 'tray']
                    },
                    { model: ProcessStep, as: 'step' }
                ],
                order: [['created_at', 'DESC']]
            });

            const atgLetters = allPossibleAtg.filter(a =>
                a.letter?.global_status === 2 ||
                a.letter?.status?.status_name === 'ATG Note'
            ).slice(0, 10);

            const onlineUsersCount = await User.count({ where: { islogin: true } });
            const totalUsers = await User.count();
            const totalPeople = await Person.count();
            const atgLettersCount = allPossibleAtg.filter(a =>
                a.letter?.global_status === 2 ||
                a.letter?.status?.status_name === 'ATG Note'
            ).length;

            res.json({
                activeTasks: active,
                archivedTasks: archived,
                outgoingLetters: outgoing,
                incomingLetters: incoming,
                recentTasks,
                atgLetters,
                onlineUsers: onlineUsersCount,
                totalUsers,
                totalPeople,
                atgLettersCount
            });
        } catch (error) {
            console.error('Stats Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getInboxStats(req, res) {
        try {
            const { department_id } = req.query;
            const where = {};
            if (department_id && department_id !== 'null' && department_id !== 'undefined') {
                where[Op.or] = [
                    { department_id: department_id },
                    { department_id: null }
                ];
            }

            const allAssignments = await LetterAssignment.findAll({
                where,
                include: [
                    { model: Letter, as: 'letter', include: [{ model: Status, as: 'status' }] },
                    { model: ProcessStep, as: 'step' }
                ]
            });

            const reviewStep = await ProcessStep.findByPk(2);
            const signatureStep = await ProcessStep.findByPk(1);
            const reviewName = reviewStep?.step_name || 'For Review';
            const signatureName = signatureStep?.step_name || 'For Signature';

            const counts = { review: 0, atg_note: 0, signature: 0, vem: 0, pending: 0, hold: 0 };

            allAssignments.forEach(a => {
                const stepName = a.step?.step_name || '';
                const letterStatus = a.letter?.status?.status_name || '';
                const hasVem = a.letter?.vemcode && a.letter.vemcode.trim() !== '';
                const hasTray = a.letter?.tray_id && a.letter.tray_id !== 0;

                // Exclude VIP correctly: tray_id == 0 AND (global_status == 2 OR status == ATG Note)
                const isVip = a.letter?.tray_id === 0 && (a.letter?.global_status === 2 || letterStatus === 'ATG Note');
                if (isVip) return;

                // Hold counts ANY hold status
                if (letterStatus === 'Hold' || letterStatus === 'On Hold') {
                    counts.hold++;
                }

                // Others must be Pending
                if (a.status === 'Pending') {
                    if (stepName === reviewName) {
                        if (!hasTray && letterStatus === 'Incoming') counts.review++;
                    } else if (stepName === signatureName) {
                        if (!hasTray && letterStatus === 'Incoming') counts.signature++;
                    } else if (stepName.includes('VEM') || hasVem) {
                        counts.vem++;
                    }
                }

                // ATG Note: Assigned Tray and the status is not "Filed"
                if (hasTray && letterStatus !== 'Filed') {
                    counts.atg_note++;
                }
            });      // Removed old pending count logic from assignments loop
            // Pending is now exclusively for letters with NO process step (no assignment record)

            // Count letters that are Incoming (global_status=1) but have NO assignment record at all
            const unassignedLetters = await Letter.findAll({
                where: {
                    global_status: 1,
                    tray_id: { [Op.or]: [0, null] }
                },
                include: [{
                    model: LetterAssignment,
                    as: 'assignments',
                    required: false
                }]
            });
            const purelyUnassigned = unassignedLetters.filter(l => (l.assignments || []).length === 0);
            counts.pending += purelyUnassigned.length;

            res.json(counts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = StatsController;
