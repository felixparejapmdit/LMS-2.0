const { ProcessStep, LetterAssignment, Letter, Status } = require('../models/associations');
const { Op } = require('sequelize');

class ProcessStepController {
    static async getAll(req, res) {
        try {
            const { vip } = req.query;
            const includeCfg = [{
                model: LetterAssignment,
                as: 'assignments',
                where: { status: 'Pending' },
                required: false,
                attributes: ['id']
            }];

            // If VIP view, only count letters with tray_id 0 and (global_status: 2 OR status name: 'ATG Note')
            if (vip === 'true') {
                includeCfg[0].where = {
                    ...includeCfg[0].where,
                    [Op.and]: [
                        { '$assignments.letter.tray_id$': 0 },
                        {
                            [Op.or]: [
                                { '$assignments.letter.global_status$': 2 },
                                { '$assignments.letter.status.status_name$': 'ATG Note' }
                            ]
                        }
                    ]
                };

                includeCfg[0].include = [{
                    model: Letter,
                    as: 'letter',
                    required: true,
                    include: [{
                        model: Status,
                        as: 'status',
                        attributes: ['status_name']
                    }]
                }];
            }

            const steps = await ProcessStep.findAll({
                include: includeCfg,
                subQuery: false // Important for joined filtered queries
            });

            const stepsWithCount = steps.map(step => {
                const stepData = step.toJSON();
                // Filter out assignments that don't have a letter (due to the nested filter)
                // This is because with required: false on associations, children might be empty
                stepData.count = stepData.assignments?.filter(a => a.letter !== undefined).length || 0;
                delete stepData.assignments;
                return stepData;
            });

            res.json(stepsWithCount);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const step = await ProcessStep.findByPk(req.params.id);
            if (!step) return res.status(404).json({ error: 'ProcessStep not found' });
            res.json(step);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const step = await ProcessStep.create(req.body);
            res.status(201).json(step);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const step = await ProcessStep.findByPk(req.params.id);
            if (!step) return res.status(404).json({ error: 'ProcessStep not found' });
            await step.update(req.body);
            res.json(step);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const step = await ProcessStep.findByPk(req.params.id);
            if (!step) return res.status(404).json({ error: 'ProcessStep not found' });
            await step.destroy();
            res.json({ message: 'ProcessStep deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ProcessStepController;
