const { RefSectionRegistry, DeptSectionUsage, Department } = require('../models/associations');
const { Op } = require('sequelize');

class SectionService {
    /**
     * Get the active section for a department or assign a new one if none exists.
     * Also handles yearly resets.
     */
    static async getActiveSection(deptId, transaction = null) {
        const currentYear = new Date().getFullYear();

        // 1. Check if we need a global reset for the new year
        await this._checkYearlyReset(currentYear, transaction);

        let usage = await DeptSectionUsage.findOne({
            where: { 
                dept_id: deptId, 
                is_active: true,
                year: currentYear
            },
            transaction
        });

        if (!usage) {
            // Assign first available section for this department in the current year
            const newCode = await this.assignNextAvailableSection(deptId, transaction);
            usage = await DeptSectionUsage.create({
                dept_id: deptId,
                section_code: newCode,
                current_sequence: 0,
                year: currentYear,
                is_active: true
            }, { transaction });
        }

        return usage;
    }

    /**
     * Internal: Resets the global registry if the year has changed.
     */
    static async _checkYearlyReset(currentYear, transaction = null) {
        // Check if any record exists for the current year
        const anyYearRecord = await DeptSectionUsage.findOne({
            where: { year: currentYear },
            transaction
        });

        if (!anyYearRecord) {
            console.log(`[SECTION_SERVICE] New year detected (${currentYear}). Resetting registry pool...`);
            
            // 1. Deactivate all old year usages
            await DeptSectionUsage.update(
                { is_active: false },
                { 
                    where: { is_active: true, year: { [Op.lt]: currentYear } },
                    transaction 
                }
            );

            // 2. Reset the Registry pool to AVAILABLE
            await RefSectionRegistry.update(
                { 
                    status: 'AVAILABLE',
                    assigned_to_dept_id: null
                },
                { 
                    where: {}, 
                    transaction 
                }
            );
        }
    }

    /**
     * Assign the next available section from the registry to a department.
     */
    static async assignNextAvailableSection(deptId, transaction = null) {
        const nextSection = await RefSectionRegistry.findOne({
            where: { status: 'AVAILABLE' },
            order: [['section_code', 'ASC']],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : false
        });

        if (!nextSection) {
            throw new Error('No more available sections in the registry.');
        }

        await nextSection.update({
            status: 'ACTIVE',
            assigned_to_dept_id: deptId
        }, { transaction });

        return nextSection.section_code;
    }

    /**
     * Increment the sequence for a department and handle section switching if it reaches 1000.
     */
    static async incrementAndGetNextSequence(deptId, transaction = null) {
        let usage = await this.getActiveSection(deptId, transaction);
        
        let nextSeq = usage.current_sequence + 1;

        if (nextSeq >= 1000) {
            // Mark current as FULL
            await usage.update({
                is_active: false,
                filled_at: new Date()
            }, { transaction });

            await RefSectionRegistry.update({
                status: 'FULL'
            }, {
                where: { section_code: usage.section_code },
                transaction
            });

            // Assign new section
            const newCode = await this.assignNextAvailableSection(deptId, transaction);
            usage = await DeptSectionUsage.create({
                dept_id: deptId,
                section_code: newCode,
                current_sequence: 1,
                year: new Date().getFullYear(),
                is_active: true
            }, { transaction });

            return {
                section_code: newCode,
                sequence: 1
            };
        }

        await usage.update({
            current_sequence: nextSeq
        }, { transaction });

        return {
            section_code: usage.section_code,
            sequence: nextSeq
        };
    }

    /**
     * Manual override: Force assign a new section.
     */
    static async forceNewSection(deptId, transaction = null) {
        const currentYear = new Date().getFullYear();
        const usage = await DeptSectionUsage.findOne({
            where: { dept_id: deptId, is_active: true, year: currentYear },
            transaction
        });

        if (usage) {
            await usage.update({
                is_active: false,
                filled_at: new Date()
            }, { transaction });

            // We don't mark as FULL if it's forced, maybe just leave it as is or mark as 'CANCELLED'?
            // But requirement says "FULL" in registry. Let's stick to simple logic.
             await RefSectionRegistry.update({
                status: 'FULL'
            }, {
                where: { section_code: usage.section_code },
                transaction
            });
        }

        const newCode = await this.assignNextAvailableSection(deptId, transaction);
        const newUsage = await DeptSectionUsage.create({
            dept_id: deptId,
            section_code: newCode,
            current_sequence: 0,
            year: currentYear,
            is_active: true
        }, { transaction });

        return newUsage;
    }
}

module.exports = SectionService;
