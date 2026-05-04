const { DashboardNote } = require('../models/associations');

class DashboardNoteController {
    getAll = async (req, res) => {
        console.log('[DEBUG] GET /api/dashboard-notes hit');
        try {
            const notes = await DashboardNote.findAll({
                where: { is_active: true },
                order: [['createdAt', 'DESC']]
            });
            console.log(`[DEBUG] Found ${notes.length} active notes`);
            res.json(notes);
        } catch (error) {
            console.error('[ERROR] DashboardNoteController.getAll:', error);
            res.status(500).json({ error: error.message });
        }
    }

    create = async (req, res) => {
        console.log('[DEBUG] POST /api/dashboard-notes hit', req.body);
        try {
            const { content, priority, created_by } = req.body;
            const note = await DashboardNote.create({ content, priority, created_by });
            console.log('[DEBUG] Note created:', note.id);
            res.status(201).json(note);
        } catch (error) {
            console.error('[ERROR] DashboardNoteController.create:', error);
            res.status(500).json({ error: error.message });
        }
    }

    update = async (req, res) => {
        console.log(`[DEBUG] PUT /api/dashboard-notes/${req.params.id} hit`);
        try {
            const { id } = req.params;
            const { content, priority, is_active } = req.body;
            const note = await DashboardNote.findByPk(id);
            if (!note) return res.status(404).json({ error: 'Note not found' });
            
            await note.update({ content, priority, is_active });
            res.json(note);
        } catch (error) {
            console.error('[ERROR] DashboardNoteController.update:', error);
            res.status(500).json({ error: error.message });
        }
    }

    delete = async (req, res) => {
        console.log(`[DEBUG] DELETE /api/dashboard-notes/${req.params.id} hit`);
        try {
            const { id } = req.params;
            const note = await DashboardNote.findByPk(id);
            if (!note) return res.status(404).json({ error: 'Note not found' });
            await note.destroy();
            res.json({ message: 'Note deleted' });
        } catch (error) {
            console.error('[ERROR] DashboardNoteController.delete:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new DashboardNoteController();
