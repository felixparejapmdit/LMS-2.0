const pool = require('../config/legacyDb');

class LegacyController {
    /**
     * Replicates the logic from the legacy letters_detailed.php
     * Fetches detailed letter information with joins and nested comments from the legacy MySQL DB.
     */
    static async getDetailedLetters(req, res) {
        const startTime = Date.now();
        console.log(`[LEGACY] Fetching detailed letters from 172.18.162.84...`);
        
        try {
            // 1. Fetch letters with basic lookups
            const [letters] = await pool.query(`
                SELECT 
                    l.*, 
                    u.id as user_id, u.user_name as encoder_username, u.level as user_level,
                    lk.id as kind_id,
                    e.id as endorsed_id,
                    t.tray_no as current_tray
                FROM letters l
                LEFT JOIN users u ON l.encoder = u.name
                LEFT JOIN letter_kind lk ON l.letter_kind = lk.letter_kind
                LEFT JOIN endorsed e ON l.endorsed = e.endorsed
                LEFT JOIN trays t ON l.atg_id = t.atg_id
                ORDER BY l.id DESC
            `);

            if (!letters || letters.length === 0) {
                return res.json({ status: "success", total_count: 0, data: [] });
            }

            // To avoid N+1 query problem from the original PHP scripts loop,
            // we fetch all relevant comments in one go if possible, or batch them.
            // For now, mirroring the PHP structure but optimized with a single bulk query for comments.
            const letterIds = letters.map(l => l.id);
            const letterAtgIds = letters.map(l => l.atg_id).filter(id => !!id);
            
            // Fetch all comments for these letters
            const [allComments] = await pool.query(`
                SELECT * FROM comment 
                WHERE let_id IN (?) OR let_id IN (?) 
                ORDER BY id DESC
            `, [letterIds, letterAtgIds.length > 0 ? letterAtgIds : ['-1']]);

            // 2. Map comments back to their respective letters
            const lettersWithComments = letters.map(letter => {
                const letterComments = allComments.filter(c => 
                    c.let_id == letter.id || (letter.atg_id && c.let_id == letter.atg_id)
                );
                
                return {
                    ...letter,
                    comments: letterComments,
                    // Note: file_exists check is omitted as the Node backend 
                    // doesn't have local disk access to the legacy server filesystem.
                    has_file: !!letter.file_name 
                };
            });

            console.log(`[LEGACY] Successfully fetched ${lettersWithComments.length} letters in ${Date.now() - startTime}ms`);
            
            res.json({
                status: "success",
                total_count: lettersWithComments.length,
                data: lettersWithComments
            });

        } catch (error) {
            console.error(`[LEGACY ERROR] Failed to fetch legacy data:`, error.message);
            res.status(500).json({
                status: "error",
                message: "Failed to connect to legacy database: " + error.message
            });
        }
    }
}

module.exports = LegacyController;
