const {
  ProcessStep,
  LetterAssignment,
  Letter,
  Status,
  Department,
} = require("../models/associations");
const { Op } = require("sequelize");

class ProcessStepController {
  static async getAll(req, res) {
    console.log(`[PROCESS_STEPS_HIT] Query: ${JSON.stringify(req.query)}`);
    try {
      const { vip } = req.query;
      const stepWhere = {};

      let atgStatusId = null;
      const includeCfg = [
        {
          model: LetterAssignment,
          as: "assignments",
          required: false,
          attributes: ["id"],
        },
      ];

      if (vip === "true") {
        stepWhere.id = [1, 2, 5, 6]; // Strictly For Signature, For Review, VEM, AEVM
        includeCfg[0].include = [
          {
            model: Letter,
            as: "letter",
            required: true,
            where: { global_status: 2 },
            include: [
              {
                model: Status,
                as: "status",
                attributes: ["status_name"],
              },
            ],
          },
        ];
      }

      const steps = await ProcessStep.findAll({
        where: stepWhere,
        include: includeCfg,
        subQuery: false,
      });

      const stepsWithCount = steps.map((step) => {
        const stepData = step.toJSON();
        stepData.count =
          stepData.assignments?.filter((a) => a.letter !== undefined).length ||
          0;
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
      if (!step)
        return res.status(404).json({ error: "ProcessStep not found" });
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
      if (!step)
        return res.status(404).json({ error: "ProcessStep not found" });
      await step.update(req.body);
      res.json(step);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const step = await ProcessStep.findByPk(req.params.id);
      if (!step)
        return res.status(404).json({ error: "ProcessStep not found" });
      await step.destroy();
      res.json({ message: "ProcessStep deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ProcessStepController;
