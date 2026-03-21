const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('interDeptRoutes')) {
    content = content.replace(
        "const authRoutes = require('./routes/authRoutes');",
        "const authRoutes = require('./routes/authRoutes');\nconst interDeptRoutes = require('./routes/interDeptRoutes');"
    );
}

// 2. Add route registration
if (!content.includes("/inter-dept'")) {
    content = content.replace(
        "apiRouter.use('/telegram', telegramRoutes);",
        "apiRouter.use('/telegram', telegramRoutes);\napiRouter.use('/inter-dept', interDeptRoutes);"
    );
}

fs.writeFileSync(filePath, content);
console.log('app.js updated successfully via script.');
