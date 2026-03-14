const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');
const TelegramService = require('../services/telegramService');

const LetterAssignment = sequelize.define('LetterAssignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    letter_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    department_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    step_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    assigned_by: {
        type: DataTypes.UUID
    },
    status_id: {
        type: DataTypes.INTEGER,
        defaultValue: 8
    },
    status: {
        type: DataTypes.STRING
    },
    endorsed: {
        type: DataTypes.ENUM('Yes', 'No', 'Pending'),
        defaultValue: 'Pending'
    },
    due_date: {
        type: DataTypes.DATE
    },
    remarks: {
        type: DataTypes.TEXT
    },
    completed_at: {
        type: DataTypes.DATE
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'letter_assignments',
    timestamps: false,
    hooks: {
        afterCreate: async (assignment, options) => {
            const { LetterLog, Department, ProcessStep, Letter, User, Person } = sequelize.models;

            if (!LetterLog || !Department || !ProcessStep) return;

            let deptName = 'Unknown Department';
            let stepName = 'Unknown Step';

            if (assignment.department_id) {
                const dept = await Department.findByPk(assignment.department_id, { transaction: options.transaction });
                if (dept) deptName = dept.dept_name;
            }
            if (assignment.step_id) {
                const step = await ProcessStep.findByPk(assignment.step_id, { transaction: options.transaction });
                if (step) stepName = step.step_name;
            }

            try {
                await LetterLog.create({
                    letter_id: assignment.letter_id,
                    user_id: assignment.assigned_by || null,
                    action_type: 'Assigned',
                    department_id: assignment.department_id,
                    log_details: `Letter assigned to ${deptName} (Step: ${stepName}).`
                }, { transaction: options.transaction });

                // Telegram Notification
                if (TelegramService) {
                    const letter = await Letter.findByPk(assignment.letter_id, { transaction: options.transaction });
                    if (letter) {
                        const { text, replyMarkup } = await TelegramService.notifyMovement(letter, deptName, stepName);

                        // Recipients: VIPs and Administrators
                        const recipients = await User.findAll({
                            where: { role: { [Op.in]: ['VIP', 'Administrator'] } },
                            transaction: options.transaction
                        });

                        // Also notify the encoder if they are not already in recipients
                        if (letter.encoder_id && !recipients.some(r => r.id === letter.encoder_id)) {
                            const encoder = await User.findByPk(letter.encoder_id, { transaction: options.transaction });
                            if (encoder) recipients.push(encoder);
                        }

                        const chatIds = await TelegramService.getChatIdsForUsers(recipients, Person, User);
                        for (const chatId of chatIds) {
                            await TelegramService.sendMessage(chatId, text, replyMarkup);
                        }
                    }
                }
            } catch (err) {
                console.error("Hook afterCreate LetterLog/Telegram error:", err);
            }
        },
        afterUpdate: async (assignment, options) => {
            const { LetterLog, Department, ProcessStep, Letter, User, Person } = sequelize.models;

            if (!LetterLog || !Department || !ProcessStep) return;

            // Log if assignment logic parameters strictly change
            if (assignment.changed('status') || assignment.changed('status_id') || assignment.changed('endorsed') || assignment.changed('department_id') || assignment.changed('step_id')) {
                let deptName = 'Unknown Department';
                let stepName = 'Unknown Step';

                if (assignment.department_id) {
                    const dept = await Department.findByPk(assignment.department_id, { transaction: options.transaction });
                    if (dept) deptName = dept.dept_name;
                }
                if (assignment.step_id) {
                    const step = await ProcessStep.findByPk(assignment.step_id, { transaction: options.transaction });
                    if (step) stepName = step.step_name;
                }

                let actionType = 'Assigned';
                let logDetails = `Letter assignment parameter updated in ${deptName} (Step: ${stepName}).`;

                if (assignment.changed('endorsed') && assignment.endorsed === 'Yes') {
                    actionType = 'Endorsed';
                    logDetails = `Letter effectively endorsed by ${deptName} (Step: ${stepName}).`;
                } else if (assignment.changed('status') && assignment.status === 'Done') {
                    actionType = 'Completed';
                    logDetails = `Step ${stepName} completed by ${deptName}.`;
                } else if (assignment.changed('department_id') || assignment.changed('step_id')) {
                    actionType = 'Assigned';
                    logDetails = `Letter routed to ${deptName} (Step: ${stepName}).`;
                }

                try {
                    await LetterLog.create({
                        letter_id: assignment.letter_id,
                        user_id: assignment.assigned_by || null,
                        action_type: actionType,
                        department_id: assignment.department_id,
                        log_details: logDetails
                    }, { transaction: options.transaction });

                    // Telegram Notification
                    if (TelegramService) {
                        const letter = await Letter.findByPk(assignment.letter_id, { transaction: options.transaction });
                        if (letter) {
                            const { text, replyMarkup } = await TelegramService.notifyMovement(letter, deptName, stepName);

                            // Recipients: VIPs and Administrators
                            const recipients = await User.findAll({
                                where: { role: { [Op.in]: ['VIP', 'Administrator'] } },
                                transaction: options.transaction
                            });

                            // Also notify the encoder if they are not already in recipients
                            if (letter.encoder_id && !recipients.some(r => r.id === letter.encoder_id)) {
                                const encoder = await User.findByPk(letter.encoder_id, { transaction: options.transaction });
                                if (encoder) recipients.push(encoder);
                            }

                            const chatIds = await TelegramService.getChatIdsForUsers(recipients, Person, User);
                            for (const chatId of chatIds) {
                                await TelegramService.sendMessage(chatId, text, replyMarkup);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Hook afterUpdate LetterLog/Telegram error:", err);
                }
            }
        }
    }
});

module.exports = LetterAssignment;
