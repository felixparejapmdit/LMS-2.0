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
     * Updated: Now checks for gaps in existing letters to allow reuse of deleted numbers.
     */
    static async incrementAndGetNextSequence(deptId, transaction = null) {
        const { Department, Letter } = require('../models/associations');
        const dept = await Department.findByPk(deptId, { transaction });
        if (!dept) throw new Error("Department not found");

        const isATG = dept.group_id === 3;
        const prefix = isATG ? "ATG" : (dept.dept_code || "LMS");
        const currentYear = new Date().getFullYear();
        const shortYear = currentYear.toString().slice(-2);
        
        let usage = await this.getActiveSection(deptId, transaction);
        
        // Determine the next available sequence number by checking for gaps
        let { sequence: nextSeq, section_code: activeCode } = await this.findNextAvailableSequence(
            deptId, 
            prefix, 
            usage.section_code, 
            isATG ? 3 : 5, 
            transaction
        );

        // If ATG and sequence exceeds 999, we need to roll over to a new section
        if (isATG && nextSeq >= 1000) {
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
                current_sequence: 1, // Start at 1 for new section
                year: currentYear,
                is_active: true
            }, { transaction });

            return {
                section_code: newCode,
                sequence: 1
            };
        }

        // Update the current_sequence high-water mark in the usage record
        if (nextSeq > usage.current_sequence) {
            await usage.update({
                current_sequence: nextSeq
            }, { transaction });
        }

        return {
            section_code: activeCode,
            sequence: nextSeq
        };
    }

    /**
     * Find the first available sequence number (including gaps) for a department/section.
     */
    static async findNextAvailableSequence(deptId, prefix, sectionCode, digits, transaction = null) {
        const { Letter } = require('../models/associations');
        const currentYear = new Date().getFullYear();
        const shortYear = currentYear.toString().slice(-2);
        
        // For non-ATG (5 digits), we don't use sectionCode in the ID pattern
        const isATG = digits === 3;
        const searchSection = isATG ? sectionCode : "";
        const pattern = `${prefix}${shortYear}-${searchSection}%`;

        const letters = await Letter.findAll({
            where: {
                lms_id: { [Op.like]: pattern },
                // Only look at letters created in the current year to avoid cross-year reuse if formats collide
                date_received: {
                    [Op.gte]: new Date(currentYear, 0, 1)
                }
            },
            attributes: ['lms_id'],
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : false
        });

        const usedSeqs = letters.map(l => {
            const parts = l.lms_id.split('-');
            if (parts.length < 2) return null;
            const seqPart = parts[1];
            
            try {
                if (isATG) {
                    // SeqPart is like "03001". We need the part after the section code (last 3 digits)
                    // Ensure the section code matches before parsing
                    if (seqPart.startsWith(sectionCode)) {
                        return parseInt(seqPart.slice(sectionCode.length));
                    }
                    return null;
                } else {
                    // SeqPart is like "00001"
                    return parseInt(seqPart);
                }
            } catch (e) {
                return null;
            }
        }).filter(n => n !== null && !isNaN(n));

        const max = isATG ? 999 : 99999;
        
        // Simple linear search for the first gap
        // For small max values (999 or 99999), this is fast enough.
        const usedSet = new Set(usedSeqs);
        for (let i = 1; i <= max; i++) {
            if (!usedSet.has(i)) {
                return { sequence: i, section_code: sectionCode };
            }
        }

        return { sequence: max + 1, section_code: sectionCode }; // Full
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

    /**
     * Manual assignment of a specific section code.
     */
    static async assignSpecificSection(deptId, sectionCode, transaction = null) {
        const currentYear = new Date().getFullYear();

        // 1. Deactivate current active section if any
        await DeptSectionUsage.update(
            { is_active: false, filled_at: new Date() },
            { 
                where: { dept_id: deptId, is_active: true, year: currentYear },
                transaction 
            }
        );

        // 2. Mark the target section as ACTIVE in registry and assign to this dept
        const section = await RefSectionRegistry.findOne({
            where: { section_code: sectionCode },
            transaction
        });

        if (!section) throw new Error(`Section code ${sectionCode} not found in registry.`);

        await section.update({
            status: 'ACTIVE',
            assigned_to_dept_id: deptId
        }, { transaction });

        // 3. Create new usage record
        const newUsage = await DeptSectionUsage.create({
            dept_id: deptId,
            section_code: sectionCode,
            current_sequence: 0,
            year: currentYear,
            is_active: true
        }, { transaction });

        return newUsage;
    }

    /**
     * Unassign a section code from any department.
     */
    static async unassignSection(sectionCode, transaction = null) {
        const currentYear = new Date().getFullYear();

        // 1. Find section
        const section = await RefSectionRegistry.findOne({
            where: { section_code: sectionCode },
            transaction
        });

        if (!section) throw new Error(`Section code ${sectionCode} not found.`);

        const deptId = section.assigned_to_dept_id;

        // 2. Deactivate usage record
        if (deptId) {
            await DeptSectionUsage.update(
                { is_active: false, filled_at: new Date() },
                { 
                    where: { dept_id: deptId, section_code: sectionCode, is_active: true, year: currentYear },
                    transaction 
                }
            );
        }

        // 3. Mark section as AVAILABLE
        await section.update({
            status: 'AVAILABLE',
            assigned_to_dept_id: null
        }, { transaction });

        return true;
    }
}

module.exports = SectionService;
