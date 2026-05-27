
const { Letter, Attachment, LetterLog } = require('../models/associations');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

class PdfSyncController {
    static async mergeAndSync(req, res) {
        try {
            console.log(`[PdfSync] Starting merge request for ${req.body.lms_id}`);

            const raw_lms_id = req.body.lms_id;
            if (!raw_lms_id) {
                console.error(`[PdfSync] Missing lms_id in request body:`, req.body);
                return res.status(400).json({ error: 'lms_id is required' });
            }

            const lms_id = raw_lms_id.trim();
            if (!req.file) {
                console.error(`[PdfSync] No file uploaded for lms_id: ${lms_id}`);
                return res.status(400).json({ error: 'No PDF file uploaded' });
            }

            // 1. Find the letter by lms_id
            const letter = await Letter.findOne({ where: { lms_id } });

            if (!letter) {
                console.error(`[PdfSync] Letter not found in database for lms_id: "${lms_id}"`);
                return res.status(409).json({
                    error: `Letter with LMS ID "${lms_id}" not found in database.`,
                    received_id: lms_id
                });
            }

            console.log(`[PdfSync] Found letter ID ${letter.id} for lms_id ${lms_id}`);

            let existingPdfPath = null;

            // 2. Identify existing PDF path:
            // Prefer scanned_copy (treated as the canonical "letter PDF"), but allow a fallback to an attachment file
            // WITHOUT creating/updating Attachment records (to avoid polluting the Attachments page).
            if (letter.scanned_copy) {
                const p = letter.scanned_copy;
                if (fs.existsSync(p)) {
                    existingPdfPath = p;
                } else {
                    const altP = path.resolve(process.cwd(), p);
                    if (fs.existsSync(altP)) existingPdfPath = altP;
                }
            }

            if (!existingPdfPath && letter.attachment_id) {
                const ids = String(letter.attachment_id).split(',').filter(id => id.trim());
                for (let i = ids.length - 1; i >= 0; i--) {
                    const att = await Attachment.findByPk(ids[i].trim());
                    if (att && att.file_path && fs.existsSync(att.file_path)) {
                        existingPdfPath = att.file_path;
                        break;
                    }
                }
            }

            const newPdfBytes = fs.readFileSync(req.file.path);
            let finalPdfBytes;

            if (existingPdfPath) {
                console.log(`[PdfSync] Merging: New PDF + Existing [${existingPdfPath}]`);
                try {
                    const existingPdfBytes = fs.readFileSync(existingPdfPath);

                    const mergedPdf = await PDFDocument.create();
                    const existingPdf = await PDFDocument.load(existingPdfBytes);
                    const newPdf = await PDFDocument.load(newPdfBytes);

                    // 1. Add NEW pages first (PREPEND MODE)
                    const newPages = await mergedPdf.copyPages(newPdf, newPdf.getPageIndices());
                    newPages.forEach(page => mergedPdf.addPage(page));

                    // 2. Add EXISTING pages after
                    const existingPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
                    existingPages.forEach(page => mergedPdf.addPage(page));

                    console.log(`[PdfSync] Successfully prepended ${newPages.length} new pages to ${existingPages.length} existing pages.`);
                    finalPdfBytes = await mergedPdf.save();
                } catch (mergeErr) {
                    console.error("[PdfSync] Merge logic error (using new content only):", mergeErr.message);
                    finalPdfBytes = newPdfBytes;
                }
            } else {
                console.log(`[PdfSync] No existing PDF found for ${lms_id}. Creating fresh record.`);
                finalPdfBytes = newPdfBytes;
            }

            // 4. Save the final merged PDF
            const uploadsDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            const fileName = `Merged-${lms_id.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.pdf`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, finalPdfBytes);

            // 5. Update letter scanned_copy only.
            // Do NOT create/update Attachment records here — merged/synced PDFs are letter-scanned copies, not "Attachments page" entries.
            await letter.update({ scanned_copy: filePath });

            // 6. Log the action
            try {
                await LetterLog.create({
                    letter_id: letter.id,
                    action_taken: `Correspondence sync: PDF document updated/merged (LMS: ${lms_id}).`,
                    log_date: new Date()
                });
            } catch (logErr) { }

            // Cleanup temp file
            try { fs.unlinkSync(req.file.path); } catch (e) { }

            res.json({
                success: true,
                message: `Synced ${lms_id} successfully.`,
                file_name: fileName,
                letter_id: letter.id
            });

        } catch (error) {
            console.error('[PdfSync] Controller Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = PdfSyncController;
