const { ProcessStep, LetterAssignment, Letter, Status, Department } = require('../models/associations');
const { Op } = require('sequelize');

class ProcessStepController {
    static async getAll(req, res) {
        try {
            const { vip, dept_id } = req.query;
            const stepWhere = {};
            
            if (dept_id && dept_id !== 'all') {
                stepWhere.dept_id = (dept_id === 'null' || dept_id === 'undefined') ? null : dept_id;
            }
            let atgStatusId = null;
            if (vip === 'true') {
                stepWhere.step_name = {
                    [Op.or]: [
                        { [Op.like]: '%Review%' },
                        { [Op.like]: '%Signature%' },
                        { [Op.like]: '%VEM%' },
                        { [Op.like]: '%AVEM%' },
                        { [Op.like]: '%AEVM%' }
                    ]
                };
                const atgStatus = await Status.findOne({ where: { status_name: 'ATG Note' } });
                atgStatusId = atgStatus?.id || null;
            }

            const includeCfg = [{
                model: LetterAssignment,
                as: 'assignments',
                where: { status: 'Pending' },
                required: false,
                attributes: ['id']
            }];

            if (vip === 'true') {
                const atgStatusFilter = atgStatusId
                    ? {
                        [Op.or]: [
                            { '$assignments.letter.global_status$': atgStatusId },
                            { '$assignments.letter.status.status_name$': 'ATG Note' }
                        ]
                    }
                    : { '$assignments.letter.status.status_name$': 'ATG Note' };
                includeCfg[0].where = {
                    ...includeCfg[0].where,
                    [Op.and]: [
                        { '$assignments.letter.tray_id$': { [Op.or]: [0, null] } },
                        atgStatusFilter
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
                where: stepWhere,
                include: [...includeCfg, { model: Department, as: 'department' }],
                subQuery: false
            });

            const stepsWithCount = steps.map(step => {
                const stepData = step.toJSON();
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
