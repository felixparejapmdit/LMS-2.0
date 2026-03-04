
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
            let existingAttachment = null;

            // 2. Identify existing PDF path - be VERY robust
            // Try Attachment first
            if (letter.attachment_id) {
                existingAttachment = await Attachment.findByPk(letter.attachment_id);
                if (existingAttachment && existingAttachment.file_path) {
                    // Try absolute first, then relative to base
                    let p = existingAttachment.file_path;
                    if (fs.existsSync(p)) {
                        existingPdfPath = p;
                    } else {
                        // Try relative to project root
                        let altP = path.resolve(process.cwd(), p);
                        if (fs.existsSync(altP)) existingPdfPath = altP;
                    }
                }
            }

            // Try scanned_copy fallback
            if (!existingPdfPath && letter.scanned_copy) {
                let p = letter.scanned_copy;
                if (fs.existsSync(p)) {
                    existingPdfPath = p;
                } else {
                    let altP = path.resolve(process.cwd(), p);
                    if (fs.existsSync(altP)) existingPdfPath = altP;
                }
            }

            const newPdfBytes = fs.readFileSync(req.file.path);
            let finalPdfBytes;

            if (existingPdfPath) {
                console.log(`[PdfSync] Merging: New PDF + Existing [${existingPdfPath}]`);
                try {
                    const existingPdfBytes = fs.readFileSync(existingPdfPath);

                    const mergedPdf = await PDFDocument.create();
                    const newPdf = await PDFDocument.load(newPdfBytes);
                    const existingPdf = await PDFDocument.load(existingPdfBytes);

                    // 1. Add NEW pages first (Page 1)
                    const newPages = await mergedPdf.copyPages(newPdf, newPdf.getPageIndices());
                    newPages.forEach(page => mergedPdf.addPage(page));

                    // 2. Add EXISTING pages after
                    const existingPages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
                    existingPages.forEach(page => mergedPdf.addPage(page));

                    finalPdfBytes = await mergedPdf.save();
                    console.log(`[PdfSync] Successfully merged ${newPages.length} new pages with ${existingPages.length} existing pages.`);
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

            // 5. Update BOTH records to ensure all views refresh
            if (existingAttachment) {
                // If it's a different file, we can optionally clean up the old one,
                // but let's keep it safe for now unless it's obviously the same path.
                if (existingPdfPath && existingPdfPath !== filePath && !existingPdfPath.includes('template')) {
                    // Optional: try { fs.unlinkSync(existingPdfPath); } catch (e) {}
                }

                await existingAttachment.update({
                    attachment_name: fileName,
                    file_path: filePath,
                    description: `Merged via Sync Service (LMS: ${lms_id})`
                });

                // Update letter scanned_copy too
                await letter.update({ scanned_copy: filePath });
            } else {
                const newAttachment = await Attachment.create({
                    attachment_name: fileName,
                    file_path: filePath,
                    description: `Created via Sync Service (LMS: ${lms_id})`
                });
                await letter.update({
                    attachment_id: newAttachment.id,
                    scanned_copy: filePath
                });
            }

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
