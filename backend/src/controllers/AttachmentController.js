const { Attachment, Department, User } = require('../models/associations');
const path = require('path');
const fs = require('fs');

class AttachmentController {
    static async view(req, res) {
        try {
            let id = req.params.id;
            if (typeof id === 'string' && id.includes(',')) {
                id = id.split(',')[0]; // View the first one by default
            }
            const result = await Attachment.findByPk(id);
            if (!result || !result.file_path) {
                return res.status(404).json({ error: 'File not found' });
            }
            const fullPath = path.resolve(result.file_path);
            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: 'Physical file not found' });
            }
            res.sendFile(fullPath);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async upload(req, res) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const { combine_with, existing_path, no_record, purpose } = req.body;
            let finalFilePath = req.file.path;
            let finalFileName = req.file.originalname;

            // Handle Merging Logic
            if (combine_with || existing_path) {
                let base_path = existing_path;
                let base_name = 'Existing';

                if (combine_with) {
                    const existingRecord = await Attachment.findByPk(combine_with);
                    if (existingRecord) {
                        base_path = existingRecord.file_path;
                        base_name = existingRecord.attachment_name;
                    }
                }

                if (base_path && fs.existsSync(base_path)) {
                    const { PDFDocument } = require('pdf-lib');
                    const existingPdfBytes = fs.readFileSync(base_path);
                    const newPdfBytes = fs.readFileSync(req.file.path);

                    const existingPdf = await PDFDocument.load(existingPdfBytes);
                    const newPdf = await PDFDocument.load(newPdfBytes);

                    const mergedPdf = await PDFDocument.create();

                    // 1. New Pages First (Prepend mode)
                    const newPages = await mergedPdf.copyPages(newPdf, newPdf.getPageIndices());
                    newPages.forEach(page => mergedPdf.addPage(page));

                    // 2. Existing Pages
                    const existingPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
                    existingPages.forEach(page => mergedPdf.addPage(page));

                    const mergedPdfBytes = await mergedPdf.save();

                    const combinedFileName = `Combined-${Date.now()}-${base_name.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.pdf`;
                    const combinedPath = path.join(path.dirname(req.file.path), combinedFileName);

                    fs.writeFileSync(combinedPath, mergedPdfBytes);

                    // Cleanup
                    try {
                        fs.unlinkSync(req.file.path);
                        if (existing_path && fs.existsSync(existing_path)) {
                            fs.unlinkSync(existing_path);
                        }
                    } catch (err) {
                        console.warn('Cleanup error during merge:', err.message);
                    }

                    finalFilePath = combinedPath;
                    finalFileName = combinedFileName;
                }
            }

            const noRecordFlag = typeof no_record === 'string' ? no_record.toLowerCase() : no_record;
            const shouldSkipRecord =
                noRecordFlag === true ||
                noRecordFlag === 'true' ||
                noRecordFlag === '1' ||
                purpose === 'scanned_copy';

            if (shouldSkipRecord) {
                return res.json({
                    file_name: finalFileName,
                    file_path: finalFilePath
                });
            }

            const result = await Attachment.create({
                attachment_name: finalFileName,
                file_path: finalFilePath,
                description: req.body.description || (combine_with || existing_path ? 'Combined document' : 'Uploaded file'),
                dept_id: req.body.dept_id || null
            });
            res.status(201).json(result);
        } catch (error) {
            console.error('Upload error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    static async getAll(req, res) {
        try {
            const { user_id } = req.query;
            const where = {};
            
            if (user_id) {
                const user = await User.findByPk(user_id);
                if (user) {
                    // Force their assigned department (assigned or null)
                    where.dept_id = user.dept_id || null;
                }
            } else {
                // If no user_id is provided, default to null for safety OR handle legacy calls
                const { dept_id: queryDeptId } = req.query;
                if (queryDeptId && queryDeptId !== 'all') {
                    where.dept_id = (queryDeptId === 'null' || queryDeptId === 'undefined') ? null : queryDeptId;
                }
            }
            
            const results = await Attachment.findAll({ 
                where,
                include: [{ model: Department, as: 'department' }]
            });
            res.json(results);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const result = await Attachment.findByPk(req.params.id);
            if (!result) return res.status(404).json({ error: 'Not found' });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const result = await Attachment.create(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const result = await Attachment.findByPk(req.params.id);
            if (!result) return res.status(404).json({ error: 'Not found' });
            await result.update(req.body);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const result = await Attachment.findByPk(req.params.id);
            if (!result) return res.status(404).json({ error: 'Not found' });
            if (result.file_path && fs.existsSync(result.file_path)) {
                fs.unlinkSync(result.file_path);
            }
            await result.destroy();
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async combineSelected(req, res) {
        try {
            const { letter_ids } = req.body;
            if (!letter_ids || !Array.isArray(letter_ids) || letter_ids.length === 0) {
                return res.status(400).json({ error: 'letter_ids array is required' });
            }

            const { Letter, Attachment } = require('../models/associations');
            const { PDFDocument } = require('pdf-lib');

            const letters = await Letter.findAll({
                where: { id: letter_ids },
                attributes: ['id', 'scanned_copy', 'attachment_id']
            });

            const mergedPdf = await PDFDocument.create();
            let pagesAdded = 0;

            for (const letter of letters) {
                // Handle scanned copy first
                if (letter.scanned_copy && fs.existsSync(letter.scanned_copy)) {
                    try {
                        const bytes = fs.readFileSync(letter.scanned_copy);
                        const pdf = await PDFDocument.load(bytes);
                        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                        pages.forEach(page => mergedPdf.addPage(page));
                        pagesAdded += pages.length;
                    } catch (err) {
                        console.warn(`Failed to process scanned_copy ${letter.scanned_copy}:`, err.message);
                    }
                }

                // Handle attachment_id (can be comma separated)
                if (letter.attachment_id) {
                    const ids = String(letter.attachment_id).split(',');
                    for (const id of ids) {
                        const att = await Attachment.findByPk(id.trim());
                        if (att && att.file_path && fs.existsSync(att.file_path)) {
                            try {
                                const bytes = fs.readFileSync(att.file_path);
                                const pdf = await PDFDocument.load(bytes);
                                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                                pages.forEach(page => mergedPdf.addPage(page));
                                pagesAdded += pages.length;
                            } catch (err) {
                                console.warn(`Failed to process attachment ${id}:`, err.message);
                            }
                        }
                    }
                }
            }

            if (pagesAdded === 0) {
                return res.status(404).json({ error: 'No valid PDF files found to combine' });
            }

            const mergedPdfBytes = await mergedPdf.save();
            const combinedFileName = `Bulk-Combined-${Date.now()}.pdf`;
            const combinedPath = path.join(path.dirname(letters[0]?.scanned_copy || (__dirname + '/../uploads')), combinedFileName);

            const dir = path.dirname(combinedPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.writeFileSync(combinedPath, mergedPdfBytes);

            res.json({
                file_path: combinedPath,
                file_name: combinedFileName,
                pages_count: pagesAdded
            });
        } catch (error) {
            console.error('Bulk combine error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async viewCombinedForLetter(req, res) {
        try {
            const { letter_id } = req.params;
            console.log(`[DEBUG] viewCombinedForLetter called for ID: ${letter_id}, URL: ${req.originalUrl}`);
            const { Letter, Attachment } = require('../models/associations');
            const { PDFDocument } = require('pdf-lib');

            const letter = await Letter.findByPk(letter_id);
            if (!letter) return res.status(404).json({ error: 'Letter not found' });

            const mergedPdf = await PDFDocument.create();
            let pagesAdded = 0;

            // 1. Additional Attachments (Processed first, newest was prepended in frontend)
            if (letter.attachment_id) {
                const ids = String(letter.attachment_id).split(',');
                for (const id of ids) {
                    const att = await Attachment.findByPk(id.trim());
                    if (att && att.file_path && fs.existsSync(att.file_path)) {
                        try {
                            const bytes = fs.readFileSync(att.file_path);
                            const pdf = await PDFDocument.load(bytes);
                            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                            pages.forEach(page => mergedPdf.addPage(page));
                            pagesAdded += pages.length;
                        } catch (err) {
                            console.warn(`Failed to process attachment ${id}:`, err.message);
                        }
                    }
                }
            }

            // 2. Main Letter (Scanned Copy) - Processed last (bottom of stack)
            if (letter.scanned_copy && fs.existsSync(letter.scanned_copy)) {
                try {
                    const bytes = fs.readFileSync(letter.scanned_copy);
                    const pdf = await PDFDocument.load(bytes);
                    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    pages.forEach(page => mergedPdf.addPage(page));
                    pagesAdded += pages.length;
                } catch (err) {
                    console.warn(`Failed to process scanned_copy:`, err.message);
                }
            }

            if (pagesAdded === 0) {
                return res.status(404).json({ error: 'No PDF files found for this letter' });
            }

            const mergedPdfBytes = await mergedPdf.save();
            const filename = `${letter.lms_id || 'document'}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.send(Buffer.from(mergedPdfBytes));
        } catch (error) {
            console.error('View combined error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async viewByPath(req, res) {
        try {
            const encodedPath = req.query.path;
            if (!encodedPath) return res.status(400).json({ error: 'Path required' });

            const decodedPath = Buffer.from(encodedPath, 'base64').toString('ascii');
            const fullPath = path.resolve(decodedPath);

            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: 'File not found' });
            }
            res.sendFile(fullPath);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AttachmentController;
