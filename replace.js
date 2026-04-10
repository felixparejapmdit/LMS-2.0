const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f.includes('node_modules') || f.includes('.git') || f.includes('dist') || f.includes('build')) continue;
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            processDir(p);
        } else if (p.endsWith('.js') || p.endsWith('.jsx')) {
            let content = fs.readFileSync(p, 'utf8');
            let updated = content;
            
            // Replace any array containing SUPERUSER with either ['ADMINISTRATOR'] or []
            updated = updated.replace(/\[([^\]]*SUPERUSER[^\]]*)\]/gi, (match) => {
                if (match.includes('ADMINISTRATOR')) {
                    return "['ADMINISTRATOR']";
                }
                return "[]";
            });
            
            // Also clean up any new Set(...) variations that had SUPERUSER
            updated = updated.replace(/new Set\(\[\s*([^\]]*SUPERUSER[^\]]*)\s*\]\)/gi, "new Set(['ADMINISTRATOR'])");

            if (content !== updated) {
                fs.writeFileSync(p, updated);
                console.log('Cleaned', p);
            }
        }
    }
}
processDir('.');
