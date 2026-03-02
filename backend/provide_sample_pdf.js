const fs = require('fs');
const path = require('path');
const { Letter, Attachment } = require('./src/models/associations');

async function provideSamplePdf() {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        const fileName = 'VIP_SAMPLE_001.pdf';
        const filePath = path.join(uploadDir, fileName);

        // A minimal PDF structure as text
        const pdfContent = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >> endobj
4 0 obj << /Length 51 >> stream
BT /F1 12 Tf 72 720 Td (Sample PDF for VIP-Test-001) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000018 00000 n 
0000000077 00000 n 
0000000178 00000 n 
0000000457 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
565
%%EOF`;

        fs.writeFileSync(filePath, pdfContent);
        console.log('PDF file created at:', filePath);

        // Create or Update attachment in DB
        const [attachment] = await Attachment.findOrCreate({
            where: { attachment_name: fileName },
            defaults: {
                file_path: fileName,
                description: 'Sample PDF for VIP testing'
            }
        });

        // Find the letter and link it
        const letter = await Letter.findOne({ where: { lms_id: 'VIP-TEST-001' } });
        if (letter) {
            await letter.update({ attachment_id: attachment.id });
            console.log('Letter VIP-TEST-001 updated with attachment ID:', attachment.id);
        } else {
            console.log('Letter VIP-TEST-001 not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

provideSamplePdf();
